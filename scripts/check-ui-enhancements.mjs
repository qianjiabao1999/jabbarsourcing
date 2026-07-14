#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_VERSION = "apple-162";
const AI_VERSION = "ai-20260714c";
const UI_VERSION = "ui-20260714d";
const ORDER_VERSION = "order-20260714d";
const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const SECTION_CODES = {
  zh: ["Jabbar · 团队", "Jabbar · 图库", "Jabbar · 服务", "Jabbar · 流程", "Jabbar · 关于我们", "Jabbar · 客户评价", "Jabbar · 常见问题", "Jabbar · 社交账号"],
  en: ["Jabbar · Team", "Jabbar · Gallery", "Jabbar · Services", "Jabbar · Process", "Jabbar · About Us", "Jabbar · Reviews", "Jabbar · FAQ", "Jabbar · Social"],
  es: ["Jabbar · Equipo", "Jabbar · Galería", "Jabbar · Servicios", "Jabbar · Proceso", "Jabbar · Sobre nosotros", "Jabbar · Reseñas", "Jabbar · Preguntas frecuentes", "Jabbar · Redes sociales"],
  ar: ["Jabbar · الفريق", "Jabbar · المعرض", "Jabbar · الخدمات", "Jabbar · خطوات العمل", "Jabbar · من نحن", "Jabbar · آراء العملاء", "Jabbar · الأسئلة الشائعة", "Jabbar · التواصل الاجتماعي"],
  fr: ["Jabbar · Équipe", "Jabbar · Galerie", "Jabbar · Services", "Jabbar · Processus", "Jabbar · À propos", "Jabbar · Avis clients", "Jabbar · FAQ", "Jabbar · Réseaux sociaux"],
  pt: ["Jabbar · Equipe", "Jabbar · Galeria", "Jabbar · Serviços", "Jabbar · Processo", "Jabbar · Sobre nós", "Jabbar · Avaliações", "Jabbar · Perguntas frequentes", "Jabbar · Redes sociais"],
  ru: ["Jabbar · Команда", "Jabbar · Галерея", "Jabbar · Услуги", "Jabbar · Процесс", "Jabbar · О нас", "Jabbar · Отзывы", "Jabbar · Частые вопросы", "Jabbar · Соцсети"],
  de: ["Jabbar · Team", "Jabbar · Galerie", "Jabbar · Leistungen", "Jabbar · Ablauf", "Jabbar · Über uns", "Jabbar · Bewertungen", "Jabbar · FAQ", "Jabbar · Soziale Medien"],
  it: ["Jabbar · Team", "Jabbar · Galleria", "Jabbar · Servizi", "Jabbar · Processo", "Jabbar · Chi siamo", "Jabbar · Recensioni", "Jabbar · Domande frequenti", "Jabbar · Social"],
  tr: ["Jabbar · Ekip", "Jabbar · Galeri", "Jabbar · Hizmetler", "Jabbar · Süreç", "Jabbar · Hakkımızda", "Jabbar · Yorumlar", "Jabbar · SSS", "Jabbar · Sosyal medya"]
};
const STAMP_TOKENS = ["QC PASSED ✓", "REPLY < 24H", "TRIAL $1,000"];
const CITY_FIELDS = LOCALES.map((locale) => `city_${locale}`).sort();
const localePath = (locale, suffix = "") => locale === "zh" ? `${suffix}index.html` : `${locale}/${suffix}index.html`;
const HOME_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale) }));
const CALCULATOR_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale, "calculator/") }));
const INQUIRY_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale, "inquiry/") }));
const NAV_PAGES = [...HOME_PAGES, ...CALCULATOR_PAGES, ...INQUIRY_PAGES];
const TELEGRAM_PAGES = [...HOME_PAGES, ...INQUIRY_PAGES, { file: "privacy-policy.html" }, { file: "support.html" }];
const EXTRA_PAGES = ["404.html", "privacy-policy.html", "support.html"];
const FALLBACK_EVENT_PAGES = [
  ...HOME_PAGES.map(({ file }) => file),
  ...INQUIRY_PAGES.map(({ file }) => file),
  ...EXTRA_PAGES
];

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

