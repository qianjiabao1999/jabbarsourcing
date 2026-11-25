// 发布前在回环预览上逐页实测，不访问外站或调用生产 API。
import assert from "node:assert/strict";
import { readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = new URL(process.env.BASE_URL || "http://127.0.0.1:4173").origin;
assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname), "仅允许本地测试站");
const domain = "https://www.jabbarsourcing.com";
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname).concat("/404.html");
assert.equal(new Set(paths).size, 46, "发布页面清单");
const langs = ["en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const profiles = [[320,568],[390,844],[844,390],[768,1024],[1440,900]];
const problems = new Set(), ids = new Map(), links = new Set();
const notFound = await readFile(resolve(root,"404.html"),"utf8");
let count = 0;
function add(message) { problems.add(message); }
async function checkNavigation(page, width, height) {
  for(const path of ["/support.html","/privacy-policy.html","/website-privacy-policy.html"]) {
    await page.goto(base+path);
    const toggle=page.locator(".menu-toggle"), nav=page.locator(".main-nav");
    await toggle.click();
    assert(await nav.isVisible());
    assert(await toggle.evaluate(b=>b.getBoundingClientRect().height >= 44));
    assert(await nav.locator("a").evaluateAll(aa=>aa.every(a=>a.getBoundingClientRect().height>=44)));
    await nav.locator("a").first().focus();
    await page.keyboard.press("Escape");
    assert.equal(await toggle.getAttribute("aria-expanded"),"false");
    assert(await toggle.evaluate(b=>document.activeElement===b));
    await toggle.click();
    await page.setViewportSize({width:1440,height:900});
    await page.waitForFunction(()=>document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="false");
    assert(await page.evaluate(()=>getComputedStyle(document.body).overflow!=="hidden"));
    await page.setViewportSize({width,height});
    assert(!(await nav.isVisible()),path+": 转回手机时菜单必须保持关闭");
  }
}
async function checkMissingPages(page) {
  // 与 GitHub Pages 相同：缺失的路径仍返回 404，正文取自本版 404.html。
  await page.route("**/__qa_missing__/item", route=>route.fulfill({status:404,contentType:"text/html",body:notFound}));
  for(const lang of ["zh",...langs,"ja"]) {
    const prefix=lang==="zh"?"/":"/"+lang+"/";
    const response=await page.goto(base+prefix+"__qa_missing__/item");
    assert.equal(response.status(),404);
    const known=lang!=="ja";
    assert.equal(await page.locator("html").getAttribute("lang"),known?(lang==="zh"?"zh-CN":lang):"en");
    assert.equal(await page.locator("html").evaluate(el=>getComputedStyle(el).direction),lang==="ar"?"rtl":"ltr");
    for(const a of [".not-found-actions a",".not-found-logo"]) assert.equal(await page.locator(a).getAttribute("href"),known?prefix:"/en/");
  }
}
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const [width,height] of profiles) {
      const mobile = width < 1000;
      const ctx = await browser.newContext({viewport:{width,height}, isMobile:mobile, hasTouch:mobile, reducedMotion:"reduce", serviceWorkers:"block"});
      await ctx.addInitScript(() => Object.defineProperty(navigator,"globalPrivacyControl",{value:true,configurable:true}));
      await ctx.route("**/*", route => {
        const req = route.request(), u = new URL(req.url());
        if (!["GET","HEAD"].includes(req.method()) || u.origin !== base) return route.abort();
        if (u.pathname === "/api/consent-region") return route.fulfill({json:{policy:"quiet-denied",gpc:true}});
        return route.continue();
      });
      const page = await ctx.newPage();
      page.on("pageerror", e => add(engine.name()+" "+new URL(page.url()).pathname+" 脚本异常 "+e.message));
      page.on("response", response => {
        const u = new URL(response.url());
        if (u.origin === base && response.status() >= 400 && u.pathname !== "/404.html" && !u.pathname.endsWith("/__qa_missing__/item")) add(u.pathname+" HTTP "+response.status());
      });
      for (const path of paths) {
        const label=engine.name()+" "+width+"×"+height+" "+path;
        const response=await page.goto(base+path,{waitUntil:"load"});
        assert(response && (response.ok() || path==="/404.html" && response.status()===404), label);
        const p=await page.evaluate(() => {
          const doc=document.documentElement;
          return {lang:doc.lang,dir:getComputedStyle(doc).direction,viewport:doc.clientWidth,
            overflow:doc.scrollWidth-doc.clientWidth, h1:document.querySelectorAll("h1").length,
            title:document.title.trim(), canonical:document.querySelector("link[rel=canonical]")?.href,
            ids:[...document.querySelectorAll("[id]")].map(n=>n.id),
            hrefs:[...document.querySelectorAll("a[href]")].map(n=>n.href),
            broken:[...document.images].filter(i=>i.complete && i.currentSrc && !i.naturalWidth).map(i=>i.currentSrc)};
        });
        const code = path.split("/")[1];
        const lang = langs.includes(code) ? code : ["/support.html","/privacy-policy.html","/404.html"].includes(path) ? "en" : "zh";
        if(p.lang.split("-")[0]!==lang || p.dir!==(lang==="ar"?"rtl":"ltr")) add(label+" 页面语言/阅读方向错误");
        if(!p.title || p.h1!==1 || p.canonical!==domain+path) add(label+" 标题或规范链接错误");
        if(width<=390 && path.endsWith("/inquiry/")){
          await page.evaluate(()=>document.fonts.ready);
          const clipped=await page.locator('.js-inquiry-form input[name="product"], .js-inquiry-form input[name="contact"]').evaluateAll(inputs=>inputs.filter(input=>{
            const s=getComputedStyle(input,"::placeholder"), box=getComputedStyle(input);
            const c=document.createElement("canvas").getContext("2d"); c.font=s.fontWeight+" "+s.fontSize+" "+s.fontFamily;
            const spacing=parseFloat(s.letterSpacing)||0;
            return c.measureText(input.placeholder).width+Math.max(0,input.placeholder.length-1)*spacing>
              input.clientWidth-parseFloat(box.paddingLeft)-parseFloat(box.paddingRight)+1;
          }).map(input=>input.name));
          if(clipped.length) add(label+" 手机输入提示被截断："+clipped.join("、"));
        }
        if(Math.abs(p.viewport-width)>1 || p.overflow>1) add(label+" 视口宽 "+p.viewport+"，横向溢出 "+p.overflow+"px");
        if(new Set(p.ids).size!==p.ids.length) add(label+" 重复 ID："+p.ids.filter((x,i,a)=>a.indexOf(x)!==i).join(","));
        p.broken.forEach(url=>add(label+" 图片解码失败 "+url));
        if(!ids.has(path)) ids.set(path,new Set());
        p.ids.forEach(id=>ids.get(path).add(id));
        for(const href of p.hrefs) {
          const u=new URL(href,base+path);
          if([base,domain].includes(u.origin)) links.add(JSON.stringify([path,u.pathname,u.hash]));
        }
        count++;
      }
      if (width===390) await checkNavigation(page,width,height);
      if (width===390 || width===1440) await checkMissingPages(page);
      await ctx.close();
      console.log(engine.name(), width+"×"+height, paths.length+" 页已检查");
    }
  } finally { await browser.close(); }
}
for(const record of links){
  const [from,to,hash] = JSON.parse(record);
  if(ids.has(to)){
    if(hash.length>1 && !ids.get(to).has(decodeURIComponent(hash.slice(1)))) add(from+" → "+to+hash+" 锚点不存在");
  }else{
    const file=resolve(root,"."+decodeURIComponent(to));
    if(!file.startsWith(root) || !(await stat(file).catch(()=>null))?.isFile()) add(from+" → "+to+" 站内目标不存在");
  }
}
const result={pages:paths.length,combinations:count,internalLinks:links.size,failures:[...problems].sort()};
if(process.env.QA_PUBLIC_REPORT) await writeFile(process.env.QA_PUBLIC_REPORT,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
assert.equal(problems.size,0,"存在需处理的页面问题");
