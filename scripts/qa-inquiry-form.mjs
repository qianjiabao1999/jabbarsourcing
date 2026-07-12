#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_OUTPUT_DIR || "/tmp/jabbar-inquiry-qa";
const API_URL = "https://inquiry-api.jabbarsourcing.com/inquiry";
const EXACT_PAYLOAD_KEYS = [
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
  "sourcePath",
  "submissionId",
  "turnstileToken"
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

await openInquiry("/inquiry/");

const fallbackSnapshot = await page.locator(".js-inquiry-send").evaluateAll((buttons) =>
  buttons.map((button) => ({ channel: button.dataset.channel, type: button.type }))
);
assert(fallbackSnapshot.length === 4, "Expected four fallback buttons");
assert(fallbackSnapshot.every((item) => item.type === "button"), "Fallback controls must remain type=button");

await fillRequired("QA storage items", "qa@example.com");
apiResponses.push(response(201, { ok: true, requestId: "qa-201" }));
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(apiPayloads.length === 1, "Happy path should issue one API request");
assert(
  JSON.stringify(Object.keys(apiPayloads[0]).sort()) === JSON.stringify(EXACT_PAYLOAD_KEYS),
  "Happy path payload must contain exactly 14 allowed keys"
);
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(apiPayloads[0].submissionId), "submissionId must be UUIDv4");
assert(apiPayloads[0].privacyAcknowledged === true, "Privacy acknowledgement must be boolean true");
assert((await page.locator('[name="product"]').inputValue()) === "", "Success must clear product");
assert(!(await page.locator(".js-inquiry-privacy").isChecked()), "Success must clear privacy acknowledgement");

await fillRequired("QA retry product", "qa-retry@example.com");
apiResponses.push(
  response(502, { ok: false, error: "email_delivery_failed" }),
  response(201, { ok: true, requestId: "qa-retry" })
);
const beforeRetry = apiPayloads.length;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-error"));
await page.waitForFunction(() => window.__turnstileResetCount > 0 && window.__turnstileIssueCount > 1);
assert((await page.locator('[name="product"]').inputValue()) === "QA retry product", "502 must preserve business fields");
const firstRetryId = apiPayloads[beforeRetry].submissionId;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(apiPayloads[beforeRetry + 1].submissionId === firstRetryId, "Same-content retry must reuse submissionId");

await fillRequired("QA pending product", "qa-pending@example.com");
apiResponses.push(
  response(409, { ok: false, error: "submission_in_progress" }, { "Retry-After": "5" }),
  response(201, { ok: true, requestId: "qa-pending-complete" })
);
const beforePending = apiPayloads.length;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.textContent.includes("5s"));
const pendingId = apiPayloads[beforePending].submissionId;
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(apiPayloads[beforePending + 1].submissionId === pendingId, "Pending retry must preserve submissionId");

await fillRequired("QA original in-flight value", "qa-in-flight@example.com");
apiResponses.push({
  ...response(201, { ok: true, requestId: "qa-in-flight" }),
  delay: 250
});
await clickDirect();
await page.locator('[name="product"]').fill("QA unsent edit must remain");
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-success"));
assert(
  (await page.locator('[name="product"]').inputValue()) === "QA unsent edit must remain",
  "A successful in-flight request must not clear later user edits"
);

await page.locator('[name="product"]').fill("QA privacy gate");
await page.locator('[name="contact"]').fill("qa-privacy@example.com");
await page.locator(".js-inquiry-privacy").uncheck();
const beforePrivacyGate = apiPayloads.length;
await clickDirect();
await page.waitForFunction(() => Boolean(document.querySelector(".js-inquiry-privacy-error")?.textContent.trim()));
assert(apiPayloads.length === beforePrivacyGate, "Unchecked privacy gate must not call the API");

await page.locator(".js-inquiry-privacy").check();
await page.evaluate(() => window.__turnstileOptions["expired-callback"]());
await clickDirect();
await page.waitForFunction(() => document.querySelector(".inquiry-status")?.classList.contains("is-error"));
assert(apiPayloads.length === beforePrivacyGate, "Expired Turnstile token must not call the API");

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
      const mobileNavigation = document.querySelector(".site-nav-mobile-panel")?.getBoundingClientRect();
      const fallback = Array.from(document.querySelectorAll(".js-inquiry-send"));
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        directWidth: direct?.width || 0,
        panelWidth: panel?.width || 0,
        fallbackCount: fallback.length,
        brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length,
        dir: document.documentElement.dir || "ltr",
        mobileNavigationLeft: mobileNavigation?.left ?? 0,
        mobileNavigationRight: mobileNavigation?.right ?? 0
      };
    });
    assert(metrics.overflow <= 1, `${item.locale} ${viewport.name} has horizontal overflow: ${metrics.overflow}px`);
    assert(metrics.directWidth > 0 && metrics.panelWidth > 0, `${item.locale} ${viewport.name} direct-submit layout is missing`);
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
    title: document.title
  }));
  assert(privacyMetrics.overflow <= 1, `Privacy ${viewport.name} has horizontal overflow: ${privacyMetrics.overflow}px`);
  assert(privacyMetrics.inquirySections === 1, "Privacy policy must contain one website-inquiries section");
  assert(privacyMetrics.mentionsAnalytics, "Privacy policy must disclose analytics processing");
  assert(privacyMetrics.title === "Jabbar Sourcing Privacy Policy", "Privacy page title must cover public website inquiries");
}

assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(" | ")}`);

await browser.close();
console.log(`Inquiry Playwright QA passed. Screenshots: ${OUTPUT_DIR}`);