function classListFromAttributes(attributes) {
  return (attributes.match(/\bclass="([^"]*)"/)?.[1] || "").split(/\s+/).filter(Boolean);
}

function tagsWithClass(source, tagName, className) {
  return Array.from(source.matchAll(new RegExp(`<${tagName}\\b([^>]*)>`, "gi")))
    .filter((match) => classListFromAttributes(match[1]).includes(className));
}

function countClass(source, className) {
  return (source.match(/<[a-z][^>]*>/gi) || [])
    .filter((tag) => classListFromAttributes(tag).includes(className)).length;
}

function decodeText(source) {
  return source
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textsForClass(source, tagName, className) {
  return Array.from(source.matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi")))
    .filter((match) => classListFromAttributes(match[1]).includes(className))
    .map((match) => decodeText(match[2]));
}

function regionsForClass(source, tagName, className) {
  return Array.from(source.matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi")))
    .filter((match) => classListFromAttributes(match[1]).includes(className))
    .map((match) => match[0]);
}

function tagById(source, id) {
  return (source.match(/<[a-z][^>]*>/gi) || []).find((tag) => tag.match(/\bid="([^"]*)"/)?.[1] === id) || "";
}

function tagWithAttribute(source, tagName, name) {
  return (source.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) || [])
    .find((tag) => new RegExp(`\\b${name}(?:\\s*=|\\s|/?>)`, "i").test(tag)) || "";
}

function cssRuleBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "m"))?.[1] || "";
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || "";
}

function hasClass(tag, className) {
  return classListFromAttributes(tag).includes(className);
}

function isValidCalendarDate(value) {
  if (value === null) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const stamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(stamp);
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3]);
}

async function load(file) {
  return readFile(resolve(ROOT, file), "utf8");
}

