#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_AI_OUTPUT_DIR || "/tmp/jabbar-ai-qa";
const AI_VERSION = "ai-20260712b";
const UI_VERSION = "ui-20260713a";
const PAGES = [
  { locale: "zh", path: "/" },
  { locale: "en", path: "/en/" },
  { locale: "es", path: "/es/" },
  { locale: "ar", path: "/ar/", rtl: true },
  { locale: "fr", path: "/fr/" },
  { locale: "pt", path: "/pt/" },
  { locale: "ru", path: "/ru/" },
  { locale: "de", path: "/de/" },
  { locale: "it", path: "/it/" },
  { locale: "tr", path: "/tr/" },
  { locale: "calculator", path: "/calculator/" }
];

async function measure(page) {
  return page.evaluate(() => {
    const readRect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        className: element.className,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        fontSize: Number.parseFloat(style.fontSize),
        opacity: Number.parseFloat(style.opacity),
        pointerEvents: style.pointerEvents,
        direction: style.direction,
        display: style.display,
        visibility: style.visibility
      };
    };
    const viewport = window.visualViewport;
    return {
      viewport: {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
        offsetLeft: viewport?.offsetLeft ?? 0,
        offsetTop: viewport?.offsetTop ?? 0,
        scale: viewport?.scale ?? 1
      },
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      activeClass: document.activeElement?.className || "",
      scriptVersion: document.querySelector('script[src*="ai-sourcing-assistant.js"]')?.getAttribute("src") || "",
      uiScriptVersion: document.querySelector('script[src*="site-enhancements.js"]')?.getAttribute("src") || "",
      compact: document.querySelector(".jabbar-ai-panel")?.classList.contains("is-compact") || false,
      bodyPaddingBottom: Number.parseFloat(getComputedStyle(document.body).paddingBottom),
      bodyAiOpen: document.body.classList.contains("jabbar-ai-open"),
      links: {
        whatsapp: document.querySelector(".mobile-conversion-whatsapp")?.href || "",
        quote: document.querySelector(".mobile-conversion-quote")?.href || ""
      },
      elements: {
        toggle: readRect(".jabbar-ai-toggle"),
        launcher: readRect(".contact-speed-dial-main"),
        dial: readRect(".contact-speed-dial"),
        panel: readRect(".jabbar-ai-panel"),
        input: readRect(".jabbar-ai-input"),
        send: readRect(".jabbar-ai-send"),
        close: readRect(".jabbar-ai-close"),
        socialAccounts: readRect("#social-accounts"),
        footer: readRect(".site-footer"),
        conversionBar: readRect(".mobile-conversion-bar"),
        conversionWhatsapp: readRect(".mobile-conversion-whatsapp"),
        conversionQuote: readRect(".mobile-conversion-quote")
      }
    };
  });
}

function assertInsideViewport(metrics, names, scope) {
  const left = metrics.viewport.offsetLeft;
  const right = left + metrics.viewport.width;
  const top = metrics.viewport.offsetTop;
  const bottom = top + metrics.viewport.height;
  const tolerance = 1;

  names.forEach((name) => {
    const box = metrics.elements[name];
    assert(box.left >= left - tolerance, `${scope} ${name} left is clipped: ${box.left} < ${left}`);
    assert(box.right <= right + tolerance, `${scope} ${name} right is clipped: ${box.right} > ${right}`);
    assert(box.top >= top - tolerance, `${scope} ${name} top is clipped: ${box.top} < ${top}`);
    assert(box.bottom <= bottom + tolerance, `${scope} ${name} bottom is clipped: ${box.bottom} > ${bottom}`);
  });
}

function assertNoControlOverlap(metrics, scope) {
  const input = metrics.elements.input;
  const send = metrics.elements.send;
  const overlap = Math.min(input.right, send.right) - Math.max(input.left, send.left);
  assert(overlap <= 1, `${scope} AI input overlaps send button by ${overlap}px`);
}

