// Exercise actual Firefox text-only zoom; viewport emulation and CSS zoom are not substitutes.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { firefox } from "playwright";

const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:4173").origin;
assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname), "Local browser QA only");
const profile = await mkdtemp(join(tmpdir(), "jabbar-qa-text-zoom-"));
const locales = ["zh","en","es","ar","fr","pt","ru","de","it","tr"];
const options = {viewport:{width:1024,height:768}, reducedMotion:"reduce", firefoxUserPrefs:{"browser.zoom.full":false}};
async function start() {
  const context = await firefox.launchPersistentContext(profile, options);
  await context.route("**/*", route => {
    const r = route.request(), u = new URL(r.url());
    if (u.origin !== origin || !["GET","HEAD"].includes(r.method())) return route.abort();
    if (u.pathname === "/api/consent-region") return route.fulfill({json:{policy:"quiet-denied",gpc:true}});
    return route.continue();
  });
  return context;
}
async function probe(page) {
  await page.goto(origin+"/en/");
  await page.evaluate(() => document.fonts.ready);
  return page.locator("h1").evaluate(el => {
    const r = document.createRange(); r.setStart(el.firstChild,0); r.setEnd(el.firstChild,2);
    return [r.getBoundingClientRect().width, innerWidth, devicePixelRatio];
  });
}
let ctx;
try {
  ctx = await start();
  const before = await probe(await ctx.newPage());
  await ctx.close(); ctx = null;
  // Only the disposable profile created above is ever opened, after Firefox has closed it.
  const db = new DatabaseSync(join(profile, "content-prefs.sqlite"));
  try {
    db.exec(`INSERT INTO settings(name) SELECT 'browser.content.full-zoom' WHERE NOT EXISTS
      (SELECT 1 FROM settings WHERE name='browser.content.full-zoom');
      DELETE FROM prefs WHERE groupID IS NULL AND settingID IN (SELECT id FROM settings WHERE name='browser.content.full-zoom');
      INSERT INTO prefs(settingID,value,timestamp) SELECT id,2.0,0 FROM settings WHERE name='browser.content.full-zoom';`);
  } finally { db.close(); }
  ctx = await start();
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const after = await probe(page);
  assert(Math.abs(after[0]/before[0]-2)<0.03 && before[1]===after[1] && before[2]===after[2], "Native 200% text-only zoom not active");
  for (const [width,height] of [[375,667],[1024,768],[1366,768],[2560,1440]]) {
    await page.setViewportSize({width,height});
    for (const locale of locales) {
      const prefix = locale === "zh" ? "/" : "/"+locale+"/";
      await page.goto(origin+prefix);
      await page.evaluate(() => document.fonts.ready);
      const heading = await page.locator("h1").evaluate(el => {
        const r = document.createRange(); r.selectNodeContents(el);
        return [...r.getClientRects()].filter(b=>b.width).every(b=>b.left>=-1 && b.right<=innerWidth+1);
      });
      assert(heading, `${locale} ${width}: magnified headline outside viewport`);
      const panel = page.locator("header .site-nav-mobile-menu");
      const tool = page.locator("header .site-nav-tool-pill:visible").first();
      if (!await tool.count() && await panel.locator("summary").isVisible()) {
        await panel.locator("summary").click();
      }
      const link = page.locator('header a[href$="calculator/"]:visible').first();
      for (const item of [page.locator("header .site-nav-brand:visible").first(),link]) {
        await item.scrollIntoViewIfNeeded();
        assert(await item.evaluate(el => {
          const b=el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));
        }), `${locale} ${width}: enlarged navigation controls overlap`);
      }
      await link.click({timeout:4500});
      assert.equal(new URL(page.url()).pathname,prefix+"calculator/",`${locale} ${width}: calculator navigation`);
    }
  }
  console.log("Firefox native 200% text-only zoom: fixed viewport and DPR, 40 readable headlines and calculator navigation paths.");
} finally {
  try { if (ctx) await ctx.close(); } finally { await rm(profile,{recursive:true,force:true}); }
}
