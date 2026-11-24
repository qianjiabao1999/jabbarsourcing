import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:4173";
const output = process.env.QA_BUYER_OUTPUT_DIR;
if (output) await mkdir(output, { recursive: true });
const locales = ["zh","en","ar","de","es","fr","it","pt","ru","tr"];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const lang of locales) {
      const prefix = lang === "zh" ? "/" : "/" + lang + "/";
      const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      const posts = [], errors = [];
      await context.route("**/*", route => {
        const req = route.request();
        if (req.method() === "POST") posts.push(new URL(req.url()).pathname);
        if (!["GET","HEAD"].includes(req.method()) || new URL(req.url()).origin !== new URL(base).origin) return route.abort();
        return route.continue();
      });
      await context.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true }));
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      const screenshot = async name => {
        if (!output || engine !== chromium || lang !== "en") return;
        await page.evaluate(async () => {
          await document.fonts.ready;
          const visibleImages = [...document.images].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width && r.height && r.bottom > 0 && r.top < innerHeight;
          });
          await Promise.all(visibleImages.map(el => el.decode()));
        });
        await page.screenshot({ path: join(output, name + ".png"), animations: "disabled" });
      };
      try {
        const scope = engine.name() + "/" + lang;
        assert.equal((await page.goto(base + prefix)).status(), 200, scope);
        await page.evaluate(() => document.fonts.ready);
        const buy = page.locator(".home-hero-compact .inquiry-entry-button");
        const geometry = await buy.evaluate(el => {
          const b = el.getBoundingClientRect();
          return { bottom:b.bottom, top:b.top, height:b.height, header:document.querySelector(".site-nav").getBoundingClientRect().bottom };
        });
        assert(geometry.height >= 48 && geometry.top >= geometry.header && geometry.bottom <= 568, scope + ": 首屏应完整显示正文报价按钮 " + JSON.stringify(geometry));
        await screenshot("home-320");
        await buy.click();
        await page.waitForURL(base + prefix + "inquiry/");
        await page.setViewportSize({ width:390, height:844 });
        await page.locator("form[data-direct-inquiry-ready=true]").waitFor();
        const optional = page.locator(".inquiry-additional-details");
        assert.equal(await optional.locator('[name=referenceUrl]').count(), 1, scope + ": 选填区应包含原参考链接字段");
        assert.equal(await optional.locator('[name=referenceUrl]').isVisible(), false);
        assert(await page.locator("[name=contact]").isVisible());
        await screenshot("inquiry-390");
        await page.goto(base + prefix + "calculator/");
        const results = page.locator(".calculator-results");
        const summary = results.locator(".calculator-primary-metrics");
        assert.equal(await summary.isVisible(), false);
        for (const [id, value] of [["length","100"],["width","100"],["height","100"],["qty","10"]]) await page.locator("#" + id).fill(value);
        await page.locator("#cbm-calculator button[type=submit]").click();
        const link = results.locator(".calculator-inquiry-cta");
        await link.waitFor();
        await page.waitForFunction(() => {
          const link = document.querySelector(".calculator-results .calculator-inquiry-cta").getBoundingClientRect();
          return link.top >= 0 && link.bottom <= innerHeight;
        });
        assert.equal(await summary.locator("[data-total-cbm],[data-buffer-cbm]").count(), 2);
        const [metrics, quote, visual] = await Promise.all([summary,link,results.locator(".cbm-visual")].map(el=>el.boundingBox()));
        assert(metrics.y + metrics.height <= quote.y + 1 && quote.y + quote.height <= visual.y + 1, scope + ": 总体积和询价应在图示之前");
        await screenshot("result-390");
        await page.setViewportSize({width:1440,height:900});
        await summary.waitFor({state:"detached"});
        assert.equal(await results.locator(".calculator-result-grid [data-total-cbm],.calculator-result-grid [data-buffer-cbm]").count(), 2);
        assert((await results.locator(".cbm-visual").boundingBox()).y < (await link.boundingBox()).y);
        await page.setViewportSize({width:390,height:844});
        await summary.waitFor();
        await link.click();
        await page.waitForURL(base + prefix + "inquiry/");
        await page.locator("form[data-calculator-prefill]").waitFor({state:"attached"});
        await page.locator(".inquiry-estimate summary").click();
        assert.equal(await page.locator("[name=note]").inputValue(), "");
        assert((await page.locator(".inquiry-estimate-text").innerText()).includes("100"), scope + ": 带结果询价不得丢失尺寸");
        assert.deepEqual(errors, [], scope);
        assert.deepEqual(posts, [], scope);
      } finally { await context.close(); }
    }
    console.log(engine.name() + "：十语短屏报价、询价折叠、手算结果顺序、断点恢复与带结果询价通过。");
  } finally { await browser.close(); }
}
