#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_AI_OUTPUT_DIR || "/tmp/jabbar-ai-assistant-qa";
const UI_VERSION = "ui-20260719a";
const LOCALES = ["", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const PAGES = LOCALES.flatMap((locale) => {
  const root = locale ? `/${locale}/` : "/";
  return [
    { locale: locale || "zh", type: "home", path: root },
    { locale: locale || "zh", type: "calculator", path: `${root}calculator/`.replace("//", "/") },
    { locale: locale || "zh", type: "inquiry", path: `${root}inquiry/`.replace("//", "/") }
  ];
});

await mkdir(OUTPUT_DIR, { recursive: true });

async function prepare(context) {
  await context.route("**://www.googletagmanager.com/**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**://www.clarity.ms/**", (route) => route.fulfill({ status: 204, body: "" }));
  // This suite validates layout and floating entry points, not Turnstile.
  // Blocking the third-party challenge avoids WebKit mixed-protocol iframe
  // noise when the fixture is intentionally served from local HTTP.
  await context.route("**://challenges.cloudflare.com/**", (route) => route.fulfill({ status: 204, body: "" }));
}

async function assertNoFloatingAssistant(page, item, scope) {
  await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
  await page.locator(".site-nav").waitFor({ state: "visible" });

  const state = await page.evaluate(() => {
    const toggle = document.querySelector(".jabbar-ai-toggle");
    const panel = document.querySelector(".jabbar-ai-panel");
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      floatingCount: document.querySelectorAll(".contact-speed-dial, .contact-speed-dial-menu, .contact-speed-dial-option, .contact-speed-dial-main").length,
      conversionCount: document.querySelectorAll(".mobile-conversion-bar, .mobile-conversion-whatsapp, .mobile-conversion-quote").length,
      bodyConversionClass: document.body.classList.contains("has-mobile-conversion-bar"),
      toggleCount: document.querySelectorAll(".jabbar-ai-toggle").length,
      toggleDisplay: toggle ? getComputedStyle(toggle).display : "",
      panelCount: document.querySelectorAll(".jabbar-ai-panel").length,
      panelDisplay: panel ? getComputedStyle(panel).display : "",
      panelOpen: Boolean(panel?.classList.contains("is-open")),
      aiVersion: document.querySelector('script[src*="ai-sourcing-assistant.js"]')?.getAttribute("src") || "",
      uiVersion: document.querySelector('script[src*="site-enhancements.js"]')?.getAttribute("src") || "",
      footerContacts: document.querySelectorAll(".site-footer .contact-actions .contact-link").length,
      mobileMenuCalculator: document.querySelectorAll('.site-nav-mobile-panel a[href*="calculator"], .site-nav-mobile-panel a[href="./"]').length,
      mobileMenuTeam: document.querySelectorAll('.site-nav-mobile-panel a[href*="#social-accounts"]').length
    };
  });

  assert(state.uiVersion.endsWith(`?v=${UI_VERSION}`), `${scope}: stale UI script ${state.uiVersion}`);
  assert.equal(state.floatingCount, 0, `${scope}: floating WhatsApp/Telegram/AI controls remain`);
  assert.equal(state.conversionCount, 0, `${scope}: mobile conversion bar remains`);
  assert.equal(state.bodyConversionClass, false, `${scope}: mobile conversion body class remains`);
  assert.equal(state.aiVersion, "", `${scope}: hidden AI script still loads by default`);
  assert.equal(state.toggleCount, 0, `${scope}: assistant toggle exists without a visible product entry point`);
  assert.equal(state.panelCount, 0, `${scope}: assistant panel exists without a visible product entry point`);
  assert.equal(state.panelOpen, false, `${scope}: assistant panel retained an open state`);
  assert.equal(state.mobileMenuCalculator, 0, `${scope}: calculator link remains in the mobile menu`);
  assert.equal(
    state.mobileMenuTeam,
    item.type === "inquiry" ? 1 : 0,
    `${scope}: mobile team-member link count`
  );
  assert(state.documentWidth <= state.viewportWidth + 1, `${scope}: horizontal overflow ${state.documentWidth} > ${state.viewportWidth}`);
  if (item.type === "home" || item.type === "inquiry") {
    assert.equal(state.footerContacts, 5, `${scope}: normal footer contact pills were removed`);
  }
}

for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1
  });
  await prepare(context);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const item of PAGES) {
    await assertNoFloatingAssistant(page, item, `${browserType.name()} ${item.locale} ${item.type} 390x844`);
    assert.equal(errors.length, 0, `${browserType.name()} ${item.path}: console errors ${errors.splice(0).join(" | ")}`);
  }

  if (browserType === chromium) {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `${OUTPUT_DIR}/no-floating-controls-mobile-390x844.png`, fullPage: false });
  }
  await context.close();
  await browser.close();
}

const desktop = await chromium.launch({ headless: true });
const desktopContext = await desktop.newContext({ viewport: { width: 1280, height: 900 } });
await prepare(desktopContext);
const desktopPage = await desktopContext.newPage();
await assertNoFloatingAssistant(desktopPage, { locale: "zh", type: "home", path: "/" }, "Chromium zh home 1280x900");
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/no-floating-controls-desktop-1280x900.png`, fullPage: false });
await desktopContext.close();
await desktop.close();

console.log(`AI/floating-control QA passed: ${PAGES.length} localized pages in Chromium/WebKit plus desktop, with no default AI bootstrap and no floating entry points.`);
