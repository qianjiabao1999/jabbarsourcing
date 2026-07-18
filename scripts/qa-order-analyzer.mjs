#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, mkdir, readFile } from "node:fs/promises";
import { basename } from "node:path";
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUTPUT_DIR = process.env.QA_ORDER_OUTPUT_DIR || "/tmp/jabbar-order-analyzer-qa";
const REAL_WORKBOOK = process.env.ORDER_WORKBOOK || "/Users/jabbar/Downloads/订单SHD-260713-0003明细.xlsx";
const SUMMARY_WORKBOOK = process.env.SUMMARY_ORDER_WORKBOOK || "/Users/jabbar/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_svlu2ime3h3l12_c4b7/msg/file/2026-07/Biiabaa01.xlsx";
const BARCODE_WORKBOOK = process.env.BARCODE_ORDER_WORKBOOK || "/Users/jabbar/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_svlu2ime3h3l12_c4b7/msg/file/2026-07/Ant 整件85件.xlsx";
const FIXTURE_NAME = "qa-order-analyzer-190-products.xlsx";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LOCALIZED_SUMMARY_PHRASES = [
  "订单总计（共1款）",
  "Grand Total",
  "Total general",
  "Total général",
  "Gesamtsumme",
  "Totale complessivo",
  "Genel toplam",
  "Общий итог",
  "المجموع الكلي",
  "Total geral"
];

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

async function createBarcodeFixtures(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const fixtures = await page.evaluate(() => {
    function workbookBase64(rows, sheetName) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
      return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
    }
    return {
      zh: workbookBase64([
        ["商品编号", "商品条码", "商品名称", "数量", "金额"],
        ["MUG-001", "6971234567890", "陶瓷杯", 2, 20]
      ], "中文条码"),
      en: workbookBase64([
        ["Product Barcode", "Product Name", "Quantity", "Amount USD"],
        ["012345678905", "Ceramic Mug", 3, 30]
      ], "English Barcode"),
      only: workbookBase64([
        ["条形码编码", "数量", "金额"],
        ["6901234567892", 4, 40]
      ], "仅条码")
    };
  });
  await context.close();
  return Object.fromEntries(Object.entries(fixtures).map(([key, value]) => [key, Buffer.from(value, "base64")]));
}

async function createAuditEdgeFixtures(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const fixtures = await page.evaluate((localizedSummaryPhrases) => {
    function workbookBase64(rows, sheetName) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
      return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
    }
    function formulaWorkbookBase64(rows, sheetName, formulas) {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      for (const [cell, formula] of Object.entries(formulas)) sheet[cell].f = formula;
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
    }
    return {
      foreignCurrency: workbookBase64([
        ["商品名称", "数量", "金额（美元）"],
        ["美元商品", 1, 12]
      ], "中文美元"),
      mixedUnits: workbookBase64([
        ["商品名称", "数量", "总重量", "重量单位", "总体积", "体积单位", "金额"],
        ["克与立方厘米", 1, 500, "g", 1000, "cm³", 1],
        ["千克与立方米", 1, 2, "kg", 1, "m³", 2]
      ], "混合单位"),
      annotatedSummary: workbookBase64([
        ["商品名称", "数量", "金额", "总重量（kg）", "总体积（m³）", "备注"],
        ["商品 A", 2, 20, 4, 0.2, ""],
        ["商品 B", 3, 30, 6, 0.3, ""],
        ["合计（共2款）", 5, 50, 10, 0.5, ""],
        ["订单汇总", 5, 50, 10, 0.5, ""],
        ["系统记录", 5, 50, 10, 0.5, "合计"]
      ], "带注释合计"),
      unlabeledFormulaSummary: formulaWorkbookBase64([
        ["图片", "货号", "商品", "重量", "体积", "单价", "小计", "数量", "单位"],
        ["", "SKU-001", "商品 A", 2, 0.2, 10, 20, 2, "件"],
        ["", "SKU-002", "商品 B", 3, 0.3, 10, 30, 3, "件"],
        ["", "", "", 5, 0.5, "", 50, 5, ""]
      ], "无标签公式合计", {
        D4: "SUM(D2:D3)",
        E4: "SUM(E2:E3)",
        G4: "SUM(G2:G3)",
        H4: "SUM(H2:H3)"
      }),
      singleItemTwoFieldFormulaSummary: formulaWorkbookBase64([
        ["商品名称", "数量", "金额"],
        ["单商品", 2, 20],
        ["", 2, 20]
      ], "单商品两列公式合计", {
        B3: "SUM(B2:B2)",
        C3: "SUM(C2:C2)"
      }),
      wrappedAggregateFormulaSummary: formulaWorkbookBase64([
        ["商品名称", "数量", "金额"],
        ["包装公式商品", 2, 20],
        ["", 2, 20]
      ], "外层包装公式合计", {
        B3: "ROUND(SUM(B2:B2),0)",
        C3: "IFERROR(SUM(C2:C2),0)"
      }),
      exactMatchContinuationWithoutFormula: workbookBase64([
        ["商品名称", "数量", "金额", "总重量（kg）"],
        ["正常商品", 2, 20, 4],
        ["", 2, 20, 4]
      ], "无公式三字段吻合续行"),
      repeatedUnlabeledSummary: workbookBase64([
        ["货号", "商品", "总重量（kg）", "总体积（m³）", "单价", "小计", "数量"],
        ["SKU-001", "商品 A", 2, 0.2, 10, 20, 2],
        ["SKU-002", "商品 B", 3, 0.3, 10, 30, 3],
        ["", "", 5, 0.5, "", 50, 5],
        ["", "", 5, 0.5, "", 50, 5]
      ], "重复无标签合计"),
      mismatchedUnlabeledRow: workbookBase64([
        ["货号", "商品", "总重量（kg）", "总体积（m³）", "单价", "小计", "数量"],
        ["SKU-001", "商品 A", 2, 0.2, 10, 20, 2],
        ["SKU-002", "商品 B", 3, 0.3, 10, 30, 3],
        ["", "", 999, 0.5, "", 50, 5]
      ], "不吻合的空名称行"),
      localizedSummaries: workbookBase64([
        ["商品名称", "数量", "金额", "总重量（kg）", "总体积（m³）"],
        ["基准商品", 5, 50, 10, 0.5],
        ...localizedSummaryPhrases.map((phrase) => [phrase, 5, 50, 10, 0.5])
      ], "多语种总计"),
      imageHeaders: workbookBase64([
        ["商品编号", "商品图片", "Product Image", "商品名称", "数量", "金额"],
        ["IMG-001", "photo-a.jpg", "photo-b.jpg", "真实商品名称", 1, 10]
      ], "图片列")
    };
  }, LOCALIZED_SUMMARY_PHRASES);
  await context.close();
  return Object.fromEntries(Object.entries(fixtures).map(([key, value]) => [key, Buffer.from(value, "base64")]));
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

