#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_OUTPUT_DIR || "/tmp/jabbar-inquiry-qa";
const API_URL = "https://inquiry-api.jabbarsourcing.com/inquiry";
const EXACT_PAYLOAD_KEYS = [
  "attribution",
  "budget",
  "category",
  "company",
  "contact",
  "locale",
  "market",
  "note",
  "privacyAcknowledged",
  "privacyVersion",
  "product",
  "quantity",
  "referenceUrl",
  "sourcePath",
  "submissionId",
  "turnstileToken"
];
const EXACT_ATTRIBUTION_KEYS = [
  "landing_path",
  "referrer_host",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term"
];
const EXACT_SUCCESS_EVENT_KEYS = [
  "duration_ms",
  "landing_path",
  "locale",
  "method",
  "referrer_host",
  "source_path",
  "status",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term"
];
const PAGES = [
  { locale: "zh", path: "/inquiry/" },
  { locale: "en", path: "/en/inquiry/" },
  { locale: "es", path: "/es/inquiry/" },
  { locale: "ar", path: "/ar/inquiry/", rtl: true },
  { locale: "fr", path: "/fr/inquiry/" },
  { locale: "pt", path: "/pt/inquiry/" },
  { locale: "ru", path: "/ru/inquiry/" },
  { locale: "de", path: "/de/inquiry/" },
  { locale: "it", path: "/it/inquiry/" },
  { locale: "tr", path: "/tr/inquiry/" }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function response(status, body, headers = {}) {
  return { status, body, headers };
}

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const apiResponses = [];
const apiPayloads = [];
const consoleErrors = [];

await context.route("**/turnstile/v0/api.js*", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: `
      (function () {
        var sequence = 0;
        window.__turnstileResetCount = 0;
        window.__turnstileIssueCount = 0;
        window.turnstile = {
          render: function (element, options) {
            window.__turnstileOptions = options;
            element.innerHTML = '<div data-testid="mock-turnstile" style="display:grid;place-items:center;width:100%;min-height:65px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155">Security check ready</div>';
            window.setTimeout(function () {
              sequence += 1;
              window.__turnstileIssueCount += 1;
              options.callback('mock-turnstile-token-' + sequence);
            }, 0);
            return 'mock-widget';
          },
          reset: function () {
            window.__turnstileResetCount += 1;
            window.setTimeout(function () {
              sequence += 1;
              window.__turnstileIssueCount += 1;
              window.__turnstileOptions.callback('mock-turnstile-token-' + sequence);
            }, 0);
          }
        };
      })();
    `
  });
});

await context.route("**://www.googletagmanager.com/**", (route) => route.fulfill({ status: 200, body: "" }));
await context.route("**://www.clarity.ms/**", (route) => route.fulfill({ status: 204, body: "" }));
await context.route(API_URL, async (route) => {
  const request = route.request();
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "Retry-After"
  };
  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    return;
  }
  apiPayloads.push(JSON.parse(request.postData() || "{}"));
  const next = apiResponses.shift() || response(201, { ok: true, requestId: "qa-default" });
  if (next.delay) await new Promise((resolve) => setTimeout(resolve, next.delay));
  await route.fulfill({
    status: next.status,
    contentType: "application/json; charset=utf-8",
    headers: { ...corsHeaders, ...next.headers },
    body: JSON.stringify(next.body)
  });
});

const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

async function openInquiry(path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const button = document.querySelector(".js-inquiry-direct");
    return Boolean(button && !button.disabled && window.__turnstileOptions && window.__turnstileIssueCount > 0);
  });
}

async function fillRequired(product, contact) {
  await page.locator('[name="product"]').fill(product);
  await page.locator('[name="contact"]').fill(contact);
  await page.locator(".js-inquiry-privacy").check();
}

async function clickDirect() {
  await page.locator(".js-inquiry-direct").click();
}

async function analyticsEvents(eventName) {
  return page.evaluate((name) => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === name)
    .map((entry) => entry[2] || {}), eventName);
}

