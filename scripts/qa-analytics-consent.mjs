#!/usr/bin/env node

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const STORAGE_KEY = "jabbar.analyticsConsent.v1";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const analyticsRequests = [];

await context.route(/^https:\/\/(www\.googletagmanager\.com|www\.clarity\.ms)\//, async (route) => {
  analyticsRequests.push(route.request().url());
  await route.fulfill({ status: 204, body: "" });
});

const page = await context.newPage();
await page.goto(`${BASE_URL}/en/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Boolean(window.jabbarAnalyticsConsent));
await page.waitForTimeout(100);

assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), null, "first visit should not have a stored analytics choice");
assert.equal(await page.evaluate(() => window.jabbarAnalyticsConsent.getState()), null, "first visit should remain undecided");
assert.equal(analyticsRequests.length, 0, "analytics loaded before explicit consent");
assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, "first-visit consent panel is hidden");

await page.evaluate(() => window.jabbarTrack("qa_before_consent", { source: "qa" }));
assert.equal(await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[1] === "qa_before_consent")), false, "pre-consent event entered dataLayer");

await page.locator(".jabbar-consent-later").click();
assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, "decide-later action did not close the panel");
assert.equal(await page.locator("#jabbar-analytics-settings").isVisible(), true, "privacy settings entry is missing after decide-later");
assert.equal(analyticsRequests.length, 0, "decide-later action loaded analytics");

await page.locator("#jabbar-analytics-settings").click();
await page.evaluate(() => { document.cookie = "_ga=qa-cookie; path=/; SameSite=Lax"; });
await page.locator(".jabbar-consent-reject").click();
assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "denied", "rejection was not stored");
assert.equal(analyticsRequests.length, 0, "rejection loaded analytics");
assert.equal(await page.evaluate(() => document.cookie.includes("_ga=")), false, "rejection did not remove known analytics cookies");

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Boolean(window.jabbarAnalyticsConsent));
await page.waitForTimeout(100);
assert.equal(analyticsRequests.length, 0, "stored rejection loaded analytics after navigation");
assert.equal(await page.locator("#jabbar-analytics-settings").isVisible(), true, "stored rejection lost the later settings entry");

await page.locator("#jabbar-analytics-settings").click();
await page.locator(".jabbar-consent-accept").click();
await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), "granted", "acceptance was not stored");
assert(analyticsRequests.some((url) => url.includes("googletagmanager.com")), "Google Analytics did not load after consent");
assert(analyticsRequests.some((url) => url.includes("clarity.ms")), "Microsoft Clarity did not load after consent");

await page.evaluate(() => window.jabbarTrack("qa_after_consent", { source: "qa" }));
assert.equal(
  await page.evaluate(() => (window.dataLayer || []).some((entry) => entry?.[0] === "event" && entry?.[1] === "qa_after_consent")),
  true,
  "post-consent event did not enter dataLayer"
);

await context.close();
await browser.close();
console.log("Analytics consent browser QA passed: default blocked, rejection persisted, later opt-in loaded analytics.");
