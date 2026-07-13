#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, mkdir, readFile } from "node:fs/promises";
import { basename } from "node:path";
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUTPUT_DIR = process.env.QA_ORDER_OUTPUT_DIR || "/tmp/jabbar-order-analyzer-qa";
const REAL_WORKBOOK = process.env.ORDER_WORKBOOK || "/Users/jabbar/Desktop/订单SHD-260713-0003明细.xlsx";
const FIXTURE_NAME = "qa-order-analyzer-190-products.xlsx";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

await mkdir(OUTPUT_DIR, { recursive: true });

function near(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual), `${label}: expected a finite number, got ${actual}`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected} (±${tolerance})`);
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function blockAnalytics(context) {
  for (const pattern of [
    "**://www.googletagmanager.com/**",
    "**://www.google-analytics.com/**",
    "**://*.google-analytics.com/**",
    "**://www.clarity.ms/**",
    "**://*.clarity.ms/**"
  ]) await context.route(pattern, (route) => route.fulfill({ status: 204, body: "" }));
}

async function createFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [["图片", "商品", "重量", "体积", "单价", "数量", "小计"]];
    for (let index = 0; index < 190; index += 1) {
      rows.push(["", `QA Product ${(index % 5) + 1}`, 0.5, 0.025, 2, 2, 4]);
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "QA订单");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  });
  await context.close();
  return Buffer.from(base64, "base64");
}

async function createNegativeFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [
      ["商品", "重量", "体积", "单价", "数量", "小计"],
      ["正常商品", 1, 0.01, 10, 2, 20],
      ["订单折扣", 0, 0, -2, 1, -2]
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "负数检查");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  });
  await context.close();
  return Buffer.from(base64, "base64");
}

async function waitForAnalyzer(page) {
  await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);
  await page.locator("[data-order-file]").waitFor({ state: "attached" });
}

async function uploadWorkbook(page, file) {
  await page.locator("[data-order-file]").setInputFiles(file);
  const expectedName = typeof file === "string" ? basename(file) : file.name;
  await page.waitForFunction((name) => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA;
    const root = document.querySelector("[data-order-analyzer]");
    return qa?.lastResult?.fileName === name && root?.getAttribute("aria-busy") !== "true";
  }, expectedName);
  return page.evaluate(() => window.JABBAR_ORDER_ANALYZER_QA.lastResult);
}

async function confirmUnits(page) {
  await page.locator("[data-order-weight-unit]").selectOption("kg");
  await page.locator("[data-order-volume-unit]").selectOption("m3");
  await page.locator("[data-order-currency]").selectOption("CNY");
  await page.locator("[data-order-apply]").click();
  await page.waitForFunction(() => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA;
    const root = document.querySelector("[data-order-analyzer]");
    return qa?.lastResult?.overrides?.weightUnit === "kg"
      && qa.lastResult.overrides.volumeUnit === "m3"
      && qa.lastResult.overrides.currency === "CNY"
      && qa.lastResult.overrides.mappingConfirmed === true
      && root?.getAttribute("aria-busy") !== "true";
  });
  return page.evaluate(() => window.JABBAR_ORDER_ANALYZER_QA.lastResult);
}

function assertMetrics(payload, expected, label, confirmed = false) {
  const metrics = payload.result.metrics;
  assert.equal(metrics.productRows, expected.productRows, `${label}: product rows`);
  assert.equal(metrics.uniqueProducts, expected.uniqueProducts, `${label}: unique products`);
  near(metrics.quantity, expected.quantity, 1e-8, `${label}: quantity`);
  near(metrics.weight, expected.weight, 1e-6, `${label}: weight`);
  near(metrics.volume, expected.volume, 1e-9, `${label}: volume`);
  assert.equal(metrics.amounts.length, 1, `${label}: amount group count`);
  near(metrics.amounts[0].value, expected.amount, 1e-6, `${label}: amount`);
  if (confirmed) {
    assert.equal(metrics.amounts[0].currency, "CNY", `${label}: currency`);
    assert.equal(payload.result.pending.weightUnit, false, `${label}: weight unit still pending`);
    assert.equal(payload.result.pending.volumeUnit, false, `${label}: volume unit still pending`);
    assert.equal(payload.result.pending.currency, false, `${label}: currency still pending`);
  }
}

async function captureExport(page, expectedPages, label) {
  const downloads = [];
  const handler = (download) => {
    downloads.push((async () => {
      const path = await download.path();
      assert(path, `${label}: download path missing`);
      const bytes = await readFile(path);
      assert(bytes.subarray(0, 8).equals(PNG_SIGNATURE), `${label}: invalid PNG signature for ${download.suggestedFilename()}`);
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      assert.equal(width, 1600, `${label}: PNG width`);
      assert(height >= 980 && height <= 8400, `${label}: PNG height ${height}`);
      assert(download.suggestedFilename().endsWith(".png"), `${label}: PNG filename`);
      await download.saveAs(`${OUTPUT_DIR}/${download.suggestedFilename()}`);
      return { name: download.suggestedFilename(), size: bytes.length, width, height };
    })());
  };
  page.on("download", handler);
  try {
    await page.locator("[data-order-export]").click();
    await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.exportPageCount > 0
      && !document.querySelector("[data-order-export]")?.disabled);
    const pageCount = await page.evaluate(() => window.JABBAR_ORDER_ANALYZER_QA.exportPageCount);
    if (expectedPages != null) assert.equal(pageCount, expectedPages, `${label}: exported page count`);
    const deadline = Date.now() + 15000;
    while (downloads.length < pageCount && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(downloads.length, pageCount, `${label}: captured download count`);
    const files = await Promise.all(downloads);
    assert.equal(new Set(files.map((file) => file.name)).size, pageCount, `${label}: duplicate PNG filenames`);
    return { pageCount, files };
  } finally {
    page.off("download", handler);
  }
}

async function assertNoOverflow(page, label) {
  const state = await page.evaluate(() => {
    const root = document.querySelector("[data-order-analyzer]");
    const box = root?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      rootLeft: box?.left,
      rootRight: box?.right,
      direction: root ? getComputedStyle(root).direction : ""
    };
  });
  assert(state.scrollWidth <= state.innerWidth + 1, `${label}: horizontal overflow ${state.scrollWidth} > ${state.innerWidth}`);
  assert(state.rootLeft >= -1 && state.rootRight <= state.innerWidth + 1, `${label}: analyzer outside viewport ${state.rootLeft}..${state.rootRight}`);
  return state;
}

const browser = await chromium.launch({ headless: true });
let realExport = null;
let fixtureExport = null;
try {
  const fixture = await createFixture(browser);
  const negativeFixture = await createNegativeFixture(browser);
  assert(fixture.length > 1000, "runtime XLSX fixture is unexpectedly small");

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await blockAnalytics(context);
  await context.addInitScript(() => {
    window.__JABBAR_QA_DISABLE_EXTERNAL_OPEN = true;
    window.__qaShareCalls = [];
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data) => window.__qaShareCalls.push({
        title: data.title || "",
        text: data.text || "",
        fileCount: data.files?.length || 0,
        fileNames: Array.from(data.files || [], (file) => file.name)
      })
    });
  });
  const requests = [];
  context.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  const page = await context.newPage();
  const errors = collectErrors(page);
  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  await waitForAnalyzer(page);
  await page.waitForTimeout(200);
  assert(!requests.some((request) => request.url.includes("/assets/vendor/xlsx.full.min.js")), "vendor XLSX loaded before file selection");

  const uploadRequestIndex = requests.length;
  let payload = await uploadWorkbook(page, { name: FIXTURE_NAME, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fixture });
  assertMetrics(payload, { productRows: 190, uniqueProducts: 5, quantity: 380, weight: 190, volume: 9.5, amount: 760 }, "fixture provisional");
  assert(payload.result.pending.weightUnit && payload.result.pending.volumeUnit && payload.result.pending.currency, "fixture must require unit/currency confirmation");
  assert(payload.result.pending.weightMeaning && payload.result.pending.volumeMeaning, "fixture must require generic weight/volume meaning confirmation");
  assert.equal(await page.locator("[data-order-export]").isDisabled(), true, "export enabled before confirmation");
  assert.equal(await page.locator("[data-order-wechat]").isDisabled(), true, "WeChat enabled before confirmation");
  const qaState = await page.evaluate(() => ({
    noUpload: window.JABBAR_ORDER_ANALYZER_QA.noUpload,
    workerUsed: window.JABBAR_ORDER_ANALYZER_QA.workerUsed,
    fallbackUsed: window.JABBAR_ORDER_ANALYZER_QA.fallbackUsed,
    vendorRequested: window.JABBAR_ORDER_ANALYZER_QA.vendorRequested
  }));
  assert.equal(qaState.noUpload, true, "local-only QA flag");
  assert.equal(qaState.workerUsed, true, "Web Worker was not used");
  assert.equal(qaState.fallbackUsed, false, "unexpected main-thread parser fallback");
  assert.equal(qaState.vendorRequested, true, "vendor lazy-load QA flag");
  const postUploadRequests = requests.slice(uploadRequestIndex);
  const vendorRequest = postUploadRequests.find((request) => request.url.includes("/assets/vendor/xlsx.full.min.js"));
  assert(vendorRequest, "vendor XLSX was not requested after upload");
  assert.equal(new URL(vendorRequest.url).origin, new URL(BASE_URL).origin, "vendor XLSX is not local/same-origin");
  assert.equal(vendorRequest.method, "GET", "vendor XLSX request method");
  assert.deepEqual(postUploadRequests.filter((request) => !["GET", "HEAD", "OPTIONS"].includes(request.method)), [], "file processing made an upload/mutating request");

  payload = await confirmUnits(page);
  assertMetrics(payload, { productRows: 190, uniqueProducts: 5, quantity: 380, weight: 190, volume: 9.5, amount: 760 }, "fixture confirmed", true);
  assert.equal(payload.result.pending.weightMeaning, false, "weight meaning still pending after mapping confirmation");
  assert.equal(payload.result.pending.volumeMeaning, false, "volume meaning still pending after mapping confirmation");
  assert.equal(await page.locator("[data-order-export]").isEnabled(), true, "export disabled after confirmation");
  assert.equal(await page.locator("[data-order-wechat]").isEnabled(), true, "WeChat disabled after confirmation");
  await assertNoOverflow(page, "Chinese desktop 1280");
  await page.locator("[data-order-analyzer]").screenshot({ path: `${OUTPUT_DIR}/fixture-desktop-1280.png` });

  fixtureExport = await captureExport(page, 2, "fixture export");
  assert.equal(await page.evaluate(() => window.__qaShareCalls.length), 0, "export button invoked native share");
  let wechatDownloads = 0;
  const downloadCounter = () => { wechatDownloads += 1; };
  page.on("download", downloadCounter);
  await page.locator("[data-order-wechat]").click();
  await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.lastShareMode === "native-files"
    && !document.querySelector("[data-order-wechat]")?.disabled);
  await page.waitForTimeout(300);
  page.off("download", downloadCounter);
  const shareCalls = await page.evaluate(() => window.__qaShareCalls);
  assert.equal(shareCalls.length, 1, "WeChat button native share call count");
  assert.equal(shareCalls[0].fileCount, 2, "WeChat share PNG count");
  assert.match(shareCalls[0].text, /18658925544/, "WeChat share text ID");
  assert.match(shareCalls[0].text, /190/, "WeChat share text product total");
  assert.equal(wechatDownloads, 0, "WeChat button also downloaded files");
  assert(page.url().startsWith(BASE_URL), "WeChat QA navigated away from the site");

  await page.evaluate(() => {
    window.__qaOriginalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); };
    document.querySelector("[data-order-analyzer]").__jabbarOrderAnalyzer.exportCache = null;
    window.JABBAR_ORDER_ANALYZER_QA.lastShareMode = "";
  });
  await page.locator("[data-order-wechat]").click();
  await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.lastShareMode === "native-text"
    && !document.querySelector("[data-order-wechat]")?.disabled);
  const fallbackShare = await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = window.__qaOriginalToBlob;
    return window.__qaShareCalls.at(-1);
  });
  assert.equal(fallbackShare.fileCount, 0, "WeChat text fallback still depended on PNG files");
  assert.match(fallbackShare.text, /18658925544/, "WeChat text fallback missing ID");

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow(page, "Chinese mobile 390");
  await page.screenshot({ path: `${OUTPUT_DIR}/fixture-mobile-390.png`, fullPage: true });

  let hasRealWorkbook = true;
  try { await access(REAL_WORKBOOK); } catch { hasRealWorkbook = false; }
  if (hasRealWorkbook) {
    await page.setViewportSize({ width: 1280, height: 900 });
    payload = await uploadWorkbook(page, REAL_WORKBOOK);
    payload = await confirmUnits(page);
    assertMetrics(payload, { productRows: 325, uniqueProducts: 325, quantity: 9349, weight: 790.1845, volume: 3.1232867436, amount: 14070.73 }, "real workbook", true);
    realExport = await captureExport(page, null, "real workbook export");
    assert(realExport.pageCount >= 2, `real workbook: expected multiple PNG pages, got ${realExport.pageCount}`);
    await page.locator("[data-order-analyzer]").screenshot({ path: `${OUTPUT_DIR}/real-desktop-1280.png` });
  }

  await page.locator("[data-order-file]").setInputFiles({
    name: "truncated-zip.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("PK\u0003\u0004truncated")
  });
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-order-analyzer]");
    return root?.getAttribute("aria-busy") !== "true" && document.querySelector("[data-order-status]")?.classList.contains("is-error");
  });
  const staleState = await page.evaluate(() => ({
    payload: document.querySelector("[data-order-analyzer]")?.__jabbarOrderAnalyzer?.payload || null,
    qaResult: window.JABBAR_ORDER_ANALYZER_QA.lastResult || null,
    resultsHidden: document.querySelector("[data-order-results]")?.hidden,
    mappingHidden: document.querySelector("[data-order-mapping]")?.hidden,
    exportDisabled: document.querySelector("[data-order-export]")?.disabled,
    wechatDisabled: document.querySelector("[data-order-wechat]")?.disabled,
    fileMeta: document.querySelector(".order-analyzer__file-meta")?.textContent || ""
  }));
  assert.equal(staleState.payload, null, "damaged workbook retained old payload");
  assert.equal(staleState.qaResult, null, "damaged workbook retained old QA result");
  assert.equal(staleState.resultsHidden, true, "damaged workbook left old results visible");
  assert.equal(staleState.mappingHidden, true, "damaged workbook left old mapping visible");
  assert.equal(staleState.exportDisabled, true, "damaged workbook left export enabled");
  assert.equal(staleState.wechatDisabled, true, "damaged workbook left WeChat enabled");
  assert.match(staleState.fileMeta, /truncated-zip\.xlsx/, "damaged workbook file name not shown");

  payload = await uploadWorkbook(page, { name: "negative-values.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: negativeFixture });
  payload = await confirmUnits(page);
  assert(payload.result.warnings.includes("negative_values_skipped"), "negative values warning missing");
  assert.equal(payload.result.negativeValuesSkipped, 1, "negative row count");
  assert.equal(await page.locator("[data-order-export]").isDisabled(), true, "negative values did not block export");
  assert.equal(await page.locator("[data-order-wechat]").isDisabled(), true, "negative values did not block WeChat");
  assert.deepEqual(errors, [], `Chinese calculator console errors: ${errors.join(" | ")}`);
  await context.close();

  const timeoutContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blockAnalytics(timeoutContext);
  await timeoutContext.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => nativeSetTimeout(callback, delay >= 30000 ? 60 : delay, ...args);
    class SilentWorker {
      addEventListener() {}
      postMessage() {}
      terminate() {}
    }
    Object.defineProperty(window, "Worker", { configurable: true, value: SilentWorker });
  });
  const timeoutPage = await timeoutContext.newPage();
  await timeoutPage.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  await waitForAnalyzer(timeoutPage);
  for (const name of ["timeout-first.xlsx", "timeout-second.xlsx"]) {
    await timeoutPage.locator("[data-order-file]").setInputFiles({ name, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fixture });
    await timeoutPage.waitForFunction((expectedName) => {
      const qa = window.JABBAR_ORDER_ANALYZER_QA;
      const root = document.querySelector("[data-order-analyzer]");
      return qa?.lastFile?.name === expectedName && root?.getAttribute("aria-busy") !== "true" && document.querySelector("[data-order-status]")?.classList.contains("is-error");
    }, name);
    const timeoutState = await timeoutPage.evaluate(() => ({
      fallbackUsed: window.JABBAR_ORDER_ANALYZER_QA.fallbackUsed,
      payload: document.querySelector("[data-order-analyzer]").__jabbarOrderAnalyzer.payload,
      resultsHidden: document.querySelector("[data-order-results]").hidden
    }));
    assert.equal(timeoutState.fallbackUsed, false, `${name}: Worker timeout triggered main-thread fallback`);
    assert.equal(timeoutState.payload, null, `${name}: Worker timeout retained a payload`);
    assert.equal(timeoutState.resultsHidden, true, `${name}: Worker timeout exposed old results`);
  }
  await timeoutContext.close();

  const rtlContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blockAnalytics(rtlContext);
  const rtlPage = await rtlContext.newPage();
  const rtlErrors = collectErrors(rtlPage);
  await rtlPage.goto(`${BASE_URL}/ar/calculator/`, { waitUntil: "domcontentloaded" });
  await waitForAnalyzer(rtlPage);
  await uploadWorkbook(rtlPage, { name: FIXTURE_NAME, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fixture });
  const rtlProductOption = await rtlPage.locator('[data-order-column] option[value="product"]').first().textContent();
  assert.notEqual(rtlProductOption, "Product name", "Arabic mapping option fell back to English");
  assert.match(rtlProductOption || "", /[\u0600-\u06ff]/, "Arabic product mapping option is not localized");
  const rtlState = await assertNoOverflow(rtlPage, "Arabic RTL mobile 390");
  assert.equal(documentDirection(await rtlPage.evaluate(() => document.documentElement.dir), rtlState.direction), "rtl", "Arabic analyzer direction");
  await rtlPage.screenshot({ path: `${OUTPUT_DIR}/fixture-ar-rtl-390.png`, fullPage: true });
  assert.deepEqual(rtlErrors, [], `Arabic calculator console errors: ${rtlErrors.join(" | ")}`);
  await rtlContext.close();

  console.log(JSON.stringify({
    ok: true,
    baseUrl: BASE_URL,
    fixture: { rows: 190, pngPages: fixtureExport.pageCount },
    realWorkbook: realExport ? { path: REAL_WORKBOOK, pngPages: realExport.pageCount } : { skipped: true, reason: "file not found" },
    screenshots: OUTPUT_DIR
  }, null, 2));
} finally {
  await browser.close();
}

function documentDirection(htmlDir, rootDirection) {
  return htmlDir || rootDirection;
}
