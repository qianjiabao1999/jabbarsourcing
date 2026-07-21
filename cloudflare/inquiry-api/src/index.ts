import { DurableObject } from "cloudflare:workers";

const SERVICE_NAME = "jabbar-sourcing-inquiry-api";
const SERVICE_VERSION = "1.0.0";
const MAX_BODY_BYTES = 16 * 1024;
const EXPECTED_TURNSTILE_ACTION = "turnstile-spin-v1";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_LEASE_MS = 10 * 60 * 1000;
const IDEMPOTENCY_STORAGE_KEY = "submission";
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CURRENT_PRIVACY_VERSION = "2026-07-22";
const PREVIOUS_PRIVACY_VERSION = "2026-07-19";
const PREVIOUS_CACHED_PRIVACY_VERSION = "2026-07-18";
const LEGACY_CACHED_PRIVACY_VERSION = "2026-07-12";
const CACHED_PRIVACY_COMPATIBILITY_UNTIL = Date.parse("2026-08-21T23:59:59Z");

const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"] as const;
type Locale = (typeof LOCALES)[number];

const SOURCE_PATHS: Record<Locale, string> = {
  zh: "/inquiry/",
  en: "/en/inquiry/",
  es: "/es/inquiry/",
  ar: "/ar/inquiry/",
  fr: "/fr/inquiry/",
  pt: "/pt/inquiry/",
  ru: "/ru/inquiry/",
  de: "/de/inquiry/",
  it: "/it/inquiry/",
  tr: "/tr/inquiry/",
};

const PAYLOAD_FIELDS = new Set([
  "product",
  "referenceUrl",
  "category",
  "quantity",
  "budget",
  "market",
  "contact",
  "company",
  "note",
  "locale",
  "sourcePath",
  "privacyAcknowledged",
  "privacyVersion",
  "submissionId",
  "turnstileToken",
  "attribution",
]);

