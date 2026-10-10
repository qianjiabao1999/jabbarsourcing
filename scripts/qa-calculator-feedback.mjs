#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUTPUT_DIR = process.env.QA_CALCULATOR_FEEDBACK_OUTPUT_DIR || "/tmp/jabbar-calculator-feedback-qa";
const languages = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const quantities = { zh: "1000 箱", en: "1000 cartons", es: "1000 cajas", ar: "عدد الكراتين: 1000", fr: "1000 cartons", pt: "1000 caixas", ru: "Коробок: 1000", de: "1000 Kartons", it: "1000 cartoni", tr: "1000 koli" };
const reportLabels = { zh: ["产品", "尺寸", "备注"], en: ["Product", "Dimensions", "Notes"], es: ["Producto", "Dimensiones", "Notas"], ar: ["المنتج", "الأبعاد", "ملاحظات"], fr: ["Produit", "Dimensions", "Notes"], pt: ["Produto", "Dimensões", "Observações"], ru: ["Товар", "Размеры", "Примечания"], de: ["Produkt", "Abmessungen", "Notizen"], it: ["Prodotto", "Dimensioni", "Note"], tr: ["Ürün", "Ölçüler", "Notlar"] };
const stripBidi = (text) => text.replace(/[\u2066-\u2069]/g, "");
const records = [];
await mkdir(OUTPUT_DIR, { recursive: true });

