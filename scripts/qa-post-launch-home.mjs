import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const ONLY_RACE_QA = process.env.ONLY_RACE_QA === "1";
const ONLY_SHORT_HOME_QA = process.env.ONLY_SHORT_HOME_QA === "1";
const locales = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const homePath = (locale) => locale === "zh" ? "/" : `/${locale}/`;

async function contextFor(browser, width, { height = 900, javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled });
  await context.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true }));
  // 本地验证不加载第三方统计，也不提交表单。
  await context.route(/https:\/\/(?:www\.googletagmanager\.com|www\.google-analytics\.com|www\.clarity\.ms|c\.clarity\.ms)\//, route => route.abort());
  return context;
}

async function waitForScrollSettled(page, scope) {
  // 仅观察真实滚动，不发起或取消滚动；动画或布局持续不稳定必须明确失败。
  const state = await page.evaluate(() => new Promise(resolve => {
    const started = performance.now();
    let lastY = scrollY;
    let stableSince = started;
    let frame;
    const finish = settled => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      resolve({ settled, y: scrollY, elapsed: performance.now() - started });
    };
    const timeout = setTimeout(() => finish(false), 8000);
    const sample = now => {
      if (Math.abs(scrollY - lastY) > 0.25) {
        lastY = scrollY;
        stableSince = now;
      }
      if (now - stableSince >= 180) finish(true);
      else frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
  }));
  assert(state.settled, `${scope}: 滚动在 8 秒内未稳定 ${JSON.stringify(state)}`);
}

async function sectionPosition(page, id) {
  return page.evaluate(id => {
    const section = document.getElementById(id);
    const label = [...section.querySelectorAll(".section-code,h1,h2")].find(element => element.getBoundingClientRect().height > 0)
      || section.querySelector("a,button") || section;
    const box = label.getBoundingClientRect();
    return { headerBottom: document.querySelector(".site-nav").getBoundingClientRect().bottom, top: box.top, bottom: box.bottom, viewport: innerHeight };
  }, id);
}