const ATTRIBUTION_FIELDS = new Set([
  "landing_path",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

interface InquiryAttribution {
  landing_path: string;
  referrer_host: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}

interface InquiryPayload {
  product: string;
  referenceUrl: string;
  category: string;
  quantity: string;
  budget: string;
  market: string;
  contact: string;
  company: string;
  note: string;
  locale: Locale;
  sourcePath: string;
  privacyAcknowledged: true;
  privacyVersion: string;
  submissionId: string;
  turnstileToken: string;
  attribution: InquiryAttribution;
}

interface SiteverifyResult {
  success: boolean;
  action?: string;
  hostname?: string;
  errorCodes: string[];
}

type IdempotencyState = "pending" | "sent" | "failed";

interface IdempotencyRecord {
  state: IdempotencyState;
  requestId: string;
  payloadFingerprint: string;
  expiresAt: number;
  leaseUntil?: number;
  claimId?: string;
}

export type IdempotencyStatus =
  | { state: "missing" }
  | { state: "conflict" }
  | { state: "pending"; requestId: string; leaseUntil: number }
  | { state: "sent"; requestId: string }
  | { state: "failed"; requestId: string };

export type IdempotencyClaim =
  | { state: "acquired"; requestId: string; claimId: string }
  | { state: "conflict" }
  | { state: "pending"; requestId: string }
  | { state: "sent"; requestId: string };

function assertPayloadFingerprint(payloadFingerprint: string): void {
  if (!/^[0-9a-f]{64}$/.test(payloadFingerprint)) {
    throw new Error("invalid payload fingerprint");
  }
}

export class InquiryIdempotency extends DurableObject<Env> {
  async getStatus(payloadFingerprint: string): Promise<IdempotencyStatus> {
    assertPayloadFingerprint(payloadFingerprint);
    const record = await this.ctx.storage.get<IdempotencyRecord>(IDEMPOTENCY_STORAGE_KEY);
    if (!record) return { state: "missing" };
    if (record.expiresAt <= Date.now()) {
      await this.ctx.storage.deleteAll();
      return { state: "missing" };
    }
    if (record.payloadFingerprint !== payloadFingerprint) return { state: "conflict" };
    if (record.state === "pending") {
      return {
        state: "pending",
        requestId: record.requestId,
        leaseUntil: record.leaseUntil ?? 0,
      };
    }
    return { state: record.state, requestId: record.requestId };
  }

  async begin(requestId: string, payloadFingerprint: string): Promise<IdempotencyClaim> {
    assertPayloadFingerprint(payloadFingerprint);
    return this.ctx.storage.transaction(async (transaction) => {
      const now = Date.now();
      let current = await transaction.get<IdempotencyRecord>(IDEMPOTENCY_STORAGE_KEY);
      if (current && current.expiresAt <= now) {
        await transaction.delete(IDEMPOTENCY_STORAGE_KEY);
        current = undefined;
      }
      if (current && current.payloadFingerprint !== payloadFingerprint) {
        return { state: "conflict" };
      }

      if (current?.state === "sent") {
        return { state: current.state, requestId: current.requestId };
      }
      if (current?.state === "pending" && (current.leaseUntil ?? 0) > now) {
        return { state: "pending", requestId: current.requestId };
      }

      const stableRequestId = current?.requestId ?? requestId;
      const claimId = crypto.randomUUID();
      await transaction.put<IdempotencyRecord>(IDEMPOTENCY_STORAGE_KEY, {
        state: "pending",
        requestId: stableRequestId,
        payloadFingerprint,
        expiresAt: now + IDEMPOTENCY_TTL_MS,
        leaseUntil: now + PENDING_LEASE_MS,
        claimId,
      });
      await transaction.setAlarm(now + IDEMPOTENCY_TTL_MS);
      return { state: "acquired", requestId: stableRequestId, claimId };
    });
  }

  async markSent(requestId: string, claimId: string): Promise<boolean> {
    return this.updateState(requestId, claimId, "sent");
  }

  async markFailed(requestId: string, claimId: string): Promise<boolean> {
    return this.updateState(requestId, claimId, "failed");
  }

  async alarm(): Promise<void> {
    try {
      const record = await this.ctx.storage.get<IdempotencyRecord>(IDEMPOTENCY_STORAGE_KEY);
      if (!record) return;

      if (record.expiresAt > Date.now()) {
        await this.ctx.storage.setAlarm(record.expiresAt);
        return;
      }
      await this.ctx.storage.deleteAll();
    } catch {
      console.error(
        JSON.stringify({
          event: "inquiry_idempotency_cleanup",
          outcome: "retry_scheduled",
          ts: new Date().toISOString(),
        }),
      );
      await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000);
    }
  }

  private async updateState(
    requestId: string,
    claimId: string,
    state: "sent" | "failed",
  ): Promise<boolean> {
    return this.ctx.storage.transaction(async (transaction) => {
      const current = await transaction.get<IdempotencyRecord>(IDEMPOTENCY_STORAGE_KEY);
      if (
        !current ||
        current.state !== "pending" ||
        current.requestId !== requestId ||
        current.claimId !== claimId
      ) {
        return false;
      }

      const now = Date.now();
      await transaction.put<IdempotencyRecord>(IDEMPOTENCY_STORAGE_KEY, {
        state,
        requestId,
        payloadFingerprint: current.payloadFingerprint,
        expiresAt: now + IDEMPOTENCY_TTL_MS,
      });
      await transaction.setAlarm(now + IDEMPOTENCY_TTL_MS);
      return true;
    });
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly responseHeaders: Record<string, string> = {},
  ) {
    super(code);
    this.name = "HttpError";
  }
}

function csvSet(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseHeaders(origin: string | null, extra: Record<string, string> = {}): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Expose-Headers", "Retry-After");
    headers.set("Vary", "Origin");
  }

  return headers;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin, extraHeaders),
  });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type") ?? "";
  const mediaType = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new HttpError(415, "unsupported_content_type");
  }

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large");
  }

  if (!request.body) {
    throw new HttpError(400, "missing_body");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;

    totalBytes += chunk.value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, "payload_too_large");
    }

    text += decoder.decode(chunk.value, { stream: true });
  }

  text += decoder.decode();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

function normalizeSingleLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function readText(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
  required: boolean,
  multiline = false,
): string {
  const raw = input[key];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new HttpError(400, `missing_${key}`);
    return "";
  }

  if (typeof raw !== "string") {
    throw new HttpError(400, `invalid_${key}`);
  }

  const normalized = multiline ? normalizeMultiline(raw) : normalizeSingleLine(raw);
  if (required && !normalized) {
    throw new HttpError(400, `missing_${key}`);
  }
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${key}_too_long`);
  }

  return normalized;
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function readHttpUrl(input: Record<string, unknown>, key: string, maxLength: number): string {
  const value = readText(input, key, maxLength, false);
  if (!value) return "";

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, "invalid_reference_url");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.href.length > maxLength
  ) {
    throw new HttpError(400, "invalid_reference_url");
  }
  return parsed.href;
}

function isSafeLandingPath(value: string): boolean {
  return /^\/(?:(?:en|es|ar|fr|pt|ru|de|it|tr)\/)?(?:inquiry\/|calculator\/)?$/.test(value) ||
    ["/privacy-policy.html", "/website-privacy-policy.html", "/support.html", "/404.html", "/other"].includes(value);
}

function isSafeHostname(value: string): boolean {
  if (
    !value ||
    value.length > 253 ||
    !/^[a-z0-9.-]+$/.test(value) ||
    value.startsWith(".") ||
    value.endsWith(".") ||
    value.includes("..") ||
    value.split(".").some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))
  ) return false;
  try {
    const parsed = new URL(`https://${value}`);
    return parsed.hostname === value && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function validateAttribution(value: unknown, sourcePath: string): InquiryAttribution {
  if (value === undefined || value === null) {
    return {
      landing_path: sourcePath,
      referrer_host: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
    };
  }
  if (!isRecord(value)) {
    throw new HttpError(400, "invalid_attribution");
  }
  if (Object.keys(value).some((key) => !ATTRIBUTION_FIELDS.has(key))) {
    throw new HttpError(400, "unknown_attribution_field");
  }

  const landingPath = readText(value, "landing_path", 160, true);
  if (!isSafeLandingPath(landingPath)) {
    throw new HttpError(400, "invalid_landing_path");
  }
  const referrerHost = readText(value, "referrer_host", 253, false).toLowerCase();
  if (referrerHost && !isSafeHostname(referrerHost)) {
    throw new HttpError(400, "invalid_referrer_host");
  }

  return {
    landing_path: landingPath,
    referrer_host: referrerHost,
    utm_source: readText(value, "utm_source", 100, false),
    utm_medium: readText(value, "utm_medium", 100, false),
    utm_campaign: readText(value, "utm_campaign", 100, false),
    utm_term: readText(value, "utm_term", 100, false),
    utm_content: readText(value, "utm_content", 100, false),
  };
}