function assertInquiryEvent(event, status, scope) {
  assert(Boolean(event), `${scope} did not emit inquiry_submit`);
  assert(
    JSON.stringify(Object.keys(event).sort()) === JSON.stringify(EXACT_SUCCESS_EVENT_KEYS),
    `${scope} inquiry_submit contains an unexpected or missing analytics field`
  );
  assert(event.method === "direct", `${scope} inquiry_submit method is ${event.method}`);
  assert(event.status === status, `${scope} inquiry_submit status is ${event.status}, expected ${status}`);
  assert(event.locale === "zh", `${scope} inquiry_submit locale is ${event.locale}`);
  assert(Number.isInteger(event.duration_ms) && event.duration_ms >= 0 && event.duration_ms <= 60000, `${scope} inquiry_submit duration_ms is outside 0..60000`);
  assert(!JSON.stringify(event).includes("qa@example.com"), `${scope} analytics leaked contact data`);
  assert(!JSON.stringify(event).includes("QA storage items"), `${scope} analytics leaked product data`);
}

const indexGuardPage = await context.newPage();
await indexGuardPage.goto(
  `${BASE_URL}/en/inquiry/index.html?utm_source=index_guard`,
  { waitUntil: "domcontentloaded" },
);
await indexGuardPage.waitForFunction(() => typeof window.jabbarCaptureAttribution === "function");
const indexGuardAttribution = await indexGuardPage.evaluate(() =>
  JSON.parse(sessionStorage.getItem("jabbarAttributionV1") || "{}"),
);
assert(
  indexGuardAttribution.landing_path === "/en/inquiry/",
  "Explicit index.html entry must normalize to the canonical directory landing path",
);
await indexGuardPage.close();

await page.goto(
  `${BASE_URL}/?utm_source=google&utm_medium=cpc&utm_campaign=summer_wholesale&utm_term=yiwu+sourcing&utm_content=hero_cta`,
  { waitUntil: "domcontentloaded", referer: "https://www.google.com/search?q=yiwu+sourcing" }
);
await page.waitForFunction(() => typeof window.jabbarCaptureAttribution === "function");
const firstTouchAttribution = await page.evaluate(() => JSON.parse(sessionStorage.getItem("jabbarAttributionV1") || "{}"));
assert(firstTouchAttribution.landing_path === "/", "First-touch attribution must retain the landing page without query data");
assert(firstTouchAttribution.referrer_host === "www.google.com", "Attribution must retain only the external referrer hostname");
assert(firstTouchAttribution.utm_source === "google", "Attribution must retain utm_source");
assert(firstTouchAttribution.utm_campaign === "summer_wholesale", "Attribution must retain utm_campaign");
await page.evaluate(() => {
  document.querySelector(".inquiry-entry-card-cta")?.addEventListener("click", (event) => event.preventDefault(), { once: true });
});
await page.locator(".inquiry-entry-card-cta").click();
const quoteEvents = await analyticsEvents("quote_click");
assert(quoteEvents.length === 1, "Homepage quote CTA must emit quote_click exactly once");
assert(quoteEvents[0].placement === "hero", "Homepage quote_click must retain its placement");
assert(quoteEvents[0].landing_path === "/" && quoteEvents[0].utm_source === "google", "quote_click must include first-touch attribution");

await page.goto(`${BASE_URL}/inquiry/`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  sessionStorage.setItem("jabbarCalcResult", JSON.stringify({
    savedAt: Date.now(),
    product: "QA calculator product",
    quantity: "3,600 pcs",
    message: "QA calculator result: 12.4 CBM, one 20GP container"
  }));
});
await openInquiry("/inquiry/");
assert((await page.locator('[name="product"]').inputValue()) === "QA calculator product", "Fresh calculator handoff must prefill product");
assert((await page.locator('[name="quantity"]').inputValue()) === "3,600 pcs", "Fresh calculator handoff must prefill quantity");
assert(
  (await page.locator('[name="note"]').inputValue()) === "QA calculator result: 12.4 CBM, one 20GP container",
  "Calculator message must prefill note"
);
assert(
  (await page.evaluate(() => sessionStorage.getItem("jabbarCalcResult"))) === null,
  "Consumed calculator handoff must be removed"
);