async function homeChecks(browser, engine, locale, width) {
  const context = await contextFor(browser, width);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const scope = `${engine}/${locale}/${width}`;
  try {
    await page.goto(BASE_URL + homePath(locale), { waitUntil: "domcontentloaded" });
    await page.locator(".faq-quick-tag").first().waitFor({ state: "attached" });
    const photo = page.locator(".hero-site-photo img");
    if (width <= 390) {
      await photo.evaluate((image) => image.decode());
      await page.evaluate(() => document.fonts.ready);
      const hero = await page.evaluate(() => {
        const nav = document.querySelector("header.site-nav").getBoundingClientRect();
        const photo = document.querySelector(".hero-site-photo img");
        const controls = [".site-nav-brand", ".site-nav-quote-action", ".site-nav-language > summary", ".site-nav-mobile-menu > summary"]
          .map((selector) => document.querySelector(selector).getBoundingClientRect().toJSON());
        const minimums = document.querySelector(".hero-order-minimums");
        return {
          navHeight: nav.height,
          controls,
          photoBottom: photo.getBoundingClientRect().bottom,
          photoSource: photo.currentSrc,
          photoAlt: photo.alt,
          quoteTop: document.querySelector(".inquiry-entry-button").getBoundingClientRect().top,
          minimumsBottom: minimums.getBoundingClientRect().bottom,
          minimumsScrollWidth: minimums.scrollWidth,
          minimumsWidth: minimums.clientWidth,
          amounts: [...minimums.querySelectorAll("dd")].map((item) => item.textContent.replace(/[^0-9]/g, ""))
        };
      });
      assert(hero.navHeight <= 76, `${scope}: 首页吸顶导航应保持单行 ${JSON.stringify(hero)}`);
      for (const box of hero.controls) {
        assert(box.width >= 44 && box.height >= 44 && box.left >= 0 && box.right <= width, `${scope}: 首页四个触控入口完整可见 ${JSON.stringify(box)}`);
      }
      const leftToRight = hero.controls.slice().sort((first, second) => first.left - second.left);
      leftToRight.slice(1).forEach((box, index) => assert(box.left >= leftToRight[index].right, `${scope}: 首页导航入口不能重叠`));
      assert(hero.photoAlt && /landscape-05-(480|960)\.webp/.test(hero.photoSource), `${scope}: 首屏显示有描述的真实仓库图片`);
      assert(hero.photoBottom <= 550, `${scope}: 短屏应可完整看见仓库图片`);
      assert(hero.quoteTop >= hero.minimumsBottom && hero.quoteTop - hero.minimumsBottom <= 24, `${scope}: 起订规则紧邻并先于报价按钮`);
      assert(hero.minimumsScrollWidth <= hero.minimumsWidth, `${scope}: 起订规则不能横向溢出`);
      assert.deepEqual(hero.amounts, ["1000", "3000", "10000"], `${scope}: 三档现有采购金额`);
    } else {
      assert(!(await photo.isVisible()), `${scope}: 手机首屏图片不能改变桌面首屏`);
      assert(!(await page.locator(".hero-order-minimums").isVisible()), `${scope}: 桌面原报价布局保留`);
      assert(!(await page.locator(".hero-first-reply").isVisible()), `${scope}: 桌面不会重复时效说明`);
    }
    const year = page.locator(".company-metric-card").first().locator(".company-metric-visual");
    const expectedYear = await page.locator(".company-metric-card").first().locator("strong .sr-only").textContent();
    assert.match(expectedYear, /2008/, `${scope}: 成立年份源值`);
    assert.equal(await year.textContent(), expectedYear, `${scope}: 成立年份在入场前不能变成零`);
    await page.locator(".company-metrics").scrollIntoViewIfNeeded();
    for (let sample = 0; sample < 4; sample += 1) {
      await page.waitForTimeout(100);
      assert.equal(await year.textContent(), expectedYear, `${scope}: 成立年份不得递增`);
    }
    await page.waitForTimeout(900);
    const metrics = await page.locator(".company-metric-card strong").evaluateAll(elements => elements.map(element => {
      const visual = element.querySelector(".company-metric-visual");
      const number = element.querySelector(".company-metric-number");
      const card = element.closest(".company-metric-card").getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(visual);
      const text = range.getBoundingClientRect();
      return { font: getComputedStyle(element).fontSize, visualFont: getComputedStyle(visual).fontSize, numberFont: getComputedStyle(number).fontSize, labelFont: getComputedStyle(element.parentElement.querySelector(":scope > span")).fontSize, weight: getComputedStyle(element).fontWeight, visualWeight: getComputedStyle(visual).fontWeight, left: text.left, right: text.right, cardLeft: card.left, cardRight: card.right };
    }));
    assert.equal(metrics.length, 5, `${scope}: 五项数字及读屏包装保持`);
    for (const metric of metrics) {
      assert.equal(metric.visualFont, metric.font, `${scope}: 数字包装字号继承`);
      assert.equal(metric.numberFont, metric.font, `${scope}: 数字字号继承`);
      assert.equal(metric.visualWeight, metric.weight, `${scope}: 数字字重继承`);
      assert(Number.parseFloat(metric.numberFont) > Number.parseFloat(metric.labelFont), `${scope}: 数字应比说明文字醒目`);
      assert(metric.left >= metric.cardLeft - 1 && metric.right <= metric.cardRight + 1, `${scope}: 数字不能溢出卡片`);
    }

    await page.locator("#faq").scrollIntoViewIfNeeded();
    const tags = await page.locator(".faq-quick-tags").evaluate(group => {
      const bounds = group.getBoundingClientRect();
      return { width: group.clientWidth, scrollWidth: group.scrollWidth, left: bounds.left, right: bounds.right, buttons: [...group.children].map(button => {
        const rect = button.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(button);
        const text = range.getBoundingClientRect();
        return { label: button.textContent, left: rect.left, right: rect.right, top: rect.top, height: rect.height, textLeft: text.left, textRight: text.right };
      }) };
    });
    assert.equal(tags.buttons.length, 9, `${scope}: 九个主题全部保留`);
    assert(tags.scrollWidth <= tags.width + 1, `${scope}: FAQ 不应隐藏横向主题`);
    assert(new Set(tags.buttons.map(button => Math.round(button.top))).size > 1, `${scope}: FAQ 应自然换行`);
    for (const button of tags.buttons) {
      assert(button.height >= 44, `${scope}/${button.label}: 触控高度`);
      assert(button.left >= tags.left - 1 && button.right <= tags.right + 1, `${scope}/${button.label}: 按钮不越出容器`);
      assert(button.textLeft >= button.left - 1 && button.textRight <= button.right + 1, `${scope}/${button.label}: 文字不越出按钮`);
    }
    assert.equal(await page.locator(".faq-item:not([hidden])").count(), 0, `${scope}: 默认仍由买家选择主题`);
    await page.locator(".faq-quick-tag").nth(8).click();
    await page.waitForFunction(() => document.querySelectorAll(".faq-quick-tag")[8]?.getAttribute("aria-expanded") === "true");
    assert.equal(await page.locator(".faq-item:not([hidden])[open]").count(), 1, `${scope}: 选中主题显示一条答案`);
    assert.equal(await page.locator(".faq-quick-tag").nth(8).getAttribute("aria-expanded"), "true", `${scope}: 主题无障碍状态`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${scope}: 无整页横向溢出`);
    assert.deepEqual(errors, [], `${scope}: 浏览器错误`);
    if (["zh", "en", "ar"].includes(locale)) {
      // 保留章节的语言切换须真正可读，不能只验证 URL 有 hash。
      for (const id of ["team", "services", "how-it-works", "reviews", "faq", "social-accounts", "contact"]) {
        await page.evaluate(id => {
          const section = document.getElementById(id);
          document.documentElement.style.scrollBehavior = "auto";
          location.hash = id;
          section.scrollIntoView({ block: "start", behavior: "instant" });
        }, id);
        await waitForScrollSettled(page, `${scope}/#${id}`);
        const heading = await sectionPosition(page, id);
        assert(heading.top >= heading.headerBottom + 15 && heading.bottom <= heading.viewport, `${scope}/#${id}: 章节编号或标题必须可见且不被导航遮挡 ${JSON.stringify(heading)}`);
      }
    }
    if (width <= 390) {
      await page.goto(BASE_URL + homePath(locale) + "inquiry/", { waitUntil: "domcontentloaded" });
      await page.locator(".site-nav-language > summary[aria-expanded]").waitFor();
      const controls = await page.locator(".site-nav-brand,.site-nav-return-home,.site-nav-language > summary,.site-nav-mobile-menu > summary").evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        return { class: element.className, width: box.width, height: box.height, left: box.left, right: box.right, textLeft: text.left, textRight: text.right, textWidth: text.width };
      }));
      assert.equal(controls.length, 4, `${scope}: 紧凑询盘四个入口`);
      for (const control of controls) {
        assert(control.width >= 44 && control.height >= 44 && control.left >= -1 && control.right <= width + 1, `${scope}: 询盘入口显示与44px目标 ${JSON.stringify(control)}`);
        assert(control.textWidth === 0 || control.textLeft >= control.left - 1 && control.textRight <= control.right + 1, `${scope}: 询盘入口文字不能截断 ${JSON.stringify(control)}`);
      }
      assert(await page.locator(".site-nav").evaluate(element => element.getBoundingClientRect().height <= 76), `${scope}: 询盘紧凑导航高度`);
    }
  } finally {
    await context.close();
  }
}

