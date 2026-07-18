import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const expectedPages = [
  ...locales.flatMap((locale) => {
    const prefix = locale ? `${locale}/` : "";
    return [`${prefix}index.html`, `${prefix}inquiry/index.html`, `${prefix}calculator/index.html`];
  }),
  "404.html",
  "privacy-policy.html",
  "website-privacy-policy.html",
  "support.html"
];
const consentReference = '<script src="/assets/analytics-consent.js?v=consent-20260719a" defer></script>';
const failures = [];

for (const relativePath of expectedPages) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const referenceCount = source.split(consentReference).length - 1;
  if (referenceCount !== 1) {
    failures.push(`${relativePath}: expected one shared consent script reference, found ${referenceCount}`);
  }
  const consentIndex = source.indexOf(consentReference);
  for (const dependentScript of ["/assets/inquiry-form.js", "/assets/site-enhancements.js"]) {
    const dependentIndex = source.indexOf(dependentScript);
    if (dependentIndex >= 0 && (consentIndex < 0 || consentIndex > dependentIndex)) {
      failures.push(`${relativePath}: consent controller must load before ${dependentScript}`);
    }
  }
  if (/googletagmanager\.com\/gtag\/js|clarity\.ms\/tag/.test(source)) {
    failures.push(`${relativePath}: direct analytics network loader remains in HTML`);
  }
  if (/gtag\(["']config["']\s*,\s*["']G-C6X14RZHNZ/.test(source)) {
    failures.push(`${relativePath}: direct gtag configuration remains in HTML`);
  }
}

const consentSource = fs.readFileSync(path.join(root, "assets/analytics-consent.js"), "utf8");
for (const language of ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"]) {
  if (!consentSource.includes(`"${language}": {`)) {
    failures.push(`assets/analytics-consent.js: missing ${language} copy`);
  }
}
for (const requiredToken of [
  'var STORAGE_KEY = "jabbar.analyticsConsent.v1"',
  'if (consentState === "granted") loadAnalytics()',
  'window.jabbarTrack = track',
  'window.jabbarAnalyticsConsent =',
  'privacyLink.href = "/website-privacy-policy.html"',
  '"https://www.googletagmanager.com/gtag/js?id="',
  '"https://www.clarity.ms/tag/"'
]) {
  if (!consentSource.includes(requiredToken)) {
    failures.push(`assets/analytics-consent.js: missing consent gate token ${requiredToken}`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Analytics consent QA passed for ${expectedPages.length} pages and 10 languages.`);
