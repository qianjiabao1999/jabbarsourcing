#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_UI_OUTPUT_DIR || "/tmp/jabbar-ui-enhancements-qa";
const CSS_VERSION = "apple-180";
const UI_VERSION = "ui-20260720a";
const HOME_PAGES = [
  { locale: "zh", path: "/" }, { locale: "en", path: "/en/" }, { locale: "es", path: "/es/" },
  { locale: "ar", path: "/ar/", rtl: true }, { locale: "fr", path: "/fr/" }, { locale: "pt", path: "/pt/" },
  { locale: "ru", path: "/ru/" }, { locale: "de", path: "/de/" }, { locale: "it", path: "/it/" }, { locale: "tr", path: "/tr/" }
];
const CALCULATOR_PAGES = HOME_PAGES.map((item) => ({ ...item, path: item.path === "/" ? "/calculator/" : `${item.path}calculator/` }));
const INQUIRY_PAGES = HOME_PAGES.map((item) => ({ ...item, path: item.path === "/" ? "/inquiry/" : `${item.path}inquiry/` }));
const HEADER_PAGES = [
  ...HOME_PAGES.map((item) => ({ ...item, type: "home" })),
  ...CALCULATOR_PAGES.map((item) => ({ ...item, type: "calculator" })),
  ...INQUIRY_PAGES.map((item) => ({ ...item, type: "inquiry" }))
];
const IMAGE_AUDIT_LOCALES = new Set(["zh", "en", "es", "ru", "ar"]);
const HOME_SECTION_CODES = {
  zh: ["团队", "服务", "图库", "流程", "客户评价", "常见问题", "社交账号"],
  en: ["Team", "Services", "Gallery", "Process", "Reviews", "FAQ", "Social"],
  es: ["Equipo", "Servicios", "Galería", "Proceso", "Reseñas", "Preguntas frecuentes", "Redes sociales"],
  ar: ["الفريق", "الخدمات", "المعرض", "خطوات العمل", "آراء العملاء", "الأسئلة الشائعة", "التواصل الاجتماعي"],
  fr: ["Équipe", "Services", "Galerie", "Processus", "Avis clients", "FAQ", "Réseaux sociaux"],
  pt: ["Equipe", "Serviços", "Galeria", "Processo", "Avaliações", "Perguntas frequentes", "Redes sociais"],
  ru: ["Команда", "Услуги", "Галерея", "Процесс", "Отзывы", "Частые вопросы", "Соцсети"],
  de: ["Team", "Leistungen", "Galerie", "Ablauf", "Bewertungen", "FAQ", "Soziale Medien"],
  it: ["Team", "Servizi", "Galleria", "Processo", "Recensioni", "Domande frequenti", "Social"],
  tr: ["Ekip", "Hizmetler", "Galeri", "Süreç", "Yorumlar", "SSS", "Sosyal medya"]
};
const METRIC_EXPECTED = {
  zh: { first: "2008年", last: "500,000,000 人民币元" },
  en: { first: "2008", last: "CNY 500,000,000" },
  es: { first: "2008", last: "CNY 500.000.000" },
  ar: { first: "2008", last: "CNY ٥٠٠٬٠٠٠٬٠٠٠" },
  fr: { first: "2008", last: "CNY 500\u202F000\u202F000" },
  pt: { first: "2008", last: "CNY 500.000.000" },
  ru: { first: "2008", last: "CNY 500\u00A0000\u00A0000" },
  de: { first: "2008", last: "CNY 500.000.000" },
  it: { first: "2008", last: "CNY 500.000.000" },
  tr: { first: "2008", last: "CNY 500.000.000" }
};
const KENYA_LABELS = {
  zh: "肯尼亚",
  en: "Kenya",
  es: "Kenia",
  ar: "كينيا",
  fr: "Kenya",
  pt: "Quênia",
  ru: "Кения",
  de: "Kenia",
  it: "Kenya",
  tr: "Kenya"
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
const TELEGRAM_URL = "https://t.me/Jabbar_in_Yiwu";
const VALID_SHIPMENTS = [
  { flag: "🇳🇬", city_zh: "拉各斯", city_en: "Lagos", city_ar: "لاغوس", load: "1×40HQ", when: "2026-07-09" },
  { flag: "🇧🇷", city_zh: "圣保罗", city_en: "São Paulo", city_ar: "ساو باولو", load: "LCL 12 CBM", when: "2026-07-08" },
  { flag: "🇬🇭", city_zh: "阿克拉", city_en: "Accra", city_ar: "أكرا", load: "1×40GP", when: "2026-07-07" }
];

await mkdir(OUTPUT_DIR, { recursive: true });

async function blockAnalytics(context) {
  await context.route("**://www.googletagmanager.com/**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**://www.clarity.ms/**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/turnstile/v0/api.js*", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: `(() => {
      let sequence = 0;
      const widgets = new Map();
      const issueToken = (widget) => {
        Promise.resolve().then(() => widget.options.callback?.("qa-turnstile-token-" + widget.id));
      };
      window.turnstile = {
        render(target, options = {}) {
          const id = "qa-turnstile-widget-" + (++sequence);
          const widget = { id, target, options };
          widgets.set(id, widget);
          issueToken(widget);
          return id;
        },
        reset(id) {
          if (id !== undefined && id !== null) {
            const widget = widgets.get(id);
            if (widget) issueToken(widget);
            return;
          }
          widgets.forEach(issueToken);
        }
      };
      if (typeof window.jabbarTurnstileApiReady === "function") {
        window.setTimeout(window.jabbarTurnstileApiReady, 0);
      }
    })();`
  }));
  // Interaction analytics are part of this UI suite. Grant the same explicit
  // preference a returning user would have stored, while keeping third-party
  // requests locally stubbed. Consent-default behavior has its own QA check.
  await context.addInitScript((storageKey) => {
    try {
      window.localStorage.setItem(storageKey, "granted");
    } catch (error) {}
  }, "jabbar.analyticsConsent.v1");
}

async function mockValidShipments(context) {
  await context.route("**/shipments.json*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(VALID_SHIPMENTS)
  }));
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    errors.push(message.text());
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function pageState(page) {
  return page.evaluate(() => {
    const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const elementRect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: box.left, right: box.right, top: box.top, bottom: box.bottom,
        width: box.width, height: box.height, display: style.display,
        visibility: style.visibility, opacity: Number.parseFloat(style.opacity),
        pointerEvents: style.pointerEvents, direction: style.direction,
        fontSize: Number.parseFloat(style.fontSize)
      };
    };
    const rect = (selector) => elementRect(document.querySelector(selector));
    const styleSnapshotElement = (element, pseudo = null) => {
      if (!element) return null;
      const style = getComputedStyle(element, pseudo);
      const numeric = (value) => Number.parseFloat(value) || 0;
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: numeric(style.opacity),
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderTopWidth: numeric(style.borderTopWidth),
        borderRightWidth: numeric(style.borderRightWidth),
        borderBottomWidth: numeric(style.borderBottomWidth),
        borderLeftWidth: numeric(style.borderLeftWidth),
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        content: style.content,
        height: numeric(style.height),
        width: numeric(style.width),
        fontSize: numeric(style.fontSize),
        order: style.order,
        textAlign: style.textAlign,
        textDecorationLine: style.textDecorationLine,
        justifyItems: style.justifyItems
      };
    };
    const styleSnapshot = (selector, pseudo = null) => styleSnapshotElement(document.querySelector(selector), pseudo);
    const fontFamily = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).fontFamily : "";
    };
    const toolPill = document.querySelector(".site-nav-tool-pill");
    const socialPill = document.querySelector(".site-nav-social-pill");
    const quoteLink = window.innerWidth >= 1280
      ? document.querySelector(".site-nav-quote-desktop, .site-nav-return-home")
      : document.querySelector(".site-nav-quote-action, .site-nav-return-home");
    const calculatorPage = document.querySelector(".calculator-page");
    const blueprint = calculatorPage ? getComputedStyle(calculatorPage) : null;
    const cap = document.querySelector("#cbmCap");
    const fill = document.querySelector("#cbmFill");
    return {
      title: document.title,
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      direction: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
      cssVersion: document.querySelector('link[href*="styles.min.css"]')?.getAttribute("href") || "",
      uiVersion: document.querySelector('script[src*="site-enhancements.js"]')?.getAttribute("src") || "",
      counts: {
        removedAiScripts: document.querySelectorAll('script[src*="ai-sourcing-assistant.js"]').length,
        removedAiLaunchers: document.querySelectorAll(".jabbar-ai-toggle").length,
        faqTags: document.querySelectorAll(".faq-quick-tag").length,
        faqItems: document.querySelectorAll(".faq-item").length,
        countries: document.querySelectorAll(".service-country-item").length,
        metrics: document.querySelectorAll(".company-metric-card strong").length,
        progress: document.querySelectorAll(".site-scroll-progress").length,
        cbm: document.querySelectorAll(".cbm-visual").length,
        floatingContacts: document.querySelectorAll(".contact-speed-dial, .contact-speed-dial-option, .contact-speed-dial-main").length,
        conversionBars: document.querySelectorAll(".mobile-conversion-bar").length,
        backToTopControls: document.querySelectorAll(".site-footer-backtop").length,
        qrCards: document.querySelectorAll(".whatsapp-qr-card").length,
        toolPills: document.querySelectorAll(".site-nav-tool-pill").length,
        socialPills: document.querySelectorAll(".site-nav-social-pill").length,
        quoteLinks: document.querySelectorAll(".site-nav-quote").length,
        desktopTeamLinks: document.querySelectorAll(".site-nav-links .site-nav-team").length,
        footerContactPills: document.querySelectorAll(".site-footer .contact-actions .contact-link").length,
        sectionCodes: document.querySelectorAll(".section-code").length,
        sectionRules: document.querySelectorAll(".section-rule").length,
        stamps: document.querySelectorAll(".stamp").length,
        landedStamps: document.querySelectorAll(".stamp.land").length,
        shipmentLists: document.querySelectorAll(".shipment-ticker-list").length,
        shipmentItems: document.querySelectorAll(".shipment-ticker-item").length,
        metricNumbers: document.querySelectorAll(".company-metric-number.num-mono").length,
        reviewNumbers: document.querySelectorAll(".testimonial-order-meta .num-mono").length,
        dimensionLines: document.querySelectorAll(".cbm-dimension-line").length,
        jointBrandLockups: document.querySelectorAll(".hero-brand-partnership").length,
        companyAboutBlocks: document.querySelectorAll(".company-about").length,
        companyIdentityBlocks: document.querySelectorAll(".company-identity").length,
        socialFilters: document.querySelectorAll(".social-platform-filter").length,
        calculatorModeTabs: document.querySelectorAll(".calculator-mode-tab").length,
        reviewQuoteCtas: document.querySelectorAll(".testimonial-quote-cta").length
      },
      sectionCodes: Array.from(document.querySelectorAll(".section-code"), (element) => normalizeText(element.textContent)),
      sectionCodeDirections: Array.from(document.querySelectorAll(".section-code"), (element) => getComputedStyle(element).direction),
      galleryBlockShadows: Array.from(document.querySelectorAll(".sourcing-gallery .gallery-block"), (element) => getComputedStyle(element).boxShadow),
      header: {
        socialBeforeTool: Boolean(socialPill && toolPill && (socialPill.compareDocumentPosition(toolPill) & Node.DOCUMENT_POSITION_FOLLOWING)),
        socialText: normalizeText(socialPill?.textContent),
        socialAriaLabel: socialPill?.getAttribute("aria-label") || "",
        socialCompactLabel: socialPill?.getAttribute("data-compact-label") || "",
        social: styleSnapshotElement(socialPill),
        socialBefore: styleSnapshotElement(socialPill, "::before"),
        socialAfter: styleSnapshotElement(socialPill, "::after"),
        toolBeforeQuote: Boolean(toolPill && quoteLink && (toolPill.compareDocumentPosition(quoteLink) & Node.DOCUMENT_POSITION_FOLLOWING)),
        toolText: normalizeText(toolPill?.textContent),
        quoteText: normalizeText(quoteLink?.textContent),
        tool: styleSnapshot(".site-nav-tool-pill"),
        toolBefore: styleSnapshot(".site-nav-tool-pill", "::before"),
        quote: styleSnapshotElement(quoteLink),
        desktopTeam: styleSnapshot(".site-nav-links .site-nav-team")
      },
      mobileMenu: {
        calculatorLinks: document.querySelectorAll('.site-nav-mobile-panel a[href*="calculator"], .site-nav-mobile-panel a[href="./"]').length,
        teamLinks: document.querySelectorAll('.site-nav-mobile-panel a[href*="#social-accounts"]').length
      },
      telegramHrefs: Array.from(document.querySelectorAll(".contact-telegram"), (element) => element.href),
      footer: {
        main: styleSnapshot(".site-footer-main"),
        mainRect: rect(".site-footer-main"),
        brandRect: rect(".site-footer-brand"),
        location: (() => {
          const link = document.querySelector(".site-footer-location-link");
          const text = document.querySelector(".site-footer-location-text");
          return {
            href: link?.getAttribute("href") || "",
            appleMapUrl: link?.getAttribute("data-apple-map-url") || "",
            link: styleSnapshot(".site-footer-location-link"),
            linkRect: rect(".site-footer-location-link"),
            text: styleSnapshot(".site-footer-location-text"),
            textRect: rect(".site-footer-location-text")
          };
        })(),
        brandChildren: Array.from(document.querySelectorAll(".site-footer-brand > *"), (element) => ({
          rect: elementRect(element),
          textAlign: getComputedStyle(element).textAlign
        })),
        contactActionsRect: rect(".site-footer .contact-actions"),
        contactPills: Array.from(document.querySelectorAll(".site-footer .contact-actions .contact-link"), (element) => elementRect(element))
      },
      heroCta: {
        text: normalizeText(document.querySelector(".team-heading .quote-entry .inquiry-entry-card-cta")?.textContent),
        card: styleSnapshot(".team-heading .quote-entry .inquiry-entry-card-cta"),
        cardBefore: styleSnapshot(".team-heading .quote-entry .inquiry-entry-card-cta", "::before"),
        button: styleSnapshot(".team-heading .quote-entry .inquiry-entry-button"),
        buttonBefore: styleSnapshot(".team-heading .quote-entry .inquiry-entry-button", "::before")
      },
      shipmentLists: Array.from(document.querySelectorAll(".shipment-ticker-list"), (element) => ({
        text: normalizeText(element.textContent),
        ariaHidden: element.getAttribute("aria-hidden") || "",
        display: getComputedStyle(element).display
      })),
      shipment: {
        display: document.querySelector(".shipment-ticker") ? getComputedStyle(document.querySelector(".shipment-ticker")).display : "",
        ready: document.querySelector(".shipment-ticker")?.classList.contains("is-ready") || false,
        unavailable: document.querySelector(".shipment-ticker")?.classList.contains("is-unavailable") || false
      },
      fonts: {
        numeric: fontFamily(".company-metric-number.num-mono"),
        review: fontFamily(".testimonial-order-meta .num-mono"),
        phone: fontFamily('.site-footer a[href^="tel:"].num-mono'),
        stamp: fontFamily(".stamp"),
        shipment: fontFamily(".shipment-ticker-item"),
        body: fontFamily(".hero-social"),
        calculator: fontFamily("#cbmCap.num-mono"),
        calculatorResult: fontFamily(".calculator-result-card .num-mono")
      },
      calculator: {
        code: normalizeText(document.querySelector(".calculator-results > .section-code")?.textContent),
        resultState: document.querySelector(".calculator-results")?.getAttribute("data-result-state") || "",
        resultStatusHidden: document.querySelector("[data-result-status]")?.hidden ?? null,
        hiddenDetails: document.querySelectorAll("[data-result-detail][hidden]").length,
        copyDisabled: document.querySelector("[data-copy-result]")?.disabled ?? null,
        capY: Number(cap?.getAttribute("y")),
        fillY: Number(fill?.getAttribute("y")),
        blueprintImage: blueprint?.backgroundImage || "",
        blueprintSize: blueprint?.backgroundSize || ""
      },
      rects: {
        header: rect(".site-nav"),
        brand: rect(".site-nav-brand"),
        navLinks: rect(".site-nav-links"),
        socialPill: rect(".site-nav-social-pill"),
        toolPill: rect(".site-nav-tool-pill"),
        quoteLink: quoteLink ? { ...elementRect(quoteLink), ...styleSnapshotElement(quoteLink) } : null,
        language: rect(".site-nav-language"),
        mobileMenu: rect(".site-nav-mobile-menu"),
        desktopTeamLink: rect(".site-nav-links .site-nav-team"),
        conversionBar: rect(".mobile-conversion-bar"),
        social: rect("#social-accounts"),
        socialHeading: rect("#social-accounts .section-heading")
      }
    };
  });
}

