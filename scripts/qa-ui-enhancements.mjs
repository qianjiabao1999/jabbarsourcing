#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_UI_OUTPUT_DIR || "/tmp/jabbar-ui-enhancements-qa";
const CSS_VERSION = "apple-155";
const UI_VERSION = "ui-20260712a";
const HOME_PAGES = [
  { locale: "zh", path: "/" }, { locale: "en", path: "/en/" }, { locale: "es", path: "/es/" },
  { locale: "ar", path: "/ar/", rtl: true }, { locale: "fr", path: "/fr/" }, { locale: "pt", path: "/pt/" },
  { locale: "ru", path: "/ru/" }, { locale: "de", path: "/de/" }, { locale: "it", path: "/it/" }, { locale: "tr", path: "/tr/" }
];
const CALCULATOR_PAGES = HOME_PAGES.map((item) => ({ ...item, path: item.path === "/" ? "/calculator/" : `${item.path}calculator/` }));
const INQUIRY_PAGES = HOME_PAGES.map((item) => ({ ...item, path: item.path === "/" ? "/inquiry/" : `${item.path}inquiry/` }));
const IMAGE_AUDIT_LOCALES = new Set(["zh", "en", "es", "ru", "ar"]);

await mkdir(OUTPUT_DIR, { recursive: true });

async function blockAnalytics(context) {
  await context.route("**://www.googletagmanager.com/**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**://www.clarity.ms/**", (route) => route.fulfill({ status: 204, body: "" }));
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function pageState(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: box.left, right: box.right, top: box.top, bottom: box.bottom,
        width: box.width, height: box.height, display: style.display,
        visibility: style.visibility, opacity: Number.parseFloat(style.opacity),
        pointerEvents: style.pointerEvents, direction: style.direction,
        fontSize: Number.parseFloat(style.fontSize)
      };
    };
    return {
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      direction: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
      cssVersion: document.querySelector('link[href*="styles.min.css"]')?.getAttribute("href") || "",
      uiVersion: document.querySelector('script[src*="site-enhancements.js"]')?.getAttribute("src") || "",
      aiVersion: document.querySelector('script[src*="ai-sourcing-assistant.js"]')?.getAttribute("src") || "",
      counts: {
        faqTags: document.querySelectorAll(".faq-quick-tag").length,
        faqItems: document.querySelectorAll(".faq-item").length,
        countries: document.querySelectorAll(".service-country-item").length,
        metrics: document.querySelectorAll(".company-metric-card strong").length,
        progress: document.querySelectorAll(".site-scroll-progress").length,
        cbm: document.querySelectorAll(".cbm-visual").length,
        dialOptions: document.querySelectorAll(".contact-speed-dial-option").length,
        qrCards: document.querySelectorAll(".whatsapp-qr-card").length
      },
      rects: {
        dial: rect(".contact-speed-dial"),
        launcher: rect(".contact-speed-dial-main"),
        legacyToggle: rect(".jabbar-ai-toggle"),
        conversionBar: rect(".mobile-conversion-bar"),
        social: rect("#social-accounts")
      }
    };
  });
}

function assertShared(state, scope) {
  assert(state.cssVersion.endsWith(`?v=${CSS_VERSION}`), `${scope}: stale CSS ${state.cssVersion}`);
  assert(state.uiVersion.endsWith(`?v=${UI_VERSION}`), `${scope}: stale UI JS ${state.uiVersion}`);
  assert(state.documentWidth <= state.width + 1, `${scope}: horizontal overflow ${state.documentWidth} > ${state.width}`);
}

function assertContactDial(state, scope) {
  assert(state.rects.launcher, `${scope}: contact launcher missing`);
  assert(Math.abs(state.rects.launcher.height - 56) <= 1, `${scope}: launcher height ${state.rects.launcher.height}`);
  assert(state.rects.launcher.width >= 56, `${scope}: launcher width ${state.rects.launcher.width}`);
  assert.equal(state.counts.dialOptions, 3, `${scope}: contact option count`);
  assert.equal(state.rects.legacyToggle.display, "none", `${scope}: legacy AI launcher visible`);
}

async function auditImages(page, scope) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
      window.scrollTo(0, Math.max(0, max * ratio));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  await page.waitForTimeout(250);
  const broken = await page.evaluate(() => Array.from(document.images)
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src));
  assert.deepEqual(broken, [], `${scope}: broken images ${broken.join(", ")}`);
}

