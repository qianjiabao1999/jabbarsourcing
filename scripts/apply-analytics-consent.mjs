import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const targets = [
  ...locales.flatMap((locale) => {
    const prefix = locale ? `${locale}/` : "";
    return [`${prefix}index.html`, `${prefix}inquiry/index.html`, `${prefix}calculator/index.html`];
  }),
  "404.html",
  "privacy-policy.html",
  "website-privacy-policy.html",
  "support.html"
];

const googleTag = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-C6X14RZHNZ"></script>';
const CONSENT_VERSION = "consent-20260719b";
const replacementTag = `<script src="/assets/analytics-consent.js?v=${CONSENT_VERSION}" defer></script>`;
const consentTagPattern = /^[ \t]*<script src="\/assets\/analytics-consent\.js\?v=consent-[^"]+" defer><\/script>[ \t]*(?:\r?\n)?/gm;

function scriptEndAfter(source, start) {
  const end = source.indexOf("</script>", start);
  if (end < 0) throw new Error("Unclosed analytics script block");
  return end + "</script>".length;
}

function normalizeConsentPlacement(source, relativePath) {
  const withoutConsent = source.replace(consentTagPattern, "");
  const stylesheet = withoutConsent.match(/^[ \t]*<link rel="stylesheet" href="[^"]*styles\.min\.css\?v=[^"]+" \/>\s*$/m);
  if (!stylesheet || stylesheet.index === undefined) {
    throw new Error(`${relativePath}: versioned stylesheet link not found`);
  }
  const lineEnd = withoutConsent.indexOf("\n", stylesheet.index + stylesheet[0].length);
  const insertionPoint = lineEnd < 0 ? withoutConsent.length : lineEnd + 1;
  return withoutConsent.slice(0, insertionPoint)
    + `    ${replacementTag}\n`
    + withoutConsent.slice(insertionPoint);
}

function migrateFile(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  if (/\/assets\/analytics-consent\.js\?v=consent-[^"]+/.test(source) && !source.includes(googleTag)) {
    const normalized = normalizeConsentPlacement(source, relativePath);
    if (normalized === source) return false;
    fs.writeFileSync(filePath, normalized);
    return true;
  }

  let start = source.indexOf(googleTag);
  if (start < 0) throw new Error(`${relativePath}: Google Analytics loader not found`);

  const dataLayerStart = source.indexOf("<script", start + googleTag.length);
  const dataLayerEnd = scriptEndAfter(source, dataLayerStart);
  const dataLayerBlock = source.slice(dataLayerStart, dataLayerEnd);
  if (!dataLayerBlock.includes("gtag(") || !dataLayerBlock.includes("G-C6X14RZHNZ")) {
    throw new Error(`${relativePath}: expected inline gtag configuration after loader`);
  }

  const clarityStart = source.indexOf("<script", dataLayerEnd);
  const clarityEnd = scriptEndAfter(source, clarityStart);
  const clarityBlock = source.slice(clarityStart, clarityEnd);
  if (!clarityBlock.includes("clarity.ms/tag")) {
    throw new Error(`${relativePath}: expected Microsoft Clarity loader after gtag configuration`);
  }

  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const indentation = source.slice(lineStart, start);
  let replacementStart = lineStart;
  const preceding = source.slice(Math.max(0, lineStart - 96), lineStart);
  if (/<!-- Analytics placeholders:[^\n]*-->\s*$/.test(preceding)) {
    const commentStart = source.lastIndexOf("<!-- Analytics placeholders:", lineStart);
    replacementStart = source.lastIndexOf("\n", commentStart - 1) + 1;
  }

  const migrated = source.slice(0, replacementStart)
    + indentation
    + replacementTag
    + source.slice(clarityEnd);
  fs.writeFileSync(filePath, normalizeConsentPlacement(migrated, relativePath));
  return true;
}

let changed = 0;
for (const relativePath of targets) {
  if (migrateFile(relativePath)) changed += 1;
}

console.log(`Analytics consent migration complete: ${changed}/${targets.length} files updated.`);