async function waitForHomeVisualSignature(page) {
  await page.locator(".stamp-row").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll(".stamp.land").length === 3);
  await page.locator(".testimonial-quote-cta").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const ticker = document.querySelector(".shipment-ticker");
    return ticker?.classList.contains("is-ready") || ticker?.classList.contains("is-unavailable");
  });
}

function isMonoFamily(value) {
  return /ui-monospace|SF Mono|Cascadia Mono|Consolas|monospace/i.test(value);
}

function splitShadowLayers(value) {
  const layers = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    else if (value[index] === ")") depth = Math.max(0, depth - 1);
    else if (value[index] === "," && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers.filter(Boolean);
}

function assertHomeVisualSignature(state, scope, locale) {
  const expectedCodes = HOME_SECTION_CODES[locale].map((label) => `Jabbar · ${label}`);
  assert.equal(state.counts.sectionCodes, expectedCodes.length, `${scope}: section code count`);
  assert.equal(state.counts.sectionRules, expectedCodes.length, `${scope}: section rule count`);
  assert.deepEqual(state.sectionCodes, expectedCodes, `${scope}: localized section code order`);
  assert(state.sectionCodeDirections.every((direction) => direction === "ltr"), `${scope}: section code bidi isolation`);
  assert.equal(state.counts.stamps, 3, `${scope}: stamp count`);
  assert.equal(state.counts.landedStamps, 3, `${scope}: stamp animation did not land`);
  assert.equal(state.counts.shipmentLists, 1, `${scope}: placeholder shipment fallback count`);
  assert.equal(state.counts.shipmentItems, 1, `${scope}: placeholder shipment item count`);
  assert.equal(state.shipment.ready, false, `${scope}: placeholder shipments became ready`);
  assert.equal(state.shipment.unavailable, true, `${scope}: placeholder shipments were not rejected`);
  assert.equal(state.shipment.display, "none", `${scope}: placeholder shipment ticker is visible`);
  assert.equal(state.counts.metricNumbers, 5, `${scope}: monospaced company metric count`);
  assert.equal(state.counts.reviewNumbers, 2, `${scope}: monospaced review amount count`);
  assert.equal(state.counts.reviewQuoteCtas, 1, `${scope}: review quote CTA count`);
  assert(isMonoFamily(state.fonts.numeric), `${scope}: numeric font is not monospaced: ${state.fonts.numeric}`);
  assert(isMonoFamily(state.fonts.review), `${scope}: review amount is not monospaced: ${state.fonts.review}`);
  assert(isMonoFamily(state.fonts.phone), `${scope}: footer phone is not monospaced: ${state.fonts.phone}`);
  assert(isMonoFamily(state.fonts.stamp), `${scope}: trust stamp is not monospaced: ${state.fonts.stamp}`);
  assert(isMonoFamily(state.fonts.shipment), `${scope}: shipment row is not monospaced: ${state.fonts.shipment}`);
  assert(!isMonoFamily(state.fonts.body), `${scope}: body copy inherited the monospaced font: ${state.fonts.body}`);
  assert.equal(state.galleryBlockShadows.length, 2, `${scope}: gallery shell count`);
  state.galleryBlockShadows.forEach((shadow, index) => {
    const outerLayers = splitShadowLayers(shadow).filter((layer) => !/\binset\b/i.test(layer));
    assert.deepEqual(outerLayers, [], `${scope}: gallery shell ${index + 1} still has an outer shadow (${shadow})`);
  });
}

function assertCalculatorVisualSignature(state, scope, locale, expectedResultState = "empty") {
  assert.equal(state.calculator.code, CALCULATOR_SECTION_CODES[locale], `${scope}: calculator section code`);
  assert.equal(state.counts.sectionCodes, 1, `${scope}: calculator section code count`);
  assert.equal(state.counts.sectionRules, 1, `${scope}: calculator section rule count`);
  assert.equal(state.calculator.resultState, expectedResultState, `${scope}: calculator result state`);
  if (expectedResultState === "ready") {
    assert.equal(state.calculator.resultStatusHidden, true, `${scope}: ready calculator status remains visible`);
    assert.equal(state.calculator.hiddenDetails, 0, `${scope}: ready calculator details remain hidden`);
    assert.equal(state.calculator.copyDisabled, false, `${scope}: ready calculator copy action remains disabled`);
  } else {
    assert.equal(state.calculator.resultStatusHidden, false, `${scope}: initial calculator result status hidden`);
    assert.equal(state.calculator.hiddenDetails, 3, `${scope}: initial calculator details must stay hidden`);
    assert.equal(state.calculator.copyDisabled, true, `${scope}: copy result must start disabled`);
  }
  assert(state.counts.dimensionLines >= 3, `${scope}: dimension line count ${state.counts.dimensionLines}`);
  assert(state.calculator.capY < state.calculator.fillY, `${scope}: capacity annotation is not above the container`);
  assert.match(state.calculator.blueprintImage, /linear-gradient/i, `${scope}: blueprint grid missing`);
  assert.match(state.calculator.blueprintSize, /24px\s+24px/, `${scope}: blueprint grid size ${state.calculator.blueprintSize}`);
  assert(isMonoFamily(state.fonts.calculator), `${scope}: calculator values are not monospaced: ${state.fonts.calculator}`);
  assert(isMonoFamily(state.fonts.calculatorResult), `${scope}: calculator result cards are not monospaced: ${state.fonts.calculatorResult}`);
}

function assertShared(state, scope) {
  assert(state.cssVersion.endsWith(`?v=${CSS_VERSION}`), `${scope}: stale CSS ${state.cssVersion}`);
  assert(state.uiVersion.endsWith(`?v=${UI_VERSION}`), `${scope}: stale UI JS ${state.uiVersion}`);
  assert(state.documentWidth <= state.width + 1, `${scope}: horizontal overflow ${state.documentWidth} > ${state.width}`);
}

function assertVisibleRect(rect, scope) {
  assert(rect, `${scope}: element missing`);
  assert.notEqual(rect.display, "none", `${scope}: display none`);
  assert.notEqual(rect.visibility, "hidden", `${scope}: visibility hidden`);
  assert(rect.opacity >= 0.99, `${scope}: opacity ${rect.opacity}`);
  assert(rect.width > 0 && rect.height > 0, `${scope}: zero-size ${rect.width}x${rect.height}`);
}

function isTransparent(value) {
  return value === "transparent" || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(value);
}

function rectanglesOverlap(first, second) {
  if (!first || !second || first.display === "none" || second.display === "none") return false;
  const horizontalOverlap = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const verticalOverlap = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return horizontalOverlap > 0.5 && verticalOverlap > 0.5;
}

function assertHeaderNavigation(state, scope, { desktop = false } = {}) {
  assert.equal(state.counts.toolPills, 1, `${scope}: tool pill count`);
  assert.equal(state.counts.socialPills, 1, `${scope}: social pill count`);
  assert([1, 2].includes(state.counts.quoteLinks), `${scope}: quote link count ${state.counts.quoteLinks}`);
  assert(state.header.socialBeforeTool, `${scope}: social pill must precede the volume tool in the DOM`);
  assert(state.header.socialText, `${scope}: social pill has no localized label`);
  assert.equal(state.header.socialAriaLabel, state.header.socialText, `${scope}: social pill accessible label differs from its full localized label`);
  assert(state.header.socialCompactLabel, `${scope}: social pill has no compact localized label`);
  if (!desktop || state.counts.quoteLinks === 1) {
    assert(state.header.toolBeforeQuote, `${scope}: tool pill must precede the responsive quote link in the DOM`);
  }
  assert(state.header.toolText, `${scope}: tool pill has no localized label`);
  assert(state.header.quoteText, `${scope}: quote link has no localized label`);
  assertVisibleRect(state.rects.toolPill, `${scope}: tool pill`);
  assertVisibleRect(state.rects.quoteLink, `${scope}: quote link`);
  assert(state.rects.toolPill.left >= -1 && state.rects.toolPill.right <= state.width + 1, `${scope}: tool pill is outside the viewport`);
  assert(state.rects.quoteLink.left >= -1 && state.rects.quoteLink.right <= state.width + 1, `${scope}: quote link is outside the viewport`);
  if (!desktop || state.counts.quoteLinks === 1) {
    assert(Number(state.header.tool.order) < Number(state.header.quote.order), `${scope}: tool pill visual order ${state.header.tool.order} is not before quote ${state.header.quote.order}`);
  }
  assert(state.header.toolBefore, `${scope}: tool pill container visual missing`);
  assert(!["none", "normal", ""].includes(state.header.toolBefore.content), `${scope}: tool pill ::before has no content box`);
  assert(state.header.toolBefore.width >= 18, `${scope}: tool pill container width ${state.header.toolBefore.width}`);
  assert(state.header.toolBefore.height >= 12, `${scope}: tool pill container height ${state.header.toolBefore.height}`);
  assert(state.header.toolBefore.borderLeftWidth >= 1, `${scope}: tool pill container border missing`);
  assert.notEqual(state.header.toolBefore.backgroundImage, "none", `${scope}: tool pill container ribs/background missing`);

  if (state.width < 1280) {
    assertVisibleRect(state.rects.socialPill, `${scope}: responsive social pill`);
    assert(state.rects.socialPill.left >= -1 && state.rects.socialPill.right <= state.width + 1, `${scope}: social pill is outside the viewport`);
    assert(Number(state.header.social.order) < Number(state.header.tool.order), `${scope}: social pill visual order ${state.header.social.order} is not before tool ${state.header.tool.order}`);
    const socialToolGap = state.direction === "rtl"
      ? state.rects.socialPill.left - state.rects.toolPill.right
      : state.rects.toolPill.left - state.rects.socialPill.right;
    assert(socialToolGap >= -1 && socialToolGap <= 28, `${scope}: social/tool visual gap ${socialToolGap}px is not adjacent or RTL-mirrored`);

    const visibleControls = [
      ["brand", state.rects.brand],
      ["social pill", state.rects.socialPill],
      ["tool pill", state.rects.toolPill],
      ["quote", state.rects.quoteLink],
      ["language", state.rects.language],
      ["menu", state.rects.mobileMenu]
    ].filter(([, rect]) => rect && rect.display !== "none" && rect.visibility !== "hidden" && rect.opacity >= 0.99);
    for (let first = 0; first < visibleControls.length; first += 1) {
      for (let second = first + 1; second < visibleControls.length; second += 1) {
        assert(
          !rectanglesOverlap(visibleControls[first][1], visibleControls[second][1]),
          `${scope}: ${visibleControls[first][0]} overlaps ${visibleControls[second][0]}`
        );
      }
    }
  } else {
    assert(state.header.social, `${scope}: desktop social pill style missing`);
    assert.equal(state.header.social.display, "none", `${scope}: responsive social pill remains visible at ${state.width}px`);
  }

  if (desktop) {
    assertVisibleRect(state.rects.navLinks, `${scope}: desktop navigation links`);
    const navCenter = state.rects.navLinks.left + state.rects.navLinks.width / 2;
    assert(Math.abs(navCenter - state.width / 2) <= 1, `${scope}: desktop navigation center delta ${navCenter - state.width / 2}`);
    for (const [name, rect] of [
      ["brand", state.rects.brand],
      ["tool pill", state.rects.toolPill],
      ["language switcher", state.rects.language]
    ]) {
      assertVisibleRect(rect, `${scope}: desktop ${name}`);
      assert(!rectanglesOverlap(state.rects.navLinks, rect), `${scope}: desktop navigation overlaps ${name}`);
    }
    if (state.counts.quoteLinks === 2) {
      assert(rectanglesOverlap(state.rects.navLinks, state.rects.quoteLink), `${scope}: centered quote is outside the desktop navigation group`);
    } else {
      assert(!rectanglesOverlap(state.rects.navLinks, state.rects.quoteLink), `${scope}: return-home action overlaps desktop navigation`);
    }
    assert.equal(state.counts.desktopTeamLinks, 1, `${scope}: desktop Jabbar Team link count`);
    assertVisibleRect(state.rects.desktopTeamLink, `${scope}: desktop Jabbar Team link`);
    assert.equal(state.header.desktopTeam.backgroundImage, "none", `${scope}: desktop Jabbar Team link still has a background image`);
    assert(isTransparent(state.header.desktopTeam.backgroundColor), `${scope}: desktop Jabbar Team link background ${state.header.desktopTeam.backgroundColor}`);
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      assert.equal(state.header.desktopTeam[`border${side}Width`], 1, `${scope}: desktop Jabbar Team link ${side.toLowerCase()} border`);
    }
    assert.equal(state.header.desktopTeam.boxShadow, "none", `${scope}: desktop Jabbar Team link still has a shadow`);
  } else {
    assert(state.rects.navLinks, `${scope}: mobile navigation links are missing from the DOM`);
    assert.equal(state.rects.navLinks.display, "none", `${scope}: desktop navigation links remain visible on mobile`);
  }
}

function assertPageTelegram(state, scope) {
  assert(state.telegramHrefs.length >= 1, `${scope}: Telegram link missing`);
  assert(state.telegramHrefs.every((href) => href === TELEGRAM_URL), `${scope}: stale Telegram URL ${state.telegramHrefs.join(", ")}`);
}

function assertNoFloatingControls(state, scope) {
  assert.equal(state.counts.floatingContacts, 0, `${scope}: floating contact controls remain`);
  assert.equal(state.counts.conversionBars, 0, `${scope}: mobile conversion bar remains`);
  assert.equal(state.rects.conversionBar, null, `${scope}: mobile conversion bar is rendered`);
  assert.equal(state.counts.backToTopControls, 0, `${scope}: retired back-to-top control returned`);
  assert.equal(state.counts.removedAiScripts, 0, `${scope}: removed AI script returned`);
  assert.equal(state.counts.removedAiLaunchers, 0, `${scope}: removed AI launcher returned`);
}

function assertMobileMenuTrimmed(state, scope) {
  assert.equal(state.mobileMenu.calculatorLinks, 0, `${scope}: calculator link remains in mobile menu`);
  assert.equal(state.mobileMenu.teamLinks, 0, `${scope}: social account remains inside the mobile menu`);
}

function assertFooterLocationContract(state, scope, { mobile }) {
  const location = state.footer.location;
  assert.match(location.href, /^geo:0,0\?q=/, `${scope}: footer location must use the system geo URI`);
  const geoAddress = decodeURIComponent(location.href.slice(location.href.indexOf("?q=") + 3));
  assert(geoAddress.includes("苏福路219号3号楼"), `${scope}: geo URI is missing the full address`);
  const appleMapUrl = new URL(location.appleMapUrl);
  assert.equal(appleMapUrl.origin, "https://maps.apple.com", `${scope}: invalid Apple Maps fallback origin`);
  assert(appleMapUrl.searchParams.get("daddr")?.includes("苏福路219号3号楼"), `${scope}: Apple Maps fallback is missing the full address`);
  assert.equal(appleMapUrl.searchParams.get("dirflg"), "d", `${scope}: Apple Maps fallback must request driving directions`);

  if (mobile) {
    assert.equal(location.text.display, "none", `${scope}: static footer location text remains visible on mobile`);
    assert.notEqual(location.link.display, "none", `${scope}: footer map action is hidden on mobile`);
    assertVisibleRect(location.linkRect, `${scope}: mobile footer map action`);
  } else {
    assert.notEqual(location.text.display, "none", `${scope}: static footer location text is hidden on desktop`);
    assertVisibleRect(location.textRect, `${scope}: desktop footer location text`);
    assert.equal(location.link.display, "none", `${scope}: footer map action remains visible on desktop`);
  }
}