await page.evaluate(() => {
  sessionStorage.setItem("jabbarCalcResult", JSON.stringify({
    savedAt: Date.now() - (2 * 60 * 60 * 1000 + 1),
    product: "QA stale calculator product",
    quantity: "stale quantity",
    message: "stale result"
  }));
});
await openInquiry("/inquiry/");
assert((await page.locator('[name="product"]').inputValue()) === "", "Calculator handoff older than two hours must be ignored");
assert((await page.locator('[name="quantity"]').inputValue()) === "", "Stale calculator quantity must be ignored");
assert((await page.locator('[name="note"]').inputValue()) === "", "Stale calculator note must be ignored");
assert(
  (await page.evaluate(() => sessionStorage.getItem("jabbarCalcResult"))) === null,
  "Stale calculator handoff must be removed"
);
const persistedAttribution = await page.evaluate(() => JSON.parse(sessionStorage.getItem("jabbarAttributionV1") || "{}"));
assert(persistedAttribution.landing_path === "/", "Inquiry navigation must preserve the first landing page");
assert(persistedAttribution.referrer_host === "www.google.com", "Inquiry navigation must preserve the external referrer hostname");
const viewEvents = await analyticsEvents("inquiry_view");
assert(viewEvents.length === 1, "Inquiry page must emit inquiry_view exactly once per load");
assert(viewEvents[0].source_path === "/inquiry/" && viewEvents[0].landing_path === "/", "inquiry_view must separate source and first landing paths");

const statusContract = await page.locator(".inquiry-status").evaluate((status) => ({
  role: status.getAttribute("role"),
  live: status.getAttribute("aria-live"),
  atomic: status.getAttribute("aria-atomic"),
  tabIndex: status.getAttribute("tabindex"),
  insideDirectPanel: status.parentElement?.classList.contains("inquiry-direct-panel") || false,
  immediatelyAfterDirectButton: status.previousElementSibling?.classList.contains("js-inquiry-direct") || false
}));
assert(statusContract.role === "status", "Inquiry feedback must expose role=status");
assert(statusContract.live === "polite" && statusContract.atomic === "true", "Inquiry feedback must be an atomic polite live region");
assert(statusContract.tabIndex === "-1", "Inquiry feedback must be programmatically focusable");
assert(statusContract.insideDirectPanel, "Inquiry feedback must remain inside the direct-submit panel");
assert(statusContract.immediatelyAfterDirectButton, "Inquiry feedback must immediately follow the direct-submit button");

await page.evaluate(() => {
  window.__inquiryScrollCalls = [];
  var nativeScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (options) {
    if (this.classList && this.classList.contains("inquiry-status")) {
      window.__inquiryScrollCalls.push(options || null);
    }
    try { return nativeScrollIntoView.call(this, options); } catch (error) { return nativeScrollIntoView.call(this); }
  };
});

const fallbackSnapshot = await page.locator(".js-inquiry-send").evaluateAll((buttons) =>
  buttons.map((button) => ({ channel: button.dataset.channel, type: button.type }))
);
assert(fallbackSnapshot.length === 4, "Expected four fallback buttons");
assert(fallbackSnapshot.every((item) => item.type === "button"), "Fallback controls must remain type=button");
await page.locator('.js-inquiry-send[data-channel="wechat"]').dispatchEvent("click");
const fallbackChannelEvents = await analyticsEvents("channel_fallback");
assert(fallbackChannelEvents.length === 1, "Fallback click must emit channel_fallback once even before required fields are complete");
assert(fallbackChannelEvents[0].channel === "wechat", "Fallback click must preserve its channel");
assert((await analyticsEvents("inquiry_channel_click")).length === 0, "Fallback click must not emit the superseded inquiry_channel_click event");
assert((await analyticsEvents("inquiry_submit")).length === 0, "Fallback click must not emit inquiry_submit");
await page.waitForTimeout(10);
assert((await analyticsEvents("inquiry_submit_error")).length === 0, "Fallback validation must not impersonate a direct-submit error");

await fillRequired("QA invalid reference", "qa-invalid-reference@example.com");
await page.locator('[name="referenceUrl"]').fill("ftp://example.com/product");
const beforeInvalidReferenceApi = apiPayloads.length;
const beforeInvalidReferenceErrors = (await analyticsEvents("inquiry_submit_error")).length;
await clickDirect();
await page.waitForFunction(
  (before) => (window.dataLayer || []).filter((entry) => entry[0] === "event" && entry[1] === "inquiry_submit_error").length > before,
  beforeInvalidReferenceErrors,
);
assert(apiPayloads.length === beforeInvalidReferenceApi, "Invalid reference URL must be stopped before the API request");
const invalidReferenceErrors = await analyticsEvents("inquiry_submit_error");
assert(invalidReferenceErrors.at(-1)?.error_code === "native_validation", "Invalid reference URL must report controlled native validation");
assert(invalidReferenceErrors.at(-1)?.stage === "validation", "Invalid reference URL must use the validation funnel stage");
assert(invalidReferenceErrors.at(-1)?.duration_ms === 0, "Local validation error duration must remain zero");

