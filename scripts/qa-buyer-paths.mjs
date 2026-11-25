import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:4173";
const output = process.env.QA_BUYER_OUTPUT_DIR;
if (output) await mkdir(output, { recursive: true });
const locales = ["zh","en","ar","de","es","fr","it","pt","ru","tr"];

async function checkMenuExits(page, prefix, scope, sizes) {
  const menu = page.locator(".site-nav-language");
  const summary = menu.locator("summary");
  for (const [width, height] of sizes) {
    const label = scope + "/" + width;
    await page.setViewportSize({width, height});
    const url = base + prefix + "#faq";
    await page.goto(url);
    await page.locator(".faq-quick-tag").first().waitFor({state:"attached"});
    const open = async () => {
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await summary.getAttribute("aria-expanded"), "true", label + ": 打开语言菜单");
    };
    for (const forward of [true, false]) {
      await open();
      if (forward) await menu.locator("a[lang]").last().focus();
      await page.keyboard.press(forward ? "Tab" : "Shift+Tab");
      assert.equal(await menu.evaluate(el => el.contains(document.activeElement)), false, label + ": 保留实际 Tab 目的地");
      assert.equal(await summary.getAttribute("aria-expanded"), "false", label + ": 离开语言菜单时应收起");
      assert.equal(await menu.evaluate(el => el.open), false);
    }
    await open();
    const current = menu.locator("a[aria-current]");
    assert.equal(await current.evaluate(el => el.href), url);
    await current.focus();
    await page.keyboard.press("Enter");
    assert.equal(page.url(), url);
    assert.equal(await menu.evaluate(el => el.open), false, label + ": 重选当前语言应收起而非覆盖章节");
    assert(await summary.evaluate(el => document.activeElement === el), label + ": 返回触发按钮");
  }
}

async function checkLanguagePanel(page, prefix, scope) {
  for (const [width, height, section, keyboard] of [
    [320, 568, "", true], [320, 568, "inquiry/", false], [320, 568, "calculator/", false],
    [430, 320, "", false], [431, 320, "", true], [1440, 900, "", false],
  ]) {
    const label = `${scope}/${section || "home"}/${width}×${height}`;
    await page.setViewportSize({ width, height });
    await page.goto(base + prefix + section);
    await page.evaluate(() => window.scrollTo(0, 320));
    await page.waitForFunction(() => window.scrollY >= 300);
    const trigger = page.locator(".site-nav-language > summary");
    const panel = page.locator(".site-nav-language .language-options");
    const options = panel.locator("a[lang]");
    if (keyboard) {
      await trigger.focus();
      await page.keyboard.press("Enter");
    } else {
      await trigger.tap();
    }
    await panel.waitFor();
    const rect = await panel.boundingBox();
    assert(rect && rect.x >= -1 && rect.x + rect.width <= width + 1 && rect.y >= -1 && rect.y + rect.height <= height + 1, label + ": 语言面板必须全部留在视口 " + JSON.stringify(rect));
    if (width <= 430) {
      assert(Math.abs(rect.x - 12) <= 1 && Math.abs(rect.x + rect.width - (width - 12)) <= 1, label + ": 窄屏语言面板应紧贴左右安全边距");
    } else {
      assert(rect.width < width / 2, label + ": 宽屏保留原紧凑下拉框");
    }
    assert.equal(await options.count(), 10, label);
    const focused = link => link.evaluate(el => el === document.activeElement);
    let key = "Tab";
    if (keyboard) {
      for (let i = 0; i < 10; i++) {
        const link = options.nth(i);
        await page.keyboard.press(key);
        if (!i && !(await focused(link))) {
          // Safari/macOS may use Option+Tab for link navigation.
          await trigger.focus();
          if (await trigger.getAttribute("aria-expanded") === "false") await page.keyboard.press("Enter");
          key = "Alt+Tab";
          await page.keyboard.press(key);
        }
        assert(await focused(link), label + ": 键盘应依次聚焦第 " + (i + 1) + " 种语言");
      }
    } else {
      await options.last().scrollIntoViewIfNeeded();
    }
    const point = await options.last().evaluate(el => {
      const r = el.getBoundingClientRect();
      const p = el.parentElement.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      return { x, y, fullyVisible: r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1 && el.contains(document.elementFromPoint(x, y)) };
    });
    assert(point.fullyVisible, label + ": 列表末项必须完整可见且中心可触达 " + JSON.stringify(point));
    const destination = new URL("/tr/" + section, base).href;
    await Promise.all([page.waitForURL(destination), keyboard ? page.keyboard.press("Enter") : page.touchscreen.tap(point.x, point.y)]);
    assert.equal(await page.locator("html").getAttribute("lang"), "tr", label + ": 实际激活末项应切换到土耳其语同类页面");
  }
}

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
        await checkMenuExits(page, prefix, scope, ["ar","de"].includes(lang)
          ? [[320,568],[390,844],[844,390],[1024,768],[1440,900]] : [[390,844]]);
        if (lang === "de" || lang === "ar") await checkLanguagePanel(page, prefix, scope);
        assert.deepEqual(errors, [], scope);
        assert.deepEqual(posts, [], scope);
      } finally { await context.close(); }
    }
    console.log(engine.name() + "：十语短屏报价、询价折叠、手算结果顺序、带结果询价及双向语言菜单断点与切换通过。");
  } finally { await browser.close(); }
}
