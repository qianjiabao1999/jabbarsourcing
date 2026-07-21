#!/usr/bin/env node

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const STORAGE_KEY = "jabbar.analyticsConsent.v1";
const SESSION_DEFER_KEY = "jabbar.analyticsConsent.deferred";
const POLICY_VERSION = "2026-07-19";
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

async function storedConsent(page) {
  return page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, STORAGE_KEY);
}

async function waitForAutomaticPanel(page, label, timeout = 2800) {
  await page.locator("#jabbar-analytics-consent").waitFor({ state: "visible", timeout });
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, `${label}: automatic consent panel did not appear`);
}

async function showAutomaticPanelOnFirstScroll(page, label) {
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, `${label}: consent panel appeared before the first-scroll trigger`);
  await page.mouse.wheel(0, 260);
  await waitForAutomaticPanel(page, label, 1000);
}

// Decide later is persisted as a terminal state (30 days), does not load analytics,
// and can be reopened only from the in-page privacy-policy control.
{
  const { context, analyticsRequests } = await createMobileContext();
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");

  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "first visit should not have a stored analytics choice");
  assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), null, "first visit should remain undecided");
  assert.equal(analyticsRequests.length, 0, "analytics loaded before explicit consent");
  await showAutomaticPanelOnFirstScroll(page, "first visit");
  assert.equal(await page.locator("#jabbar-analytics-consent").getAttribute("aria-live"), "polite", "automatic consent panel is not announced politely");
  assert.equal(await page.locator(".jabbar-consent-privacy").getAttribute("href"), "/en/website-privacy-policy.html", "consent panel did not link to the current language policy");
  await assertNoFloatingSettings(page, "first visit");

  await page.evaluate(() => window.jabbarTrack("qa_before_consent", { source: "qa" }));
  assert.equal(await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[1] === "qa_before_consent")), false, "pre-consent event entered dataLayer");

  await page.locator(".jabbar-consent-later").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "decide-later action did not close the panel");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), "1", "decide-later action was not scoped to session defer");
  const laterRecord = await storedConsent(page);
  assert.equal(laterRecord?.state, "later", "decide-later action did not persist terminal state");
  assert.equal(laterRecord?.policy, POLICY_VERSION, "decide-later action stored the wrong policy version");
  assert.equal(typeof laterRecord?.at, "number", "decide-later action did not store a numeric timestamp");
  assert.equal(analyticsRequests.length, 0, "decide-later action loaded analytics");
  await assertNoFloatingSettings(page, "decide later");

  await gotoAndWait(page, "/en/calculator/");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "session defer did not survive same-tab navigation");
  assert.equal(analyticsRequests.length, 0, "session-deferred navigation loaded analytics");

  await gotoAndWait(page, "/en/website-privacy-policy.html");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "session-deferred privacy page reopened the panel automatically");
  const inPageControl = page.locator("[data-analytics-consent-open]");
  assert.equal(await inPageControl.count(), 1, "privacy policy must expose exactly one in-page analytics control");
  assert.equal(await inPageControl.isVisible(), true, "privacy-policy analytics control is hidden");
  assert.notEqual(await inPageControl.evaluate((element) => getComputedStyle(element).position), "fixed", "privacy-policy analytics control must not float");
  await inPageControl.tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, "privacy-policy control did not reopen analytics preferences");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), null, "privacy-policy control did not clear session defer");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("jabbar-consent-accept")), true, "explicit analytics control did not focus the primary choice");

  await page.evaluate(() => { document.cookie = "_ga=qa-cookie; path=/; SameSite=Lax"; });
  await page.locator(".jabbar-consent-reject").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "rejection did not close the panel");
  assert.deepEqual(await storedConsent(page), { state: "denied", at: (await storedConsent(page)).at, policy: POLICY_VERSION }, "rejection was not stored as a versioned JSON record");
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

