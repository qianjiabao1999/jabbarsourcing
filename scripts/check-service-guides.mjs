import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["quality-inspection", "consolidation-shipping"];
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const deployment = await readFile(resolve(root, ".github/workflows/deploy.yml"), "utf8");
for (const slug of pages) {
  const file = `en/${slug}.html`;
  const html = await readFile(resolve(root, file), "utf8");
  const url = `https://www.jabbarsourcing.com/${file}`;
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: 应有唯一主标题`);
  assert(html.includes(`<link rel="canonical" href="${url}"`), `${file}: canonical错误`);
  assert(html.includes(`hreflang="en" href="${url}"`) && html.includes(`hreflang="x-default" href="${url}"`), `${file}: 英文独立语言声明错误`);
  assert.equal((html.match(/hreflang=/g) || []).length, 2, `${file}: 不得虚构未发布翻译页`);
  assert(html.includes('class="site-nav-quote site-nav-quote-desktop" href="/en/inquiry/"'), `${file}: 询盘入口缺失`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert(schemas.some(s => s["@type"] === "Article" && s.mainEntityOfPage === url), `${file}: Article结构化数据错误`);
  assert(sitemap.includes(`<loc>${url}</loc>`), `${file}: sitemap缺失`);
  assert(deployment.includes(`--include='/${file}'`), `${file}: 发布白名单缺失`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[^\"]*)"/g)) {
    const route = match[1];
    if (route.startsWith("//")) continue;
    await access(resolve(root, `.${route.endsWith("/") ? route + "index.html" : route}`));
  }
}
console.log("两篇服务指南元数据、站内链接和发布链检查通过。");
