#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUTPUT_DIR = process.env.QA_UI_OUTPUT_DIR || "/tmp/jabbar-ui-enhancements-qa";
const CSS_VERSION = "apple-169";
const UI_VERSION = "ui-20260718f";
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
  zh: ["团队", "图库", "服务", "流程", "关于我们", "客户评价", "常见问题", "社交账号"],
  en: ["Team", "Gallery", "Services", "Process", "About Us", "Reviews", "FAQ", "Social"],
  es: ["Equipo", "Galería", "Servicios", "Proceso", "Sobre nosotros", "Reseñas", "Preguntas frecuentes", "Redes sociales"],
  ar: ["الفريق", "المعرض", "الخدمات", "خطوات العمل", "من نحن", "آراء العملاء", "الأسئلة الشائعة", "التواصل الاجتماعي"],
  fr: ["Équipe", "Galerie", "Services", "Processus", "À propos", "Avis clients", "FAQ", "Réseaux sociaux"],
  pt: ["Equipe", "Galeria", "Serviços", "Processo", "Sobre nós", "Avaliações", "Perguntas frequentes", "Redes sociais"],
  ru: ["Команда", "Галерея", "Услуги", "Процесс", "О нас", "Отзывы", "Частые вопросы", "Соцсети"],
  de: ["Team", "Galerie", "Leistungen", "Ablauf", "Über uns", "Bewertungen", "FAQ", "Soziale Medien"],
  it: ["Team", "Galleria", "Servizi", "Processo", "Chi siamo", "Recensioni", "Domande frequenti", "Social"],
  tr: ["Ekip", "Galeri", "Hizmetler", "Süreç", "Hakkımızda", "Yorumlar", "SSS", "Sosyal medya"]
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
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
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
    const styleSnapshot = (selector, pseudo = null) => {
      const element = document.querySelector(selector);
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
    const fontFamily = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).fontFamily : "";
    };
    const toolPill = document.querySelector(".site-nav-tool-pill");
    const quoteLink = document.querySelector(".site-nav-quote");
    const calculatorPage = document.querySelector(".calculator-page");
    const blueprint = calculatorPage ? getComputedStyle(calculatorPage) : null;
    const cap = document.querySelector("#cbmCap");
    const fill = document.querySelector("#cbmFill");
    return {
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      direction: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
      cssVersion: document.querySelector('link[href*="styles.min.css"]')?.getAttribute("href") || "",
      uiVersion: document.querySelector('script[src*="site-enhancements.js"]')?.getAttribute("src") || "",
      aiVersion: document.querySelector('script[src*="ai-sourcing-assistant.js"]')?.getAttribute("src") || "",
      counts: {
        faqTags: document.querySelectorAll(".faq-quick-tag").length,
        faqItems: document.querySelectorAll(".faq-item").length,
        countries: document.querySelectorAll(".service-country-item").length,
        metrics: document.querySelectorAll(".company-metric-card strong").length,
        progress: document.querySelectorAll(".site-scroll-progress").length,
        cbm: document.querySelectorAll(".cbm-visual").length,
        floatingContacts: document.querySelectorAll(".contact-speed-dial, .contact-speed-dial-option, .contact-speed-dial-main").length,
        conversionBars: document.querySelectorAll(".mobile-conversion-bar").length,
        qrCards: document.querySelectorAll(".whatsapp-qr-card").length,
        toolPills: document.querySelectorAll(".site-nav-tool-pill").length,
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
        companyIdentityBlocks: document.querySelectorAll(".company-identity").length,
        socialFilters: document.querySelectorAll(".social-platform-filter").length,
        calculatorModeTabs: document.querySelectorAll(".calculator-mode-tab").length
      },
      sectionCodes: Array.from(document.querySelectorAll(".section-code"), (element) => normalizeText(element.textContent)),
      sectionCodeDirections: Array.from(document.querySelectorAll(".section-code"), (element) => getComputedStyle(element).direction),
      header: {
        toolBeforeQuote: Boolean(toolPill && quoteLink && (toolPill.compareDocumentPosition(quoteLink) & Node.DOCUMENT_POSITION_FOLLOWING)),
        toolText: normalizeText(toolPill?.textContent),
        quoteText: normalizeText(quoteLink?.textContent),
        tool: styleSnapshot(".site-nav-tool-pill"),
        toolBefore: styleSnapshot(".site-nav-tool-pill", "::before"),
        quote: styleSnapshot(".site-nav-quote"),
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
        locationHref: document.querySelector(".site-footer-location-link")?.href || "",
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
        toolPill: rect(".site-nav-tool-pill"),
        quoteLink: rect(".site-nav-quote"),
        desktopTeamLink: rect(".site-nav-links .site-nav-team"),
        legacyToggle: rect(".jabbar-ai-toggle"),
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
  await page.waitForFunction(() => {
    const ticker = document.querySelector(".shipment-ticker");
    return ticker?.classList.contains("is-ready") || ticker?.classList.contains("is-unavailable");
  });
}

function isMonoFamily(value) {
  return /ui-monospace|SF Mono|Cascadia Mono|Consolas|monospace/i.test(value);
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
  assert.equal(state.counts.reviewNumbers, 3, `${scope}: monospaced review amount count`);
  assert(isMonoFamily(state.fonts.numeric), `${scope}: numeric font is not monospaced: ${state.fonts.numeric}`);
  assert(isMonoFamily(state.fonts.review), `${scope}: review amount is not monospaced: ${state.fonts.review}`);
  assert(isMonoFamily(state.fonts.phone), `${scope}: footer phone is not monospaced: ${state.fonts.phone}`);
  assert(isMonoFamily(state.fonts.stamp), `${scope}: trust stamp is not monospaced: ${state.fonts.stamp}`);
  assert(isMonoFamily(state.fonts.shipment), `${scope}: shipment row is not monospaced: ${state.fonts.shipment}`);
  assert(!isMonoFamily(state.fonts.body), `${scope}: body copy inherited the monospaced font: ${state.fonts.body}`);
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

function assertHeaderNavigation(state, scope, { desktop = false } = {}) {
  assert.equal(state.counts.toolPills, 1, `${scope}: tool pill count`);
  assert.equal(state.counts.quoteLinks, 1, `${scope}: quote link count`);
  assert(state.header.toolBeforeQuote, `${scope}: tool pill must precede quote link in the DOM`);
  assert(state.header.toolText, `${scope}: tool pill has no localized label`);
  assert(state.header.quoteText, `${scope}: quote link has no localized label`);
  assertVisibleRect(state.rects.toolPill, `${scope}: tool pill`);
  assertVisibleRect(state.rects.quoteLink, `${scope}: quote link`);
  assert(state.rects.toolPill.left >= -1 && state.rects.toolPill.right <= state.width + 1, `${scope}: tool pill is outside the viewport`);
  assert(state.rects.quoteLink.left >= -1 && state.rects.quoteLink.right <= state.width + 1, `${scope}: quote link is outside the viewport`);
  assert(Number(state.header.tool.order) < Number(state.header.quote.order), `${scope}: tool pill visual order ${state.header.tool.order} is not before quote ${state.header.quote.order}`);
  assert(state.header.toolBefore, `${scope}: tool pill container visual missing`);
  assert(!["none", "normal", ""].includes(state.header.toolBefore.content), `${scope}: tool pill ::before has no content box`);
  assert(state.header.toolBefore.width >= 18, `${scope}: tool pill container width ${state.header.toolBefore.width}`);
  assert(state.header.toolBefore.height >= 12, `${scope}: tool pill container height ${state.header.toolBefore.height}`);
  assert(state.header.toolBefore.borderLeftWidth >= 1, `${scope}: tool pill container border missing`);
  assert.notEqual(state.header.toolBefore.backgroundImage, "none", `${scope}: tool pill container ribs/background missing`);

  if (desktop) {
    assert.equal(state.counts.desktopTeamLinks, 1, `${scope}: desktop Jabbar Team link count`);
    assertVisibleRect(state.rects.desktopTeamLink, `${scope}: desktop Jabbar Team link`);
    assert.equal(state.header.desktopTeam.backgroundImage, "none", `${scope}: desktop Jabbar Team link still has a background image`);
    assert(isTransparent(state.header.desktopTeam.backgroundColor), `${scope}: desktop Jabbar Team link background ${state.header.desktopTeam.backgroundColor}`);
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      assert.equal(state.header.desktopTeam[`border${side}Width`], 1, `${scope}: desktop Jabbar Team link ${side.toLowerCase()} border`);
    }
    assert.equal(state.header.desktopTeam.boxShadow, "none", `${scope}: desktop Jabbar Team link still has a shadow`);
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
  assert.equal(state.aiVersion, "", `${scope}: hidden AI bootstrap still loads by default`);
  if (state.rects.legacyToggle) {
    assert.equal(state.rects.legacyToggle.display, "none", `${scope}: legacy AI launcher visible`);
  }
}

function assertMobileMenuTrimmed(state, scope, { teamLinks = 0 } = {}) {
  assert.equal(state.mobileMenu.calculatorLinks, 0, `${scope}: calculator link remains in mobile menu`);
  assert.equal(state.mobileMenu.teamLinks, teamLinks, `${scope}: mobile team-member link count`);
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

  const locationUrl = new URL(state.footer.locationHref);
  assert.equal(locationUrl.origin, "https://uri.amap.com", `${scope}: footer location is not using AMap URI API`);
  assert.equal(locationUrl.pathname, "/search", `${scope}: invalid AMap search path`);
  assert(locationUrl.searchParams.get("keyword")?.includes("苏福路219号3号楼"), `${scope}: AMap keyword missing full address`);
  assert.equal(locationUrl.searchParams.get("city"), "义乌", `${scope}: AMap city parameter`);
  assert.equal(locationUrl.searchParams.get("view"), "map", `${scope}: AMap view parameter`);
  assert.equal(locationUrl.searchParams.get("src"), "jabbarsourcing.com", `${scope}: AMap source parameter`);
  assert.equal(locationUrl.searchParams.get("callnative"), "1", `${scope}: AMap native-app parameter`);

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
    items: Array.from(document.querySelectorAll(".faq-item"), (item) => item.open),
    tags: Array.from(document.querySelectorAll(".faq-quick-tag"), (tag) => ({
      expanded: tag.getAttribute("aria-expanded"),
      active: tag.classList.contains("is-active")
    }))
  }));
  assert.equal(state.promptCount, 1, `${scope}: FAQ topic prompt count`);
  assert.equal(state.items.length, 7, `${scope}: FAQ item count`);
  assert(state.items.every((open) => !open), `${scope}: FAQ must start fully closed`);
  assert.equal(state.tags.length, state.items.length, `${scope}: FAQ tag/item count mismatch`);
  assert(state.tags.every((tag) => tag.expanded === "false" && !tag.active), `${scope}: FAQ tag starts selected`);
}

