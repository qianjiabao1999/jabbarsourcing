#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORDER_VERSION = "order-20260718d";
const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const localePath = (locale, suffix = "") => locale === "zh" ? `${suffix}index.html` : `${locale}/${suffix}index.html`;
const load = (file) => readFile(resolve(ROOT, file), "utf8");
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] || "";
const imageTags = (html) => html.match(/<img\b[^>]*>/gi) || [];

for (const locale of LOCALES) {
  const file = localePath(locale);
  const html = await load(file);
  const images = imageTags(html);
  const gallerySequence = images.filter((tag) => /assets\/gallery\/responsive\//.test(tag) && /\bfetchpriority=/.test(tag));
  assert.equal(gallerySequence.length, 13, `${file}: gallery sequence image count`);
  assert.equal(attribute(gallerySequence[0], "loading"), "eager", `${file}: first gallery image must load eagerly`);
  assert.equal(attribute(gallerySequence[0], "fetchpriority"), "high", `${file}: first gallery image must have high priority`);
  gallerySequence.slice(1).forEach((tag, index) => {
    assert.equal(attribute(tag, "loading"), "lazy", `${file}: gallery image ${index + 2} must be lazy`);
    assert.equal(attribute(tag, "fetchpriority"), "low", `${file}: gallery image ${index + 2} must have low priority`);
  });

  const socialAvatars = images.filter((tag) => /assets\/social-116\//.test(tag));
  assert(socialAvatars.length > 0, `${file}: social avatar images missing`);
  socialAvatars.forEach((tag, index) => {
    assert.equal(attribute(tag, "loading"), "lazy", `${file}: social avatar ${index + 1} must be lazy`);
    assert.equal(attribute(tag, "fetchpriority"), "low", `${file}: social avatar ${index + 1} must have low priority`);
  });
}

for (const locale of LOCALES) {
  const file = localePath(locale, "calculator/");
  const html = await load(file);
  assert.match(html, new RegExp(`calculator-order-loader\\.js\\?v=${ORDER_VERSION}`), `${file}: lazy order loader missing`);
  assert.doesNotMatch(html, /<script[^>]+src="\/assets\/calculator-order-analyzer\.js/i, `${file}: order analyzer must not load directly`);
  assert.doesNotMatch(html, /["']calculator_calculate["']/, `${file}: duplicate calculator success event returned`);
  assert.equal((html.match(/data-order-analyzer/g) || []).length, 1, `${file}: order analyzer mount count`);
}

const loader = await load("assets/calculator-order-loader.js");
for (const token of [
  "data-order-load",
  "touchstart",
  "pointerenter",
  "dragenter",
  "data-order-analyzer-runtime",
  "showLoadError",
  "JabbarOrderAnalyzer.init"
]) {
  assert(loader.includes(token), `calculator-order-loader.js: missing ${token}`);
}
assert.doesNotMatch(loader, /IntersectionObserver/, "calculator-order-loader.js: viewport observation would eagerly load the in-view analyzer");
assert.match(loader, new RegExp(`order-${ORDER_VERSION.replace(/^order-/, "")}`), "calculator-order-loader.js: order version mismatch");

const deployWorkflow = await load(".github/workflows/deploy.yml");
assert.match(deployWorkflow, /--exclude='\/assets\/social-source\/'/, "deploy.yml: social source archive must not be published");

console.log("Performance loading guards passed: 10 homepages, 10 calculators, deferred order analyzer, social-source excluded.");
