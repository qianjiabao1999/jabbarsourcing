import {
  SELF,
  env as testEnv,
  reset,
  runDurableObjectAlarm,
  runInDurableObject,
} from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { handleRequest, type InquiryIdempotency } from "../src/index";

const ALLOWED_ORIGIN = "https://www.jabbarsourcing.com";
const RECIPIENT = "qianjiabao1999@gmail.com";
const SENDER = "inquiry@jabbarsourcing.com";
const CLIENT_IP = "203.0.113.10";

interface MockOptions {
  turnstileResult?: Record<string, unknown>;
  turnstileStatus?: number;
  turnstileRawBody?: string;
  turnstileError?: Error;
  edgeRateLimitSuccess?: boolean;
  contactRateLimitSuccess?: boolean;
  emailFailures?: number;
  emailError?: Error & { code?: string };
}

interface TurnstileCall {
  url: string;
  method: string;
  contentType: string | null;
  body: Record<string, unknown>;
}

class MockRateLimit implements RateLimit {
  readonly keys: string[] = [];

  constructor(
    private readonly label: "edge" | "contact",
    private readonly success: boolean,
    private readonly trace: string[],
  ) {}

  async limit(options: RateLimitOptions): Promise<RateLimitOutcome> {
    this.trace.push(this.label);
    this.keys.push(options.key);
    return { success: this.success };
  }
}

class MockEmailBinding implements SendEmail {
  readonly sent: EmailMessageBuilder[] = [];
  attempts = 0;

  constructor(
    private failuresRemaining: number,
    private readonly failure: Error,
    private readonly trace: string[],
  ) {}

  send(message: EmailMessage): Promise<EmailSendResult>;
  send(message: EmailMessageBuilder): Promise<EmailSendResult>;
  async send(message: EmailMessage | EmailMessageBuilder): Promise<EmailSendResult> {
    this.trace.push("email");
    this.attempts += 1;
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw this.failure;
    }
    if ("subject" in message) this.sent.push(message);
    return { messageId: `test-message-${this.attempts}` };
  }
}