function assertDesktopFooter(state, scope, { contacts = false } = {}) {
  assertVisibleRect(state.footer.mainRect, `${scope}: footer main`);
  assertVisibleRect(state.footer.brandRect, `${scope}: footer brand`);
  assert.equal(state.footer.main.textAlign, "center", `${scope}: footer main text alignment`);
  const mainCenter = state.footer.mainRect.left + state.footer.mainRect.width / 2;
  const brandCenter = state.footer.brandRect.left + state.footer.brandRect.width / 2;
  assert(Math.abs(mainCenter - brandCenter) <= 1, `${scope}: footer brand center delta ${brandCenter - mainCenter}`);
  for (const [index, child] of state.footer.brandChildren.entries()) {
    if (!child.rect || child.rect.display === "none") continue;
    const childCenter = child.rect.left + child.rect.width / 2;
    assert(Math.abs(mainCenter - childCenter) <= 1, `${scope}: footer brand child ${index + 1} center delta ${childCenter - mainCenter}`);
    assert.equal(child.textAlign, "center", `${scope}: footer brand child ${index + 1} text alignment`);
  }

  assertFooterLocationContract(state, scope, { mobile: false });

  if (!contacts) {
    assert.equal(state.counts.footerContactPills, 0, `${scope}: unexpected footer contact pills`);
    return;
  }

  assert.equal(state.counts.footerContactPills, 5, `${scope}: footer contact pill count`);
  assertVisibleRect(state.footer.contactActionsRect, `${scope}: footer contact actions`);
  const pills = state.footer.contactPills;
  pills.forEach((pill, index) => assertVisibleRect(pill, `${scope}: footer contact pill ${index + 1}`));
  const widths = pills.map((pill) => pill.width);
  assert(Math.max(...widths) - Math.min(...widths) <= 1, `${scope}: asymmetric contact pill widths ${widths.join(", ")}`);
  const tops = pills.map((pill) => pill.top);
  assert(Math.max(...tops) - Math.min(...tops) <= 1, `${scope}: desktop contact pills do not share one row`);
  const sorted = [...pills].sort((a, b) => a.left - b.left);
  const gaps = sorted.slice(1).map((pill, index) => pill.left - sorted[index].right);
  assert(Math.max(...gaps) - Math.min(...gaps) <= 1, `${scope}: asymmetric contact pill gaps ${gaps.join(", ")}`);
  const pillsCenter = (sorted[0].left + sorted.at(-1).right) / 2;
  const actionsCenter = state.footer.contactActionsRect.left + state.footer.contactActionsRect.width / 2;
  assert(Math.abs(pillsCenter - actionsCenter) <= 1, `${scope}: contact pill group center delta ${pillsCenter - actionsCenter}`);
}

function assertHeroCta(state, scope) {
  assert(state.heroCta.card, `${scope}: hero quote CTA missing`);
  assert(state.heroCta.button, `${scope}: hero quote button missing`);
  assert(!state.heroCta.text.includes("↗"), `${scope}: hero quote CTA still contains ↗`);
  assert(["none", "normal"].includes(state.heroCta.cardBefore.content), `${scope}: hero quote card decorative arrow remains`);
  assert(["none", "normal"].includes(state.heroCta.buttonBefore.content), `${scope}: hero quote button decorative arrow remains`);
  assert.equal(state.heroCta.card.textDecorationLine, "none", `${scope}: hero quote CTA is underlined`);
  assert.equal(state.heroCta.button.textDecorationLine, "none", `${scope}: hero quote button is underlined`);
  if (state.width <= 560) {
    assert(state.heroCta.button.fontSize >= 15, `${scope}: mobile hero quote font is ${state.heroCta.button.fontSize}px`);
    assert(state.heroCta.button.height >= 44, `${scope}: mobile hero quote height is ${state.heroCta.button.height}px`);
  }
}

async function assertFaqDefaultClosed(page, scope) {
  const state = await page.evaluate(() => ({
    promptCount: document.querySelectorAll(".faq-quick-tags-label").length,
    items: Array.from(document.querySelectorAll(".faq-item"), (item) => ({
      open: item.open,
      hidden: item.hidden,
      rendered: item.getClientRects().length > 0
    })),
    tags: Array.from(document.querySelectorAll(".faq-quick-tag"), (tag) => ({
      expanded: tag.getAttribute("aria-expanded"),
      active: tag.classList.contains("is-active")
    }))
  }));
  assert.equal(state.promptCount, 1, `${scope}: FAQ topic prompt count`);
  assert.equal(state.items.length, 7, `${scope}: FAQ item count`);
  assert(state.items.every((item) => !item.open && item.hidden && !item.rendered), `${scope}: FAQ answers must start closed and filtered`);
  assert.equal(state.tags.length, state.items.length, `${scope}: FAQ tag/item count mismatch`);
  assert(state.tags.every((tag) => tag.expanded === "false" && !tag.active), `${scope}: FAQ tag starts selected`);
}

async function assertSocialPlatformFilters(page, scope) {
  const assertVisibleCardAlignment = async (label) => {
    const cards = await page.locator(".social-platform-group:not([hidden]) .team-card").evaluateAll((elements) => elements.map((card) => {
      const center = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2;
      };
      return {
        cardCenter: center(card),
        mediaCenter: center(card.querySelector(".team-card-media")),
        nameCenter: center(card.querySelector(".team-card-body > strong, .team-title-line")),
        handleCenter: center(card.querySelector(".team-handle")),
        buttonCenter: center(card.querySelector(".team-link"))
      };
    }));
    assert(cards.length > 0, `${scope}: ${label} has no visible social cards`);
    cards.forEach((card, index) => {
      for (const key of ["mediaCenter", "nameCenter", "handleCenter", "buttonCenter"]) {
        assert(card[key] !== null, `${scope}: ${label} card ${index + 1} missing ${key}`);
        assert(Math.abs(card[key] - card.cardCenter) <= 1.5, `${scope}: ${label} card ${index + 1} ${key} is not centered`);
      }
    });
  };

  const initial = await page.locator(".social-platform-group").evaluateAll((groups) => groups.map((group) => {
    const cards = Array.from(group.querySelectorAll(":scope > .team-grid > .team-card"));
    const groupStyle = getComputedStyle(group);
    return {
      platform: group.dataset.socialPlatform || "",
      hidden: group.hidden,
      display: groupStyle.display,
      rendered: group.getClientRects().length > 0,
      totalCards: cards.length,
      visibleCards: cards.filter((card) => !card.hidden && getComputedStyle(card).display !== "none").length,
      collapsedCards: cards.filter((card) => card.classList.contains("is-social-card-collapsed")).length,
      disclosureButtons: group.querySelectorAll(":scope > .social-platform-toggle").length
    };
  }));
  const groupCount = initial.length;
  const filters = page.locator(".social-platform-filter");
  const renderedPlatforms = () => page.locator(".social-platform-group").evaluateAll((groups) => groups
    .filter((group) => getComputedStyle(group).display !== "none" && group.getClientRects().length > 0)
    .map((group) => group.dataset.socialPlatform));
  const filterState = await filters.evaluateAll((buttons) => buttons.map((button) => ({
    platform: button.dataset.socialFilter || "",
    pressed: button.getAttribute("aria-pressed"),
    active: button.classList.contains("is-active")
  })));
  assert.equal(groupCount, 4, `${scope}: social platform group count`);
  assert.equal(filterState.length, groupCount, `${scope}: platform filters must contain four categories and no all button`);
  assert(!filterState.some((filter) => filter.platform === "all"), `${scope}: deprecated all-platform filter remains`);
  assert.deepEqual(filterState.map((filter) => filter.platform).sort(), initial.map((group) => group.platform).sort(), `${scope}: filter/platform keys mismatch`);
  assert.equal(filterState[0]?.platform, "tiktok", `${scope}: TikTok is not the first social category`);
  assert.equal(filterState[0]?.pressed, "true", `${scope}: TikTok is not selected by default`);
  assert.equal(filterState[0]?.active, true, `${scope}: TikTok default button lacks the active style`);
  assert(filterState.slice(1).every((filter) => filter.pressed === "false" && !filter.active), `${scope}: a non-TikTok filter starts selected`);
  initial.forEach((group, index) => {
    assert(group.platform, `${scope}: social group ${index + 1} lacks a platform key`);
    assert.equal(group.hidden, group.platform !== "tiktok", `${scope}: social group ${index + 1} default visibility`);
    assert.equal(group.display === "none", group.platform !== "tiktok", `${scope}: social group ${index + 1} hidden display state`);
    assert.equal(group.rendered, group.platform === "tiktok", `${scope}: social group ${index + 1} rendered state`);
    assert(group.totalCards > 0, `${scope}: social group ${index + 1} has no accounts`);
    assert.equal(group.visibleCards, group.totalCards, `${scope}: social group ${index + 1} retains per-account hiding`);
    assert.equal(group.collapsedCards, 0, `${scope}: social group ${index + 1} retains collapsed account classes`);
    assert.equal(group.disclosureButtons, 0, `${scope}: social group ${index + 1} retains a view-all disclosure`);
  });
  assert.equal(await page.locator(".social-platform-group:not([hidden])").count(), 1, `${scope}: default social view is not isolated to TikTok`);
  assert.deepEqual(await renderedPlatforms(), ["tiktok"], `${scope}: non-TikTok accounts render in the default view`);
  await assertVisibleCardAlignment("TikTok default view");

  const selectedFilter = filters.nth(1);
  const selectedPlatform = await selectedFilter.getAttribute("data-social-filter");
  await selectedFilter.click();
  assert.equal(await page.locator(".social-platform-group[hidden]").count(), groupCount - 1, `${scope}: platform filter hidden group count`);
  assert.equal(await selectedFilter.getAttribute("aria-pressed"), "true", `${scope}: selected platform filter state`);
  assert.equal(await page.locator(".social-platform-filter.is-active").count(), 1, `${scope}: active platform filter count`);
  const visiblePlatforms = await page.locator(".social-platform-group:not([hidden])").evaluateAll((groups) => groups.map((group) => group.dataset.socialPlatform));
  assert.deepEqual(visiblePlatforms, [selectedPlatform], `${scope}: selected platform did not isolate its account group`);
  assert.deepEqual(await renderedPlatforms(), [selectedPlatform], `${scope}: hidden platform still renders after selection`);
  await assertVisibleCardAlignment(`${selectedPlatform} selected view`);
  const filterEvent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === "social_platform_filter")
    .at(-1));
  assert.equal(filterEvent?.[2]?.platform, selectedPlatform, `${scope}: selected platform analytics missing`);

  await selectedFilter.click();
  assert.equal(await page.locator(".social-platform-group[hidden]").count(), groupCount - 1, `${scope}: repeated category click restored all groups`);
  assert.equal(await selectedFilter.getAttribute("aria-pressed"), "true", `${scope}: repeated category click cleared the selected button`);
  assert.equal(await page.locator(".social-platform-filter.is-active").count(), 1, `${scope}: repeated category click changed active filter count`);
  const repeatedPlatforms = await page.locator(".social-platform-group:not([hidden])").evaluateAll((groups) => groups.map((group) => group.dataset.socialPlatform));
  assert.deepEqual(repeatedPlatforms, [selectedPlatform], `${scope}: repeated category click changed the visible platform`);
  assert.deepEqual(await renderedPlatforms(), [selectedPlatform], `${scope}: repeated category click rendered another platform`);
  const repeatedEvent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === "social_platform_filter")
    .at(-1));
  assert.equal(repeatedEvent?.[2]?.platform, selectedPlatform, `${scope}: repeated category analytics changed platform`);

  const defaultFilter = filters.first();
  await defaultFilter.click();
  assert.equal(await defaultFilter.getAttribute("aria-pressed"), "true", `${scope}: TikTok could not be restored`);
  const restoredPlatforms = await page.locator(".social-platform-group:not([hidden])").evaluateAll((groups) => groups.map((group) => group.dataset.socialPlatform));
  assert.deepEqual(restoredPlatforms, ["tiktok"], `${scope}: TikTok restore did not isolate TikTok accounts`);
  assert.deepEqual(await renderedPlatforms(), ["tiktok"], `${scope}: TikTok restore left another platform rendered`);

  await page.locator(".social-platform-group:not([hidden]) .team-card[href]").first().evaluate((card) => {
    card.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await page.locator(".social-platform-group:not([hidden]) .team-card[href]").first().click();
  const profileEvent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === "social_profile_click")
    .at(-1));
  assert(profileEvent && profileEvent[2]?.platform && profileEvent[2]?.position === 1, `${scope}: social profile click analytics missing`);
}

async function assertJointBrandParity(page, scope) {
  const state = await page.locator(".hero-brand-partnership .site-logo-lockup").evaluateAll((frames) => frames.map((frame) => {
    const frameStyle = getComputedStyle(frame);
    const image = frame.querySelector("img");
    const imageStyle = image ? getComputedStyle(image) : null;
    const frameRect = frame.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return {
      frame: {
        width: frameRect.width,
        height: frameRect.height,
        padding: frameStyle.padding,
        borderRadius: frameStyle.borderRadius,
        borderWidth: frameStyle.borderWidth,
        backgroundColor: frameStyle.backgroundColor,
        backgroundImage: frameStyle.backgroundImage,
        boxShadow: frameStyle.boxShadow
      },
      image: image && imageStyle && imageRect ? {
        width: imageRect.width,
        height: imageRect.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        backgroundColor: imageStyle.backgroundColor,
        borderRadius: imageStyle.borderRadius,
        objectFit: imageStyle.objectFit,
        objectPosition: imageStyle.objectPosition
      } : null
    };
  }));

  assert.equal(state.length, 2, `${scope}: joint brand frame count`);
  const [jabbar, company] = state;
  assert(jabbar.image && company.image, `${scope}: joint brand image missing`);
  assert(Math.abs(jabbar.frame.width - company.frame.width) <= 0.5, `${scope}: joint brand frame width mismatch`);
  assert(Math.abs(jabbar.frame.height - company.frame.height) <= 0.5, `${scope}: joint brand frame height mismatch`);
  for (const property of ["padding", "borderRadius", "borderWidth", "backgroundColor", "backgroundImage", "boxShadow"]) {
    assert.equal(jabbar.frame[property], company.frame[property], `${scope}: joint brand frame ${property} mismatch`);
  }
  assert(Math.abs(jabbar.image.width - company.image.width) <= 0.5, `${scope}: joint brand inner width mismatch`);
  assert(Math.abs(jabbar.image.height - company.image.height) <= 0.5, `${scope}: joint brand inner height mismatch`);
  assert.equal(jabbar.image.backgroundColor, company.image.backgroundColor, `${scope}: joint brand inner surface mismatch`);
  assert.equal(jabbar.image.borderRadius, company.image.borderRadius, `${scope}: joint brand inner radius mismatch`);
  assert.equal(jabbar.image.objectFit, "contain", `${scope}: Jabbar logo can be cropped`);
  assert.equal(company.image.objectFit, "contain", `${scope}: Haoduobao logo can be cropped`);
  assert.equal(jabbar.image.objectPosition, company.image.objectPosition, `${scope}: joint brand image alignment mismatch`);
  assert(jabbar.image.naturalWidth > 0 && jabbar.image.naturalHeight > 0, `${scope}: Jabbar logo failed to load`);
  assert(company.image.naturalWidth > 0 && company.image.naturalHeight > 0, `${scope}: Haoduobao logo failed to load`);
}

async function assertMobileRtlProcessLayout(page, scope) {
  const cards = await page.locator(".process-step").evaluateAll((items) => items.map((card) => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    return {
      number: rect(card.querySelector(".process-step-number")),
      heading: rect(card.querySelector("h3")),
      paragraph: rect(card.querySelector("p")),
      paddingInlineStart: Number.parseFloat(getComputedStyle(card).paddingInlineStart),
      paddingInlineEnd: Number.parseFloat(getComputedStyle(card).paddingInlineEnd)
    };
  }));
  assert.equal(cards.length, 4, `${scope}: process card count`);
  cards.forEach((card, index) => {
    assert(card.paddingInlineStart > card.paddingInlineEnd, `${scope}: process card ${index + 1} does not reserve RTL leading space`);
    assert(card.heading.right <= card.number.left + 1, `${scope}: process card ${index + 1} number overlaps heading`);
    assert(card.paragraph.right <= card.number.left + 1, `${scope}: process card ${index + 1} number overlaps paragraph`);
  });
}