function validatePayload(input: unknown, env: Env): InquiryPayload {
  if (!isRecord(input)) {
    throw new HttpError(400, "invalid_payload");
  }

  if (Object.keys(input).some((key) => !PAYLOAD_FIELDS.has(key))) {
    throw new HttpError(400, "unknown_field");
  }

  const locale = readText(input, "locale", 5, true);
  if (!isLocale(locale)) {
    throw new HttpError(400, "invalid_locale");
  }

  const sourcePath = readText(input, "sourcePath", 80, true);
  if (sourcePath !== SOURCE_PATHS[locale]) {
    throw new HttpError(400, "invalid_source_path");
  }

  if (input.privacyAcknowledged !== true) {
    throw new HttpError(400, "privacy_acknowledgement_required");
  }

  const privacyVersion = readText(input, "privacyVersion", 20, true);
  const hasNewInquiryFields = Object.prototype.hasOwnProperty.call(input, "referenceUrl") ||
    Object.prototype.hasOwnProperty.call(input, "attribution");
  const acceptsCachedPrivacyVersions = Date.now() <= CACHED_PRIVACY_COMPATIBILITY_UNTIL;
  const isCurrentPrivacyVersion = privacyVersion === env.PRIVACY_VERSION;
  const isPreviousPrivacyVersion = acceptsCachedPrivacyVersions &&
    env.PRIVACY_VERSION === CURRENT_PRIVACY_VERSION &&
    privacyVersion === PREVIOUS_PRIVACY_VERSION;
  const isPreviousCachedPrivacyVersion = acceptsCachedPrivacyVersions &&
    env.PRIVACY_VERSION === CURRENT_PRIVACY_VERSION &&
    privacyVersion === PREVIOUS_CACHED_PRIVACY_VERSION;
  const isStrictLegacyCachePayload = acceptsCachedPrivacyVersions &&
    env.PRIVACY_VERSION === CURRENT_PRIVACY_VERSION &&
    privacyVersion === LEGACY_CACHED_PRIVACY_VERSION &&
    !hasNewInquiryFields;
  if (!isCurrentPrivacyVersion && !isPreviousPrivacyVersion && !isPreviousCachedPrivacyVersion && !isStrictLegacyCachePayload) {
    throw new HttpError(400, "invalid_privacy_version");
  }

  const submissionId = readText(input, "submissionId", 36, true).toLowerCase();
  if (!UUID_V4_PATTERN.test(submissionId)) {
    throw new HttpError(400, "invalid_submission_id");
  }
  return {
    product: readText(input, "product", 300, true),
    referenceUrl: readHttpUrl(input, "referenceUrl", 500),
    category: readText(input, "category", 120, false),
    quantity: readText(input, "quantity", 120, false),
    budget: readText(input, "budget", 120, false),
    market: readText(input, "market", 120, false),
    contact: readText(input, "contact", 200, true),
    company: readText(input, "company", 160, false),
    note: readText(input, "note", 1500, false, true),
    locale,
    sourcePath,
    privacyAcknowledged: true,
    privacyVersion,
    submissionId,
    turnstileToken: readText(input, "turnstileToken", 2048, true),
    attribution: validateAttribution(input.attribution, sourcePath),
  };
}

