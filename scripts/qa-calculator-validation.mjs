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

async function checkUnitChoices(page, scope) {
  const select = page.locator("#unit");
  const panel = page.locator(".calculator-unit-choice");
  const b = (action) => page.locator('[data-unit-action="' + action + '"]');
  const total = page.locator("[data-total-cbm]");
  const result = page.locator(".calculator-results");
  const unitLabels = page.locator("label [data-dimension-unit]");
  const oldTotal = await total.textContent();
  await select.selectOption("in");
  assert.equal(await select.inputValue(), "cm", scope + ": unit changed without a decision");
  assert.equal(await b("convert").evaluate(el => document.activeElement === el), true);
  assert.equal(await page.locator("[data-copy-result]").isDisabled(), true);
  assert.equal(await result.locator(".calculator-inquiry-cta").isVisible(), false);
  assert.equal(await page.locator("#cbm-calculator button[type=submit]").isDisabled(), true);
  await page.keyboard.press("Escape");
  assert.equal(await panel.isVisible(), false);
  assert.equal(await select.evaluate(el => document.activeElement === el), true);
  assert.equal(await total.textContent(), oldTotal);
  await select.selectOption("in");
  await b("convert").press("Enter");
  assert.deepEqual(await unitLabels.allTextContents(), ["in","in","in"]);
  assert.equal(await total.textContent(), oldTotal, scope + ": conversion changed CBM");
  assert(Math.abs(Number(await page.locator("#length").inputValue()) - 30 / 2.54) < 1e-8);
  await select.selectOption("cm");
  await b("convert").click();
  assert.equal(await page.locator("#length").inputValue(), "30", scope + ": round trip drift");
  assert.deepEqual(await unitLabels.allTextContents(), ["cm","cm","cm"]);
  for (const dimension of ["length", "width", "height"]) await page.locator("#" + dimension).fill("");
  await select.selectOption("in");
  assert.equal(await panel.isVisible(), false, scope + ": unnecessary empty prompt");
  assert.deepEqual(await unitLabels.allTextContents(), ["in","in","in"]);
  await page.locator("#width").fill("2");
  await select.selectOption("cm");
  if (!scope.includes("/en/")) assert.notEqual(await b("convert").textContent(), "Convert dimensions", scope + ": English text leaked");
  await b("convert").click();
  assert.equal(await page.locator("#length").inputValue(), "");
  assert.equal(await page.locator("#width").inputValue(), "5.08");
  assert.equal(await result.getAttribute("data-result-state"), "empty");
}

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
  await checkUnitChoices(page, scope);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${scope}: horizontal overflow`);
  assert.deepEqual(errors, [], `${scope}: browser errors`);
  await page.close();
}

async function checkExactConversions(page, browserName) {
  const convert = async unit => {
    await page.locator("#unit").selectOption(unit);
    await page.locator("[data-unit-action=convert]").click();
  };
  const per = page.locator("[data-per-cbm]");
  for (const [name, value] of Object.entries({length:"50",width:"30",height:"15",qty:"1"})) {
    await page.locator("#" + name).fill(value);
  }
  assert.equal(await per.textContent(), "0.023 m³");
  await convert("in");
  assert.equal(await per.textContent(), "0.023 m³", browserName + ": original dimensions lost at a rounding boundary");
  await page.locator("#qty").fill("3");
  assert.equal(await page.locator("[data-total-cbm]").textContent(), "0.068 m³");
  assert.equal(await page.locator("[data-buffer-cbm]").textContent(), "0.071 m³");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", {configurable:true, value:undefined}));
  await page.locator("[data-copy-result]").click();
  const copy = await page.locator("[data-copy-text]").inputValue();
  for (const line of ["CBM / carton: 0.023 m³", "Total CBM: 0.068 m³", "With 5% buffer: 0.071 m³"]) assert(copy.includes(line), line);
  await page.locator(".calculator-results .calculator-inquiry-cta").click();
  await page.waitForURL(BASE_URL + "/en/inquiry/");
  assert.equal(await page.locator(".inquiry-estimate-text").textContent(), copy);
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector("#unit").disabled
    && document.querySelector(".calculator-results").dataset.resultState === "ready");
  assert.equal(await per.textContent(), "0.023 m³", browserName + ": exact conversion lost on back");
  // 仅修改英寸宽度，其他两边的厘米原值不能失效。
  await page.locator("#width").fill("10");
  assert.equal(await per.textContent(), "0.019 m³");
  await convert("cm");
  for (const [name, value] of Object.entries({length:"50",width:"25.4",height:"15"})) assert.equal(await page.locator("#" + name).inputValue(), value);
  // 实际小于半界线，不可用人为的偏移量强行向上舍入。
  await page.locator("#width").fill("30");
  await page.locator("#length").fill("49.9999999999999");
  assert.equal(await per.textContent(), "0.022 m³");
  await convert("in");
  assert.equal(await per.textContent(), "0.022 m³");
}

async function checkHistoryReturn(context, browserName) {
  const page = await context.newPage();
  const base = new URL(BASE_URL).origin;
  const posts = [];
  await page.route("**/*", route => {
    const req = route.request();
    if (req.method() === "POST") posts.push(new URL(req.url()).pathname);
    return req.method() === "GET" && new URL(req.url()).origin === base ? route.continue() : route.abort();
  });
  try {
    await page.setViewportSize({width:390,height:844});
    await page.goto(BASE_URL + "/en/calculator/");
    await page.evaluate(() => history.replaceState({marker:"keep-existing-entry"}, ""));
    await page.locator("#unit").selectOption("in");
    await page.locator(".calculator-optional-summary").click();
    for (const [name, value] of Object.entries({length:"40",width:"30",height:"20",qty:"3",weight:"2.5",product:"QA private product",note:"QA private note"})) {
      await page.locator("#" + name).fill(value);
    }
    const link = page.locator(".calculator-results .calculator-inquiry-cta");
    await link.click();
    await page.waitForURL(BASE_URL + "/en/inquiry/");
    await page.goBack();
    const total = page.locator("[data-total-cbm]");
    await page.waitForFunction(() => !document.querySelector("#unit").disabled
      && document.querySelector(".calculator-results").dataset.resultState === "ready");
    assert.equal(await total.textContent(), "1.180 m³", browserName + ": returned estimate");
    assert.equal(await page.locator("#unit").inputValue(), "in");
    assert.deepEqual(await page.locator("[data-dimension-unit]").allTextContents(), ["in","in","in"]);
    assert.equal(await page.locator("[data-weight-total]").textContent(), "7.5 kg");
    const state = await page.evaluate(() => history.state);
    assert.equal(state.marker, "keep-existing-entry");
    assert.deepEqual(state.jabbarQuickDimensionsV1, { unit:"in", values:["40","30","20","3","2.5"] });
    assert(!JSON.stringify(state).includes("private"), browserName + ": history must not persist free text");
    await page.locator("#unit").selectOption("cm");
    assert(await page.locator("[data-unit-action=keep]").isVisible());
    assert(await page.locator("[data-copy-result]").isDisabled());
    assert(!await link.isVisible());
    await page.locator("[data-unit-action=keep]").click();
    assert.equal(await total.textContent(), "0.072 m³");
    assert(await link.isVisible());
    // 刷新本条历史应恢复已确认的单位；不要擅自应用尚未确认的“换算”。
    await page.locator("#length").fill("45.5");
    await page.locator("#unit").selectOption("in");
    assert(await page.locator("[data-unit-action=keep]").isVisible());
    assert(!await link.isVisible());
    await page.reload({ waitUntil:"load" });
    await page.waitForFunction(() => !document.querySelector("#unit").disabled
      && document.querySelector(".calculator-results").dataset.resultState === "ready");
    assert.equal(await page.locator("#unit").inputValue(), "cm");
    assert.deepEqual(await page.locator("[data-dimension-unit]").allTextContents(), ["cm","cm","cm"]);
    assert.equal(await page.locator("#length").inputValue(), "45.5");
    assert.equal(await total.textContent(), "0.082 m³");
    assert(!await page.locator("[data-unit-action=keep]").isVisible());
    assert(await link.isVisible());
    // 当前字段尚未失焦、延迟写入尚未触发就刷新，也不能复原为上一个数字。
    await page.locator("#height").fill("25");
    await page.reload({ waitUntil:"load" });
    await page.waitForFunction(() => !document.querySelector("#unit").disabled
      && document.querySelector(".calculator-results").dataset.resultState === "ready");
    assert.equal(await page.locator("#height").inputValue(), "25");
    assert.equal(await total.textContent(), "0.102 m³");
    // 重开相同网址不是后退：不能把上次可复制的结果恢复到新表单。
    await page.waitForFunction(() => history.state?.jabbarQuickDimensionsV1?.unit === "cm");
    await page.locator("#qty").fill("0.5");
    await page.goto(BASE_URL + "/en/calculator/", { waitUntil: "load" });
    await page.locator("#cbmFill").waitFor({state:"attached"});
    assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "empty", browserName + ": direct revisit must not restore a stale result");
    assert.equal(await page.locator("[data-copy-result]").isDisabled(), true);
    await checkExactConversions(page, browserName);
    assert.deepEqual(posts, []);
  } finally { await page.close(); }
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
    await checkHistoryReturn(context, browserType.name());
    await checkNestedNotFound(context, browserType.name());
    console.log(`${browserType.name()}: 10-language validation, 360/390/1440px, and nested 404 passed.`);
  } finally {
    await browser.close();
  }
}