// The automatic prompt must never interrupt inquiry typing. Once the user
// leaves the form, an already-triggered prompt may appear without creating a
// session defer record. Returning to the form temporarily hides it again.
{
  const { context, analyticsRequests } = await createMobileContext();
  const page = await context.newPage();
  await gotoAndWait(page, "/en/inquiry/");

  const productField = page.locator('.js-inquiry-form input[name="product"]');
  const contactField = page.locator('.js-inquiry-form input[name="contact"]');
  const outsideControl = page.locator(".site-nav-brand");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "inquiry prompt appeared before the automatic trigger");
  await productField.focus();
  await productField.fill("QA sourcing request");
  await page.waitForTimeout(1950);
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "automatic prompt interrupted an active inquiry field");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), null, "inquiry focus was incorrectly stored as decide later");
  assert.equal(analyticsRequests.length, 0, "inquiry focus loaded analytics before consent");

  await outsideControl.focus();
  await waitForAutomaticPanel(page, "inquiry focusout recovery", 800);
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), null, "inquiry focusout created a session defer record");
  assert.equal(await outsideControl.evaluate((element) => document.activeElement === element), true, "automatic inquiry recovery stole focus from the user");

  await contactField.focus();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "returning to the inquiry form did not hide the prompt");
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), null, "temporary inquiry hide was stored as decide later");
  await outsideControl.focus();
  await waitForAutomaticPanel(page, "second inquiry focusout recovery", 800);

  await page.locator(".jabbar-consent-later").tap();
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_DEFER_KEY), "1", "explicit decide-later action was not scoped to session defer");
  assert.deepEqual(await storedConsent(page), { state: "later", at: (await storedConsent(page)).at, policy: POLICY_VERSION }, "explicit decide-later action was not persisted");
  await context.close();
}

// A real touch tap under a MicroMessenger user agent closes immediately and
// analytics requests start only after explicit consent.
{
  const { context, analyticsRequests } = await createMobileContext();
  const page = await context.newPage();
  await gotoAndWait(page, "/");

  await showAutomaticPanelOnFirstScroll(page, "MicroMessenger first visit");
  await page.evaluate(() => window.jabbarTrack("qa_before_consent_accept", { source: "qa" }));
  assert.equal(
    await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[0] === "event" && entry?.[1] === "qa_before_consent_accept")),
    false,
    "pending event entered dataLayer before consent",
  );
  await page.locator(".jabbar-consent-accept").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "MicroMessenger tap did not close the consent panel immediately");
  assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), "granted", "MicroMessenger tap did not update in-memory consent");
  const mobileGrant = await storedConsent(page);
  assert.equal(mobileGrant?.state, "granted", "acceptance state was not stored");
  assert.equal(mobileGrant?.policy, POLICY_VERSION, "acceptance policy version was not stored");
  assert.equal(typeof mobileGrant?.at, "number", "acceptance timestamp was not stored");
  await assertNoFloatingSettings(page, "acceptance");
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  assert(analyticsRequests.some((url) => url.includes("googletagmanager.com")), "Google Analytics did not load after consent");
  assert(analyticsRequests.some((url) => url.includes("clarity.ms")), "Microsoft Clarity did not load after consent");
  assert.equal(await page.evaluate(() => {
    const calls = (window.dataLayer || []).map((entry) => Array.from(entry));
    const consentDefault = calls.findIndex((entry) => entry[0] === "consent" && entry[1] === "default");
    const jsStart = calls.findIndex((entry) => entry[0] === "js");
    return consentDefault >= 0 && jsStart >= 0 && consentDefault < jsStart;
  }), true, "Consent Mode default was not recorded before gtag js");
  assert.equal(
    await page.evaluate(() => (window.dataLayer || []).filter((entry) => entry?.[0] === "event" && entry?.[1] === "qa_before_consent_accept").length),
    1,
    "pending event was not replayed exactly once after consent",
  );

  await page.evaluate(() => window.jabbarTrack("qa_after_consent", { source: "qa" }));
  assert.equal(
    await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[0] === "event" && entry?.[1] === "qa_after_consent")),
    true,
    "post-consent event did not enter dataLayer",
  );
  await context.close();
}

// A pending event rejected on the same page must be cleared permanently. If the
// user explicitly reopens preferences and grants later, the rejected event must
// not be replayed.
{
  const { context } = await createMobileContext();
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");
  await page.evaluate(() => window.jabbarTrack("qa_rejected_pending", { source: "qa" }));
  await showAutomaticPanelOnFirstScroll(page, "pending rejection");
  await page.locator(".jabbar-consent-reject").tap();
  await page.evaluate(() => window.jabbarAnalyticsConsent.open());
  await page.locator(".jabbar-consent-accept").tap();
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  assert.equal(
    await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[0] === "event" && entry?.[1] === "qa_rejected_pending")),
    false,
    "rejected pending event was replayed after a later grant",
  );
  await context.close();
}

