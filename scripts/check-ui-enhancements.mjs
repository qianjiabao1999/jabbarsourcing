#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_VERSION = "apple-170";
const UI_VERSION = "ui-20260718g";
const ORDER_VERSION = "order-20260718d";
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
const CALCULATOR_SECTION_CODES = {
  zh: "Jabbar · 体积工具",
  en: "Jabbar · Volume tool",
  es: "Jabbar · Herramienta de volumen",
  ar: "Jabbar · أداة الحجم",
  fr: "Jabbar · Outil de volume",
  pt: "Jabbar · Ferramenta de volume",
  ru: "Jabbar · Расчёт объёма",
  de: "Jabbar · Volumenrechner",
  it: "Jabbar · Calcolo volume",
  tr: "Jabbar · Hacim aracı"
};
const STAMP_TOKENS = ["QC PASSED ✓", "REPLY < 24H", "TRIAL $1,000"];
const COMPANY_IDENTITY_LINES = [
  "Jabbar × 好多宝(Haoduobao)",
  "Zhejiang Haoduobao Brand Management Co., Ltd.",
  "浙江好多宝品牌管理有限公司"
];
const SOCIAL_PLATFORM_CLASS_ORDER = [
  "social-platform-group-tiktok",
  "social-platform-group-instagram",
  "social-platform-group-douyin",
  "social-platform-group-xhs"
];
const CITY_FIELDS = LOCALES.map((locale) => `city_${locale}`).sort();
const localePath = (locale, suffix = "") => locale === "zh" ? `${suffix}index.html` : `${locale}/${suffix}index.html`;
const HOME_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale) }));
const CALCULATOR_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale, "calculator/") }));
const INQUIRY_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale, "inquiry/") }));
const NAV_PAGES = [...HOME_PAGES, ...CALCULATOR_PAGES, ...INQUIRY_PAGES];
const COMPANY_FOOTER_PAGES = [...NAV_PAGES, { file: "privacy-policy.html" }, { file: "support.html" }];
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