async function homeMatrix(browserType) {
  for (const viewport of [{ width: 390, height: 844, mobile: true }, { width: 1280, height: 900, mobile: false }]) {
    const context = await browserType.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      screen: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      deviceScaleFactor: 1
    });
    await blockAnalytics(context);
    const page = await context.newPage();
    const errors = collectErrors(page);
    for (const item of HOME_PAGES) {
      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
      await page.locator(".contact-speed-dial-main").waitFor({ state: "visible" });
      await page.waitForTimeout(120);
      const scope = `${item.locale} home ${viewport.width}x${viewport.height}`;
      const state = await pageState(page);
      assertShared(state, scope);
      assertContactDial(state, scope);
      assert.equal(state.counts.faqTags, 7, `${scope}: FAQ tag count`);
      assert.equal(state.counts.faqItems, 7, `${scope}: FAQ item count`);
      assert.equal(state.counts.countries, 24, `${scope}: duplicated country item count`);
      assert.equal(state.counts.metrics, 5, `${scope}: current five company metrics must remain`);
      assert.equal(state.counts.progress, 1, `${scope}: progress count`);
      assert(state.rects.social, `${scope}: social section missing`);
      const expectedWidth = Math.min(viewport.width - 48, 1140);
      assert(Math.abs(state.rects.social.width - expectedWidth) <= 1, `${scope}: social width ${state.rects.social.width}`);
      assert(Math.abs(state.rects.social.left - (viewport.width - expectedWidth) / 2) <= 1, `${scope}: social not centered`);
      if (viewport.mobile) {
        assert.equal(state.rects.conversionBar.display, "grid", `${scope}: mobile conversion bar hidden`);
        assert(state.rects.launcher.bottom <= state.rects.conversionBar.top - 15, `${scope}: launcher overlaps conversion bar`);
        assert.equal(state.counts.qrCards, 0, `${scope}: QR hover card must not initialize on touch`);
      } else {
        assert.equal(state.rects.conversionBar.display, "none", `${scope}: mobile bar visible on desktop`);
        assert.equal(state.counts.qrCards, 1, `${scope}: desktop QR card missing`);
      }
      if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
      if (!viewport.mobile && IMAGE_AUDIT_LOCALES.has(item.locale)) await auditImages(page, scope);
      assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
    }
    await context.close();
  }
}

async function calculatorMatrix(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  const page = await context.newPage();
  const errors = collectErrors(page);
  for (const item of CALCULATOR_PAGES) {
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.locator("#cbmFill").waitFor({ state: "attached" });
    const scope = `${item.locale} calculator`;
    const state = await pageState(page);
    assertShared(state, scope);
    assertContactDial(state, scope);
    assert(state.aiVersion.includes("ai-sourcing-assistant.js?v="), `${scope}: AI assistant missing`);
    assert.equal(state.counts.cbm, 1, `${scope}: CBM visual count`);
    assert.equal(state.counts.progress, 1, `${scope}: progress count`);
    assert.equal(state.rects.conversionBar, null, `${scope}: calculator must not have mobile bar`);
    if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
    assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
  }

  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  for (const value of ["length", "width", "height"]) await page.locator(`#${value}`).fill("100");
  const cases = [
    { qty: 5, pct: "18%", cap: "20GP · 5.0 / 28 CBM", fill: "#5DCAA5", width: "49" },
    { qty: 40, pct: "69%", cap: "40GP · 40.0 / 58 CBM", fill: "#5DCAA5", width: "190" },
    { qty: 70, pct: "103%", cap: "40HQ · 70.0 / 68 CBM ×2", fill: "#EF9F27", width: "276" },
    { qty: 90, pct: "132%", cap: "40HQ · 90.0 / 68 CBM ×2", fill: "#EF9F27", width: "276" }
  ];
  for (const testCase of cases) {
    await page.locator("#qty").fill(String(testCase.qty));
    await page.locator("#qty").dispatchEvent("input");
    await page.waitForFunction((expected) => document.querySelector("#cbmCap")?.textContent === expected, testCase.cap);
    assert.equal(await page.locator("#cbmPct").textContent(), testCase.pct, `${testCase.qty} CBM percentage`);
    assert.equal(await page.locator("#cbmCap").textContent(), testCase.cap, `${testCase.qty} CBM capacity`);
    assert.equal(await page.locator("#cbmFill").getAttribute("fill"), testCase.fill, `${testCase.qty} CBM fill color`);
    assert.equal(await page.locator("#cbmFill").getAttribute("width"), testCase.width, `${testCase.qty} CBM fill width`);
  }
  await page.locator(".calculator-results").screenshot({ path: `${OUTPUT_DIR}/calculator-visual-1280x900.png` });
  await context.close();
}