await fillRequired("QA storage items", "qa@example.com");
await page.locator('[name="referenceUrl"]').fill("https://www.alibaba.com/product-detail/qa-storage-item.html");
const formStartEvents = await analyticsEvents("inquiry_form_start");
assert(formStartEvents.length === 1, "First business-field interaction must emit inquiry_form_start once");
assert((await analyticsEvents("form_start")).length === 0, "Custom inquiry funnel must not duplicate GA4 form_start");
const directButtonLabel = (await page.locator(".js-inquiry-direct").textContent())?.trim();
apiResponses.push({ ...response(201, { ok: true, requestId: "qa-201" }), delay: 300 });
await clickDirect();
await page.waitForFunction(() => document.querySelector(".js-inquiry-direct")?.getAttribute("aria-busy") === "true");
assert((await page.locator(".js-inquiry-direct").textContent())?.trim() === "提交中…", "Submitting must replace the button label");
assert(await page.locator(".js-inquiry-direct").isDisabled(), "Submitting must disable the direct-submit button");
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(apiPayloads.length === 1, "Happy path should issue one API request");
assert(
  JSON.stringify(Object.keys(apiPayloads[0]).sort()) === JSON.stringify(EXACT_PAYLOAD_KEYS),
  `Happy path payload must contain exactly ${EXACT_PAYLOAD_KEYS.length} allowed keys`
);
assert(
  JSON.stringify(Object.keys(apiPayloads[0].attribution).sort()) === JSON.stringify(EXACT_ATTRIBUTION_KEYS),
  "Happy path attribution must contain only the allowed source fields"
);
assert(apiPayloads[0].referenceUrl === "https://www.alibaba.com/product-detail/qa-storage-item.html", "Happy path must include the product reference URL");
assert(apiPayloads[0].attribution.landing_path === "/", "Payload must preserve first-touch landing_path");
assert(apiPayloads[0].attribution.referrer_host === "www.google.com", "Payload must send hostname-only referrer attribution");
assert(apiPayloads[0].attribution.utm_campaign === "summer_wholesale", "Payload must include bounded UTM attribution");
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(apiPayloads[0].submissionId), "submissionId must be UUIDv4");
assert(apiPayloads[0].privacyAcknowledged === true, "Privacy acknowledgement must be boolean true");
assert((await page.locator('[name="product"]').inputValue()) === "", "Success must clear product");
assert(!(await page.locator(".js-inquiry-privacy").isChecked()), "Success must clear privacy acknowledgement");
assert((await page.locator(".js-inquiry-direct").textContent())?.trim() === directButtonLabel, "Submission completion must restore the original button label");
assert(!(await page.locator(".js-inquiry-direct").isDisabled()), "Submission completion must re-enable the direct-submit button");
const submitStartEvents = await analyticsEvents("inquiry_submit_start");
assert(submitStartEvents.length === 1, "Happy path must emit inquiry_submit_start exactly once");
assert(submitStartEvents[0].duration_ms === 0, "Submit-start duration must begin at zero");
assert((await analyticsEvents("inquiry_submit_success")).length === 0, "Existing inquiry_submit must remain the sole success event");
assert((await page.locator(".inquiry-status").textContent()).includes("24"), "Success feedback must promise a reply within 24 hours");
assert(await page.locator(".inquiry-status .inquiry-status-icon").getAttribute("aria-hidden") === "true", "Success check must not duplicate the live-region announcement");
const successWhatsapp = await page.locator(".inquiry-status .inquiry-status-whatsapp").evaluate((link) => ({
  href: link.getAttribute("href"),
  target: link.getAttribute("target"),
  rel: link.getAttribute("rel")
}));
assert(successWhatsapp.href === "https://wa.me/8618658925544", "Success feedback must include the WhatsApp shortcut");
assert(successWhatsapp.target === "_blank", "Success WhatsApp shortcut must open separately");
assert(successWhatsapp.rel === "noopener noreferrer", "Success WhatsApp shortcut must isolate the new page");
await page.waitForFunction(() => (window.__inquiryScrollCalls || []).length >= 2);
const successScrollCalls = await page.evaluate(() => window.__inquiryScrollCalls);
assert(
  successScrollCalls.some((options) => options?.block === "nearest" && options?.behavior === "smooth"),
  "Non-reduced motion must reveal nonempty status with nearest smooth scrolling"
);
assert(await page.locator(".inquiry-status").evaluate((status) => document.activeElement === status), "Success feedback must receive focus without extra scrolling");

