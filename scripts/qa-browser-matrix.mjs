#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, devices, firefox, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_BROWSER_OUTPUT_DIR || "/tmp/jabbar-browser-matrix";
const LOCALES = [
  { code: "zh", prefix: "", lang: "zh-CN" },
  { code: "en", prefix: "/en", lang: "en" },
  { code: "es", prefix: "/es", lang: "es" },
  { code: "ar", prefix: "/ar", lang: "ar", rtl: true },
  { code: "fr", prefix: "/fr", lang: "fr" },
  { code: "pt", prefix: "/pt", lang: "pt" },
  { code: "ru", prefix: "/ru", lang: "ru" },
  { code: "de", prefix: "/de", lang: "de" },
  { code: "it", prefix: "/it", lang: "it" },
  { code: "tr", prefix: "/tr", lang: "tr" },
];
const ROUTES = LOCALES.flatMap((locale) => [
  { ...locale, kind: "home", path: `${locale.prefix}/` },
  { ...locale, kind: "calculator", path: `${locale.prefix}/calculator/` },
  { ...locale, kind: "inquiry", path: `${locale.prefix}/inquiry/` },
  { ...locale, kind: "policy", path: `${locale.prefix}/website-privacy-policy.html` },
]);
const REPRESENTATIVE_ROUTES = ROUTES.filter(({ code, kind }) =>
  (code === "en" && ["home", "calculator", "inquiry", "policy"].includes(kind))
  || (code === "ar" && kind === "home"));
const ANALYTICS_REQUEST = /^https:\/\/(www\.googletagmanager\.com|www\.clarity\.ms)\//;
const ANDROID_WECHAT_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.105 Mobile Safari/537.36 MicroMessenger/8.0.60.2800(0x28003C55) WeChat/arm64 Weixin NetType/WIFI Language/en";
const IOS_WECHAT_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.60 NetType/WIFI Language/zh_CN";

await mkdir(OUTPUT_DIR, { recursive: true });

async function installNetworkGuards(context) {
  const networkState = {
    policy: "quiet-denied",
    gpc: false,
    analyticsAttempts: [],
  };
  await context.route("**/api/consent-region", (route) => route.fulfill({
    status: 200,
    contentType: "application/json; charset=utf-8",
    headers: { "Cache-Control": "no-store, max-age=0" },
    body: JSON.stringify({ policy: networkState.policy, gpc: networkState.gpc }),
  }));
  await context.route(ANALYTICS_REQUEST, (route) => {
    networkState.analyticsAttempts.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "/* analytics provider stubbed by browser-matrix QA */",
    });
  });
  await context.route("**/turnstile/v0/api.js*", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: `window.turnstile={render(){return "qa-widget"},reset(){}};
      if(typeof window.jabbarTurnstileApiReady==="function")window.jabbarTurnstileApiReady();`,
  }));
  return networkState;
}

async function activate(locator, useTap) {
  if (useTap) await locator.tap();
  else await locator.click();
}

async function strictConsentProof(page, networkState, label, useTap) {
  networkState.policy = "strict";
  networkState.gpc = false;
  networkState.analyticsAttempts.length = 0;
  await page.goto(`${BASE_URL}/en/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.isRegionResolved?.()
    && window.jabbarAnalyticsConsent.getRegionPolicy() === "strict");
  assert.equal(networkState.analyticsAttempts.length, 0, `${label}: strict mode contacted analytics before consent`);
  await page.locator("#jabbar-analytics-consent").waitFor({ state: "visible", timeout: 3500 });
  await activate(page.locator(".jabbar-consent-accept"), useTap);
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.getState?.() === "granted");
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  assert(networkState.analyticsAttempts.length >= 2, `${label}: explicit opt-in did not start both analytics providers`);

  await page.goto(`${BASE_URL}/en/website-privacy-policy.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.isRegionResolved?.());
  await page.waitForFunction(() => document.querySelectorAll("#jabbar-google-analytics, #jabbar-microsoft-clarity").length === 2);
  await activate(page.locator("[data-analytics-consent-open]"), useTap);
  const reload = page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await activate(page.locator(".jabbar-consent-reject"), useTap);
  await reload;
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.isRegionResolved?.()
    && window.jabbarAnalyticsConsent.getState() === "denied");
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, `${label}: reject did not close the panel`);
}

