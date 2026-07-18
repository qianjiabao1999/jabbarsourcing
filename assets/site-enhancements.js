(function () {
  "use strict";

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: {
      scan: "手机扫码直聊", reply: "在线 · 24 小时内回复",
      shipments: "最近发运", cbmTitle: "集装箱装载示意", quoteWithResult: "用此结果获取报价",
      showAllAccounts: "查看全部账号", showFewerAccounts: "收起账号",
      calculatorModes: "选择计算方式", quickMode: "快速计算", excelMode: "Excel 订单分析",
      allPlatforms: "全部平台", socialFilter: "按平台筛选账号",
      faq: ["佣金", "起订量", "验货", "付款", "报价时效", "拼柜", "代发"]
    },
    en: {
      scan: "Scan to chat", reply: "Online · replies within 24h",
      shipments: "Recent shipments", cbmTitle: "Container loading illustration", quoteWithResult: "Get a quote with this result",
      showAllAccounts: "View all accounts", showFewerAccounts: "Show fewer accounts",
      calculatorModes: "Choose calculation mode", quickMode: "Quick calculation", excelMode: "Excel order analysis",
      allPlatforms: "All platforms", socialFilter: "Filter accounts by platform",
      faq: ["Commission", "MOQ", "Inspection", "Payment", "Quote time", "Consolidation", "Dropshipping"]
    },
    es: {
      scan: "Escanea para chatear", reply: "En línea · respuesta en 24 h",
      shipments: "Envíos recientes", cbmTitle: "Ilustración de carga del contenedor", quoteWithResult: "Solicitar cotización con este resultado",
      showAllAccounts: "Ver todas las cuentas", showFewerAccounts: "Mostrar menos cuentas",
      calculatorModes: "Elegir modo de cálculo", quickMode: "Cálculo rápido", excelMode: "Análisis de Excel",
      allPlatforms: "Todas las plataformas", socialFilter: "Filtrar cuentas por plataforma",
      faq: ["Comisión", "Pedido mínimo", "Inspección", "Pago", "Plazo de cotización", "Consolidación", "Envío directo"]
    },
    ar: {
      scan: "امسح للدردشة", reply: "متصل · نرد خلال 24 ساعة",
      shipments: "الشحنات الأخيرة", cbmTitle: "رسم توضيحي لتحميل الحاوية", quoteWithResult: "اطلب عرض سعر بهذه النتيجة",
      showAllAccounts: "عرض كل الحسابات", showFewerAccounts: "عرض حسابات أقل",
      calculatorModes: "اختر طريقة الحساب", quickMode: "حساب سريع", excelMode: "تحليل طلبات Excel",
      allPlatforms: "جميع المنصات", socialFilter: "تصفية الحسابات حسب المنصة",
      faq: ["العمولة", "الحد الأدنى", "الفحص", "الدفع", "مدة عرض السعر", "الشحن المجمع", "الشحن المباشر"]
    },
    fr: {
      scan: "Scannez pour discuter", reply: "En ligne · réponse sous 24 h",
      shipments: "Expéditions récentes", cbmTitle: "Illustration du chargement du conteneur", quoteWithResult: "Demander un devis avec ce résultat",
      showAllAccounts: "Voir tous les comptes", showFewerAccounts: "Afficher moins de comptes",
      calculatorModes: "Choisir le mode de calcul", quickMode: "Calcul rapide", excelMode: "Analyse Excel",
      allPlatforms: "Toutes les plateformes", socialFilter: "Filtrer les comptes par plateforme",
      faq: ["Commission", "MOQ", "Inspection", "Paiement", "Délai de devis", "Groupage", "Livraison directe"]
    },
    pt: {
      scan: "Escaneie para conversar", reply: "Online · resposta em até 24 h",
      shipments: "Envios recentes", cbmTitle: "Ilustração do carregamento do contêiner", quoteWithResult: "Pedir cotação com este resultado",
      showAllAccounts: "Ver todas as contas", showFewerAccounts: "Mostrar menos contas",
      calculatorModes: "Escolher modo de cálculo", quickMode: "Cálculo rápido", excelMode: "Análise de Excel",
      allPlatforms: "Todas as plataformas", socialFilter: "Filtrar contas por plataforma",
      faq: ["Comissão", "Pedido mínimo", "Inspeção", "Pagamento", "Prazo da cotação", "Consolidação", "Dropshipping"]
    },
    ru: {
      scan: "Сканируйте для чата", reply: "Онлайн · ответим в течение 24 ч",
      shipments: "Последние отправки", cbmTitle: "Схема загрузки контейнера", quoteWithResult: "Запросить расчёт с этим результатом",
      showAllAccounts: "Показать все аккаунты", showFewerAccounts: "Свернуть список",
      calculatorModes: "Выбор режима расчета", quickMode: "Быстрый расчет", excelMode: "Анализ Excel",
      allPlatforms: "Все платформы", socialFilter: "Фильтр аккаунтов по платформе",
      faq: ["Комиссия", "Мин. заказ", "Проверка", "Оплата", "Срок расчёта", "Сборный груз", "Дропшиппинг"]
    },
    de: {
      scan: "Zum Chatten scannen", reply: "Online · Antwort innerhalb 24 Std.",
      shipments: "Letzte Sendungen", cbmTitle: "Darstellung der Containerbeladung", quoteWithResult: "Mit diesem Ergebnis Angebot anfragen",
      showAllAccounts: "Alle Konten anzeigen", showFewerAccounts: "Weniger Konten anzeigen",
      calculatorModes: "Berechnungsart wählen", quickMode: "Schnellberechnung", excelMode: "Excel-Analyse",
      allPlatforms: "Alle Plattformen", socialFilter: "Konten nach Plattform filtern",
      faq: ["Provision", "Mindestmenge", "Prüfung", "Zahlung", "Angebotszeit", "Sammelversand", "Dropshipping"]
    },
    it: {
      scan: "Scansiona per chattare", reply: "Online · risposta entro 24 ore",
      shipments: "Spedizioni recenti", cbmTitle: "Illustrazione del carico del container", quoteWithResult: "Richiedi un preventivo con questo risultato",
      showAllAccounts: "Vedi tutti gli account", showFewerAccounts: "Mostra meno account",
      calculatorModes: "Scegli modalità di calcolo", quickMode: "Calcolo rapido", excelMode: "Analisi Excel",
      allPlatforms: "Tutte le piattaforme", socialFilter: "Filtra account per piattaforma",
      faq: ["Commissione", "Ordine minimo", "Ispezione", "Pagamento", "Tempi preventivo", "Consolidamento", "Dropshipping"]
    },
    tr: {
      scan: "Sohbet için tarayın", reply: "Çevrimiçi · 24 saat içinde yanıt",
      shipments: "Son gönderiler", cbmTitle: "Konteyner yükleme görseli", quoteWithResult: "Bu sonuçla teklif iste",
      showAllAccounts: "Tüm hesapları göster", showFewerAccounts: "Daha az hesap göster",
      calculatorModes: "Hesaplama yöntemini seçin", quickMode: "Hızlı hesaplama", excelMode: "Excel analizi",
      allPlatforms: "Tüm platformlar", socialFilter: "Platforma göre hesapları filtrele",
      faq: ["Komisyon", "Minimum sipariş", "Denetim", "Ödeme", "Teklif süresi", "Konsolidasyon", "Stoksuz satış"]
    }
  };
  var copy = labels[lang] || labels.en;
  var ATTRIBUTION_KEY = "jabbarAttributionV1";
  var UTM_KEYS = {
    utm_source: "utm_source",
    utm_medium: "utm_medium",
    utm_campaign: "utm_campaign",
    utm_term: "utm_term",
    utm_content: "utm_content"
  };
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reducedMotion = reducedMotionQuery.matches;
  var reducedMotionSubscribers = [];

  function onReducedMotionChange(callback) {
    reducedMotionSubscribers.push(callback);
  }

  function syncReducedMotion(event) {
    reducedMotion = Boolean(event.matches);
    reducedMotionSubscribers.slice().forEach(function (callback) { callback(reducedMotion); });
  }

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", syncReducedMotion);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(syncReducedMotion);
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function normalizeAttributionValue(value, maximum) {
    if (typeof value !== "string") return "";
    return value
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }

  function safeLandingPath(value) {
    var path = normalizeAttributionValue(value, 160);
    path = path.replace(/\/index\.html$/, "/");
    if (/^\/(?:(?:en|es|ar|fr|pt|ru|de|it|tr)\/)?(?:inquiry\/|calculator\/)?$/.test(path)) return path;
    if (["/privacy-policy.html", "/support.html", "/404.html"].indexOf(path) !== -1) return path;
    return "/other";
  }

  function sanitizeAttribution(record) {
    record = record && typeof record === "object" ? record : {};
    var sanitized = {
      landing_path: safeLandingPath(record.landing_path || window.location.pathname),
      referrer_host: normalizeAttributionValue(record.referrer_host || "", 253).toLowerCase(),
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: ""
    };
    Object.keys(UTM_KEYS).forEach(function (key) {
      sanitized[key] = normalizeAttributionValue(record[key] || "", 100);
    });
    return sanitized;
  }

  function externalReferrerHost() {
    if (!document.referrer) return "";
    try {
      var referrerHost = new URL(document.referrer).hostname.toLowerCase();
      var currentHost = window.location.hostname.toLowerCase();
      if (!referrerHost || referrerHost === currentHost) return "";
      if (/(^|\.)jabbarsourcing\.com$/.test(referrerHost) && /(^|\.)jabbarsourcing\.com$/.test(currentHost)) return "";
      return normalizeAttributionValue(referrerHost, 253);
    } catch (error) {
      return "";
    }
  }

  function captureAttribution() {
    try {
      var stored = window.sessionStorage.getItem(ATTRIBUTION_KEY);
      if (stored) {
        var existing = sanitizeAttribution(JSON.parse(stored));
        window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(existing));
        return existing;
      }
    } catch (error) {}

    var attribution = {
      landing_path: safeLandingPath(window.location.pathname),
      referrer_host: externalReferrerHost(),
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: ""
    };
    try {
      var query = new URLSearchParams(window.location.search);
      Object.keys(UTM_KEYS).forEach(function (key) {
        attribution[key] = normalizeAttributionValue(query.get(UTM_KEYS[key]) || "", 100);
      });
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch (error) {}
    return attribution;
  }

  function withAttribution(params, attribution) {
    var output = Object.assign({}, params);
    var sanitized = sanitizeAttribution(attribution);
    Object.keys(sanitized).forEach(function (key) {
      output[key] = sanitized[key];
    });
    return output;
  }

  var pageAttribution = captureAttribution();
  window.jabbarCaptureAttribution = captureAttribution;

  function socialPlatformKey(group) {
    if (!group) return "unknown";
    if (group.dataset.socialPlatform) return group.dataset.socialPlatform;
    var match = String(group.className || "").match(/social-platform-group-([a-z0-9-]+)/i);
    return match ? match[1].toLowerCase() : "unknown";
  }

  function initAnalyticsEvents() {
    if (typeof window.jabbarTrack !== "function") {
      window.jabbarTrack = function (eventName, params) {
        if (typeof window.gtag !== "function") return;
        window.gtag("event", eventName, params || {});
      };
    }

    var calculatorPage = document.querySelector("main.calculator-page");
    var inquiryForm = document.querySelector(".js-inquiry-form");
    var social = document.querySelector(".social-platform-groups");

    if (social) {
      social.addEventListener("click", function (event) {
        var card = event.target.closest("a.team-card[href]");
        if (!card || !social.contains(card)) return;
        var group = card.closest(".social-platform-group");
        var grid = card.parentElement;
        var cards = grid ? Array.prototype.filter.call(grid.children, function (child) {
          return child.classList.contains("team-card");
        }) : [];
        var handleNode = card.querySelector(".team-handle");
        var handle = handleNode ? handleNode.textContent.trim() : "";
        window.jabbarTrack("social_profile_click", withAttribution({
          locale: lang,
          source_path: safeLandingPath(window.location.pathname),
          platform: socialPlatformKey(group),
          handle: handle.slice(0, 100),
          position: Math.max(1, cards.indexOf(card) + 1)
        }, pageAttribution));
      });

      if ("IntersectionObserver" in window) {
        var socialObserver = new IntersectionObserver(function (entries) {
          if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
          window.jabbarTrack("social_accounts_view", withAttribution({
            locale: lang,
            source_path: safeLandingPath(window.location.pathname)
          }, pageAttribution));
          socialObserver.disconnect();
        }, { threshold: 0.24 });
        socialObserver.observe(social);
      }
    }

    if (!inquiryForm) {
      document.addEventListener("click", function (event) {
        var quoteLink = event.target.closest("a[href]");
        if (!quoteLink || quoteLink.classList.contains("calculator-inquiry-cta")) return;
        var destination;
        try { destination = new URL(quoteLink.href, window.location.href); } catch (error) { return; }
        if (destination.origin !== window.location.origin || !/\/inquiry\/$/.test(destination.pathname)) return;
        var placement = quoteLink.classList.contains("site-nav-quote")
          ? "navigation"
          : quoteLink.classList.contains("inquiry-entry-card-cta") ? "hero" : "other";
        window.jabbarTrack("quote_click", withAttribution({
          locale: lang,
          source_path: safeLandingPath(window.location.pathname),
          placement: placement
        }, pageAttribution));
      }, true);
    }

    if (!calculatorPage) return;
    document.addEventListener("click", function (event) {
      var whatsappLink = event.target.closest('a[href*="wa.me"], a[data-app-link^="whatsapp:"], .contact-whatsapp');
      if (!whatsappLink) return;
      window.jabbarTrack("contact_whatsapp", {
        page_type: "calculator"
      });
    }, true);
  }

  function initCalculatorModes() {
    var panel = document.querySelector(".calculator-panel");
    var analyzer = panel && panel.querySelector("[data-order-analyzer]");
    var manualLabel = panel && panel.querySelector(".calculator-manual-label");
    var form = panel && panel.querySelector("#cbm-calculator");
    if (!panel || !analyzer || !manualLabel || !form || panel.querySelector(".calculator-mode-tabs")) return;

    var tabs = createElement("div", "calculator-mode-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-orientation", "horizontal");
    tabs.setAttribute("aria-label", copy.calculatorModes);

    var quickButton = createElement("button", "calculator-mode-tab is-active", copy.quickMode);
    quickButton.type = "button";
    quickButton.id = "calculator-mode-quick-tab";
    quickButton.setAttribute("role", "tab");
    quickButton.setAttribute("aria-selected", "true");
    quickButton.setAttribute("aria-controls", "calculator-mode-quick");
    quickButton.dataset.calculatorMode = "quick";

    var excelButton = createElement("button", "calculator-mode-tab", copy.excelMode);
    excelButton.type = "button";
    excelButton.id = "calculator-mode-excel-tab";
    excelButton.setAttribute("role", "tab");
    excelButton.setAttribute("aria-selected", "false");
    excelButton.setAttribute("aria-controls", "calculator-mode-excel");
    excelButton.setAttribute("tabindex", "-1");
    excelButton.dataset.calculatorMode = "excel";

    tabs.appendChild(quickButton);
    tabs.appendChild(excelButton);

    var quickPanel = createElement("section", "calculator-mode-panel calculator-mode-panel-quick");
    quickPanel.id = "calculator-mode-quick";
    quickPanel.setAttribute("role", "tabpanel");
    quickPanel.setAttribute("aria-labelledby", quickButton.id);
    quickPanel.appendChild(manualLabel);
    quickPanel.appendChild(form);

    var excelPanel = createElement("section", "calculator-mode-panel calculator-mode-panel-excel");
    excelPanel.id = "calculator-mode-excel";
    excelPanel.setAttribute("role", "tabpanel");
    excelPanel.setAttribute("aria-labelledby", excelButton.id);
    excelPanel.hidden = true;
    excelPanel.appendChild(analyzer);

    panel.prepend(excelPanel);
    panel.prepend(quickPanel);
    panel.prepend(tabs);

    var buttons = [quickButton, excelButton];
    function activate(mode, shouldFocus, shouldTrack) {
      var excelActive = mode === "excel";
      quickPanel.hidden = excelActive;
      excelPanel.hidden = !excelActive;
      buttons.forEach(function (button) {
        var selected = button.dataset.calculatorMode === mode;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", String(selected));
        button.setAttribute("tabindex", selected ? "0" : "-1");
        if (selected && shouldFocus) button.focus();
      });
      if (shouldTrack) {
        window.jabbarTrack("calculator_mode_change", withAttribution({
          locale: lang,
          source_path: safeLandingPath(window.location.pathname),
          mode: mode
        }, pageAttribution));
      }
    }

    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () {
        activate(button.dataset.calculatorMode, false, true);
      });
      button.addEventListener("keydown", function (event) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) return;
        event.preventDefault();
        var forwardKey = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
        var targetIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
          : event.key === forwardKey ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
        activate(buttons[targetIndex].dataset.calculatorMode, true, true);
      });
    });

    activate("quick", false, false);
  }

  function initCalculatorInquiryBridge() {
    var form = document.getElementById("cbm-calculator");
    var results = document.querySelector(".calculator-results");
    if (!form || !results || results.querySelector(".calculator-inquiry-cta")) return;

    var inquiryPath = lang === "zh" ? "/inquiry/" : "/" + lang + "/inquiry/";
    var quoteLink = createElement("a", "calculator-inquiry-cta", copy.quoteWithResult);
    quoteLink.href = inquiryPath;
    quoteLink.hidden = true;
    results.appendChild(quoteLink);

    var lastResult = null;

    function hasValidDimensions() {
      return ["length", "width", "height", "qty"].every(function (name) {
        var field = form.elements.namedItem(name);
        if (!field) return false;
        var value = Number(field.value);
        return name === "qty" ? Math.floor(value) > 0 : value > 0;
      });
    }

    window.addEventListener("jabbar:calc-result", function (event) {
      if (!event.detail || !event.detail.message) return;
      lastResult = event.detail;
      quoteLink.hidden = false;
    });

    quoteLink.addEventListener("click", function (event) {
      if (!lastResult || !hasValidDimensions()) {
        event.preventDefault();
        return;
      }
      try {
        window.sessionStorage.setItem("jabbarCalcResult", JSON.stringify({
          savedAt: Date.now(),
          message: lastResult.message,
          product: lastResult.product || "",
          quantity: lastResult.quantity || "",
          totalCbm: Number(lastResult.totalCbm) || 0,
          bufferedCbm: Number(lastResult.bufferedCbm) || 0,
          container: lastResult.container || ""
        }));
      } catch (error) {}
      window.jabbarTrack("calculator_inquiry", {
        page_type: "calculator",
        locale: document.documentElement.lang || lang
      });
    });

    form.addEventListener("submit", function () {
      if (!lastResult || !hasValidDimensions()) return;
      var submittedResult = lastResult;
      window.requestAnimationFrame(function () {
        window.jabbarTrack("calculator_result", {
          method: "manual",
          locale: document.documentElement.lang || lang,
          total_cbm: Number(Number(submittedResult.totalCbm || 0).toFixed(3))
        });
        if (window.matchMedia("(max-width: 900px)").matches) {
          results.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        }
      });
    });

    var copyButton = form.querySelector("[data-copy-result]");
    if (copyButton) {
      copyButton.addEventListener("click", function () {
        if (!lastResult || !hasValidDimensions()) return;
        window.requestAnimationFrame(function () {
          window.jabbarTrack("calculator_copy", {
            page_type: "calculator",
            locale: document.documentElement.lang || lang
          });
        });
      });
    }
  }

  function initTrustStamps() {
    var row = document.querySelector(".stamp-row");
    if (!row) return;
    var stamps = Array.prototype.slice.call(row.querySelectorAll(".stamp"));
    if (!stamps.length) return;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      stamps.forEach(function (stamp) { stamp.classList.add("land"); });
      return;
    }

    stamps.forEach(function (stamp) { stamp.classList.add("pre"); });
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      stamps.forEach(function (stamp, index) {
        window.setTimeout(function () { stamp.classList.add("land"); }, index * 180);
      });
      observer.disconnect();
    }, { threshold: 0.4 });
    observer.observe(row);
  }

  function initShipmentTicker() {
    var ticker = document.querySelector(".shipment-ticker");
    if (!ticker) return;
    var rail = ticker.querySelector(".shipment-ticker-rail");
    var track = ticker.querySelector(".shipment-ticker-track");
    if (!rail || !track) return;

    var source = rail.getAttribute("data-shipments-source") || "/shipments.json";
    var field = "city_" + lang;
    var locale = document.documentElement.lang || lang || "en";
    var dayFormatter;
    try { dayFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "always" }); } catch (error) {
      dayFormatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });
    }

    function parseCalendarDay(value) {
      if (typeof value !== "string") return null;
      var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return null;
      var year = Number(match[1]);
      var month = Number(match[2]);
      var day = Number(match[3]);
      var stamp = Date.UTC(year, month - 1, day);
      var date = new Date(stamp);
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
      return Math.floor(stamp / 86400000);
    }

    function relativeDay(dayNumber) {
      if (dayNumber === null) return "";
      var now = new Date();
      var today = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
      return dayFormatter.format(dayNumber - today, "day");
    }

    function normalize(data) {
      if (!Array.isArray(data)) return [];
      return data.map(function (item, index) {
        if (!item || typeof item !== "object") return null;
        var city = item[field] || item.city_en || item.city_zh;
        if (typeof city !== "string" || !city.trim()) return null;
        var calendarDay = parseCalendarDay(item.when);
        return {
          city: city.trim(),
          flag: typeof item.flag === "string" ? item.flag.trim() : "",
          load: typeof item.load === "string" ? item.load.trim() : "",
          when: relativeDay(calendarDay),
          day: calendarDay,
          placeholder: item.placeholder === true,
          index: index
        };
      }).filter(Boolean).sort(function (left, right) {
        if (left.day !== null && right.day !== null) return right.day - left.day;
        if (left.day !== null) return -1;
        if (right.day !== null) return 1;
        return left.index - right.index;
      }).slice(0, 10);
    }

    function isPlaceholderRecord(item) {
      if (!item || typeof item !== "object" || item.placeholder === true) return true;
      return Object.keys(item).some(function (key) {
        var value = item[key];
        return typeof value === "string" && /^\s*\[[\s\S]+\]\s*$/.test(value);
      });
    }

    function buildItem(item) {
      var li = createElement("li", "shipment-ticker-item num-mono");
      if (item.placeholder) li.classList.add("is-placeholder");
      li.setAttribute("dir", "auto");
      if (item.flag) {
        var flag = createElement("span", "shipment-ticker-flag", item.flag);
        flag.setAttribute("aria-hidden", "true");
        li.appendChild(flag);
      }
      var city = createElement("bdi", "shipment-ticker-city", item.city);
      li.appendChild(city);
      if (item.load) {
        li.appendChild(document.createTextNode(" · "));
        var load = createElement("bdi", "shipment-ticker-load", item.load);
        load.dir = "ltr";
        li.appendChild(load);
      }
      if (item.when) {
        li.appendChild(document.createTextNode(" · "));
        li.appendChild(createElement("bdi", "shipment-ticker-when", item.when));
      }
      return li;
    }

    function buildList(items, hidden) {
      var list = createElement("ul", "shipment-ticker-list");
      if (hidden) list.setAttribute("aria-hidden", "true");
      items.forEach(function (item) { list.appendChild(buildItem(item)); });
      return list;
    }

    function startMotion(firstList) {
      var rtl = document.documentElement.dir === "rtl";
      var width = 0;
      var offset = 0;
      var visible = true;
      var paused = false;
      var frameId = 0;
      var last = 0;

      function measure() {
        width = firstList.getBoundingClientRect().width;
        offset = rtl ? -width : 0;
        track.style.transform = "translate3d(" + offset + "px,0,0)";
      }
      function stop() {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        last = 0;
      }
      function frame(now) {
        if (!last) last = now;
        var elapsed = Math.min(50, Math.max(0, now - last));
        last = now;
        offset += (rtl ? 1 : -1) * 0.03 * elapsed;
        if (!rtl && offset <= -width) offset += width;
        if (rtl && offset >= 0) offset -= width;
        track.style.transform = "translate3d(" + offset + "px,0,0)";
        frameId = window.requestAnimationFrame(frame);
      }
      function sync() {
        if (reducedMotion || !visible || paused || document.hidden || width <= 0) stop();
        else if (!frameId) frameId = window.requestAnimationFrame(frame);
      }
      function setPaused(value) {
        paused = value;
        ticker.classList.toggle("is-paused", paused);
        sync();
      }
      function syncReducedState() {
        ticker.classList.toggle("is-static", reducedMotion);
        if (reducedMotion) {
          track.style.transform = "translate3d(0,0,0)";
          stop();
        } else {
          measure();
          sync();
        }
      }

      rail.addEventListener("pointerenter", function () { setPaused(true); });
      rail.addEventListener("pointerleave", function () { setPaused(false); });
      rail.addEventListener("focusin", function () { setPaused(true); });
      rail.addEventListener("focusout", function () { setPaused(false); });
      document.addEventListener("visibilitychange", sync);
      window.addEventListener("resize", function () { measure(); sync(); }, { passive: true });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { visible = entry.isIntersecting; });
          sync();
        }, { rootMargin: "120px 0px" }).observe(ticker);
      }
      onReducedMotionChange(syncReducedState);
      measure();
      syncReducedState();
    }

    fetch(source, { credentials: "same-origin", cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("Shipment data unavailable");
      return response.json();
    }).then(function (data) {
      if (!Array.isArray(data) || !data.length || data.some(isPlaceholderRecord)) {
        ticker.classList.add("is-unavailable");
        return;
      }
      var items = normalize(data);
      if (!items.length) {
        ticker.classList.add("is-unavailable");
        return;
      }
      var firstList = buildList(items, false);
      var secondList = buildList(items, true);
      track.replaceChildren(firstList, secondList);
      ticker.classList.add("is-ready");
      ticker.setAttribute("aria-label", copy.shipments);
      startMotion(firstList);
    }).catch(function () {
      ticker.classList.add("is-unavailable");
    });
  }

  function initCbmVisual() {
    var results = document.querySelector(".calculator-results");
    if (!results) return;

    var visual = results.querySelector(".cbm-visual");
    if (!visual) {
      visual = createElement("div", "cbm-visual");
      visual.innerHTML = [
        '<svg viewBox="0 0 320 150" role="img" aria-labelledby="cbmVizTitle">',
        '<title id="cbmVizTitle"></title>',
        '<text id="cbmCap" class="num-mono" x="150" y="18" text-anchor="middle" font-size="13" fill="#475569" direction="ltr">40HQ · 0.0 / 68 CBM</text>',
        '<line class="cbm-dimension-line" x1="8" y1="31" x2="292" y2="31"/>',
        '<line class="cbm-dimension-line" x1="8" y1="24" x2="8" y2="38"/>',
        '<line class="cbm-dimension-line" x1="292" y1="24" x2="292" y2="38"/>',
        '<rect x="8" y="44" width="284" height="80" rx="4" fill="none" stroke="#475569" stroke-width="3"/>',
        '<line x1="292" y1="52" x2="308" y2="52" stroke="#475569" stroke-width="3"/>',
        '<line x1="292" y1="116" x2="308" y2="116" stroke="#475569" stroke-width="3"/>',
        '<rect id="cbmFill" x="12" y="48" width="0" height="72"/>',
        '<g id="cbmRibs" stroke-width="1"></g>',
        '<text id="cbmPct" class="num-mono" x="150" y="92" text-anchor="middle" font-size="18" font-weight="600">0%</text>',
        "</svg>"
      ].join("");
      var heading = results.querySelector("h2");
      if (heading) heading.insertAdjacentElement("afterend", visual);
      else results.insertBefore(visual, results.firstChild);
    }

    var title = visual.querySelector("#cbmVizTitle");
    if (title) title.textContent = copy.cbmTitle;

    window.renderCbmVisual = function (totalCbm) {
      totalCbm = Math.max(0, Number(totalCbm) || 0);
      var pick = lang === "zh" ? ["40英尺高柜", 68] : ["40HQ", 68];
      var volumeUnit = lang === "zh" ? "立方米" : "CBM";
      var over = totalCbm > 68;
      var pct = Math.min(totalCbm / pick[1], 1);
      var width = Math.round(276 * pct);
      var fill = visual.querySelector("#cbmFill");
      fill.setAttribute("width", width);
      fill.classList.toggle("is-over", over);
      var ribs = visual.querySelector("#cbmRibs");
      ribs.innerHTML = "";
      for (var x = 46; x < 12 + width; x += 34) {
        ribs.insertAdjacentHTML("beforeend", '<line x1="' + x + '" y1="48" x2="' + x + '" y2="120"/>');
      }
      var percentageText = Math.round(totalCbm / pick[1] * 100) + "%";
      var capacityText = pick[0] + " · " + totalCbm.toFixed(1) + " / " + pick[1] + " " + volumeUnit + (over ? " ×" + Math.ceil(totalCbm / 68) : "");
      visual.querySelector("#cbmPct").textContent = percentageText;
      visual.querySelector("#cbmCap").textContent = capacityText;
      if (title) title.textContent = copy.cbmTitle + ": " + percentageText + " · " + capacityText;
    };
    window.renderCbmVisual(0);
    var form = document.getElementById("cbm-calculator");
    if (form) form.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function initScrollProgress() {
    var isHome = Boolean(document.querySelector("main > .team:not(.inquiry-page)"));
    var isCalculator = Boolean(document.querySelector("main.calculator-page"));
    var nav = document.querySelector(".site-nav");
    if ((!isHome && !isCalculator) || !nav || nav.querySelector(".site-scroll-progress")) return;

    var progress = createElement("div", "site-scroll-progress");
    progress.setAttribute("aria-hidden", "true");
    progress.appendChild(createElement("span", "site-scroll-progress-fill"));
    nav.appendChild(progress);
    var fill = progress.firstElementChild;
    var frame = 0;

    function update() {
      frame = 0;
      var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      var value = maxScroll ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 1;
      fill.style.transform = "scaleX(" + value + ")";
    }
    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
  }

  function initWhatsappQr() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) return;
    var triggers = Array.prototype.slice.call(document.querySelectorAll('a[href*="wa.me/"], a[data-web-link*="wa.me/"]'));
    if (!triggers.length) return;

    var card = createElement("aside", "whatsapp-qr-card");
    card.id = "whatsapp-qr-preview";
    card.setAttribute("role", "tooltip");
    card.hidden = true;
    var image = document.createElement("img");
    image.src = "/assets/whatsapp-qr.svg?v=20260712a";
    image.alt = copy.scan;
    image.width = 96;
    image.height = 96;
    var text = createElement("div", "whatsapp-qr-copy");
    text.appendChild(createElement("strong", "", copy.scan));
    var status = createElement("span", "whatsapp-qr-status");
    status.appendChild(createElement("i", "", ""));
    status.appendChild(document.createTextNode(copy.reply));
    text.appendChild(status);
    card.appendChild(image);
    card.appendChild(text);
    document.body.appendChild(card);

    var openTimer = 0;
    var closeTimer = 0;
    var active = null;

    function clearTimers() {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    }
    function positionCard(trigger) {
      var rect = trigger.getBoundingClientRect();
      var box = card.getBoundingClientRect();
      var nav = document.querySelector(".site-nav");
      var navBottom = nav ? nav.getBoundingClientRect().bottom : 68;
      var safeTop = Math.max(8, navBottom + 8);
      var top = rect.top - box.height - 12;
      if (top < safeTop) top = rect.bottom + 12;
      top = Math.max(safeTop, Math.min(window.innerHeight - box.height - 8, top));
      var left = Math.min(window.innerWidth - box.width - 8, Math.max(8, rect.left + rect.width / 2 - box.width / 2));
      card.style.top = top + "px";
      card.style.left = left + "px";
    }
    function show(trigger, delay) {
      clearTimers();
      active = trigger;
      openTimer = window.setTimeout(function () {
        card.hidden = false;
        positionCard(trigger);
        window.requestAnimationFrame(function () { card.classList.add("is-visible"); });
      }, delay);
    }
    function hide(delay) {
      window.clearTimeout(openTimer);
      closeTimer = window.setTimeout(function () {
        card.classList.remove("is-visible");
        card.hidden = true;
        active = null;
      }, delay);
    }

    triggers.forEach(function (trigger) {
      var describedBy = (trigger.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      if (describedBy.indexOf(card.id) === -1) describedBy.push(card.id);
      trigger.setAttribute("aria-describedby", describedBy.join(" "));
      trigger.addEventListener("mouseenter", function () { show(trigger, 400); });
      trigger.addEventListener("mouseleave", function () { hide(200); });
      trigger.addEventListener("focusin", function () { show(trigger, 0); });
      trigger.addEventListener("focusout", function () { hide(100); });
    });
    card.addEventListener("mouseenter", clearTimers);
    card.addEventListener("mouseleave", function () { hide(200); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !card.hidden) hide(0);
    });
    window.addEventListener("scroll", function () { if (active && !card.hidden) hide(0); }, { passive: true });
    window.addEventListener("resize", function () { if (active && !card.hidden) positionCard(active); }, { passive: true });
  }

  function prepareCounter(strong) {
    var original = strong.textContent.trim();
    var numberElement = strong.querySelector(".company-metric-number") || strong.querySelector("bdi");
    var token = "";

    if (numberElement) {
      var bdiMatch = numberElement.textContent.match(/\d(?:[\d,.]*\d)?/);
      if (!bdiMatch) return null;
      token = bdiMatch[0];
    } else {
      var walker = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT);
      var node;
      var match;
      while ((node = walker.nextNode())) {
        match = node.nodeValue.match(/\d(?:[\d,.]*\d)?/);
        if (match) break;
      }
      if (!node || !match) return null;
      token = match[0];
      numberElement = createElement("span", "company-metric-number num-mono", token);
      var before = node.nodeValue.slice(0, match.index);
      var after = node.nodeValue.slice(match.index + token.length);
      var parent = node.parentNode;
      if (before) parent.insertBefore(document.createTextNode(before), node);
      parent.insertBefore(numberElement, node);
      if (after) parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
    }

    var target = Number(token.replace(/[^0-9]/g, ""));
    if (!target) return null;
    numberElement.classList.add("company-metric-number", "num-mono");
    strong.removeAttribute("aria-label");
    var visual = createElement("span", "company-metric-visual");
    visual.setAttribute("aria-hidden", "true");
    while (strong.firstChild) visual.appendChild(strong.firstChild);
    strong.appendChild(visual);
    strong.appendChild(createElement("span", "sr-only", original));
    numberElement.textContent = "0";
    return { element: numberElement, original: token, target: target, grouped: /[,.]/.test(token) };
  }

  function animateCounter(counter) {
    var start = performance.now();
    function step(now) {
      var elapsed = Math.min(1, (now - start) / 1200);
      var eased = 1 - Math.pow(1 - elapsed, 3);
      var value = Math.round(counter.target * eased);
      counter.element.textContent = value.toLocaleString(document.documentElement.lang || "en", { useGrouping: counter.grouped });
      if (elapsed < 1) window.requestAnimationFrame(step);
      else counter.element.textContent = counter.original;
    }
    window.requestAnimationFrame(step);
  }

  function initHomepageMotion() {
    var home = document.querySelector("main > .team:not(.inquiry-page)");
    if (!home) return;

    var metrics = Array.prototype.slice.call(document.querySelectorAll(".company-metric-card strong"));
    var counters = new Map();
    var sharedObserver = null;

    if (!reducedMotion && "IntersectionObserver" in window) {
      sharedObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (counters.has(entry.target)) animateCounter(counters.get(entry.target));
          else entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.15 });
    }

    if (sharedObserver) {
      [".sourcing-gallery", ".company-intro", ".work-process", ".company-about", ".testimonials", ".faq-section", ".social-platform-groups"].forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (section) {
          sharedObserver.observe(section);
        });
      });
      metrics.forEach(function (strong) {
        var counter = prepareCounter(strong);
        if (!counter) return;
        counters.set(strong, counter);
        sharedObserver.observe(strong);
      });
    }

  }

  function initFaqTags() {
    var faq = document.querySelector(".faq-section");
    if (!faq || faq.querySelector(".faq-quick-tags")) return;
    var items = Array.prototype.slice.call(faq.querySelectorAll(".faq-list > .faq-item"));
    if (items.length !== copy.faq.length) return;

    var tags = createElement("div", "faq-quick-tags");
    tags.setAttribute("role", "group");
    tags.setAttribute("aria-label", faq.querySelector("h2") ? faq.querySelector("h2").textContent : "FAQ");
    items.forEach(function (item, index) {
      var id = "faq-item-" + (index + 1);
      item.id = id;
      var button = createElement("button", "faq-quick-tag", copy.faq[index]);
      button.type = "button";
      button.setAttribute("aria-controls", id);
      button.setAttribute("aria-expanded", String(item.open));
      tags.appendChild(button);

      item.addEventListener("toggle", function () {
        button.setAttribute("aria-expanded", String(item.open));
      });
      button.addEventListener("click", function () {
        items.forEach(function (other) { other.open = other === item; });
        var summary = item.querySelector("summary");
        summary.classList.remove("faq-summary-flash");
        void summary.offsetWidth;
        summary.classList.add("faq-summary-flash");
        window.setTimeout(function () { summary.classList.remove("faq-summary-flash"); }, 620);
        item.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
        window.setTimeout(function () {
          try { summary.focus({ preventScroll: true }); } catch (error) { summary.focus(); }
        }, reducedMotion ? 0 : 360);
      });
    });

    var heading = faq.querySelector(".section-heading");
    if (heading) heading.insertAdjacentElement("afterend", tags);
    else faq.insertBefore(tags, faq.firstChild);
  }

  function initSocialAccountDisclosure() {
    var social = document.querySelector(".social-platform-groups");
    if (!social) return;

    var mobileQuery = window.matchMedia("(max-width: 767px)");
    var groups = Array.prototype.slice.call(social.querySelectorAll(".social-platform-group"));

    groups.forEach(function (group) {
      group.dataset.socialPlatform = socialPlatformKey(group);
    });

    if (groups.length > 1 && !social.querySelector(".social-platform-filters")) {
      var filters = createElement("div", "social-platform-filters");
      filters.setAttribute("role", "group");
      filters.setAttribute("aria-label", copy.socialFilter);
      var filterItems = [{ key: "all", label: copy.allPlatforms }].concat(groups.map(function (group) {
        var title = group.querySelector(".social-platform-title");
        return { key: group.dataset.socialPlatform, label: title ? title.textContent.trim() : group.dataset.socialPlatform };
      }));

      filterItems.forEach(function (item, index) {
        var button = createElement("button", "social-platform-filter" + (index === 0 ? " is-active" : ""), item.label);
        button.type = "button";
        button.dataset.socialFilter = item.key;
        button.setAttribute("aria-pressed", String(index === 0));
        button.addEventListener("click", function () {
          var selected = button.dataset.socialFilter;
          Array.prototype.forEach.call(filters.querySelectorAll(".social-platform-filter"), function (candidate) {
            var active = candidate === button;
            candidate.classList.toggle("is-active", active);
            candidate.setAttribute("aria-pressed", String(active));
          });
          groups.forEach(function (group) {
            group.hidden = selected !== "all" && group.dataset.socialPlatform !== selected;
          });
          social.classList.toggle("is-social-filtered", selected !== "all");
          window.jabbarTrack("social_platform_filter", withAttribution({
            locale: lang,
            source_path: safeLandingPath(window.location.pathname),
            platform: selected
          }, pageAttribution));
        });
        filters.appendChild(button);
      });

      var heading = social.querySelector(".social-accounts-heading") || social.querySelector(".section-heading");
      if (heading) heading.insertAdjacentElement("afterend", filters);
      else social.prepend(filters);
    }

    groups.forEach(function (group, groupIndex) {
      var grid = group.querySelector(".team-grid");
      if (!grid) return;
      var cards = Array.prototype.filter.call(grid.children, function (child) {
        return child.classList.contains("team-card");
      });
      if (cards.length <= 4 || group.querySelector(".social-platform-toggle")) return;

      group.classList.add("has-social-overflow");
      if (!grid.id) {
        var title = group.querySelector(".social-platform-title[id]");
        var idBase = title ? title.id.replace(/-title$/, "") : "social-platform-" + (groupIndex + 1);
        grid.id = idBase + "-accounts";
      }

      var expanded = false;
      var toggle = createElement("button", "social-platform-toggle", copy.showAllAccounts);
      toggle.type = "button";
      toggle.setAttribute("aria-controls", grid.id);
      toggle.setAttribute("aria-expanded", "false");
      group.appendChild(toggle);

      function sync() {
        var mobile = mobileQuery.matches;
        var visibleLimit = mobile ? 4 : 6;
        var collapsible = cards.length > visibleLimit;
        var collapsed = collapsible && !expanded;
        cards.forEach(function (card, cardIndex) {
          var hidden = collapsed && cardIndex >= visibleLimit;
          card.hidden = hidden;
          card.classList.toggle("is-social-card-collapsed", hidden);
        });
        group.classList.toggle("is-social-expanded", collapsible && expanded);
        toggle.hidden = !collapsible;
        toggle.setAttribute("aria-expanded", String(collapsible && expanded));
        toggle.textContent = expanded ? copy.showFewerAccounts : copy.showAllAccounts;
      }

      toggle.addEventListener("click", function () {
        expanded = !expanded;
        sync();
        window.jabbarTrack(expanded ? "social_accounts_expand" : "social_accounts_collapse", withAttribution({
          locale: lang,
          source_path: safeLandingPath(window.location.pathname),
          platform: group.dataset.socialPlatform,
          account_count: cards.length
        }, pageAttribution));
      });
      if (typeof mobileQuery.addEventListener === "function") mobileQuery.addEventListener("change", sync);
      else if (typeof mobileQuery.addListener === "function") mobileQuery.addListener(sync);
      sync();
    });
  }

  initAnalyticsEvents();
  initCalculatorModes();
  initCalculatorInquiryBridge();
  initTrustStamps();
  initShipmentTicker();
  initCbmVisual();
  initScrollProgress();
  initHomepageMotion();
  initFaqTags();
  initSocialAccountDisclosure();
  initWhatsappQr();
})();
