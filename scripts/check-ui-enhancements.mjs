#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_VERSION = "apple-158";
const AI_VERSION = "ai-20260712b";
const UI_VERSION = "ui-20260713c";
const ORDER_VERSION = "order-20260713b";
const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const SECTION_CODES = [
  "JBSU 001 · TEAM", "JBSU 002 · GALLERY", "JBSU 003 · SERVICES", "JBSU 004 · PROCESS",
  "JBSU 005 · ABOUT", "JBSU 006 · REVIEWS", "JBSU 007 · FAQ", "JBSU 008 · SOCIAL"
];
const STAMP_TOKENS = ["QC PASSED ✓", "REPLY < 24H", "TRIAL $1,000"];
const CITY_FIELDS = LOCALES.map((locale) => `city_${locale}`).sort();
const localePath = (locale, suffix = "") => locale === "zh" ? `${suffix}index.html` : `${locale}/${suffix}index.html`;
const HOME_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale) }));
const CALCULATOR_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale, "calculator/") }));
const INQUIRY_PAGES = LOCALES.map((locale) => ({ locale, file: localePath(locale, "inquiry/") }));
const EXTRA_PAGES = ["404.html", "privacy-policy.html", "support.html"];

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
  assert.equal(count(html, /class="mobile-conversion-bar"/g), 1, `${file}: mobile conversion bar count`);
  assert.equal(count(html, /class="faq-item"/g), 7, `${file}: FAQ item count`);
  assert.deepEqual(textsForClass(html, "p", "section-code"), SECTION_CODES, `${file}: section code order`);
  assert.equal(countClass(html, "section-rule"), SECTION_CODES.length, `${file}: section rule count`);
  assert.equal(countClass(html, "stamp-row"), 1, `${file}: stamp row count`);
  assert.equal(countClass(html, "stamp-item"), STAMP_TOKENS.length, `${file}: stamp item count`);
  assert.deepEqual(textsForClass(html, "span", "stamp"), STAMP_TOKENS, `${file}: stamp tokens`);
  const stampNotes = textsForClass(html, "small", "stamp-note");
  assert.equal(stampNotes.length, STAMP_TOKENS.length, `${file}: stamp note count`);
  assert(stampNotes.every(Boolean), `${file}: empty localized stamp note`);
  assert.equal(countClass(html, "shipment-ticker"), 1, `${file}: shipment ticker count`);
  assert.equal(countClass(html, "shipment-ticker-rail"), 1, `${file}: shipment ticker rail count`);
  assert.match(html, /data-shipments-source="\/shipments\.json\?v=shipments-20260713a"/, `${file}: shipment data source`);
  const metricNumbers = tagsWithClass(html, "bdi", "company-metric-number")
    .filter((match) => classListFromAttributes(match[1]).includes("num-mono"));
  assert.equal(metricNumbers.length, 5, `${file}: monospaced company metric count`);
  const reviewMetas = regionsForClass(html, "div", "testimonial-order-meta");
  assert.equal(reviewMetas.length, 3, `${file}: testimonial metadata count`);
  assert(reviewMetas.every((region) => countClass(region, "num-mono") === 1), `${file}: review amount must be the only monospaced metadata value`);
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
  assert.deepEqual(textsForClass(html, "p", "section-code"), ["JBSU T01 · CALCULATOR"], `${file}: calculator section code`);
  assert.equal(countClass(html, "section-rule"), 1, `${file}: calculator section rule count`);
  assert(tagsWithClass(html, "line", "cbm-dimension-line").length >= 3, `${file}: CBM dimension line count`);
  const capTag = tagById(html, "cbmCap");
  const percentageTag = tagById(html, "cbmPct");
  const fillTag = tagById(html, "cbmFill");
  assert(hasClass(capTag, "num-mono"), `${file}: CBM capacity label is not monospaced`);
  assert(hasClass(percentageTag, "num-mono"), `${file}: CBM percentage is not monospaced`);
  assert(Number(attribute(capTag, "y")) < Number(attribute(fillTag, "y")), `${file}: capacity label must sit above the container`);
  assert.equal(count(html, /window\.renderCbmVisual\(total\)/g), 1, `${file}: CBM visual hook count`);
  assert.equal(count(html, /mobile-conversion-bar/g), 0, `${file}: calculator must not include mobile conversion bar`);
  if (locale === "ar") assert.match(html, /<html[^>]+lang="ar"[^>]+dir="rtl"/, `${file}: Arabic RTL root missing`);
}

for (const { file } of INQUIRY_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing QR enhancement`);
  assert.equal(count(html, /mobile-conversion-bar/g), 0, `${file}: inquiry must not include mobile conversion bar`);
}

for (const file of EXTRA_PAGES) {
  const html = await load(file);
  assert.match(html, new RegExp(`styles\\.min\\.css\\?v=${CSS_VERSION}`), `${file}: stale CSS version`);
  assert.match(html, new RegExp(`site-enhancements\\.js\\?v=${UI_VERSION}`), `${file}: missing QR enhancement`);
}

const javascript = await load("assets/site-enhancements.js");
for (const locale of LOCALES) {
  assert.match(javascript, new RegExp(`\\n\\s*${locale}: \\{`), `site-enhancements.js: missing ${locale} labels`);
}
for (const token of [
  "contact-speed-dial", "renderCbmVisual", "service-country-marquee", "site-scroll-progress",
  "ui-section-reveal", "faq-quick-tags", "whatsapp-qr.svg", "prefers-reduced-motion",
  "initTrustStamps", "initShipmentTicker", "Intl.RelativeTimeFormat", "shipments.json"
]) {
  assert(javascript.includes(token), `site-enhancements.js: missing ${token}`);
}
assert(!javascript.includes("ja:"), "site-enhancements.js: Japanese labels must not return");

const css = await load("styles.css");
for (const token of [
  ".contact-speed-dial", ".cbm-visual", ".service-country-marquee", ".site-scroll-progress",
  ".ui-section-reveal", ".faq-quick-tags", ".whatsapp-qr-card", "prefers-reduced-motion",
  "--font-mono-stack", ".num-mono", ".section-code", ".section-rule", ".stamp-row",
  ".shipment-ticker", ".cbm-dimension-line"
]) {
  assert(css.includes(token), `styles.css: missing ${token}`);
}
assert(css.includes(".social-platform-groups .section-heading"), "styles.css: social heading centering missing");
for (const token of [
  ".calculator-order-upload", ".order-analyzer__dropzone", ".order-analyzer__mapping",
  ".order-analyzer__metrics", ".order-analyzer__actions", ".order-analyzer__table"
]) {
  assert(css.includes(token), `styles.css: missing ${token}`);
}

const orderAnalyzer = await load("assets/calculator-order-analyzer.js");
const orderWorker = await load("assets/calculator-order-worker.js");
for (const token of ["data-order-export", "data-order-wechat", "18658925544", "navigator.share", "toBlob", "JABBAR_ORDER_ANALYZER_QA"])
  assert(orderAnalyzer.includes(token), `calculator-order-analyzer.js: missing ${token}`);
for (const token of ["xlsx.full.min.js?v=0.20.3", "MAX_ROWS", "unitWeight", "unitVolume", "amount"])
  assert(orderWorker.includes(token), `calculator-order-worker.js: missing ${token}`);

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
