#!/usr/bin/env node
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "assets/calculator-order-analyzer.js"), "utf8");
assert(!source.includes("Analyzer.prototype.createReportPages"), "dead paginated report builder returned");
assert(!source.includes("Analyzer.prototype.drawReportPage"), "dead paginated report painter returned");
assert(source.includes("var MAIN_THREAD_FALLBACK_MAX_BYTES = 8 * 1024 * 1024"), "safe fallback limit changed");
assert(source.includes('fallback.dir = "ltr"'), "container fallback must isolate itself from page RTL");

const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = path.join(root, pathname.replace(/^\/+/, ""));
    if (!(await stat(target)).isFile()) target = path.join(target, "index.html");
    response.writeHead(200, { "content-type": contentTypes[path.extname(target)] || "application/octet-stream" });
    createReadStream(target).pipe(response);
  } catch (_) {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://127.0.0.1:${address.port}/en/calculator/`);
  await page.locator('[data-calculator-mode="excel"]').click();
  const mount = page.locator("[data-order-analyzer]");
  await mount.scrollIntoViewIfNeeded();
  await mount.locator("[data-order-load]").click();
  await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);

  const result = await page.evaluate(async () => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA;
    const instance = qa.instances[0];
    function payload(fileName, sku, quantity) {
      return {
        version: qa.version, fileName, sheetName: "Sheet1", sheetNames: ["Sheet1"], headerRow: 1,
        headers: [], mapping: {}, overrides: { weightUnit: "kg", volumeUnit: "m3", dimensionUnit: "cm", currency: "CNY", mappingConfirmed: true },
        result: {
          metrics: { productRows: 1, uniqueProducts: 1, quantity, cartons: 1, volume: 1, weight: 1, amounts: [{ currency: "CNY", value: 10 }, { currency: "USD", value: 2 }] },
          pending: {}, assumptions: {}, warnings: [], warningCounts: {}, skippedSummaryRows: 0, negativeValuesSkipped: 0, subtotalMismatchCount: 0,
          items: [{ row: 2, product: "Test product", sku, quantity, cartons: 1, volume: 1, volumeUnit: "m3", weight: 1, weightUnit: "kg", unitPrice: 5, amount: 10, currency: "CNY" }]
        }
      };
    }
    instance.parseOneFile = async function (file) {
      if (file.name === "bad.xlsx") throw new Error("worker_timeout");
      return file.name === "first.xlsx" ? payload(file.name, "Café-001", 2) : payload(file.name, " cafe 001 ", 3);
    };
    const files = ["first.xlsx", "bad.xlsx", "second.xlsx"].map((name) => new File(["x"], name));
    const combined = await instance.parseFiles(files, "qa");
    return {
      resultCount: qa.fileResults.length,
      failureCodes: qa.fileFailures.map((failure) => failure.code),
      entryCount: instance.fileEntries.length,
      failedEntry: instance.fileEntries[1].errorMessage,
      quantity: combined.result.metrics.quantity,
      uniqueProducts: combined.result.metrics.uniqueProducts,
      status: instance.status.textContent,
      bdiCount: instance.root.querySelectorAll("bdi[dir='ltr']").length,
      pageDirection: getComputedStyle(document.documentElement).direction,
      cardDirection: getComputedStyle(instance.root.querySelector(".order-analyzer__container .container-load-card")).direction,
      sceneDirection: instance.root.querySelector(".order-analyzer__container .container-load-card__scene")?.getAttribute("dir"),
      exportLabel: instance.exportButton.textContent,
      fallbackMax: qa.mainThreadFallbackMaxBytes
    };
  });

  assert.equal(result.resultCount, 2, "one bad file discarded successful batch results");
  assert.deepEqual(result.failureCodes, ["worker_timeout"], "failed file did not retain its classified reason");
  assert.equal(result.entryCount, 3, "failed file disappeared from the review list");
  assert.match(result.failedEntry, /timed out/i, "timeout was mislabeled as a damaged workbook");
  assert.equal(result.quantity, 5, "successful file totals were not preserved");
  assert.equal(result.uniqueProducts, 1, "cross-file product normalization differs from worker semantics");
  assert.match(result.status, /2 of 3 files/, "partial-success status is missing");
  assert(result.bdiCount >= 3, "visible currency values are not direction-isolated");
  assert.equal(result.cardDirection, result.pageDirection, "container labels no longer inherit the page reading direction");
  assert.equal(result.sceneDirection, "ltr", "RTL inheritance can still corrupt the physical container scene");
  assert.match(result.exportLabel, /4K PNG overview/i, "export still promises a complete paginated result");
  assert.equal(result.fallbackMax, 8 * 1024 * 1024, "main-thread fallback limit is not exposed to QA");

  const fallbackPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await fallbackPage.addInitScript(() => {
    Object.defineProperty(window, "Worker", { configurable: true, writable: true, value: undefined });
  });
  await fallbackPage.goto(`http://127.0.0.1:${address.port}/en/calculator/`);
  await fallbackPage.locator('[data-calculator-mode="excel"]').click();
  const fallbackMount = fallbackPage.locator("[data-order-analyzer]");
  await fallbackMount.scrollIntoViewIfNeeded();
  await fallbackMount.locator("[data-order-load]").click();
  await fallbackPage.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);

  const fallbackResult = await fallbackPage.evaluate(async () => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA;
    const instance = qa.instances[0];
    const csv = [
      "Product,SKU,Quantity,Cartons,Volume,Weight,Unit Price,Currency",
      "Fallback widget,FB-001,2,1,0.024,5,10,CNY"
    ].join("\n");
    const parsed = await instance.parseFiles([new File([csv], "fallback-fixture.csv", { type: "text/csv" })], "qa-fallback");
    const parsedState = {
      workerType: typeof Worker,
      fallbackUsed: qa.fallbackUsed,
      quantity: parsed?.result?.metrics?.quantity,
      productRows: parsed?.result?.metrics?.productRows
    };

    const reportFiles = await instance.prepareExport();
    const report = reportFiles[0];
    const signature = Array.from(new Uint8Array(await report.slice(0, 8).arrayBuffer()));
    const bitmap = await createImageBitmap(report);
    const sample = document.createElement("canvas");
    sample.width = 384;
    sample.height = 216;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let opaquePixels = 0;
    let darkPixels = 0;
    const quantizedColors = new Set();
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3];
      if (alpha > 240) opaquePixels += 1;
      if (alpha > 240 && red < 120 && green < 145 && blue < 175) darkPixels += 1;
      if (alpha > 240) quantizedColors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
    }
    const pngState = {
      signature,
      width: bitmap.width,
      height: bitmap.height,
      opaquePixels,
      darkPixels,
      quantizedColors: quantizedColors.size
    };
    bitmap.close();

    const fallbackLimit = qa.mainThreadFallbackMaxBytes;
    await instance.parseFiles([
      new File([new Uint8Array(fallbackLimit + 1)], "fallback-too-large.csv", { type: "text/csv" })
    ], "qa-fallback-limit");
    const fallbackLimitState = {
      codes: qa.fileFailures.map((failure) => failure.code),
      status: instance.status.textContent,
      result: qa.lastResult
    };

    const uploadLimit = qa.maxFileBytes;
    await instance.parseFiles([
      new File([new Uint8Array(uploadLimit + 1)], "upload-too-large.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    ], "qa-upload-limit");
    const uploadLimitState = {
      codes: qa.fileFailures.map((failure) => failure.code),
      status: instance.status.textContent,
      result: qa.lastResult
    };

    return { parsed: parsedState, png: pngState, fallbackLimit: fallbackLimitState, uploadLimit: uploadLimitState };
  });

  assert.equal(fallbackResult.parsed.workerType, "undefined", "fallback fixture accidentally used a Worker");
  assert.equal(fallbackResult.parsed.fallbackUsed, true, "Worker=undefined did not use the main-thread parser");
  assert.equal(fallbackResult.parsed.quantity, 2, "main-thread fallback changed the fixture quantity");
  assert.equal(fallbackResult.parsed.productRows, 1, "main-thread fallback did not retain the fixture row");
  assert.deepEqual(fallbackResult.png.signature, [137, 80, 78, 71, 13, 10, 26, 10], "4K export is not a PNG");
  assert.equal(fallbackResult.png.width, 3840, "4K export width changed");
  assert.equal(fallbackResult.png.height, 2160, "4K export height changed");
  assert(fallbackResult.png.opaquePixels > 70_000, "PNG sample is unexpectedly transparent");
  assert(fallbackResult.png.darkPixels > 100, "PNG contains no visible text or data marks");
  assert(fallbackResult.png.quantizedColors > 20, "PNG content is visually blank or single-color");
  assert.deepEqual(fallbackResult.fallbackLimit.codes, ["fallback_file_too_large"], "8 MB fallback limit was not enforced on a real File");
  assert.match(fallbackResult.fallbackLimit.status, /safe 8 MB browser fallback limit/i, "8 MB fallback limit lacks a specific prompt");
  assert.equal(fallbackResult.fallbackLimit.result, null, "oversized fallback file retained an old result");
  assert.deepEqual(fallbackResult.uploadLimit.codes, ["file_too_large"], "50 MB upload limit was not enforced on a real File");
  assert.match(fallbackResult.uploadLimit.status, /50 MB/i, "50 MB upload limit lacks its localized prompt");
  assert.equal(fallbackResult.uploadLimit.result, null, "oversized upload retained an old result");

  const recoveryPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await recoveryPage.goto(`http://127.0.0.1:${address.port}/en/calculator/`);
  await recoveryPage.locator('[data-calculator-mode="excel"]').click();
  const recoveryMount = recoveryPage.locator("[data-order-analyzer]");
  await recoveryMount.scrollIntoViewIfNeeded();
  await recoveryMount.locator("[data-order-load]").click();
  await recoveryPage.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);
  const workerRecovery = await recoveryPage.evaluate(async () => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA;
    const instance = qa.instances[0];
    instance.preferFallback = true;
    qa.workerUsed = false;
    qa.fallbackUsed = false;
    const csv = ["Product,Quantity,Amount CNY", "Recovered worker,2,20"].join("\n");
    const parsed = await instance.parseFiles([new File([csv], "worker-recovered.csv", { type: "text/csv" })], "qa-worker-recovery");
    return {
      quantity: parsed?.result?.metrics?.quantity,
      workerUsed: qa.workerUsed,
      fallbackUsed: qa.fallbackUsed,
      preferFallback: instance.preferFallback
    };
  });
  assert.equal(workerRecovery.quantity, 2, "new upload failed after a transient Worker failure");
  assert.equal(workerRecovery.workerUsed, true, "new upload did not retry the recovered Worker");
  assert.equal(workerRecovery.fallbackUsed, false, "new upload remained pinned to main-thread fallback");
  assert.equal(workerRecovery.preferFallback, false, "one-shot Worker fallback state survived resetAnalysis");

  let coreAttempts = 0;
  const scriptRetryPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await scriptRetryPage.addInitScript(() => {
    Object.defineProperty(window, "Worker", { configurable: true, writable: true, value: undefined });
  });
  await scriptRetryPage.route("**/assets/calculator-order-worker.js*", async (route) => {
    coreAttempts += 1;
    if (coreAttempts === 1) await route.abort("failed");
    else await route.continue();
  });
  await scriptRetryPage.goto(`http://127.0.0.1:${address.port}/en/calculator/`);
  await scriptRetryPage.locator('[data-calculator-mode="excel"]').click();
  const retryMount = scriptRetryPage.locator("[data-order-analyzer]");
  await retryMount.scrollIntoViewIfNeeded();
  await retryMount.locator("[data-order-load]").click();
  await scriptRetryPage.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);
  const scriptRetry = await scriptRetryPage.evaluate(async () => {
    const qa = window.JABBAR_ORDER_ANALYZER_QA;
    const instance = qa.instances[0];
    const csv = ["Product,Quantity,Amount CNY", "Retry reader,3,30"].join("\n");
    const file = () => new File([csv], "reader-retry.csv", { type: "text/csv" });
    const first = await instance.parseFiles([file()], "qa-reader-failure");
    const firstCodes = qa.fileFailures.map((failure) => failure.code);
    const second = await instance.parseFiles([file()], "qa-reader-retry");
    return {
      firstWasNull: first === null,
      firstCodes,
      secondQuantity: second?.result?.metrics?.quantity,
      secondFailures: qa.fileFailures.length,
      fallbackUsed: qa.fallbackUsed
    };
  });
  assert.equal(scriptRetry.firstWasNull, true, "failed reader load unexpectedly produced a result");
  assert(scriptRetry.firstCodes.length === 1, "failed reader load was not retained as a file failure");
  assert.equal(coreAttempts, 2, "rejected reader script promise prevented a real retry");
  assert.equal(scriptRetry.secondQuantity, 3, "reader script retry did not recover parsing");
  assert.equal(scriptRetry.secondFailures, 0, "successful reader retry retained the old failure");
  assert.equal(scriptRetry.fallbackUsed, true, "reader retry did not use the recovered local fallback");

  async function verifyPreloadDropReplay({ delayed }) {
    const dropPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    let releaseAnalyzer;
    const analyzerGate = new Promise((resolve) => { releaseAnalyzer = resolve; });

    await dropPage.addInitScript(() => {
      let analyzerApi;
      window.__qaDropParseCalls = [];
      Object.defineProperty(window, "JabbarOrderAnalyzer", {
        configurable: true,
        get() { return analyzerApi; },
        set(api) {
          if (!api || typeof api.init !== "function") {
            analyzerApi = api;
            return;
          }
          const originalInit = api.init;
          api.init = function () {
            originalInit.apply(this, arguments);
            const root = document.querySelector("[data-order-analyzer]");
            const instance = root && root.__jabbarOrderAnalyzer;
            if (!instance || instance.__qaDropWrapped) return;
            const originalParseFiles = instance.parseFiles.bind(instance);
            instance.__qaDropWrapped = true;
            instance.parseFiles = function (files, method) {
              window.__qaDropParseCalls.push({
                method,
                names: Array.from(files || [], (file) => file && file.name)
              });
              return originalParseFiles(files, method);
            };
          };
          analyzerApi = api;
        }
      });
    });

    await dropPage.route("**/assets/calculator-order-analyzer.js*", async (route) => {
      if (delayed) await analyzerGate;
      await route.continue();
    });

    try {
      await dropPage.goto(`http://127.0.0.1:${address.port}/en/calculator/`);
      await dropPage.locator('[data-calculator-mode="excel"]').click();
      await dropPage.waitForFunction(() => document.querySelector("[data-order-analyzer]")?.getAttribute("data-order-loader-bound") === "true");
      const originalUrl = dropPage.url();
      const dispatchState = await dropPage.evaluate(() => {
        const root = document.querySelector("[data-order-analyzer]");
        const data = ["Product,Quantity,Amount CNY", "Preload drop,2,20"].join("\n");
        const transfer = new DataTransfer();
        transfer.items.add(new File([data], "preload-drop.csv", { type: "text/csv" }));
        const dragover = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer });
        const drop = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer });
        const dragoverDispatch = root.dispatchEvent(dragover);
        const dropDispatch = root.dispatchEvent(drop);
        return {
          dragoverPrevented: dragover.defaultPrevented,
          dropPrevented: drop.defaultPrevented,
          dragoverDispatch,
          dropDispatch,
          href: location.href
        };
      });

      assert.equal(dispatchState.dragoverPrevented, true, `${delayed ? "delayed" : "fast"} preload dragover did not prevent browser navigation`);
      assert.equal(dispatchState.dropPrevented, true, `${delayed ? "delayed" : "fast"} preload drop did not prevent browser navigation`);
      assert.equal(dispatchState.dragoverDispatch, false, `${delayed ? "delayed" : "fast"} dragover dispatch did not report cancellation`);
      assert.equal(dispatchState.dropDispatch, false, `${delayed ? "delayed" : "fast"} drop dispatch did not report cancellation`);
      assert.equal(dispatchState.href, originalUrl, `${delayed ? "delayed" : "fast"} preload drop navigated away before analyzer load`);

      if (delayed) {
        assert.deepEqual(await dropPage.evaluate(() => window.__qaDropParseCalls), [], "delayed analyzer parsed before its script was released");
        releaseAnalyzer();
      }

      await dropPage.waitForFunction(() => window.__qaDropParseCalls?.length === 1);
      await dropPage.waitForFunction(() => {
        const qa = window.JABBAR_ORDER_ANALYZER_QA;
        return Boolean(qa && (qa.fileResults.length + qa.fileFailures.length >= 1));
      });
      await dropPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const finalState = await dropPage.evaluate(() => ({ calls: window.__qaDropParseCalls, href: location.href }));
      assert.deepEqual(finalState.calls, [{ method: "drop", names: ["preload-drop.csv"] }], `${delayed ? "delayed" : "fast"} preload drop was not replayed exactly once`);
      assert.equal(finalState.href, originalUrl, `${delayed ? "delayed" : "fast"} analyzer replay navigated away from calculator`);
      return finalState;
    } finally {
      if (delayed) releaseAnalyzer();
      await dropPage.close();
    }
  }

  const delayedPreloadDrop = await verifyPreloadDropReplay({ delayed: true });
  const fastPreloadDrop = await verifyPreloadDropReplay({ delayed: false });

  console.log(JSON.stringify({
    ok: true,
    partialBatch: result,
    fallbackAndLimits: fallbackResult,
    workerRecovery,
    scriptRetry: { ...scriptRetry, coreAttempts },
    preloadDropReplay: { delayed: delayedPreloadDrop, fast: fastPreloadDrop }
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