async function shortHomeChecks(browser, engine, locale) {
  const context = await contextFor(browser, 320, { height: 568 });
  const page = await context.newPage();
  const scope = `${engine}/${locale}/320×568`;
  const url = BASE_URL + homePath(locale);
  const links = page.locator(".sourcing-faq-links a");
  async function assertAnswer(answerPage, id) {
    const summary = answerPage.locator(`#${id} > summary`);
    await answerPage.waitForFunction((id) => {
      const item = document.getElementById(id);
      const heading = item?.querySelector("summary");
      return item?.open && !item.hidden && heading?.getBoundingClientRect().top >= document.querySelector(".site-nav").getBoundingClientRect().bottom
        && heading.getBoundingClientRect().bottom <= innerHeight;
    }, id, { timeout: 8000 });
    await waitForScrollSettled(answerPage, `${scope}/#${id}`);
    const heading = await summary.evaluate(element => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, header: document.querySelector(".site-nav").getBoundingClientRect().bottom, height: innerHeight };
    });
    assert(heading.top >= heading.header && heading.bottom <= heading.height, `${scope}/#${id}: 深链答案标题完整可见 ${JSON.stringify(heading)}`);
    assert.equal(await answerPage.locator(".faq-item:not([hidden])[open]").count(), 1, `${scope}: 只展开目标问答`);
    assert.equal(await answerPage.locator(`.faq-quick-tag[aria-controls="${id}"]`).getAttribute("aria-expanded"), "true", `${scope}: 选题与深链状态同步`);
    assert.equal(await answerPage.evaluate(() => history.scrollRestoration), "manual", `${scope}: FAQ 深链不恢复旧的浏览位置`);
  }
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator(".hero-site-photo img").evaluate(image => image.decode());
    await page.evaluate(() => document.fonts.ready);
    const hero = await page.locator(".home-hero-compact").evaluate(element => {
      const photo = element.querySelector(".hero-site-photo");
      const quote = element.querySelector(".quote-entry");
      const reply = quote.querySelector(".hero-first-reply");
      const button = quote.querySelector(".inquiry-entry-button");
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        photo: photo.getBoundingClientRect().toJSON(),
        reply: reply.getBoundingClientRect().toJSON(),
        replyText: reply.innerText,
        minimums: [...quote.querySelectorAll(".hero-order-minimums dd")].map(amount => ({
          ...amount.getBoundingClientRect().toJSON(),
          amount: amount.innerText.replace(/[^0-9]/g, "")
        })),
        button: button.getBoundingClientRect().toJSON()
      };
    });
    assert.equal(hero.documentWidth, hero.width, `${scope}: 短屏不能横向溢出`);
    assert(hero.photo.height >= 100 && hero.photo.bottom <= hero.reply.top, `${scope}: 保留清晰可见的仓库首图`);
    assert(hero.reply.height > 0 && /24/.test(hero.replyText), `${scope}: 报价前可见24小时回复时效`);
    assert.deepEqual(hero.minimums.map(item => item.amount), ["1000", "3000", "10000"], `${scope}: 三档起订额`);
    for (const amount of hero.minimums) {
      assert(amount.height > 0 && amount.top >= hero.reply.bottom && amount.bottom <= hero.button.top
        && amount.left >= 0 && amount.right <= hero.width, `${scope}: 每档金额都完整出现在报价按钮前`);
    }
    assert(hero.button.height >= 48 && hero.button.bottom <= 568, `${scope}: 首屏完整显示报价按钮 ${JSON.stringify(hero)}`);

    assert.deepEqual(await links.evaluateAll(elements => elements.map(link => link.hash)), ["#faq-item-1", "#faq-item-2", "#faq-item-6"], `${scope}: 费用、起订额、拼柜各有一个深链`);
    for (const id of ["faq-item-1", "faq-item-2", "faq-item-6"]) {
      const link = page.locator(`.sourcing-faq-links a[href="#${id}"]`);
      assert(await link.evaluate(element => element.getBoundingClientRect().height >= 44), `${scope}: 深链触控面积`);
      await link.click();
      await page.waitForURL(`${url}#${id}`);
      await assertAnswer(page, id);
    }
    await page.locator('.faq-quick-tag[aria-controls="faq-item-8"]').click();
    assert(await page.locator("#faq-item-8").evaluate(element => element.open && !element.hidden), `${scope}: 手动选择问题覆盖前一个选择`);
    await page.locator('.sourcing-faq-links a[href="#faq-item-6"]').click();
    await assertAnswer(page, "faq-item-6");
    await page.goBack();
    await page.waitForURL(url + "#faq-item-2");
    await assertAnswer(page, "faq-item-2");
    await page.goForward();
    await page.waitForURL(url + "#faq-item-6");
    await assertAnswer(page, "faq-item-6");
    // Return during the native smooth scroll, while the FAQ is still in view.
    // An already-aligned scrollIntoView alone does not cancel that animation.
    await page.evaluate(() => { location.hash = "services"; });
    await page.waitForFunction(() => history.scrollRestoration === "auto", undefined, { timeout: 8000 });
    await page.goBack();
    await page.waitForURL(url + "#faq-item-6");
    await assertAnswer(page, "faq-item-6");

    const direct = await context.newPage();
    await direct.goto(url + "#faq-item-2", { waitUntil: "domcontentloaded" });
    await assertAnswer(direct, "faq-item-2");
  } finally {
    await context.close();
  }
}

