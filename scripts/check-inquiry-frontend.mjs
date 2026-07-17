#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://inquiry-api.jabbarsourcing.com/inquiry";
const SITEKEY = "0x4AAAAAADz9u67h7xPWOdMV";
const TURNSTILE_ACTION = "turnstile-spin-v1";
const PRIVACY_VERSION = "2026-07-18";
const CSS_VERSION = "apple-163";
const JS_VERSION = "inquiry-20260718a";
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const PAGES = [
  { file: "inquiry/index.html", locale: "zh", source: "/inquiry/" },
  { file: "en/inquiry/index.html", locale: "en", source: "/en/inquiry/" },
  { file: "es/inquiry/index.html", locale: "es", source: "/es/inquiry/" },
  { file: "ar/inquiry/index.html", locale: "ar", source: "/ar/inquiry/", rtl: true },
  { file: "fr/inquiry/index.html", locale: "fr", source: "/fr/inquiry/" },
  { file: "pt/inquiry/index.html", locale: "pt", source: "/pt/inquiry/" },
  { file: "ru/inquiry/index.html", locale: "ru", source: "/ru/inquiry/" },
  { file: "de/inquiry/index.html", locale: "de", source: "/de/inquiry/" },
  { file: "it/inquiry/index.html", locale: "it", source: "/it/inquiry/" },
  { file: "tr/inquiry/index.html", locale: "tr", source: "/tr/inquiry/" },
];

const BUSINESS_FIELDS = [
  "product",
  "referenceUrl",
  "category",
  "quantity",
  "budget",
  "market",
  "contact",
  "company",
  "note",
];

const PAYLOAD_FIELDS = [
  ...BUSINESS_FIELDS,
  "locale",
  "sourcePath",
  "privacyAcknowledged",
  "privacyVersion",
  "submissionId",
  "turnstileToken",
  "attribution",
];

const MAX_LENGTHS = new Map([
  ["product", "300"],
  ["referenceUrl", "500"],
  ["category", "120"],
  ["quantity", "120"],
  ["budget", "120"],
  ["market", "120"],
  ["contact", "200"],
  ["company", "160"],
  ["note", "1500"],
]);

const FALLBACK_CHANNELS = ["whatsapp", "gmail", "wechat", "telegram"];
const failures = [];

function fail(scope, message) {
  failures.push({ scope, message });
}

function parseAttributes(source) {
  const attributes = new Map();
  const pattern = /([A-Za-z_:][A-Za-z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? null);
  }
  return attributes;
}

function parseTag(tag) {
  const nameMatch = tag.match(/^<\s*([A-Za-z0-9:-]+)/);
  return {
    name: nameMatch ? nameMatch[1].toLowerCase() : "",
    attributes: parseAttributes(tag.replace(/^<\s*[A-Za-z0-9:-]+/, "").replace(/\/?\s*>$/, "")),
  };
}

function findTags(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return Array.from(html.matchAll(pattern), (match) => parseTag(match[0]));
}

function classTokens(attributes) {
  return new Set(String(attributes.get("class") ?? "").split(/\s+/).filter(Boolean));
}

function hasClass(tag, className) {
  return classTokens(tag.attributes).has(className);
}

function countClassToken(html, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (html.match(new RegExp(`(?:^|[\\s\"'])${escaped}(?=$|[\\s\"'])`, "g")) ?? []).length;
}

function sorted(values) {
  return [...values].sort();
}

function expectExactSet(scope, label, actualValues, expectedValues) {
  const actual = sorted(actualValues);
  const expected = sorted(expectedValues);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(scope, `${label}: expected [${expected.join(", ")}], got [${actual.join(", ")}]`);
  }
}

function checkSingleTag(scope, tags, description) {
  if (tags.length !== 1) {
    fail(scope, `${description}: expected exactly 1, got ${tags.length}`);
    return null;
  }
  return tags[0];
}

