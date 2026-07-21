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
  "support.html",
  ...locales.filter(Boolean).map((locale) => `${locale}/website-privacy-policy.html`)
];
const CONSENT_VERSION = "consent-20260720a";
const consentReference = `<script src="/assets/analytics-consent.js?v=${CONSENT_VERSION}" defer></script>`;
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
  if (source.includes("jabbar-analytics-settings")) {
    failures.push(`${relativePath}: legacy floating privacy-settings control remains`);
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
  'var SESSION_DEFER_KEY = "jabbar.analyticsConsent.deferred"',
  'if (consentState === "granted") loadAnalytics()',
  'window.setTimeout(loadAnalytics, 0)',
  'function isActionBlocked() {',
  'function queueEvent(eventName, params) {',
  'function flushQueuedEvents()',
  'setSessionDeferred(true)',
  'target.closest("[data-analytics-consent-open]")',
  'window.jabbarTrack = track',
  'window.jabbarAnalyticsConsent =',
  'var POLICY_VERSION = "2026-07-19"',
  "var CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000",
  "var DECISION_TTL_MS = 30 * 24 * 60 * 60 * 1000",
  "var AUTO_PROMPT_DELAY_MS = 1800",
  "JSON.stringify({",
  'window.gtag("consent", "default"',
  'window.gtag("consent", "update"',
  'panel.setAttribute("aria-live", "polite")',
  "panel.hidden = true",
  'document.querySelector(".js-inquiry-form")',
  'inquiryForm.addEventListener("focusin", hidePanelForInquiryFocus)',
  'window.addEventListener("wheel", handleAutomaticScrollIntent',
  'window.addEventListener("touchmove", handleAutomaticScrollIntent',
  'document.addEventListener("keydown", handleAutomaticScrollIntent)',
  "setPanelOpen(true, false)",
  'background-color:#0f766e',
  'privacyLink.href = languageKey() === "zh"',
  '"https://www.googletagmanager.com/gtag/js?id="',
  '"https://www.clarity.ms/tag/"'
]) {
  if (!consentSource.includes(requiredToken)) {
    failures.push(`assets/analytics-consent.js: missing consent gate token ${requiredToken}`);
  }
}
if (consentSource.includes("jabbar-analytics-settings")) {
  failures.push("assets/analytics-consent.js: legacy floating privacy-settings control remains");
}
if (!/function setPanelOpen\(isOpen, shouldFocus\)\s*{[\s\S]*?panel\.hidden = !isOpen;/m.test(consentSource)) {
  failures.push("assets/analytics-consent.js: panel visibility is not independent from an optional settings control");
}
const inquiryHideSource = consentSource.match(/function hidePanelForInquiryFocus\(\)\s*{([\s\S]*?)\n\s*}/m)?.[1] || "";
if (!inquiryHideSource || inquiryHideSource.includes("setSessionDeferred")) {
  failures.push("assets/analytics-consent.js: inquiry focus must hide temporarily without recording decide later");
}
if (consentSource.includes('window.addEventListener("scroll"')) {
  failures.push("assets/analytics-consent.js: automatic prompt must not treat programmatic scroll as user intent");
}

for (const stylesheet of ["styles.css", "styles.min.css"]) {
  const stylesheetSource = fs.readFileSync(path.join(root, stylesheet), "utf8");
  if (stylesheetSource.includes("jabbar-analytics-settings")) {
    failures.push(`${stylesheet}: legacy floating privacy-settings selector remains`);
  }
}

const websitePrivacy = fs.readFileSync(path.join(root, "website-privacy-policy.html"), "utf8");
if ((websitePrivacy.match(/<button\b[^>]*\bdata-analytics-consent-open\b[^>]*>/gi) || []).length !== 1) {
  failures.push("website-privacy-policy.html: expected one non-floating analytics-consent opener");
}

const policyRoutes = [
  { locale: "zh", file: "website-privacy-policy.html", lang: "zh-CN", canonical: "/website-privacy-policy.html", later: "稍后决定”选择最长保存 30 天" },
  { locale: "en", file: "en/website-privacy-policy.html", lang: "en", canonical: "/en/website-privacy-policy.html", later: "Decide later choice is stored for up to 30 days" },
  { locale: "es", file: "es/website-privacy-policy.html", lang: "es", canonical: "/es/website-privacy-policy.html", later: "Decidir más tarde se guarda durante un máximo de 30 días" },
  { locale: "ar", file: "ar/website-privacy-policy.html", lang: "ar", canonical: "/ar/website-privacy-policy.html", rtl: true, later: "القرار لاحقاً» لمدة تصل إلى 30 يوماً" },
  { locale: "fr", file: "fr/website-privacy-policy.html", lang: "fr", canonical: "/fr/website-privacy-policy.html", later: "Décider plus tard est conservé pendant 30 jours au maximum" },
  { locale: "pt", file: "pt/website-privacy-policy.html", lang: "pt", canonical: "/pt/website-privacy-policy.html", later: "Decidir mais tarde é guardada por até 30 dias" },
  { locale: "ru", file: "ru/website-privacy-policy.html", lang: "ru", canonical: "/ru/website-privacy-policy.html", later: "Решить позже» хранится не более 30 дней" },
  { locale: "de", file: "de/website-privacy-policy.html", lang: "de", canonical: "/de/website-privacy-policy.html", later: "Später entscheiden wird höchstens 30 Tage gespeichert" },
  { locale: "it", file: "it/website-privacy-policy.html", lang: "it", canonical: "/it/website-privacy-policy.html", later: "Decidi più tardi viene conservata per un massimo di 30 giorni" },
  { locale: "tr", file: "tr/website-privacy-policy.html", lang: "tr", canonical: "/tr/website-privacy-policy.html", later: "Daha sonra karar ver seçimi en fazla 30 gün saklanır" }
];

for (const route of policyRoutes) {
  const source = fs.readFileSync(path.join(root, route.file), "utf8");
  const htmlTag = source.match(/<html\b[^>]*>/i)?.[0] || "";
  if (!htmlTag.includes(`lang="${route.lang}"`) || Boolean(/\bdir="rtl"/.test(htmlTag)) !== Boolean(route.rtl)) {
    failures.push(`${route.file}: lang or RTL metadata is incorrect`);
  }
  if (!source.includes(`<link rel="canonical" href="https://www.jabbarsourcing.com${route.canonical}" />`)) {
    failures.push(`${route.file}: canonical URL is missing or incorrect`);
  }
  for (const hreflang of ["x-default", "zh-Hans", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"]) {
    if (!source.includes(`hreflang="${hreflang}"`)) failures.push(`${route.file}: missing hreflang ${hreflang}`);
  }
  for (const disclosure of ["Cloudflare", "Google", "Microsoft Clarity", "24", "24", "qianjiabao1999@gmail.com"]) {
    if (!source.includes(disclosure)) failures.push(`${route.file}: formal disclosure is missing ${disclosure}`);
  }
  if (!source.includes("12")) {
    failures.push(`${route.file}: local analytics-preference retention disclosure is missing`);
  }
  if (!source.includes("Cloudflare Workers") || !source.includes("7")) {
    failures.push(`${route.file}: structured Workers Logs retention disclosure is missing`);
  }
  if (!source.includes(route.later)) {
    failures.push(`${route.file}: 30-day Decide later retention disclosure is missing`);
  }
  if (!source.includes('href="weixin://"') || source.includes("#wechat-modal") || source.includes("js-contact-modal-open")) {
    failures.push(`${route.file}: footer WeChat action is missing or points to a nonexistent modal`);
  }
  if ((source.match(/data-analytics-consent-open/g) || []).length !== 1) {
    failures.push(`${route.file}: expected one non-floating analytics-consent opener`);
  }
  if (/fonts\.(?:googleapis|gstatic)\.com/.test(source)) {
    failures.push(`${route.file}: remote Google Fonts dependency remains`);
  }
}

for (const file of ["privacy-policy.html", "support.html"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (/fonts\.(?:googleapis|gstatic)\.com/.test(source)) failures.push(`${file}: remote Google Fonts dependency remains`);
}

const consentDefaultIndex = consentSource.indexOf('window.gtag("consent", "default"');
const consentJsIndex = consentSource.indexOf('window.gtag("js", new Date())');
if (consentDefaultIndex < 0 || consentJsIndex < 0 || consentDefaultIndex > consentJsIndex) {
  failures.push("assets/analytics-consent.js: Consent Mode default must be set before gtag js");
}
if (!consentSource.includes('if (!eventName || isActionBlocked()) return;')
  || !consentSource.includes('if (consentState === "granted" && typeof window.gtag === "function") {')) {
  failures.push("assets/analytics-consent.js: pre-consent event path must block denied only and queue otherwise");
}
if (!consentSource.includes("if (queuedEvents.length >= 40) queuedEvents.shift();")
  || consentSource.includes("queuedEvents.length >= 40) return")) {
  failures.push("assets/analytics-consent.js: full pending queue must evict the oldest event instead of the newest conversion");
}
if (/if \(consentState !== "granted" \|\| !eventName\) return;/.test(consentSource)) {
  failures.push("assets/analytics-consent.js: old pre-consent discard path still present");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Analytics consent QA passed for ${expectedPages.length} pages and 10 languages.`);
