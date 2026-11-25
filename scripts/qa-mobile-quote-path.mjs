// 只走买家前端路径。正式域名也可复查，不提交、不给商家发消息。
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

const base = new URL(process.env.BASE_URL || "http://127.0.0.1:4173").origin;
const proof = process.env.QUOTE_PROOF_DIR;
const locales = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const pathFor = l => l === "zh" ? "/" : "/" + l + "/";
if (proof) await mkdir(proof, { recursive: true });
for (const [name, engine, width, height] of [["Chromium", chromium, 320, 640], ["WebKit", webkit, 390, 844]]) {
  const browser = await engine.launch();
  try {
    for (const [i, locale] of locales.entries()) {
      const label = name + " " + width + "px " + locale;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", serviceWorkers: "block", hasTouch: true });
      const writes = [], errors = [];
      try {
        await context.route("**/*", route => {
          const req = route.request();
          if (!["GET","HEAD"].includes(req.method())) {writes.push(req.method());return route.abort();}
          if (new URL(req.url()).origin !== base) return route.abort();
          return route.continue();
        });
        // 不让同意横幅/地区差异干扰导航命中；不允许载入第三方统计。
        await context.addInitScript(() => {try {localStorage.setItem("jabbar.analyticsConsent.v1","denied");} catch {}});
        const page = await context.newPage();
        page.setDefaultTimeout(9000);
        page.on("pageerror", e => errors.push(e.message));
        const home = pathFor(locale), next = locales[(i+1) % locales.length];
        const res = await page.goto(base+home, {waitUntil:"domcontentloaded"});
        assert.equal(res.status(), 200, label);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => document.body.style.getPropertyValue("--phone-home-anchor") !== "");
        const rail = page.locator(".phone-chapters");
        const checkEdges = () => page.waitForFunction(() => {
          const bar = document.querySelector(".phone-chapters"), r = bar.getBoundingClientRect();
          const items = [...bar.querySelectorAll("a")].map(a => a.getBoundingClientRect());
          return bar.hasAttribute("data-more-left") === items.some(b => b.left < r.left-1) &&
            bar.hasAttribute("data-more-right") === items.some(b => b.right > r.right+1);
        });
        await checkEdges();
        const quote = page.locator(".phone-quote"), pos = await quote.boundingBox();
        const railPos = await rail.boundingBox();
        assert(pos.x >= railPos.x+railPos.width-1, label+": 报价按钮物理右侧");
        assert(await quote.evaluate(a => {const r=document.createRange();r.selectNodeContents(a);const t=r.getBoundingClientRect(),b=a.getBoundingClientRect();return Math.abs(t.left+t.right-b.left-b.right)<=2;}),label+": 文案正中");
        const reviews = rail.locator('[href="#reviews"]');
        await reviews.scrollIntoViewIfNeeded();
        await checkEdges();
        await reviews.click();
        await page.waitForFunction(() => {
          const active=document.querySelectorAll('.phone-chapters [aria-current="location"]');
          const gap=document.querySelector("#reviews").getBoundingClientRect().top-document.querySelector("header.site-nav").getBoundingClientRect().bottom;
          return active.length===1 && active[0].hash==="#reviews" && gap>=10 && gap<=19;
        });
        assert(Math.abs((await quote.boundingBox()).x-pos.x)<=1, label+": 滑动后报价按钮不移位");
        if (proof && locale==="en") await page.screenshot({path:join(proof,name+"-home-en.png")});
        await quote.click();
        await page.waitForURL(base + home + "inquiry/");
        await page.locator(".inquiry-phone-title").waitFor({state:"visible"});
        assert(await page.locator("header.site-nav").evaluate(h=>h.getBoundingClientRect().height<=96),label+": 询价页头紧凑");
        const product=page.locator('[name="product"]'), reference=page.locator('[name="referenceUrl"]');
        if (proof && locale==="zh") {
          const details=await page.locator(".inquiry-additional-summary").boundingBox();
          await page.screenshot({path:join(proof,name+"-inquiry-zh.png"),clip:{x:0,y:0,width,height:Math.min(height,Math.ceil(details.y+details.height+8))}});
        }
        await product.focus();
        const y = await product.evaluate(e=>e.getBoundingClientRect().top+scrollY);
        await product.press("A");
        await page.waitForFunction(()=>!!JSON.parse(sessionStorage.getItem("jabbarInquiryDraftV1"))?.fields.product);
        assert(Math.abs(await product.evaluate(e=>e.getBoundingClientRect().top+scrollY)-y)<=1,label+": 首字输入框不能下跳");
        await page.locator(".inquiry-reference-details > summary").click();
        assert.equal(await page.locator(".inquiry-additional-details").evaluate(d=>d.open),false,label+": 只加链接不展开其余六项");
        await reference.fill("not-a-link");await reference.press("Tab");
        assert.equal(await reference.getAttribute("aria-invalid"),"true",label);
        assert(await page.locator("#inquiry-reference-error").isVisible(),label+": 就地提示");
        assert((await reference.getAttribute("aria-describedby")||"").split(/\s+/).includes("inquiry-reference-error"),label+": 读屏关联错误说明");
        await reference.fill("www.example.invalid/product");await reference.press("Tab");
        assert.equal(await reference.inputValue(),"https://www.example.invalid/product",label);
        assert.notEqual(await reference.getAttribute("aria-invalid"),"true",label);
        const contact=page.locator('main a[href="#contact"]:visible').first();
        await contact.click();
        await page.waitForURL(base+home+"inquiry/#contact");
        await page.locator(".site-nav-language > summary").click();
        await page.locator('.site-nav-language a[lang="'+(next==="zh"?"zh-CN":next)+'"]').click();
        await page.waitForURL(base+pathFor(next)+"inquiry/#contact");
        await page.waitForFunction(()=>{const b=document.querySelector("#contact").getBoundingClientRect();return b.top<innerHeight && b.bottom>0;});
        assert.equal(await product.inputValue(),"A", label+": 换语保留草稿");
        assert.equal(await reference.inputValue(),"https://www.example.invalid/product", label);
        assert.deepEqual(writes,[], label+": 不得提交");
        assert.deepEqual(errors,[], label+": 脚本异常");
        console.log(label+" 通过");
      } finally {await context.close();}
    }
  } finally {await browser.close();}
}