async function noScriptFaqLink(browser, locale) {
  const context = await contextFor(browser, 320, { height: 568, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(BASE_URL + homePath(locale));
    const link = page.locator('.sourcing-faq-links a[href="#faq-item-1"]');
    await link.click();
    await page.waitForURL("**/#faq-item-1");
    const item = page.locator("#faq-item-1");
    assert.equal(await item.evaluate(element => !element.hidden && !element.open), true, `${locale}: 无脚本可访问原生折叠问答`);
    const heading = item.locator("summary");
    let lastTop;
    let settled = false;
    // 禁用页面脚本时从测试进程采样原生片段滚动。
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const box = await heading.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return { top: bounds.top, bottom: bounds.bottom, header: document.querySelector(".site-nav").getBoundingClientRect().bottom, viewport: innerHeight };
      });
      if (box.top >= box.header && box.bottom <= box.viewport && Math.abs(box.top - lastTop) < 0.25) {
        settled = true;
        break;
      }
      lastTop = box.top;
      await page.waitForTimeout(100);
    }
    assert(settled, `${locale}: 无脚本深链仍应定位到原生问答`);
    await heading.click({ timeout: 8000 });
    assert(await item.locator("p").isVisible(), `${locale}: 无脚本时可手动打开原答案`);
  } finally {
    await context.close();
  }
}

