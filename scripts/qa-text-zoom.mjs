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
const options = {viewport:{width:1024,height:768}, reducedMotion:"reduce", timeout:45000, firefoxUserPrefs:{"browser.zoom.full":false}};
const started = Date.now();
let stage = "starting";
function mark(label) {
  stage = label;
  console.log(`[text-zoom +${Math.round((Date.now()-started)/1000)}s] ${label}`);
}
// Playwright action deadlines don't cover all protocol promises (notably context.close and evaluate).
function bounded(label, ms, action) {
  mark(label);
  let timer;
  return Promise.race([
    Promise.resolve().then(action),
    new Promise((_,reject) => { timer=setTimeout(()=>reject(new Error(`${label}: exceeded ${ms}ms (last: ${stage})`)),ms); }),
  ]).finally(()=>clearTimeout(timer));
}
const watchdog = setTimeout(()=>{
  console.error(`Firefox text-only zoom: exceeded 6 minutes at ${stage}`);
  process.exit(1);
},360000);
watchdog.unref();
let ctx;
async function start() {
  ctx = await firefox.launchPersistentContext(profile, options);
  ctx.setDefaultTimeout(12000);
  ctx.setDefaultNavigationTimeout(20000);
  await ctx.route("**/*", route => {
    const r = route.request(), u = new URL(r.url());
    if (u.origin !== origin || !["GET","HEAD"].includes(r.method())) return route.abort();
    if (u.pathname === "/api/consent-region") return route.fulfill({json:{policy:"quiet-denied",gpc:true}});
    return route.continue();
  });
  // Persistent Firefox creates an initial tab. Use it instead of leaving a background tab
  // waiting for layout/animation frames while another tab owns the foreground.
  const page=ctx.pages()[0] ?? await ctx.newPage();
  await page.bringToFront();
  return page;
}
async function open(page,path,label) {
  mark(label+" navigation");
  await page.bringToFront();
  const response=await page.goto(origin+path,{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200,label+": expected HTTP 200");
  mark(label+" visible text and fonts");
  await page.waitForFunction(()=>{
    const h=document.querySelector("h1");
    return document.visibilityState==="visible" && h?.getBoundingClientRect().width>0 && document.fonts.status==="loaded";
  },null,{polling:100,timeout:12000});
}
async function probe(page,label) {
  await open(page,"/en/",label);
  return page.locator("h1").evaluate(el => {
    const r = document.createRange(); r.setStart(el.firstChild,0); r.setEnd(el.firstChild,2);
    return [r.getBoundingClientRect().width, innerWidth, devicePixelRatio];
  });
}
try {
  const initial = await bounded("launch Firefox at 100%",55000,start);
  const before = await bounded("baseline calibration",40000,()=>probe(initial,"100%"));
  await bounded("close baseline Firefox",20000,()=>ctx.close()); ctx = null;
  mark("write native zoom preference in disposable profile");
  // Only the disposable profile created above is ever opened, after Firefox has closed it.
  const db = new DatabaseSync(join(profile, "content-prefs.sqlite"));
  try {
    db.exec(`INSERT INTO settings(name) SELECT 'browser.content.full-zoom' WHERE NOT EXISTS
      (SELECT 1 FROM settings WHERE name='browser.content.full-zoom');
      DELETE FROM prefs WHERE groupID IS NULL AND settingID IN (SELECT id FROM settings WHERE name='browser.content.full-zoom');
      INSERT INTO prefs(settingID,value,timestamp) SELECT id,2.0,0 FROM settings WHERE name='browser.content.full-zoom';`);
  } finally { db.close(); }
  const page = await bounded("relaunch Firefox at 200%",55000,start);
  const after = await bounded("200% calibration",40000,()=>probe(page,"200%"));
  assert(Math.abs(after[0]/before[0]-2)<0.03 && before[1]===after[1] && before[2]===after[2], `Native 200% text-only zoom not active: ${JSON.stringify({before,after})}`);
  // 真正使用 200% 纯文本缩放：语言面板不能盖住增高后的页头，也不能让末项滚不到。
  for (const [width,height] of [[320,568],[390,844],[667,320]]) {
    await page.setViewportSize({width,height});
    for (const locale of width===667 ? ["de","ar"] : locales) {
      await bounded(`询价页/200% 字号/${locale}/${width}`,18000,async()=>{
        const prefix=locale==="zh"?"/":"/"+locale+"/";
        await page.goto(origin+prefix+"inquiry/#contact",{waitUntil:"load"});
        await page.evaluate(()=>document.fonts.ready);
        const menu=page.locator(".site-nav-language"), summary=menu.locator("summary");
        const header=page.locator("header.site-nav");
        const assertContact=()=>page.waitForFunction(()=>{
          const target=document.querySelector("#contact").getBoundingClientRect();
          return target.top>=document.querySelector("header.site-nav").getBoundingClientRect().bottom-1
            && target.top<innerHeight && target.bottom>target.top;
        },null,{timeout:4000,polling:100});
        await assertContact();
        await summary.click();
        const bounds=await header.evaluate(el=>{
          const h=el.getBoundingClientRect(),p=el.querySelector(".language-options").getBoundingClientRect();
          const hits=[".site-nav-mobile-return-home",".site-nav-language summary"].every(s=>{
            const n=el.querySelector(s),r=n.getBoundingClientRect();
            return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
          });
          return {bottom:p.bottom,visible:innerHeight,top:p.top,header:h.bottom,hits,overflow:document.documentElement.scrollWidth-innerWidth};
        });
        assert(bounds.hits && bounds.overflow<=1 && bounds.top>=bounds.header-1 && bounds.bottom<=bounds.visible+1,
          "语言面板不得覆盖控制或超出视口："+JSON.stringify(bounds));
        const options=menu.locator(".language-options a"); assert.equal(await options.count(),10);
        const last=options.last();
        await last.scrollIntoViewIfNeeded();
        assert(await last.evaluate(a=>{const r=a.getBoundingClientRect();return a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),"末项必须可点");
        await page.keyboard.press("Escape");
        assert(await summary.evaluate(el=>!el.parentElement.open && document.activeElement===el),"Esc 应关闭面板并返回语言按钮");
        await summary.click();
        const to=locale==="tr"?"en":"tr";
        await Promise.all([
          page.waitForURL(origin+"/"+to+"/inquiry/#contact"),
          menu.locator('a[lang="'+to+'"]').click()
        ]);
        await assertContact();
      });
    }
  }
  for (const [width,height] of [[375,667],[1024,768],[1366,768],[2560,1440]]) {
    await bounded(`viewport ${width}x${height}`,12000,()=>page.setViewportSize({width,height}));
    for (const locale of locales) {
      const label=locale+" "+width+"px";
      await bounded(label,60000,async()=>{
        const prefix = locale === "zh" ? "/" : "/"+locale+"/";
        await open(page,prefix,label);
        mark(label+" headline and navigation hit targets");
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
        mark(label+" follow calculator link");
        await Promise.all([
          page.waitForURL(origin+prefix+"calculator/",{waitUntil:"domcontentloaded",timeout:15000}),
          link.click({timeout:12000}),
        ]);
        assert.equal(new URL(page.url()).pathname,prefix+"calculator/",`${locale} ${width}: calculator navigation`);
      });
    }
  }
  console.log("Firefox native 200% text-only zoom: fixed viewport and DPR, 40 homepage paths and 22 inquiry menu/anchor paths.");
} finally {
  try {
    if (ctx) await bounded("close Firefox",20000,()=>ctx.close());
    await bounded("remove disposable profile",10000,()=>rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:150}));
  } finally {
    clearTimeout(watchdog);
  }
}
