#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORDER_VERSION = "order-20260722c";
const CONTAINER_VERSION = "container-20261011b";
const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const localePath = (locale, suffix = "") => locale === "zh" ? `${suffix}index.html` : `${locale}/${suffix}index.html`;
const load = (file) => readFile(resolve(ROOT, file), "utf8");
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] || "";
const imageTags = (html) => html.match(/<img\b[^>]*>/gi) || [];

for (const locale of LOCALES) {
  const file = localePath(locale);
  const html = await load(file);
  assert.doesNotMatch(html, /container-visual\.js/, `${file}: calculator-only container visual loaded on homepage`);
  const shipmentRail = html.match(/<div\b[^>]*class="[^"]*shipment-ticker-rail[^"]*"[^>]*>/i)?.[0] || "";
  assert.equal(attribute(shipmentRail, "data-shipments-enabled"), "false", `${file}: placeholder shipment feed must remain explicitly disabled`);
  assert.match(attribute(shipmentRail, "data-shipments-source"), /^\/shipments\.json\?v=shipments-/, `${file}: shipment source must keep a cache version`);
  const images = imageTags(html);
  const navigationMarks = images.filter((tag) => /jabbar-sourcing-mark-transparent\.webp\?v=nav-20260719/.test(tag));
  const partnershipMarks = images.filter((tag) => /jabbar-sourcing-mark-transparent-hd\.webp\?v=brand-20260722hd1/.test(tag));
  assert.equal(navigationMarks.length, 1, `${file}: lightweight navigation mark reference missing`);
  assert.equal(partnershipMarks.length, 1, `${file}: high-density partnership mark reference missing`);
  assert.doesNotMatch(html, /\bhero-site-photo\b/, `${file}: hidden former mobile hero must not request warehouse assets`);
  const warehouseImages = images.filter((tag) => /\bsrc="[^"]*\/landscape-05-960\.webp/.test(tag));
  assert.equal(warehouseImages.length, 1, `${file}: real warehouse photo must remain in the gallery once`);
  assert.match(attribute(warehouseImages[0], "srcset"), /landscape-05-480\.webp[^,]*480w,\s*[^,]*landscape-05-960\.webp[^,]*960w/, `${file}: warehouse gallery must retain responsive WebP variants`);
  assert.equal(attribute(warehouseImages[0], "loading"), "lazy", `${file}: warehouse gallery image must stay lazy`);
  assert.equal(attribute(warehouseImages[0], "fetchpriority"), "low", `${file}: warehouse gallery image must not compete with the first screen`);
  assert.match(attribute(navigationMarks[0], "srcset"), /jabbar-sourcing-mark-72\.webp 72w/, `${file}: small navigation logo variant missing`);
  assert.match(attribute(partnershipMarks[0], "srcset"), /jabbar-sourcing-mark-256\.webp 256w/, `${file}: responsive hero logo variant missing`);
  assert.match(attribute(partnershipMarks[0], "sizes"), /84px, 116px/, `${file}: responsive hero logo sizing missing`);
  assert.doesNotMatch(html, /jabbar-sourcing-mark-transparent\.png/, `${file}: unoptimized transparent brand mark returned`);
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

  const proofImage = images.find((tag) => /testimonial-boyner-720\.webp/.test(tag));
  assert(proofImage, `${file}: responsive client proof image missing`);
  assert.match(attribute(proofImage, "srcset"), /480w.*720w.*1200w/, `${file}: client proof image srcset missing`);
  const nigeria = (html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || []).filter(card => card.includes("🇳🇬"));
  assert.equal(nigeria.length, 1, `${file}: expected one Nigeria customer card`);
  const visit = imageTags(nigeria[0]);
  assert.equal(visit.length, 1);
  const amount = nigeria[0].match(/<bdi\b[^>]*class="num-mono"[^>]*>([^<]+)<\/bdi>/)?.[1];
  assert.equal(amount?.replace(/[^0-9]/g, ""), "94000", file + ": unchanged Nigeria order value");
  assert.match(amount, /USD|دولار/);
  assert(nigeria[0].includes("Samuel N."), file + ": unchanged reviewer");
  assert.equal(attribute(visit[0], "width"), "720");
  assert.equal(attribute(visit[0], "height"), "568");
  assert.equal(attribute(visit[0], "loading"), "lazy");
  assert.equal(attribute(visit[0], "decoding"), "async");
  assert.equal(attribute(visit[0], "fetchpriority"), "low");
  assert(attribute(visit[0], "alt").trim());
  const stem = "/assets/nigeria-client-visit-20261125-";
  assert.equal(attribute(visit[0], "src"), stem + "720.webp");
  assert.equal(attribute(visit[0], "srcset"), [480, 720, 1080].map(w => stem + w + ".webp " + w + "w").join(", "));
}
for (const width of [480, 720, 1080]) {
  const photo = await readFile(resolve(ROOT, `assets/nigeria-client-visit-20261125-${width}.webp`));
  assert.equal(photo.toString("ascii", 8, 12), "WEBP");
}