function createEnv(options: MockOptions = {}): {
  env: Env;
  email: MockEmailBinding;
  edgeRateLimit: MockRateLimit;
  contactRateLimit: MockRateLimit;
  trace: string[];
  turnstileCalls: TurnstileCall[];
} {
  const trace: string[] = [];
  const turnstileCalls: TurnstileCall[] = [];
  const emailFailure =
    options.emailError ??
    Object.assign(new Error("delivery failed"), {
      code: "E_DELIVERY_FAILED",
    });
  const email = new MockEmailBinding(options.emailFailures ?? 0, emailFailure, trace);
  const edgeRateLimit = new MockRateLimit(
    "edge",
    options.edgeRateLimitSuccess ?? true,
    trace,
  );
  const contactRateLimit = new MockRateLimit(
    "contact",
    options.contactRateLimitSuccess ?? true,
    trace,
  );

  const turnstileService: Fetcher = {
    async fetch(input, init) {
      trace.push("turnstile");
      if (options.turnstileError) throw options.turnstileError;

      const bodyText = typeof init?.body === "string" ? init.body : "{}";
      turnstileCalls.push({
        url: input instanceof Request ? input.url : String(input),
        method: init?.method ?? (input instanceof Request ? input.method : "GET"),
        contentType: new Headers(init?.headers).get("Content-Type"),
        body: JSON.parse(bodyText) as Record<string, unknown>,
      });

      if (options.turnstileRawBody !== undefined) {
        return new Response(options.turnstileRawBody, {
          status: options.turnstileStatus ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return Response.json(
        options.turnstileResult ?? {
          success: true,
          action: "turnstile-spin-v1",
          hostname: "www.jabbarsourcing.com",
          "error-codes": [],
        },
        { status: options.turnstileStatus ?? 200 },
      );
    },
    connect() {
      throw new Error("connect is not used by this test");
    },
  };

  const env = {
    TURNSTILE_SITEVERIFY: turnstileService,
    INQUIRY_EMAIL: email,
    INQUIRY_EDGE_RATE_LIMIT: edgeRateLimit,
    INQUIRY_CONTACT_RATE_LIMIT: contactRateLimit,
    INQUIRY_IDEMPOTENCY: testEnv.INQUIRY_IDEMPOTENCY,
    ALLOWED_ORIGINS: "https://www.jabbarsourcing.com,https://jabbarsourcing.com",
    ALLOWED_HOSTNAMES: "www.jabbarsourcing.com,jabbarsourcing.com",
    INQUIRY_RECIPIENT: RECIPIENT,
    INQUIRY_FROM: SENDER,
    PRIVACY_VERSION: "2026-07-12",
  } satisfies Env;

  return {
    env,
    email,
    edgeRateLimit,
    contactRateLimit,
    trace,
    turnstileCalls,
  };
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    product: "Kitchen storage products",
    category: "Home and kitchen",
    quantity: "1,000 pcs",
    budget: "USD 5,000",
    market: "United States",
    contact: "buyer@example.com",
    company: "Example Buyer",
    note: "Trial order",
    locale: "en",
    sourcePath: "/en/inquiry/",
    privacyAcknowledged: true,
    privacyVersion: "2026-07-12",
    submissionId: "8f86cdd2-fcb8-4b39-9cc1-04ef23780243",
    turnstileToken: "test-turnstile-token",
    ...overrides,
  };
}

async function testPayloadFingerprint(payload: Record<string, unknown>): Promise<string> {
  const canonicalPayload = JSON.stringify([
    payload.submissionId,
    payload.product,
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
  ]);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalPayload)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

interface RequestOptions {
  origin?: string | null;
  clientIp?: string | null;
  contentType?: string | null;
  contentLength?: string;
}

function rawInquiryRequest(body: BodyInit, options: RequestOptions = {}): Request {
  const headers = new Headers();
  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  const clientIp = options.clientIp === undefined ? CLIENT_IP : options.clientIp;
  const contentType = options.contentType === undefined ? "application/json" : options.contentType;

  if (origin !== null) headers.set("Origin", origin);
  if (clientIp !== null) headers.set("CF-Connecting-IP", clientIp);
  if (contentType !== null) headers.set("Content-Type", contentType);
  if (options.contentLength !== undefined) headers.set("Content-Length", options.contentLength);

  return new Request("https://worker.example/inquiry", {
    method: "POST",
    headers,
    body,
  });
}

function inquiryRequest(
  body: Record<string, unknown>,
  options: RequestOptions = {},
): Request {
  return rawInquiryRequest(JSON.stringify(body), options);
}

afterEach(async () => {
  await reset();
});

describe("inquiry Worker security regressions", () => {
  it("serves health and enforces CORS through the real SELF entrypoint", async () => {
    const health = await SELF.fetch("https://worker.example/health");
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({
      ok: true,
      service: "jabbar-sourcing-inquiry-api",
      version: "1.0.0",
    });

    const allowed = await SELF.fetch("https://worker.example/inquiry", {
      method: "OPTIONS",
      headers: { Origin: ALLOWED_ORIGIN },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    expect(allowed.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(allowed.headers.get("Access-Control-Expose-Headers")).toBe("Retry-After");
    expect(allowed.headers.get("Vary")).toBe("Origin");

    const denied = await SELF.fetch("https://worker.example/inquiry", {
      method: "OPTIONS",
      headers: { Origin: "https://attacker.example" },
    });
    expect(denied.status).toBe(403);
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("runs the edge limiter before Turnstile and stops immediately when denied", async () => {
    const context = createEnv({ edgeRateLimitSuccess: false });
    const response = await handleRequest(inquiryRequest(validPayload()), context.env);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(context.trace).toEqual(["edge"]);
    expect(context.edgeRateLimit.keys).toHaveLength(1);
    expect(context.edgeRateLimit.keys[0]).toMatch(/^edge:[0-9a-f]{32}$/);
    expect(context.contactRateLimit.keys).toHaveLength(0);
    expect(context.turnstileCalls).toHaveLength(0);
    expect(context.email.attempts).toBe(0);
  });

  it("runs the contact limiter only after successful Turnstile verification", async () => {
    const context = createEnv({ contactRateLimitSuccess: false });
    const response = await handleRequest(inquiryRequest(validPayload()), context.env);

    expect(response.status).toBe(429);
    expect(context.trace).toEqual(["edge", "turnstile", "contact"]);
    expect(context.edgeRateLimit.keys).toHaveLength(1);
    expect(context.contactRateLimit.keys[0]).toMatch(/^contact:[0-9a-f]{32}$/);
    expect(context.email.attempts).toBe(0);
  });

  it("passes token, client IP, and a server-derived retry UUID to the Spin binding", async () => {
    const context = createEnv();
    const payload = validPayload();
    const response = await handleRequest(inquiryRequest(payload), context.env);

    expect(response.status).toBe(201);
    expect(context.turnstileCalls).toHaveLength(1);
    expect(context.turnstileCalls[0]).toMatchObject({
      url: "https://turnstile-siteverify.internal/siteverify",
      method: "POST",
      contentType: "application/json",
      body: {
        token: payload.turnstileToken,
        remoteip: CLIENT_IP,
      },
    });
    expect(context.turnstileCalls[0]?.body.idempotency_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("derives different Siteverify retry UUIDs across submission IDs", async () => {
    const context = createEnv();
    const firstPayload = validPayload();
    const secondPayload = validPayload({
      submissionId: "352cd855-c89f-4615-8f9f-0c7f7feaf820",
    });

    expect((await handleRequest(inquiryRequest(firstPayload), context.env)).status).toBe(201);
    expect((await handleRequest(inquiryRequest(secondPayload), context.env)).status).toBe(201);
    expect(context.turnstileCalls).toHaveLength(2);
    expect(context.turnstileCalls[0]?.body.token).toBe(context.turnstileCalls[1]?.body.token);
    expect(context.turnstileCalls[0]?.body.idempotency_key).not.toBe(
      context.turnstileCalls[1]?.body.idempotency_key,
    );
  });

  it("reuses the Siteverify retry UUID for the same submission and token", async () => {
    const context = createEnv({ emailFailures: 1 });
    const payload = validPayload({
      submissionId: "d51415d4-2e52-46ef-bf0c-900a32fafdfd",
    });

    expect((await handleRequest(inquiryRequest(payload), context.env)).status).toBe(502);
    expect((await handleRequest(inquiryRequest(payload), context.env)).status).toBe(201);
    expect(context.turnstileCalls).toHaveLength(2);
    expect(context.turnstileCalls[0]?.body.idempotency_key).toBe(
      context.turnstileCalls[1]?.body.idempotency_key,
    );
  });

  it("maps a non-2xx Turnstile response to a retryable service error", async () => {
    const context = createEnv({ turnstileStatus: 503 });
    const response = await handleRequest(inquiryRequest(validPayload()), context.env);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "turnstile_service_unavailable",
    });
    expect(context.trace).toEqual(["edge", "turnstile"]);
    expect(context.email.attempts).toBe(0);
  });

  it("rejects invalid JSON returned by the Turnstile service", async () => {
    const context = createEnv({ turnstileRawBody: "not-json" });
    const response = await handleRequest(inquiryRequest(validPayload()), context.env);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "turnstile_service_invalid_response",
    });
    expect(context.trace).toEqual(["edge", "turnstile"]);
    expect(context.email.attempts).toBe(0);
  });

  it("requires an exact application/json media type while allowing parameters", async () => {
    const rejectedContext = createEnv();
    const rejected = await handleRequest(
      inquiryRequest(validPayload(), { contentType: "application/jsonp" }),
      rejectedContext.env,
    );
    expect(rejected.status).toBe(415);
    await expect(rejected.json()).resolves.toMatchObject({ error: "unsupported_content_type" });
    expect(rejectedContext.turnstileCalls).toHaveLength(0);

    const acceptedContext = createEnv();
    const accepted = await handleRequest(
      inquiryRequest(validPayload(), { contentType: "application/json; charset=utf-8" }),
      acceptedContext.env,
    );
    expect(accepted.status).toBe(201);
  });

  it("rejects unknown payload fields before Turnstile or email", async () => {
    const context = createEnv();
    const response = await handleRequest(
      inquiryRequest(validPayload({ attackerControlled: "ignored" })),
      context.env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "unknown_field" });
    expect(context.trace).toEqual(["edge"]);
    expect(context.turnstileCalls).toHaveLength(0);
    expect(context.email.attempts).toBe(0);
  });

  it("requires the current privacy acknowledgement before Turnstile or email", async () => {
    const context = createEnv();
    const response = await handleRequest(
      inquiryRequest(validPayload({ privacyAcknowledged: false })),
      context.env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "privacy_acknowledgement_required",
    });
    expect(context.trace).toEqual(["edge"]);
    expect(context.turnstileCalls).toHaveLength(0);
    expect(context.email.attempts).toBe(0);
  });

  it.each([
    {
      name: "failed verification",
      result: { success: false, "error-codes": ["invalid-input-response"] },
      error: "turnstile_failed",
    },
    {
      name: "wrong action",
      result: {
        success: true,
        action: "another-form",
        hostname: "www.jabbarsourcing.com",
        "error-codes": [],
      },
      error: "turnstile_action_mismatch",
    },
    {
      name: "wrong hostname",
      result: {
        success: true,
        action: "turnstile-spin-v1",
        hostname: "attacker.example",
        "error-codes": [],
      },
      error: "turnstile_hostname_mismatch",
    },
  ])("rejects Turnstile $name", async ({ result, error }) => {
    const context = createEnv({ turnstileResult: result });
    const response = await handleRequest(inquiryRequest(validPayload()), context.env);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error });
    expect(context.trace).toEqual(["edge", "turnstile"]);
    expect(context.email.attempts).toBe(0);
  });

  it("rejects a missing Origin before all bindings are called", async () => {
    const context = createEnv();
    const response = await handleRequest(
      inquiryRequest(validPayload(), { origin: null }),
      context.env,
    );

    expect(response.status).toBe(403);
    expect(context.trace).toEqual([]);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects a missing CF-Connecting-IP before either limiter", async () => {
    const context = createEnv();
    const response = await handleRequest(
      inquiryRequest(validPayload(), { clientIp: null }),
      context.env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "missing_client_ip" });
    expect(context.trace).toEqual([]);
  });

  it("rejects a streamed body over 16 KiB without relying on Content-Length", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("x".repeat(9_000)));
        controller.enqueue(encoder.encode("y".repeat(9_000)));
        controller.close();
      },
    });
    const context = createEnv();
    const response = await handleRequest(rawInquiryRequest(stream), context.env);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "payload_too_large" });
    expect(context.trace).toEqual(["edge"]);
    expect(context.turnstileCalls).toHaveLength(0);
    expect(context.email.attempts).toBe(0);
  });

  it("rejects a declared body over 16 KiB before reading it", async () => {
    const context = createEnv();
    const response = await handleRequest(
      inquiryRequest(validPayload(), { contentLength: "20000" }),
      context.env,
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "payload_too_large" });
    expect(context.trace).toEqual(["edge"]);
    expect(context.turnstileCalls).toHaveLength(0);
    expect(context.email.attempts).toBe(0);
  });

  it("returns the original result for a repeated submission and sends one email", async () => {
    const context = createEnv();
    const payload = validPayload();

    const first = await handleRequest(inquiryRequest(payload), context.env);
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { requestId: string };

    const duplicate = await handleRequest(inquiryRequest(payload), context.env);
    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toEqual({
      ok: true,
      requestId: firstBody.requestId,
      duplicate: true,
    });

    expect(context.email.attempts).toBe(1);
    expect(context.email.sent).toHaveLength(1);
    expect(context.turnstileCalls).toHaveLength(1);
    expect(context.edgeRateLimit.keys).toHaveLength(2);
    expect(context.contactRateLimit.keys).toHaveLength(1);
  });

  it("rejects changed content that reuses an existing submission ID", async () => {
    const context = createEnv();
    const payload = validPayload();

    const first = await handleRequest(inquiryRequest(payload), context.env);
    expect(first.status).toBe(201);

    const conflict = await handleRequest(
      inquiryRequest({ ...payload, product: "A different inquiry" }),
      context.env,
    );
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ error: "submission_id_conflict" });
    expect(context.email.attempts).toBe(1);
    expect(context.turnstileCalls).toHaveLength(1);
  });

  it("allows only one concurrent request to acquire the same submission ID", async () => {
    const context = createEnv();
    const payload = validPayload({
      submissionId: "546c56f3-202e-45f7-b2f8-3a52acfe1d15",
    });

    const responses = await Promise.all([
      handleRequest(inquiryRequest(payload), context.env),
      handleRequest(inquiryRequest(payload), context.env),
    ]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409]);
    expect(context.email.attempts).toBe(1);
    expect(context.email.sent).toHaveLength(1);
  });

  it("marks failed delivery retryable and succeeds on the next submission", async () => {
    const context = createEnv({ emailFailures: 1 });
    const payload = validPayload();
    const payloadFingerprint = await testPayloadFingerprint(payload);

    const first = await handleRequest(inquiryRequest(payload), context.env);
    expect(first.status).toBe(502);
    await expect(first.json()).resolves.toMatchObject({ error: "email_delivery_failed" });

    const stub = testEnv.INQUIRY_IDEMPOTENCY.getByName(
      String(payload.submissionId),
    );
    await expect(stub.getStatus(payloadFingerprint)).resolves.toMatchObject({ state: "failed" });

    const retryPayload = {
      ...payload,
      turnstileToken: "refreshed-turnstile-token",
    };
    const retry = await handleRequest(inquiryRequest(retryPayload), context.env);
    expect(retry.status).toBe(201);
    await expect(stub.getStatus(payloadFingerprint)).resolves.toMatchObject({ state: "sent" });
    expect(context.email.attempts).toBe(2);
    expect(context.email.sent).toHaveLength(1);
    expect(context.turnstileCalls).toHaveLength(2);
    expect(context.turnstileCalls[1]?.body).toMatchObject({
      token: retryPayload.turnstileToken,
    });
    expect(context.turnstileCalls[1]?.body.idempotency_key).not.toBe(
      context.turnstileCalls[0]?.body.idempotency_key,
    );
  });

  it("uses a real Durable Object for begin, markSent, and alarm cleanup", async () => {
    const stub = testEnv.INQUIRY_IDEMPOTENCY.getByName(
      "durable-object-security-regression",
    );
    const typedStub = stub as DurableObjectStub<InquiryIdempotency>;
    const requestId = "7de36983-b142-4f86-90aa-1301fb30cb4c";
    const payloadFingerprint = "a".repeat(64);

    const initialClaim = await typedStub.begin(requestId, payloadFingerprint);
    expect(initialClaim).toMatchObject({ state: "acquired", requestId });
    if (initialClaim.state !== "acquired") throw new Error("expected acquired claim");
    expect(initialClaim.claimId).toMatch(/^[0-9a-f-]{36}$/);

    const persisted = await runInDurableObject(
      typedStub,
      async (instance, state) => ({
        status: await instance.getStatus(payloadFingerprint),
        alarm: await state.storage.getAlarm(),
      }),
    );
    expect(persisted.status).toMatchObject({ state: "pending", requestId });
    expect(persisted.alarm).toBeTypeOf("number");
    expect(persisted.alarm ?? 0).toBeGreaterThan(Date.now());

    await expect(typedStub.begin(crypto.randomUUID(), payloadFingerprint)).resolves.toEqual({
      state: "pending",
      requestId,
    });
    await expect(typedStub.getStatus("b".repeat(64))).resolves.toEqual({
      state: "conflict",
    });
    await expect(
      typedStub.markSent("wrong-request-id", initialClaim.claimId),
    ).resolves.toBe(false);
    await expect(typedStub.markSent(requestId, crypto.randomUUID())).resolves.toBe(false);
    await expect(typedStub.markSent(requestId, initialClaim.claimId)).resolves.toBe(true);
    await expect(typedStub.getStatus(payloadFingerprint)).resolves.toEqual({
      state: "sent",
      requestId,
    });

    await runInDurableObject(typedStub, async (_instance, state) => {
      await state.storage.put("submission", {
        state: "sent",
        requestId,
        payloadFingerprint,
        expiresAt: Date.now() - 1,
      });
      await state.storage.setAlarm(Date.now() + 1_000);
    });

    await expect(runDurableObjectAlarm(typedStub)).resolves.toBe(true);
    await expect(typedStub.getStatus(payloadFingerprint)).resolves.toEqual({ state: "missing" });
  });

  it("reclaims an expired pending lease without changing the request ID", async () => {
    const typedStub = testEnv.INQUIRY_IDEMPOTENCY.getByName(
      "expired-pending-lease",
    ) as DurableObjectStub<InquiryIdempotency>;
    const requestId = "1b8057a0-b8a8-4af2-b66d-f80fe7ebd94c";
    const payloadFingerprint = "c".repeat(64);
    const expiredClaimId = "6f8b5d46-e733-423f-8aa3-6b7786f3dd60";

    await runInDurableObject(typedStub, async (_instance, state) => {
      await state.storage.put("submission", {
        state: "pending",
        requestId,
        payloadFingerprint,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        leaseUntil: Date.now() - 60 * 1000,
        claimId: expiredClaimId,
      });
    });

    const reclaimed = await typedStub.begin(crypto.randomUUID(), payloadFingerprint);
    expect(reclaimed).toMatchObject({ state: "acquired", requestId });
    if (reclaimed.state !== "acquired") throw new Error("expected reclaimed lease");
    expect(reclaimed.claimId).not.toBe(expiredClaimId);
    await expect(typedStub.markSent(requestId, expiredClaimId)).resolves.toBe(false);
    await expect(typedStub.markSent(requestId, reclaimed.claimId)).resolves.toBe(true);
    const status = await typedStub.getStatus(payloadFingerprint);
    expect(status).toEqual({ state: "sent", requestId });
  });

  it("keeps the recipient fixed and escapes customer HTML", async () => {
    const context = createEnv();
    const response = await handleRequest(
      inquiryRequest(
        validPayload({ product: '<img src=x onerror="alert(1)">' }),
      ),
      context.env,
    );

    expect(response.status).toBe(201);
    expect(context.email.sent).toHaveLength(1);
    expect(context.email.sent[0]?.to).toBe(RECIPIENT);
    expect(context.email.sent[0]?.from).toEqual({
      email: SENDER,
      name: "Jabbar Sourcing Website",
    });
    expect(context.email.sent[0]?.html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
    expect(context.email.sent[0]?.html).not.toContain(
      '<img src=x onerror="alert(1)">',
    );
  });
});
