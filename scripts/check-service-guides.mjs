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
// FAQ 不只是搜索引擎数据：九个问题及答案必须与买家打开的折叠面板一致。
const inspectionTerms = {
  "": ["开箱", "抽样数量"], en: ["cartons", "sample size"], es: ["cajas", "muestra"],
  ar: ["الصناديق", "حجم العينة"], fr: ["cartons", "échantillon"], pt: ["caixas", "amostra"],
  ru: ["коробки", "размер выборки"], de: ["Kartons", "Stichprobe"],
  it: ["cartoni", "campione"], tr: ["Kolileri", "kaç parçanın"],
};
const plainText = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
for (const [lang, terms] of Object.entries(inspectionTerms)) {
  const file = lang ? `${lang}/index.html` : "index.html";
  const html = await readFile(resolve(root, file), "utf8");
  const faq = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1])).find((s) => s["@type"] === "FAQPage");
  assert(faq, `${file}: 缺少 FAQPage`);
  const published = [...html.matchAll(/<details class="faq-item"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)]
    .map(([, q, a]) => [plainText(q), plainText(a)]);
  assert.equal(published.length, 9, `${file}: 可见 FAQ 数量异常`);
  assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), published,
    `${file}: FAQPage 与可见问答不一致`);
  assert(published.some(([, a]) => terms.every((term) => a.includes(term))),
    `${file}: 质检范围必须区分开箱和抽样检查`);
}
for (const slug of ["quality-inspection", "yiwu-sourcing-guide"]) {
  const html = await readFile(resolve(root, `en/${slug}.html`), "utf8");
  assert(html.includes("sampled units") && html.includes("sample size") && !html.includes("opens cartons and packages one by one"),
    `${slug}: 质检指南应说明按订单确认抽样范围`);
}
console.log("服务指南元数据、站内链接、发布链，以及十语首页 90 组可见 FAQ 与结构化数据一致性通过。");