async function gpcProof(page, networkState, label, useTap) {
  networkState.policy = "quiet-denied";
  networkState.gpc = true;
  networkState.analyticsAttempts.length = 0;
  await page.goto(`${BASE_URL}/en/website-privacy-policy.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.isRegionResolved?.()
    && window.jabbarAnalyticsConsent.isGlobalPrivacyControlActive());
  await activate(page.locator("[data-analytics-consent-open]"), useTap);
  assert.equal(await page.locator(".jabbar-consent-accept").isDisabled(), true, `${label}: GPC did not disable opt-in`);
  assert.equal(networkState.analyticsAttempts.length, 0, `${label}: GPC contacted analytics`);
  await activate(page.locator(".jabbar-consent-reject"), useTap);
  networkState.gpc = false;
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function routeState(page) {
  return page.evaluate(() => ({
    title: document.title.trim(),
    userAgent: navigator.userAgent,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir || "ltr",
    bodyText: (document.body.innerText || "").trim().length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    consentVisible: Boolean(document.querySelector("#jabbar-analytics-consent")?.getClientRects().length),
    consentPolicy: window.jabbarAnalyticsConsent?.getRegionPolicy?.(),
    consentState: window.jabbarAnalyticsConsent?.getState?.(),
    floatingCount: document.querySelectorAll("#jabbar-analytics-settings,.contact-speed-dial,.mobile-conversion-bar,.site-footer-backtop").length,
  }));
}

async function scanRoutes(page, routes, label, userAgentIncludes) {
  for (const route of routes) {
    const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200, `${label} ${route.path}: HTTP status`);
    await page.waitForFunction(() => window.jabbarAnalyticsConsent?.getRegionPolicy?.() === "quiet-denied");
    const state = await routeState(page);
    assert(state.title.length > 3, `${label} ${route.path}: blank title`);
    if (userAgentIncludes) {
      assert(state.userAgent.includes(userAgentIncludes), `${label} ${route.path}: expected ${userAgentIncludes} user agent`);
    }
    assert(state.bodyText > 120, `${label} ${route.path}: blank or incomplete body`);
    assert.equal(state.lang, route.lang, `${label} ${route.path}: language metadata`);
    assert.equal(state.dir, route.rtl ? "rtl" : "ltr", `${label} ${route.path}: direction metadata`);
    assert(state.overflow <= 1, `${label} ${route.path}: horizontal overflow ${state.overflow}px`);
    assert.equal(state.consentVisible, false, `${label} ${route.path}: quiet-denied panel became visible`);
    assert.equal(state.consentPolicy, "quiet-denied", `${label} ${route.path}: region policy`);
    assert.equal(state.consentState, "denied", `${label} ${route.path}: analytics did not remain denied`);
    assert.equal(state.floatingCount, 0, `${label} ${route.path}: removed floating control returned`);
    if (route.kind === "policy") {
      assert.equal(await page.locator("[data-analytics-consent-open]").count(), 1, `${label} ${route.path}: privacy control count`);
    }
  }
}

async function interactionProof(page, label, useTap) {
  await page.goto(`${BASE_URL}/en/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.getRegionPolicy?.() === "quiet-denied");
  const firstFaq = page.locator(".faq-item").first();
  const firstFaqButton = page.locator(".faq-quick-tag").first();
  await activate(firstFaqButton, useTap);
  assert.equal(await firstFaq.getAttribute("open"), "", `${label}: FAQ did not open`);
  assert.equal(await page.locator(".faq-item[open]").count(), 1, `${label}: FAQ opened more than one answer`);
  await page.waitForFunction(() => document.querySelector(".faq-quick-tag")?.getAttribute("aria-expanded") === "true");
  assert.equal(await firstFaqButton.getAttribute("aria-expanded"), "true", `${label}: FAQ button state did not update`);

  await page.goto(`${BASE_URL}/en/calculator/`, { waitUntil: "domcontentloaded" });
  for (const [field, value] of [["length", "30"], ["width", "40"], ["height", "40"], ["qty", "100"]]) {
    await page.locator(`#${field}`).fill(value);
  }
  await page.locator("#cbm-calculator button[type=submit]").click();
  assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "ready", `${label}: calculator did not produce a result`);

  await page.goto(`${BASE_URL}/en/inquiry/`, { waitUntil: "domcontentloaded" });
  await page.locator('[name="product"]').focus();
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, `${label}: consent obscured inquiry input`);

  await page.goto(`${BASE_URL}/en/website-privacy-policy.html`, { waitUntil: "domcontentloaded" });
  await activate(page.locator("[data-analytics-consent-open]"), useTap);
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), true, `${label}: privacy control did not open preferences`);
  assert.equal(await page.locator(".jabbar-consent-accept").isEnabled(), true, `${label}: explicit opt-in is unavailable`);
  await activate(page.locator(".jabbar-consent-reject"), useTap);
  assert.equal(await page.locator("#jabbar-analytics-consent").isVisible(), false, `${label}: reject did not close preferences`);
}