async function createInflatedRangeFixture(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const base64 = await page.evaluate(() => {
    const rows = [
      ["商品名称", "数量", "金额", "总重量（kg）", "总体积（m³）"],
      ["有效商品", 2, 20, 4, 0.2]
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!ref"] = "A1:CW10002";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "膨胀已用区域");
    return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
  });
  await context.close();
  return Buffer.from(base64, "base64");
}

async function createMultiFileFixtures(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const fixtures = await page.evaluate(() => {
    function workbookBase64(rows, sheetName) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
      return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
    }
    const header = ["商品名称", "数量", "金额", "总重量（kg）", "总体积（m³）"];
    return [
      workbookBase64([
        header,
        ["多文件商品 A1", 2, 20, 4, 0.2],
        ["多文件商品 A2", 3, 30, 6, 0.3]
      ], "多文件 A"),
      workbookBase64([
        header,
        ["多文件商品 B1", 1, 10, 2, 0.1],
        ["多文件商品 B2", 2, 20, 4, 0.2]
      ], "多文件 B"),
      workbookBase64([
        header,
        ["多文件商品 C1", 1, 10, 1, 0.1],
        ["多文件商品 C2", 3, 30, 4, 0.3]
      ], "多文件 C")
    ];
  });
  await context.close();
  return fixtures.map((value, index) => ({
    name: `qa-multi-order-${index + 1}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(value, "base64")
  }));
}

async function createSummaryBatchFixtures(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const fixtures = await page.evaluate(() => {
    function writeWorkbook(rows, sheetName, formulas = {}) {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      for (const [cell, formula] of Object.entries(formulas)) sheet[cell].f = formula;
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
    }
    return [
      writeWorkbook([
        ["商品名称", "数量", "金额", "总重量（kg）", "总体积（m³）"],
        ["批量商品 A", 2, 20, 4, 0.2],
        ["", 2, 20, 4, 0.2]
      ], "无标签公式合计", {
        B3: "SUM(B2:B2)",
        C3: "SUM(C2:C2)",
        D3: "SUM(D2:D2)",
        E3: "SUM(E2:E2)"
      }),
      writeWorkbook([
        ["商品名称", "数量", "金额", "总重量（kg）", "总体积（m³）"],
        ["批量商品 B", 3, 30, 6, 0.3],
        ["合计", 3, 30, 6, 0.3]
      ], "有标签合计")
    ];
  });
  await context.close();
  return fixtures.map((value, index) => ({
    name: `qa-summary-batch-${index + 1}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(value, "base64")
  }));
}