function assertMobileConversionBar(metrics, scope) {
  const bar = metrics.elements.conversionBar;
  const whatsapp = metrics.elements.conversionWhatsapp;
  const quote = metrics.elements.conversionQuote;
  assert(bar && whatsapp && quote, `${scope} mobile conversion bar is missing`);
  assert.equal(bar.display, "grid", `${scope} mobile conversion bar is not displayed`);
  assert.equal(bar.visibility, "visible", `${scope} mobile conversion bar is hidden`);
  assert(bar.opacity > 0.99, `${scope} mobile conversion bar opacity is ${bar.opacity}`);
  assert.equal(bar.pointerEvents, "auto", `${scope} mobile conversion bar does not receive pointer events`);
  assert(Math.abs(bar.height - 56) <= 1, `${scope} mobile conversion bar height is ${bar.height}px`);
  assert(Math.abs(bar.left - metrics.viewport.offsetLeft) <= 1, `${scope} mobile conversion bar left is ${bar.left}px`);
  assert(Math.abs(bar.right - (metrics.viewport.offsetLeft + metrics.viewport.width)) <= 1, `${scope} mobile conversion bar right is ${bar.right}px`);
  assert(Math.abs(bar.bottom - (metrics.viewport.offsetTop + metrics.viewport.height)) <= 1, `${scope} mobile conversion bar bottom is ${bar.bottom}px`);
  [whatsapp, quote].forEach((button, index) => {
    const name = index === 0 ? "WhatsApp" : "quote";
    assert(button.height >= 48, `${scope} ${name} button height is ${button.height}px`);
    assert(button.fontSize >= 16, `${scope} ${name} font is ${button.fontSize}px`);
    assert.equal(button.pointerEvents, "auto", `${scope} ${name} button is not clickable`);
  });
  assert.equal(metrics.links.whatsapp, "https://wa.me/8618658925544", `${scope} WhatsApp URL is wrong`);
  assert(metrics.links.quote.includes("/inquiry/"), `${scope} quote URL is wrong: ${metrics.links.quote}`);
  assert(metrics.bodyPaddingBottom >= 56, `${scope} body padding-bottom is ${metrics.bodyPaddingBottom}px`);
  assert.equal(metrics.bodyAiOpen, false, `${scope} body retained the AI-open state after closing`);
  assert(metrics.elements.launcher.height >= 56, `${scope} contact launcher height is ${metrics.elements.launcher.height}px`);
  assert(metrics.elements.launcher.bottom <= bar.top - 15, `${scope} contact launcher overlaps or crowds the conversion bar`);
}

function assertSocialContainer(metrics, scope) {
  const social = metrics.elements.socialAccounts;
  assert(social, `${scope} social accounts section is missing`);
  assert.match(social.className, /(?:^|\s)container-wide(?:\s|$)/, `${scope} social accounts is missing container-wide`);
  assert.doesNotMatch(social.className, /(?:^|\s)contain(?:\s|$)/, `${scope} social accounts still uses contain`);
  const expectedWidth = Math.min(metrics.innerWidth - 48, 1140);
  const expectedLeft = (metrics.innerWidth - expectedWidth) / 2;
  assert(Math.abs(social.width - expectedWidth) <= 1, `${scope} social width is ${social.width}px, expected ${expectedWidth}px`);
  assert(Math.abs(social.left - expectedLeft) <= 1, `${scope} social left is ${social.left}px, expected ${expectedLeft}px`);
}

async function openAssistant(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator(".contact-speed-dial-main").waitFor({ state: "visible" });
  await page.locator(".contact-speed-dial-main").click();
  await page.waitForFunction(() => document.querySelector(".contact-speed-dial-main")?.getAttribute("aria-expanded") === "true");
  await page.locator(".contact-speed-dial-ai").click();
  await page.waitForFunction(() => {
    const panel = document.querySelector(".jabbar-ai-panel");
    return panel?.classList.contains("is-open") && document.activeElement?.classList.contains("jabbar-ai-input");
  });
  await page.waitForFunction(() => {
    const dial = document.querySelector(".contact-speed-dial");
    const style = dial && getComputedStyle(dial);
    return style?.opacity === "0" && style.pointerEvents === "none";
  });
}

async function checkCurrentLayout(page, scope, compactExpected) {
  const metrics = await measure(page);
  assert(metrics.scriptVersion.endsWith(`?v=${AI_VERSION}`), `${scope} has stale AI script version: ${metrics.scriptVersion}`);
  assert(metrics.uiScriptVersion.endsWith(`?v=${UI_VERSION}`), `${scope} has stale UI script version: ${metrics.uiScriptVersion}`);
  assert.equal(metrics.activeClass, "jabbar-ai-input", `${scope} AI input did not receive focus`);
  assert(metrics.documentWidth <= metrics.innerWidth + 1, `${scope} document has horizontal overflow`);
  assert.equal(metrics.compact, compactExpected, `${scope} compact mode mismatch`);
  if (compactExpected) {
    assert(metrics.elements.input.fontSize >= 16, `${scope} mobile AI input is ${metrics.elements.input.fontSize}px`);
  }
  assert.equal(metrics.elements.toggle.display, "none", `${scope} legacy AI toggle is still visible`);
  assert(metrics.elements.dial.opacity === 0, `${scope} contact launcher remains visible behind the open panel`);
  assert.equal(metrics.elements.dial.pointerEvents, "none", `${scope} hidden contact launcher still receives pointer events`);
  assert(metrics.elements.launcher.height >= 56, `${scope} contact launcher height is ${metrics.elements.launcher.height}px`);
  assert(metrics.bodyAiOpen, `${scope} body is missing the AI-open state`);
  if (metrics.elements.conversionBar && metrics.elements.conversionBar.display !== "none") {
    assert.equal(metrics.elements.conversionBar.visibility, "hidden", `${scope} conversion bar remains visible behind the AI panel`);
    assert.equal(metrics.elements.conversionBar.pointerEvents, "none", `${scope} hidden conversion bar remains clickable`);
  }
  assertInsideViewport(metrics, ["panel", "input", "send", "close"], scope);
  assertNoControlOverlap(metrics, scope);
  return metrics;
}

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1
});
await context.route("**://www.googletagmanager.com/**", (route) => route.fulfill({ status: 200, body: "" }));
await context.route("**://www.clarity.ms/**", (route) => route.fulfill({ status: 204, body: "" }));

