#!/usr/bin/env node

import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const LOCAL_ORIGIN = new URL(BASE_URL).origin;
const PAGES = ["", "en/", "es/", "ar/", "fr/", "pt/", "ru/", "de/", "it/", "tr/"].map(prefix => "/" + prefix + "inquiry/");

// 只测前端错误路径；任何真实询盘请求都阻断并计为失败。
for (const [engineName, engine] of [["Chromium", chromium], ["WebKit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [360, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: "block" });
      let inquiryRequests = 0;
      await context.addInitScript(() => {
        // 每个旧错误聚焦场景需要空表；草稿恢复在专用套件验收。
        sessionStorage.removeItem("jabbarInquiryDraftV1");
        localStorage.setItem("jabbar.analyticsConsent.v1", "granted");
        window.turnstile = {
          render: (element, options) => {
            window.qaSecurityFailure = () => options["error-callback"]();
            setTimeout(() => options.callback("mock-disclosure-validation-only"), 0);
            return "mock-disclosure-widget";
          },
          reset: () => {}
        };
      });
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (route.request().method() !== "GET" && route.request().method() !== "HEAD") {
          inquiryRequests += 1;
          return route.abort();
        }
        if (url.origin === LOCAL_ORIGIN) return route.continue();
        return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      for (const path of PAGES) {
        const scope = `${engineName} ${width}px ${path}`;
        const home = path.replace(/inquiry\/$/, "");
        await page.goto(BASE_URL + home, { waitUntil: "domcontentloaded" });
        await page.locator('header.site-nav a[href="inquiry/"]:visible').first().click();
        await page.waitForURL(BASE_URL + path);
        assert.equal(await page.locator(".js-inquiry-form").getAttribute("data-inquiry-source"), path);
        const details = page.locator(".inquiry-additional-details");
        const linkDetails = page.locator(".inquiry-reference-details");
        const submit = page.locator(".js-inquiry-direct");
        const quantity = page.locator('[name="quantity"]');
        assert.equal(await details.evaluate((node) => node.open), false, `${scope}: empty disclosure must start closed`);
        await page.locator('[name="product"]').fill("QA disclosure product");
        await page.locator('[name="contact"]').fill("disclosure-check@example.invalid");
        await page.evaluate(() => {
          document.querySelector('[name="quantity"]').setCustomValidity("QA quantity error");
          document.querySelector('[name="budget"]').setCustomValidity("QA later budget error");
        });
        await submit.click();
        await page.waitForFunction(() => document.activeElement?.getAttribute("name") === "quantity");
        assert.equal(await details.evaluate((node) => node.open), true, `${scope}: first hidden invalid field must open disclosure`);
        const focusPosition = await quantity.evaluate((field) => ({
          top: field.getBoundingClientRect().top,
          bottom: field.getBoundingClientRect().bottom,
          navBottom: document.querySelector(".site-nav").getBoundingClientRect().bottom,
          viewportHeight: innerHeight
        }));
        assert(focusPosition.top >= focusPosition.navBottom - 1, `${scope}: revealed error field is covered by sticky navigation`);
        assert(focusPosition.bottom <= focusPosition.viewportHeight + 1, `${scope}: revealed error field is below viewport`);
        assert.equal(inquiryRequests, 0, `${scope}: invalid form must never send a request`);

        // 更早的必填字段无效时，后面的折叠字段不得抢焦点。
        // 独立载入，避免上一场景的浏览器原生校验气泡截获下一次点击。
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
        await page.locator('[name="contact"]').fill("disclosure-check@example.invalid");
        await page.evaluate(() => {
          document.querySelector('[name="quantity"]').setCustomValidity("QA quantity error");
          document.querySelector('[name="budget"]').setCustomValidity("QA later budget error");
        });
        await submit.click();
        await page.waitForFunction(() => document.activeElement?.getAttribute("name") === "product");
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("name")), "product", `${scope}: later invalid events stole focus`);
        assert.equal(inquiryRequests, 0, `${scope}: required-field failure must never send a request`);

        // 原有浏览器恢复入口只展示已恢复的内容，不主动改变焦点。
        await page.evaluate(() => {
          document.querySelector('[name="quantity"]').setCustomValidity("");
          document.querySelector('[name="budget"]').setCustomValidity("");
          document.querySelector('[name="company"]').value = "QA restored company";
          document.querySelector(".inquiry-additional-details").open = false;
          document.querySelector('[name="contact"]').focus();
          window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
        });
        assert.equal(await details.evaluate((node) => node.open), true, `${scope}: restored populated details must open`);
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("name")), "contact", `${scope}: restoration must not steal focus`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), true, `${scope}: expanded details overflow`);
        if (width === 360) {
          await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
          const reference = page.locator('[name="referenceUrl"]');
          await page.locator('[name="product"]').fill("Local fixture");
          await page.locator('[name="contact"]').fill("local@example.invalid");
          const submitTop = () => submit.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
          const oldTop = await submitTop();
          await linkDetails.locator("summary").click();
          assert(!(await details.evaluate(el => el.open)), scope + ": 添加链接不应展开其他六项");
          assert((await submitTop()) - oldTop < 320, scope + ": 单一链接与发图说明不应推出半屏");
          assert(await linkDetails.locator('.inquiry-attachment-note a[href="#contact"]').isVisible(), scope + ": 无需展开六项资料即可找到发图入口");
          await reference.fill("ftp://example.invalid/not-accepted");
          await reference.press("Tab");
          assert.equal(await reference.getAttribute("aria-invalid"), "true");
          assert.equal(await reference.getAttribute("aria-describedby"), "inquiry-reference-error");
          assert.equal(await page.locator("#inquiry-reference-error").textContent(), await reference.getAttribute("title"));
          await linkDetails.locator("summary").click();
          assert(await linkDetails.locator(".inquiry-reference-summary-error").isVisible(), scope + ": 折叠时仍须提示链接有误");
          assert.equal(await reference.isVisible(), false, `${scope}: closed optional URL should be hidden`);
          await submit.click();
          await page.waitForFunction(() => document.activeElement?.name === "referenceUrl");
          assert.equal(await reference.isVisible(), true, `${scope}: invalid URL must reopen and focus`);
          assert.equal(await details.evaluate(el => el.open), false, scope + ": 链接错误只展开链接，不干扰采购详情");
          assert.equal(inquiryRequests, 0);
          // 改变断点时仍是同一个字段，保持值和焦点；回到手机后可继续编辑。
          await page.setViewportSize({ width: 1024, height: 800 });
          await page.waitForFunction(() => !document.querySelector('[name="referenceUrl"]').closest("details"));
          await details.evaluate((el) => { el.open = false; });
          await reference.focus();
          await page.setViewportSize({ width, height: 800 });
          await page.waitForFunction(() => document.activeElement?.name === "referenceUrl" && document.activeElement.closest("details[open]"));
          assert.equal(await reference.inputValue(), "ftp://example.invalid/not-accepted");
          assert.equal(await reference.count(), 1);
        }
        // 常见的复制地址缺协议：输入中不改写；完成编辑或按回车再补全。
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
        const reference = page.locator('[name="referenceUrl"]');
        if (width === 360) await linkDetails.locator("summary").click();
        const bare = "www.alibaba.com/product-detail/tea-cup.html?options=blue%2Fred&lang=ar#details";
        const completed = "https://" + bare;
        await reference.fill(bare);
        assert.equal(await reference.inputValue(), bare, `${scope}: typing must not move the caret by rewriting the URL`);
        await reference.press("Tab");
        assert.equal(await reference.inputValue(), completed, `${scope}: committed www address should gain HTTPS`);
        assert.equal(await reference.evaluate(field => field.validity.valid), true);
        assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("jabbarInquiryDraftV1")).fields.referenceUrl), completed);
        await page.evaluate(() => window.qaSecurityFailure());
        const summaryHref = await page.locator(".inquiry-status-whatsapp").getAttribute("href");
        assert(new URL(summaryHref).searchParams.get("text").includes(completed), `${scope}: fallback must preserve the complete normalized URL`);
        // 与 Worker 相同：不接收凭据和编码后超长链接，且不把无效内容交给 WhatsApp。
        await page.locator('[name="product"]').fill("QA cup");
        await page.locator('[name="contact"]').fill("demo@example.invalid");
        const longPath = "https://example.invalid/" + (path.startsWith("/ar/") ? "ع".repeat(81) : "样".repeat(60));
        for (const value of ["https://fixture:example-only@example.invalid/product", longPath]) {
          await reference.fill(value);
          await reference.press("Tab");
          assert.equal(await reference.inputValue(), value, scope + ": 原文需保留供修正");
          assert(await reference.evaluate(el => el.validity.customError && !!el.validationMessage), scope + ": 无效链接需要本地化提示");
          const href = await page.locator(".inquiry-status-whatsapp").getAttribute("href");
          const text = new URL(href).searchParams.get("text");
          assert(text.includes("QA cup") && !text.includes(value) && !text.includes("example-only"), scope + ": 无效链接不能进入备用消息");
          assert(await page.locator(".inquiry-reference-omitted").isVisible(), scope + ": 买家须知备用消息不含该链接");
        }
        const exact = "https://example.invalid/" + "a".repeat(500 - "https://example.invalid/".length);
        for (const [raw, expected] of [[exact, exact], ["HTTPS://example.invalid/货品?规格=绿%2F白#图", "https://example.invalid/货品?规格=绿%2F白#图"], ["", ""]]) {
          await reference.fill(raw);
          await reference.press("Tab");
          assert.equal(await reference.inputValue(), expected, scope + ": 只调整协议大小写");
          assert(await reference.evaluate(el => el.validity.valid), scope + ": 修正后应立即恢复可用");
          assert.equal(await reference.getAttribute("aria-invalid"), null);
          assert.equal(await page.locator("#inquiry-reference-error").textContent(), "");
          assert(await page.locator(".inquiry-reference-omitted").isHidden(), scope + ": 已修正时不应提示链接缺失");
        }
        for (const untouched of ["http://www.example.invalid/item", "https://www.example.invalid/a?b=2", "tea cup", "buyer@example.invalid", "ftp://www.example.invalid/a", "//www.example.invalid/a", "www.example.invalid@other.invalid", "www.example.invalid:wrong", "www.example.invalid/" + "a".repeat(478)]) {
          await reference.fill(untouched);
          await reference.press("Tab");
          assert.equal(await reference.inputValue(), untouched, `${scope}: never reinterpret ambiguous, explicit or oversized address`);
        }
        // 有效的直接提交只在本页观察原生 submit 事件；不调用任何接口。
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
        await page.locator('[name="product"]').fill("Local product");
        await page.locator('[name="contact"]').fill("local@example.invalid");
        if (width === 360) await linkDetails.locator("summary").click();
        await reference.fill(bare);
        await page.evaluate(() => {
          const form = document.querySelector(".js-inquiry-form");
          form.addEventListener("submit", event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.qaSubmittedReference = new FormData(form).get("referenceUrl");
          }, { capture: true, once: true });
        });
        await reference.press("Enter");
        await page.waitForFunction(value => window.qaSubmittedReference === value, completed);
        assert.equal(inquiryRequests, 0);
        console.log(`${scope}: PASS`);
      }
      assert.deepEqual(pageErrors, [], `${engineName} ${width}px: page errors`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
console.log("十语询价导航、输入、草稿、表单错误、链接边界和备用交互已通过：Chromium/WebKit × 360/1280px，全程无写请求。");