function checkSharedJavascript(source) {
  const scope = "assets/inquiry-form.js";
  for (const locale of PAGES.map((page) => page.locale)) {
    const messageBlock = source.match(new RegExp(`\\n\\s*${locale}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
    if (!messageBlock) {
      fail(scope, `missing message block for ${locale}`);
      continue;
    }
    if (!/sendingLabel\s*:/.test(messageBlock[1])) {
      fail(scope, `${locale} messages must include sendingLabel`);
    }
    if (!/success\s*:\s*[^\n]*24/.test(messageBlock[1])) {
      fail(scope, `${locale} success message must promise a reply within 24 hours`);
    }
  }

  const requiredSourceFragments = [
    ["calculator handoff key", '"jabbarCalcResult"'],
    ["calculator handoff timestamp", "result.savedAt"],
    ["calculator message-to-note handoff", "result.note || result.message"],
    ["two-hour calculator handoff limit", "2 * 60 * 60 * 1000"],
    ["submitting button label", "messages.sendingLabel : directButtonLabel"],
    ["accessible success icon", 'icon.setAttribute("aria-hidden", "true")'],
    ["WhatsApp success shortcut", '"https://wa.me/8618658925544"'],
    ["safe external target", 'whatsapp.target = "_blank"'],
    ["safe external relationship", 'whatsapp.rel = "noopener noreferrer"'],
    ["status reveal animation frame", "window.requestAnimationFrame"],
    ["reduced-motion status reveal", 'window.matchMedia("(prefers-reduced-motion: reduce)")'],
    ["nearest status reveal", 'status.scrollIntoView({ block: "nearest"'],
    ["status focus without extra scrolling", "status.focus({ preventScroll: true })"],
    ["non-disruptive status focus guard", "var mayMoveFocus"],
    ["localized optional field labels", "OPTIONAL_LABELS"],
    ["required field marker", 'marker.classList.add("is-required")'],
    ["first-touch attribution storage", '"jabbarAttributionV1"'],
    ["safe landing path", "safeLandingPath"],
    ["canonical index-path normalization", 'path.replace(/\\/index\\.html$/, "/")'],
    ["external referrer host only", "externalReferrerHost"],
    ["inquiry view event", 'trackEvent("inquiry_view"'],
    ["custom form-start event", 'trackEvent("inquiry_form_start"'],
    ["submit-start event", 'trackEvent("inquiry_submit_start"'],
    ["submit-error event", 'trackEvent("inquiry_submit_error"'],
    ["bounded submit duration", "boundedDuration"],
    ["duration upper bound", "Math.min(60000"],
    ["fallback-channel event", 'trackEvent("channel_fallback"'],
    ["canonical success event", 'trackEvent("inquiry_submit"'],
  ];
  for (const [label, fragment] of requiredSourceFragments) {
    if (!source.includes(fragment)) fail(scope, `missing ${label}`);
  }

  const buildPayload = source.match(
    /function\s+buildPayload\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}\n\s*\n\s*function\s+completeSubmission/,
  );
  if (!buildPayload) {
    fail(scope, "could not locate buildPayload() for the strict field contract check");
    return;
  }

  const returnedObject = buildPayload[1].match(/return\s*\{([\s\S]*?)\}\s*;/);
  if (!returnedObject) {
    fail(scope, "could not locate the payload object returned by buildPayload()");
    return;
  }

  const keys = Array.from(
    returnedObject[1].matchAll(/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm),
    (match) => match[1],
  );
  expectExactSet(scope, "payload fields", keys, PAYLOAD_FIELDS);
  if (new Set(keys).size !== keys.length) {
    fail(scope, "payload object contains duplicate field names");
  }
  if (source.includes('trackEvent("inquiry_submit_success"')) {
    fail(scope, "inquiry_submit must remain the sole canonical success event");
  }
}

function checkAttributionJavascript(source) {
  const scope = "assets/site-enhancements.js";
  const requiredFragments = [
    ["first-touch attribution storage", '"jabbarAttributionV1"'],
    ["safe landing path", "safeLandingPath"],
    ["canonical index-path normalization", 'path.replace(/\\/index\\.html$/, "/")'],
    ["external referrer host only", "externalReferrerHost"],
    ["quote click event", 'window.jabbarTrack("quote_click"'],
    ["calculator result CTA exclusion", 'quoteLink.classList.contains("calculator-inquiry-cta")'],
  ];
  for (const [label, fragment] of requiredFragments) {
    if (!source.includes(fragment)) fail(scope, `missing ${label}`);
  }
  if (!source.includes("if (!inquiryForm)")) {
    fail(scope, "quote_click must include calculator navigation while excluding inquiry-page self-links");
  }
}

function checkPage(page, html) {
  const scope = page.file;
  if (countClassToken(html, "mobile-conversion-bar") !== 0) {
    fail(scope, "inquiry pages must not include the mobile conversion bar");
  }
  const formOpenCount = (html.match(/<form\b/gi) ?? []).length;
  const forms = Array.from(html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi));
  if (formOpenCount !== 1 || forms.length !== 1) {
    fail(scope, `forms: expected exactly 1 complete form, got ${formOpenCount} opening and ${forms.length} complete`);
    return;
  }

  const formTag = { name: "form", attributes: parseAttributes(forms[0][1]) };
  const formBody = forms[0][2];
  if (!hasClass(formTag, "inquiry-form") || !hasClass(formTag, "js-inquiry-form")) {
    fail(scope, "the unique form must include inquiry-form and js-inquiry-form classes");
  }

  const formExpectations = new Map([
    ["data-inquiry-endpoint", ENDPOINT],
    ["data-inquiry-locale", page.locale],
    ["data-inquiry-source", page.source],
    ["data-privacy-version", PRIVACY_VERSION],
  ]);
  for (const [attribute, expected] of formExpectations) {
    const actual = formTag.attributes.get(attribute);
    if (actual !== expected) {
      fail(scope, `${attribute}: expected ${expected}, got ${actual ?? "missing"}`);
    }
  }

  const controls = [
    ...findTags(formBody, "input"),
    ...findTags(formBody, "select"),
    ...findTags(formBody, "textarea"),
  ];
  const namedControls = controls.filter((control) => control.attributes.has("name"));
  const fieldNames = namedControls.map((control) => control.attributes.get("name"));
  expectExactSet(scope, "named business controls", fieldNames, BUSINESS_FIELDS);
  if (new Set(fieldNames).size !== fieldNames.length) {
    fail(scope, "business controls contain duplicate name attributes");
  }

  for (const fieldName of BUSINESS_FIELDS) {
    const matches = namedControls.filter((control) => control.attributes.get("name") === fieldName);
    if (matches.length !== 1) continue;
    const control = matches[0];
    const expectedMaximum = MAX_LENGTHS.get(fieldName);

    if (fieldName === "category") {
      if (control.name !== "select") {
        fail(scope, "category must remain a controlled select element");
        continue;
      }
      const selectElements = Array.from(formBody.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi))
        .filter((match) => parseAttributes(match[1]).get("name") === "category");
      if (selectElements.length !== 1) {
        fail(scope, `category select body: expected exactly 1, got ${selectElements.length}`);
        continue;
      }
      const optionValues = findTags(selectElements[0][2], "option")
        .map((option) => String(option.attributes.get("value") ?? ""));
      if (optionValues.length === 0) {
        fail(scope, "category select must include options");
      }
      const oversized = optionValues.find((value) => value.length > Number(expectedMaximum));
      if (oversized !== undefined) {
        fail(scope, `category option exceeds maxlength ${expectedMaximum}: ${JSON.stringify(oversized)}`);
      }
      continue;
    }

    if (fieldName === "referenceUrl") {
      const expectedAttributes = new Map([
        ["type", "url"],
        ["inputmode", "url"],
        ["autocomplete", "url"],
        ["pattern", "https?://.*"],
      ]);
      for (const [attribute, expected] of expectedAttributes) {
        if (control.attributes.get(attribute) !== expected) {
          fail(scope, `referenceUrl ${attribute}: expected ${expected}, got ${control.attributes.get(attribute) ?? "missing"}`);
        }
      }
      if (control.attributes.has("required")) {
        fail(scope, "referenceUrl must remain optional");
      }
      const referencePosition = formBody.indexOf('name="referenceUrl"');
      const referenceContext = formBody.slice(Math.max(0, referencePosition - 500), referencePosition + 700);
      for (const brand of ["Alibaba", "Amazon", "TikTok"]) {
        if (!referenceContext.includes(brand)) fail(scope, `referenceUrl guidance must mention ${brand}`);
      }
    }

    if (control.attributes.get("maxlength") !== expectedMaximum) {
      fail(
        scope,
        `${fieldName} maxlength: expected ${expectedMaximum}, got ${control.attributes.get("maxlength") ?? "missing"}`,
      );
    }
  }

  for (const requiredField of ["product", "contact"]) {
    const control = namedControls.find((candidate) => candidate.attributes.get("name") === requiredField);
    if (control && !control.attributes.has("required")) {
      fail(scope, `${requiredField} must retain native required validation`);
    }
  }

  const productPosition = formBody.indexOf('name="product"');
  const contactPosition = formBody.indexOf('name="contact"');
  const referencePosition = formBody.indexOf('name="referenceUrl"');
  const categoryPosition = formBody.indexOf('name="category"');
  if (!(productPosition >= 0 && productPosition < contactPosition && contactPosition < referencePosition && referencePosition < categoryPosition)) {
    fail(scope, "required contact must follow product, then optional referenceUrl before the remaining optional fields");
  }
  const contactControl = namedControls.find((candidate) => candidate.attributes.get("name") === "contact");
  if (contactControl && contactControl.attributes.get("autocomplete") !== "on") {
    fail(scope, "contact field must allow browser autofill with autocomplete=on");
  }

  const privacyInputs = findTags(formBody, "input").filter((tag) => hasClass(tag, "js-inquiry-privacy"));
  const privacy = checkSingleTag(scope, privacyInputs, "privacy checkbox");
  if (privacy) {
    if (privacy.attributes.get("type") !== "checkbox") {
      fail(scope, "privacy control must be type=checkbox");
    }
    if (privacy.attributes.has("required")) {
      fail(scope, "privacy checkbox must not have native required because fallback buttons must remain usable");
    }
    if (privacy.attributes.get("aria-required") !== "true") {
      fail(scope, "privacy checkbox must use aria-required=true");
    }
    if (privacy.attributes.has("name")) {
      fail(scope, "privacy checkbox must not add a named form field to the strict JSON payload");
    }
  }

  const privacyLinks = findTags(formBody, "a")
    .filter((tag) => tag.attributes.get("href") === "/privacy-policy.html#website-inquiries");
  checkSingleTag(scope, privacyLinks, "website-inquiries privacy link");

  const turnstileElements = Array.from(formBody.matchAll(/<([A-Za-z0-9:-]+)\b[^>]*>/g))
    .map((match) => parseTag(match[0]))
    .filter((tag) => hasClass(tag, "js-inquiry-turnstile"));
  const turnstile = checkSingleTag(scope, turnstileElements, "Turnstile container");
  if (turnstile) {
    if (turnstile.attributes.get("data-sitekey") !== SITEKEY) {
      fail(scope, `Turnstile sitekey: expected ${SITEKEY}, got ${turnstile.attributes.get("data-sitekey") ?? "missing"}`);
    }
    if (turnstile.attributes.get("data-action") !== TURNSTILE_ACTION) {
      fail(
        scope,
        `Turnstile action: expected ${TURNSTILE_ACTION}, got ${turnstile.attributes.get("data-action") ?? "missing"}`,
      );
    }
  }

  const buttons = findTags(formBody, "button");
  const directButtons = buttons.filter((button) => hasClass(button, "js-inquiry-direct"));
  const directButton = checkSingleTag(scope, directButtons, "direct-submit button");
  if (directButton) {
    if (directButton.attributes.get("type") !== "submit") {
      fail(scope, "direct-submit button must be type=submit");
    }
    if (!directButton.attributes.has("disabled")) {
      fail(scope, "direct-submit button must be disabled until shared JS initializes");
    }
    if (hasClass(directButton, "js-inquiry-send")) {
      fail(scope, "direct-submit button must not be treated as a fallback button");
    }
  }

  const statusElements = findTags(formBody, "p").filter((tag) => hasClass(tag, "inquiry-status"));
  const status = checkSingleTag(scope, statusElements, "inquiry status");
  if (status) {
    const expectedAttributes = new Map([
      ["role", "status"],
      ["aria-live", "polite"],
      ["aria-atomic", "true"],
      ["tabindex", "-1"],
    ]);
    for (const [attribute, expected] of expectedAttributes) {
      if (status.attributes.get(attribute) !== expected) {
        fail(scope, `inquiry status ${attribute}: expected ${expected}, got ${status.attributes.get(attribute) ?? "missing"}`);
      }
    }
  }
  if (!/<button\b[^>]*\bjs-inquiry-direct\b[^>]*>[\s\S]*?<\/button>\s*<p\b[^>]*\binquiry-status\b[^>]*><\/p>\s*<\/div>\s*<p\b[^>]*\binquiry-fallback-label\b/i.test(formBody)) {
    fail(scope, "inquiry status must be immediately after the direct-submit button, inside the direct panel and before fallback actions");
  }
  if (!html.includes('status.classList.remove("is-success", "is-error", "is-pending")')) {
    fail(scope, "fallback status updates must clear direct-submit state styles");
  }

  const fallbackButtons = buttons.filter((button) => hasClass(button, "js-inquiry-send"));
  if (fallbackButtons.length !== 4 || countClassToken(formBody, "js-inquiry-send") !== 4) {
    fail(scope, `fallback buttons: expected exactly 4, got ${fallbackButtons.length}`);
  }
  for (const button of fallbackButtons) {
    if (button.attributes.get("type") !== "button") {
      fail(scope, `fallback ${button.attributes.get("data-channel") ?? "unknown"} must be type=button`);
    }
  }
  expectExactSet(
    scope,
    "fallback channels",
    fallbackButtons.map((button) => button.attributes.get("data-channel")),
    FALLBACK_CHANNELS,
  );

  const stylesheetLinks = findTags(html, "link")
    .filter((tag) => String(tag.attributes.get("href") ?? "").includes("styles.min.css"));
  const stylesheet = checkSingleTag(scope, stylesheetLinks, "styles.min.css link");
  if (stylesheet) {
    const href = String(stylesheet.attributes.get("href") ?? "");
    if (!href.endsWith(`styles.min.css?v=${CSS_VERSION}`)) {
      fail(scope, `CSS cache version: expected ${CSS_VERSION}, got ${href || "missing"}`);
    }
  }

  const scripts = findTags(html, "script");
  const turnstileScripts = scripts.filter((tag) => tag.attributes.get("src") === TURNSTILE_SCRIPT);
  checkSingleTag(scope, turnstileScripts, "explicit-render Turnstile script");
  const inquiryScripts = scripts.filter((tag) =>
    String(tag.attributes.get("src") ?? "").includes("/assets/inquiry-form.js"),
  );
  const inquiryScript = checkSingleTag(scope, inquiryScripts, "shared inquiry-form.js script");
  if (inquiryScript) {
    const expected = `/assets/inquiry-form.js?v=${JS_VERSION}`;
    if (inquiryScript.attributes.get("src") !== expected) {
      fail(scope, `shared JS cache version: expected ${expected}, got ${inquiryScript.attributes.get("src") ?? "missing"}`);
    }
  }
  if (html.includes('window.jabbarTrack("inquiry_channel_click"')) {
    fail(scope, "legacy inquiry_channel_click must not double-count channel_fallback");
  }

  const htmlTags = findTags(html, "html");
  const htmlTag = checkSingleTag(scope, htmlTags, "html root element");
  if (page.rtl && htmlTag) {
    if (htmlTag.attributes.get("lang") !== "ar" || htmlTag.attributes.get("dir") !== "rtl") {
      fail(scope, "Arabic page must use <html lang=\"ar\" dir=\"rtl\">");
    }
  }
}

const sharedJavascript = await readFile(resolve(ROOT, "assets/inquiry-form.js"), "utf8");
checkSharedJavascript(sharedJavascript);
const attributionJavascript = await readFile(resolve(ROOT, "assets/site-enhancements.js"), "utf8");
checkAttributionJavascript(attributionJavascript);

for (const page of PAGES) {
  const html = await readFile(resolve(ROOT, page.file), "utf8");
  checkPage(page, html);
}

if (failures.length > 0) {
  console.error(`Inquiry frontend static check failed with ${failures.length} issue(s):`);
  let currentScope = "";
  for (const failure of failures) {
    if (failure.scope !== currentScope) {
      currentScope = failure.scope;
      console.error(`\n${currentScope}`);
    }
    console.error(`  - ${failure.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Inquiry frontend static check passed: ${PAGES.length} pages, ${PAYLOAD_FIELDS.length} payload fields, CSS ${CSS_VERSION}, JS ${JS_VERSION}.`,
  );
}
