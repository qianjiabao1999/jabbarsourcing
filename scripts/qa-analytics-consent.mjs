#!/usr/bin/env node

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const STORAGE_KEY = "jabbar.analyticsConsent.v1";
const SESSION_DEFER_KEY = "jabbar.analyticsConsent.deferred";
const ANALYTICS_REQUEST = /^https:\/\/(www\.googletagmanager\.com|www\.clarity\.ms)\//;
const WECHAT_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.60 NetType/WIFI Language/zh_CN";

const browser = await chromium.launch({ headless: true });

async function createMobileContext({ abortAnalytics = false, failLocalStorage = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: WECHAT_USER_AGENT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const analyticsRequests = [];

  await context.route(ANALYTICS_REQUEST, async (route) => {
    analyticsRequests.push(route.request().url());
    if (abortAnalytics) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });

  if (failLocalStorage) {
    await context.addInitScript((storageKey) => {
      const nativeSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === window.localStorage && key === storageKey) {
          throw new DOMException("QA blocked localStorage write", "QuotaExceededError");
        }
        return nativeSetItem.call(this, key, value);
      };
    }, STORAGE_KEY);
  }

  return { context, analyticsRequests };
}

async function gotoAndWait(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.jabbarAnalyticsConsent));
  await page.waitForTimeout(50);
}

async function assertNoFloatingSettings(page, label) {
  assert.equal(
    await page.locator("#jabbar-analytics-settings").count(),
    0,
    `${label}: legacy floating privacy-settings control exists`,
  );
}

// Decide later is session-scoped, does not load analytics, and can be reopened
// only from the in-page privacy-policy control.
{
  const { context, analyticsRequests } = await createMobileContext();
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");

  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "first visit should not have a stored analytics choice");
  assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), null, "first visit should remain undecided");
  assert.equal(analyticsRequests.length, 0, "analytics loaded before explicit consent");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, "first-visit consent panel is hidden");
  await assertNoFloatingSettings(page, "first visit");

  await page.evaluate(() => window.jabbarTrack("qa_before_consent", { source: "qa" }));
  assert.equal(await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[1] === "qa_before_consent")), false, "pre-consent event entered dataLayer");

  await page.locator(".jabbar-consent-later").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "decide-later action did not close the panel");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), "1", "decide-later action was not scoped to the current session");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "decide-later action stored a permanent choice");
  assert.equal(analyticsRequests.length, 0, "decide-later action loaded analytics");
  await assertNoFloatingSettings(page, "decide later");

  await gotoAndWait(page, "/en/calculator/");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "session defer did not survive same-tab navigation");
  assert.equal(analyticsRequests.length, 0, "session-deferred navigation loaded analytics");

  await gotoAndWait(page, "/website-privacy-policy.html");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "session-deferred privacy page reopened the panel automatically");
  const inPageControl = page.locator("[data-analytics-consent-open]");
  assert.equal(await inPageControl.count(), 1, "privacy policy must expose exactly one in-page analytics control");
  assert.equal(await inPageControl.isVisible(), true, "privacy-policy analytics control is hidden");
  assert.notEqual(await inPageControl.evaluate((element) => getComputedStyle(element).position), "fixed", "privacy-policy analytics control must not float");
  await inPageControl.tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, "privacy-policy control did not reopen analytics preferences");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), null, "privacy-policy control did not clear session defer");

  await page.evaluate(() => { document.cookie = "_ga=qa-cookie; path=/; SameSite=Lax"; });
  await page.locator(".jabbar-consent-reject").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "rejection did not close the panel");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "denied", "rejection was not stored");
  assert.equal(analyticsRequests.length, 0, "rejection loaded analytics");
  assert.equal(await page.evaluate(() => document.cookie.includes("_ga=")), false, "rejection did not remove known analytics cookies");
  await assertNoFloatingSettings(page, "rejection");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.jabbarAnalyticsConsent));
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "stored rejection reopened the consent panel");
  assert.equal(analyticsRequests.length, 0, "stored rejection loaded analytics after navigation");
  await assertNoFloatingSettings(page, "stored rejection");
  await context.close();
}