const consoleErrors = [];
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

for (const item of PAGES) {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAssistant(page, item.path);
  const metrics = await checkCurrentLayout(page, `${item.locale} 390x844`, true);
  if (item.rtl) {
    assert.equal(metrics.elements.panel.direction, "rtl", "Arabic AI panel must remain RTL");
    assert.equal(metrics.elements.input.direction, "rtl", "Arabic AI input must remain RTL");
  }
  await page.locator(".jabbar-ai-close").click();
  await page.waitForFunction(() => !document.querySelector(".jabbar-ai-panel")?.classList.contains("is-open"));
  await page.waitForFunction(() => {
    const launcher = document.querySelector(".contact-speed-dial-main");
    const style = launcher && getComputedStyle(launcher);
    return style?.visibility === "visible" && Number.parseFloat(style.opacity) > 0.99 && style.pointerEvents !== "none";
  });
  if (item.locale !== "calculator") {
    await page.waitForFunction(() => {
      const bar = document.querySelector(".mobile-conversion-bar");
      const style = bar && getComputedStyle(bar);
      return style?.display === "grid" && style.visibility === "visible" && Number.parseFloat(style.opacity) > 0.99;
    });
  }
  const closed = await measure(page);
  assertInsideViewport(closed, ["launcher"], `${item.locale} closed contact launcher`);
  if (item.locale === "calculator") {
    assert.equal(closed.elements.conversionBar, null, "Calculator must not include the mobile conversion bar");
  } else {
    assertSocialContainer(closed, `${item.locale} 390x844`);
    assertMobileConversionBar(closed, `${item.locale} 390x844`);
    if (item.rtl) {
      assert.equal(closed.elements.conversionBar.direction, "rtl", "Arabic conversion bar must remain RTL");
    }
    if (item.locale === "zh") {
      await page.screenshot({ path: `${OUTPUT_DIR}/mobile-conversion-bar-390x844.png` });
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForFunction(() => Math.abs(window.scrollY - (document.documentElement.scrollHeight - window.innerHeight)) <= 2);
      await page.waitForFunction(() => {
        const dial = document.querySelector(".contact-speed-dial");
        const style = dial && getComputedStyle(dial);
        return style?.visibility === "hidden" && style.opacity === "0" && style.pointerEvents === "none";
      });
      const footerMetrics = await measure(page);
      assert(footerMetrics.elements.footer.bottom <= footerMetrics.elements.conversionBar.top + 1, "Mobile conversion bar obscures the footer end");
      assert.equal(footerMetrics.elements.dial.visibility, "hidden", "Contact launcher remains visible over the mobile footer");
      await page.screenshot({ path: `${OUTPUT_DIR}/mobile-conversion-footer-390x844.png` });
    }
  }
}

