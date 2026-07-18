#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUTPUT_DIR = process.env.QA_CONTAINER_OUTPUT_DIR || "/tmp/jabbar-container-allocation-qa";

await mkdir(OUTPUT_DIR, { recursive: true });

function near(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual), `${label}: expected a finite number, got ${actual}`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected} (±${tolerance})`);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    window.localStorage.setItem("jabbar.analyticsConsent.v1", "denied");
  });
  for (const pattern of [
    "**://www.googletagmanager.com/**",
    "**://www.google-analytics.com/**",
    "**://*.google-analytics.com/**",
    "**://www.clarity.ms/**",
    "**://*.clarity.ms/**"
  ]) await context.route(pattern, (route) => route.fulfill({ status: 204, body: "" }));

  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });

  for (const testCase of [
    { name: "quick-empty", volume: 0, count: 1, loads: [0] },
    { name: "quick-one-full", volume: 68, count: 1, loads: [100] },
    { name: "quick-full-plus-remainder", volume: 90, count: 2, loads: [100, 22 / 68 * 100] },
    { name: "quick-two-full", volume: 136, count: 2, loads: [100, 100] }
  ]) {
    const state = await page.evaluate(({ volume }) => {
      window.renderCbmVisual(volume);
      const visual = document.querySelector(".cbm-visual");
      return {
        count: Number(visual?.getAttribute("data-container-count")),
        loads: Array.from(visual?.querySelectorAll("[data-container-load]") || [], (node) => Number(node.getAttribute("data-container-load"))),
        indexes: Array.from(visual?.querySelectorAll("[data-container-index]") || [], (node) => Number(node.getAttribute("data-container-index"))),
        labels: Array.from(visual?.querySelectorAll("title") || [], (node) => node.textContent || "")
      };
    }, testCase);
    assert.equal(state.count, testCase.count, `${testCase.name}: quick container count`);
    assert.equal(state.loads.length, testCase.loads.length, `${testCase.name}: quick rendered allocation length`);
    assert.deepEqual(state.indexes, testCase.loads.map((_, index) => index), `${testCase.name}: quick rendered allocation order`);
    testCase.loads.forEach((expected, index) => {
      near(state.loads[index], expected, 1e-8, `${testCase.name}: quick rendered load ${index + 1}`);
      assert(state.labels[index].includes(`${Math.round(expected)}%`), `${testCase.name}: quick accessible label misses ${Math.round(expected)}%`);
    });
  }

  await page.evaluate(() => {
    window.renderCbmVisual(90);
    const visual = document.querySelector(".cbm-visual");
    visual.hidden = false;
    visual.style.display = "grid";
  });
  await page.locator(".cbm-visual").screenshot({ path: `${OUTPUT_DIR}/quick-container-allocation-90-cbm.png` });

  const excelTab = page.locator('[data-calculator-mode="excel"]');
  if (await excelTab.count() && await excelTab.getAttribute("aria-selected") !== "true") await excelTab.click();
  const mount = page.locator("[data-order-analyzer]");
  await mount.scrollIntoViewIfNeeded();
  const loadButton = page.locator("[data-order-load]");
  if (await loadButton.count()) await loadButton.click();
  await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);

  const cases = [
    { name: "negative", volume: -1, count: 1, loads: [0] },
    { name: "zero", volume: 0, count: 1, loads: [0] },
    { name: "below-boundary-noise", volume: 67.99999995, count: 1, loads: [100] },
    { name: "one-full", volume: 68, count: 1, loads: [100] },
    { name: "above-boundary-noise", volume: 68.00000005, count: 1, loads: [100] },
    { name: "110-percent", volume: 74.8, count: 2, loads: [100, 10] },
    { name: "150-percent", volume: 102, count: 2, loads: [100, 50] },
    { name: "200-percent", volume: 136, count: 2, loads: [100, 100] },
    { name: "three-container-remainder", volume: 170, count: 3, loads: [100, 100, 50] }
  ];

  for (const testCase of cases) {
    const state = await page.evaluate(({ volume }) => {
      const root = document.querySelector("[data-order-analyzer]");
      const instance = root?.__jabbarOrderAnalyzer;
      const estimate = instance.containerEstimate(volume, false);
      instance.renderContainer(estimate);
      const visual = root.querySelector(".order-analyzer__container");
      return {
        count: estimate.count,
        loads: estimate.loads,
        indexes: estimate.loadIndexes,
        domLoads: Array.from(visual.querySelectorAll("[data-container-load]"), (node) => Number(node.getAttribute("data-container-load"))),
        domIndexes: Array.from(visual.querySelectorAll("[data-container-index]"), (node) => Number(node.getAttribute("data-container-index"))),
        ariaLabel: visual.querySelector("svg")?.getAttribute("aria-label") || ""
      };
    }, testCase);
    assert.equal(state.count, testCase.count, `${testCase.name}: container count`);
    assert.equal(state.loads.length, testCase.loads.length, `${testCase.name}: allocation length`);
    assert.equal(state.domLoads.length, testCase.loads.length, `${testCase.name}: rendered bar count`);
    assert.deepEqual(state.indexes, testCase.loads.map((_, index) => index), `${testCase.name}: allocation order`);
    assert.deepEqual(state.domIndexes, state.indexes, `${testCase.name}: rendered allocation order`);
    testCase.loads.forEach((expected, index) => {
      near(state.loads[index], expected, 1e-8, `${testCase.name}: calculated load ${index + 1}`);
      near(state.domLoads[index], expected, 1e-8, `${testCase.name}: rendered load ${index + 1}`);
      assert(state.ariaLabel.includes(`${Math.round(expected)}%`), `${testCase.name}: accessible label misses ${Math.round(expected)}%`);
    });
  }

  const invalidState = await page.evaluate(() => {
    const instance = document.querySelector("[data-order-analyzer]")?.__jabbarOrderAnalyzer;
    return [Number.POSITIVE_INFINITY, Number.NaN].map((volume) => instance.containerEstimate(volume, false).loads);
  });
  assert.deepEqual(invalidState, [[0], [0]], "non-finite volumes must fall back to an empty allocation");

  await page.evaluate(() => {
    const root = document.querySelector("[data-order-analyzer]");
    const instance = root?.__jabbarOrderAnalyzer;
    instance.renderContainer(instance.containerEstimate(74.8, false));
    instance.results.hidden = false;
  });
  await page.locator(".order-analyzer__container").screenshot({ path: `${OUTPUT_DIR}/container-allocation-110-percent.png` });
  assert.equal(errors.length, 0, `browser console errors: ${errors.join(" | ")}`);
  await context.close();
} finally {
  await browser.close();
}

console.log(`Container allocation QA passed: full containers are filled first across ${BASE_URL}.`);