async function inquiryMatrix(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  const page = await context.newPage();
  const errors = collectErrors(page);
  for (const item of INQUIRY_PAGES) {
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(80);
    const scope = `${item.locale} inquiry`;
    const state = await pageState(page);
    assertShared(state, scope);
    assert.equal(state.rects.dial, null, `${scope}: contact dial must not duplicate inquiry CTA`);
    assert.equal(state.counts.progress, 0, `${scope}: short inquiry page must not have progress bar`);
    assert.equal(state.counts.qrCards, 1, `${scope}: desktop QR enhancement missing`);
    assert.equal(state.rects.conversionBar, null, `${scope}: inquiry must not have mobile conversion bar`);
    if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
    assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
  }
  await context.close();
}

async function interactionChecks(browserType) {
  const desktop = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(desktop);
  const page = await desktop.newPage();
  const errors = collectErrors(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".contact-speed-dial-main").waitFor({ state: "visible" });
  await page.screenshot({ path: `${OUTPUT_DIR}/contact-desktop-closed-1280x900.png` });
  await page.locator(".contact-speed-dial-main").click();
  await page.waitForTimeout(240);
  assert.equal(await page.locator(".contact-speed-dial-main").getAttribute("aria-expanded"), "true", "desktop dial did not expand");
  assert.match(await page.evaluate(() => document.activeElement?.className || ""), /contact-speed-dial-whatsapp/, "focus did not enter first option");
  const optionHeights = await page.locator(".contact-speed-dial-option").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  optionHeights.forEach((height) => assert(height >= 48, `dial option height ${height}`));
  assert.equal(await page.locator(".contact-speed-dial-whatsapp").getAttribute("href"), "https://wa.me/8618658925544", "WhatsApp dial URL");
  assert.equal(await page.locator(".contact-speed-dial-telegram").getAttribute("href"), "https://t.me/Jabbar199901", "Telegram dial URL");
  await page.screenshot({ path: `${OUTPUT_DIR}/contact-desktop-expanded-1280x900.png` });

  await page.locator(".contact-speed-dial-whatsapp").hover();
  await page.waitForTimeout(430);
  assert.equal(await page.locator(".whatsapp-qr-card").evaluate((element) => element.hidden), false, "QR card did not open after 400ms");
  assert.equal(await page.locator(".whatsapp-qr-card img").getAttribute("src"), "/assets/whatsapp-qr.svg?v=20260712a", "QR asset URL");
  await page.locator(".site-nav").hover();
  await page.waitForTimeout(230);
  assert.equal(await page.locator(".whatsapp-qr-card").evaluate((element) => element.hidden), true, "QR card did not close after 200ms");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".contact-speed-dial-main").getAttribute("aria-expanded"), "false", "Escape did not close dial");
  assert.match(await page.evaluate(() => document.activeElement?.className || ""), /contact-speed-dial-main/, "Escape did not restore launcher focus");

  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 0); });
  await page.waitForTimeout(50);
  const topScale = await page.locator(".site-scroll-progress-fill").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  assert(topScale <= 0.01, `progress at top is ${topScale}`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => Math.abs(window.scrollY - (document.documentElement.scrollHeight - window.innerHeight)) <= 2);
  await page.waitForTimeout(50);
  const bottomScale = await page.locator(".site-scroll-progress-fill").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  assert(bottomScale >= 0.999, `progress at bottom is ${bottomScale}`);

  await page.locator(".company-intro").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".company-intro")?.classList.contains("is-visible"));
  await page.waitForTimeout(1300);
  const metrics = await page.locator(".company-metric-card strong").allTextContents();
  assert.deepEqual(metrics.map((item) => item.trim()), ["2021年", "300+", "50,000㎡", "全球 100+ 国家和地区", "5亿元人民币"], "company metrics changed or did not finish counting");
  const firstTransform = await page.locator(".service-country-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await page.waitForTimeout(180);
  const secondTransform = await page.locator(".service-country-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  assert(secondTransform < firstTransform, `LTR country strip direction is wrong: ${firstTransform} -> ${secondTransform}`);
  await page.locator(".service-country-marquee").hover();
  await page.waitForTimeout(80);
  const pausedStart = await page.locator(".service-country-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await page.waitForTimeout(160);
  const pausedEnd = await page.locator(".service-country-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  assert(Math.abs(pausedEnd - pausedStart) < 1, `country strip did not pause: ${pausedStart} -> ${pausedEnd}`);

  for (let index = 0; index < 7; index += 1) {
    const button = page.locator(".faq-quick-tag").nth(index);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    const open = await page.locator(".faq-item").evaluateAll((items) => items.map((item) => item.open));
    assert.equal(open.filter(Boolean).length, 1, `FAQ tag ${index + 1}: multiple details open`);
    assert.equal(open[index], true, `FAQ tag ${index + 1}: wrong detail opened`);
  }
  assert.equal(errors.length, 0, `desktop interaction console errors: ${errors.join(" | ")}`);
  await desktop.close();

  const mobile = await browserType.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await blockAnalytics(mobile);
  const mobilePage = await mobile.newPage();
  const mobileErrors = collectErrors(mobilePage);
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await mobilePage.locator(".contact-speed-dial-main").waitFor({ state: "visible" });
  await mobilePage.screenshot({ path: `${OUTPUT_DIR}/contact-mobile-closed-390x844.png` });
  await mobilePage.locator(".contact-speed-dial-main").click();
  await mobilePage.waitForTimeout(240);
  await mobilePage.screenshot({ path: `${OUTPUT_DIR}/contact-mobile-expanded-390x844.png` });
  assert.equal(await mobilePage.locator(".whatsapp-qr-card").count(), 0, "touch page initialized QR hover card");
  assert.equal(mobileErrors.length, 0, `mobile interaction console errors: ${mobileErrors.join(" | ")}`);
  await mobile.close();
}

async function accessibilityFallbackChecks(browserType) {
  const reduced = await browserType.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await blockAnalytics(reduced);
  const page = await reduced.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".ui-section-reveal").count(), 0, "reduced motion still hides sections for reveal");
  assert.equal(await page.locator(".service-country-marquee.is-static").count(), 1, "reduced motion country strip is not static");
  const metrics = await page.locator(".company-metric-card strong").allTextContents();
  assert.deepEqual(metrics.map((item) => item.trim()), ["2021年", "300+", "50,000㎡", "全球 100+ 国家和地区", "5亿元人民币"], "reduced motion changed metric copy");
  await reduced.close();

  const noJs = await browserType.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  const hidden = await noJsPage.evaluate(() => [".sourcing-gallery", ".company-intro", ".work-process", ".testimonials", ".faq-section", ".social-platform-groups"]
    .filter((selector) => {
      const element = document.querySelector(selector);
      if (!element) return true;
      const style = getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) < 0.99;
    }));
  assert.deepEqual(hidden, [], `no-JS content hidden: ${hidden.join(", ")}`);
  await noJs.close();
}