for (const { locale, file } of HOME_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`ai-sourcing-assistant\\.js\\?v=${AI_VERSION}`), `${file}: stale AI version`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing UI enhancements`);
  assert.match(html, /class="social-platform-groups container-wide"/, `${file}: social container is not centered`);
  assert.doesNotMatch(html, /class="[^"]*\bcontain\b[^"]*"/, `${file}: stale contain class`);
  assert.equal(count(html, /mobile-conversion-bar|has-mobile-conversion-bar/g), 0, `${file}: removed mobile conversion bar remains`);
  assert.equal(count(html, /class="faq-item"/g), 7, `${file}: FAQ item count`);
  assert.deepEqual(textsForClass(html, "p", "section-code"), SECTION_CODES[locale], `${file}: localized section code order`);
  assert.equal(countClass(html, "section-rule"), SECTION_CODES[locale].length, `${file}: section rule count`);
  assert.equal(countClass(html, "stamp-row"), 1, `${file}: stamp row count`);
  assert.equal(countClass(html, "stamp-item"), STAMP_TOKENS.length, `${file}: stamp item count`);
  assert.deepEqual(textsForClass(html, "span", "stamp"), STAMP_TOKENS, `${file}: stamp tokens`);
  const stamps = tagsWithClass(html, "span", "stamp");
  assert.equal(stamps.length, STAMP_TOKENS.length, `${file}: stamp element count`);
  assert(stamps.every((match) => classListFromAttributes(match[1]).includes("num-mono")), `${file}: every stamp must explicitly use num-mono`);
  const stampNotes = textsForClass(html, "small", "stamp-note");
  assert.equal(stampNotes.length, STAMP_TOKENS.length, `${file}: stamp note count`);
  assert(stampNotes.every(Boolean), `${file}: empty localized stamp note`);
  assert.equal(countClass(html, "shipment-ticker"), 1, `${file}: shipment ticker count`);
  assert.equal(countClass(html, "shipment-ticker-rail"), 1, `${file}: shipment ticker rail count`);
  const staticShipmentItems = tagsWithClass(html, "li", "shipment-ticker-item");
  assert.equal(staticShipmentItems.length, 1, `${file}: static shipment fallback item count`);
  assert(staticShipmentItems.every((match) => classListFromAttributes(match[1]).includes("num-mono")), `${file}: static shipment fallback must explicitly use num-mono`);
  assert.match(html, /data-shipments-source="\/shipments\.json\?v=shipments-20260713a"/, `${file}: shipment data source`);
  const metricNumbers = tagsWithClass(html, "bdi", "company-metric-number")
    .filter((match) => classListFromAttributes(match[1]).includes("num-mono"));
  assert.equal(metricNumbers.length, 5, `${file}: monospaced company metric count`);
  const reviewMetas = regionsForClass(html, "div", "testimonial-order-meta");
  assert.equal(reviewMetas.length, 3, `${file}: testimonial metadata count`);
  assert(reviewMetas.every((region) => countClass(region, "num-mono") === 1), `${file}: review amount must be the only monospaced metadata value`);
  const footerPhoneTag = html.match(/<a\b[^>]*href="tel:\+8618658925544"[^>]*>/i)?.[0] || "";
  assert(hasClass(footerPhoneTag, "num-mono"), `${file}: footer phone is not monospaced`);
  assert.doesNotMatch(html, /(?:href|src)="[^"]*\/ja\//, `${file}: Japanese route must not return`);
  if (locale === "ar") assert.match(html, /<html[^>]+lang="ar"[^>]+dir="rtl"/, `${file}: Arabic RTL root missing`);
}

for (const { locale, file } of CALCULATOR_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`ai-sourcing-assistant\\.js\\?v=${AI_VERSION}`), `${file}: missing multilingual AI assistant`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing UI enhancements`);
  assert.match(html, new RegExp(`calculator-order-analyzer\\.js\\?v=${ORDER_VERSION}`), `${file}: missing Excel order analyzer`);
  assert.equal(count(html, /data-order-analyzer/g), 1, `${file}: Excel order analyzer mount count`);
  assert.equal(count(html, /calculator-whatsapp|data-whatsapp|wa\.me\/8618658925544/g), 0, `${file}: calculator WhatsApp result action remains`);
  assert.equal(count(html, /class="cbm-visual"/g), 1, `${file}: static CBM visual count`);
  assert.equal(count(html, /<svg[^>]+aria-labelledby="cbmVizTitle"/g), 1, `${file}: static CBM SVG count`);
  assert.equal(count(html, /id="cbmFill"/g), 1, `${file}: static CBM fill count`);
  assert.deepEqual(textsForClass(html, "p", "section-code"), ["Jabbar · 体积工具"], `${file}: calculator section code`);
  assert.equal(countClass(html, "section-rule"), 1, `${file}: calculator section rule count`);
  assert(tagsWithClass(html, "line", "cbm-dimension-line").length >= 3, `${file}: CBM dimension line count`);
  const capTag = tagById(html, "cbmCap");
  const percentageTag = tagById(html, "cbmPct");
  const fillTag = tagById(html, "cbmFill");
  assert(hasClass(capTag, "num-mono"), `${file}: CBM capacity label is not monospaced`);
  assert.doesNotMatch(html, /20GP|20英尺|28\s*(?:CBM|立方米)|["']twenty["']\s*:/, `${file}: legacy 20GP calculator example remains`);
  assert.match(
    html,
    locale === "zh"
      ? /id="cbmCap"[^>]*>40英尺高柜 · 0\.0 \/ 68 立方米<\//
      : /id="cbmCap"[^>]*>40HQ · 0\.0 \/ 68 CBM<\//,
    `${file}: default container example must be 40HQ`,
  );
  assert(hasClass(percentageTag, "num-mono"), `${file}: CBM percentage is not monospaced`);
  for (const dataName of ["data-per-cbm", "data-total-cbm", "data-buffer-cbm", "data-weight-total"]) {
    assert(hasClass(tagWithAttribute(html, "strong", dataName), "num-mono"), `${file}: ${dataName} is not monospaced`);
  }
  assert.match(html, /function\s+setTextWithMonoNumbers\s*\(element,\s*value\)/, `${file}: dynamic numeric wrapper helper missing`);
  assert.match(html, /setTextWithMonoNumbers\(out\.container,\s*container\)/, `${file}: dynamic container numbers are not wrapped`);
  assert.match(html, /setTextWithMonoNumbers\(out\.summary,\s*container\s*\+/, `${file}: dynamic summary numbers are not wrapped`);
  assert(Number(attribute(capTag, "y")) < Number(attribute(fillTag, "y")), `${file}: capacity label must sit above the container`);
  assert.equal(count(html, /window\.renderCbmVisual\(total\)/g), 1, `${file}: CBM visual hook count`);
  assert.equal(count(html, /["']calculator_calculate["']/g), 1, `${file}: valid manual calculator event count`);
  assert.equal(count(html, /mobile-conversion-bar/g), 0, `${file}: calculator must not include mobile conversion bar`);
  if (locale === "ar") assert.match(html, /<html[^>]+lang="ar"[^>]+dir="rtl"/, `${file}: Arabic RTL root missing`);
}

for (const { file } of INQUIRY_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing QR enhancement`);
  assert.equal(count(html, /mobile-conversion-bar/g), 0, `${file}: inquiry must not include mobile conversion bar`);
}

assert.equal(NAV_PAGES.length, 30, "site navigation page count");
for (const { file } of NAV_PAGES) {
  const html = await load(file);
  const toolLinks = tagsWithClass(html, "a", "site-nav-tool-pill");
  assert.equal(toolLinks.length, 1, `${file}: site-nav-tool-pill count`);
  assert(attribute(toolLinks[0][0], "href"), `${file}: site-nav-tool-pill href missing`);
  const mobilePanels = regionsForClass(html, "nav", "site-nav-mobile-panel");
  assert.equal(mobilePanels.length, 1, `${file}: mobile navigation panel count`);
  assert.doesNotMatch(mobilePanels[0], /href="(?:\.\/|[^\"]*calculator\/?)"|href="[^\"]*#social-accounts"/, `${file}: calculator or team link remains in mobile navigation`);
}

for (const file of EXTRA_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing QR enhancement`);
}

assert.equal(TELEGRAM_PAGES.length, 22, "Telegram page count");
for (const { file } of TELEGRAM_PAGES) {
  const html = await load(file);
  assert.match(html, /href="https:\/\/t\.me\/Jabbar_in_Yiwu"/, `${file}: new Telegram URL missing`);
  assert.match(html, /data-app-link="tg:\/\/resolve\?domain=Jabbar_in_Yiwu"/, `${file}: new Telegram app URL missing`);
  assert.match(html, /data-copy-text="@Jabbar_in_Yiwu"/, `${file}: new Telegram copy handle missing`);
  assert.doesNotMatch(html, /Jabbar199901/, `${file}: old Telegram username remains`);
}

assert.equal(FALLBACK_EVENT_PAGES.length, 23, "fallback analytics page count");
for (const file of FALLBACK_EVENT_PAGES) {
  const html = await load(file);
  assert.match(html, /window\.jabbarTrack\(["']inquiry_channel_click["']/, `${file}: fallback channel event missing`);
  assert.doesNotMatch(html, /(?:jabbarTrack|gtag)\s*\([^)]*["']inquiry_submit["']/, `${file}: fallback channel must not impersonate a successful inquiry`);
}

const javascript = await load("assets/site-enhancements.js");
for (const locale of LOCALES) {
  assert.match(javascript, new RegExp(`\\n\\s*${locale}: \\{`), `site-enhancements.js: missing ${locale} labels`);
}
for (const token of [
  "renderCbmVisual", "service-country-marquee", "site-scroll-progress",
  "faq-quick-tags", "whatsapp-qr.svg", "prefers-reduced-motion",
  "initTrustStamps", "initShipmentTicker", "Intl.RelativeTimeFormat", "shipments.json",
  "initAnalyticsEvents", "contact_whatsapp", "isPlaceholderRecord", "is-unavailable"
]) {
  assert(javascript.includes(token), `site-enhancements.js: missing ${token}`);
}
assert(!javascript.includes("Jabbar199901"), "site-enhancements.js: old Telegram username remains");
for (const removedToken of ["contact-speed-dial", "initContactSpeedDial", "ui-section-reveal"]) {
  assert(!javascript.includes(removedToken), `site-enhancements.js: removed floating/reveal token remains (${removedToken})`);
}
assert(javascript.includes("sharedObserver.observe(section)"), "site-enhancements.js: homepage sections must still be observed without being hidden");
assert(javascript.includes('createElement("li", "shipment-ticker-item num-mono")'), "site-enhancements.js: dynamic shipment item must explicitly use num-mono");
assert(javascript.includes('ticker.classList.add("is-ready")'), "site-enhancements.js: valid shipment data must opt into the visible state");
assert(!javascript.includes("ja:"), "site-enhancements.js: Japanese labels must not return");

const inquiryJavascript = await load("assets/inquiry-form.js");
const aiJavascript = await load("assets/ai-sourcing-assistant.js");
assert(inquiryJavascript.includes('"inquiry_submit"'), "inquiry-form.js: successful direct inquiry event missing");
assert(aiJavascript.includes('"ai_first_message"'), "ai-sourcing-assistant.js: first successful AI message event missing");
assert(!aiJavascript.includes("mobile-conversion-bar"), "ai-sourcing-assistant.js: removed conversion bar integration remains");

const css = await load("styles.css");
for (const token of [
  ".cbm-visual", ".service-country-marquee", ".site-scroll-progress",
  ".faq-quick-tags", ".whatsapp-qr-card", "prefers-reduced-motion",
  "--font-mono-stack", ".num-mono", ".section-code", ".section-rule", ".stamp-row",
  ".shipment-ticker", ".cbm-dimension-line"
]) {
  assert(css.includes(token), `styles.css: missing ${token}`);
}
for (const removedToken of [".contact-speed-dial", ".mobile-conversion-bar", "has-mobile-conversion-bar", ".ui-section-reveal"]) {
  assert(!css.includes(removedToken), `styles.css: removed floating control styles remain (${removedToken})`);
}
assert(css.includes(".social-platform-groups .section-heading"), "styles.css: social heading centering missing");
const calculatorPageRule = cssRuleBody(css, ".calculator-page");
const calculatorGridAlphas = Array.from(calculatorPageRule.matchAll(/rgba\(24,\s*165,\s*192,\s*([0-9.]+)\)/g), (match) => Number(match[1]));
assert(calculatorPageRule.includes("24px 24px"), "styles.css: calculator grid must be applied directly to .calculator-page");
assert(calculatorGridAlphas.length >= 2 && calculatorGridAlphas.slice(0, 2).every((alpha) => alpha > 0 && alpha <= 0.08), "styles.css: calculator grid alpha must stay at or below 8%");
assert.doesNotMatch(css, /\.calculator-page::before\s*\{/, "styles.css: calculator grid must not be hidden in a pseudo-element");
assert.match(cssRuleBody(css, ".shipment-ticker"), /display:\s*none\s*;/, "styles.css: shipment ticker must default to hidden");
assert.match(cssRuleBody(css, ".shipment-ticker.is-ready"), /display:\s*grid\s*;/, "styles.css: shipment ticker ready state must be visible");
for (const token of [
  ".calculator-order-upload", ".order-analyzer__dropzone", ".order-analyzer__mapping",
  ".order-analyzer__metrics", ".order-analyzer__actions", ".order-analyzer__table"
]) {
  assert(css.includes(token), `styles.css: missing ${token}`);
}

const orderAnalyzer = await load("assets/calculator-order-analyzer.js");
const orderWorker = await load("assets/calculator-order-worker.js");
for (const token of ["data-order-export", "toBlob", "JABBAR_ORDER_ANALYZER_QA"])
  assert(orderAnalyzer.includes(token), `calculator-order-analyzer.js: missing ${token}`);
for (const removedToken of ["data-order-wechat", "shareToWeChat", "navigator.share"]) {
  assert(!orderAnalyzer.includes(removedToken), `calculator-order-analyzer.js: removed sharing token remains (${removedToken})`);
}
assert.doesNotMatch(orderAnalyzer, /WeChat|微信/, "calculator-order-analyzer.js: removed WeChat instructions remain");
assert.match(orderAnalyzer, /var MAX_FILE_BYTES = 50 \* 1024 \* 1024;/, "calculator-order-analyzer.js: file limit must be 50 MB");
assert.match(orderAnalyzer, /var WORKER_TIMEOUT_MS = 60000;/, "calculator-order-analyzer.js: Worker timeout must be 60 seconds");
for (const token of ["xlsx.full.min.js?v=0.20.3", "MAX_ROWS", "unitWeight", "unitVolume", "amount"])
  assert(orderWorker.includes(token), `calculator-order-worker.js: missing ${token}`);
assert.match(orderWorker, /var MAX_ROWS = 10000;/, "calculator-order-worker.js: row limit must be 10,000");
assert.match(orderWorker, /var MAX_COLUMNS = 100;/, "calculator-order-worker.js: column limit must be 100");
assert.match(orderWorker, /bookFiles:\s*false/, "calculator-order-worker.js: workbook archive files must not be retained");
assert.match(orderWorker, /bookVBA:\s*false/, "calculator-order-worker.js: workbook VBA/media payloads must not be retained");
assert.match(orderWorker, /ignoredImageColumns/, "calculator-order-worker.js: image columns must be filtered");

const qr = await load("assets/whatsapp-qr.svg");
assert.match(qr, /<svg\b/, "WhatsApp QR is not SVG");
assert.match(qr, /id="QRcode"/, "WhatsApp QR was not generated by the expected build tool");

const shipmentSource = await load("shipments.json");
assert.doesNotMatch(shipmentSource, /"city_ja"\s*:/, "shipments.json: Japanese city field must not return");
const shipments = JSON.parse(shipmentSource);
assert.equal(shipments.length, 6, "shipments.json: placeholder slot count");
assert.deepEqual(shipments.map((item) => item.id), ["slot-01", "slot-02", "slot-03", "slot-04", "slot-05", "slot-06"], "shipments.json: slot ids");
shipments.forEach((shipment, index) => {
  const scope = `shipments.json slot-${String(index + 1).padStart(2, "0")}`;
  assert.equal(typeof shipment.placeholder, "boolean", `${scope}: placeholder flag type`);
  assert.equal(typeof shipment.flag, "string", `${scope}: icon type`);
  assert.equal(typeof shipment.load, "string", `${scope}: load type`);
  assert.deepEqual(Object.keys(shipment).filter((key) => key.startsWith("city_")).sort(), CITY_FIELDS, `${scope}: localized city fields`);
  CITY_FIELDS.forEach((field) => assert.equal(typeof shipment[field] === "string" && shipment[field].trim().length > 0, true, `${scope}: ${field}`));
  assert(isValidCalendarDate(shipment.when), `${scope}: invalid date`);
});

console.log(`UI enhancement static check passed: ${HOME_PAGES.length} homepages, ${CALCULATOR_PAGES.length} calculators, ${INQUIRY_PAGES.length} inquiry pages, CSS ${CSS_VERSION}, UI ${UI_VERSION}.`);