async function assertHeroCtaHover(page, scope) {
  const cta = page.locator(".team-heading .quote-entry .inquiry-entry-card-cta");
  await cta.hover();
  const hover = await cta.evaluate((element) => ({
    card: getComputedStyle(element).textDecorationLine,
    button: getComputedStyle(element.querySelector(".inquiry-entry-button")).textDecorationLine
  }));
  assert.equal(hover.card, "none", `${scope}: hovered hero quote CTA is underlined`);
  assert.equal(hover.button, "none", `${scope}: hovered hero quote button is underlined`);
}

async function auditImages(page, scope) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
      window.scrollTo(0, Math.max(0, max * ratio));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  await page.waitForTimeout(250);
  const broken = await page.evaluate(() => Array.from(document.images)
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src));
  assert.deepEqual(broken, [], `${scope}: broken images ${broken.join(", ")}`);
}

async function assertMobileGalleryScroll(page, scope) {
  await page.locator(".sourcing-gallery").scrollIntoViewIfNeeded();
  const railCount = await page.locator(".gallery-rail").count();
  assert.equal(railCount, 2, `${scope}: gallery rail count`);

  for (let index = 0; index < railCount; index += 1) {
    const rail = page.locator(".gallery-rail").nth(index);
    await rail.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForFunction((railIndex) => {
      const currentRail = document.querySelectorAll(".gallery-rail")[railIndex];
      return currentRail?.querySelector(".gallery-track")?.classList.contains("is-gallery-mobile-loop-ready");
    }, index);

    await page.waitForTimeout(100);
    const autoStart = await rail.evaluate((element) => element.scrollLeft);
    try {
      await page.waitForFunction(({ railIndex, start }) => {
        const currentRail = document.querySelectorAll(".gallery-rail")[railIndex];
        return currentRail && currentRail.scrollLeft >= start + 1;
      }, { railIndex: index, start: autoStart }, { timeout: 5000 });
    } catch (error) {
      const stalled = await rail.evaluate((element) => ({
        position: element.scrollLeft,
        activeElement: document.activeElement?.className || document.activeElement?.tagName || "",
        top: element.getBoundingClientRect().top,
        bottom: element.getBoundingClientRect().bottom,
        visibility: document.visibilityState
      }));
      throw new assert.AssertionError({
        message: `${scope}: rail ${index + 1} mobile auto-scroll stalled (${autoStart} -> ${stalled.position}; ${JSON.stringify(stalled)})`,
        actual: stalled.position,
        expected: `>= ${autoStart + 1}`,
        operator: ">="
      });
    }
    const autoEnd = await rail.evaluate((element) => element.scrollLeft);
    assert(autoEnd >= autoStart + 1, `${scope}: rail ${index + 1} mobile auto-scroll did not advance (${autoStart} -> ${autoEnd})`);

    const state = await rail.evaluate(async (element) => {
      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const track = element.querySelector(".gallery-track");
      const originals = Array.from(track.querySelectorAll(':scope > .gallery-frame:not([data-gallery-clone="true"])'));
      const beforeClones = Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone-side="before"]'));
      const afterClones = Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone-side="after"]'));
      const clones = beforeClones.concat(afterClones);
      const loopDistance = afterClones[0] && originals[0] ? afterClones[0].offsetLeft - originals[0].offsetLeft : 0;
      const leadingDistance = beforeClones[0] && originals[0] ? originals[0].offsetLeft - beforeClones[0].offsetLeft : 0;
      const maxScroll = element.scrollWidth - element.clientWidth;
      const autoplayBoundaryStart = loopDistance * 2 - 3;
      element.scrollLeft = autoplayBoundaryStart;
      await delay(180);
      const autoplayBoundaryEnd = element.scrollLeft;
      const PointerEventCtor = window.PointerEvent || window.Event;
      element.dispatchEvent(new PointerEventCtor("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch" }));
      const manualStart = Math.min(loopDistance * 1.25, Math.max(loopDistance + 160, maxScroll - 400));
      element.scrollLeft = manualStart;
      await nextFrame();
      const rightTarget = Math.min(manualStart + 220, maxScroll - 40);
      element.scrollLeft = rightTarget;
      await nextFrame();
      const movedRight = element.scrollLeft;
      const leftTarget = Math.max(40, movedRight - 120);
      element.scrollLeft = leftTarget;
      await nextFrame();
      const movedLeft = element.scrollLeft;
      await delay(140);
      const pausedPosition = element.scrollLeft;
      element.dispatchEvent(new PointerEventCtor("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch" }));
      const railStyle = getComputedStyle(element);
      const trackStyle = getComputedStyle(track);
      return {
        overflowX: railStyle.overflowX,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        maxScroll,
        loopDistance,
        leadingDistance,
        autoplayBoundaryStart,
        autoplayBoundaryEnd,
        manualStart,
        movedRight,
        movedLeft,
        pausedPosition,
        animationName: trackStyle.animationName,
        transform: trackStyle.transform,
        mobileReady: track.classList.contains("is-gallery-mobile-loop-ready"),
        role: element.getAttribute("role"),
        tabIndex: element.tabIndex,
        originalCount: originals.length,
        cloneCount: clones.length,
        beforeCloneCount: beforeClones.length,
        afterCloneCount: afterClones.length,
        clonesVisible: clones.every((frame) => getComputedStyle(frame).display !== "none"),
        clonesHiddenFromA11y: clones.every((frame) => frame.getAttribute("aria-hidden") === "true"),
        cloneSequencesMatch: [beforeClones, afterClones].every((set) => set.every((frame, frameIndex) =>
          frame.querySelector("img")?.getAttribute("src") === originals[frameIndex]?.querySelector("img")?.getAttribute("src")))
      };
    });

    assert(["auto", "scroll"].includes(state.overflowX), `${scope}: rail ${index + 1} overflow-x is ${state.overflowX}`);
    assert(state.scrollWidth > state.clientWidth + 120, `${scope}: rail ${index + 1} is not horizontally scrollable`);
    assert(state.loopDistance > state.clientWidth, `${scope}: rail ${index + 1} loop distance is invalid (${state.loopDistance})`);
    assert(Math.abs(state.leadingDistance - state.loopDistance) <= 1, `${scope}: rail ${index + 1} leading clone distance mismatch (${state.leadingDistance}/${state.loopDistance})`);
    assert(autoStart >= state.loopDistance - 2 && autoStart < state.loopDistance * 2, `${scope}: rail ${index + 1} did not initialize inside the safe middle set (${autoStart}/${state.loopDistance})`);
    assert(state.autoplayBoundaryEnd >= state.loopDistance && state.autoplayBoundaryEnd < state.loopDistance + 100, `${scope}: rail ${index + 1} autoplay wrapped outside the safe middle set (${state.autoplayBoundaryStart} -> ${state.autoplayBoundaryEnd}/${state.loopDistance})`);
    assert(state.movedRight >= state.manualStart + 100, `${scope}: rail ${index + 1} rejected a rightward scroll`);
    assert(state.movedLeft <= state.movedRight - 60, `${scope}: rail ${index + 1} rejected a leftward scroll`);
    assert(state.movedLeft >= state.loopDistance, `${scope}: rail ${index + 1} manual test escaped the safe middle set (${state.movedLeft}/${state.loopDistance})`);
    assert(Math.abs(state.pausedPosition - state.movedLeft) <= 1, `${scope}: rail ${index + 1} moved while pointer-paused (${state.movedLeft} -> ${state.pausedPosition})`);
    assert.equal(state.animationName, "none", `${scope}: rail ${index + 1} still competes with touch using animation ${state.animationName}`);
    assert(["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(state.transform), `${scope}: rail ${index + 1} track remains transformed (${state.transform})`);
    assert.equal(state.mobileReady, true, `${scope}: rail ${index + 1} mobile loop was not initialized`);
    assert.equal(state.role, "region", `${scope}: rail ${index + 1} region role`);
    assert.equal(state.tabIndex, 0, `${scope}: rail ${index + 1} keyboard access`);
    assert.equal(state.cloneCount, state.originalCount * 2, `${scope}: rail ${index + 1} loop clone count`);
    assert.equal(state.beforeCloneCount, state.originalCount, `${scope}: rail ${index + 1} leading clone count`);
    assert.equal(state.afterCloneCount, state.originalCount, `${scope}: rail ${index + 1} trailing clone count`);
    assert.equal(state.cloneSequencesMatch, true, `${scope}: rail ${index + 1} clone sequence differs from originals`);
    assert.equal(state.clonesVisible, true, `${scope}: rail ${index + 1} loop clones are hidden on mobile`);
    assert.equal(state.clonesHiddenFromA11y, true, `${scope}: rail ${index + 1} loop clones remain exposed to assistive tech`);
  }
}

async function assertDesktopGalleryMarquee(page, scope) {
  await page.locator(".sourcing-gallery").scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => document.documentElement.classList.contains("gallery-ready")
    && Array.from(document.querySelectorAll(".sourcing-gallery .gallery-track"))
      .every((track) => track.classList.contains("is-gallery-loop-ready")));

  const geometry = await page.locator(".sourcing-gallery .gallery-track").evaluateAll((tracks) => tracks.map((track) => {
    const originals = Array.from(track.querySelectorAll(':scope > .gallery-frame:not([data-gallery-clone="true"])'));
    const beforeClones = Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone-side="before"]'));
    const afterClones = Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone-side="after"]'));
    const clones = beforeClones.concat(afterClones);
    const style = getComputedStyle(track);
    const animation = track.getAnimations()[0];
    if (animation) {
      animation.currentTime = 0;
      animation.play();
    }
    return {
      originalCount: originals.length,
      cloneCount: clones.length,
      beforeCloneCount: beforeClones.length,
      afterCloneCount: afterClones.length,
      clonesHiddenFromA11y: clones.every((frame) => frame.getAttribute("aria-hidden") === "true"),
      measuredDistance: afterClones[0] && originals[0] ? afterClones[0].offsetLeft - originals[0].offsetLeft : 0,
      leadingDistance: beforeClones[0] && originals[0] ? originals[0].offsetLeft - beforeClones[0].offsetLeft : 0,
      cloneSequencesMatch: [beforeClones, afterClones].every((set) => set.every((frame, frameIndex) =>
        frame.querySelector("img")?.getAttribute("src") === originals[frameIndex]?.querySelector("img")?.getAttribute("src"))),
      configuredDistance: Math.abs(Number.parseFloat(style.getPropertyValue("--gallery-loop-distance"))),
      duration: Number.parseFloat(style.animationDuration) * 1000,
      animationName: style.animationName,
      timing: style.animationTimingFunction,
      direction: style.animationDirection,
      iterations: style.animationIterationCount,
      playState: style.animationPlayState,
      railScrollLeft: track.parentElement.scrollLeft
    };
  }));

  await page.waitForFunction(() => {
    const tracks = Array.from(document.querySelectorAll(".sourcing-gallery .gallery-track"));
    return tracks.length === 2 && tracks.every((track) => {
      const animation = track.getAnimations()[0];
      const transform = getComputedStyle(track).transform;
      const translateX = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
      return animation?.playState === "running" && Number(animation.currentTime) > 0 && translateX < -1;
    });
  }, null, { timeout: 3000 });
  const movement = await page.locator(".sourcing-gallery .gallery-track").evaluateAll((tracks) => tracks.map((track) => {
    const transform = getComputedStyle(track).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
  }));

  assert.equal(geometry.length, 2, `${scope}: desktop gallery track count`);
  geometry.forEach((track, index) => {
    assert(track.originalCount >= 2, `${scope}: track ${index + 1} needs multiple originals`);
    assert.equal(track.cloneCount, track.originalCount * 2, `${scope}: track ${index + 1} clone count`);
    assert.equal(track.beforeCloneCount, track.originalCount, `${scope}: track ${index + 1} leading clone count`);
    assert.equal(track.afterCloneCount, track.originalCount, `${scope}: track ${index + 1} trailing clone count`);
    assert.equal(track.cloneSequencesMatch, true, `${scope}: track ${index + 1} clone sequence differs from originals`);
    assert.equal(track.clonesHiddenFromA11y, true, `${scope}: track ${index + 1} clones remain exposed to assistive tech`);
    assert(Math.abs(track.leadingDistance - track.measuredDistance) <= 1, `${scope}: track ${index + 1} leading/trailing loop distances differ`);
    assert(Math.abs(track.measuredDistance - track.configuredDistance) <= 1, `${scope}: track ${index + 1} loop distance mismatch`);
    assert(track.duration >= 28000, `${scope}: track ${index + 1} loop duration is too abrupt (${track.duration}ms)`);
    assert.equal(track.animationName, "galleryMarquee", `${scope}: track ${index + 1} animation name`);
    assert.equal(track.timing, "linear", `${scope}: track ${index + 1} animation must not ease or bounce`);
    assert.equal(track.direction, "normal", `${scope}: track ${index + 1} animation must not reverse to the first image`);
    assert.equal(track.iterations, "infinite", `${scope}: track ${index + 1} animation iteration`);
    assert.equal(track.playState, "running", `${scope}: track ${index + 1} animation did not start`);
    assert(Math.abs(track.railScrollLeft) <= 1, `${scope}: track ${index + 1} desktop scroll snapping moved the rail (${track.railScrollLeft}px)`);
    assert(movement[index] < -1, `${scope}: track ${index + 1} did not move continuously (${movement[index]}px)`);
  });
}

async function assertCompanyProofLayout(page, scope, mobile) {
  await page.locator("#services").scrollIntoViewIfNeeded();
  const state = await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const photo = document.querySelector("#services .company-photo-card");
    const metrics = document.querySelector("#services .company-metrics");
    const cards = Array.from(document.querySelectorAll("#services .company-metric-card"));
    const labels = Array.from(document.querySelectorAll("#services .company-metric-card span"));
    return {
      photo: rect(photo),
      metrics: rect(metrics),
      cards: cards.map((card) => ({ rect: rect(card), textAlign: getComputedStyle(card).textAlign })),
      labelFonts: labels.map((label) => Number.parseFloat(getComputedStyle(label).fontSize)),
      labelAlignments: labels.map((label) => getComputedStyle(label).textAlign),
      aboutBlocksOnPage: document.querySelectorAll(".company-about").length,
      identityBlocksOnPage: document.querySelectorAll(".company-identity").length
    };
  });

  assert(state.photo && state.metrics, `${scope}: company proof photo or metrics missing`);
  assert(Math.abs(state.photo.left - state.metrics.left) <= 2, `${scope}: company photo and metrics left edges differ`);
  assert(Math.abs(state.photo.width - state.metrics.width) <= 2, `${scope}: company photo and metrics widths differ`);
  assert(state.photo.bottom < state.metrics.top, `${scope}: company photo does not sit above metrics`);
  assert.equal(state.cards.length, 5, `${scope}: company metric card count`);
  assert(state.cards.every((card) => card.textAlign === "center"), `${scope}: company metric card text is not centered`);
  assert(state.labelAlignments.every((value) => value === "center"), `${scope}: company metric labels are not centered`);
  assert(state.labelFonts.every((value) => value >= 14.5), `${scope}: company metric label is too small (${state.labelFonts.join(", ")})`);
  assert.equal(state.aboutBlocksOnPage, 0, `${scope}: removed company About card returned`);
  assert.equal(state.identityBlocksOnPage, 0, `${scope}: removed company identity block returned`);

  if (mobile) {
    assert(Math.abs(state.cards[0].rect.top - state.cards[1].rect.top) <= 2, `${scope}: first mobile metric row is misaligned`);
    assert(Math.abs(state.cards[4].rect.width - state.metrics.width) <= 2, `${scope}: final mobile metric does not span the row`);
  } else {
    const firstTop = state.cards[0].rect.top;
    assert(state.cards.every((card) => Math.abs(card.rect.top - firstTop) <= 2), `${scope}: desktop metric cards are not aligned in one row`);
  }
}