async function languageChecks(browser, engine, width) {
  const context = await contextFor(browser, width);
  const page = await context.newPage();
  try {
    for (const example of [
      { from: "/en/?test_sensitive=sample#services", lang: "fr", to: "/fr/#services" },
      { from: "/ar/#reviews", lang: "en", to: "/en/#reviews" },
      { from: "/en/#faq-item-2", lang: "ar", to: "/ar/#faq-item-2" },
      { from: "/en/#not-a-section", lang: "ar", to: "/ar/" },
      { from: "/en/calculator/", lang: "ar", to: "/ar/calculator/" },
      { from: "/en/inquiry/", lang: "fr", to: "/fr/inquiry/" }
    ]) {
      await page.goto(BASE_URL + example.from, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelector(".site-nav-language > summary")?.hasAttribute("aria-expanded"));
      await page.locator(".site-nav-language > summary").click();
      await page.locator(`.site-nav-language a[lang="${example.lang}"]`).click();
      await page.waitForURL(BASE_URL + example.to);
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).hash, example.to, `${engine}/${width}: 页首语言路由及章节`);
      assert.equal(new URL(page.url()).search, "", `${engine}/${width}: 不转发查询参数`);
    }
    for (const example of [
      { from: "/en/#faq", locale: "zh", to: "/#faq" },
      { from: "/ar/#faq-item-6", locale: "de", to: "/de/#faq-item-6" },
      { from: "/ar/#contact", locale: "de", to: "/de/#contact" },
      { from: "/en/calculator/", locale: "fr", to: "/fr/calculator/" },
      { from: "/en/inquiry/", locale: "de", to: "/de/inquiry/" }
    ]) {
      await page.goto(BASE_URL + example.from, { waitUntil: "domcontentloaded" });
      await page.locator(".site-footer-language-select").selectOption(example.locale);
      await page.waitForURL(BASE_URL + example.to);
    }
    await page.goto(BASE_URL + "/en/", { waitUntil: "domcontentloaded" });
    await page.locator(".faq-quick-tag").first().waitFor({ state: "attached" });
    await page.evaluate(() => { window.location.hash = "social-accounts"; });
    await page.waitForFunction(() => document.querySelector('.site-nav-language a[lang="fr"]')?.getAttribute("href") === "/fr/#social-accounts");
    await page.evaluate(() => { window.location.hash = "not-a-section"; });
    await page.waitForFunction(() => document.querySelector('.site-nav-language a[lang="fr"]')?.getAttribute("href") === "/fr/");
  } finally {
    await context.close();
  }
}