async function inquiryPayloadFingerprint(payload: InquiryPayload): Promise<string> {
  const canonicalPayload = JSON.stringify([
    payload.submissionId,
    payload.product,
    payload.referenceUrl,
    payload.category,
    payload.quantity,
    payload.budget,
    payload.market,
    payload.contact,
    payload.company,
    payload.note,
    payload.locale,
    payload.sourcePath,
    payload.privacyVersion,
    payload.attribution.landing_path,
    payload.attribution.referrer_host,
    payload.attribution.utm_source,
    payload.attribution.utm_medium,
    payload.attribution.utm_campaign,
    payload.attribution.utm_term,
    payload.attribution.utm_content,
  ]);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalPayload)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function siteverifyIdempotencyKey(payload: InquiryPayload): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${payload.submissionId}\u0000${payload.turnstileToken}`),
    ),
  );
  const uuidBytes = digest.slice(0, 16);
  uuidBytes[6] = ((uuidBytes[6] ?? 0) & 0x0f) | 0x80;
  uuidBytes[8] = ((uuidBytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(uuidBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseSiteverifyResult(value: unknown): SiteverifyResult {
  if (!isRecord(value) || typeof value.success !== "boolean") {
    throw new HttpError(502, "turnstile_service_invalid_response");
  }

  const rawCodes = value["error-codes"];
  const errorCodes = Array.isArray(rawCodes)
    ? rawCodes.filter((code): code is string => typeof code === "string").slice(0, 10)
    : [];

  return {
    success: value.success,
    action: typeof value.action === "string" ? value.action : undefined,
    hostname: typeof value.hostname === "string" ? value.hostname : undefined,
    errorCodes,
  };
}

async function verifyTurnstile(payload: InquiryPayload, remoteIp: string, env: Env): Promise<void> {
  const verificationBody: Record<string, string> = {
    token: payload.turnstileToken,
    idempotency_key: await siteverifyIdempotencyKey(payload),
    remoteip: remoteIp,
  };

  let response: Response;
  try {
    response = await env.TURNSTILE_SITEVERIFY.fetch("https://turnstile-siteverify.internal/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verificationBody),
    });
  } catch {
    throw new HttpError(502, "turnstile_service_unavailable");
  }

  if (!response.ok) {
    throw new HttpError(502, "turnstile_service_unavailable");
  }

  let rawResult: unknown;
  try {
    rawResult = await response.json();
  } catch {
    throw new HttpError(502, "turnstile_service_invalid_response");
  }
  const result = parseSiteverifyResult(rawResult);
  if (!result.success) {
    throw new HttpError(422, "turnstile_failed");
  }
  if (result.action !== EXPECTED_TURNSTILE_ACTION) {
    throw new HttpError(422, "turnstile_action_mismatch");
  }
  if (!result.hostname || !csvSet(env.ALLOWED_HOSTNAMES).has(result.hostname)) {
    throw new HttpError(422, "turnstile_hostname_mismatch");
  }
}

async function rateLimitKey(scope: string, value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${scope}:${value.toLowerCase()}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
  return `${scope}:${hash}`;
}

function readClientIp(request: Request): string {
  const remoteIp = request.headers.get("CF-Connecting-IP")?.trim() ?? "";
  if (!remoteIp) {
    throw new HttpError(400, "missing_client_ip");
  }
  if (remoteIp.length > 64 || !/^[0-9a-f:.]+$/i.test(remoteIp)) {
    throw new HttpError(400, "invalid_client_ip");
  }
  return remoteIp;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayValue(value: string): string {
  return value || "Not provided";
}

function metricDimension(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return normalized || "(none)";
}

const SAFE_UTM_SOURCES = new Set([
  "bing",
  "direct",
  "facebook",
  "google",
  "instagram",
  "linkedin",
  "newsletter",
  "organic",
  "referral",
  "telegram",
  "tiktok",
  "wechat",
  "whatsapp",
  "youtube",
]);

const SAFE_UTM_MEDIA = new Set([
  "affiliate",
  "cpc",
  "display",
  "email",
  "influencer",
  "offline",
  "organic",
  "paid",
  "paid_social",
  "ppc",
  "qr",
  "referral",
  "social",
  "video",
]);

function allowlistedMetricDimension(value: string, allowlist: Set<string>): string {
  const normalized = metricDimension(value);
  if (normalized === "(none)") return normalized;
  return allowlist.has(normalized) ? normalized : "other";
}

function logSuccessfulInquiry(
  payload: InquiryPayload,
  startedAt: number,
  responseStatus: 201 | 202,
): void {
  console.log({
    event: "inquiry_submit",
    response_status: responseStatus,
    locale: payload.locale,
    utm_source: allowlistedMetricDimension(payload.attribution.utm_source, SAFE_UTM_SOURCES),
    utm_medium: allowlistedMetricDimension(payload.attribution.utm_medium, SAFE_UTM_MEDIA),
    utm_campaign_present: Boolean(payload.attribution.utm_campaign.trim()),
    utm_term_present: Boolean(payload.attribution.utm_term.trim()),
    utm_content_present: Boolean(payload.attribution.utm_content.trim()),
    duration_ms: Date.now() - startedAt,
  });
}

function buildEmailText(payload: InquiryPayload, requestId: string, receivedAt: string): string {
  return [
    "New Jabbar Sourcing website inquiry",
    "",
    `Request ID: ${requestId}`,
    `Received: ${receivedAt}`,
    `Language: ${payload.locale}`,
    `Source: ${payload.sourcePath}`,
    `Landing page: ${payload.attribution.landing_path}`,
    `External referrer host: ${displayValue(payload.attribution.referrer_host)}`,
    `UTM source: ${displayValue(payload.attribution.utm_source)}`,
    `UTM medium: ${displayValue(payload.attribution.utm_medium)}`,
    `UTM campaign: ${displayValue(payload.attribution.utm_campaign)}`,
    `UTM term: ${displayValue(payload.attribution.utm_term)}`,
    `UTM content: ${displayValue(payload.attribution.utm_content)}`,
    `Product: ${payload.product}`,
    `Product reference URL: ${displayValue(payload.referenceUrl)}`,
    `Category: ${displayValue(payload.category)}`,
    `Quantity: ${displayValue(payload.quantity)}`,
    `Budget: ${displayValue(payload.budget)}`,
    `Target market: ${displayValue(payload.market)}`,
    `Contact: ${payload.contact}`,
    `Name or company: ${displayValue(payload.company)}`,
    `Notes: ${displayValue(payload.note)}`,
    `Privacy notice version: ${payload.privacyVersion}`,
  ].join("\n");
}

function buildEmailHtml(payload: InquiryPayload, requestId: string, receivedAt: string): string {
  const rows: Array<[string, string]> = [
    ["Request ID", requestId],
    ["Received", receivedAt],
    ["Language", payload.locale],
    ["Source", payload.sourcePath],
    ["Landing page", payload.attribution.landing_path],
    ["External referrer host", displayValue(payload.attribution.referrer_host)],
    ["UTM source", displayValue(payload.attribution.utm_source)],
    ["UTM medium", displayValue(payload.attribution.utm_medium)],
    ["UTM campaign", displayValue(payload.attribution.utm_campaign)],
    ["UTM term", displayValue(payload.attribution.utm_term)],
    ["UTM content", displayValue(payload.attribution.utm_content)],
    ["Product", payload.product],
    ["Product reference URL", displayValue(payload.referenceUrl)],
    ["Category", displayValue(payload.category)],
    ["Quantity", displayValue(payload.quantity)],
    ["Budget", displayValue(payload.budget)],
    ["Target market", displayValue(payload.market)],
    ["Contact", payload.contact],
    ["Name or company", displayValue(payload.company)],
    ["Notes", displayValue(payload.note)],
    ["Privacy notice version", payload.privacyVersion],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 12px 6px 0;vertical-align:top">${escapeHtml(label)}</th>` +
        `<td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<h1>New Jabbar Sourcing website inquiry</h1><table>${tableRows}</table>`;
}