async function assertTestimonialProof(page, scope, locale) {
  const proof = page.locator(".testimonial-card--proof");
  assert.equal(await proof.count(), 1, `${scope}: Boyner proof card count`);
  await proof.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const image = document.querySelector(".testimonial-card--proof .testimonial-proof-image");
    return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  });
  const state = await proof.evaluate((card) => {
    const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const image = card.querySelector(".testimonial-proof-image");
    return {
      text: normalizeText(card.textContent),
      flag: normalizeText(card.querySelector(".testimonial-flag")?.textContent),
      monoCount: card.querySelectorAll(".num-mono").length,
      imageCount: card.querySelectorAll(".testimonial-proof-image").length,
      image: image ? {
        pathname: new URL(image.src, document.baseURI).pathname,
        width: image.getAttribute("width"),
        height: image.getAttribute("height"),
        alt: image.alt,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      } : null
    };
  });
  assert.equal(state.monoCount, 0, `${scope}: Boyner proof card must not contain a monospaced amount`);
  assert.match(state.text, /boyner/i, `${scope}: Boyner proof card identity`);
  assert(state.text.includes(KENYA_LABELS[locale]), `${scope}: localized Kenya label`);
  assert.equal(state.flag, "🇰🇪", `${scope}: Kenya flag`);
  assert.equal(state.imageCount, 1, `${scope}: Boyner proof image count`);
  assert(state.image, `${scope}: Boyner proof image missing`);
  assert.match(state.image.pathname, /^\/assets\/testimonial-boyner-(?:480|720)\.webp$|^\/assets\/testimonial-boyner\.webp$/, `${scope}: responsive Boyner proof image source`);
  assert.equal(state.image.width, "720", `${scope}: Boyner proof image width`);
  assert.equal(state.image.height, "960", `${scope}: Boyner proof image height`);
  assert.match(state.image.alt, /boyner/i, `${scope}: Boyner proof image alternative text`);
  assert(state.image.naturalWidth > 0 && state.image.naturalHeight > 0, `${scope}: Boyner proof image failed to load`);
}

async function assertFooterJoin(page, scope) {
  const state = await page.evaluate(() => {
    const social = document.querySelector("#social-accounts.social-platform-groups");
    const team = document.querySelector("#team.team");
    const footer = document.querySelector(".site-footer");
    const gmail = document.querySelector('.site-footer .contact-link[aria-label*="Gmail"] .contact-value');
    const socialRect = social?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const gmailStyle = gmail ? getComputedStyle(gmail) : null;
    const visibleSocialGroups = social ? Array.from(social.querySelectorAll(".social-platform-group"))
      .filter((group) => {
        const style = getComputedStyle(group);
        return !group.hidden && style.display !== "none" && style.visibility !== "hidden" && group.getClientRects().length > 0;
      }) : [];
    const lastSocialGroupBottom = visibleSocialGroups.reduce((bottom, group) => Math.max(bottom, group.getBoundingClientRect().bottom), -Infinity);
    return {
      gap: socialRect && footerRect ? footerRect.top - socialRect.bottom : null,
      socialBreathingSpace: socialRect && Number.isFinite(lastSocialGroupBottom) ? socialRect.bottom - lastSocialGroupBottom : null,
      teamPaddingBottom: team ? Number.parseFloat(getComputedStyle(team).paddingBottom) : null,
      teamBackgroundColor: team ? getComputedStyle(team).backgroundColor : "",
      socialMarginBottom: social ? Number.parseFloat(getComputedStyle(social).marginBottom) : null,
      footerMarginTop: footer ? Number.parseFloat(getComputedStyle(footer).marginTop) : null,
      gmail: gmail ? {
        text: gmail.textContent.trim(),
        whiteSpace: gmailStyle.whiteSpace,
        overflow: gmailStyle.overflow,
        textOverflow: gmailStyle.textOverflow,
        clientWidth: gmail.clientWidth,
        scrollWidth: gmail.scrollWidth
      } : null
    };
  });

  assert.notEqual(state.gap, null, `${scope}: footer join elements are missing`);
  assert.equal(state.teamPaddingBottom, 0, `${scope}: footer seam padding returned`);
  assert(Math.abs(state.gap) <= 1, `${scope}: visible footer seam is ${state.gap}px`);
  assert.equal(state.socialMarginBottom, 0, `${scope}: social bottom margin reintroduced a footer seam`);
  assert.equal(state.footerMarginTop, 0, `${scope}: footer top margin reintroduced a seam`);
  assert.notEqual(state.socialBreathingSpace, null, `${scope}: visible social platform group is missing`);
  assert(state.socialBreathingSpace >= 28 && state.socialBreathingSpace <= 52, `${scope}: social footer breathing space is ${state.socialBreathingSpace}px`);
  assert.match(state.teamBackgroundColor, /rgb\(238,\s*246,\s*251\)/, `${scope}: footer join lacks the non-white team surface (${state.teamBackgroundColor})`);
  assert.equal(state.gmail?.text, "qianjiabao1999@gmail.com", `${scope}: footer Gmail text changed`);
  assert.equal(state.gmail.whiteSpace, "nowrap", `${scope}: Gmail is allowed to split inside the address`);
  assert.notEqual(state.gmail.overflow, "hidden", `${scope}: Gmail remains clipped`);
  assert.notEqual(state.gmail.textOverflow, "ellipsis", `${scope}: Gmail remains ellipsized`);
  assert(state.gmail.scrollWidth <= state.gmail.clientWidth + 1, `${scope}: Gmail still overflows (${state.gmail.scrollWidth}/${state.gmail.clientWidth})`);
}

async function assertLocalizedMetricAnimation(page, scope, locale) {
  const expected = METRIC_EXPECTED[locale];
  assert(expected, `${scope}: localized metric expectation is missing`);
  await page.locator(".company-metrics").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".company-intro")?.classList.contains("is-visible"));
  await page.waitForFunction(({ first, last }) => {
    const values = Array.from(document.querySelectorAll(".company-metric-card strong .company-metric-visual"), (element) => element.textContent.trim());
    return values.length === 5 && values[0] === first && values[4] === last;
  }, expected, { timeout: 3000 });
  const copy = await page.evaluate(() => ({
    visual: Array.from(document.querySelectorAll(".company-metric-card strong .company-metric-visual"), (element) => element.textContent.trim()),
    accessible: Array.from(document.querySelectorAll(".company-metric-card strong .sr-only"), (element) => element.textContent.trim()),
    ariaLabels: document.querySelectorAll(".company-metric-card strong[aria-label]").length
  }));
  assert.equal(copy.visual.length, 5, `${scope}: animated metric visual count`);
  assert.equal(copy.accessible.length, 5, `${scope}: animated metric accessible count`);
  assert.deepEqual([copy.visual[0], copy.visual[4]], [expected.first, expected.last], `${scope}: localized metric visual copy`);
  assert.deepEqual([copy.accessible[0], copy.accessible[4]], [expected.first, expected.last], `${scope}: localized metric accessible copy`);
  assert.equal(copy.ariaLabels, 0, `${scope}: company metrics still rely on aria-label`);
}

async function footerToolsChecks(browserType) {
  const context = await browserType.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce"
  });
  await blockAnalytics(context);
  const page = await context.newPage();
  const errors = collectErrors(page);
  const cases = [
    { from: "/", locale: "en", destination: "/en/", scope: "home footer tools" },
    { from: "/calculator/", locale: "fr", destination: "/fr/calculator/", scope: "calculator footer tools" },
    { from: "/inquiry/", locale: "de", destination: "/de/inquiry/", scope: "inquiry footer tools" },
    { from: "/website-privacy-policy.html", locale: "es", destination: "/es/website-privacy-policy.html", scope: "privacy footer tools" }
  ];

  for (const testCase of cases) {
    await page.goto(`${BASE_URL}${testCase.from}`, { waitUntil: "domcontentloaded" });
    const tools = page.locator(".site-footer-tools");
    const language = page.locator(".site-footer-language-select");
    await tools.waitFor({ state: "visible" });
    assert.equal(await tools.count(), 1, `${testCase.scope}: footer tools count`);
    assert.equal(await language.count(), 1, `${testCase.scope}: language select count`);
    assert.equal(await page.locator(".site-footer-backtop").count(), 0, `${testCase.scope}: retired back-to-top control returned`);
    const position = await tools.evaluate((element) => getComputedStyle(element).position);
    assert(!["fixed", "sticky"].includes(position), `${testCase.scope}: footer tools must remain in document flow (${position})`);

    const navigation = page.waitForURL(`${BASE_URL}${testCase.destination}`);
    await language.selectOption(testCase.locale);
    await navigation;
    await page.locator(".site-footer-language-select").waitFor({ state: "attached" });
    assert.equal(await page.locator(".site-footer-language-select").inputValue(), testCase.locale, `${testCase.scope}: selected locale after navigation`);
    assert.equal(errors.length, 0, `${testCase.scope}: console errors ${errors.splice(0).join(" | ")}`);
  }

  await context.close();
}

async function homeMatrix(browserType) {
  for (const viewport of [{ width: 390, height: 844, mobile: true }, { width: 1280, height: 900, mobile: false }]) {
    const context = await browserType.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      screen: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      deviceScaleFactor: 1
    });
    await blockAnalytics(context);
    const page = await context.newPage();
    const errors = collectErrors(page);
    for (const item of HOME_PAGES) {
      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
      await waitForHomeVisualSignature(page);
      await page.waitForTimeout(120);
      const scope = `${item.locale} home ${viewport.width}x${viewport.height}`;
      const state = await pageState(page);
      assertShared(state, scope);
      assert.equal(state.title, "Jabbar Sourcing", `${scope}: homepage title`);
      assertHeaderNavigation(state, scope, { desktop: !viewport.mobile });
      assertNoFloatingControls(state, scope);
      assertMobileMenuTrimmed(state, scope);
      assertPageTelegram(state, scope);
      assertHomeVisualSignature(state, scope, item.locale);
      assertHeroCta(state, scope);
      if (!viewport.mobile) await assertDesktopGalleryMarquee(page, scope);
      await assertCompanyProofLayout(page, scope, viewport.mobile);
      await assertTestimonialProof(page, scope, item.locale);
      await assertJointBrandParity(page, scope);
      await assertFooterJoin(page, scope);
      assert.equal(state.counts.faqTags, 7, `${scope}: FAQ tag count`);
      assert.equal(state.counts.faqItems, 7, `${scope}: FAQ item count`);
      await assertFaqDefaultClosed(page, scope);
      assert.equal(state.counts.countries, 0, `${scope}: removed country strip returned`);
      assert.equal(state.counts.metrics, 5, `${scope}: current five company metrics must remain`);
      assert.equal(state.counts.jointBrandLockups, 1, `${scope}: joint brand lockup count`);
      assert.equal(state.counts.companyAboutBlocks, 0, `${scope}: removed company About card returned`);
      assert.equal(state.counts.companyIdentityBlocks, 0, `${scope}: removed company identity block returned`);
      assert.equal(state.counts.socialFilters, 4, `${scope}: social platform filter count`);
      assert.equal(state.counts.progress, 1, `${scope}: progress count`);
      assert(state.rects.social, `${scope}: social section missing`);
      assert(state.rects.socialHeading, `${scope}: social heading missing`);
      const expectedWidth = Math.min(viewport.width - 48, 1140);
      assert(Math.abs(state.rects.social.width - expectedWidth) <= 1, `${scope}: social width ${state.rects.social.width}`);
      assert(Math.abs(state.rects.social.left - (viewport.width - expectedWidth) / 2) <= 1, `${scope}: social not centered`);
      const socialCenter = state.rects.social.left + state.rects.social.width / 2;
      const headingCenter = state.rects.socialHeading.left + state.rects.socialHeading.width / 2;
      assert(Math.abs(socialCenter - headingCenter) <= 1, `${scope}: social heading center delta ${headingCenter - socialCenter}`);
      await assertSocialPlatformFilters(page, scope);
      if (!viewport.mobile) await assertLocalizedMetricAnimation(page, scope, item.locale);
      if (viewport.mobile) {
        assertFooterLocationContract(state, scope, { mobile: true });
        await assertMobileGalleryScroll(page, scope);
        assert.equal(state.counts.qrCards, 0, `${scope}: QR hover card must not initialize on touch`);
        if (item.rtl) await assertMobileRtlProcessLayout(page, scope);
      } else {
        assert.equal(state.counts.qrCards, 1, `${scope}: desktop QR card missing`);
        assertDesktopFooter(state, scope, { contacts: true });
        await assertHeroCtaHover(page, scope);
      }
      if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
      if (!viewport.mobile && IMAGE_AUDIT_LOCALES.has(item.locale)) await auditImages(page, scope);
      assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
    }
    await context.close();
  }
}

async function calculatorMatrix(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  const page = await context.newPage();
  const errors = collectErrors(page);
  for (const item of CALCULATOR_PAGES) {
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.locator("#cbmFill").waitFor({ state: "attached" });
    const scope = `${item.locale} calculator`;
    const state = await pageState(page);
    assertShared(state, scope);
    assertHeaderNavigation(state, scope, { desktop: true });
    assertNoFloatingControls(state, scope);
    assertMobileMenuTrimmed(state, scope);
    assertCalculatorVisualSignature(state, scope, item.locale);
    assertDesktopFooter(state, scope);
    assert.equal(state.counts.calculatorModeTabs, 2, `${scope}: calculator mode tab count`);
    assert.equal(state.counts.cbm, 1, `${scope}: CBM visual count`);
    assert.equal(state.counts.progress, 1, `${scope}: progress count`);
    assert.equal(state.rects.conversionBar, null, `${scope}: calculator must not have mobile bar`);
    if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
    assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
  }

  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  for (const value of ["length", "width", "height"]) await page.locator(`#${value}`).fill("100");
  const cases = [
    {
      qty: 5,
      containers: [{ pct: "7%", cap: "40英尺高柜 1/1 · 5.0 / 68 立方米", fill: "rgb(93, 202, 165)", full: false, width: "20" }]
    },
    {
      qty: 40,
      containers: [{ pct: "59%", cap: "40英尺高柜 1/1 · 40.0 / 68 立方米", fill: "rgb(93, 202, 165)", full: false, width: "162" }]
    },
    {
      qty: 70,
      containers: [
        { pct: "100%", cap: "40英尺高柜 1/2 · 68.0 / 68 立方米", fill: "rgb(239, 159, 39)", full: true, width: "276" },
        { pct: "3%", cap: "40英尺高柜 2/2 · 2.0 / 68 立方米", fill: "rgb(93, 202, 165)", full: false, width: "8" }
      ]
    },
    {
      qty: 90,
      containers: [
        { pct: "100%", cap: "40英尺高柜 1/2 · 68.0 / 68 立方米", fill: "rgb(239, 159, 39)", full: true, width: "276" },
        { pct: "32%", cap: "40英尺高柜 2/2 · 22.0 / 68 立方米", fill: "rgb(93, 202, 165)", full: false, width: "89" }
      ]
    }
  ];
  for (const testCase of cases) {
    await page.locator("#qty").fill(String(testCase.qty));
    await page.locator("#qty").dispatchEvent("input");
    await page.waitForFunction((expected) => document.querySelector("#cbmCap")?.textContent === expected, testCase.containers[0].cap);
    assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "ready", `${testCase.qty} CBM result state`);
    assert.equal(await page.locator("[data-result-detail][hidden]").count(), 0, `${testCase.qty} CBM result details remain hidden`);
    assert.equal(await page.locator("[data-result-status]").isHidden(), true, `${testCase.qty} CBM empty-state status remains visible`);
    assert.equal(await page.locator("[data-copy-result]").isDisabled(), false, `${testCase.qty} CBM copy result remains disabled`);
    const visuals = page.locator(".cbm-container-visual");
    assert.equal(await visuals.count(), testCase.containers.length, `${testCase.qty} CBM rendered container count`);
    for (let index = 0; index < testCase.containers.length; index += 1) {
      const expected = testCase.containers[index];
      const card = visuals.nth(index);
      assert.equal(await card.locator(".cbm-container-percentage").textContent(), expected.pct, `${testCase.qty} CBM container ${index + 1} percentage`);
      assert.equal(await card.locator(".cbm-container-capacity").textContent(), expected.cap, `${testCase.qty} CBM container ${index + 1} capacity`);
      assert.equal(await card.locator(".cbm-container-fill").evaluate((element) => getComputedStyle(element).fill), expected.fill, `${testCase.qty} CBM container ${index + 1} fill color`);
      assert.equal(await card.locator(".cbm-container-fill").evaluate((element) => element.classList.contains("is-full")), expected.full, `${testCase.qty} CBM container ${index + 1} full class`);
      assert.equal(await card.locator(".cbm-container-fill").getAttribute("width"), expected.width, `${testCase.qty} CBM container ${index + 1} fill width`);
      const accessibleTitle = await card.locator("title").textContent();
      assert(accessibleTitle.includes(expected.pct) && accessibleTitle.includes(expected.cap), `${testCase.qty} CBM container ${index + 1} accessible title is stale: ${accessibleTitle}`);
    }
  }
  await page.locator(".calculator-results").screenshot({ path: `${OUTPUT_DIR}/calculator-visual-1280x900.png` });
  await page.screenshot({ path: `${OUTPUT_DIR}/calculator-blueprint-1280x900.png`, fullPage: true });
  await page.locator("#qty").fill("0.5");
  assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "empty", "invalid live input did not reset the result state");
  assert.equal(await page.locator("[data-result-detail][hidden]").count(), 3, "invalid live input left result details visible");
  assert.equal(await page.locator("[data-copy-result]").isDisabled(), true, "invalid live input left copy result enabled");
  assert.equal(await page.locator("[data-total-cbm]").textContent(), "0.000", "invalid live input retained the previous total");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  await page.locator("#cbmFill").waitFor({ state: "attached" });
  const mobileState = await pageState(page);
  assertShared(mobileState, "zh calculator 390x844");
  assertHeaderNavigation(mobileState, "zh calculator 390x844");
  assertNoFloatingControls(mobileState, "zh calculator 390x844");
  assertMobileMenuTrimmed(mobileState, "zh calculator 390x844");
  assertCalculatorVisualSignature(mobileState, "zh calculator 390x844", "zh");
  assert.equal(mobileState.rects.conversionBar, null, "zh calculator 390x844: calculator must not have mobile bar");
  await page.screenshot({ path: `${OUTPUT_DIR}/calculator-blueprint-390x844.png`, fullPage: true });
  await context.close();
}

