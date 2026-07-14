#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, mkdir, readFile } from "node:fs/promises";
import { basename } from "node:path";
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUTPUT_DIR = process.env.QA_ORDER_OUTPUT_DIR || "/tmp/jabbar-order-analyzer-qa";
const REAL_WORKBOOK = process.env.ORDER_WORKBOOK || "/Users/jabbar/Downloads/订单SHD-260713-0003明细.xlsx";
const SUMMARY_WORKBOOK = process.env.SUMMARY_ORDER_WORKBOOK || "/Users/jabbar/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_svlu2ime3h3l12_c4b7/msg/file/2026-07/Biiabaa01.xlsx";
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

async function createUsdHeaderFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [
      ["Product", "Quantity", "Amount USD", "Total Weight (kg)", "Total Volume (m3)"],
      ["USD Product A", 2, 25, 4, 0.2],
      ["USD Product B", 1, 30, 2, 0.1]
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "USD Header");
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

async function createSummaryFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [
      ["商品编号", "产品备注", "数量", "折后单价", "折后金额", "体积（m³）", "重量（kg）", "箱长（cm）", "箱宽（cm）", "箱高（cm）"],
      ["QA-001", "测试商品 A", 2, 10, 20, 0.2, 4, 40, 30, 20],
      ["QA-002", "测试商品 B", 3, 10, 30, 0.3, 6, 50, 40, 30],
      ["合计", "共2款", 5, "", 50, 0.5, 10, "", "", ""]
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "合计行检查");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  });
  await context.close();
  return Buffer.from(base64, "base64");
}

async function createContinuationFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [
      ["商品编号", "商品名称", "数量", "单价", "小计", "总体积（m³）", "总重量（kg）"],
      ["QA-CONT-001", "正常商品", 2, 10, 20, 0.2, 4],
      ["", "", 1, 5, 5, 0.1, 2]
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "空商品名续行");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  });
  await context.close();
  return Buffer.from(base64, "base64");
}

async function createAllQuantityOneFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [
      ["商品编号", "产品备注", "数量", "单价", "小计", "体积", "重量"],
      ["QA-ONE-001", "测试商品 A", 1, 10, 10, 0.2, 4],
      ["QA-ONE-002", "测试商品 B", 1, 20, 20, 0.3, 6],
      ["合计", "共2款", 2, "", 30, 0.5, 10]
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "数量全为一");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  });
  await context.close();
  return Buffer.from(base64, "base64");
}