async function assertSocialPlatformFilters(page, scope) {
  const initial = await page.locator(".social-platform-group").evaluateAll((groups) => groups.map((group) => {
    const cards = Array.from(group.querySelectorAll(":scope > .team-grid > .team-card"));
    return {
      platform: group.dataset.socialPlatform || "",
      hidden: group.hidden || getComputedStyle(group).display === "none",
      totalCards: cards.length,
      visibleCards: cards.filter((card) => !card.hidden && getComputedStyle(card).display !== "none").length,
      collapsedCards: cards.filter((card) => card.classList.contains("is-social-card-collapsed")).length,
      disclosureButtons: group.querySelectorAll(":scope > .social-platform-toggle").length
    };
  }));
  const groupCount = initial.length;
  const filters = page.locator(".social-platform-filter");
  const filterState = await filters.evaluateAll((buttons) => buttons.map((button) => ({
    platform: button.dataset.socialFilter || "",
    pressed: button.getAttribute("aria-pressed"),
    active: button.classList.contains("is-active")
  })));
  assert.equal(groupCount, 4, `${scope}: social platform group count`);
  assert.equal(filterState.length, groupCount, `${scope}: platform filters must contain four categories and no all button`);
  assert(!filterState.some((filter) => filter.platform === "all"), `${scope}: deprecated all-platform filter remains`);
  assert.deepEqual(filterState.map((filter) => filter.platform).sort(), initial.map((group) => group.platform).sort(), `${scope}: filter/platform keys mismatch`);
  assert(filterState.every((filter) => filter.pressed === "false" && !filter.active), `${scope}: a platform filter starts selected`);
  initial.forEach((group, index) => {
    assert(group.platform, `${scope}: social group ${index + 1} lacks a platform key`);
    assert.equal(group.hidden, false, `${scope}: social group ${index + 1} starts hidden`);
    assert(group.totalCards > 0, `${scope}: social group ${index + 1} has no accounts`);
    assert.equal(group.visibleCards, group.totalCards, `${scope}: social group ${index + 1} does not show every account by default`);
    assert.equal(group.collapsedCards, 0, `${scope}: social group ${index + 1} retains collapsed account classes`);
    assert.equal(group.disclosureButtons, 0, `${scope}: social group ${index + 1} retains a view-all disclosure`);
  });

  const selectedFilter = filters.first();
  const selectedPlatform = await selectedFilter.getAttribute("data-social-filter");
  await selectedFilter.click();
  assert.equal(await page.locator(".social-platform-group[hidden]").count(), groupCount - 1, `${scope}: platform filter hidden group count`);
  assert.equal(await selectedFilter.getAttribute("aria-pressed"), "true", `${scope}: selected platform filter state`);
  assert.equal(await page.locator(".social-platform-filter.is-active").count(), 1, `${scope}: active platform filter count`);
  const visiblePlatforms = await page.locator(".social-platform-group:not([hidden])").evaluateAll((groups) => groups.map((group) => group.dataset.socialPlatform));
  assert.deepEqual(visiblePlatforms, [selectedPlatform], `${scope}: selected platform did not isolate its account group`);
  const filterEvent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === "social_platform_filter")
    .at(-1));
  assert.equal(filterEvent?.[2]?.platform, selectedPlatform, `${scope}: selected platform analytics missing`);

  await selectedFilter.click();
  assert.equal(await page.locator(".social-platform-group[hidden]").count(), 0, `${scope}: clicking the active category did not restore all groups`);
  assert.equal(await page.locator(".social-platform-filter.is-active").count(), 0, `${scope}: active category remained highlighted after reset`);
  const resetPressed = await filters.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")));
  assert(resetPressed.every((pressed) => pressed === "false"), `${scope}: category reset left an aria-pressed filter`);
  const resetEvent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === "social_platform_filter")
    .at(-1));
  assert.equal(resetEvent?.[2]?.platform, "all", `${scope}: all-platform reset analytics missing`);

  await page.locator(".team-card[href]").first().evaluate((card) => {
    card.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await page.locator(".team-card[href]").first().click();
  const profileEvent = await page.evaluate(() => (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === "event" && entry[1] === "social_profile_click")
    .at(-1));
  assert(profileEvent && profileEvent[2]?.platform && profileEvent[2]?.position === 1, `${scope}: social profile click analytics missing`);
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
    await page.waitForFunction(({ railIndex, start }) => {
      const currentRail = document.querySelectorAll(".gallery-rail")[railIndex];
      return currentRail && currentRail.scrollLeft >= start + 1;
    }, { railIndex: index, start: autoStart }, { timeout: 2500 });
    const autoEnd = await rail.evaluate((element) => element.scrollLeft);
    assert(autoEnd >= autoStart + 1, `${scope}: rail ${index + 1} mobile auto-scroll did not advance (${autoStart} -> ${autoEnd})`);

    const state = await rail.evaluate(async (element) => {
      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const track = element.querySelector(".gallery-track");
      const originals = Array.from(track.querySelectorAll(':scope > .gallery-frame:not([data-gallery-clone="true"])'));
      const clones = Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone="true"]'));
      const loopDistance = clones[0] && originals[0] ? clones[0].offsetLeft - originals[0].offsetLeft : 0;
      const maxScroll = element.scrollWidth - element.clientWidth;
      const PointerEventCtor = window.PointerEvent || window.Event;
      element.dispatchEvent(new PointerEventCtor("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch" }));
      const manualStart = Math.min(Math.max(160, loopDistance * 0.25), Math.max(160, maxScroll - 400));
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
        clonesVisible: clones.every((frame) => getComputedStyle(frame).display !== "none"),
        clonesHiddenFromA11y: clones.every((frame) => frame.getAttribute("aria-hidden") === "true")
      };
    });

    assert(["auto", "scroll"].includes(state.overflowX), `${scope}: rail ${index + 1} overflow-x is ${state.overflowX}`);
    assert(state.scrollWidth > state.clientWidth + 120, `${scope}: rail ${index + 1} is not horizontally scrollable`);
    assert(state.loopDistance > state.clientWidth, `${scope}: rail ${index + 1} loop distance is invalid (${state.loopDistance})`);
    assert(state.movedRight >= state.manualStart + 100, `${scope}: rail ${index + 1} rejected a rightward scroll`);
    assert(state.movedLeft <= state.movedRight - 60, `${scope}: rail ${index + 1} rejected a leftward scroll`);
    assert(Math.abs(state.pausedPosition - state.movedLeft) <= 1, `${scope}: rail ${index + 1} moved while pointer-paused (${state.movedLeft} -> ${state.pausedPosition})`);
    assert.equal(state.animationName, "none", `${scope}: rail ${index + 1} still competes with touch using animation ${state.animationName}`);
    assert(["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(state.transform), `${scope}: rail ${index + 1} track remains transformed (${state.transform})`);
    assert.equal(state.mobileReady, true, `${scope}: rail ${index + 1} mobile loop was not initialized`);
    assert.equal(state.role, "region", `${scope}: rail ${index + 1} region role`);
    assert.equal(state.tabIndex, 0, `${scope}: rail ${index + 1} keyboard access`);
    assert.equal(state.cloneCount, state.originalCount, `${scope}: rail ${index + 1} loop clone count`);
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
    const clones = Array.from(track.querySelectorAll(':scope > .gallery-frame[data-gallery-clone="true"]'));
    const style = getComputedStyle(track);
    const animation = track.getAnimations()[0];
    if (animation) {
      animation.currentTime = 0;
      animation.play();
    }
    return {
      originalCount: originals.length,
      cloneCount: clones.length,
      clonesHiddenFromA11y: clones.every((frame) => frame.getAttribute("aria-hidden") === "true"),
      measuredDistance: clones[0] && originals[0] ? clones[0].offsetLeft - originals[0].offsetLeft : 0,
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

  await page.waitForTimeout(220);
  const movement = await page.locator(".sourcing-gallery .gallery-track").evaluateAll((tracks) => tracks.map((track) => {
    const transform = getComputedStyle(track).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
  }));

  assert.equal(geometry.length, 2, `${scope}: desktop gallery track count`);
  geometry.forEach((track, index) => {
    assert(track.originalCount >= 2, `${scope}: track ${index + 1} needs multiple originals`);
    assert.equal(track.cloneCount, track.originalCount, `${scope}: track ${index + 1} clone count`);
    assert.equal(track.clonesHiddenFromA11y, true, `${scope}: track ${index + 1} clones remain exposed to assistive tech`);
    assert(Math.abs(track.measuredDistance - track.configuredDistance) <= 1, `${scope}: track ${index + 1} loop distance mismatch`);
    assert(track.duration >= 28000, `${scope}: track ${index + 1} loop duration is too abrupt (${track.duration}ms)`);
    assert.equal(track.animationName, "galleryMarquee", `${scope}: track ${index + 1} animation name`);
    assert.equal(track.timing, "linear", `${scope}: track ${index + 1} animation must not ease or bounce`);
    assert.equal(track.direction, "normal", `${scope}: track ${index + 1} animation must not reverse to the first image`);
    assert.equal(track.iterations, "infinite", `${scope}: track ${index + 1} animation iteration`);
    assert.equal(track.playState, "running", `${scope}: track ${index + 1} animation did not start`);
    assert(Math.abs(track.railScrollLeft) <= 1, `${scope}: track ${index + 1} desktop scroll snapping moved the rail (${track.railScrollLeft}px)`);
    assert(movement[index] < -4, `${scope}: track ${index + 1} did not move continuously (${movement[index]}px)`);
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
    const story = document.querySelector(".company-about .company-story");
    const identity = story?.querySelector(":scope > .company-identity");
    const identityLines = identity ? [
      identity.querySelector(":scope > .company-identity-title"),
      ...identity.querySelectorAll(":scope > .company-identity-legal > span")
    ] : [];
    return {
      photo: rect(photo),
      metrics: rect(metrics),
      cards: cards.map((card) => ({ rect: rect(card), textAlign: getComputedStyle(card).textAlign })),
      labelFonts: labels.map((label) => Number.parseFloat(getComputedStyle(label).fontSize)),
      labelAlignments: labels.map((label) => getComputedStyle(label).textAlign),
      story: rect(story),
      identity: rect(identity),
      identityTextAlign: identity ? getComputedStyle(identity).textAlign : "",
      identityBlocksOnPage: document.querySelectorAll(".company-identity").length,
      identityLines: identityLines.map((line) => ({
        text: line?.textContent.replace(/\s+/g, " ").trim() || "",
        rect: rect(line),
        display: line ? getComputedStyle(line).display : "none",
        fontSize: line ? Number.parseFloat(getComputedStyle(line).fontSize) : 0
      }))
    };
  });

  assert(Math.abs(state.photo.left - state.metrics.left) <= 2, `${scope}: company photo and metrics left edges differ`);
  assert(Math.abs(state.photo.width - state.metrics.width) <= 2, `${scope}: company photo and metrics widths differ`);
  assert(state.photo.bottom < state.metrics.top, `${scope}: company photo does not sit above metrics`);
  assert.equal(state.cards.length, 5, `${scope}: company metric card count`);
  assert(state.cards.every((card) => card.textAlign === "center"), `${scope}: company metric card text is not centered`);
  assert(state.labelAlignments.every((value) => value === "center"), `${scope}: company metric labels are not centered`);
  assert(state.labelFonts.every((value) => value >= 14.5), `${scope}: company metric label is too small (${state.labelFonts.join(", ")})`);
  assert.equal(state.identityBlocksOnPage, 1, `${scope}: company identity block count`);
  assert(state.story && state.identity, `${scope}: company identity is not inside the About card`);
  assert.equal(state.identityLines.length, 3, `${scope}: company identity must contain exactly three structural lines`);
  state.identityLines.forEach((line, index) => {
    assert(line.text, `${scope}: company identity line ${index + 1} is empty`);
    assert(line.rect && line.rect.width > 0 && line.rect.height > 0, `${scope}: company identity line ${index + 1} is not visible`);
    assert.notEqual(line.display, "none", `${scope}: company identity line ${index + 1} is hidden`);
    assert(line.fontSize >= 13, `${scope}: company identity line ${index + 1} is too small (${line.fontSize}px)`);
    assert(line.rect.left >= state.story.left - 1 && line.rect.right <= state.story.right + 1, `${scope}: company identity line ${index + 1} escapes the About card`);
  });
  assert.equal(state.identityTextAlign, "center", `${scope}: company identity is not centered`);
  assert(state.identity.top >= state.story.top && state.identity.bottom <= state.story.bottom + 1, `${scope}: company identity block escapes the About card`);
  assert(state.identityLines[0].rect.top <= state.identityLines[1].rect.top, `${scope}: company identity title order`);
  assert(state.identityLines[1].rect.top <= state.identityLines[2].rect.top, `${scope}: company identity legal-line order`);

  if (mobile) {
    assert(Math.abs(state.cards[0].rect.top - state.cards[1].rect.top) <= 2, `${scope}: first mobile metric row is misaligned`);
    assert(Math.abs(state.cards[4].rect.width - state.metrics.width) <= 2, `${scope}: final mobile metric does not span the row`);
  } else {
    const firstTop = state.cards[0].rect.top;
    assert(state.cards.every((card) => Math.abs(card.rect.top - firstTop) <= 2), `${scope}: desktop metric cards are not aligned in one row`);
  }
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
    return {
      gap: socialRect && footerRect ? footerRect.top - socialRect.bottom : null,
      teamPaddingBottom: team ? Number.parseFloat(getComputedStyle(team).paddingBottom) : null,
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
  assert(state.teamPaddingBottom >= 12 && state.teamPaddingBottom <= 40, `${scope}: unexpected footer breathing room ${state.teamPaddingBottom}px`);
  assert(Math.abs(state.gap - state.teamPaddingBottom) <= 1, `${scope}: footer gap ${state.gap}px does not match team padding ${state.teamPaddingBottom}px`);
  assert.equal(state.socialMarginBottom, 0, `${scope}: social bottom margin reintroduced a footer seam`);
  assert.equal(state.footerMarginTop, 0, `${scope}: footer top margin reintroduced a seam`);
  assert.equal(state.gmail?.text, "qianjiabao1999@gmail.com", `${scope}: footer Gmail text changed`);
  assert.equal(state.gmail.whiteSpace, "nowrap", `${scope}: Gmail is allowed to split inside the address`);
  assert.notEqual(state.gmail.overflow, "hidden", `${scope}: Gmail remains clipped`);
  assert.notEqual(state.gmail.textOverflow, "ellipsis", `${scope}: Gmail remains ellipsized`);
  assert(state.gmail.scrollWidth <= state.gmail.clientWidth + 1, `${scope}: Gmail still overflows (${state.gmail.scrollWidth}/${state.gmail.clientWidth})`);
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
      assertHeaderNavigation(state, scope, { desktop: !viewport.mobile });
      assertNoFloatingControls(state, scope);
      assertMobileMenuTrimmed(state, scope);
      assertPageTelegram(state, scope);
      assertHomeVisualSignature(state, scope, item.locale);
      assertHeroCta(state, scope);
      if (!viewport.mobile) await assertDesktopGalleryMarquee(page, scope);
      await assertCompanyProofLayout(page, scope, viewport.mobile);
      await assertFooterJoin(page, scope);
      assert.equal(state.counts.faqTags, 7, `${scope}: FAQ tag count`);
      assert.equal(state.counts.faqItems, 7, `${scope}: FAQ item count`);
      await assertFaqDefaultClosed(page, scope);
      assert.equal(state.counts.countries, 0, `${scope}: removed country strip returned`);
      assert.equal(state.counts.metrics, 5, `${scope}: current five company metrics must remain`);
      assert.equal(state.counts.jointBrandLockups, 1, `${scope}: joint brand lockup count`);
      assert.equal(state.counts.companyIdentityBlocks, 1, `${scope}: company identity block count`);
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
      if (viewport.mobile) {
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
    assert.equal(state.aiVersion, "", `${scope}: hidden AI bootstrap still loads by default`);
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
    { qty: 5, pct: "7%", cap: "40英尺高柜 · 5.0 / 68 立方米", fill: "rgb(93, 202, 165)", over: false, width: "20" },
    { qty: 40, pct: "59%", cap: "40英尺高柜 · 40.0 / 68 立方米", fill: "rgb(93, 202, 165)", over: false, width: "162" },
    { qty: 70, pct: "103%", cap: "40英尺高柜 · 70.0 / 68 立方米 ×2", fill: "rgb(239, 159, 39)", over: true, width: "276" },
    { qty: 90, pct: "132%", cap: "40英尺高柜 · 90.0 / 68 立方米 ×2", fill: "rgb(239, 159, 39)", over: true, width: "276" }
  ];
  for (const testCase of cases) {
    await page.locator("#qty").fill(String(testCase.qty));
    await page.locator("#qty").dispatchEvent("input");
    await page.waitForFunction((expected) => document.querySelector("#cbmCap")?.textContent === expected, testCase.cap);
    assert.equal(await page.locator(".calculator-results").getAttribute("data-result-state"), "ready", `${testCase.qty} CBM result state`);
    assert.equal(await page.locator("[data-result-detail][hidden]").count(), 0, `${testCase.qty} CBM result details remain hidden`);
    assert.equal(await page.locator("[data-result-status]").isHidden(), true, `${testCase.qty} CBM empty-state status remains visible`);
    assert.equal(await page.locator("[data-copy-result]").isDisabled(), false, `${testCase.qty} CBM copy result remains disabled`);
    assert.equal(await page.locator("#cbmPct").textContent(), testCase.pct, `${testCase.qty} CBM percentage`);
    assert.equal(await page.locator("#cbmCap").textContent(), testCase.cap, `${testCase.qty} CBM capacity`);
    assert.equal(await page.locator("#cbmFill").evaluate((element) => getComputedStyle(element).fill), testCase.fill, `${testCase.qty} CBM fill color`);
    assert.equal(await page.locator("#cbmFill").evaluate((element) => element.classList.contains("is-over")), testCase.over, `${testCase.qty} CBM overload class`);
    assert.equal(await page.locator("#cbmFill").getAttribute("width"), testCase.width, `${testCase.qty} CBM fill width`);
    const accessibleTitle = await page.locator("#cbmVizTitle").textContent();
    assert(accessibleTitle.includes(testCase.pct) && accessibleTitle.includes(testCase.cap), `${testCase.qty} CBM accessible title is stale: ${accessibleTitle}`);
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
    assertMobileMenuTrimmed(state, scope, { teamLinks: 1 });
    assertPageTelegram(state, scope);
    assertDesktopFooter(state, scope, { contacts: true });
    assert.equal(state.counts.progress, 0, `${scope}: short inquiry page must not have progress bar`);
    assert.equal(state.counts.qrCards, 1, `${scope}: desktop QR enhancement missing`);
    assert.equal(state.rects.conversionBar, null, `${scope}: inquiry must not have mobile conversion bar`);
    assert.equal(await page.locator(".site-nav-return-home").count(), 1, `${scope}: top return-home control count`);
    assert.equal(await page.locator(".site-nav-return-home").getAttribute("href"), "../", `${scope}: top return-home target`);
    assert.equal(await page.locator(".site-nav-mobile-home").count(), 0, `${scope}: duplicate return-home mobile item remains`);
    assert.equal(await page.locator(".site-nav-mobile-team").count(), 1, `${scope}: mobile team-member item missing`);
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
  assert.equal(HEADER_PAGES.length, 30, "mobile header matrix must cover all 30 localized pages");
  const context = await browserType.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await blockAnalytics(context);
  const page = await context.newPage();
  const errors = collectErrors(page);
  for (const item of HEADER_PAGES) {
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.locator(".site-nav-tool-pill").waitFor({ state: "visible" });
    const scope = `${item.locale} ${item.type} header 390x844`;
    const state = await pageState(page);
    assertShared(state, scope);
    assertHeaderNavigation(state, scope);
    assertNoFloatingControls(state, scope);
    assertMobileMenuTrimmed(state, scope, { teamLinks: item.type === "inquiry" ? 1 : 0 });
    assert.equal(errors.length, 0, `${scope}: console errors ${errors.splice(0).join(" | ")}`);
  }
  await context.close();
}

async function interactionChecks(browserType) {
  const desktop = await browserType.newContext({ viewport: { width: 1280, height: 900 } });
  await blockAnalytics(desktop);
  await mockValidShipments(desktop);
  const page = await desktop.newPage();
  const errors = collectErrors(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".contact-speed-dial, .mobile-conversion-bar").count(), 0, "removed floating controls still exist on desktop");
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

  await page.locator(".shipment-ticker").scrollIntoViewIfNeeded();
  await page.waitForFunction((count) => document.querySelectorAll(".shipment-ticker-item").length === count, VALID_SHIPMENTS.length * 2);
  const shipmentFirst = await page.locator(".shipment-ticker-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await page.waitForTimeout(180);
  const shipmentSecond = await page.locator(".shipment-ticker-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  assert(shipmentSecond < shipmentFirst, `LTR shipment ticker direction is wrong: ${shipmentFirst} -> ${shipmentSecond}`);
  await page.locator(".shipment-ticker-rail").hover();
  await page.waitForTimeout(80);
  assert.equal(await page.locator(".shipment-ticker").evaluate((element) => element.classList.contains("is-paused")), true, "shipment ticker did not enter paused state");
  const shipmentPausedStart = await page.locator(".shipment-ticker-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await page.waitForTimeout(180);
  const shipmentPausedEnd = await page.locator(".shipment-ticker-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  assert(Math.abs(shipmentPausedEnd - shipmentPausedStart) < 0.25, `shipment ticker did not pause: ${shipmentPausedStart} -> ${shipmentPausedEnd}`);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(30);

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

  await page.locator(".company-intro").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".company-intro")?.classList.contains("is-visible"));
  await page.waitForTimeout(1300);
  const metricVisuals = await page.locator(".company-metric-card strong .company-metric-visual").allTextContents();
  const metricAccessible = await page.locator(".company-metric-card strong .sr-only").allTextContents();
  const expectedMetrics = ["2021年", "300+", "50,000㎡", "全球 100+ 国家和地区", "5亿元人民币"];
  assert.deepEqual(metricVisuals.map((item) => item.trim()), expectedMetrics, "company metric visuals changed or did not finish counting");
  assert.deepEqual(metricAccessible.map((item) => item.trim()), expectedMetrics, "company metric accessible copy changed during animation");
  assert.equal(await page.locator(".company-metric-card strong[aria-label]").count(), 0, "company metrics still rely on aria-label");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(40);
  assert.equal(await page.locator(".shipment-ticker.is-static").count(), 1, "live reduced-motion change did not stop shipment ticker");
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
    assert.equal(open.filter(Boolean).length, 1, `FAQ tag ${index + 1}: multiple details open`);
    assert.equal(open[index], true, `FAQ tag ${index + 1}: wrong detail opened`);
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
  assert.equal(await mobilePage.locator(".contact-speed-dial, .mobile-conversion-bar").count(), 0, "removed floating controls still exist on mobile");
  await mobilePage.locator(".site-nav-mobile-menu > summary").click();
  assert.equal(await mobilePage.locator('.site-nav-mobile-panel a[href*="calculator"], .site-nav-mobile-panel a[href="./"], .site-nav-mobile-panel a[href*="#social-accounts"]').count(), 0, "removed calculator/team links remain in mobile menu");
  await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-menu-trimmed-390x844.png` });
  await mobilePage.locator(".site-nav-mobile-menu").evaluate((menu) => { menu.open = false; });

  const galleryRail = mobilePage.locator(".gallery-rail").first();
  await galleryRail.scrollIntoViewIfNeeded();
  await mobilePage.waitForFunction(() => document.querySelector(".gallery-rail .gallery-track")?.classList.contains("is-gallery-mobile-loop-ready"));
  const loopDistance = await galleryRail.evaluate((rail) => {
    const firstOriginal = rail.querySelector('.gallery-frame:not([data-gallery-clone="true"])');
    const firstClone = rail.querySelector('.gallery-frame[data-gallery-clone="true"]');
    return firstClone && firstOriginal ? firstClone.offsetLeft - firstOriginal.offsetLeft : 0;
  });
  assert(loopDistance > 600, `mobile gallery loop distance is invalid (${loopDistance}px)`);
  await galleryRail.evaluate((rail, distance) => { rail.scrollLeft = distance * 0.3; }, loopDistance);
  const galleryBox = await galleryRail.boundingBox();
  assert(galleryBox, "mobile gallery rail has no touchable bounding box");
  const touchY = galleryBox.y + Math.min(galleryBox.height / 2, 180);
  const cdp = await mobile.newCDPSession(mobilePage);
  const dispatchTouchSwipe = async (startX, endX) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: touchY, radiusX: 7, radiusY: 7, force: 1 }]
    });
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
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  const rightEdge = galleryBox.x + Math.min(galleryBox.width - 28, 340);
  const leftEdge = galleryBox.x + 48;
  const beforeLeftSwipe = await galleryRail.evaluate((rail) => rail.scrollLeft);
  await dispatchTouchSwipe(rightEdge, leftEdge);
  await mobilePage.waitForTimeout(350);
  const afterLeftSwipe = await galleryRail.evaluate((rail) => rail.scrollLeft);
  assert(afterLeftSwipe >= beforeLeftSwipe + 120, `mobile gallery ignored a real left swipe (${beforeLeftSwipe} -> ${afterLeftSwipe})`);
  await mobilePage.waitForTimeout(280);
  const leftPaused = await galleryRail.evaluate((rail) => rail.scrollLeft);
  assert(Math.abs(leftPaused - afterLeftSwipe) <= 2, `mobile gallery did not pause after touch (${afterLeftSwipe} -> ${leftPaused})`);

  await dispatchTouchSwipe(leftEdge, rightEdge);
  await mobilePage.waitForTimeout(350);
  const afterRightSwipe = await galleryRail.evaluate((rail) => rail.scrollLeft);
  assert(afterRightSwipe <= leftPaused - 120, `mobile gallery ignored a real right swipe (${leftPaused} -> ${afterRightSwipe})`);
  assert(afterRightSwipe > 80 && afterRightSwipe < loopDistance - 80, `mobile gallery test position is too close to a loop boundary (${afterRightSwipe}/${loopDistance})`);
  await mobilePage.waitForTimeout(280);
  const resumeBase = await galleryRail.evaluate((rail) => rail.scrollLeft);
  assert(Math.abs(resumeBase - afterRightSwipe) <= 2, `mobile gallery did not remain paused after the second touch (${afterRightSwipe} -> ${resumeBase})`);
  await mobilePage.waitForTimeout(2100);
  const resumedPosition = await galleryRail.evaluate((rail) => rail.scrollLeft);
  assert(resumedPosition > resumeBase + 3, `mobile gallery did not resume auto-scroll (${resumeBase} -> ${resumedPosition})`);
  assert(resumedPosition < resumeBase + 80, `mobile gallery jumped instead of resuming continuously (${resumeBase} -> ${resumedPosition})`);
  assert(resumedPosition > 80, `mobile gallery jumped back to the first image (${resumedPosition}px)`);
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
  await page.waitForFunction((count) => document.querySelectorAll(".shipment-ticker-item").length === count, VALID_SHIPMENTS.length * 2);
  await page.waitForFunction(() => document.querySelectorAll('.gallery-frame[data-gallery-clone="true"]').length > 0);
  assert.equal(await page.locator(".ui-section-reveal").count(), 0, "reduced motion still hides sections for reveal");
  assert.equal(await page.locator(".service-country-marquee, .service-country-toggle, .service-country-item").count(), 0, "removed country strip exists in reduced-motion mode");
  assert.equal(await page.locator(".shipment-ticker.is-static").count(), 1, "reduced motion shipment ticker is not static");
  assert.equal(await page.locator(".shipment-ticker-track").evaluate((element) => getComputedStyle(element).transform), "none", "reduced motion shipment ticker still transforms");
  assert.equal(await page.locator(".shipment-ticker-list").nth(1).evaluate((element) => getComputedStyle(element).display), "none", "reduced motion duplicate shipment list is visible");
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
  assert.deepEqual(metrics.map((item) => item.trim()), ["2021年", "300+", "50,000㎡", "全球 100+ 国家和地区", "5亿元人民币"], "reduced motion changed metric copy");
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
  assert.equal(await noJsPage.locator(".section-code").count(), 8, "no-JS section codes missing");
  assert.equal(await noJsPage.locator(".stamp").count(), 3, "no-JS stamps missing");
  const noJsStampOpacities = await noJsPage.locator(".stamp").evaluateAll((items) => items.map((item) => Number.parseFloat(getComputedStyle(item).opacity)));
  assert(noJsStampOpacities.every((opacity) => opacity >= 0.99), `no-JS stamps hidden: ${noJsStampOpacities.join(", ")}`);
  assert.equal(await noJsPage.locator(".company-metric-number.num-mono").count(), 5, "no-JS metric numbers missing");
  assert.equal(await noJsPage.locator(".shipment-ticker-list").count(), 1, "no-JS shipment fallback count");
  assert.equal(await noJsPage.locator(".shipment-ticker").evaluate((element) => getComputedStyle(element).display), "none", "no-JS shipment placeholder is visible");
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
  await page.locator(".shipment-ticker").scrollIntoViewIfNeeded();
  await page.waitForFunction((count) => document.querySelectorAll(".shipment-ticker-item").length === count, VALID_SHIPMENTS.length * 2);
  const shipmentFirst = await page.locator(".shipment-ticker-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await page.waitForTimeout(180);
  const shipmentSecond = await page.locator(".shipment-ticker-track").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  assert(shipmentSecond > shipmentFirst, `RTL shipment ticker must run in the opposite direction: ${shipmentFirst} -> ${shipmentSecond}`);
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
  assert.equal(await page.locator(".contact-speed-dial, .mobile-conversion-bar").count(), 0, "removed floating controls remain on calculator");

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