async function inquiryMatrix(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  const page = await context.newPage();
  const errors = collectErrors(page);
  for (const item of INQUIRY_PAGES) {
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(80);
    const scope = `${item.locale} inquiry`;
    const state = await pageState(page);
    assertShared(state, scope);
    assertHeaderNavigation(state, scope, { desktop: true });
    assertNoFloatingControls(state, scope);
    assertMobileMenuTrimmed(state, scope);
    assertPageTelegram(state, scope);
    assertDesktopFooter(state, scope, { contacts: true });
    assert.equal(state.counts.progress, 0, `${scope}: short inquiry page must not have progress bar`);
    assert.equal(state.counts.qrCards, 1, `${scope}: desktop QR enhancement missing`);
    assert.equal(state.rects.conversionBar, null, `${scope}: inquiry must not have mobile conversion bar`);
    assert.equal(await page.locator(".site-nav-return-home").count(), 1, `${scope}: top return-home control count`);
    assert.equal(await page.locator(".site-nav-return-home").getAttribute("href"), "../", `${scope}: top return-home target`);
    assert.equal(await page.locator(".site-nav-mobile-home").count(), 0, `${scope}: duplicate return-home mobile item remains`);
    assert.equal(await page.locator(".site-nav-mobile-team").count(), 0, `${scope}: social account remains inside the mobile menu`);
    assert.equal(await page.locator(".site-nav-social-pill").count(), 1, `${scope}: responsive social pill count`);
    assert.equal(await page.locator(".site-nav-social-pill").getAttribute("href"), "../#social-accounts", `${scope}: responsive social pill target`);
    if (item.locale === "en") {
      const productField = page.locator('.inquiry-form [name="product"]');
      await productField.focus();
      const focusStyle = await productField.evaluate((element) => ({
        color: getComputedStyle(element).outlineColor,
        width: getComputedStyle(element).outlineWidth,
        offset: getComputedStyle(element).outlineOffset
      }));
      assert.equal(focusStyle.color, "rgb(15, 107, 168)", `${scope}: inquiry focus outline color ${focusStyle.color}`);
      assert.equal(focusStyle.width, "3px", `${scope}: inquiry focus outline width ${focusStyle.width}`);
      assert.equal(focusStyle.offset, "2px", `${scope}: inquiry focus outline offset ${focusStyle.offset}`);
    }
    if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
    assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
  }
  await context.close();
}

async function mobileHeaderMatrix(browserType) {
  assert.equal(HEADER_PAGES.length, 30, "responsive header matrix must cover all 30 localized pages");
  for (const width of [360, 390, 430, 1279]) {
    const touch = width <= 430;
    const context = await browserType.newContext({
      viewport: { width, height: 844 },
      screen: { width, height: 844 },
      isMobile: touch,
      hasTouch: touch
    });
    await blockAnalytics(context);
    const page = await context.newPage();
    const errors = collectErrors(page);
    for (const item of HEADER_PAGES) {
      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
      await page.locator(".site-nav-social-pill").waitFor({ state: "visible" });
      await page.locator(".site-nav-tool-pill").waitFor({ state: "visible" });
      const scope = `${item.locale} ${item.type} header ${width}x844`;
      const state = await pageState(page);
      assertShared(state, scope);
      assertHeaderNavigation(state, scope);
      assertNoFloatingControls(state, scope);
      assertMobileMenuTrimmed(state, scope);
      if (item.rtl) assert.equal(state.direction, "rtl", `${scope}: Arabic direction`);
      assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
    }
    await context.close();
  }
}