for (const viewport of [
  { width: 320, height: 568, visible: true, path: "/ru/" },
  { width: 767, height: 700, visible: true, path: "/" },
  { width: 768, height: 700, visible: false, path: "/" },
  { width: 1280, height: 900, visible: false, path: "/" }
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}${viewport.path}`, { waitUntil: "domcontentloaded" });
  await page.locator(".contact-speed-dial-main").waitFor({ state: "visible" });
  const metrics = await measure(page);
  assert(metrics.documentWidth <= metrics.innerWidth + 1, `${viewport.width}px closed page has horizontal overflow`);
  assert(metrics.elements.launcher.height >= 56, `${viewport.width}px contact launcher height is ${metrics.elements.launcher.height}px`);
  if (viewport.visible) {
    assertMobileConversionBar(metrics, `${viewport.path} ${viewport.width}x${viewport.height}`);
  } else {
    assert.equal(metrics.elements.conversionBar.display, "none", `${viewport.width}px conversion bar must be hidden`);
    assert.equal(metrics.bodyPaddingBottom, 0, `${viewport.width}px body must not reserve conversion-bar space`);
    if (viewport.path === "/") assertSocialContainer(metrics, `/ ${viewport.width}x${viewport.height}`);
  }
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 430 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 }
]) {
  await page.setViewportSize(viewport);
  await openAssistant(page, "/");
  const compact = viewport.width <= 767 || viewport.height <= 640;
  await checkCurrentLayout(page, `zh ${viewport.width}x${viewport.height}`, compact);
  if (viewport.width === 390 && viewport.height === 430) {
    await page.screenshot({ path: `${OUTPUT_DIR}/keyboard-proxy-390x430.png` });
  }
}

await page.setViewportSize({ width: 390, height: 844 });
await openAssistant(page, "/");
await page.setViewportSize({ width: 390, height: 430 });
await page.waitForFunction(() => {
  const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
  const viewport = window.visualViewport;
  return Boolean(panel && viewport && panel.top >= viewport.offsetTop - 1 && panel.bottom <= viewport.offsetTop + viewport.height + 1);
});
await checkCurrentLayout(page, "zh dynamic keyboard viewport 390x430", true);
await page.screenshot({ path: `${OUTPUT_DIR}/dynamic-keyboard-390x430.png` });
await page.setViewportSize({ width: 568, height: 320 });
await page.waitForFunction(() => {
  const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
  const viewport = window.visualViewport;
  return Boolean(panel && viewport && panel.left >= viewport.offsetLeft - 1 && panel.right <= viewport.offsetLeft + viewport.width + 1 && panel.top >= viewport.offsetTop - 1 && panel.bottom <= viewport.offsetTop + viewport.height + 1);
});
await checkCurrentLayout(page, "zh dynamic rotation 568x320", true);

for (const zoomViewport of [
  { width: 390, height: 844, name: "phone" },
  { width: 1024, height: 768, name: "tablet" }
]) {
  await page.setViewportSize({ width: zoomViewport.width, height: zoomViewport.height });
  await openAssistant(page, "/");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 16 / 14 });
  await page.waitForFunction(() => window.visualViewport?.scale > 1.1);
  await page.waitForFunction(() => {
    const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
    const viewport = window.visualViewport;
    return Boolean(panel && viewport && panel.right <= viewport.offsetLeft + viewport.width + 1);
  });
  const zoomed = await checkCurrentLayout(page, `zh simulated iOS ${zoomViewport.name} focus zoom`, true);
  assert(zoomed.viewport.scale > 1.1, `Simulated iOS ${zoomViewport.name} focus zoom was not applied`);
  await page.screenshot({ path: `${OUTPUT_DIR}/simulated-focus-zoom-${zoomViewport.name}.png` });
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  await cdp.detach();
}

assert.equal(consoleErrors.length, 0, `AI browser console errors: ${consoleErrors.join(" | ")}`);
await browser.close();

const webkitBrowser = await webkit.launch({ headless: true });
for (const item of PAGES.filter(({ locale }) => ["zh", "en", "ar"].includes(locale))) {
  const webkitContext = await webkitBrowser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1
  });
  await webkitContext.route("**://www.googletagmanager.com/**", (route) => route.fulfill({ status: 200, body: "" }));
  await webkitContext.route("**://www.clarity.ms/**", (route) => route.fulfill({ status: 204, body: "" }));
  const webkitErrors = [];
  const webkitPage = await webkitContext.newPage();
  webkitPage.on("console", (message) => {
    if (message.type() === "error") webkitErrors.push(message.text());
  });
  webkitPage.on("pageerror", (error) => webkitErrors.push(error.message));
  await openAssistant(webkitPage, item.path);
  await checkCurrentLayout(webkitPage, `WebKit ${item.locale} 390x844`, true);
  await webkitPage.setViewportSize({ width: 390, height: 430 });
  await webkitPage.waitForFunction(() => {
    const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
    const viewport = window.visualViewport;
    return Boolean(panel && viewport && panel.top >= viewport.offsetTop - 1 && panel.bottom <= viewport.offsetTop + viewport.height + 1);
  });
  await checkCurrentLayout(webkitPage, `WebKit ${item.locale} dynamic 390x430`, true);
  await webkitPage.setViewportSize({ width: 568, height: 320 });
  await webkitPage.waitForFunction(() => {
    const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
    const viewport = window.visualViewport;
    return Boolean(panel && viewport && panel.left >= viewport.offsetLeft - 1 && panel.right <= viewport.offsetLeft + viewport.width + 1 && panel.top >= viewport.offsetTop - 1 && panel.bottom <= viewport.offsetTop + viewport.height + 1);
  });
  await checkCurrentLayout(webkitPage, `WebKit ${item.locale} dynamic 568x320`, true);
  assert.equal(webkitErrors.length, 0, `WebKit ${item.locale} console errors: ${webkitErrors.join(" | ")}`);
  await webkitContext.close();
}
await webkitBrowser.close();

console.log(`AI assistant and mobile conversion QA passed: ${PAGES.length} pages plus multilingual containers, Chromium/WebKit keyboard, rotation and zoom scenarios. Screenshots: ${OUTPUT_DIR}`);