async function rtlMotionCheck(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/ar/`, { waitUntil: "domcontentloaded" });
  await page.locator(".company-intro").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".company-intro")?.classList.contains("is-visible"));
  const first = await page.locator(".service-country-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await page.waitForTimeout(180);
  const second = await page.locator(".service-country-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  assert(second > first, `RTL country strip must run in the opposite direction: ${first} -> ${second}`);
  await context.close();
}

const chromiumBrowser = await chromium.launch({ headless: true });
await homeMatrix(chromiumBrowser);
await calculatorMatrix(chromiumBrowser);
await inquiryMatrix(chromiumBrowser);
await interactionChecks(chromiumBrowser);
await accessibilityFallbackChecks(chromiumBrowser);
await rtlMotionCheck(chromiumBrowser);
await chromiumBrowser.close();

const webkitBrowser = await webkit.launch({ headless: true });
const webkitContext = await webkitBrowser.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await blockAnalytics(webkitContext);
const webkitPage = await webkitContext.newPage();
const webkitErrors = collectErrors(webkitPage);
for (const item of HOME_PAGES.filter(({ locale }) => ["zh", "en", "ar"].includes(locale))) {
  await webkitPage.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
  await webkitPage.locator(".contact-speed-dial-main").waitFor({ state: "visible" });
  const state = await pageState(webkitPage);
  assertShared(state, `WebKit ${item.locale}`);
  assertContactDial(state, `WebKit ${item.locale}`);
  assert.equal(state.counts.faqTags, 7, `WebKit ${item.locale}: FAQ tags`);
  assert.equal(state.counts.countries, 24, `WebKit ${item.locale}: countries`);
}
assert.equal(webkitErrors.length, 0, `WebKit console errors: ${webkitErrors.join(" | ")}`);
await webkitContext.close();
await webkitBrowser.close();

console.log(`UI enhancement browser QA passed: ${HOME_PAGES.length} homepages, ${CALCULATOR_PAGES.length} calculators, ${INQUIRY_PAGES.length} inquiry pages, Chromium/WebKit, RTL, reduced motion, no-JS and screenshots at ${OUTPUT_DIR}.`);