async function createGenericPendingBatchFixtures(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  await page.addScriptTag({ url: `${BASE_URL}/assets/vendor/xlsx.full.min.js?v=0.20.3` });
  const fixtures = await page.evaluate(() => {
    function workbookBase64(rows, sheetName) {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
      return XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true });
    }
    const header = ["商品名称", "数量", "金额", "重量", "体积"];
    return [
      workbookBase64([header, ["待确认商品 A", 2, 20, 3, 0.2]], "通用表头 A"),
      workbookBase64([header, ["待确认商品 B", 3, 30, 4, 0.3]], "通用表头 B")
    ];
  });
  await context.close();
  return fixtures.map((value, index) => ({
    name: `qa-generic-pending-${index + 1}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(value, "base64")
  }));
}

async function waitForAnalyzer(page) {
  const excelTab = page.locator('[data-calculator-mode="excel"]');
  if (await excelTab.count()) {
    if (await excelTab.getAttribute("aria-selected") !== "true") await excelTab.click();
  }
  const mount = page.locator("[data-order-analyzer]");
  await mount.waitFor({ state: "attached" });
  await mount.scrollIntoViewIfNeeded();
  const loadButton = mount.locator("[data-order-load]");
  if (await loadButton.count()) await loadButton.click();
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

async function uploadWorkbooks(page, files) {
  const expectedNames = files.map((file) => typeof file === "string" ? basename(file) : file.name);
  await page.locator("[data-order-file]").setInputFiles(files);
  await page.waitForFunction(({ names, count }) => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    const root = document.querySelector("[data-order-analyzer]");
    const fileResults = qa.fileResults || qa.lastResults || qa.results || [];
    const combined = qa.combinedResult || qa.lastResult;
    const itemNames = [...document.querySelectorAll("[data-order-file-item]")].map((item) => item.textContent || "");
    return root?.getAttribute("aria-busy") !== "true"
      && combined?.result?.metrics
      && fileResults.length === count
      && itemNames.length === count
      && names.every((name) => itemNames.some((text) => text.includes(name)));
  }, { names: expectedNames, count: files.length });
  return page.evaluate(() => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    return {
      combined: qa.combinedResult || qa.lastResult,
      fileResults: qa.fileResults || qa.lastResults || qa.results || [],
      maxFiles: qa.maxFiles,
      itemNames: [...document.querySelectorAll("[data-order-file-item]")].map((item) => item.textContent || ""),
      fileListText: document.querySelector("[data-order-file-list]")?.textContent || ""
    };
  });
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
      const bitDepth = bytes.readUInt8(24);
      const colorType = bytes.readUInt8(25);
      assert(width >= 3840, `${label}: PNG width ${width} is below the 3840 px UHD lossless target`);
      assert(height >= 2160, `${label}: PNG height ${height} is below the 2160 px UHD target`);
      assert.equal(bitDepth, 8, `${label}: PNG bit depth`);
      assert([2, 6].includes(colorType), `${label}: PNG must use lossless true-colour pixels, got colour type ${colorType}`);
      assert(download.suggestedFilename().endsWith(".png"), `${label}: PNG filename`);
      await download.saveAs(`${OUTPUT_DIR}/${download.suggestedFilename()}`);
      return { name: download.suggestedFilename(), size: bytes.length, width, height, bitDepth, colorType };
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
  const barcodeFixtures = await createBarcodeFixtures(browser);
  const auditEdgeFixtures = await createAuditEdgeFixtures(browser);
  const negativeFixture = await createNegativeFixture(browser);
  const summaryFixture = await createSummaryFixture(browser);
  const continuationFixture = await createContinuationFixture(browser);
  const allQuantityOneFixture = await createAllQuantityOneFixture(browser);
  const rowLimitFixture = await createLimitFixture(browser, "rows");
  const columnLimitFixture = await createLimitFixture(browser, "columns");
  const inflatedRangeFixture = await createInflatedRangeFixture(browser);
  const multiFileFixtures = await createMultiFileFixtures(browser);
  const summaryBatchFixtures = await createSummaryBatchFixtures(browser);
  const genericPendingBatchFixtures = await createGenericPendingBatchFixtures(browser);
  assert(fixture.length > 1000, "runtime XLSX fixture is unexpectedly small");

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await blockAnalytics(context);
  const requests = [];
  context.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  const page = await context.newPage();
  const errors = collectErrors(page);
  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  assert(!requests.some((request) => request.url.includes("/assets/calculator-order-analyzer.js")), "order analyzer loaded before user intent");
  await waitForAnalyzer(page);
  await page.waitForTimeout(200);
  assert(!requests.some((request) => request.url.includes("/assets/vendor/xlsx.full.min.js")), "vendor XLSX loaded before file selection");
  assert.equal(await page.locator(".calculator-results .calculator-inquiry-cta").count(), 1, "manual calculator inquiry CTA count");
  assert.equal(await page.locator("[data-order-inquiry]").count(), 1, "Excel analyzer inquiry CTA count");
  assert.equal(await page.locator("[data-order-inquiry]").isVisible(), false, "Excel inquiry CTA visible before a result exists");

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

  fixtureExport = await captureExport(page, 1, "fixture export");

  assert.equal(await page.locator("[data-order-file]").getAttribute("multiple"), "", "multi-file input is not enabled");
  const multiUpload = await uploadWorkbooks(page, multiFileFixtures);
  assert.equal(multiUpload.maxFiles, 10, "multi-file upload limit");
  assert.equal(multiUpload.fileResults.length, 3, "multi-file result count");
  assert.equal(multiUpload.itemNames.length, 3, "multi-file collection item count");
  for (const fixtureFile of multiFileFixtures) {
    assert.match(multiUpload.fileListText, new RegExp(fixtureFile.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `multi-file list missing ${fixtureFile.name}`);
  }
  assertMetrics(multiUpload.combined, { productRows: 6, uniqueProducts: 6, quantity: 12, weight: 21, volume: 1.2, amount: 120, currency: "CNY" }, "three-file combined result", true);
  assert.equal(await page.locator("[data-order-export]").isEnabled(), true, "three-file combined export is disabled");
  await page.locator("[data-order-analyzer]").screenshot({ path: `${OUTPUT_DIR}/multi-file-collection-desktop-1280.png` });
  const multiExport = await captureExport(page, 1, "three-file combined export");
  assert.equal(multiExport.files.length, 1, "three-file combined export must download exactly one PNG");
  assert.equal(multiExport.files[0].width >= 3840, true, "three-file combined export is not UHD");

  const summaryBatch = await uploadWorkbooks(page, summaryBatchFixtures);
  assertMetrics(summaryBatch.combined, { productRows: 2, uniqueProducts: 2, quantity: 5, weight: 10, volume: 0.5, amount: 50, currency: "CNY" }, "summary-row batch combined result", true);
  assert.equal(summaryBatch.combined.result.skippedSummaryRows, 2, "summary-row batch: combined skipped total");
  assert.equal(summaryBatch.combined.result.warningCounts.summary_rows_skipped, 2, "summary-row batch: combined warning count");
  assert.deepEqual(summaryBatch.fileResults.map((result) => result.result.skippedSummaryRows), [1, 1], "summary-row batch: per-file skipped totals");

  const genericPendingBatch = await uploadWorkbooks(page, genericPendingBatchFixtures);
  assert.equal(genericPendingBatch.fileResults.length, 2, "generic-header batch result count");
  assert(genericPendingBatch.fileResults.every((result) => result.result.pending.weightMeaning && result.result.pending.volumeMeaning), "generic-header batch did not require per-file weight/volume meaning confirmation");
  let genericPendingUi = await page.evaluate(() => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    const root = document.querySelector("[data-order-analyzer]");
    const instance = root?.__jabbarOrderAnalyzer;
    return {
      mappingHidden: document.querySelector("[data-order-mapping]")?.hidden,
      mappingOpen: document.querySelector("[data-order-mapping]")?.open,
      mappingFileIndex: instance?.mappingFileIndex,
      exportDisabled: document.querySelector("[data-order-export]")?.disabled,
      fileNames: (qa.fileResults || []).map((result) => result.fileName),
      confirmed: (qa.fileResults || []).map((result) => result.overrides?.mappingConfirmed === true)
    };
  });
  assert.equal(genericPendingUi.mappingHidden, false, "generic-header batch did not expose the mapping confirmation entry");
  assert.equal(genericPendingUi.mappingOpen, true, "generic-header batch mapping confirmation was not opened");
  assert.equal(genericPendingUi.mappingFileIndex, 0, "generic-header batch did not target its first pending workbook");
  assert.equal(genericPendingUi.exportDisabled, true, "generic-header batch enabled export before confirmation");
  assert.deepEqual(genericPendingUi.fileNames, genericPendingBatchFixtures.map((file) => file.name), "generic-header batch file/result order changed before confirmation");
  assert.deepEqual(genericPendingUi.confirmed, [false, false], "generic-header batch was unexpectedly pre-confirmed");

  await page.locator("[data-order-apply]").click();
  await page.waitForFunction(() => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    const root = document.querySelector("[data-order-analyzer]");
    const instance = root?.__jabbarOrderAnalyzer;
    return root?.getAttribute("aria-busy") !== "true"
      && qa.fileResults?.[0]?.overrides?.mappingConfirmed === true
      && qa.fileResults?.[1]?.overrides?.mappingConfirmed !== true
      && instance?.mappingFileIndex === 1
      && document.querySelector("[data-order-mapping]")?.hidden === false
      && document.querySelector("[data-order-mapping]")?.open === true;
  });
  await page.locator("[data-order-apply]").click();
  await page.waitForFunction(() => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    const root = document.querySelector("[data-order-analyzer]");
    const combined = qa.combinedResult || qa.lastResult;
    return root?.getAttribute("aria-busy") !== "true"
      && qa.fileResults?.length === 2
      && qa.fileResults.every((result) => result.overrides?.mappingConfirmed === true)
      && combined?.overrides?.mappingConfirmed === true
      && !Object.values(combined?.result?.pending || {}).some(Boolean)
      && document.querySelector("[data-order-mapping]")?.hidden === true
      && document.querySelector("[data-order-export]")?.disabled === false;
  });
  genericPendingUi = await page.evaluate(() => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    const combined = qa.combinedResult || qa.lastResult;
    return {
      mappingHidden: document.querySelector("[data-order-mapping]")?.hidden,
      exportDisabled: document.querySelector("[data-order-export]")?.disabled,
      pending: combined?.result?.pending || {},
      fileNames: (qa.fileResults || []).map((result) => result.fileName),
      confirmed: (qa.fileResults || []).map((result) => result.overrides?.mappingConfirmed === true)
    };
  });
  assert.equal(genericPendingUi.mappingHidden, true, "generic-header batch mapping remained visible after both confirmations");
  assert.equal(genericPendingUi.exportDisabled, false, "generic-header batch export remained disabled after both confirmations");
  assert.equal(Object.values(genericPendingUi.pending).some(Boolean), false, "generic-header batch retained a pending flag after both confirmations");
  assert.deepEqual(genericPendingUi.fileNames, genericPendingBatchFixtures.map((file) => file.name), "generic-header batch confirmation mismatched workbook results");
  assert.deepEqual(genericPendingUi.confirmed, [true, true], "generic-header batch was not confirmed one workbook at a time");

  const raceFirst = { ...multiFileFixtures[0], name: "qa-race-first.xlsx" };
  const raceSecond = { ...multiFileFixtures[1], name: "qa-race-rejected.xlsx" };
  const raceStarted = await page.evaluate(async ({ first, second }) => {
    function fileFromBase64(descriptor) {
      const binary = atob(descriptor.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return new File([bytes], descriptor.name, { type: descriptor.mimeType });
    }
    const root = document.querySelector("[data-order-analyzer]");
    const instance = root.__jabbarOrderAnalyzer;
    const qa = window.__JABBAR_ORDER_ANALYZER_QA__;
    const firstFile = fileFromBase64(first);
    const secondFile = fileFromBase64(second);
    const originalParseOneFile = instance.parseOneFile;
    let releaseFirst;
    let delayed = false;
    instance.parseOneFile = async function (file) {
      if (!delayed && file.name === first.name) {
        delayed = true;
        await new Promise((resolve) => { releaseFirst = resolve; });
      }
      return originalParseOneFile.call(this, file);
    };
    const firstPromise = instance.parseFiles([firstFile]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    qa.__raceTest = { releaseFirst, firstPromise, originalParseOneFile };
    const directResult = await instance.parseFiles([secondFile]);
    const transfer = { files: [secondFile] };
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", { value: transfer });
    document.querySelector("[data-order-dropzone]").dispatchEvent(dropEvent);
    return {
      directResult,
      busy: instance.busy,
      currentFiles: instance.currentFiles.map((file) => file.name),
      entryFiles: instance.fileEntries.map((entry) => entry.file.name),
      fileMeta: document.querySelector(".order-analyzer__file-meta")?.textContent || "",
      dropPrevented: dropEvent.defaultPrevented,
      qaFileResults: (qa.fileResults || []).length
    };
  }, {
    first: { name: raceFirst.name, mimeType: raceFirst.mimeType, base64: raceFirst.buffer.toString("base64") },
    second: { name: raceSecond.name, mimeType: raceSecond.mimeType, base64: raceSecond.buffer.toString("base64") }
  });
  assert.equal(raceStarted.directResult, null, "busy analyzer accepted a second direct parse");
  assert.equal(raceStarted.busy, true, "race fixture did not hold the first parse busy");
  assert.deepEqual(raceStarted.currentFiles, [raceFirst.name], "busy second parse reset the first selection");
  assert.deepEqual(raceStarted.entryFiles, [raceFirst.name], "busy second drop replaced the first file entry");
  assert.match(raceStarted.fileMeta, new RegExp(raceFirst.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "busy second parse changed the first file metadata");
  assert.equal(raceStarted.dropPrevented, true, "busy second drop was not consumed by the dropzone");
  assert.equal(raceStarted.qaFileResults, 0, "race fixture unexpectedly completed before release");

  await page.evaluate(() => window.__JABBAR_ORDER_ANALYZER_QA__.__raceTest.releaseFirst());
  await page.waitForFunction((expectedName) => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA || {};
    const root = document.querySelector("[data-order-analyzer]");
    return root?.getAttribute("aria-busy") !== "true"
      && qa.lastResult?.fileName === expectedName
      && qa.fileResults?.length === 1;
  }, raceFirst.name);
  const raceFinished = await page.evaluate(async () => {
    const qa = window.__JABBAR_ORDER_ANALYZER_QA__;
    const root = document.querySelector("[data-order-analyzer]");
    const instance = root.__jabbarOrderAnalyzer;
    await qa.__raceTest.firstPromise;
    instance.parseOneFile = qa.__raceTest.originalParseOneFile;
    delete qa.__raceTest;
    return {
      busy: instance.busy,
      currentFiles: instance.currentFiles.map((file) => file.name),
      entryFiles: instance.fileEntries.map((entry) => entry.file.name),
      resultFile: qa.lastResult?.fileName,
      resultFiles: (qa.fileResults || []).map((result) => result.fileName),
      fileList: [...document.querySelectorAll("[data-order-file-item]")].map((item) => item.textContent || ""),
      rejectedPresent: document.body.textContent.includes("qa-race-rejected.xlsx")
    };
  });
  assert.equal(raceFinished.busy, false, "first parse remained busy after release");
  assert.deepEqual(raceFinished.currentFiles, [raceFirst.name], "rejected parse changed the completed selection");
  assert.deepEqual(raceFinished.entryFiles, [raceFirst.name], "rejected drop changed the completed file entry");
  assert.equal(raceFinished.resultFile, raceFirst.name, "rejected parse overwrote the first result");
  assert.deepEqual(raceFinished.resultFiles, [raceFirst.name], "rejected parse produced a mismatched result list");
  assert.equal(raceFinished.fileList.length, 1, "rejected drop created an extra collection item");
  assert.match(raceFinished.fileList[0], new RegExp(raceFirst.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "completed file collection no longer references the first parse");
  assert.equal(raceFinished.rejectedPresent, false, "rejected second file leaked into the rendered analyzer");

  const tenFiles = Array.from({ length: 10 }, (_, index) => ({
    ...multiFileFixtures[index % multiFileFixtures.length],
    name: `qa-ten-file-${String(index + 1).padStart(2, "0")}.xlsx`
  }));
  const tenUpload = await uploadWorkbooks(page, tenFiles);
  assert.equal(tenUpload.fileResults.length, 10, "ten-file selection was not fully accepted");
  assert.equal(tenUpload.itemNames.length, 10, "ten-file collection UI item count");

  const elevenFiles = [...tenFiles, { ...multiFileFixtures[0], name: "qa-eleventh-file.xlsx" }];
  await page.locator("[data-order-file]").setInputFiles(elevenFiles);
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-order-analyzer]");
    const status = document.querySelector("[data-order-status]");
    return root?.getAttribute("aria-busy") !== "true"
      && status?.classList.contains("is-error")
      && /10/.test(status.textContent || "");
  });
  const elevenState = await page.evaluate(() => ({
    status: document.querySelector("[data-order-status]")?.textContent || "",
    exportDisabled: document.querySelector("[data-order-export]")?.disabled,
    lastError: window.JABBAR_ORDER_ANALYZER_QA?.lastError || ""
  }));
  assert.match(elevenState.status, /10/, "eleventh-file error does not explain the ten-file limit");
  assert.equal(elevenState.exportDisabled, true, "eleventh-file rejection left export enabled");
  assert.match(elevenState.lastError, /too_many_files|10/i, "eleventh-file QA error code is missing");

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

  for (const barcodeCase of [
    { name: "qa-product-barcode-zh.xlsx", buffer: barcodeFixtures.zh, product: "陶瓷杯", sku: "MUG-001", productColumn: 2, currency: "CNY" },
    { name: "qa-product-barcode-en.xlsx", buffer: barcodeFixtures.en, product: "Ceramic Mug", sku: "012345678905", productColumn: 1, currency: "USD" },
    { name: "qa-barcode-only.xlsx", buffer: barcodeFixtures.only, product: "", sku: "6901234567892", productColumn: undefined, currency: "CNY" }
  ]) {
    payload = await uploadWorkbook(page, {
      name: barcodeCase.name,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: barcodeCase.buffer
    });
    assert.equal(payload.mapping.sku, 0, `${barcodeCase.name}: barcode column was not mapped to SKU`);
    assert.equal(payload.mapping.product, barcodeCase.productColumn, `${barcodeCase.name}: barcode column leaked into product mapping`);
    assert.equal(payload.result.items.length, 1, `${barcodeCase.name}: detail row count`);
    assert.equal(payload.result.items[0].sku, barcodeCase.sku, `${barcodeCase.name}: barcode value`);
    assert.equal(payload.result.items[0].product, barcodeCase.product, `${barcodeCase.name}: product name`);
    assert.equal(payload.result.metrics.amounts[0].currency, barcodeCase.currency, `${barcodeCase.name}: currency`);
  }

  payload = await uploadWorkbook(page, {
    name: "qa-chinese-usd-header.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.foreignCurrency
  });
  assert.equal(payload.result.metrics.amounts[0].currency, "USD", "中文美元表头被错误识别为 CNY");
  near(payload.result.metrics.amounts[0].value, 12, 1e-8, "中文美元金额");

  payload = await uploadWorkbook(page, {
    name: "qa-mixed-row-units.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.mixedUnits
  });
  near(payload.result.metrics.weight, 2.5, 1e-9, "混合 g/kg 总重量");
  near(payload.result.metrics.volume, 1.001, 1e-12, "混合 cm³/m³ 总体积");
  assert.deepEqual(payload.result.items.map((item) => item.weightUnit), ["g", "kg"], "逐行重量单位未保留");
  assert.deepEqual(payload.result.items.map((item) => item.volumeUnit), ["cm3", "m3"], "逐行体积单位未保留");

  payload = await uploadWorkbook(page, {
    name: "qa-annotated-summary-rows.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.annotatedSummary
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 2, quantity: 5, weight: 10, volume: 0.5, amount: 50 }, "annotated summary fixture", true);
  assert.equal(payload.result.skippedSummaryRows, 3, "annotated summary fixture: summary rows were not all skipped");

  payload = await uploadWorkbook(page, {
    name: "qa-unlabeled-formula-summary-row.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.unlabeledFormulaSummary
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 2, quantity: 5, weight: 5, volume: 0.5, amount: 50 }, "unlabeled formula summary fixture", true);
  assert.equal(payload.result.skippedSummaryRows, 1, "unlabeled formula summary fixture: summary row was not reconciled once");
  assert.equal(payload.result.items.some((item) => item.row === 4), false, "unlabeled formula summary fixture: summary row remained in details");
  assert.equal(payload.mapping.totalWeight, 3, "unlabeled formula summary fixture: weight was not inferred as line total");
  assert.equal(payload.mapping.totalVolume, 4, "unlabeled formula summary fixture: volume was not inferred as line total");
  assert.equal(payload.mapping.unitWeight, undefined, "unlabeled formula summary fixture: weight remained mapped as per-unit");
  assert.equal(payload.mapping.unitVolume, undefined, "unlabeled formula summary fixture: volume remained mapped as per-unit");

  payload = await uploadWorkbook(page, {
    name: "qa-single-item-two-field-formula-summary.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.singleItemTwoFieldFormulaSummary
  });
  assert.equal(payload.result.metrics.productRows, 1, "single-item two-field formula summary fixture: product rows");
  assert.equal(payload.result.metrics.uniqueProducts, 1, "single-item two-field formula summary fixture: unique products");
  near(payload.result.metrics.quantity, 2, 1e-8, "single-item two-field formula summary fixture: quantity");
  near(payload.result.metrics.amounts[0].value, 20, 1e-8, "single-item two-field formula summary fixture: amount");
  assert.equal(payload.result.skippedSummaryRows, 1, "single-item two-field formula summary fixture: summary was not skipped");
  assert.equal(payload.result.items.some((item) => item.row === 3), false, "single-item two-field formula summary fixture: total remained in details");

  payload = await uploadWorkbook(page, {
    name: "qa-wrapped-aggregate-formula-summary.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.wrappedAggregateFormulaSummary
  });
  assert.equal(payload.result.metrics.productRows, 1, "wrapped aggregate formula summary fixture: product rows");
  near(payload.result.metrics.quantity, 2, 1e-8, "wrapped aggregate formula summary fixture: quantity");
  near(payload.result.metrics.amounts[0].value, 20, 1e-8, "wrapped aggregate formula summary fixture: amount");
  assert.equal(payload.result.skippedSummaryRows, 1, "wrapped aggregate formula summary fixture: summary was not skipped");

  payload = await uploadWorkbook(page, {
    name: "qa-exact-match-continuation-without-formula.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.exactMatchContinuationWithoutFormula
  });
  assert.equal(payload.result.metrics.productRows, 2, "exact-match continuation without formula fixture: product rows");
  assert.equal(payload.result.metrics.uniqueProducts, 1, "exact-match continuation without formula fixture: unique products");
  near(payload.result.metrics.quantity, 4, 1e-8, "exact-match continuation without formula fixture: quantity");
  near(payload.result.metrics.weight, 8, 1e-8, "exact-match continuation without formula fixture: weight");
  near(payload.result.metrics.amounts[0].value, 40, 1e-8, "exact-match continuation without formula fixture: amount");
  assert.equal(payload.result.skippedSummaryRows, 0, "exact-match continuation without formula fixture: normal row was skipped");
  assert(payload.result.items.some((item) => item.row === 3), "exact-match continuation without formula fixture: continuation disappeared");

  payload = await uploadWorkbook(page, {
    name: "qa-repeated-unlabeled-summary-rows.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.repeatedUnlabeledSummary
  });
  assertMetrics(payload, { productRows: 2, uniqueProducts: 2, quantity: 5, weight: 5, volume: 0.5, amount: 50 }, "repeated unlabeled summary fixture", true);
  assert.equal(payload.result.skippedSummaryRows, 2, "repeated unlabeled summary fixture: repeated totals were not each excluded exactly once");
  assert.equal(payload.result.items.some((item) => item.row === 4 || item.row === 5), false, "repeated unlabeled summary fixture: a repeated summary remained in details");

  payload = await uploadWorkbook(page, {
    name: "qa-mismatched-unlabeled-row.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.mismatchedUnlabeledRow
  });
  assertMetrics(payload, { productRows: 3, uniqueProducts: 2, quantity: 10, weight: 1004, volume: 1, amount: 100 }, "mismatched unlabeled row fixture", true);
  assert.equal(payload.result.skippedSummaryRows, 0, "mismatched unlabeled row fixture: non-total row was excluded");
  assert(payload.result.items.some((item) => item.row === 4), "mismatched unlabeled row fixture: non-total row disappeared");

  payload = await uploadWorkbook(page, {
    name: "qa-localized-summary-rows.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.localizedSummaries
  });
  assertMetrics(payload, { productRows: 1, uniqueProducts: 1, quantity: 5, weight: 10, volume: 0.5, amount: 50 }, "localized summary fixture", true);
  assert.equal(payload.result.skippedSummaryRows, LOCALIZED_SUMMARY_PHRASES.length, "localized summary fixture: skipped summary row count");
  for (const phrase of LOCALIZED_SUMMARY_PHRASES) {
    assert.equal(payload.result.items.some((item) => item.product === phrase), false, `localized summary fixture: ${phrase} remained as a product`);
  }

  payload = await uploadWorkbook(page, {
    name: "qa-product-image-columns.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: auditEdgeFixtures.imageHeaders
  });
  assert.equal(payload.mapping.product, 3, "product image column stole product-name mapping");
  assert.equal(payload.result.items[0].product, "真实商品名称", "image filename leaked into product name");
  assert.equal(payload.headers.some((header) => /商品图片|Product Image/i.test(header.label)), false, "image-only headers were not filtered");

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

  payload = await uploadWorkbook(page, {
    name: "qa-inflated-used-range.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: inflatedRangeFixture
  });
  assertMetrics(payload, { productRows: 1, uniqueProducts: 1, quantity: 2, weight: 4, volume: 0.2, amount: 20 }, "inflated used-range fixture", true);
  assert.equal(payload.result.warnings.includes("rows_truncated"), false, "inflated used-range fixture: false row-limit warning");
  assert.equal(payload.result.warnings.includes("columns_truncated"), false, "inflated used-range fixture: false column-limit warning");
  assert.equal(await page.locator("[data-order-export]").isEnabled(), true, "inflated used-range fixture: export was falsely blocked");

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

  let hasBarcodeWorkbook = true;
  try { await access(BARCODE_WORKBOOK); } catch { hasBarcodeWorkbook = false; }
  if (hasBarcodeWorkbook) {
    payload = await uploadWorkbook(page, BARCODE_WORKBOOK);
    assert.equal(payload.mapping.sku, 0, "Ant workbook: 商品编号 was not retained as SKU");
    assert.equal(payload.mapping.product, 8, "Ant workbook: 商品名称 column was not selected");
    assert.equal(payload.mapping.qty, 12, "Ant workbook: 辅助数量 stole the real 数量 column");
    assert.equal(payload.result.items[0].sku, "59984", "Ant workbook: first SKU");
    assert.equal(payload.result.items[0].product, "812-12个衣夹", "Ant workbook: barcode leaked into first product name");
    assert.equal(payload.result.items[0].quantity, 192, "Ant workbook: first quantity came from 辅助数量");
    assert.equal(payload.result.metrics.quantity, 13071, "Ant workbook: total quantity");
    assert(payload.result.items.every((item) => !/^\d{6,}$/.test(item.product)), "Ant workbook: a barcode remained in product names");
  }

  let hasRealWorkbook = true;
  try { await access(REAL_WORKBOOK); } catch { hasRealWorkbook = false; }
  if (hasRealWorkbook) {
    await page.setViewportSize({ width: 1280, height: 900 });
    payload = await uploadWorkbook(page, REAL_WORKBOOK);
    payload = await confirmUnits(page);
    assertMetrics(payload, { productRows: 325, uniqueProducts: 325, quantity: 9349, weight: 790.1845, volume: 3.1232867436, amount: 14070.73 }, "real workbook", true);
    realExport = await captureExport(page, null, "real workbook export");
    assert.equal(realExport.pageCount, 1, `real workbook: expected one lossless PNG, got ${realExport.pageCount}`);
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

  const bridgePage = await context.newPage();
  const bridgeErrors = collectErrors(bridgePage);
  await bridgePage.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  await waitForAnalyzer(bridgePage);
  await uploadWorkbook(bridgePage, { name: FIXTURE_NAME, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fixture });
  const bridgeLink = bridgePage.locator("[data-order-inquiry]");
  assert.equal(await bridgeLink.isVisible(), true, "Excel inquiry CTA is not visible with a valid result");
  assert.equal(await bridgeLink.getAttribute("href"), "/inquiry/", "Chinese Excel inquiry CTA path");
  assert.equal((await bridgeLink.textContent())?.trim(), "携带此结果获取报价", "Chinese Excel inquiry CTA label");
  await Promise.all([
    bridgePage.waitForURL(/\/inquiry\/$/),
    bridgeLink.click()
  ]);
  const inquiryBridgeState = await bridgePage.evaluate(() => {
    const form = document.querySelector(".js-inquiry-form");
    const isVisible = (field) => Boolean(field && field.getClientRects().length);
    return {
      product: form?.elements.product?.value || "",
      quantity: form?.elements.quantity?.value || "",
      note: form?.elements.note?.value || "",
      productVisible: isVisible(form?.elements.product),
      quantityVisible: isVisible(form?.elements.quantity),
      noteVisible: isVisible(form?.elements.note),
      detailsCount: form?.querySelectorAll("details").length ?? -1,
      stored: sessionStorage.getItem("jabbarCalcResult")
    };
  });
  assert.equal(inquiryBridgeState.product, "QA Product 1 / QA Product 2 / QA Product 3 +2", "Excel inquiry product handoff");
  assert.equal(inquiryBridgeState.quantity, "380", "Excel inquiry quantity handoff");
  assert.match(inquiryBridgeState.note, /订单自动统计结果/, "Excel inquiry result title handoff");
  assert.match(inquiryBridgeState.note, /总体积: 9\.5 m³/, "Excel inquiry volume handoff");
  assert.match(inquiryBridgeState.note, /qa-order-analyzer-190-products\.xlsx/, "Excel inquiry source file handoff");
  assert.equal(inquiryBridgeState.productVisible, true, "Excel inquiry prefilled product field is not visible");
  assert.equal(inquiryBridgeState.quantityVisible, true, "Excel inquiry prefilled quantity field is not visible");
  assert.equal(inquiryBridgeState.noteVisible, true, "Excel inquiry prefilled note field is not visible");
  assert.equal(inquiryBridgeState.detailsCount, 0, "Excel inquiry form still contains collapsible details");
  assert.equal(inquiryBridgeState.stored, null, "Excel inquiry handoff was not consumed");
  assert.deepEqual(bridgeErrors, [], `Excel inquiry bridge console errors: ${bridgeErrors.join(" | ")}`);
  await bridgePage.close();
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
  assert.equal((await rtlPage.locator("[data-order-inquiry]").textContent())?.trim(), "اطلب عرض سعر بهذه النتيجة", "Arabic Excel inquiry CTA label");
  assert.equal(await rtlPage.locator("[data-order-inquiry]").getAttribute("href"), "/ar/inquiry/", "Arabic Excel inquiry CTA path");
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
    fixture: { rows: 190, pngFiles: fixtureExport.pageCount },
    multiFile: { files: 3, combinedRows: 6, combinedQuantity: 12, pngFiles: 1, minPngWidth: 3840 },
    genericBatchConfirmation: { files: 2, confirmedSequentially: true, exportEnabled: true, pending: false },
    busyRaceProtection: { rejectedDirectParse: true, rejectedDrop: true, firstBatchPreserved: true },
    realWorkbook: realExport ? { path: REAL_WORKBOOK, pngPages: realExport.pageCount } : { skipped: true, reason: "file not found" },
    screenshots: OUTPUT_DIR
  }, null, 2));
} finally {
  await browser.close();
}

function documentDirection(htmlDir, rootDirection) {
  return htmlDir || rootDirection;
}
