#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUTPUT_DIR = process.env.QA_CALCULATOR_VALIDATION_OUTPUT_DIR || "/tmp/jabbar-calculator-validation-qa";
const locales = ["", "en/", "es/", "ar/", "fr/", "pt/", "ru/", "de/", "it/", "tr/"];
const notFoundHtml = await readFile(fileURLToPath(new URL("../404.html", import.meta.url)), "utf8");
await mkdir(OUTPUT_DIR, { recursive: true });

async function checkCalculator(context, locale, width, browserName) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 844 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const scope = `${browserName}/${locale || "zh"}/${width}`;
  await page.goto(`${BASE_URL}/${locale}calculator/`, { waitUntil: "domcontentloaded" });
  await page.locator(".calculator-optional-details").waitFor();
  assert.equal(page.url(), `${BASE_URL}/${locale}calculator/`, `${scope}: page identity`);
  assert(await page.title(), `${scope}: missing title`);
  assert(await page.locator("h1").textContent(), `${scope}: blank page`);
  assert.equal(await page.locator("#length").getAttribute("aria-invalid"), null, `${scope}: errors shown before submit`);
  const submit = page.locator("#cbm-calculator button[type=submit]");
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), "length", `${scope}: first invalid field not focused`);
  assert.equal(await page.locator(".calculator-field-error:not([hidden])").count(), 3, `${scope}: missing dimension errors`);
  for (const name of ["length", "width", "height"]) {
    assert.equal(await page.locator(`#${name}`).getAttribute("aria-invalid"), "true", `${scope}: missing invalid state on ${name}`);
    assert.equal(await page.locator(`#${name}`).getAttribute("aria-describedby"), `${name}-error`, `${scope}: missing error association on ${name}`);
    assert(await page.locator(`#${name}-error`).textContent(), `${scope}: empty localized error`);
  }
  if (locale !== "en/") {
    assert.notEqual(await page.locator("#length-error").textContent(), "Enter a valid number greater than 0.", `${scope}: English error leaked into another locale`);
  }
  const position = await page.locator("#length").boundingBox();
  assert(position.y > 120 && position.y + position.height < 844, `${scope}: focused field hidden under header or outside viewport`);
  if ((locale === "en/" || locale === "ar/") && width === 390) {
    await page.screenshot({ path: `${OUTPUT_DIR}/${browserName}-${locale.slice(0, -1)}-invalid.png` });
  }

  await page.locator("#length").fill("0");
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), "length", `${scope}: zero dimension accepted`);
  for (const [name, value] of Object.entries({ length: "30", width: "40", height: "40", qty: "1000" })) {
    await page.locator(`#${name}`).fill(value);
  }
  assert.equal(await page.locator(".calculator-field-error:not([hidden])").count(), 0, `${scope}: corrected field error remains`);
  assert.equal(await page.locator("#length").getAttribute("aria-invalid"), null, `${scope}: stale invalid state`);
  assert.equal(await page.locator("#length").getAttribute("aria-describedby"), null, `${scope}: stale error association`);
  assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "ready", `${scope}: valid estimate not ready`);
  const result = await page.locator("[data-total-cbm]").textContent();
  assert(result.includes("48") || result.includes("٤٨"), `${scope}: CBM total changed: ${result}`);

  await page.locator("#qty").fill("1.5");
  await submit.click();
  assert.equal(await page.evaluate(() => document.activeElement.id), "qty", `${scope}: fractional cartons accepted`);
  assert.equal(await page.locator("#qty").getAttribute("aria-invalid"), "true", `${scope}: no carton error`);
  await page.locator("#qty").fill("1000");
  await page.locator(".calculator-optional-summary").click();
  await page.locator("#weight").fill("-1");
  await page.locator(".calculator-optional-summary").click();
  await submit.click();
  assert.equal(await page.locator(".calculator-optional-details").evaluate((node) => node.open), true, `${scope}: invalid optional field remained collapsed`);
  assert.equal(await page.evaluate(() => document.activeElement.id), "weight", `${scope}: invalid optional weight not focused`);
  assert.equal(await page.locator("#weight").getAttribute("aria-invalid"), "true", `${scope}: no weight error`);
  await page.locator("#weight").fill("");
  assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "ready", `${scope}: optional blank weight blocks calculation`);
  assert.equal(await page.locator(".calculator-field-error:not([hidden])").count(), 0, `${scope}: cleared weight retains error`);
  assert.equal(await page.locator(".calculator-results").getAttribute("aria-live"), "polite", `${scope}: result announcements removed`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${scope}: horizontal overflow`);
  assert.deepEqual(errors, [], `${scope}: browser errors`);
  await page.close();
}

async function checkNestedNotFound(context, browserName) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const missingPath = "/en/missing/deep-page";
  const failures = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== missingPath) failures.push(response.url());
  });
  await page.route(`**${missingPath}`, (route) => route.fulfill({ status: 404, contentType: "text/html; charset=utf-8", body: notFoundHtml }));
  const response = await page.goto(`${BASE_URL}${missingPath}`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 404, `${browserName}: nested missing route became a soft 404`);
  assert.equal(await page.locator("meta[name=robots]").getAttribute("content"), "noindex,follow", `${browserName}: 404 index policy changed`);
  assert.equal(await page.locator(".not-found-logo img").evaluate((image) => image.complete && image.naturalWidth > 0), true, `${browserName}: 404 logo failed`);
  assert.equal(await page.locator(".not-found-main").evaluate((node) => getComputedStyle(node).display), "grid", `${browserName}: 404 styles failed`);
  const rootRelative = await page.locator('link[href], script[src], img[src]').evaluateAll((nodes) => nodes.every((node) => {
    const value = node.getAttribute("href") || node.getAttribute("src");
    return value.startsWith("/") || /^https?:/.test(value);
  }));
  assert(rootRelative, `${browserName}: nested 404 still has relative resources`);
  assert.deepEqual(failures, [], `${browserName}: 404 resource errors`);
  await page.screenshot({ path: `${OUTPUT_DIR}/${browserName}-nested-404.png` });
  await page.close();
}

for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.route("**/api/consent-region", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ policy: "quiet-denied", country: "CN" }) }));
    for (const pattern of ["**://www.googletagmanager.com/**", "**://*.google-analytics.com/**", "**://*.clarity.ms/**"]) {
      await context.route(pattern, (route) => route.fulfill({ status: 204, body: "" }));
    }
    for (const locale of locales) await checkCalculator(context, locale, 390, browserType.name());
    for (const width of [360, 1440]) await checkCalculator(context, "en/", width, browserType.name());
    await checkNestedNotFound(context, browserType.name());
    console.log(`${browserType.name()}: 10-language validation, 360/390/1440px, and nested 404 passed.`);
  } finally {
    await browser.close();
  }
}