await page.locator('[name="product"]').fill("QA fallback after direct success");
await page.locator('[name="contact"]').fill("qa-fallback@example.com");
await page.locator('.js-inquiry-send[data-channel="wechat"]').dispatchEvent("click");
await page.waitForFunction(() => {
  const status = document.querySelector(".inquiry-status");
  return Boolean(status?.textContent.trim())
    && !status.classList.contains("is-success")
    && !status.classList.contains("is-error")
    && !status.classList.contains("is-pending");
});

let inquiryEvents = await analyticsEvents("inquiry_submit");
assert(inquiryEvents.length === 1, "201 success must emit inquiry_submit exactly once");
assertInquiryEvent(inquiryEvents[0], 201, "201 success");

await fillRequired("QA retry product", "qa-retry@example.com");
apiResponses.push(
  response(502, { ok: false, error: "email_delivery_failed" }),
  response(200, { ok: true, requestId: "qa-retry" })
);
const beforeRetry = apiPayloads.length;
const beforeRetryEvents = inquiryEvents.length;
const beforeRetryErrors = (await analyticsEvents("inquiry_submit_error")).length;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-error"));
assert((await analyticsEvents("inquiry_submit")).length === beforeRetryEvents, "502 failure must not emit inquiry_submit");
const retryErrors = await analyticsEvents("inquiry_submit_error");
assert(retryErrors.length === beforeRetryErrors + 1, "502 failure must emit inquiry_submit_error exactly once");
assert(retryErrors.at(-1)?.error_code === "email_delivery_failed" && retryErrors.at(-1)?.status === 502, "502 error analytics must retain a controlled response code and status");
assert(retryErrors.at(-1)?.stage === "response", "502 error analytics must use the response funnel stage");
assert(Number.isInteger(retryErrors.at(-1)?.duration_ms) && retryErrors.at(-1).duration_ms >= 0 && retryErrors.at(-1).duration_ms <= 60000, "502 error duration_ms must remain within 0..60000");
assert(await page.locator(".inquiry-status").evaluate((status) => status.childElementCount === 0), "Non-success feedback must remain plain text");
assert(await page.locator(".inquiry-status").evaluate((status) => document.activeElement === status), "Error feedback must receive focus without extra scrolling");
await page.waitForFunction(() => window.__turnstileResetCount > 0 && window.__turnstileIssueCount > 1);
assert((await page.locator('[name="product"]').inputValue()) === "QA retry product", "502 must preserve business fields");
const firstRetryId = apiPayloads[beforeRetry].submissionId;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(apiPayloads[beforeRetry + 1].submissionId === firstRetryId, "Same-content retry must reuse submissionId");
inquiryEvents = await analyticsEvents("inquiry_submit");
assert(inquiryEvents.length === beforeRetryEvents + 1, "Retry success must emit inquiry_submit exactly once");
assertInquiryEvent(inquiryEvents.at(-1), 200, "200 retry success");

await fillRequired("QA pending product", "qa-pending@example.com");
apiResponses.push(
  response(409, { ok: false, error: "submission_in_progress" }, { "Retry-After": "5" }),
  response(202, { ok: true, requestId: "qa-pending-complete" })
);
const beforePending = apiPayloads.length;
const beforePendingEvents = inquiryEvents.length;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.textContent.includes("5s"));
assert((await analyticsEvents("inquiry_submit")).length === beforePendingEvents, "409 pending response must not emit inquiry_submit");
const pendingId = apiPayloads[beforePending].submissionId;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(apiPayloads[beforePending + 1].submissionId === pendingId, "Pending retry must preserve submissionId");
inquiryEvents = await analyticsEvents("inquiry_submit");
assert(inquiryEvents.length === beforePendingEvents + 1, "202 acceptance must emit inquiry_submit exactly once");
assertInquiryEvent(inquiryEvents.at(-1), 202, "202 acceptance");

