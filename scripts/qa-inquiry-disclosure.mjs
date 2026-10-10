#!/usr/bin/env node

import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const LOCAL_ORIGIN = new URL(BASE_URL).origin;
const PAGES = ["/en/inquiry/", "/ar/inquiry/"];

// 只测前端错误路径；任何真实询盘请求都阻断并计为失败。
for (const [engineName, engine] of [["Chromium", chromium], ["WebKit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [360, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      let inquiryRequests = 0;
      await context.addInitScript(() => {
        localStorage.setItem("jabbar.analyticsConsent.v1", "granted");
        window.turnstile = {
          render: (element, options) => {
            setTimeout(() => options.callback("mock-disclosure-validation-only"), 0);
            return "mock-disclosure-widget";
          },
          reset: () => {}
        };
      });
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === LOCAL_ORIGIN) return route.continue();
        if (url.hostname === "inquiry-api.jabbarsourcing.com" && url.pathname === "/inquiry") {
          inquiryRequests += 1;
          return route.abort();
        }
        return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      for (const path of PAGES) {
        const scope = `${engineName} ${width}px ${path}`;
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
        const details = page.locator(".inquiry-additional-details");
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
        console.log(`${scope}: PASS`);
      }
      assert.deepEqual(pageErrors, [], `${engineName} ${width}px: page errors`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
console.log("Inquiry disclosure focus QA passed: Chromium/WebKit, English/Arabic, 360/1280px; no inquiry requests.");