async function runProfile({ browserType, contextOptions, label, routes, screenshot, useTap = false, userAgentIncludes = "" }) {
  const browser = await browserType.launch({ headless: true });
  let context;
  try {
    context = await browser.newContext(contextOptions);
    const networkState = await installNetworkGuards(context);
    const page = await context.newPage();
    const errors = collectErrors(page);
    await scanRoutes(page, routes, label, userAgentIncludes);
    assert.equal(networkState.analyticsAttempts.length, 0, `${label}: quiet-denied mode contacted analytics`);
    await strictConsentProof(page, networkState, label, useTap);
    await gpcProof(page, networkState, label, useTap);
    networkState.policy = "quiet-denied";
    await interactionProof(page, label, useTap);
    if (screenshot) {
      await page.goto(`${BASE_URL}/en/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Array.from(document.querySelectorAll(".hero-brand-partnership img"))
        .every((image) => image.complete && image.naturalWidth > 0));
      await page.screenshot({ path: `${OUTPUT_DIR}/${screenshot}`, fullPage: false });
    }
    assert.equal(errors.length, 0, `${label}: console/page errors: ${errors.join(" | ")}`);
  } finally {
    if (context) await context.close();
    await browser.close();
  }
}

await runProfile({
  browserType: firefox,
  contextOptions: { viewport: { width: 1280, height: 900 } },
  label: "Firefox desktop",
  routes: ROUTES,
  screenshot: "firefox-desktop.png",
});
await runProfile({
  browserType: firefox,
  contextOptions: { viewport: { width: 390, height: 844 } },
  label: "Firefox narrow 390px",
  routes: ROUTES,
  screenshot: "firefox-390.png",
});
await runProfile({
  browserType: chromium,
  contextOptions: { ...devices["Pixel 5"] },
  label: "simulated Android Pixel 5",
  routes: ROUTES,
  screenshot: "android-pixel5-simulated.png",
  useTap: true,
});
await runProfile({
  browserType: chromium,
  contextOptions: { ...devices["Galaxy S9+"] },
  label: "simulated Android Galaxy S9+",
  routes: REPRESENTATIVE_ROUTES,
  useTap: true,
});
await runProfile({
  browserType: chromium,
  contextOptions: {
    viewport: { width: 393, height: 873 },
    screen: { width: 393, height: 873 },
    userAgent: ANDROID_WECHAT_UA,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.75,
  },
  label: "simulated Android WeChat WebView",
  routes: ROUTES,
  screenshot: "android-wechat-simulated.png",
  useTap: true,
  userAgentIncludes: "MicroMessenger",
});
await runProfile({
  browserType: webkit,
  contextOptions: { ...devices["iPhone 13"], userAgent: IOS_WECHAT_UA },
  label: "simulated iOS WeChat WKWebView",
  routes: REPRESENTATIVE_ROUTES,
  useTap: true,
  userAgentIncludes: "MicroMessenger",
});

console.log(`Browser compatibility QA passed: Firefox desktop/narrow plus simulated Pixel 5, Galaxy S9+, Android WeChat and iOS WeChat; screenshots at ${OUTPUT_DIR}. Real-device status is intentionally not claimed.`);