await fillRequired("QA original in-flight value", "qa-in-flight@example.com");
apiResponses.push({
  ...response(201, { ok: true, requestId: "qa-in-flight" }),
  delay: 250
});
const beforeInFlightEvents = inquiryEvents.length;
await clickDirect();
await page.locator('[name="product"]').fill("QA unsent edit must remain");
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(
  (await page.locator('[name="product"]').inputValue()) === "QA unsent edit must remain",
  "A successful in-flight request must not clear later user edits"
);
assert(
  await page.locator('[name="product"]').evaluate((field) => document.activeElement === field),
  "Async feedback must not steal focus from a field edited during submission"
);
inquiryEvents = await analyticsEvents("inquiry_submit");
assert(inquiryEvents.length === beforeInFlightEvents + 1, "In-flight success must emit inquiry_submit exactly once");
assertInquiryEvent(inquiryEvents.at(-1), 201, "In-flight 201 success");

await page.locator('[name="product"]').fill("QA privacy gate");
await page.locator('[name="contact"]').fill("qa-privacy@example.com");
await page.locator(".js-inquiry-privacy").uncheck();
const beforePrivacyGate = apiPayloads.length;
const beforePrivacyEvents = inquiryEvents.length;
const beforePrivacyErrors = (await analyticsEvents("inquiry_submit_error")).length;
await clickDirect();
await page.waitForFunction(() => Boolean(document.querySelector(".js-inquiry-privacy-error")?.textContent.trim()));
assert(apiPayloads.length === beforePrivacyGate, "Unchecked privacy gate must not call the API");
assert((await analyticsEvents("inquiry_submit")).length === beforePrivacyEvents, "Privacy validation failure must not emit inquiry_submit");
const privacyErrors = await analyticsEvents("inquiry_submit_error");
assert(privacyErrors.length === beforePrivacyErrors + 1, "Privacy validation failure must emit inquiry_submit_error once");
assert(privacyErrors.at(-1)?.error_code === "privacy_required" && privacyErrors.at(-1)?.stage === "privacy", "Privacy failure analytics must use controlled fields");

await page.locator(".js-inquiry-privacy").check();
await page.emulateMedia({ reducedMotion: "reduce" });
const scrollCallsBeforeReducedMotion = await page.evaluate(() => window.__inquiryScrollCalls.length);
await page.evaluate(() => window.__turnstileOptions["expired-callback"]());
await page.waitForFunction(
  (before) => (window.__inquiryScrollCalls || []).length > before,
  scrollCallsBeforeReducedMotion
);
const reducedMotionScroll = await page.evaluate(() => window.__inquiryScrollCalls.at(-1));
assert(reducedMotionScroll?.block === "nearest" && reducedMotionScroll?.behavior === "auto", "Reduced motion must reveal status without smooth scrolling");
const beforeTurnstileErrors = (await analyticsEvents("inquiry_submit_error")).length;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-error"));
assert(apiPayloads.length === beforePrivacyGate, "Expired Turnstile token must not call the API");
assert((await analyticsEvents("inquiry_submit")).length === beforePrivacyEvents, "Expired Turnstile token must not emit inquiry_submit");
const turnstileErrors = await analyticsEvents("inquiry_submit_error");
assert(turnstileErrors.length === beforeTurnstileErrors + 1, "Missing Turnstile token must emit inquiry_submit_error once");
assert(turnstileErrors.at(-1)?.error_code === "turnstile_missing" && turnstileErrors.at(-1)?.stage === "turnstile", "Turnstile failure analytics must use controlled fields");

// The deliberate 502 and 409 response cases above produce Chromium network
// console entries. Start a clean console audit for normal page rendering.
consoleErrors.length = 0;

