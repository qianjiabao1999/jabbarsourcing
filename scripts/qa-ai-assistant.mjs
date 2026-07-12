#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_AI_OUTPUT_DIR || "/tmp/jabbar-ai-qa";
const AI_VERSION = "ai-20260712a";
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
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        fontSize: Number.parseFloat(style.fontSize),
        opacity: Number.parseFloat(style.opacity),
        pointerEvents: style.pointerEvents,
        direction: style.direction
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
      compact: document.querySelector(".jabbar-ai-panel")?.classList.contains("is-compact") || false,
      elements: {
        toggle: readRect(".jabbar-ai-toggle"),
        panel: readRect(".jabbar-ai-panel"),
        input: readRect(".jabbar-ai-input"),
        send: readRect(".jabbar-ai-send"),
        close: readRect(".jabbar-ai-close")
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

async function openAssistant(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator(".jabbar-ai-toggle").waitFor({ state: "visible" });
  await page.locator(".jabbar-ai-toggle").click();
  await page.waitForFunction(() => {
    const panel = document.querySelector(".jabbar-ai-panel");
    return panel?.classList.contains("is-open") && document.activeElement?.classList.contains("jabbar-ai-input");
  });
  await page.waitForFunction(() => {
    const toggle = document.querySelector(".jabbar-ai-toggle");
    const style = toggle && getComputedStyle(toggle);
    return style?.opacity === "0" && style.pointerEvents === "none";
  });
}

async function checkCurrentLayout(page, scope, compactExpected) {
  const metrics = await measure(page);
  assert(metrics.scriptVersion.endsWith(`?v=${AI_VERSION}`), `${scope} has stale AI script version: ${metrics.scriptVersion}`);
  assert.equal(metrics.activeClass, "jabbar-ai-input", `${scope} AI input did not receive focus`);
  assert(metrics.documentWidth <= metrics.innerWidth + 1, `${scope} document has horizontal overflow`);
  assert.equal(metrics.compact, compactExpected, `${scope} compact mode mismatch`);
  if (compactExpected) {
    assert(metrics.elements.input.fontSize >= 16, `${scope} mobile AI input is ${metrics.elements.input.fontSize}px`);
  }
  assert(metrics.elements.toggle.opacity === 0, `${scope} toggle remains visible behind the open panel`);
  assert.equal(metrics.elements.toggle.pointerEvents, "none", `${scope} hidden toggle still receives pointer events`);
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
    const toggle = document.querySelector(".jabbar-ai-toggle");
    const style = toggle && getComputedStyle(toggle);
    return style?.visibility === "visible" && Number.parseFloat(style.opacity) > 0.99 && style.pointerEvents !== "none";
  });
  const closed = await measure(page);
  assertInsideViewport(closed, ["toggle"], `${item.locale} closed toggle`);
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
  return Boolean(panel && viewport && panel.bottom <= viewport.offsetTop + viewport.height + 1);
});
await checkCurrentLayout(page, "zh dynamic keyboard viewport 390x430", true);
await page.screenshot({ path: `${OUTPUT_DIR}/dynamic-keyboard-390x430.png` });
await page.setViewportSize({ width: 568, height: 320 });
await page.waitForFunction(() => {
  const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
  const viewport = window.visualViewport;
  return Boolean(panel && viewport && panel.right <= viewport.offsetLeft + viewport.width + 1 && panel.bottom <= viewport.offsetTop + viewport.height + 1);
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
    return Boolean(panel && viewport && panel.bottom <= viewport.offsetTop + viewport.height + 1);
  });
  await checkCurrentLayout(webkitPage, `WebKit ${item.locale} dynamic 390x430`, true);
  await webkitPage.setViewportSize({ width: 568, height: 320 });
  await webkitPage.waitForFunction(() => {
    const panel = document.querySelector(".jabbar-ai-panel")?.getBoundingClientRect();
    const viewport = window.visualViewport;
    return Boolean(panel && viewport && panel.right <= viewport.offsetLeft + viewport.width + 1 && panel.bottom <= viewport.offsetTop + viewport.height + 1);
  });
  await checkCurrentLayout(webkitPage, `WebKit ${item.locale} dynamic 568x320`, true);
  assert.equal(webkitErrors.length, 0, `WebKit ${item.locale} console errors: ${webkitErrors.join(" | ")}`);
  await webkitContext.close();
}
await webkitBrowser.close();

console.log(`AI assistant mobile QA passed: ${PAGES.length} pages plus Chromium and WebKit compact, dynamic keyboard, rotation and zoom scenarios. Screenshots: ${OUTPUT_DIR}`);
