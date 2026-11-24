#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const ORIGIN = new URL(BASE_URL).origin;
assert(["127.0.0.1", "localhost", "[::1]"].includes(new URL(BASE_URL).hostname), "草稿测试只能指向本地夹具，禁止生产提交");
const OUTPUT_DIR = process.env.QA_OUTPUT_DIR || "/tmp/jabbar-inquiry-draft-qa";
const DRAFT_KEY = "jabbarInquiryDraftV1";
const FIELD_NAMES = ["product", "referenceUrl", "category", "quantity", "budget", "market", "contact", "company", "note"];
const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const pathFor = (locale) => `${locale === "zh" ? "" : `/${locale}`}/inquiry/`;
const FIXTURE = {
  product: "QA draft storage items — not a real inquiry",
  referenceUrl: "https://example.invalid/product",
  category: "Kitchenware",
  quantity: "1,000 pcs",
  budget: "USD 5,000",
  market: "France",
  contact: "draft-check@example.invalid",
  company: "QA test company",
  note: "QA notes only"
};

await mkdir(OUTPUT_DIR, { recursive: true });

async function contextFor(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const state = { posts: [], responseStatus: 201, responseGate: null, pageErrors: [], consoleErrors: [] };
  await context.addInitScript(({ draftKey, storageFailure, origin }) => {
    if (location.origin !== origin) return;
    window.turnstile = {
      render: (_element, settings) => {
        window.__draftQaTurnstile = settings;
        setTimeout(() => settings.callback("mock-local-draft-token"), 0);
        return "mock-local-draft-widget";
      },
      reset: () => {}
    };
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (key === draftKey && window.__blockDraftRemoval) throw new DOMException("Deletion blocked in QA", "SecurityError");
      return originalRemoveItem.call(this, key);
    };
    const originalSessionStorage = window.sessionStorage;
    Object.defineProperty(window, "sessionStorage", { configurable: true, get() {
      if (storageFailure === "read" || window.__blockSessionAccess) throw new DOMException("Blocked by QA", "SecurityError");
      return originalSessionStorage;
    } });
    if (storageFailure === "write") {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === draftKey) throw new DOMException("Full in QA", "QuotaExceededError");
        return originalSetItem.call(this, key, value);
      };
    }
  }, { draftKey: DRAFT_KEY, storageFailure: options.storageFailure, origin: ORIGIN });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === ORIGIN) return route.continue();
    if (url.hostname === "inquiry-api.jabbarsourcing.com") {
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers, body: "" });
      assert.equal(request.method(), "POST");
      state.posts.push(request.postDataJSON());
      if (state.responseGate) await state.responseGate;
      return route.fulfill({ status: state.responseStatus, headers, contentType: "application/json", body: JSON.stringify({ ok: true, requestId: "qa-local-only" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  context.on("page", (page) => {
    page.on("pageerror", (error) => state.pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") state.consoleErrors.push(message.text()); });
  });
  return { context, state };
}

async function open(page, locale) {
  await page.goto(`${BASE_URL}${pathFor(locale)}`, { waitUntil: "networkidle" });
  await page.locator('.js-inquiry-form[data-direct-inquiry-ready="true"]').waitFor();
  assert.equal(await page.locator(".inquiry-draft-panel").isVisible(), true);
}

const readValues = (page) => page.evaluate((names) => Object.fromEntries(names.map((name) => [name, document.querySelector(`[name="${name}"]`).value])), FIELD_NAMES);
const readStored = (page) => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), DRAFT_KEY);

async function fillAll(page) {
  await page.locator('[name="product"]').fill(FIXTURE.product);
  await page.locator('[name="contact"]').fill(FIXTURE.contact);
  await page.locator(".inquiry-additional-summary").click();
  await page.locator('[name="referenceUrl"]').fill(FIXTURE.referenceUrl);
  for (const name of ["quantity", "budget", "market", "company", "note"]) await page.locator(`[name="${name}"]`).fill(FIXTURE[name]);
  await page.locator('[name="category"]').selectOption({ index: 3 });
  return { ...FIXTURE, category: await page.locator('[name="category"]').inputValue() };
}

async function verifyAttachedEstimate(browser, engineName) {
  const { context, state } = await contextFor(browser);
  try {
    const page = await context.newPage();
    await open(page, "en");
    const original = await fillAll(page);
    async function attach(text) {
      await page.goto(BASE_URL + "/en/calculator/");
      await page.evaluate(message => sessionStorage.setItem("jabbarCalcResult", JSON.stringify({
        savedAt: Date.now(), product: "Other product", quantity: "10 cartons", message
      })), text);
      await open(page, "en");
      assert.deepEqual(await readValues(page), original, "导入/替换不能覆盖任何手填字段");
      assert.equal(await page.locator(".inquiry-estimate-text").count(), 1);
      assert.equal(await page.locator(".inquiry-estimate-text").textContent(), text);
    }
    const report = "CBM estimate: 10 cartons, 2 m³";
    await attach("Old report");
    await attach(report);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator(".inquiry-estimate-text").textContent(), report);
    await page.evaluate(() => window.__draftQaTurnstile["error-callback"]("300001"));
    let wa = new URL(await page.locator(".inquiry-status-whatsapp").getAttribute("href")).searchParams.get("text");
    for (const value of [original.product, original.quantity, original.note, report]) assert(wa.includes(value), "WhatsApp 缺失 " + value);
    assert(!wa.includes("Old report"), "新结果不应叠加旧报告");
    await page.locator(".inquiry-estimate summary").click();
    await page.locator(".inquiry-estimate-remove").click();
    assert.deepEqual(await readValues(page), original, "仅移除摘要，不得清除人工输入");
    wa = new URL(await page.locator(".inquiry-status-whatsapp").getAttribute("href")).searchParams.get("text");
    assert(!wa.includes(report), "移除后 WhatsApp 仍带旧摘要");
    await attach(report);
    await page.locator("[name=note]").fill("A".repeat(1499));
    assert(await page.locator(".inquiry-estimate-warning").isVisible());
    await page.locator(".js-inquiry-direct").click();
    assert.equal(state.posts.length, 0, "超限时不能截断后发送");
    assert.equal(await page.locator(".inquiry-estimate-warning").evaluate(node => document.activeElement === node), true, "超限原因应获焦");
    assert.equal((await page.locator("[name=note]").inputValue()).length, 1499);
    await page.locator("[name=note]").fill(original.note);
    assert(!(await page.locator(".inquiry-estimate-warning").isVisible()));
    await page.locator(".js-inquiry-direct").click();
    await page.locator(".inquiry-status.is-success").waitFor();
    assert.equal(state.posts.length, 1);
    assert.equal(state.posts[0].quantity, original.quantity);
    assert.equal(state.posts[0].note, original.note + "\n\n" + report);
    assert.equal(state.posts[0].product, original.product);
    assert.equal(await page.locator(".inquiry-estimate").count(), 0);
    assert.equal(await readStored(page), null);
    console.log(engineName + ": 报告可替换、草稿独立保存、可移除、回退/直接发送与长度边界通过（本地替身）。");
  } finally { await context.close(); }
}

for (const [engineName, engine] of [["Chromium", chromium], ["WebKit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    await verifyAttachedEstimate(browser, engineName);
    for (const [index, locale] of (process.env.QA_DRAFT_EDGE_ONLY === "1" ? [] : LOCALES).entries()) {
      const { context, state } = await contextFor(browser);
      try {
        const page = await context.newPage();
        await open(page, locale);
        if (["en", "ar"].includes(locale)) await page.screenshot({ path: `${OUTPUT_DIR}/inquiry-draft-${locale}-${engineName.toLowerCase()}-empty.png` });
        assert.equal(await page.locator(".inquiry-draft-clear").isVisible(), false, `${locale}: empty draft must not add a clear control`);
        const noticeBeforeInput = await page.evaluate(() => document.querySelector(".inquiry-draft-notice").getBoundingClientRect().bottom <= document.querySelector('[name="product"]').getBoundingClientRect().top);
        assert.equal(noticeBeforeInput, true, `${locale}: transparent notice must precede first field`);
        assert.equal(await page.locator("input[required]").count(), 2);
        assert.equal(await page.locator(".inquiry-additional-fields input,.inquiry-additional-fields select,.inquiry-additional-fields textarea").count(), 7);
        assert.equal(await page.locator('[name="referenceUrl"]').isVisible(), false);
        const expected = await fillAll(page);
        let record = await readStored(page);
        assert.deepEqual(Object.keys(record).sort(), ["detailsOpen", "fields", "savedAt", "version"]);
        assert.deepEqual(Object.keys(record.fields).sort(), [...FIELD_NAMES].sort());
        assert.deepEqual(record.fields, { ...FIXTURE, category: "kitchenware" });
        assert.equal(record.detailsOpen, true);
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY), null, `${locale}: draft must never use localStorage`);

        await page.reload({ waitUntil: "networkidle" });
        assert.deepEqual(await readValues(page), expected, `${locale}: regular reload must restore all business fields`);
        assert.equal(await page.locator(".inquiry-additional-details").evaluate((node) => node.open), true);
        assert.equal((await readStored(page)).savedAt, record.savedAt, `${locale}: restoration must not extend expiry`);
        await page.locator(".inquiry-additional-summary").click();
        await page.waitForFunction((key) => JSON.parse(sessionStorage.getItem(key)).detailsOpen === false, DRAFT_KEY);
        await page.reload({ waitUntil: "networkidle" });
        assert.equal(await page.locator(".inquiry-additional-details").evaluate((node) => node.open), false, `${locale}: user-closed details must remain closed`);

        const privacy = page.locator(".inquiry-privacy-notice a");
        assert.equal(await privacy.getAttribute("target"), "_blank");
        assert((await privacy.getAttribute("rel")).split(/\s+/).includes("noopener"));
        assert((await privacy.locator(".inquiry-privacy-window").textContent()).trim().length > 4, `${locale}: new window must be announced visibly`);
        const popupPromise = page.waitForEvent("popup");
        await privacy.click();
        const popup = await popupPromise;
        await popup.waitForLoadState("domcontentloaded");
        assert(popup.url().includes("website-privacy-policy.html#website-inquiries"));
        assert.equal(await popup.evaluate(() => window.opener === null), true, `${locale}: privacy popup must not have an opener`);
        await popup.close();
        assert.deepEqual(await readValues(page), expected, `${locale}: privacy reading must not disturb draft`);

        // 强制新文档返回路径：默认 Playwright 禁 BFCache，草稿也必须独立恢复。
        const policyHref = await privacy.getAttribute("href");
        await page.goto(`${BASE_URL}${policyHref}`, { waitUntil: "networkidle" });
        await page.goBack({ waitUntil: "networkidle" });
        assert.deepEqual(await readValues(page), expected, `${locale}: no-BFCache policy return must restore fields`);

        const destination = LOCALES[(index + 1) % LOCALES.length];
        await page.locator(".site-nav-language summary").click();
        await page.locator(`.site-nav-language a[href="${pathFor(destination)}"]`).click();
        await page.waitForURL(`${BASE_URL}${pathFor(destination)}`);
        await page.waitForLoadState("networkidle");
        const translatedCategory = await page.locator('[name="category"] option[data-draft-value="kitchenware"]').getAttribute("value");
        assert.deepEqual(await readValues(page), { ...FIXTURE, category: translatedCategory }, `${locale}: language switch must preserve all fields`);
        assert.equal(await page.locator(".inquiry-additional-details").evaluate((node) => node.open), false);
        assert.equal(await page.evaluate(() => location.search), "", `${locale}: draft must not be placed in URL`);

        await page.locator(".inquiry-draft-clear").click();
        assert.deepEqual(await readValues(page), { ...FIXTURE, category: translatedCategory }, "发起清空不能删除输入");
        assert(await page.locator(".inquiry-clear-cancel").evaluate(el => document.activeElement === el));
        await page.keyboard.press("Escape");
        assert(await page.locator(".inquiry-clear-prompt").isHidden());
        await page.locator(".inquiry-draft-clear").click();
        await page.locator(".inquiry-clear-cancel").click();
        assert.deepEqual(await readValues(page), { ...FIXTURE, category: translatedCategory }, "继续填写保留全部字段");
        await page.locator(".inquiry-draft-clear").click();
        await page.locator(".inquiry-clear-confirm").click();
        assert.equal(await readStored(page), null);
        assert(Object.values(await readValues(page)).every((value) => value === ""));
        assert.equal(await page.evaluate(() => document.activeElement.name), "product");
        assert.equal(await page.locator(".inquiry-draft-clear").isVisible(), false);
        await page.reload({ waitUntil: "networkidle" });
        assert(Object.values(await readValues(page)).every((value) => value === ""), `${locale}: cleared draft must not return`);
        assert.equal(await readStored(page), null);
        assert.equal(state.posts.length, 0, `${locale}: editing/navigation must never submit`);
        assert.deepEqual(state.pageErrors, []);
        assert.deepEqual(state.consoleErrors, []);
        console.log(`${engineName} ${locale}: reload, privacy popup/return, language, closed details, clear PASS`);
      } finally { await context.close(); }
    }

    const { context, state } = await contextFor(browser);
    try {
      const page = await context.newPage();
      await open(page, "en");
      await page.evaluate(({ key, fields }) => sessionStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now() - 30 * 60 * 1000, detailsOpen: true, fields })), { key: DRAFT_KEY, fields: FIXTURE });
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await readStored(page), null, `${engineName}: expired record must be removed`);
      assert(Object.values(await readValues(page)).every((value) => value === ""));
      assert.equal(await page.locator(".inquiry-additional-details").evaluate((node) => node.open), false);
      await page.evaluate(({ key, fields }) => {
        sessionStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now() - 30 * 60 * 1000 + 1500, detailsOpen: true, fields }));
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      }, { key: DRAFT_KEY, fields: { ...FIXTURE, category: "kitchenware" } });
      assert.equal(await page.locator('[name="product"]').inputValue(), FIXTURE.product);
      await page.waitForFunction((key) => sessionStorage.getItem(key) === null, DRAFT_KEY);
      assert.equal(await page.locator('[name="product"]').inputValue(), FIXTURE.product, `${engineName}: active expiry must not erase current editing fields`);
      await page.locator('[name="product"]').fill("Edited after expiry");
      assert.equal((await readStored(page)).fields.product, "Edited after expiry");
      await page.locator(".inquiry-draft-clear").click();
      await page.locator(".inquiry-clear-confirm").click();
      await page.evaluate((key) => sessionStorage.setItem(key, "{broken-json"), DRAFT_KEY);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await readStored(page), null, `${engineName}: malformed draft must be removed`);

      await page.locator('[name="product"]').fill("Saved before deletion became unavailable");
      await page.evaluate(() => { window.__blockSessionAccess = true; });
      await page.locator(".inquiry-draft-clear").click();
      await page.locator(".inquiry-clear-confirm").click();
      assert.equal(await page.locator('[name="product"]').inputValue(), "");
      assert((await page.locator(".inquiry-draft-feedback").textContent()).includes("could not be deleted"));
      await page.evaluate(() => { window.__blockSessionAccess = false; });
      assert.equal((await readStored(page)).fields.product, "Saved before deletion became unavailable");
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await readStored(page), null, `${engineName}: accessible storage must retry a pending deletion before leaving`);
      assert.equal(await page.locator('[name="product"]').inputValue(), "");

      await page.locator('[name="product"]').fill("To clear by editing");
      await page.locator('[name="product"]').fill("");
      assert.equal(await readStored(page), null, `${engineName}: manually emptied form must clear draft`);
      await page.evaluate(({ key, fields }) => {
        sessionStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), detailsOpen: false, fields }));
        sessionStorage.setItem("jabbarCalcResult", JSON.stringify({ savedAt: Date.now(), product: "New calculator product", quantity: "250 cartons", note: "New calculator notes" }));
      }, { key: DRAFT_KEY, fields: { ...FIXTURE, category: "kitchenware" } });
      await page.reload({ waitUntil: "networkidle" });
      assert.deepEqual(await readValues(page), FIXTURE, "导入时必须保留九项已有草稿");
      assert.equal(await page.locator(".inquiry-additional-details").evaluate(node => node.open), false);
      assert.equal(await page.locator(".inquiry-estimate-text").textContent(), "New calculator notes");
      assert.equal(await page.evaluate(() => sessionStorage.getItem("jabbarCalcResult")), null);
      assert.equal((await readStored(page)).fields.product, FIXTURE.product);
      assert.equal((await readStored(page)).estimate, "New calculator notes");
      assert.equal(await page.locator(".js-inquiry-form").getAttribute("data-calculator-prefill"), "true");

      // 模拟 BFCache 旧文档返回：同标签页更晚的另一语言草稿应覆盖旧非空值。
      await page.waitForTimeout(10);
      await page.evaluate((key) => {
        const record = JSON.parse(sessionStorage.getItem(key));
        record.savedAt = Date.now();
        record.fields.product = "Newer draft from another language";
        sessionStorage.setItem(key, JSON.stringify(record));
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      }, DRAFT_KEY);
      assert.equal(await page.locator('[name="product"]').inputValue(), "Newer draft from another language");

      const newTab = await context.newPage();
      await open(newTab, "en");
      assert(Object.values(await readValues(newTab)).every((value) => value === ""), `${engineName}: unrelated tab must not receive draft`);
      await newTab.close();
      await page.locator('[name="product"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUTPUT_DIR}/inquiry-draft-${engineName.toLowerCase()}-restored.png` });

      await page.evaluate((key) => {
        sessionStorage.removeItem(key);
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      }, DRAFT_KEY);
      assert(Object.values(await readValues(page)).every((value) => value === ""), `${engineName}: another language's clear must not revive cached fields`);
      assert.equal(await readStored(page), null);
      assert.equal(await page.locator(".js-inquiry-form").getAttribute("data-calculator-prefill"), null, `${engineName}: cleared cached draft must remove prefill state`);
      assert.equal(await page.locator(".calculator-prefill-notice").isVisible(), false, `${engineName}: cleared form must not show an old prefill notice`);

      for (const status of [200, 201, 202]) {
        state.responseStatus = status;
        await page.waitForFunction(() => document.querySelector(".js-inquiry-direct").getAttribute("aria-busy") === "false");
        await page.evaluate(() => window.__draftQaTurnstile.callback("mock-local-draft-token"));
        await page.locator('[name="product"]').fill(`Local fixture status ${status}`);
        await page.locator('[name="contact"]').fill(FIXTURE.contact);
        await page.locator(".js-inquiry-direct").click();
        await page.locator(".inquiry-status.is-success").waitFor({ timeout: 10000 }).catch(async (error) => {
          throw new Error(`${engineName} ${status}: ${await page.locator(".inquiry-status").textContent()}; posts=${JSON.stringify(state.posts)}; pageErrors=${JSON.stringify(state.pageErrors)}; consoleErrors=${JSON.stringify(state.consoleErrors)}; ${error.message}`);
        });
        assert.equal(await readStored(page), null, `${engineName}: HTTP ${status} must clear draft`);
        assert(Object.values(await readValues(page)).every((value) => value === ""));
        assert.equal(await page.locator(".js-inquiry-form").getAttribute("data-calculator-prefill"), null, `${engineName}: success must remove prefill state`);
        // 每个响应码独立恢复新文档，同时证明成功后的旧草稿不会复活。
        await page.reload({ waitUntil: "networkidle" });
        assert.equal(await readStored(page), null);
        assert(Object.values(await readValues(page)).every((value) => value === ""));
      }
      assert.equal(state.posts.length, 3);
      state.responseStatus = 201;
      let releaseResponse;
      state.responseGate = new Promise((resolve) => { releaseResponse = resolve; });
      await page.waitForFunction(() => document.querySelector(".js-inquiry-direct").getAttribute("aria-busy") === "false");
      await page.evaluate(() => window.__draftQaTurnstile.callback("mock-local-draft-token"));
      await page.locator('[name="product"]').fill("Old submitted product");
      await page.locator('[name="contact"]').fill(FIXTURE.contact);
      await page.locator(".js-inquiry-direct").click();
      await page.waitForFunction(() => document.querySelector(".js-inquiry-direct").getAttribute("aria-busy") === "true");
      await page.locator('[name="product"]').fill("New unsubmitted product");
      releaseResponse();
      await page.locator(".inquiry-status.is-success").waitFor();
      assert.equal(state.posts.length, 4);
      assert.equal(state.posts[3].product, "Old submitted product");
      assert.equal((await readStored(page)).fields.product, "New unsubmitted product", `${engineName}: success must preserve edits made during submission`);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator('[name="product"]').inputValue(), "New unsubmitted product");
      assert.notEqual(await page.locator('[name="product"]').inputValue(), state.posts[3].product);
      assert.deepEqual(state.pageErrors, []);
      assert.deepEqual(state.consoleErrors, []);
      console.log(`${engineName}: expiry, malformed, empty, prefill priority, tab isolation, BFCache newer/cleared state, local 200/201/202 and in-flight edits PASS`);
    } finally { await context.close(); }

    for (const storageFailure of ["read", "write"]) {
      const { context, state } = await contextFor(browser, { storageFailure });
      try {
        const page = await context.newPage();
        await open(page, "en");
        await page.locator('[name="product"]').fill("Local storage failure fixture");
        await page.locator('[name="contact"]').fill(FIXTURE.contact);
        assert((await page.locator(".inquiry-draft-notice").textContent()).includes("unavailable"));
        assert.equal(await page.locator(".js-inquiry-direct").isEnabled(), true, `${storageFailure}: storage must not block secure form`);
        await page.locator(".js-inquiry-direct").click();
        await page.locator(".inquiry-status.is-success").waitFor();
        assert.equal(state.posts.length, 1);
        assert.deepEqual(state.pageErrors, []);
        assert.deepEqual(state.consoleErrors, []);
        console.log(`${engineName}: unavailable storage ${storageFailure} still allows local mocked secure submission PASS`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
console.log("Inquiry draft QA passed. All submission responses were intercepted local fixtures; no production POST.");
