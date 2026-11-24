import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = new URL(process.env.BASE_URL || "http://127.0.0.1:4173/");
const locales = ["zh", "en", "ar", "de", "es", "fr", "it", "pt", "ru", "tr"];
const writes = [];
const engines = [chromium, webkit];
for (const engine of engines) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true,
      reducedMotion: "reduce", serviceWorkers: "block"
    });
    await context.route("**/*", route => {
      const req = route.request();
      if (!["GET", "HEAD"].includes(req.method())) {
        writes.push(req.method());
        return route.abort();
      }
      return new URL(req.url()).origin === base.origin ? route.continue() : route.abort();
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
      window.testCopyCalls = [];
      window.testClipboardMode = "deny";
      Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => {
        if (window.testClipboardMode === "unavailable") return undefined;
        return { writeText(value) {
          window.testCopyCalls.push(String(value));
          if (window.testClipboardMode === "delay") return new Promise(resolve => { window.testCompleteCopy = resolve; });
          if (window.testClipboardMode === "deny") return Promise.reject(new DOMException("Denied", "NotAllowedError"));
          return Promise.resolve();
        } };
      } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on("pageerror", err => errors.push(err.message));
    for (const lang of locales) for (const sub of ["", "inquiry/"]) {
      const route = (lang === "zh" ? "/" : "/" + lang + "/") + sub;
      const scope = engine.name() + " " + route;
      assert.equal((await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded" })).status(), 200, scope);
      const trigger = page.locator('.js-contact-modal-open[data-modal-target="wechat-modal"]').first();
      const modal = page.locator("#wechat-modal");
      const close = modal.locator("button[data-close-modal]");
      const copy = modal.locator("button[data-copy-contact]");
      const hint = modal.locator(".contact-modal-hint");
      const number = modal.locator("strong");
      const focused = locator => locator.evaluate(el => document.activeElement === el);
      const backgroundState = () => modal.evaluate(el => {
        const inert = [];
        for (let branch = el; branch !== document.body; branch = branch.parentElement) {
          for (const sibling of branch.parentElement.children) if (sibling !== branch && sibling.hasAttribute("inert"))
            inert.push(sibling.tagName + "." + sibling.className);
        }
        return inert;
      });
      const priorBackground = await backgroundState();
      await trigger.focus();
      await page.keyboard.press("Enter");
      await close.waitFor();
      assert(await focused(close), scope + ": 打开后焦点应进入对话框");
      assert.deepEqual(await page.evaluate(() => window.testCopyCalls), [], scope + ": 打开不可写剪贴板");
      const expected = (await number.textContent()).trim();
      const label = await copy.textContent(), copied = await modal.getAttribute("data-copied-label");
      const original = await hint.textContent(), failed = await modal.getAttribute("data-manual-copy");
      assert(original && failed && failed !== original && label !== copied, scope);
      await page.keyboard.press("Shift+Tab");
      assert(await focused(copy), scope + ": 反向焦点应停在复制按钮");
      await page.keyboard.press("Tab");
      assert(await focused(close), scope + ": 焦点应在窗内循环");
      await copy.click(); // 模拟权限拒绝，不写设备剪贴板。
      assert.equal(await hint.textContent(), failed, scope);
      assert.equal(await copy.textContent(), label, scope + ": 失败时禁止报成功");
      assert.equal(await page.evaluate(() => getSelection().toString()), expected, scope + ": 失败时选中完整微信号");
      await page.keyboard.press("Escape");
      assert(!(await modal.isVisible()) && await focused(trigger), scope + ": 关闭后须还原焦点");

      await page.keyboard.press("Enter");
      assert.equal(await hint.textContent(), original, scope + ": 重开不能保留上次错误");
      await page.evaluate(() => { window.testClipboardMode = "success"; });
      await copy.click();
      assert.equal(await copy.textContent(), copied, scope);
      assert.deepEqual(await page.evaluate(() => window.testCopyCalls), [expected,expected], scope);
      await close.click();
      assert(await focused(trigger), scope + ": 关闭按钮也须还原焦点");
      if (lang === "en" || lang === "ar") {
        // 没有剪贴板 API；以及关闭、重开后上次异步复制才完成。
        await trigger.click();
        await page.evaluate(() => { window.testClipboardMode = "unavailable"; });
        await copy.click();
        assert.equal(await hint.textContent(), failed, scope);
        assert.equal(await copy.textContent(), label, scope);
        await page.evaluate(() => { window.testClipboardMode = "delay"; });
        await copy.click();
        await page.keyboard.press("Escape");
        await trigger.click();
        await page.evaluate(() => window.testCompleteCopy());
        assert.equal(await hint.textContent(), original, scope);
        assert.equal(await copy.textContent(), label, scope + ": 延迟复制不能污染重开后的对话框");
        await modal.locator(".contact-modal-backdrop").click({ position: { x: 3, y: 3 } });
        await modal.waitFor({ state: "hidden" });
        assert(!(await modal.isVisible()) && await focused(trigger), scope);
        assert.deepEqual(await backgroundState(), priorBackground, scope + ": 关闭后须恢复原背景禁用状态");
      }
    }
    assert.deepEqual(errors, [], engine.name());
    console.log(engine.name() + "：十语首页和询价页的微信复制反馈、焦点进入/循环/归还与 Esc 通过。");
  } finally { await browser.close(); }
}
assert.deepEqual(writes, [], "不得发送非读取请求");
console.log("零写请求；剪贴板全部使用隔离替身，未读写系统剪贴板。");