async function interactionChecks(browserType) {
  const desktop = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(desktop);
  await mockValidShipments(desktop);
  const page = await desktop.newPage();
  const errors = collectErrors(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".contact-speed-dial, .mobile-conversion-bar, .site-footer-backtop").count(), 0, "removed floating controls still exist on desktop");
  await page.locator('.site-nav-links a[href="#social-accounts"]').click();
  await page.waitForFunction(() => location.hash === "#social-accounts");
  await page.waitForFunction(() => {
    const element = document.querySelector("#social-accounts");
    if (!element) return false;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return box.bottom > 0 && box.top < window.innerHeight
      && style.display !== "none" && style.visibility !== "hidden"
      && Number.parseFloat(style.opacity) >= 0.99;
  });
  const socialTarget = await page.locator("#social-accounts").evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { top: box.top, bottom: box.bottom, display: style.display, visibility: style.visibility, opacity: Number.parseFloat(style.opacity) };
  });
  assert.notEqual(socialTarget.display, "none", "social target disappeared after hash navigation");
  assert.notEqual(socialTarget.visibility, "hidden", "social target is hidden after hash navigation");
  assert(socialTarget.opacity >= 0.99, `social target opacity after hash navigation is ${socialTarget.opacity}`);
  assert(socialTarget.bottom > 0 && socialTarget.top < 900, "social target is not in the viewport after hash navigation");
  await page.screenshot({ path: `${OUTPUT_DIR}/social-hash-visible-1280x900.png` });

  const footerWhatsapp = page.locator(".site-footer .contact-whatsapp").first();
  await footerWhatsapp.scrollIntoViewIfNeeded();
  await footerWhatsapp.hover();
  await page.waitForTimeout(430);
  assert.equal(await page.locator(".whatsapp-qr-card").evaluate((element) => element.hidden), false, "QR card did not open after 400ms");
  assert.equal(await page.locator(".whatsapp-qr-card img").getAttribute("src"), "/assets/whatsapp-qr.svg?v=20260712a", "QR asset URL");
  await page.waitForTimeout(220);
  assert(Number(await page.locator(".whatsapp-qr-card").evaluate((element) => getComputedStyle(element).opacity)) >= 0.99, "QR card did not finish its reveal transition");
  await page.screenshot({ path: `${OUTPUT_DIR}/whatsapp-qr-hover-1280x900.png` });
  await page.locator(".site-nav").hover();
  await page.waitForTimeout(230);
  assert.equal(await page.locator(".whatsapp-qr-card").evaluate((element) => element.hidden), true, "QR card did not close after 200ms");
  await footerWhatsapp.focus();
  await page.waitForTimeout(40);
  assert.equal(await page.locator(".whatsapp-qr-card").evaluate((element) => element.hidden), false, "QR card did not open on keyboard focus");
  const qrPosition = await page.evaluate(() => ({
    cardTop: document.querySelector(".whatsapp-qr-card").getBoundingClientRect().top,
    navBottom: document.querySelector(".site-nav").getBoundingClientRect().bottom
  }));
  assert(qrPosition.cardTop >= qrPosition.navBottom + 7, `QR card overlaps sticky navigation: ${qrPosition.cardTop} < ${qrPosition.navBottom + 8}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(20);
  assert.equal(await page.locator(".whatsapp-qr-card").evaluate((element) => element.hidden), true, "QR card did not close on Escape");

  const disabledShipment = await page.locator(".shipment-ticker").evaluate((element) => ({
    enabled: element.querySelector(".shipment-ticker-rail")?.getAttribute("data-shipments-enabled"),
    unavailable: element.classList.contains("is-unavailable"),
    display: getComputedStyle(element).display,
    items: element.querySelectorAll(".shipment-ticker-item").length
  }));
  assert.deepEqual(disabledShipment, { enabled: "false", unavailable: true, display: "none", items: 1 }, "placeholder shipment ticker must remain disabled and hidden");

  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 0); });
  await page.waitForFunction(() => {
    const fill = document.querySelector(".site-scroll-progress-fill");
    if (!fill || window.scrollY > 1) return false;
    return new DOMMatrix(getComputedStyle(fill).transform).a <= 0.01;
  });
  const topScale = await page.locator(".site-scroll-progress-fill").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  assert(topScale <= 0.01, `progress at top is ${topScale}`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => Math.abs(window.scrollY - (document.documentElement.scrollHeight - window.innerHeight)) <= 2);
  await page.waitForTimeout(50);
  const bottomScale = await page.locator(".site-scroll-progress-fill").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  assert(bottomScale >= 0.999, `progress at bottom is ${bottomScale}`);

  await page.locator(".company-metrics").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".company-metric-card strong"))
    .every((element) => element.getBoundingClientRect().top < window.innerHeight && element.getBoundingClientRect().bottom > 0));
  await page.waitForTimeout(1300);
  const metricVisuals = await page.locator(".company-metric-card strong .company-metric-visual").allTextContents();
  const metricAccessible = await page.locator(".company-metric-card strong .sr-only").allTextContents();
  const expectedMetrics = ["2008年", "300+", "50,000㎡", "全球 100+ 国家和地区", "500,000,000 人民币元"];
  assert.deepEqual(metricVisuals.map((item) => item.trim()), expectedMetrics, "company metric visuals changed or did not finish counting");
  assert.deepEqual(metricAccessible.map((item) => item.trim()), expectedMetrics, "company metric accessible copy changed during animation");
  assert.equal(await page.locator(".company-metric-card strong[aria-label]").count(), 0, "company metrics still rely on aria-label");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(40);
  assert.equal(await page.locator(".shipment-ticker.is-unavailable").count(), 1, "live reduced-motion change exposed disabled placeholder shipments");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(180);

  await assertFaqDefaultClosed(page, "desktop FAQ interaction");
  let faqScrollMoves = 0;
  for (let index = 0; index < 7; index += 1) {
    const button = page.locator(".faq-quick-tag").nth(index);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    if (index === 0) {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      const focusStyle = await button.evaluate((element) => ({
        color: getComputedStyle(element).outlineColor,
        width: getComputedStyle(element).outlineWidth
      }));
      assert.equal(focusStyle.color, "rgb(15, 118, 110)", `FAQ focus outline color ${focusStyle.color}`);
      assert.equal(focusStyle.width, "2px", `FAQ focus outline width ${focusStyle.width}`);
    }
    const before = await page.evaluate(() => ({ href: location.href, scrollY: window.scrollY }));
    await page.keyboard.press("Enter");
    await page.waitForFunction((itemIndex) => document.querySelectorAll(".faq-item")[itemIndex]?.open, index);
    await page.waitForTimeout(520);
    const open = await page.locator(".faq-item").evaluateAll((items) => items.map((item) => item.open));
    const visible = await page.locator(".faq-item").evaluateAll((items) => items.map((item) => !item.hidden && item.getClientRects().length > 0));
    assert.equal(open.filter(Boolean).length, 1, `FAQ tag ${index + 1}: multiple details open`);
    assert.equal(open[index], true, `FAQ tag ${index + 1}: wrong detail opened`);
    assert.equal(visible.filter(Boolean).length, 1, `FAQ tag ${index + 1}: multiple FAQ items are visible`);
    assert.equal(visible[index], true, `FAQ tag ${index + 1}: wrong FAQ item is visible`);
    assert.equal(await button.getAttribute("aria-expanded"), "true", `FAQ tag ${index + 1}: aria-expanded state`);
    assert.equal(await button.evaluate((element) => element.classList.contains("is-active")), true, `FAQ tag ${index + 1}: active state`);
    const after = await page.evaluate((itemIndex) => {
      const item = document.querySelectorAll(".faq-item")[itemIndex];
      const box = item.getBoundingClientRect();
      const navBottom = document.querySelector(".site-nav")?.getBoundingClientRect().bottom || 0;
      return {
        href: location.href,
        scrollY: window.scrollY,
        itemTop: box.top,
        itemBottom: box.bottom,
        navBottom,
        focusedTag: document.activeElement?.classList.contains("faq-quick-tag") || false,
        focusedIndex: Array.from(document.querySelectorAll(".faq-quick-tag")).indexOf(document.activeElement)
      };
    }, index);
    assert.equal(after.href, before.href, `FAQ tag ${index + 1}: click navigated away or changed the URL`);
    assert(after.itemBottom > after.navBottom && after.itemTop < 900, `FAQ tag ${index + 1}: target item was not scrolled into view`);
    assert.equal(after.focusedTag, true, `FAQ tag ${index + 1}: focus was moved away from the quick tag`);
    assert.equal(after.focusedIndex, index, `FAQ tag ${index + 1}: focus moved to a different control`);
    if (Math.abs(after.scrollY - before.scrollY) > 10) faqScrollMoves += 1;

    if (index === 0) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const repeated = await page.locator(".faq-item").evaluateAll((items) => items.map((item) => item.open));
      assert.equal(repeated.filter(Boolean).length, 1, "FAQ repeated tag click changed the open-item count");
      assert.equal(repeated[0], true, "FAQ repeated tag click closed its detail");
      assert.equal(await button.getAttribute("aria-expanded"), "true", "FAQ repeated tag click reset aria-expanded");
      assert.equal(await button.evaluate((element) => document.activeElement === element), true, "FAQ repeated tag click stole focus");
    }
  }
  assert(faqScrollMoves >= 1, "FAQ quick tags never scrolled to their target detail");
  assert.equal(errors.length, 0, `desktop interaction console errors: ${errors.join(" | ")}`);
  await desktop.close();

  const mobile = await browserType.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await blockAnalytics(mobile);
  const mobilePage = await mobile.newPage();
  const mobileErrors = collectErrors(mobilePage);
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await mobilePage.locator(".contact-speed-dial, .mobile-conversion-bar, .site-footer-backtop").count(), 0, "removed floating controls still exist on mobile");
  const languageMenu = mobilePage.locator(".site-nav-language");
  const languageSummary = languageMenu.locator(":scope > summary");
  const mobileMenu = mobilePage.locator(".site-nav-mobile-menu");
  const mobileSummary = mobileMenu.locator(":scope > summary");

  await mobileSummary.click();
  assert.equal(await mobileMenu.getAttribute("open") !== null, true, "mobile navigation did not open");
  assert.equal(await mobileSummary.getAttribute("aria-expanded"), "true", "mobile navigation summary state did not open");
  await languageSummary.focus();
  await mobilePage.keyboard.press("Enter");
  assert.equal(await languageMenu.getAttribute("open") !== null, true, "language navigation did not open from the keyboard");
  assert.equal(await mobileMenu.getAttribute("open") !== null, false, "opening the language navigation did not close the mobile navigation");
  assert.equal(await languageSummary.getAttribute("aria-expanded"), "true", "language navigation summary state did not open");
  assert.equal(await mobileSummary.getAttribute("aria-expanded"), "false", "mobile navigation summary state did not close");
  await mobileSummary.focus();
  await mobilePage.keyboard.press("Enter");
  assert.equal(await mobileMenu.getAttribute("open") !== null, true, "mobile navigation did not reopen from the keyboard");
  assert.equal(await languageMenu.getAttribute("open") !== null, false, "opening the mobile navigation did not close the language navigation");
  await mobilePage.keyboard.press("Escape");
  assert.equal(await mobileMenu.getAttribute("open") !== null, false, "Escape did not close the mobile navigation");
  assert.equal(await mobileSummary.getAttribute("aria-expanded"), "false", "Escape did not update the mobile navigation summary state");
  assert.equal(await mobileSummary.evaluate((summary) => document.activeElement === summary), true, "Escape did not restore focus to the mobile navigation summary");

  await languageSummary.click();
  await mobilePage.evaluate(() => document.body.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  assert.equal(await languageMenu.getAttribute("open") !== null, false, "outside click did not close the language navigation");

  await mobileSummary.click();
  assert.equal(await mobilePage.locator('.site-nav-mobile-panel a[href*="calculator"], .site-nav-mobile-panel a[href="./"]').count(), 0, "removed calculator/home links remain in mobile menu");
  assert.equal(await mobilePage.locator('.site-nav-mobile-panel a[href*="#social-accounts"]').count(), 0, "social-account link remains duplicated in the mobile menu");
  assert.equal(await mobilePage.locator('.site-nav-social-pill[href*="#social-accounts"]').count(), 1, "top-level social-account pill is missing");
  await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-menu-trimmed-390x844.png` });
  await mobileMenu.locator('.site-nav-mobile-panel a[href="#contact"]').click();
  assert.equal(await mobileMenu.getAttribute("open") !== null, false, "mobile navigation link did not close the menu");

  const galleryRail = mobilePage.locator(".gallery-rail").first();
  await galleryRail.scrollIntoViewIfNeeded();
  await mobilePage.waitForFunction(() => document.querySelector(".gallery-rail .gallery-track")?.classList.contains("is-gallery-mobile-loop-ready"));
  const galleryGeometry = await galleryRail.evaluate((rail) => {
    const firstOriginal = rail.querySelector('.gallery-frame:not([data-gallery-clone="true"])');
    const firstBeforeClone = rail.querySelector('.gallery-frame[data-gallery-clone-side="before"]');
    const firstAfterClone = rail.querySelector('.gallery-frame[data-gallery-clone-side="after"]');
    return {
      distance: firstAfterClone && firstOriginal ? firstAfterClone.offsetLeft - firstOriginal.offsetLeft : 0,
      leadingDistance: firstBeforeClone && firstOriginal ? firstOriginal.offsetLeft - firstBeforeClone.offsetLeft : 0,
      position: rail.scrollLeft
    };
  });
  const loopDistance = galleryGeometry.distance;
  assert(loopDistance > 600, `mobile gallery loop distance is invalid (${loopDistance}px)`);
  assert(Math.abs(galleryGeometry.leadingDistance - loopDistance) <= 1, `mobile gallery leading/trailing loop distance mismatch (${galleryGeometry.leadingDistance}/${loopDistance})`);
  assert(galleryGeometry.position >= loopDistance - 2 && galleryGeometry.position < loopDistance * 2, `mobile gallery did not initialize inside the safe middle set (${galleryGeometry.position}/${loopDistance})`);
  const galleryBox = await galleryRail.boundingBox();
  assert(galleryBox, "mobile gallery rail has no touchable bounding box");
  const touchY = galleryBox.y + Math.min(galleryBox.height / 2, 180);
  const cdp = await mobile.newCDPSession(mobilePage);
  const readGalleryPosition = () => galleryRail.evaluate((rail) => rail.scrollLeft);
  const loopPhase = (position) => ((position - loopDistance) % loopDistance + loopDistance) % loopDistance;
  const dispatchTouchSwipe = async (startX, endX, label, startPosition) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: touchY, radiusX: 7, radiusY: 7, force: 1 }]
    });
    if (Number.isFinite(startPosition)) {
      await galleryRail.evaluate((rail, position) => { rail.scrollLeft = position; }, startPosition);
      await mobilePage.waitForTimeout(32);
    }
    for (const ratio of [0.2, 0.4, 0.6, 0.8, 1]) {
      // Give Chromium realistic gesture timing so native fling momentum does
      // not masquerade as the gallery's JavaScript auto-scroll.
      await mobilePage.waitForTimeout(32);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{
          x: startX + ((endX - startX) * ratio),
          y: touchY,
          radiusX: 7,
          radiusY: 7,
          force: 1
        }]
      });
    }
    await mobilePage.waitForTimeout(32);
    const heldStart = await readGalleryPosition();
    await mobilePage.waitForTimeout(220);
    const heldEnd = await readGalleryPosition();
    assert(Math.abs(heldEnd - heldStart) <= 2, `${label}: gallery auto-scroll moved while touch remained down (${heldStart} -> ${heldEnd})`);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return { heldStart, heldEnd, releasedAt: Date.now() };
  };
  const waitForNativeScrollSettle = async (label, releasedAt) => {
    const samples = [await readGalleryPosition()];
    let previous = samples[0];
    let stableSamples = 0;
    while (Date.now() - releasedAt < 1650) {
      await mobilePage.waitForTimeout(120);
      const current = await readGalleryPosition();
      samples.push(current);
      if (Math.abs(current - previous) <= 2) stableSamples += 1;
      else stableSamples = 0;
      previous = current;
      if (stableSamples >= 3) {
        return { position: current, elapsed: Date.now() - releasedAt, settledAt: Date.now(), samples };
      }
    }
    assert.fail(`${label}: native touch momentum did not settle inside the 2200ms pause window (${samples.map((value) => Math.round(value)).join(" -> ")})`);
  };

  const rightEdge = galleryBox.x + Math.min(galleryBox.width - 28, 340);
  const leftEdge = galleryBox.x + 48;
  const assertPausedThenResumed = async (label, gesture, settled) => {
    assert(settled.elapsed <= 1400, `${label}: native momentum consumed too much of the pause window (${settled.elapsed}ms)`);
    await mobilePage.waitForTimeout(700);
    const pauseProbePosition = await readGalleryPosition();
    assert(Math.abs(pauseProbePosition - settled.position) <= 2, `${label}: autoplay resumed before 2200ms after inertial scrolling ended (${settled.position} -> ${pauseProbePosition})`);

    const resumeProbeDelay = 2500 - (Date.now() - settled.settledAt);
    if (resumeProbeDelay > 0) await mobilePage.waitForTimeout(resumeProbeDelay);
    const resumedPosition = await readGalleryPosition();
    const resumedPhase = loopPhase(resumedPosition);
    const pausedPhase = loopPhase(pauseProbePosition);
    const resumedAdvance = (resumedPhase - pausedPhase + loopDistance) % loopDistance;
    assert(resumedPosition >= loopDistance && resumedPosition < loopDistance * 2, `${label}: resume escaped the safe middle set (${resumedPosition}/${loopDistance})`);
    assert(resumedAdvance >= 8, `${label}: autoplay did not resume after the 2200ms inertial pause (${pauseProbePosition} -> ${resumedPosition})`);
    assert(resumedAdvance < 120, `${label}: resume reset or jumped instead of continuing its phase (${pauseProbePosition} -> ${resumedPosition}; phase advance ${resumedAdvance}; released ${Date.now() - gesture.releasedAt}ms ago)`);
    return resumedPosition;
  };

  const forwardStart = loopDistance * 2 - 180;
  const forwardGesture = await dispatchTouchSwipe(rightEdge, leftEdge, "mobile gallery forward-boundary swipe", forwardStart);
  assert(forwardGesture.heldEnd > loopDistance * 2 + 20, `mobile gallery could not swipe into the trailing buffer (${forwardStart} -> ${forwardGesture.heldEnd}/${loopDistance})`);
  const forwardSettled = await waitForNativeScrollSettle("mobile gallery forward-boundary swipe", forwardGesture.releasedAt);
  assert(forwardSettled.position > loopDistance * 2, `mobile gallery discarded the trailing-buffer position (${forwardGesture.heldEnd} -> ${forwardSettled.position}/${loopDistance})`);
  await assertPausedThenResumed("mobile gallery forward-boundary swipe", forwardGesture, forwardSettled);

  const backwardStart = loopDistance + 180;
  const backwardGesture = await dispatchTouchSwipe(leftEdge, rightEdge, "mobile gallery backward-boundary swipe", backwardStart);
  assert(backwardGesture.heldEnd < loopDistance - 20, `mobile gallery could not swipe into the leading buffer (${backwardStart} -> ${backwardGesture.heldEnd}/${loopDistance})`);
  const backwardSettled = await waitForNativeScrollSettle("mobile gallery backward-boundary swipe", backwardGesture.releasedAt);
  assert(backwardSettled.position < loopDistance, `mobile gallery discarded the leading-buffer position (${backwardGesture.heldEnd} -> ${backwardSettled.position}/${loopDistance})`);
  await assertPausedThenResumed("mobile gallery backward-boundary swipe", backwardGesture, backwardSettled);

  const resizePhaseRatio = 0.63;
  await galleryRail.evaluate((rail, position) => {
    const PointerEventCtor = window.PointerEvent || window.Event;
    rail.dispatchEvent(new PointerEventCtor("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" }));
    rail.scrollLeft = position;
    rail.dispatchEvent(new PointerEventCtor("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" }));
  }, loopDistance * (1 + resizePhaseRatio));
  const readResizedGallery = async (width) => {
    await mobilePage.setViewportSize({ width, height: 844 });
    await mobilePage.waitForTimeout(120);
    return galleryRail.evaluate((rail) => {
      const firstOriginal = rail.querySelector('.gallery-frame:not([data-gallery-clone="true"])');
      const firstAfterClone = rail.querySelector('.gallery-frame[data-gallery-clone-side="after"]');
      const distance = firstAfterClone.offsetLeft - firstOriginal.offsetLeft;
      const phase = ((rail.scrollLeft - distance) % distance + distance) % distance;
      return { distance, position: rail.scrollLeft, phaseRatio: phase / distance };
    });
  };
  const widenedGallery = await readResizedGallery(430);
  assert(widenedGallery.position >= widenedGallery.distance && widenedGallery.position < widenedGallery.distance * 2, `mobile gallery resize escaped the safe middle set (${JSON.stringify(widenedGallery)})`);
  assert(Math.abs(widenedGallery.phaseRatio - resizePhaseRatio) <= 0.01, `mobile gallery resize lost its phase (${resizePhaseRatio} -> ${widenedGallery.phaseRatio})`);
  const restoredGallery = await readResizedGallery(390);
  assert(restoredGallery.position >= restoredGallery.distance && restoredGallery.position < restoredGallery.distance * 2, `mobile gallery restore escaped the safe middle set (${JSON.stringify(restoredGallery)})`);
  assert(Math.abs(restoredGallery.phaseRatio - resizePhaseRatio) <= 0.01, `mobile gallery restore lost its phase (${resizePhaseRatio} -> ${restoredGallery.phaseRatio})`);

  await mobilePage.setViewportSize({ width: 844, height: 390 });
  await mobilePage.waitForTimeout(150);
  const desktopBreakpointGallery = await galleryRail.evaluate((rail) => {
    const track = rail.querySelector(".gallery-track");
    const style = getComputedStyle(track);
    return {
      position: rail.scrollLeft,
      desktopReady: track.classList.contains("is-gallery-loop-ready"),
      mobileReady: track.classList.contains("is-gallery-mobile-loop-ready"),
      animationName: style.animationName,
      animationPlayState: style.animationPlayState
    };
  });
  assert.equal(desktopBreakpointGallery.desktopReady, true, `gallery did not enter desktop loop at 844px (${JSON.stringify(desktopBreakpointGallery)})`);
  assert.equal(desktopBreakpointGallery.mobileReady, false, `gallery retained its mobile loop class at 844px (${JSON.stringify(desktopBreakpointGallery)})`);
  assert(Math.abs(desktopBreakpointGallery.position) <= 1, `desktop gallery rail was not reset for marquee animation (${desktopBreakpointGallery.position}px)`);
  assert.equal(desktopBreakpointGallery.animationName, "galleryMarquee", `desktop breakpoint gallery animation changed (${desktopBreakpointGallery.animationName})`);
  assert.equal(desktopBreakpointGallery.animationPlayState, "running", `desktop breakpoint gallery animation did not run (${desktopBreakpointGallery.animationPlayState})`);

  const restoredAfterDesktopBreakpoint = await readResizedGallery(390);
  assert(restoredAfterDesktopBreakpoint.position >= restoredAfterDesktopBreakpoint.distance && restoredAfterDesktopBreakpoint.position < restoredAfterDesktopBreakpoint.distance * 2, `mobile gallery cross-breakpoint restore escaped the safe middle set (${JSON.stringify(restoredAfterDesktopBreakpoint)})`);
  assert(Math.abs(restoredAfterDesktopBreakpoint.phaseRatio - resizePhaseRatio) <= 0.01, `mobile gallery cross-breakpoint restore lost its phase (${resizePhaseRatio} -> ${restoredAfterDesktopBreakpoint.phaseRatio})`);
  await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-gallery-native-swipe-390x844.png` });
  assert.equal(await mobilePage.locator(".whatsapp-qr-card").count(), 0, "touch page initialized QR hover card");
  assert.equal(mobileErrors.length, 0, `mobile interaction console errors: ${mobileErrors.join(" | ")}`);
  await mobile.close();
}

async function accessibilityFallbackChecks(browserType) {
  const reduced = await browserType.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await blockAnalytics(reduced);
  await mockValidShipments(reduced);
  const page = await reduced.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".shipment-ticker")?.classList.contains("is-unavailable"));
  await page.waitForFunction(() => document.querySelectorAll('.gallery-frame[data-gallery-clone="true"]').length > 0);
  assert.equal(await page.locator(".ui-section-reveal").count(), 0, "reduced motion still hides sections for reveal");
  assert.equal(await page.locator(".service-country-marquee, .service-country-toggle, .service-country-item").count(), 0, "removed country strip exists in reduced-motion mode");
  assert.equal(await page.locator(".shipment-ticker.is-unavailable").count(), 1, "reduced motion exposed disabled placeholder shipments");
  assert.equal(await page.locator(".shipment-ticker").evaluate((element) => getComputedStyle(element).display), "none", "reduced motion placeholder shipment ticker is visible");
  assert.equal(await page.locator(".shipment-ticker-track").evaluate((element) => getComputedStyle(element).transform), "none", "reduced motion shipment ticker still transforms");
  assert.equal(await page.locator(".shipment-ticker-list").count(), 1, "reduced motion created a duplicate placeholder shipment list");
  const reducedGallery = await page.locator(".sourcing-gallery .gallery-track").evaluateAll((tracks) => tracks.map((track) => ({
    animationName: getComputedStyle(track).animationName,
    transform: getComputedStyle(track).transform,
    clonesHidden: Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone="true"]')).every((frame) => getComputedStyle(frame).display === "none")
  })));
  assert(reducedGallery.every((track) => track.animationName === "none"), `reduced motion gallery animation remains: ${JSON.stringify(reducedGallery)}`);
  assert(reducedGallery.every((track) => track.transform === "none"), `reduced motion gallery transform remains: ${JSON.stringify(reducedGallery)}`);
  assert(reducedGallery.every((track) => track.clonesHidden), `reduced motion gallery duplicate images remain visible: ${JSON.stringify(reducedGallery)}`);
  assert.equal(await page.locator(".stamp.land").count(), 3, "reduced motion stamps did not render immediately");
  const stampOpacities = await page.locator(".stamp").evaluateAll((items) => items.map((item) => Number.parseFloat(getComputedStyle(item).opacity)));
  assert(stampOpacities.every((opacity) => opacity >= 0.99), `reduced motion stamp opacity ${stampOpacities.join(", ")}`);
  const metrics = await page.locator(".company-metric-card strong").allTextContents();
  assert.deepEqual(metrics.map((item) => item.trim()), ["2008年", "300+", "50,000㎡", "全球 100+ 国家和地区", "500,000,000 人民币元"], "reduced motion changed metric copy");
  await reduced.close();

  const noJs = await browserType.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  // Remote stylesheets may still be in flight at DOMContentLoaded when page
  // JavaScript is disabled. Wait for them before checking CSS-only fallbacks.
  await noJsPage.waitForLoadState("load");
  const hidden = await noJsPage.evaluate(() => [".sourcing-gallery", ".company-intro", ".work-process", ".testimonials", ".faq-section", ".social-platform-groups"]
    .filter((selector) => {
      const element = document.querySelector(selector);
      if (!element) return true;
      const style = getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) < 0.99;
    }));
  assert.deepEqual(hidden, [], `no-JS content hidden: ${hidden.join(", ")}`);
  assert.equal(await noJsPage.locator(".section-code").count(), 7, "no-JS section codes missing");
  assert.equal(await noJsPage.locator(".stamp").count(), 3, "no-JS stamps missing");
  const noJsStampOpacities = await noJsPage.locator(".stamp").evaluateAll((items) => items.map((item) => Number.parseFloat(getComputedStyle(item).opacity)));
  assert(noJsStampOpacities.every((opacity) => opacity >= 0.99), `no-JS stamps hidden: ${noJsStampOpacities.join(", ")}`);
  assert.equal(await noJsPage.locator(".company-metric-number.num-mono").count(), 5, "no-JS metric numbers missing");
  assert.equal(await noJsPage.locator(".shipment-ticker-list").count(), 1, "no-JS shipment fallback count");
  assert.equal(await noJsPage.locator(".shipment-ticker").evaluate((element) => getComputedStyle(element).display), "none", "no-JS shipment placeholder is visible");
  const noJsFaqItems = await noJsPage.locator(".faq-item").evaluateAll((items) => items.map((item) => ({
    hidden: item.hidden,
    display: getComputedStyle(item).display,
    rendered: item.getClientRects().length > 0
  })));
  assert.equal(noJsFaqItems.length, 7, "no-JS FAQ item count");
  assert(noJsFaqItems.every((item) => !item.hidden && item.display !== "none" && item.rendered), `no-JS FAQ content hidden: ${JSON.stringify(noJsFaqItems)}`);
  assert.equal(await noJsPage.locator(".social-platform-toggle").count(), 0, "no-JS page injected a social disclosure control");
  const noJsHiddenAccounts = await noJsPage.locator(".social-platform-group .team-card").evaluateAll((cards) => cards.filter((card) => {
    const style = getComputedStyle(card);
    return card.hidden || style.display === "none" || style.visibility === "hidden";
  }).length);
  assert.equal(noJsHiddenAccounts, 0, "no-JS social accounts are hidden");
  await noJs.close();
}

async function rtlMotionCheck(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  await mockValidShipments(context);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/ar/`, { waitUntil: "domcontentloaded" });
  await page.locator(".company-intro").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".company-intro")?.classList.contains("is-visible"));
  await page.waitForFunction(() => document.querySelector(".shipment-ticker")?.classList.contains("is-unavailable"));
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "Arabic page direction changed");
  assert.equal(await page.locator(".shipment-ticker").evaluate((element) => getComputedStyle(element).display), "none", "Arabic placeholder shipment ticker is visible");
  assert.equal(await page.locator(".shipment-ticker-list").count(), 1, "Arabic page created a duplicate placeholder shipment list");
  await context.close();
}