async function check(browser, lang, width) {
  const prefix = lang === "zh" ? "" : `${lang}/`;
  const html = await readFile(new URL(`../${prefix}calculator/index.html`, import.meta.url), "utf8");
  const t = JSON.parse(html.match(/var t = (.*);/)[1]);
  const feedback = JSON.parse(html.match(/var feedback = (.*);/)[1]);
  const scope = `${browser.browserType().name()}/${lang}/${width}`;
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const blockedPosts = [];
  await context.route("**/*", (route) => {
    const request = route.request();
    if (request.method() === "POST") { blockedPosts.push(request.url()); return route.abort(); }
    if (request.url().includes("/api/consent-region")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ policy: "quiet-denied", country: "CN" }) });
    if (/googletagmanager|google-analytics|clarity\.ms/.test(request.url())) return route.fulfill({ status: 204, body: "" });
    return route.continue();
  });
  await context.addInitScript(() => {
    // 本套件只验本地预填，不调用真实安全验证或提交询盘。
    window.turnstile = { render: () => "calculator-feedback-fixture", reset: () => {}, remove: () => {}, getResponse: () => "" };
    window.__copyMode = "success";
    window.__copied = [];
    const clipboard = { writeText: (text) => {
      window.__copied.push(text);
      if (window.__copyMode === "reject") return Promise.reject(new DOMException("Test permission rejection", "NotAllowedError"));
      if (window.__copyMode === "pending") return new Promise((resolve) => { window.__resolveCopy = resolve; });
      return Promise.resolve();
    } };
    Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => window.__copyMode === "missing" ? undefined : clipboard });
    window.addEventListener("jabbar:calc-result", (event) => { window.__result = event.detail; });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  try {
    const response = await page.goto(`${BASE_URL}/${prefix}calculator/`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200, `${scope}: page status`);
    assert.equal(page.url(), `${BASE_URL}/${prefix}calculator/`, `${scope}: page identity`);
    assert(await page.title(), `${scope}: title missing`);
    assert(await page.locator("h1").textContent(), `${scope}: blank page`);
    await page.locator(".calculator-mode-tabs").waitFor();
    const fallback = page.locator("[data-copy-fallback]");
    const copyText = page.locator("[data-copy-text]");
    const status = page.locator("[data-copy-status]");
    const button = page.locator("[data-copy-result]");
    assert.equal(await fallback.isVisible(), false, `${scope}: fallback exposed before copying`);
    for (const [name, value] of Object.entries({ length: "30", width: "40", height: "40", qty: "1000" })) await page.locator(`#${name}`).fill(value);
    await page.locator(".calculator-optional-summary").click();
    await page.locator("#product").fill("Kitchen storage QA");
    await page.locator("#weight").fill("12");
    await page.locator("#note").fill("Local test only; do not submit.");
    await page.locator("#cbm-calculator button[type=submit]").click();
    const result = await page.evaluate(() => window.__result);
    assert.equal(result.totalCbm, 48, `${scope}: actual total changed`);
    assert(Math.abs(result.bufferedCbm - 50.4) < 1e-9, `${scope}: 5% buffer changed`);
    assert.equal(result.quantity, quantities[lang], `${scope}: carton unit missing`);
    const containerLabel = `${t.container} (${t.bufferCbm})`;
    const container = await page.locator("[data-container]").textContent();
    assert.equal(result.container, `${containerLabel}: ${container}`, `${scope}: payload container differs from visible result`);
    assert((await page.locator("[data-summary]").textContent()).includes(result.container), `${scope}: summary lost buffer basis`);
    assert.equal(await page.locator("[data-container]").locator("..").locator("span").first().textContent(), containerLabel, `${scope}: container card basis missing`);
    assert.equal(await page.locator(".cbm-visual-note").textContent(), feedback.actual, `${scope}: actual-volume label missing`);
    assert(Math.abs(Number(await page.locator("[data-container-load]").first().getAttribute("data-container-load")) - 48 / 68 * 100) < 1e-9, `${scope}: illustration no longer uses actual volume / 68`);
    const lines = stripBidi(result.message).split("\n");
    assert.equal(lines.length, 10, `${scope}: report fields missing`);
    const expectedLabels = [t.copyTitle, ...[reportLabels[lang][0], reportLabels[lang][1], t.qty, t.perCbm, t.totalCbm, t.bufferCbm, containerLabel, t.weightTotal, reportLabels[lang][2]].map((label) => `${label}: `)];
    expectedLabels.forEach((label, index) => assert(lines[index].startsWith(label), `${scope}: untranslated report field ${index}: ${lines[index]}`));
    assert(lines[2].endsWith("30 × 40 × 40 cm"), `${scope}: dimensions/units incorrect`);
    assert(lines[7].endsWith(container), `${scope}: report recommendation differs from UI`);
    if (lang === "ar") assert(result.message.includes("\u206630 × 40 × 40 cm\u2069") && result.message.includes("\u206640HQ\u2069"), `${scope}: RTL numeric isolation missing`);

    for (const mode of ["success", "reject", "missing"]) {
      await page.evaluate((value) => { window.__copyMode = value; }, mode);
      await button.click();
      const expected = mode === "success" ? t.copied : mode === "reject" ? feedback.copyFailed : feedback.copyUnavailable;
      await page.waitForFunction((value) => document.querySelector("[data-copy-status]").textContent === value, expected);
      assert.equal(await status.textContent(), expected, `${scope}/${mode}: wrong feedback`);
      assert.equal(await status.getAttribute("role"), "status", `${scope}/${mode}: feedback not announced`);
      assert.equal(await fallback.isVisible(), mode !== "success", `${scope}/${mode}: wrong manual-copy visibility`);
      if (mode !== "success") {
        assert.equal(await copyText.inputValue(), result.message, `${scope}/${mode}: manual result differs from report`);
        assert.equal(await copyText.getAttribute("readonly"), "", `${scope}/${mode}: manual text can be edited`);
        assert.equal(await copyText.getAttribute("aria-describedby"), "calculator-copy-help", `${scope}/${mode}: help not associated`);
        assert.equal(await page.locator('label[for="calculator-copy-text"]').textContent(), feedback.manualLabel, `${scope}/${mode}: unlabeled manual text`);
        assert.equal(await page.evaluate(() => document.activeElement.id), "calculator-copy-text", `${scope}/${mode}: manual result not focused`);
        const selection = await copyText.evaluate((node) => [node.selectionStart, node.selectionEnd]);
        assert.deepEqual(selection, [0, result.message.length], `${scope}/${mode}: manual text not selected`);
      } else assert.equal(await page.evaluate(() => window.__copied.at(-1)), result.message, `${scope}: copied report differs from inquiry report`);
      assert.equal(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > innerWidth), false, `${scope}/${mode}: horizontal overflow`);
      if (["en", "ar"].includes(lang) && mode !== "success") await page.screenshot({ path: `${OUTPUT_DIR}/${browser.browserType().name()}-${lang}-${width}-${mode}.png` });
    }

    await page.locator("#unit").selectOption("in");
    const inches = await page.evaluate(() => window.__result);
    assert(Math.abs(inches.totalCbm - 786.579072) < 1e-8, `${scope}: inch conversion changed`);
    assert(stripBidi(inches.message).includes("30 × 40 × 40 in"), `${scope}: report retained old dimension unit`);
    assert.equal(await status.textContent(), "", `${scope}: stale copy feedback after input change`);
    assert.equal(await fallback.isVisible(), false, `${scope}: stale manual text after input change`);
    await page.locator("#unit").selectOption("cm");
    assert.equal((await page.evaluate(() => window.__result)).totalCbm, 48, `${scope}: cm roundtrip changed`);

    await page.locator("#qty").fill("1350");
    const bufferedBoundary = await page.evaluate(() => window.__result);
    const multiContainer = t.multi.replace("{n}", "2");
    assert(Math.abs(bufferedBoundary.totalCbm - 64.8) < 1e-9 && Math.abs(bufferedBoundary.bufferedCbm - 68.04) < 1e-9, `${scope}: buffered boundary changed`);
    assert.equal(await page.locator("[data-container]").textContent(), multiContainer, `${scope}: 5% buffer should recommend two containers at 68.04 CBM`);
    assert.equal(await page.locator(".cbm-visual").getAttribute("data-container-count"), "1", `${scope}: illustration should retain one actual-volume container at 64.8 CBM`);
    assert.equal(bufferedBoundary.container, `${containerLabel}: ${multiContainer}`, `${scope}: multi-container payload diverged`);
    assert(stripBidi(bufferedBoundary.message).includes(bufferedBoundary.container), `${scope}: multi-container report diverged`);
    assert((await page.locator("[data-summary]").textContent()).includes(bufferedBoundary.container), `${scope}: multi-container summary diverged`);
    await page.locator("#qty").fill("1");
    assert.equal((await page.evaluate(() => window.__result)).quantity, feedback.quantityOne.replace("{n}", "1"), `${scope}: singular carton unit`);
    await page.locator("#qty").fill("1000");

    if (lang === "en") {
      await page.evaluate(() => { window.__copyMode = "pending"; });
      await button.click();
      await page.locator("#qty").fill("1");
      assert.equal((await page.evaluate(() => window.__result)).quantity, "1 carton", `${scope}: singular carton unit`);
      await page.evaluate(() => window.__resolveCopy());
      await page.waitForTimeout(50);
      assert.equal(await status.textContent(), "", `${scope}: stale pending copy falsely reported success`);
      await page.locator("#qty").fill("1000");
    }
    await page.locator("#length").fill("");
    assert.equal(await button.isDisabled(), true, `${scope}: invalid estimate remains copyable`);
    assert.equal(await copyText.inputValue(), "", `${scope}: invalid input retains stale manual report`);
    await page.locator("#length").fill("30");
    await page.locator(".calculator-inquiry-cta").click();
    await page.waitForURL(`${BASE_URL}/${prefix}inquiry/`);
    await page.waitForFunction(() => document.querySelector('[name="quantity"]')?.value.length > 0);
    assert.equal(await page.locator('[name="quantity"]').inputValue(), quantities[lang], `${scope}: inquiry carton unit was lost`);
    assert.equal(await page.locator('[name="product"]').inputValue(), "Kitchen storage QA", `${scope}: inquiry product was lost`);
    assert.equal(await page.locator('[name="note"]').inputValue(), result.message, `${scope}: inquiry report differs from copy report`);
    assert.equal(await page.locator(".inquiry-additional-details").evaluate((node) => node.open), true, `${scope}: prefilled optional fields collapsed`);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("jabbarCalcResult")), null, `${scope}: inquiry prefill not consumed`);
    assert.deepEqual(errors, [], `${scope}: browser errors`);
    assert.deepEqual(blockedPosts, [], `${scope}: unexpected POST attempted`);
    records.push({ scope, clipboardPaths: ["success", "reject", "missing"], totalCbm: result.totalCbm, bufferedCbm: result.bufferedCbm, quantity: result.quantity, report: result.message, passed: true });
    console.log(`${scope}: copy feedback, localized report, actual/buffer basis, units and inquiry prefill passed`);
  } finally { await context.close(); }
}

for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const lang of languages) await check(browser, lang, 390);
    for (const lang of ["en", "ar"]) await check(browser, lang, 1440);
    await check(browser, "ar", 320);
  } finally { await browser.close(); }
}
await writeFile(`${OUTPUT_DIR}/results.json`, JSON.stringify(records, null, 2));
console.log(`${records.length} browser/locale/viewport flows passed; ${records.length * 3} clipboard path checks. No inquiry submitted.`);