function emailErrorCode(error: unknown): string {
  if (isRecord(error) && typeof error.code === "string") {
    return error.code;
  }
  return "unknown_email_error";
}

async function sendInquiryEmail(payload: InquiryPayload, requestId: string, env: Env): Promise<void> {
  const receivedAt = new Date().toISOString();

  try {
    await env.INQUIRY_EMAIL.send({
      to: env.INQUIRY_RECIPIENT,
      from: {
        email: env.INQUIRY_FROM,
        name: "Jabbar Sourcing Website",
      },
      subject: `New sourcing inquiry ${requestId}`,
      text: buildEmailText(payload, requestId, receivedAt),
      html: buildEmailHtml(payload, requestId, receivedAt),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "inquiry_email",
        outcome: "failed",
        request_id: requestId,
        error_code: emailErrorCode(error),
        ts: new Date().toISOString(),
      }),
    );
    throw new HttpError(502, "email_delivery_failed");
  }
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const startedAt = Date.now();
  const url = new URL(request.url);

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    return jsonResponse(
      { ok: true, service: SERVICE_NAME, version: SERVICE_VERSION },
      200,
      null,
    );
  }

  const requestOrigin = request.headers.get("Origin");
  const allowedOrigin = requestOrigin && csvSet(env.ALLOWED_ORIGINS).has(requestOrigin) ? requestOrigin : null;

  if (request.method === "OPTIONS" && url.pathname === "/inquiry") {
    if (!allowedOrigin) {
      return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403, null);
    }
    return new Response(null, {
      status: 204,
      headers: responseHeaders(allowedOrigin, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }

  if (request.method !== "POST" || url.pathname !== "/inquiry") {
    return jsonResponse({ ok: false, error: "not_found" }, 404, null);
  }

  if (!allowedOrigin) {
    return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403, null);
  }

  try {
    const remoteIp = readClientIp(request);
    const edgeLimit = await env.INQUIRY_EDGE_RATE_LIMIT.limit({
      key: await rateLimitKey("edge", remoteIp),
    });
    if (!edgeLimit.success) {
      throw new HttpError(429, "rate_limit_exceeded", { "Retry-After": "60" });
    }

    const rawPayload = await readBoundedJson(request);
    const payload = validatePayload(rawPayload, env);
    const payloadFingerprint = await inquiryPayloadFingerprint(payload);
    const idempotency = env.INQUIRY_IDEMPOTENCY.getByName(payload.submissionId);
    const existing = await idempotency.getStatus(payloadFingerprint);

    if (existing.state === "conflict") {
      throw new HttpError(409, "submission_id_conflict");
    }
    if (existing.state === "sent") {
      return jsonResponse(
        { ok: true, requestId: existing.requestId, duplicate: true },
        200,
        allowedOrigin,
      );
    }
    if (existing.state === "pending" && existing.leaseUntil > Date.now()) {
      throw new HttpError(409, "submission_in_progress", { "Retry-After": "5" });
    }

    await verifyTurnstile(payload, remoteIp, env);

    const contactLimit = await env.INQUIRY_CONTACT_RATE_LIMIT.limit({
      key: await rateLimitKey("contact", payload.contact),
    });
    if (!contactLimit.success) {
      throw new HttpError(429, "rate_limit_exceeded", { "Retry-After": "60" });
    }

    const claim = await idempotency.begin(crypto.randomUUID(), payloadFingerprint);
    if (claim.state === "conflict") {
      throw new HttpError(409, "submission_id_conflict");
    }
    if (claim.state === "sent") {
      return jsonResponse(
        { ok: true, requestId: claim.requestId, duplicate: true },
        200,
        allowedOrigin,
      );
    }
    if (claim.state === "pending") {
      throw new HttpError(409, "submission_in_progress", { "Retry-After": "5" });
    }
    const requestId = claim.requestId;
    const claimId = claim.claimId;

    try {
      await sendInquiryEmail(payload, requestId, env);
    } catch (error) {
      try {
        const recorded = await idempotency.markFailed(requestId, claimId);
        if (!recorded) throw new Error("idempotency state did not match");
      } catch {
        console.error(
          JSON.stringify({
            event: "inquiry_state",
            outcome: "mark_failed_error",
            request_id: requestId,
            ts: new Date().toISOString(),
          }),
        );
      }
      throw error;
    }

    let responseStatus: 201 | 202 = 201;
    try {
      const recorded = await idempotency.markSent(requestId, claimId);
      if (!recorded) throw new Error("idempotency state did not match");
    } catch {
      console.error(
        JSON.stringify({
          event: "inquiry_state",
          outcome: "mark_sent_error",
          request_id: requestId,
          ts: new Date().toISOString(),
        }),
      );
      responseStatus = 202;
    }

    if (payload.privacyVersion === env.PRIVACY_VERSION) {
      logSuccessfulInquiry(payload, startedAt, responseStatus);
    }

    if (responseStatus === 202) {
      return jsonResponse(
        { ok: true, requestId, status: "accepted" },
        responseStatus,
        allowedOrigin,
      );
    }
    return jsonResponse({ ok: true, requestId }, responseStatus, allowedOrigin);
  } catch (error) {
    if (error instanceof HttpError) {
      console.log(
        JSON.stringify({
          event: "inquiry_submit",
          outcome: "rejected",
          error_code: error.code,
          status: error.status,
          duration_ms: Date.now() - startedAt,
          ts: new Date().toISOString(),
        }),
      );
      return jsonResponse(
        { ok: false, error: error.code },
        error.status,
        allowedOrigin,
        error.responseHeaders,
      );
    }

    console.error(
      JSON.stringify({
        event: "inquiry_submit",
        outcome: "error",
        error_code: "internal_error",
        duration_ms: Date.now() - startedAt,
        ts: new Date().toISOString(),
      }),
    );
    return jsonResponse({ ok: false, error: "internal_error" }, 500, allowedOrigin);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