for (const locale of LOCALES) {
  const file = localePath(locale, "calculator/");
  const html = await load(file);
  assert.match(html, new RegExp(`calculator-order-loader\\.js\\?v=${ORDER_VERSION}`), `${file}: lazy order loader missing`);
  assert.match(html, new RegExp(`container-visual\\.js\\?v=${CONTAINER_VERSION}`), `${file}: calculator-only 3D container visual missing`);
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
  "dragover",
  "pendingDropFiles",
  "event.preventDefault()",
  "replayPendingDrop",
  "data-order-analyzer-runtime",
  "showLoadError",
  "JabbarOrderAnalyzer.init"
]) {
  assert(loader.includes(token), `calculator-order-loader.js: missing ${token}`);
}
assert.doesNotMatch(loader, /IntersectionObserver/, "calculator-order-loader.js: viewport observation would eagerly load the in-view analyzer");
assert.match(loader, new RegExp(`order-${ORDER_VERSION.replace(/^order-/, "")}`), "calculator-order-loader.js: order version mismatch");

const containerVisual = await load("assets/container-visual.js");
const styles = await load("styles.css");
assert.match(styles, /\.sourcing-gallery\s*\{[^}]*content-visibility:\s*visible;[^}]*contain-intrinsic-size:\s*none;/, "styles.css: gallery placeholders must not displace first Safari anchor navigation");
assert.match(containerVisual, new RegExp(CONTAINER_VERSION), "container-visual.js: container version mismatch");
for (const file of ["assets/container-40hq-shell-20260722.webp", "assets/container-cargo-stack-20260722e.webp"]) {
  const asset = await readFile(resolve(ROOT, file));
  assert(asset.byteLength > 20_000, `${file}: visual asset is unexpectedly empty`);
}

const deployWorkflow = await load(".github/workflows/deploy.yml");
const heroFallback = await readFile(resolve(ROOT, "assets/gallery/responsive/landscape-05-480.jpg"));
assert(heroFallback.byteLength >= 1000 && heroFallback.byteLength <= 60 * 1024, "mobile warehouse JPEG fallback budget exceeded or file missing");
assert.equal(heroFallback.readUInt16BE(), 0xffd8, "mobile warehouse fallback must be a JPEG");
assert(deployWorkflow.includes("gallery/responsive/landscape-05-480.jpg"), "deploy.yml: mobile hero fallback artifact assertion missing");
assert.match(deployWorkflow, /--exclude='\/assets\/social-source\/'/, "deploy.yml: social source archive must not be published");
assert.match(deployWorkflow, /--exclude='\/assets\/gallery\/\*\.jpg'/, "deploy.yml: unreferenced full-size gallery JPG originals must not be published");
for (const file of ["container-visual.js", "container-40hq-shell-20260722.webp", "container-cargo-stack-20260722e.webp"]) {
  assert.match(deployWorkflow, new RegExp(`test -f _site/assets/${file.replaceAll(".", "\\.")}`), `deploy.yml: ${file} artifact assertion missing`);
}

console.log("Performance loading guards passed: 10 homepages, 10 calculators, deferred order analyzer, disabled placeholder shipments, source archives excluded.");