// A real touch tap under a MicroMessenger user agent closes immediately and
// analytics requests start only after explicit consent.
{
  const { context, analyticsRequests } = await createMobileContext();
  const page = await context.newPage();
  await gotoAndWait(page, "/");

  await page.locator(".jabbar-consent-accept").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "MicroMessenger tap did not close the consent panel immediately");
  assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), "granted", "MicroMessenger tap did not update in-memory consent");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "granted", "acceptance was not stored");
  await assertNoFloatingSettings(page, "acceptance");
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  assert(analyticsRequests.some((url) => url.includes("googletagmanager.com")), "Google Analytics did not load after consent");
  assert(analyticsRequests.some((url) => url.includes("clarity.ms")), "Microsoft Clarity did not load after consent");

  await page.evaluate(() => window.jabbarTrack("qa_after_consent", { source: "qa" }));
  assert.equal(
    await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[0] === "event" && entry?.[1] === "qa_after_consent")),
    true,
    "post-consent event did not enter dataLayer",
  );
  await context.close();
}

// Analytics endpoints may be blocked by an embedded browser or network policy;
// that failure must never keep the consent UI open or throw a page exception.
{
  const { context, analyticsRequests } = await createMobileContext({ abortAnalytics: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await gotoAndWait(page, "/en/");

  await page.locator(".jabbar-consent-accept").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "blocked analytics request kept the consent panel open");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "granted", "blocked analytics request prevented consent storage");
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  await page.waitForTimeout(100);
  assert(analyticsRequests.some((url) => url.includes("googletagmanager.com")), "blocked-network QA did not attempt Google Analytics");
  assert(analyticsRequests.some((url) => url.includes("clarity.ms")), "blocked-network QA did not attempt Microsoft Clarity");
  assert.deepEqual(pageErrors, [], "blocked analytics request caused a page exception");
  await assertNoFloatingSettings(page, "blocked analytics network");
  await context.close();
}

// Restricted WebViews can reject localStorage writes. The user's tap must still
// close the UI and grant consent for the current page without throwing.
{
  const { context, analyticsRequests } = await createMobileContext({ failLocalStorage: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await gotoAndWait(page, "/en/");

  await page.locator(".jabbar-consent-accept").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "localStorage failure kept the consent panel open");
  assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), "granted", "localStorage failure prevented in-memory consent");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "localStorage failure simulation unexpectedly persisted consent");
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  assert(analyticsRequests.some((url) => url.includes("googletagmanager.com")), "localStorage failure prevented Google Analytics loading");
  assert(analyticsRequests.some((url) => url.includes("clarity.ms")), "localStorage failure prevented Microsoft Clarity loading");
  assert.deepEqual(pageErrors, [], "localStorage failure caused a page exception");
  await assertNoFloatingSettings(page, "localStorage failure");
  await context.close();
}

// Desktop uses an ordinary click rather than a touch tap. The first-visit
// panel must disappear immediately and must not be replaced by a floating
// settings control after navigation or refresh.
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const analyticsRequests = [];
  await context.route(ANALYTICS_REQUEST, async (route) => {
    analyticsRequests.push(route.request().url());
    await route.fulfill({ status: 204, body: "" });
  });
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");

  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, "desktop first-visit consent panel is hidden");
  await page.locator(".jabbar-consent-accept").click();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "desktop consent click did not close the panel immediately");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "granted", "desktop consent was not stored");
  await assertNoFloatingSettings(page, "desktop acceptance");
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  await page.waitForTimeout(100);
  assert.equal(analyticsRequests.length >= 2, true, "desktop consent did not start analytics after closing");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.jabbarAnalyticsConsent));
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "stored desktop consent reopened the panel");
  await assertNoFloatingSettings(page, "stored desktop acceptance");
  await context.close();
}

await browser.close();
console.log("Analytics consent browser QA passed: desktop click, MicroMessenger tap, accept/reject/later, session defer, privacy-page control, blocked analytics, and localStorage failure.");