// Restricted WebViews can also reject persistence for decide-later. The action
// must still close the panel and remain effective for the current page.
{
  const { context, analyticsRequests } = await createMobileContext({ failLocalStorage: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await gotoAndWait(page, "/en/");
  await showAutomaticPanelOnFirstScroll(page, "restricted WebView decide later");
  await page.locator(".jabbar-consent-later").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "localStorage failure kept decide-later panel open");
  assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), "later", "localStorage failure prevented in-memory decide-later state");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "localStorage failure unexpectedly persisted decide-later");
  assert.equal(analyticsRequests.length, 0, "localStorage failure loaded analytics after decide-later");
  assert.deepEqual(pageErrors, [], "localStorage failure caused a decide-later page exception");
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

  await showAutomaticPanelOnFirstScroll(page, "blocked analytics first visit");
  await page.locator(".jabbar-consent-accept").tap();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "blocked analytics request kept the consent panel open");
  assert.equal((await storedConsent(page))?.state, "granted", "blocked analytics request prevented consent storage");
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

  await showAutomaticPanelOnFirstScroll(page, "restricted WebView first visit");
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
  const promptStart = Date.now();
  await gotoAndWait(page, "/en/");

  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "desktop panel appeared before the automatic delay");
  await waitForAutomaticPanel(page, "desktop timer first visit");
  const promptDelay = Date.now() - promptStart;
  assert(promptDelay >= 1400 && promptDelay <= 2800, `desktop automatic prompt delay escaped the expected window (${promptDelay}ms)`);
  await page.locator(".jabbar-consent-accept").click();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "desktop consent click did not close the panel immediately");
  assert.equal((await storedConsent(page))?.state, "granted", "desktop consent was not stored");
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

// Legacy string choices are accepted and migrated to the current JSON record.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ key }) => localStorage.setItem(key, "denied"), { key: STORAGE_KEY });
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "legacy denied choice was not accepted");
  const migrated = await storedConsent(page);
  assert.equal(migrated?.state, "denied", "legacy choice did not migrate to JSON");
  assert.equal(migrated?.policy, POLICY_VERSION, "legacy choice did not receive current policy version");
  await context.close();
}

// A stored choice older than 12 months expires and asks again.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ key, policy }) => {
    localStorage.setItem(key, JSON.stringify({ state: "denied", at: Date.now() - 366 * 24 * 60 * 60 * 1000, policy }));
  }, { key: STORAGE_KEY, policy: POLICY_VERSION });
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "expired choice reopened preferences before the automatic trigger");
  await showAutomaticPanelOnFirstScroll(page, "expired choice");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "expired choice was not removed");
  await context.close();
}

// Decide-later records remain terminal for 30 days, then expire and ask again
// in a fresh session without relying on the session defer marker.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ key, policy }) => {
    localStorage.setItem(key, JSON.stringify({ state: "later", at: Date.now() - 29 * 24 * 60 * 60 * 1000, policy }));
  }, { key: STORAGE_KEY, policy: POLICY_VERSION });
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");
  await page.mouse.wheel(0, 260);
  await page.waitForTimeout(1900);
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "29-day decide-later record reopened the automatic panel");
  assert.equal((await storedConsent(page))?.state, "later", "29-day decide-later record was removed early");
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ key, policy }) => {
    localStorage.setItem(key, JSON.stringify({ state: "later", at: Date.now() - 31 * 24 * 60 * 60 * 1000, policy }));
  }, { key: STORAGE_KEY, policy: POLICY_VERSION });
  const page = await context.newPage();
  await gotoAndWait(page, "/en/");
  await showAutomaticPanelOnFirstScroll(page, "expired decide-later record");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "31-day decide-later record was not removed");
  await context.close();
}

await browser.close();
console.log("Analytics consent browser QA passed: desktop click, MicroMessenger tap, pending-event replay/clear, 30-day later expiry, JSON migration, Consent Mode order, localized privacy control, blocked analytics, and localStorage failure.");