for (const viewport of [
  { width: 1280, height: 900, name: "desktop" },
  { width: 390, height: 844, name: "mobile" }
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  for (const item of PAGES) {
    await openInquiry(item.path);
    if (viewport.name === "mobile") {
      await page.locator(".site-nav-mobile-menu").evaluate((menu) => {
        menu.open = true;
      });
    }
    await page.screenshot({
      path: `${OUTPUT_DIR}/${item.locale}-${viewport.name}.png`,
      fullPage: true
    });
    const metrics = await page.evaluate(() => {
      const direct = document.querySelector(".js-inquiry-direct")?.getBoundingClientRect();
      const panel = document.querySelector(".inquiry-direct-panel")?.getBoundingClientRect();
      const status = document.querySelector(".inquiry-status");
      const mobileNavigation = document.querySelector(".site-nav-mobile-panel")?.getBoundingClientRect();
      const fallback = Array.from(document.querySelectorAll(".js-inquiry-send"));
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        directWidth: direct?.width || 0,
        panelWidth: panel?.width || 0,
        statusInsideDirectPanel: status?.parentElement?.classList.contains("inquiry-direct-panel") || false,
        statusAfterDirectButton: status?.previousElementSibling?.classList.contains("js-inquiry-direct") || false,
        statusRole: status?.getAttribute("role") || "",
        fallbackCount: fallback.length,
        brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length,
        dir: document.documentElement.dir || "ltr",
        mobileNavigationLeft: mobileNavigation?.left ?? 0,
        mobileNavigationRight: mobileNavigation?.right ?? 0
      };
    });
    assert(metrics.overflow <= 1, `${item.locale} ${viewport.name} has horizontal overflow: ${metrics.overflow}px`);
    assert(metrics.directWidth > 0 && metrics.panelWidth > 0, `${item.locale} ${viewport.name} direct-submit layout is missing`);
    assert(metrics.statusInsideDirectPanel && metrics.statusAfterDirectButton, `${item.locale} ${viewport.name} status placement regressed`);
    assert(metrics.statusRole === "status", `${item.locale} ${viewport.name} status semantics regressed`);
    assert(metrics.fallbackCount === 4, `${item.locale} ${viewport.name} lost a fallback channel`);
    assert(metrics.brokenImages === 0, `${item.locale} ${viewport.name} has ${metrics.brokenImages} broken loaded images`);
    if (viewport.name === "mobile") {
      assert(
        metrics.mobileNavigationLeft >= -1 && metrics.mobileNavigationRight <= viewport.width + 1,
        `${item.locale} mobile navigation is outside the viewport: ${metrics.mobileNavigationLeft}..${metrics.mobileNavigationRight}`
      );
    }
    if (item.rtl) assert(metrics.dir === "rtl", "Arabic inquiry page must remain RTL");
  }

  await page.goto(`${BASE_URL}/privacy-policy.html#website-inquiries`, { waitUntil: "domcontentloaded" });
  await page.screenshot({
    path: `${OUTPUT_DIR}/privacy-${viewport.name}.png`,
    fullPage: true
  });
  const privacyMetrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    inquirySections: document.querySelectorAll("#website-inquiries").length,
    mentionsAnalytics: document.querySelector("#website-inquiries")?.textContent.includes("Google Analytics 4") || false,
    mentionsAttribution: document.querySelector("#website-inquiries")?.textContent.includes("first landing-page path") || false,
    mentionsReferenceUrl: document.querySelector("#website-inquiries")?.textContent.includes("product reference URL") || false,
    updatedDate: document.querySelector(".legal-hero p")?.textContent || "",
    title: document.title
  }));
  assert(privacyMetrics.overflow <= 1, `Privacy ${viewport.name} has horizontal overflow: ${privacyMetrics.overflow}px`);
  assert(privacyMetrics.inquirySections === 1, "Privacy policy must contain one website-inquiries section");
  assert(privacyMetrics.mentionsAnalytics, "Privacy policy must disclose analytics processing");
  assert(privacyMetrics.mentionsAttribution, "Privacy policy must disclose first-touch inquiry attribution");
  assert(privacyMetrics.mentionsReferenceUrl, "Privacy policy must disclose the product reference URL field");
  assert(privacyMetrics.updatedDate.includes("July 18, 2026"), "Privacy policy must display the current disclosure date");
  assert(privacyMetrics.title === "Jabbar Sourcing Privacy Policy", "Privacy page title must cover public website inquiries");
}

assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(" | ")}`);

await browser.close();
console.log(`Inquiry Playwright QA passed. Screenshots: ${OUTPUT_DIR}`);