async function createLimitFixture(browser, kind) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate((limitKind) => {
    let rows;
    if (limitKind === "rows") {
      rows = [["商品名称", "数量", "单价", "小计", "总重量（kg）", "总体积（m³）", "内部标记"]];
      rows.push(["边界商品", 1, 1, 1, 1, 0.01, "首行"]);
      for (let index = 1; index < 10001; index += 1) rows.push([null, null, null, null, null, null, `占位-${index}`]);
    } else {
      const headers = ["商品名称", "数量", "单价", "小计", "总重量（kg）", "总体积（m³）"];
      while (headers.length < 101) headers.push(`内部列-${headers.length + 1}`);
      const values = ["边界商品", 1, 1, 1, 1, 0.01];
      while (values.length < 101) values.push(`占位-${values.length + 1}`);
      rows = [headers, values];
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), limitKind === "rows" ? "10001行" : "101列");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  }, kind);
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
  const fixedSettings = await page.evaluate(() => ({
    weight: { type: document.querySelector("[data-order-weight-unit]")?.type, value: document.querySelector("[data-order-weight-unit]")?.value },
    volume: { type: document.querySelector("[data-order-volume-unit]")?.type, value: document.querySelector("[data-order-volume-unit]")?.value },
    dimension: { type: document.querySelector("[data-order-dimension-unit]")?.type, value: document.querySelector("[data-order-dimension-unit]")?.value },
    currency: { type: document.querySelector("[data-order-currency]")?.type, value: document.querySelector("[data-order-currency]")?.value }
  }));
  assert.deepEqual(fixedSettings, {
    weight: { type: "hidden", value: "kg" },
    volume: { type: "hidden", value: "m3" },
    dimension: { type: "hidden", value: "cm" },
    currency: { type: "hidden", value: "CNY" }
  }, "fixed unit/currency settings");
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
  if (expected.currency) assert.equal(metrics.amounts[0].currency, expected.currency, `${label}: currency`);
  if (confirmed) {
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
  const usdHeaderFixture = await createUsdHeaderFixture(browser);
  const negativeFixture = await createNegativeFixture(browser);
  const summaryFixture = await createSummaryFixture(browser);
  const continuationFixture = await createContinuationFixture(browser);
  const allQuantityOneFixture = await createAllQuantityOneFixture(browser);
  const rowLimitFixture = await createLimitFixture(browser, "rows");
  const columnLimitFixture = await createLimitFixture(browser, "columns");
  assert(fixture.length > 1000, "runtime XLSX fixture is unexpectedly small");

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await blockAnalytics(context);
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
  assert.equal(payload.headers.some((header) => header.label === "图片"), false, "image column was not filtered from analyzer headers");
  assert.equal(payload.result.pending.weightUnit, false, "fixture: fixed kg must not be pending");
  assert.equal(payload.result.pending.volumeUnit, false, "fixture: fixed m3 must not be pending");
  assert.equal(payload.result.pending.dimensionUnit, false, "fixture: fixed cm must not be pending");
  assert.equal(payload.result.pending.currency, false, "fixture: default CNY must not be pending");
  assert.deepEqual(
    { weight: payload.overrides.weightUnit, volume: payload.overrides.volumeUnit, dimension: payload.overrides.dimensionUnit, currency: payload.overrides.currency },
    { weight: "kg", volume: "m3", dimension: "cm", currency: "CNY" },
    "fixture: default units/currency"
  );
  assert.equal(payload.result.metrics.amounts[0].currency, "CNY", "fixture: missing currency did not default to CNY");
  assert(payload.result.pending.weightMeaning && payload.result.pending.volumeMeaning, "fixture must require generic weight/volume meaning confirmation");
  assert.equal(await page.locator("[data-order-export]").isDisabled(), true, "export enabled before confirmation");
  assert.equal(await page.locator("[data-order-wechat]").count(), 0, "removed WeChat action returned");
  const qaState = await page.evaluate(() => ({
    noUpload: window.JABBAR_ORDER_ANALYZER_QA.noUpload,
    workerUsed: window.JABBAR_ORDER_ANALYZER_QA.workerUsed,
    fallbackUsed: window.JABBAR_ORDER_ANALYZER_QA.fallbackUsed,
    vendorRequested: window.JABBAR_ORDER_ANALYZER_QA.vendorRequested,
    maxFileBytes: window.JABBAR_ORDER_ANALYZER_QA.maxFileBytes
  }));
  assert.equal(qaState.noUpload, true, "local-only QA flag");
  assert.equal(qaState.workerUsed, true, "Web Worker was not used");
  assert.equal(qaState.fallbackUsed, false, "unexpected main-thread parser fallback");
  assert.equal(qaState.vendorRequested, true, "vendor lazy-load QA flag");
  assert.equal(qaState.maxFileBytes, 50 * 1024 * 1024, "50 MB upload limit");
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
  await assertNoOverflow(page, "Chinese desktop 1280");
  await page.locator("[data-order-analyzer]").screenshot({ path: `${OUTPUT_DIR}/fixture-desktop-1280.png` });

  fixtureExport = await captureExport(page, 2, "fixture export");

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow(page, "Chinese mobile 390");
  await page.screenshot({ path: `${OUTPUT_DIR}/fixture-mobile-390.png`, fullPage: true });

  payload = await uploadWorkbook(page, {
    name: "qa-explicit-usd-header.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: usdHeaderFixture
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 2, quantity: 3, weight: 6, volume: 0.3, amount: 55, currency: "USD" }, "explicit USD header fixture", true);
  assert.equal(payload.overrides.currency, "USD", "explicit USD header fixture: override was relabeled as CNY");
  assert.equal(payload.overrides.mappingConfirmed, true, "explicit USD header fixture: mapping unexpectedly requires confirmation");
  assert(payload.result.items.every((item) => item.currency === "USD"), "explicit USD header fixture: a detail row was relabeled as CNY");
  const usdUi = await page.evaluate(() => {
    const currencyInput = document.querySelector("[data-order-currency]");
    return {
      type: currencyInput?.type,
      value: currencyInput?.value,
      display: currencyInput?.parentElement?.querySelector("strong")?.textContent || "",
      metrics: document.querySelector(".order-analyzer__metrics")?.textContent || "",
      mappingOpen: document.querySelector("[data-order-mapping]")?.open
    };
  });
  assert.deepEqual({ type: usdUi.type, value: usdUi.value }, { type: "hidden", value: "USD" }, "explicit USD header fixture: detected currency state");
  assert.equal(usdUi.display, "USD", "explicit USD header fixture: detected currency display");
  assert.match(usdUi.metrics, /USD\s*55/, "explicit USD header fixture: UI amount does not show USD");
  assert.doesNotMatch(usdUi.metrics, /CNY/, "explicit USD header fixture: UI amount was relabeled as CNY");
  assert.equal(usdUi.mappingOpen, false, "explicit USD header fixture: mapping opened for manual confirmation");
  assert.equal(await page.locator("[data-order-export]").isEnabled(), true, "explicit USD header fixture: export blocked for manual confirmation");

  payload = await uploadWorkbook(page, {
    name: "qa-summary-row-and-header-units.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: summaryFixture
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 2, quantity: 5, weight: 10, volume: 0.5, amount: 50 }, "summary fixture");
  assert.equal(payload.result.skippedSummaryRows, 1, "summary fixture: skipped summary row count");
  assert(payload.result.warnings.includes("summary_rows_skipped"), "summary fixture: summary warning missing");
  assert.equal(payload.result.items.some((item) => item.row === 4), false, "summary fixture: summary row remained in details");
  assert.equal(payload.result.items.some((item) => item.product === "共2款"), false, "summary fixture: product remark remained in details");
  assert.equal(payload.mapping.totalWeight, 6, "summary fixture: weight was not inferred as line total");
  assert.equal(payload.mapping.totalVolume, 5, "summary fixture: volume was not inferred as line total");
  assert.equal(payload.mapping.unitWeight, undefined, "summary fixture: weight remained mapped as per-unit");
  assert.equal(payload.mapping.unitVolume, undefined, "summary fixture: volume remained mapped as per-unit");
  assert.equal(payload.overrides.mappingConfirmed, true, "summary fixture: known mapping was not auto-confirmed");
  assert.equal(payload.result.pending.weightUnit, false, "summary fixture: kg header still pending");
  assert.equal(payload.result.pending.volumeUnit, false, "summary fixture: m³ header still pending");
  assert.equal(payload.result.pending.dimensionUnit, false, "summary fixture: cm headers still pending");
  const autoUnits = await page.evaluate(() => ({
    weight: document.querySelector("[data-order-weight-unit]")?.value,
    volume: document.querySelector("[data-order-volume-unit]")?.value,
    dimension: document.querySelector("[data-order-dimension-unit]")?.value
  }));
  assert.deepEqual(autoUnits, { weight: "kg", volume: "m3", dimension: "cm" }, "summary fixture: header units were not auto-selected");
  await assertNoOverflow(page, "summary fixture mobile 390");
  await page.locator("[data-order-analyzer]").screenshot({ path: `${OUTPUT_DIR}/summary-fixture-mobile-390.png` });

  payload = await uploadWorkbook(page, {
    name: "qa-trailing-empty-product-continuation.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: continuationFixture
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 1, quantity: 3, weight: 6, volume: 0.3, amount: 25 }, "empty product continuation fixture", true);
  assert.equal(payload.result.skippedSummaryRows, 0, "empty product continuation fixture: normal row was marked as summary");
  const continuationRow = payload.result.items.find((item) => item.row === 3);
  assert(continuationRow, "empty product continuation fixture: trailing row was removed");
  assert.equal(continuationRow.product, "", "empty product continuation fixture: unexpected product text");
  assert.equal(continuationRow.sku, "", "empty product continuation fixture: unexpected SKU text");
  assert.equal(continuationRow.quantity, 1, "empty product continuation fixture: trailing quantity");

  payload = await uploadWorkbook(page, {
    name: "qa-all-quantity-one-summary-inference.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: allQuantityOneFixture
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 2, quantity: 2, weight: 10, volume: 0.5, amount: 30 }, "all quantity one fixture", true);
  assert.equal(payload.result.skippedSummaryRows, 1, "all quantity one fixture: skipped summary row count");
  assert.equal(payload.mapping.totalWeight, 6, "all quantity one fixture: weight was not inferred as line total");
  assert.equal(payload.mapping.totalVolume, 5, "all quantity one fixture: volume was not inferred as line total");
  assert.equal(payload.mapping.unitWeight, undefined, "all quantity one fixture: weight remained mapped as per-unit");
  assert.equal(payload.mapping.unitVolume, undefined, "all quantity one fixture: volume remained mapped as per-unit");

  for (const boundary of [
    { name: "qa-10001-data-rows.xlsx", buffer: rowLimitFixture, warning: "rows_truncated" },
    { name: "qa-101-columns.xlsx", buffer: columnLimitFixture, warning: "columns_truncated" }
  ]) {
    payload = await uploadWorkbook(page, {
      name: boundary.name,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: boundary.buffer
    });
    assert(payload.result.warnings.includes(boundary.warning), `${boundary.name}: explicit limit warning missing`);
    assert.equal(await page.locator("[data-order-export]").isDisabled(), true, `${boundary.name}: export enabled despite truncated data`);
  }

  let hasSummaryWorkbook = true;
  try { await access(SUMMARY_WORKBOOK); } catch { hasSummaryWorkbook = false; }
  if (hasSummaryWorkbook) {
    payload = await uploadWorkbook(page, SUMMARY_WORKBOOK);
    assertMetrics(payload, { productRows: 20, uniqueProducts: 20, quantity: 1051, weight: 190.6698, volume: 1.20376, amount: 1890.98 }, "Biiabaa01 workbook");
    assert.equal(payload.result.skippedSummaryRows, 1, "Biiabaa01: skipped summary row count");
    assert.equal(payload.result.items.some((item) => item.row === 22), false, "Biiabaa01: row 22 remained in details");
    assert.equal(payload.overrides.weightUnit, "kg", "Biiabaa01: kg header was not detected");
    assert.equal(payload.overrides.volumeUnit, "m3", "Biiabaa01: m³ header was not detected");
    assert.equal(payload.overrides.dimensionUnit, "cm", "Biiabaa01: cm headers were not detected");
    await page.locator("[data-order-analyzer]").screenshot({ path: `${OUTPUT_DIR}/biiabaa01-mobile-390.png` });
  }

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
    fileMeta: document.querySelector(".order-analyzer__file-meta")?.textContent || ""
  }));
  assert.equal(staleState.payload, null, "damaged workbook retained old payload");
  assert.equal(staleState.qaResult, null, "damaged workbook retained old QA result");
  assert.equal(staleState.resultsHidden, true, "damaged workbook left old results visible");
  assert.equal(staleState.mappingHidden, true, "damaged workbook left old mapping visible");
  assert.equal(staleState.exportDisabled, true, "damaged workbook left export enabled");
  assert.match(staleState.fileMeta, /truncated-zip\.xlsx/, "damaged workbook file name not shown");

  payload = await uploadWorkbook(page, { name: "negative-values.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: negativeFixture });
  payload = await confirmUnits(page);
  assert(payload.result.warnings.includes("negative_values_skipped"), "negative values warning missing");
  assert.equal(payload.result.negativeValuesSkipped, 1, "negative row count");
  assert.equal(await page.locator("[data-order-export]").isDisabled(), true, "negative values did not block export");
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