async function shipmentGuardChecks(browserType) {
  const cases = [
    { name: "empty", body: [] },
    { name: "flagged placeholder", body: [{ placeholder: true, city_zh: "测试", city_en: "Test", load: "1×40HQ", when: "2026-07-09" }] },
    { name: "bracket placeholder", body: [{ city_zh: "[待填写]", city_en: "[To be filled]", load: "1×40HQ", when: "2026-07-09" }] },
    { name: "mixed data", body: [VALID_SHIPMENTS[0], { placeholder: true, city_zh: "[待填写]", city_en: "[To be filled]" }] },
    { name: "invalid JSON", rawBody: "{invalid" },
    { name: "HTTP failure", status: 503, body: [] }
  ];

  for (const testCase of cases) {
    const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
    await blockAnalytics(context);
    await context.route("**/shipments.json*", (route) => route.fulfill({
      status: testCase.status || 200,
      contentType: "application/json; charset=utf-8",
      body: testCase.rawBody || JSON.stringify(testCase.body)
    }));
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector(".shipment-ticker")?.classList.contains("is-unavailable"));
    assert.equal(await page.locator(".shipment-ticker").evaluate((element) => getComputedStyle(element).display), "none", `${testCase.name}: shipment ticker is visible`);
    assert.equal(await page.locator(".shipment-ticker.is-ready").count(), 0, `${testCase.name}: shipment ticker became ready`);
    await context.close();
  }
}

async function calculatorAnalyticsChecks(browserType) {
  const context = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(context);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".contact-speed-dial, .mobile-conversion-bar, .site-footer-backtop").count(), 0, "removed floating controls remain on calculator");

  await page.locator('[data-calculator-mode="excel"]').click();
  const analyzerMount = page.locator("[data-order-analyzer]");
  await analyzerMount.waitFor({ state: "visible" });
  const loadAnalyzer = analyzerMount.locator("[data-order-load]");
  if (await loadAnalyzer.count()) await loadAnalyzer.click();
  await page.waitForFunction(() => window.JABBAR_ORDER_ANALYZER_QA?.ready === true);
  const excelQuoteLink = page.locator("[data-order-inquiry]");
  assert.equal(await excelQuoteLink.count(), 1, "Excel analyzer inquiry CTA count");
  assert.equal(await excelQuoteLink.getAttribute("href"), "/inquiry/", "Excel analyzer inquiry CTA path");
  assert.equal((await excelQuoteLink.textContent())?.trim(), "携带此结果获取报价", "Excel analyzer inquiry CTA label");
  assert.equal(await excelQuoteLink.isVisible(), false, "Excel analyzer inquiry CTA visible before a result");
  await page.locator('[data-calculator-mode="quick"]').click();

  const events = async (name) => page.evaluate((eventName) => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === eventName)
    .map((entry) => entry[2] || {}), name);

  await page.locator("#cbm-calculator button[type=submit]").click();
  assert.equal((await events("calculator_calculate")).length, 0, "invalid calculator submit emitted a conversion event");
  assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "invalid", "invalid calculator submit did not expose the invalid state");
  assert.equal(await page.locator("[data-result-detail][hidden]").count(), 3, "invalid calculator submit exposed result details");
  assert.equal(await page.locator("[data-copy-result]").isDisabled(), true, "invalid calculator submit enabled copying");
  for (const [field, value] of [["length", "30"], ["width", "40"], ["height", "40"], ["qty", "1350"]]) {
    await page.locator(`#${field}`).fill(value);
  }
  await page.locator("#cbm-calculator button[type=submit]").click();
  await page.waitForFunction(() => (window.dataLayer || []).some((entry) => entry[0] === "event" && entry[1] === "calculator_result"));
  assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "ready", "valid calculator submit did not expose the ready state");
  assert.equal(await page.locator("[data-result-detail][hidden]").count(), 0, "valid calculator submit left result details hidden");
  assert.equal(await page.locator("[data-copy-result]").isDisabled(), false, "valid calculator submit left copying disabled");
  assert.equal((await events("calculator_calculate")).length, 0, "deprecated duplicate calculator event returned");
  const resultEvents = await events("calculator_result");
  assert.equal(resultEvents.length, 1, "valid calculator submit must emit exactly one result event");
  assert.deepEqual(Object.keys(resultEvents[0]).sort(), ["locale", "method", "total_cbm"], "calculator result contains unexpected data");
  assert.equal(resultEvents[0].method, "manual", "calculator result method");
  assert.equal(resultEvents[0].locale, "zh-CN", "calculator result locale");
  assert(Number(resultEvents[0].total_cbm) > 0, "calculator result CBM missing");
  const quoteLink = page.locator(".calculator-results .calculator-inquiry-cta");
  await quoteLink.waitFor({ state: "visible" });

  await page.locator("#qty").fill("0.5");
  await page.locator("#cbm-calculator button[type=submit]").click();
  await page.waitForTimeout(80);
  assert.equal((await events("calculator_calculate")).length, 0, "fractional carton below one emitted the deprecated calculate event");
  assert.equal((await events("calculator_result")).length, 1, "fractional carton below one reused a stale result event");
  assert.equal(await quoteLink.isHidden(), true, "fractional carton below one left the inquiry action visible");
  assert.equal(page.url(), `${BASE_URL}/calculator/`, "fractional carton below one opened inquiry with stale data");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("jabbarCalcResult")), null, "invalid fractional carton stored a stale handoff");

  await page.locator("#qty").fill("1350");
  await quoteLink.waitFor({ state: "visible" });
  await quoteLink.click();
  await page.waitForURL(`${BASE_URL}/inquiry/`);
  assert.equal(await page.locator('[name="quantity"]').inputValue(), "1350", "calculator quantity was not transferred to inquiry");
  assert((await page.locator('[name="note"]').inputValue()).includes("Total CBM"), "calculator summary was not transferred to inquiry notes");
  const prefillNotice = page.locator(".calculator-prefill-notice");
  await prefillNotice.waitFor({ state: "visible" });
  assert.equal(await prefillNotice.count(), 1, "calculator handoff notice count");
  assert.equal(await prefillNotice.getAttribute("role"), "status", "calculator handoff notice role");
  assert((await prefillNotice.locator(".calculator-prefill-notice-text").textContent())?.trim(), "calculator handoff notice copy is empty");
  const dismissPrefillNotice = prefillNotice.locator(".calculator-prefill-notice-dismiss");
  assert.equal(await dismissPrefillNotice.isVisible(), true, "calculator handoff notice dismiss control is hidden");
  await dismissPrefillNotice.click();
  assert.equal(await page.locator(".calculator-prefill-notice").count(), 0, "calculator handoff notice did not close");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("jabbarCalcResult")), null, "calculator handoff was not consumed");

  await context.close();

  const mobileContext = await browserType.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await blockAnalytics(mobileContext);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
  for (const [field, value] of [["length", "30"], ["width", "40"], ["height", "40"], ["qty", "100"]]) {
    await mobilePage.locator(`#${field}`).fill(value);
  }
  const scrollBefore = await mobilePage.evaluate(() => window.scrollY);
  await mobilePage.locator("#cbm-calculator button[type=submit]").click();
  await mobilePage.waitForTimeout(650);
  const mobileResult = await mobilePage.evaluate(() => ({
    scrollY: window.scrollY,
    resultTop: document.querySelector(".calculator-results").getBoundingClientRect().top,
    navBottom: document.querySelector(".site-nav").getBoundingClientRect().bottom
  }));
  assert(mobileResult.scrollY > scrollBefore + 40, `mobile calculator did not scroll to results: ${scrollBefore} -> ${mobileResult.scrollY}`);
  assert(mobileResult.resultTop >= mobileResult.navBottom - 2 && mobileResult.resultTop < 180, `mobile calculator result is not aligned below navigation: ${JSON.stringify(mobileResult)}`);
  await mobileContext.close();
}

const chromiumBrowser = await chromium.launch({ headless: true });
await homeMatrix(chromiumBrowser);
await calculatorMatrix(chromiumBrowser);
await inquiryMatrix(chromiumBrowser);
await mobileHeaderMatrix(chromiumBrowser);
await interactionChecks(chromiumBrowser);
await accessibilityFallbackChecks(chromiumBrowser);
await rtlMotionCheck(chromiumBrowser);
await shipmentGuardChecks(chromiumBrowser);
await calculatorAnalyticsChecks(chromiumBrowser);
await footerToolsChecks(chromiumBrowser);
await chromiumBrowser.close();

const webkitBrowser = await webkit.launch({ headless: true });
const webkitContext = await webkitBrowser.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await blockAnalytics(webkitContext);
const webkitPage = await webkitContext.newPage();
const webkitErrors = collectErrors(webkitPage);
for (const item of HOME_PAGES.filter(({ locale }) => ["zh", "en", "ar"].includes(locale))) {
  await webkitPage.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
  await waitForHomeVisualSignature(webkitPage);
  const state = await pageState(webkitPage);
  assertShared(state, `WebKit ${item.locale}`);
  assertHeaderNavigation(state, `WebKit ${item.locale}`);
  assertNoFloatingControls(state, `WebKit ${item.locale}`);
  assertMobileMenuTrimmed(state, `WebKit ${item.locale}`);
  assertPageTelegram(state, `WebKit ${item.locale}`);
  assertHomeVisualSignature(state, `WebKit ${item.locale}`, item.locale);
  assertHeroCta(state, `WebKit ${item.locale}`);
  await assertCompanyProofLayout(webkitPage, `WebKit ${item.locale}`, true);
  await assertJointBrandParity(webkitPage, `WebKit ${item.locale}`);
  await assertFooterJoin(webkitPage, `WebKit ${item.locale}`);
  await assertMobileGalleryScroll(webkitPage, `WebKit ${item.locale}`);
  assert.equal(state.counts.faqTags, 7, `WebKit ${item.locale}: FAQ tags`);
  await assertFaqDefaultClosed(webkitPage, `WebKit ${item.locale}`);
  assert.equal(state.counts.socialFilters, 4, `WebKit ${item.locale}: social platform filters`);
  await assertSocialPlatformFilters(webkitPage, `WebKit ${item.locale}`);
  assert.equal(state.counts.countries, 0, `WebKit ${item.locale}: removed country strip returned`);
  if (item.locale === "zh") {
    await webkitPage.evaluate(() => document.querySelector('a[href="#social-accounts"]')?.click());
    await webkitPage.waitForFunction(() => location.hash === "#social-accounts");
    const targetVisible = await webkitPage.locator("#social-accounts").evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity) >= 0.99 && box.width > 0 && box.height > 0;
    });
    assert.equal(targetVisible, true, "WebKit social hash target became blank or hidden");
  }
}
await webkitPage.goto(`${BASE_URL}/calculator/`, { waitUntil: "domcontentloaded" });
for (const [field, value] of [["length", "30"], ["width", "40"], ["height", "40"], ["qty", "1350"]]) {
  await webkitPage.locator(`#${field}`).fill(value);
}
await webkitPage.locator("#cbm-calculator button[type=submit]").click();
await webkitPage.waitForFunction(() => document.querySelectorAll("[data-container] .num-mono").length > 0
  && document.querySelectorAll("[data-summary] .num-mono").length > 0);
const webkitCalculatorState = await pageState(webkitPage);
assertShared(webkitCalculatorState, "WebKit zh calculator 390x844");
assertHeaderNavigation(webkitCalculatorState, "WebKit zh calculator 390x844");
assertNoFloatingControls(webkitCalculatorState, "WebKit zh calculator 390x844");
assertMobileMenuTrimmed(webkitCalculatorState, "WebKit zh calculator 390x844");
assertCalculatorVisualSignature(webkitCalculatorState, "WebKit zh calculator 390x844", "zh", "ready");
assert((await webkitPage.locator("[data-container] .num-mono").count()) >= 1, "WebKit calculator container number is not wrapped");
assert((await webkitPage.locator("[data-summary] .num-mono").count()) >= 2, "WebKit calculator summary numbers are not wrapped");
await webkitPage.screenshot({ path: `${OUTPUT_DIR}/calculator-blueprint-webkit-390x844.png`, fullPage: true });
assert.equal(webkitErrors.length, 0, `WebKit console errors: ${webkitErrors.join(" | ")}`);
await webkitContext.close();
await webkitBrowser.close();

console.log(`UI enhancement browser QA passed: ${HOME_PAGES.length} homepages, ${CALCULATOR_PAGES.length} calculators, ${INQUIRY_PAGES.length} inquiry pages, Chromium/WebKit, RTL, reduced motion, no-JS and screenshots at ${OUTPUT_DIR}.`);