async function firstAnchorChecks(browser, engine, locale, width) {
  // 每条路径都从新页面开始，不能先滚过画廊或主动scrollIntoView修正位置。
  for (const entry of ["hash", "menu"]) {
    const context = await contextFor(browser, width);
    const page = await context.newPage();
    const scope = `${engine}/${locale}/${width}/${entry}`;
    try {
      await page.goto(BASE_URL + homePath(locale), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      if (entry === "hash") await page.evaluate(() => { location.hash = "how-it-works"; });
      else {
        if (width < 768) {
          await page.locator(".site-nav-mobile-menu > summary").click();
          await page.locator('.site-nav-mobile-panel a[href="#how-it-works"]').click();
        } else await page.locator('.site-nav-links a[href="#how-it-works"]').click();
      }
      await page.waitForFunction(() => {
        const box = document.querySelector("#how-it-works h2").getBoundingClientRect();
        return box.top >= document.querySelector(".site-nav").getBoundingClientRect().bottom + 15 && box.bottom <= innerHeight;
      }, undefined, { timeout: 10000 });
      await page.waitForTimeout(700);
      await waitForScrollSettled(page, scope);
      const position = await page.evaluate(() => {
        const code = document.querySelector("#how-it-works .section-code").getBoundingClientRect();
        return { top: code.top, bottom: code.bottom, header: document.querySelector(".site-nav").getBoundingClientRect().bottom, height: innerHeight };
      });
      assert(position.top >= position.header + 15 && position.bottom <= position.height, `${scope}: 首次自然章节跳转不能被画廊回缩带偏 ${JSON.stringify(position)}`);
    } finally { await context.close(); }
  }
}

async function faqNavigationRaceChecks(browser, engine, locale, width) {
  for (const initialHash of ["", "#team"]) {
    // 每条竞争路径使用新页面；普通动画保留，成立年份测试不受影响。
    const context = await contextFor(browser, width);
    const page = await context.newPage();
    const scope = `${engine}/${locale}/${width}/FAQ→team/${initialHash ? "same-hash" : "new-hash"}`;
    const posts = [];
    page.on("request", request => { if (request.method() === "POST") posts.push(request.url()); });
    await context.route("https://inquiry-api.jabbarsourcing.com/**", route => route.abort());
    try {
      await page.goto(BASE_URL + homePath(locale) + initialHash, { waitUntil: "networkidle" });
      await page.locator(".faq-quick-tag").nth(8).waitFor({ state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#faq").scrollIntoViewIfNeeded();
      await waitForScrollSettled(page, `${scope}/before-click`);
      const held = await page.evaluate(() => {
        const original = window.requestAnimationFrame;
        const callbacks = [];
        // 只控制同步 click 中排队的 FAQ 回调；立即恢复浏览器的原 rAF。
        window.requestAnimationFrame = callback => { callbacks.push(callback); return -callbacks.length; };
        try { document.querySelectorAll(".faq-quick-tag")[8].click(); }
        finally { window.requestAnimationFrame = original; }
        window.__releaseFaqScroll = () => {
          callbacks.forEach(callback => callback(performance.now()));
          delete window.__releaseFaqScroll;
        };
        return { count: callbacks.length, restored: window.requestAnimationFrame === original };
      });
      assert.equal(held.count, 1, `${scope}: 必须恰好捕获真实 FAQ 滚动回调`);
      assert(held.restored, `${scope}: 同步点击后必须立即恢复原 rAF`);
      await page.waitForFunction(() => document.querySelectorAll(".faq-quick-tag")[8].getAttribute("aria-expanded") === "true");
      assert.equal(await page.locator(".faq-item:not([hidden])[open]").count(), 1, `${scope}: 真实第九项答案保持打开`);
      assert.equal(await page.locator("#faq-item-9").evaluate(element => element.open && !element.hidden), true, `${scope}: 答案没有被测试替换`);
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        location.hash = "team";
        document.getElementById("team").scrollIntoView({ block: "start", behavior: "instant" });
        window.__releaseFaqScroll();
      });
      await waitForScrollSettled(page, scope);
      const heading = await sectionPosition(page, "team");
      assert(heading.top >= heading.headerBottom + 15 && heading.bottom <= heading.viewport, `${scope}: 迟到的 FAQ 回调不能覆盖新的章节导航 ${JSON.stringify(heading)}`);
      assert.equal(await page.evaluate(() => location.hash), "#team", `${scope}: 新章节 hash 必须保留`);
      assert.deepEqual(posts, [], `${scope}: 不得发送任何 POST`);
      console.log(`${scope}: 章节保持可见，零 POST`);
    } finally { await context.close(); }
  }
}

for (const [engine, browserType] of [["Chromium", chromium], ["WebKit", webkit]]) {
  const browser = await browserType.launch();
  try {
    if (ONLY_SHORT_HOME_QA) {
      for (const locale of locales) await shortHomeChecks(browser, engine, locale);
      continue;
    }
    if (!ONLY_RACE_QA) {
      const selectedLocales = engine === "Chromium" ? locales : ["zh", "en", "ar"];
      for (const locale of selectedLocales) for (const width of [320, 390, 1440]) await homeChecks(browser, engine, locale, width);
      for (const locale of locales) await shortHomeChecks(browser, engine, locale);
      await noScriptFaqLink(browser, engine === "Chromium" ? "en" : "ar");
      for (const width of [390, 1440]) await languageChecks(browser, engine, width);
      for (const locale of ["zh", "en", "ar"]) for (const width of [320, 390, 1440]) await firstAnchorChecks(browser, engine, locale, width);
    }
    for (const locale of ["zh", "en", "ar"]) for (const width of [390, 1440]) await faqNavigationRaceChecks(browser, engine, locale, width);
  } finally {
    await browser.close();
  }
}
console.log(ONLY_SHORT_HOME_QA
  ? "320×568 FAQ 深链和历史导航通过：十语言，Chromium 与 WebKit。"
  : ONLY_RACE_QA
  ? "FAQ 导航竞争专项通过：12 个语言/尺寸/引擎组合，24 条新 hash/同 hash 路径，零 POST。"
  : "上线后回归通过：39 个首页组合、126 个章节留白、26 个询盘窄屏导航、36 条首次自然锚点；20 个 320×568 报价及 FAQ 深链组合、2 条无脚本路径、24 条 FAQ 导航竞争路径，零 POST。");