function firstBalancedRegionForClass(source, tagName, className) {
  const openingPattern = new RegExp(`<${tagName}\\b([^>]*)>`, "gi");
  let opening;
  while ((opening = openingPattern.exec(source))) {
    if (!classListFromAttributes(opening[1]).includes(className)) continue;
    const boundaryPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
    boundaryPattern.lastIndex = opening.index;
    let depth = 0;
    let boundary;
    while ((boundary = boundaryPattern.exec(source))) {
      if (boundary[0].startsWith("</")) depth -= 1;
      else if (!boundary[0].endsWith("/>")) depth += 1;
      if (depth === 0) return source.slice(opening.index, boundary.index + boundary[0].length);
    }
  }
  return "";
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

function hasAttribute(tag, name) {
  return new RegExp(`\\s${name}(?:\\s|=|/?>)`, "i").test(tag);
}

function sourceBetween(source, startToken, endToken, label) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  assert(start >= 0 && end > start, `${label}: source segment missing`);
  return source.slice(start, end);
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

async function exists(file) {
  try {
    await readFile(resolve(ROOT, file));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

for (const { locale, file } of HOME_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.doesNotMatch(html, /ai-sourcing-assistant\.js|JABBAR_AI_ASSISTANT_ENDPOINT/, `${file}: hidden AI bootstrap must not load by default`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing UI enhancements`);
  assert.equal(countClass(html, "hero-brand-partnership"), 1, `${file}: joint brand lockup count`);
  assert.equal(countClass(html, "site-logo-lockup-company"), 1, `${file}: Haoduobao logo frame count`);
  assert.equal(count(html, /haoduobao-logo\.webp\?v=company-20260718a/g), 1, `${file}: Haoduobao logo asset count`);
  assert.equal(countClass(html, "company-identity"), 1, `${file}: company identity block count`);
  assert.equal(countClass(html, "company-about"), 1, `${file}: About card count`);
  const aboutCard = firstBalancedRegionForClass(html, "section", "company-about");
  const companyIdentity = firstBalancedRegionForClass(aboutCard, "div", "company-identity");
  assert(companyIdentity, `${file}: company identity must be inside the About card`);
  assert.equal(decodeText(companyIdentity), COMPANY_IDENTITY_LINES.join(" "), `${file}: company identity must contain exactly the approved three lines`);
  assert.equal(count(companyIdentity, /<strong\b/gi), 1, `${file}: company identity title count`);
  assert.equal(count(companyIdentity, /<span\b/gi), 2, `${file}: company identity legal line count`);
  assert.doesNotMatch(companyIdentity, /<(?:a|p)\b/i, `${file}: company identity must not add links or extra paragraphs`);
  const galleryRails = tagsWithClass(html, "div", "gallery-rail");
  assert.equal(galleryRails.length, 2, `${file}: gallery rail count`);
  assert(galleryRails.every((match) => attribute(match[0], "role") === "region"), `${file}: gallery rails need region semantics`);
  assert(galleryRails.every((match) => attribute(match[0], "tabindex") === "0"), `${file}: gallery rails need keyboard scrolling`);
  assert.match(html, /Zhejiang Haoduobao Brand Management Co\., Ltd\./, `${file}: English legal name missing`);
  assert.match(html, /浙江好多宝品牌管理有限公司/, `${file}: Chinese legal name missing`);
  assert.match(html, /href="https:\/\/www\.haoduobao123\.com\/"/, `${file}: company ordering website missing`);
  for (const removedSocial of ["豹哥百货批发全球供应", "豹哥百货严选", "S99_Tv9at_I", "Yk8-Ra0NoRg", "douyin-89144212942", "douyin-dg661661"]) {
    assert(!html.includes(removedSocial), `${file}: removed social card remains (${removedSocial})`);
  }
  assert.match(html, /class="social-platform-groups container-wide"/, `${file}: social container is not centered`);
  const socialGroups = tagsWithClass(html, "section", "social-platform-group");
  assert.equal(socialGroups.length, 4, `${file}: social category count`);
  assert.deepEqual(
    socialGroups.map((match) => classListFromAttributes(match[1]).find((className) => className !== "social-platform-group" && className.startsWith("social-platform-group-"))),
    SOCIAL_PLATFORM_CLASS_ORDER,
    `${file}: social category order`,
  );
  assert(socialGroups.every((match) => !hasAttribute(match[0], "hidden")), `${file}: all social groups must be visible initially`);
  const socialCards = tagsWithClass(html, "a", "team-card");
  assert(socialCards.length > 0, `${file}: social account cards missing`);
  assert(socialCards.every((match) => !hasAttribute(match[0], "hidden")), `${file}: all social accounts must be visible initially`);
  assert.equal(countClass(html, "social-platform-toggle"), 0, `${file}: social account disclosure toggle must not be rendered`);
  assert.equal(countClass(html, "social-platform-filter"), 0, `${file}: category filters must be generated once by JavaScript`);
  assert.doesNotMatch(html, /class="[^"]*\bcontain\b[^"]*"/, `${file}: stale contain class`);
  assert.equal(count(html, /mobile-conversion-bar|has-mobile-conversion-bar/g), 0, `${file}: removed mobile conversion bar remains`);
  const faqItems = tagsWithClass(html, "details", "faq-item");
  assert.equal(faqItems.length, 7, `${file}: FAQ item count`);
  assert(faqItems.every((match) => !hasAttribute(match[0], "open")), `${file}: every FAQ item must start closed`);
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
  assert.doesNotMatch(html, /ai-sourcing-assistant\.js|JABBAR_AI_ASSISTANT_ENDPOINT/, `${file}: hidden AI bootstrap must not load by default`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing UI enhancements`);
  assert.match(html, new RegExp(`calculator-order-loader\\.js\\?v=${ORDER_VERSION}`), `${file}: missing deferred Excel order loader`);
  assert.doesNotMatch(html, /<script[^>]+src="\/assets\/calculator-order-analyzer\.js/i, `${file}: Excel order analyzer must not load directly`);
  assert.equal(count(html, /data-order-analyzer/g), 1, `${file}: Excel order analyzer mount count`);
  for (const fieldName of ["length", "width", "height", "unit", "qty", "product", "weight", "note"]) {
    assert.equal(count(html, new RegExp(`\\bname="${fieldName}"`, "g")), 1, `${file}: calculator field ${fieldName} count`);
  }
  assert.equal(count(html, /calculator-whatsapp|data-whatsapp|wa\.me\/8618658925544/g), 0, `${file}: calculator WhatsApp result action remains`);
  assert.equal(count(html, /class="cbm-visual"/g), 1, `${file}: static CBM visual count`);
  assert.equal(count(html, /<svg[^>]+aria-labelledby="cbmVizTitle"/g), 1, `${file}: static CBM SVG count`);
  assert.equal(count(html, /id="cbmFill"/g), 1, `${file}: static CBM fill count`);
  assert.deepEqual(textsForClass(html, "p", "section-code"), [CALCULATOR_SECTION_CODES[locale]], `${file}: calculator section code`);
  assert.equal(countClass(html, "section-rule"), 1, `${file}: calculator section rule count`);
  assert.match(html, /class="calculator-results is-empty"[^>]+data-result-state="empty"/, `${file}: calculator initial result state`);
  assert.equal(count(html, /data-result-detail(?:\s|>)/g), 3, `${file}: progressive result detail count`);
  assert.equal(count(html, /data-result-status/g), 1, `${file}: calculator result status count`);
  assert.doesNotMatch(html, /data-result-status[^>]*role="status"/, `${file}: nested live result status must not return`);
  assert.match(tagWithAttribute(html, "button", "data-copy-result"), /\sdisabled(?:\s|>)/, `${file}: copy result must start disabled`);
  for (const token of ["setResultState", "resetResult", "'empty'", "'invalid'", "'ready'"]) {
    assert(html.includes(token), `${file}: missing calculator result state token ${token}`);
  }
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
  assert.equal(count(html, /["']jabbar:calc-result["']/g), 1, `${file}: calculator result bridge event count`);
  for (const detailField of ["message", "product", "quantity", "totalCbm", "bufferedCbm", "container"]) {
    assert.match(html, new RegExp(`${detailField}:`), `${file}: calculator result event missing ${detailField}`);
  }
  assert.doesNotMatch(html, /aria-hidden="false"/, `${file}: CBM visual must not use aria-hidden=false`);
  assert.doesNotMatch(fillTag, /\sfill=/, `${file}: CBM fill color must come from CSS`);
  assert.doesNotMatch(tagById(html, "cbmRibs"), /\sstroke=/, `${file}: CBM rib color must come from CSS`);
  assert.doesNotMatch(percentageTag, /\sfill=/, `${file}: CBM percentage color must come from CSS`);
  assert.equal(count(html, /["']calculator_calculate["']/g), 0, `${file}: duplicate calculator event must not return`);
  assert.equal(count(html, /mobile-conversion-bar/g), 0, `${file}: calculator must not include mobile conversion bar`);
  if (locale === "ar") assert.match(html, /<html[^>]+lang="ar"[^>]+dir="rtl"/, `${file}: Arabic RTL root missing`);
}

assert.equal(COMPANY_FOOTER_PAGES.length, 32, "company footer page count");
for (const { file } of COMPANY_FOOTER_PAGES) {
  const html = await load(file);
  assert.equal(countClass(html, "site-footer-company"), 1, `${file}: legal company footer count`);
  assert.match(html, /Zhejiang Haoduobao Brand Management Co\., Ltd\./, `${file}: footer English legal name missing`);
  assert.match(html, /浙江好多宝品牌管理有限公司/, `${file}: footer Chinese legal name missing`);
  assert.match(html, /href="https:\/\/www\.haoduobao123\.com\/"/, `${file}: footer company ordering website missing`);
}

assert.equal(NAV_PAGES.length, 30, "organization schema page count");
for (const { file } of NAV_PAGES) {
  const html = await load(file);
  assert.equal(count(html, /"legalName"\s*:\s*"Zhejiang Haoduobao Brand Management Co\., Ltd\."/g), 1, `${file}: Organization legalName count`);
  assert.equal(count(html, /"alternateName"\s*:\s*\[/g), 1, `${file}: Organization alternateName count`);
  assert.match(html, /"Jabbar Sourcing Team"[\s\S]*"浙江好多宝品牌管理有限公司"/, `${file}: Organization alternate names missing`);
}

for (const { file } of INQUIRY_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing QR enhancement`);
  assert.equal(count(html, /mobile-conversion-bar/g), 0, `${file}: inquiry must not include mobile conversion bar`);
  const returnLinks = tagsWithClass(html, "a", "site-nav-return-home");
  assert.equal(returnLinks.length, 1, `${file}: top return-home link count`);
  assert.equal(attribute(returnLinks[0][0], "href"), "../", `${file}: top return-home target`);
  assert.equal(countClass(html, "site-nav-mobile-home"), 0, `${file}: duplicate return-home item remains in mobile menu`);
  assert.equal(countClass(html, "site-nav-mobile-team"), 1, `${file}: mobile team-member link missing`);
}

assert.equal(NAV_PAGES.length, 30, "site navigation page count");
for (const { file } of NAV_PAGES) {
  const html = await load(file);
  const toolLinks = tagsWithClass(html, "a", "site-nav-tool-pill");
  assert.equal(toolLinks.length, 1, `${file}: site-nav-tool-pill count`);
  assert(attribute(toolLinks[0][0], "href"), `${file}: site-nav-tool-pill href missing`);
  const mobilePanels = regionsForClass(html, "nav", "site-nav-mobile-panel");
  assert.equal(mobilePanels.length, 1, `${file}: mobile navigation panel count`);
  assert.doesNotMatch(mobilePanels[0], /href="(?:\.\/|[^\"]*calculator\/?)"/, `${file}: calculator link remains in mobile navigation`);
  const expectedMobileTeamLinks = INQUIRY_PAGES.some((page) => page.file === file) ? 1 : 0;
  assert.equal(countClass(mobilePanels[0], "site-nav-mobile-team"), expectedMobileTeamLinks, `${file}: mobile team-member link count`);
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
const inquiryFallbackFiles = new Set(INQUIRY_PAGES.map(({ file }) => file));
for (const file of FALLBACK_EVENT_PAGES) {
  const html = await load(file);
  if (inquiryFallbackFiles.has(file)) {
    assert.doesNotMatch(html, /window\.jabbarTrack\(["']inquiry_channel_click["']/, `${file}: superseded inquiry channel event remains`);
  } else {
    assert.match(html, /window\.jabbarTrack\(["']inquiry_channel_click["']/, `${file}: fallback channel event missing`);
  }
  assert.doesNotMatch(html, /(?:jabbarTrack|gtag)\s*\([^)]*["']inquiry_submit["']/, `${file}: fallback channel must not impersonate a successful inquiry`);
}
const inquiryFormJavascript = await load("assets/inquiry-form.js");
assert.doesNotMatch(inquiryFormJavascript, /trackEvent\(["']channel_fallback["']/, "inquiry-form.js: removed fallback channel event returned");

{
  const PUBLIC_ORIGIN = "https://www.jabbarsourcing.com";
  const EXPECTED_LANGUAGE_MATRIX_LASTMOD = "2026-07-18";
  const EXPECTED_LEGAL_LASTMOD = {
    [`${PUBLIC_ORIGIN}/privacy-policy.html`]: "2026-07-18",
    [`${PUBLIC_ORIGIN}/support.html`]: "2026-07-12"
  };
  const LEGAL_PAGE_URLS = [
    `${PUBLIC_ORIGIN}/privacy-policy.html`,
    `${PUBLIC_ORIGIN}/support.html`
  ];
  const publicUrlForFile = (file) => {
    if (file === "index.html") return `${PUBLIC_ORIGIN}/`;
    if (file.endsWith("/index.html")) return `${PUBLIC_ORIGIN}/${file.slice(0, -"index.html".length)}`;
    return `${PUBLIC_ORIGIN}/${file}`;
  };
  const linkTag = (html, rel) => (html.match(/<link\b[^>]*>/gi) || [])
    .filter((tag) => attribute(tag, "rel") === rel);
  const sitemap = await load("sitemap.xml");
  const sitemapEntries = Array.from(sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g), (match) => {
    const block = match[1];
    return {
      url: block.match(/<loc>([^<]+)<\/loc>/)?.[1] || "",
      lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] || "",
      alternates: Array.from(
        block.matchAll(/<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g),
        (alternate) => [alternate[1], alternate[2]],
      )
    };
  });
  const entriesByUrl = new Map(sitemapEntries.map((entry) => [entry.url, entry]));
  const matrixGroups = [
    { name: "home", pages: HOME_PAGES },
    { name: "calculator", pages: CALCULATOR_PAGES },
    { name: "inquiry", pages: INQUIRY_PAGES }
  ];
  const expectedPublicUrls = [
    ...NAV_PAGES.map(({ file }) => publicUrlForFile(file)),
    ...LEGAL_PAGE_URLS
  ].sort();

  assert.equal(sitemapEntries.length, 32, "sitemap.xml: public URL count");
  assert.equal(entriesByUrl.size, sitemapEntries.length, "sitemap.xml: duplicate URL");
  assert.deepEqual([...entriesByUrl.keys()].sort(), expectedPublicUrls, "sitemap.xml: public URL set");
  assert.doesNotMatch(sitemap, /\/ja\/|hreflang="ja"/, "sitemap.xml: Japanese route or hreflang must not return");
  for (const [url, lastmod] of Object.entries(EXPECTED_LEGAL_LASTMOD)) {
    assert.equal(entriesByUrl.get(url)?.lastmod, lastmod, `sitemap.xml: stale legal URL ${url}`);
  }

  for (const { name, pages } of matrixGroups) {
    const urlsByLocale = Object.fromEntries(pages.map(({ locale, file }) => [locale, publicUrlForFile(file)]));
    const expectedAlternates = [
      ["x-default", urlsByLocale.en],
      ...LOCALES.map((locale) => [locale === "zh" ? "zh-Hans" : locale, urlsByLocale[locale]])
    ].sort(([left], [right]) => left.localeCompare(right));

    for (const { locale, file } of pages) {
      const url = urlsByLocale[locale];
      const entry = entriesByUrl.get(url);
      const html = await load(file);
      const canonicalTags = linkTag(html, "canonical");
      const htmlAlternates = linkTag(html, "alternate")
        .map((tag) => [attribute(tag, "hreflang"), attribute(tag, "href")])
        .sort(([left], [right]) => left.localeCompare(right));
      assert(entry, `sitemap.xml: missing ${name} URL ${url}`);
      assert.equal(entry.lastmod, EXPECTED_LANGUAGE_MATRIX_LASTMOD, `sitemap.xml: stale ${file} lastmod`);
      assert.equal(entry.alternates.length, expectedAlternates.length, `sitemap.xml: ${file} alternate count`);
      assert.deepEqual(
        [...entry.alternates].sort(([left], [right]) => left.localeCompare(right)),
        expectedAlternates,
        `sitemap.xml: ${file} language matrix`,
      );
      assert.equal(canonicalTags.length, 1, `${file}: canonical count`);
      assert.equal(attribute(canonicalTags[0], "href"), url, `${file}: canonical URL`);
      assert.deepEqual(htmlAlternates, expectedAlternates, `${file}: HTML language matrix`);
      assert.doesNotMatch(html, /\/ja\/|hreflang="ja"/, `${file}: Japanese route or hreflang must not return`);
    }
  }
}

const javascript = await load("assets/site-enhancements.js");
for (const locale of LOCALES) {
  assert.match(javascript, new RegExp(`\\n\\s*${locale}: \\{`), `site-enhancements.js: missing ${locale} labels`);
}
assert.equal(count(javascript, /calculatorModes:/g), LOCALES.length, "site-enhancements.js: calculator mode label count");
assert.equal(count(javascript, /calculatorOptional:/g), LOCALES.length, "site-enhancements.js: calculator optional-field label count");
assert.equal(count(javascript, /faqPrompt:/g), LOCALES.length, "site-enhancements.js: FAQ quick-tag prompt count");
assert.equal(count(javascript, /socialFilter:/g), LOCALES.length, "site-enhancements.js: social filter label count");
for (const removedLabel of ["showAllAccounts", "showFewerAccounts", "allPlatforms"]) {
  assert.equal(count(javascript, new RegExp(`${removedLabel}:`, "g")), 0, `site-enhancements.js: removed ${removedLabel} label returned`);
}
for (const token of [
  "renderCbmVisual", "site-scroll-progress",
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
for (const token of [
  "initCalculatorInquiryBridge", "calculator-inquiry-cta", "jabbarCalcResult", "calculator_result",
  "calculator_inquiry",
  "reducedMotionQuery.addEventListener", 'event.key === "Escape"', "company-metric-visual",
  "initSocialAccountDisclosure", "initCalculatorModes",
  "calculator_mode_change", "social_profile_click", "social_accounts_view", "social_platform_filter",
  "initGalleryMarquee", "galleryLoopInitialized", "galleryOriginalCount",
  "data-gallery-clone", "--gallery-loop-distance", "--gallery-loop-duration",
  "calculator-optional-details", "calculator-optional-summary", "calculator-optional-fields",
  "runMobileLoop", "mobileAutoPosition", "pauseMobileLoop", "pauseMobileLoopForKeyboard", "resumeMobileLoopForKeyboard", "resumeMobileLoopSoon", "is-gallery-mobile-loop-ready"
]) {
  assert(javascript.includes(token), `site-enhancements.js: missing round 8 behavior ${token}`);
}
for (const removedToken of ["service-country-marquee", "service-country-toggle", "service-country-item", "pauseCountries", "resumeCountries", "copy.countries"]) {
  assert(!javascript.includes(removedToken), `site-enhancements.js: removed country strip remains (${removedToken})`);
}
assert(!javascript.includes('setAttribute("aria-hidden", "false")'), "site-enhancements.js: aria-hidden=false must not return");
assert(!javascript.includes('setAttribute("fill"'), "site-enhancements.js: dynamic CBM colors must use CSS classes");

const calculatorModeJavascript = sourceBetween(javascript, "  function initCalculatorModes()", "  function initCalculatorInquiryBridge()", "site-enhancements.js calculator mode");
assert.match(calculatorModeJavascript, /var optionalFields = \["product", "weight", "note"\]\.map/, "site-enhancements.js: calculator optional field set");
assert.match(calculatorModeJavascript, /\["length", "width", "height", "unit", "qty"\]\.forEach/, "site-enhancements.js: calculator primary field set");
assert.match(calculatorModeJavascript, /createElement\("details", "calculator-optional-details"\)/, "site-enhancements.js: calculator optional details disclosure missing");
assert.match(calculatorModeJavascript, /optionalDetails\.appendChild\(optionalSummary\)[\s\S]*optionalDetails\.appendChild\(optionalFieldGroup\)/, "site-enhancements.js: calculator optional details structure missing");
assert.match(calculatorModeJavascript, /fieldGrid\.insertAdjacentElement\("afterend", optionalDetails\)/, "site-enhancements.js: calculator optional details placement missing");

const galleryJavascript = sourceBetween(javascript, "  function initGalleryMarquee()", "  function initHomepageMotion()", "site-enhancements.js gallery");
assert.match(galleryJavascript, /clone\.dataset\.galleryClone = "true"/, "site-enhancements.js: gallery clone marker missing");
assert.match(galleryJavascript, /clone\.setAttribute\("aria-hidden", "true"\)/, "site-enhancements.js: gallery clones must be hidden from assistive technology");
assert.match(galleryJavascript, /function runMobileLoop\(timestamp\)/, "site-enhancements.js: mobile gallery animation loop missing");
assert.match(galleryJavascript, /var elapsed = Math\.min\(250, Math\.max\(0, timestamp - mobileLastTimestamp\)\)/, "site-enhancements.js: low-frame-rate mobile gallery compensation missing");
assert.match(galleryJavascript, /Math\.abs\(rail\.scrollLeft - mobileAutoPosition\) > 2/, "site-enhancements.js: external gallery scrolling must be adopted before autoplay continues");
assert.match(galleryJavascript, /normalizeMobilePosition\(mobileAutoPosition \+ elapsed \* [0-9.]+\)/, "site-enhancements.js: mobile gallery must advance with a subpixel accumulator");
assert.match(galleryJavascript, /if \(rail\) mobileAutoPosition = rail\.scrollLeft/, "site-enhancements.js: manual gallery interaction must sync the auto-scroll accumulator");
assert.match(galleryJavascript, /mobileFrame = window\.requestAnimationFrame\(runMobileLoop\)/, "site-enhancements.js: mobile gallery rAF scheduling missing");
assert.match(galleryJavascript, /rail\.addEventListener\("pointerdown", pauseMobileLoop/, "site-enhancements.js: pointer interaction must pause mobile gallery");
assert.match(galleryJavascript, /rail\.addEventListener\("pointerup", resumeMobileLoopSoon/, "site-enhancements.js: pointer interaction must resume mobile gallery");
assert.match(galleryJavascript, /rail\.addEventListener\("pointercancel", resumeMobileLoopSoon/, "site-enhancements.js: cancelled pointer interaction must resume mobile gallery");
assert.match(galleryJavascript, /rail\.addEventListener\("wheel", function \(\) \{\s*pauseMobileLoop\(\);\s*resumeMobileLoopSoon\(\);/s, "site-enhancements.js: manual wheel scrolling must pause and resume mobile gallery");
assert.match(galleryJavascript, /lastGalleryInputWasPointer/, "site-enhancements.js: gallery input modality tracking missing");
assert.match(galleryJavascript, /if \(!lastGalleryInputWasPointer\) pauseMobileLoop\(\)/, "site-enhancements.js: touch focus must not pause the mobile gallery indefinitely");
assert.match(galleryJavascript, /if \(!lastGalleryInputWasPointer\) resumeMobileLoopSoon\(\)/, "site-enhancements.js: touch focusout must not restart the gallery pause timer");

const faqJavascript = sourceBetween(javascript, "  function initFaqTags()", "  function initSocialAccountDisclosure()", "site-enhancements.js FAQ");
assert.match(faqJavascript, /items\.forEach\(function \(item\) \{ item\.open = false; \}\);/, "site-enhancements.js: FAQ items must be closed initially");
assert.match(faqJavascript, /items\.forEach\(function \(other\) \{ other\.open = other === item; \}\);/, "site-enhancements.js: a quick tag must keep only its matching FAQ item open");
assert.doesNotMatch(faqJavascript, /shouldOpen|!item\.open/, "site-enhancements.js: repeated quick-tag clicks must not close the answer");
assert.match(faqJavascript, /item\.scrollIntoView\(\{[^}]*block: "center"[^}]*\}\)/, "site-enhancements.js: FAQ quick tag must scroll its answer into view");
assert.doesNotMatch(faqJavascript, /\.focus\s*\(/, "site-enhancements.js: FAQ quick tags must not steal focus");
assert.doesNotMatch(faqJavascript, /window\.open\s*\(|(?:window\.)?location(?:\.href)?\s*=|setAttribute\(["'](?:href|target)["']/, "site-enhancements.js: FAQ quick tags must not navigate or open a new page");

const socialJavascript = sourceBetween(javascript, "  function initSocialAccountDisclosure()", "  initAnalyticsEvents();", "site-enhancements.js social filters");
assert.match(socialJavascript, /card\.hidden = false/, "site-enhancements.js: social accounts must start visible");
assert.match(socialJavascript, /var filterItems = groups\.map\(/, "site-enhancements.js: category filters must map one-to-one from social groups");
assert.match(socialJavascript, /filterItems\.forEach\([\s\S]*createElement\("button", "social-platform-filter", item\.label\)/, "site-enhancements.js: social category filter buttons missing");
assert.doesNotMatch(socialJavascript, /filterItems\.(?:push|unshift|splice)\s*\(/, "site-enhancements.js: all-platform filter must not be injected");
assert.doesNotMatch(socialJavascript, /createElement\("button", "social-platform-toggle"/, "site-enhancements.js: social account toggle must not be created");
assert.match(socialJavascript, /group\.hidden = group\.dataset\.socialPlatform !== selected/, "site-enhancements.js: social category filter must isolate one platform");
assert.match(socialJavascript, /selectPlatform\(filterItems\[0\]\.key, false\)/, "site-enhancements.js: TikTok-first default selection missing");
assert.doesNotMatch(socialJavascript, /selected \|\| "all"|\? "" : button\.dataset\.socialFilter/, "site-enhancements.js: deprecated all-platform reset remains");

const inquiryJavascript = await load("assets/inquiry-form.js");
const aiJavascript = await load("assets/ai-sourcing-assistant.js");
const socialAvatarUpdater = await load("scripts/update-social-avatars.mjs");
const socialAvatarManifest = await load("assets/social-avatars-manifest.json");
assert(inquiryJavascript.includes('"inquiry_submit"'), "inquiry-form.js: successful direct inquiry event missing");
assert(!inquiryJavascript.includes("inquiry_optional_details_toggle"), "inquiry-form.js: removed optional-details analytics returned");
assert(!inquiryJavascript.includes("inquiry-optional-details"), "inquiry-form.js: removed optional field disclosure returned");
assert(aiJavascript.includes('"ai_first_message"'), "ai-sourcing-assistant.js: first successful AI message event missing");
assert(!aiJavascript.includes("mobile-conversion-bar"), "ai-sourcing-assistant.js: removed conversion bar integration remains");
for (const removedSocial of ["S99_Tv9at_I", "Yk8-Ra0NoRg", "douyin-89144212942", "douyin-dg661661"]) {
  assert(!socialAvatarUpdater.includes(removedSocial), `update-social-avatars.mjs: removed social account remains (${removedSocial})`);
  assert(!socialAvatarManifest.includes(removedSocial), `social-avatars-manifest.json: removed social account remains (${removedSocial})`);
}
for (const removedAsset of [
  "assets/social-116/douyin-89144212942-116.webp", "assets/social-116/douyin-89144212942-232.webp",
  "assets/social-116/douyin-dg661661-116.webp", "assets/social-116/douyin-dg661661-232.webp",
  "assets/social-source/douyin-89144212942.webp", "assets/social-source/douyin-dg661661.webp"
]) {
  assert.equal(await exists(removedAsset), false, `${removedAsset}: removed social asset returned`);
}

const css = await load("styles.css");
for (const token of [
  ".cbm-visual", ".site-scroll-progress",
  ".faq-quick-tags", ".whatsapp-qr-card", "prefers-reduced-motion",
  "--font-mono-stack", ".num-mono", ".section-code", ".section-rule", ".stamp-row",
  ".shipment-ticker", ".cbm-dimension-line"
]) {
  assert(css.includes(token), `styles.css: missing ${token}`);
}
for (const token of [
  ".calculator-inquiry-cta", ".inquiry-status-icon",
  "#cbmFill.is-over", "#cbmRibs", ".field-label-marker", ".calculator-result-status",
  ".calculator-secondary-button:disabled", ".hero-brand-partnership", ".company-identity",
  ".calculator-mode-tabs", ".calculator-optional-details", ".calculator-optional-summary",
  ".calculator-optional-fields", ".social-platform-filters"
]) {
  assert(css.includes(token), `styles.css: missing round 8 style ${token}`);
}
assert.doesNotMatch(css, /\.legal-content ul\s*\{[^}]*padding-left\s*:/s, "styles.css: legal list must use logical padding");
for (const removedToken of [".contact-speed-dial", ".mobile-conversion-bar", "has-mobile-conversion-bar", ".ui-section-reveal"]) {
  assert(!css.includes(removedToken), `styles.css: removed floating control styles remain (${removedToken})`);
}
for (const removedToken of [".service-country-marquee", ".service-country-toggle", ".service-country-item", ".service-country-track"]) {
  assert(!css.includes(removedToken), `styles.css: removed country strip style remains (${removedToken})`);
}
const compactGalleryMarker = "/* 2026-07-18 buyer-flow compactness, hybrid gallery, and desktop navigation release. */";
const compactGalleryMarkerIndex = css.indexOf(compactGalleryMarker);
assert(compactGalleryMarkerIndex >= 0, "styles.css: compact gallery release block missing");
const compactGalleryCss = css.slice(compactGalleryMarkerIndex);
assert.match(compactGalleryCss, /@media \(max-width:\s*767px\)\s*\{[\s\S]*?\.sourcing-gallery \.gallery-frame\[data-gallery-clone="true"\]\s*\{[^}]*display:\s*block\s*!important\s*;/, "styles.css: mobile gallery clones must stay visible");
assert.match(compactGalleryCss, /@media \(max-width:\s*767px\)\s*\{[\s\S]*?\.sourcing-gallery \.gallery-rail\s*\{[^}]*scroll-snap-type:\s*none\s*!important\s*;[^}]*scroll-padding-inline:\s*0\s*!important\s*;/, "styles.css: mobile auto-scroll rail must not snap back to the first image");
assert.match(compactGalleryCss, /\.sourcing-gallery \.gallery-track,[\s\S]*?\.sourcing-gallery \.gallery-block-portrait \.gallery-track\s*\{[^}]*animation:\s*none\s*!important\s*;[^}]*transform:\s*none\s*!important\s*;/, "styles.css: mobile gallery must use the JavaScript loop instead of a competing CSS animation");
assert.doesNotMatch(compactGalleryCss, /scroll-snap-type:\s*x proximity/, "styles.css: stale mobile gallery proximity snapping returned after the compact release");
const galleryTrackRules = Array.from(css.matchAll(/(?:^|\n)\.gallery-track\s*\{([^}]*)\}/gm), (match) => match[1]);
assert(galleryTrackRules.some((body) => /animation:\s*none\s*;/.test(body)), "styles.css: gallery must not use the old short alternate animation");
const galleryLoopRule = cssRuleBody(css, ".gallery-track.is-gallery-loop-ready");
assert.match(galleryLoopRule, /galleryMarquee var\(--gallery-loop-duration,\s*48s\) linear infinite/, "styles.css: desktop gallery loop must move continuously");
assert.match(css, /@keyframes galleryMarquee\s*\{[\s\S]*var\(--gallery-loop-distance,\s*0px\)/, "styles.css: gallery loop must use the measured duplicate-set distance");
assert.match(css, /@media \(min-width:\s*768px\)\s*\{[\s\S]*?\.sourcing-gallery \.gallery-rail\s*\{[^}]*scroll-snap-type:\s*none\s*;[^}]*scroll-padding-inline:\s*0\s*;/, "styles.css: desktop gallery must not snap against the marquee transform");
assert(css.includes(".social-platform-groups .section-heading"), "styles.css: social heading centering missing");
const partnershipRule = cssRuleBody(css, ".hero-brand-partnership");
assert.match(partnershipRule, /--partnership-logo-size:\s*clamp\(124px,\s*13vw,\s*190px\)\s*;/, "styles.css: desktop joint logos must share the Jabbar logo size");
const partnershipLogoRule = cssRuleBody(css, ".hero-brand-partnership .site-logo-lockup");
assert.match(partnershipLogoRule, /width:\s*var\(--partnership-logo-size\)\s*;/, "styles.css: joint logo frames must share one width token");
assert.match(partnershipLogoRule, /aspect-ratio:\s*1\s*\/\s*1\s*;/, "styles.css: joint logo frames must remain equal squares");
const partnershipImageRule = cssRuleBody(css, ".hero-brand-partnership .site-logo-lockup img");
assert.match(partnershipImageRule, /background:\s*#fff\s*;/, "styles.css: joint logos must share one inner card surface");
assert.match(partnershipImageRule, /object-fit:\s*contain\s*;/, "styles.css: both joint logos must remain fully visible");
assert.match(partnershipImageRule, /object-position:\s*center\s*;/, "styles.css: both joint logos must remain centered");
assert.doesNotMatch(css, /\.site-logo-lockup-company img\s*\{/, "styles.css: Haoduobao-only inner frame styling returned");
assert.match(cssRuleBody(css, ".social-platform-group[hidden]"), /display:\s*none\s*!important\s*;/, "styles.css: hidden social categories must not be overridden by the grid display rule");
const homeFooterJoinRules = Array.from(css.matchAll(/main\s*>\s*#team\.team\s*\{([^}]*)\}/g), (match) => match[1]);
assert(homeFooterJoinRules.some((body) => /padding-bottom:\s*0\s*!important\s*;/.test(body)), "styles.css: homepage footer seam padding returned");
const rtlMobileProcessRule = css.match(/\[dir="rtl"\]\s+\.process-step\s*\{([^}]*)\}/m)?.[1] || "";
assert.match(rtlMobileProcessRule, /padding-inline-start:\s*78px\s*;/, "styles.css: RTL mobile process cards must reserve space beside the leading number");
assert.match(rtlMobileProcessRule, /padding-inline-end:\s*22px\s*;/, "styles.css: RTL mobile process card trailing padding regressed");
const inquiryFieldFocusRule = cssRuleBody(css, ".field textarea:focus-visible");
assert.match(inquiryFieldFocusRule, /outline:\s*3px solid #0f6ba8\s*;/, "styles.css: inquiry fields need a solid high-contrast focus outline");
assert.match(inquiryFieldFocusRule, /outline-offset:\s*2px\s*;/, "styles.css: inquiry focus outline needs separation from the field border");
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
for (const token of [
  "data-order-export", "toBlob", "JABBAR_ORDER_ANALYZER_QA",
  "order_file_selected", "order_parse_success", "order_parse_error",
  "order_export_png", "order_export_error", "data-order-inquiry",
  "ORDER_INQUIRY_LABELS", "jabbarCalcResult", "calculator_inquiry"
])
  assert(orderAnalyzer.includes(token), `calculator-order-analyzer.js: missing ${token}`);
assert.equal(count(orderAnalyzer, /^\s{4}(?:zh|en|es|ar|fr|pt|ru|de|it|tr):\s+".*"[,]?$/gm), LOCALES.length, "calculator-order-analyzer.js: localized order inquiry label count");
assert.equal(count(orderAnalyzer, /setAttribute\("data-order-inquiry"/g), 1, "calculator-order-analyzer.js: duplicate order inquiry CTA");
assert.match(orderAnalyzer, /this\.lang === "zh" \? "\/inquiry\/" : "\/" \+ this\.lang \+ "\/inquiry\/"/, "calculator-order-analyzer.js: localized inquiry path missing");
for (const removedToken of ["data-order-wechat", "shareToWeChat", "navigator.share"]) {
  assert(!orderAnalyzer.includes(removedToken), `calculator-order-analyzer.js: removed sharing token remains (${removedToken})`);
}
assert.doesNotMatch(orderAnalyzer, /WeChat|微信/, "calculator-order-analyzer.js: removed WeChat instructions remain");
assert.equal(count(orderAnalyzer, /toolLabel:/g), LOCALES.length, "calculator-order-analyzer.js: localized tool label count");
assert.doesNotMatch(orderAnalyzer, /fillText\(["']Jabbar · 体积工具["']/, "calculator-order-analyzer.js: exported report still hardcodes the Chinese tool label");
assert.match(orderAnalyzer, /fillText\(this\.copy\.toolLabel, startX, 92\)/, "calculator-order-analyzer.js: first export header is not localized");
assert.match(orderAnalyzer, /fillText\(this\.copy\.toolLabel, startX, 155\)/, "calculator-order-analyzer.js: paged export header is not localized");
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

const packageJson = JSON.parse(await load("package.json"));
assert.match(packageJson.scripts["build:css"], /--browserslist/, "package.json: CSS build must honor browser targets");
assert(Array.isArray(packageJson.browserslist) && packageJson.browserslist.includes("Chrome >= 90"), "package.json: legacy browser targets missing");
const minifiedCss = await load("styles.min.css");
assert.doesNotMatch(minifiedCss, /(?:width|height)\s*[<>]=?|[<>]=?\s*(?:width|height)/, "styles.min.css: Media Queries Level 4 range syntax remains");
assert.match(minifiedCss, /\(max-width:/, "styles.min.css: legacy max-width media queries missing");

console.log(`UI enhancement static check passed: ${HOME_PAGES.length} homepages, ${CALCULATOR_PAGES.length} calculators, ${INQUIRY_PAGES.length} inquiry pages, CSS ${CSS_VERSION}, UI ${UI_VERSION}.`);
