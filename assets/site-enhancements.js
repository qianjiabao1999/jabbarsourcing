(function () {
  "use strict";

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: {
      scan: "手机扫码直聊", reply: "在线 · 24 小时内回复",
      shipments: "最近发运", cbmTitle: "集装箱装载示意", quoteWithResult: "用此结果获取报价",
      calculatorModes: "选择计算方式", quickMode: "快速计算", excelMode: "Excel 订单分析", calculatorOptional: "产品与补充信息（可选）",
      socialFilter: "按平台筛选账号",
      faqPrompt: "选择问题查看答案", faq: ["佣金", "起订量", "验货", "付款", "报价时效", "拼柜", "代发"]
    },
    en: {
      scan: "Scan to chat", reply: "Online · replies within 24h",
      shipments: "Recent shipments", cbmTitle: "Container loading illustration", quoteWithResult: "Get a quote with this result",
      calculatorModes: "Choose calculation mode", quickMode: "Quick calculation", excelMode: "Excel order analysis", calculatorOptional: "Product and extra details (optional)",
      socialFilter: "Filter accounts by platform",
      faqPrompt: "Choose a topic to view its answer", faq: ["Commission", "MOQ", "Inspection", "Payment", "Quote time", "Consolidation", "Dropshipping"]
    },
    es: {
      scan: "Escanea para chatear", reply: "En línea · respuesta en 24 h",
      shipments: "Envíos recientes", cbmTitle: "Ilustración de carga del contenedor", quoteWithResult: "Solicitar cotización con este resultado",
      calculatorModes: "Elegir modo de cálculo", quickMode: "Cálculo rápido", excelMode: "Análisis de Excel", calculatorOptional: "Producto y detalles extra (opcional)",
      socialFilter: "Filtrar cuentas por plataforma",
      faqPrompt: "Elige un tema para ver la respuesta", faq: ["Comisión", "Pedido mínimo", "Inspección", "Pago", "Plazo de cotización", "Consolidación", "Envío directo"]
    },
    ar: {
      scan: "امسح للدردشة", reply: "متصل · نرد خلال 24 ساعة",
      shipments: "الشحنات الأخيرة", cbmTitle: "رسم توضيحي لتحميل الحاوية", quoteWithResult: "اطلب عرض سعر بهذه النتيجة",
      calculatorModes: "اختر طريقة الحساب", quickMode: "حساب سريع", excelMode: "تحليل طلبات Excel", calculatorOptional: "المنتج وتفاصيل إضافية (اختياري)",
      socialFilter: "تصفية الحسابات حسب المنصة",
      faqPrompt: "اختر سؤالاً لعرض الإجابة", faq: ["العمولة", "الحد الأدنى", "الفحص", "الدفع", "مدة عرض السعر", "الشحن المجمع", "الشحن المباشر"]
    },
    fr: {
      scan: "Scannez pour discuter", reply: "En ligne · réponse sous 24 h",
      shipments: "Expéditions récentes", cbmTitle: "Illustration du chargement du conteneur", quoteWithResult: "Demander un devis avec ce résultat",
      calculatorModes: "Choisir le mode de calcul", quickMode: "Calcul rapide", excelMode: "Analyse Excel", calculatorOptional: "Produit et précisions (facultatif)",
      socialFilter: "Filtrer les comptes par plateforme",
      faqPrompt: "Choisissez un sujet pour voir la réponse", faq: ["Commission", "MOQ", "Inspection", "Paiement", "Délai de devis", "Groupage", "Livraison directe"]
    },
    pt: {
      scan: "Escaneie para conversar", reply: "Online · resposta em até 24 h",
      shipments: "Envios recentes", cbmTitle: "Ilustração do carregamento do contêiner", quoteWithResult: "Pedir cotação com este resultado",
      calculatorModes: "Escolher modo de cálculo", quickMode: "Cálculo rápido", excelMode: "Análise de Excel", calculatorOptional: "Produto e detalhes extras (opcional)",
      socialFilter: "Filtrar contas por plataforma",
      faqPrompt: "Escolha um tema para ver a resposta", faq: ["Comissão", "Pedido mínimo", "Inspeção", "Pagamento", "Prazo da cotação", "Consolidação", "Dropshipping"]
    },
    ru: {
      scan: "Сканируйте для чата", reply: "Онлайн · ответим в течение 24 ч",
      shipments: "Последние отправки", cbmTitle: "Схема загрузки контейнера", quoteWithResult: "Запросить расчёт с этим результатом",
      calculatorModes: "Выбор режима расчета", quickMode: "Быстрый расчет", excelMode: "Анализ Excel", calculatorOptional: "Товар и дополнительные данные (необязательно)",
      socialFilter: "Фильтр аккаунтов по платформе",
      faqPrompt: "Выберите тему, чтобы увидеть ответ", faq: ["Комиссия", "Мин. заказ", "Проверка", "Оплата", "Срок расчёта", "Сборный груз", "Дропшиппинг"]
    },
    de: {
      scan: "Zum Chatten scannen", reply: "Online · Antwort innerhalb 24 Std.",
      shipments: "Letzte Sendungen", cbmTitle: "Darstellung der Containerbeladung", quoteWithResult: "Mit diesem Ergebnis Angebot anfragen",
      calculatorModes: "Berechnungsart wählen", quickMode: "Schnellberechnung", excelMode: "Excel-Analyse", calculatorOptional: "Produkt und Zusatzangaben (optional)",
      socialFilter: "Konten nach Plattform filtern",
      faqPrompt: "Thema auswählen und Antwort anzeigen", faq: ["Provision", "Mindestmenge", "Prüfung", "Zahlung", "Angebotszeit", "Sammelversand", "Dropshipping"]
    },
    it: {
      scan: "Scansiona per chattare", reply: "Online · risposta entro 24 ore",
      shipments: "Spedizioni recenti", cbmTitle: "Illustrazione del carico del container", quoteWithResult: "Richiedi un preventivo con questo risultato",
      calculatorModes: "Scegli modalità di calcolo", quickMode: "Calcolo rapido", excelMode: "Analisi Excel", calculatorOptional: "Prodotto e dettagli extra (facoltativi)",
      socialFilter: "Filtra account per piattaforma",
      faqPrompt: "Scegli un argomento per vedere la risposta", faq: ["Commissione", "Ordine minimo", "Ispezione", "Pagamento", "Tempi preventivo", "Consolidamento", "Dropshipping"]
    },
    tr: {
      scan: "Sohbet için tarayın", reply: "Çevrimiçi · 24 saat içinde yanıt",
      shipments: "Son gönderiler", cbmTitle: "Konteyner yükleme görseli", quoteWithResult: "Bu sonuçla teklif iste",
      calculatorModes: "Hesaplama yöntemini seçin", quickMode: "Hızlı hesaplama", excelMode: "Excel analizi", calculatorOptional: "Ürün ve ek ayrıntılar (isteğe bağlı)",
      socialFilter: "Platforma göre hesapları filtrele",
      faqPrompt: "Yanıtı görmek için bir konu seçin", faq: ["Komisyon", "Minimum sipariş", "Denetim", "Ödeme", "Teklif süresi", "Konsolidasyon", "Stoksuz satış"]
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

    var fieldGrid = form.querySelector(".calculator-form-grid");
    var optionalFields = ["product", "weight", "note"].map(function (name) {
      var control = form.elements.namedItem(name);
      var field = control && control.closest(".calculator-field");
      if (field) field.classList.add("calculator-field-" + name);
      return field;
    }).filter(Boolean);
    ["length", "width", "height", "unit", "qty"].forEach(function (name) {
      var control = form.elements.namedItem(name);
      var field = control && control.closest(".calculator-field");
      if (!field || !fieldGrid) return;
      field.classList.add("calculator-field-" + name);
      fieldGrid.appendChild(field);
    });
    if (fieldGrid && optionalFields.length) {
      var optionalDetails = createElement("details", "calculator-optional-details");
      var optionalSummary = createElement("summary", "calculator-optional-summary", copy.calculatorOptional);
      var optionalFieldGroup = createElement("div", "calculator-optional-fields");
      optionalDetails.appendChild(optionalSummary);
      optionalDetails.appendChild(optionalFieldGroup);
      optionalFields.forEach(function (field) { optionalFieldGroup.appendChild(field); });
      fieldGrid.insertAdjacentElement("afterend", optionalDetails);
      optionalDetails.open = optionalFields.some(function (field) {
        var control = field.querySelector("input, textarea, select");
        return control && String(control.value || "").trim().length > 0;
      });
    }

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

  function initGalleryMarquee() {
    var gallery = document.querySelector(".sourcing-gallery");
    if (!gallery) return;

    var desktopQuery = window.matchMedia("(min-width: 768px)");
    var tracks = Array.prototype.slice.call(gallery.querySelectorAll(".gallery-track"));
    var lastGalleryInputWasPointer = false;

    gallery.addEventListener("pointerdown", function () {
      lastGalleryInputWasPointer = true;
    }, { capture: true, passive: true });
    document.addEventListener("keydown", function () {
      lastGalleryInputWasPointer = false;
    }, true);

    tracks.forEach(function (track) {
      if (track.dataset.galleryLoopInitialized === "1") return;
      var originals = Array.prototype.filter.call(track.children, function (frame) {
        return frame.classList.contains("gallery-frame") && frame.dataset.galleryClone !== "true";
      });
      if (originals.length < 2) return;

      track.dataset.galleryLoopInitialized = "1";
      track.dataset.galleryOriginalCount = String(originals.length);
      originals.forEach(function (frame) {
        var clone = frame.cloneNode(true);
        clone.dataset.galleryClone = "true";
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("inert", "");
        Array.prototype.forEach.call(clone.querySelectorAll("img"), function (image) {
          image.alt = "";
          image.loading = "lazy";
          image.decoding = "async";
          image.setAttribute("fetchpriority", "low");
        });
        track.appendChild(clone);
      });

      var rail = track.closest(".gallery-rail");
      var resizeFrame = 0;
      var mobileFrame = 0;
      var mobileResumeTimer = 0;
      var mobileLastTimestamp = 0;
      var mobileLoopDistance = 0;
      var mobileAutoPosition = 0;
      var mobilePaused = false;
      var mobileInView = true;

      function stopMobileLoop() {
        if (mobileFrame) window.cancelAnimationFrame(mobileFrame);
        mobileFrame = 0;
        mobileLastTimestamp = 0;
      }

      function normalizeMobilePosition(position) {
        if (!rail || !mobileLoopDistance) return;
        mobileAutoPosition = position >= mobileLoopDistance ? position % mobileLoopDistance : Math.max(0, position);
        rail.scrollLeft = mobileAutoPosition;
      }

      function runMobileLoop(timestamp) {
        mobileFrame = 0;
        if (desktopQuery.matches || reducedMotion || !mobileInView || !rail || !mobileLoopDistance) {
          mobileLastTimestamp = 0;
          return;
        }

        if (!mobileLastTimestamp) mobileLastTimestamp = timestamp;
        var elapsed = Math.min(250, Math.max(0, timestamp - mobileLastTimestamp));
        mobileLastTimestamp = timestamp;
        if (!mobilePaused && !document.hidden) {
          if (Math.abs(rail.scrollLeft - mobileAutoPosition) > 2) mobileAutoPosition = rail.scrollLeft;
          normalizeMobilePosition(mobileAutoPosition + elapsed * 0.055);
        }
        mobileFrame = window.requestAnimationFrame(runMobileLoop);
      }

      function startMobileLoop() {
        if (desktopQuery.matches || reducedMotion || !mobileInView || !rail || !mobileLoopDistance || mobileFrame) return;
        mobileLastTimestamp = 0;
        mobileFrame = window.requestAnimationFrame(runMobileLoop);
      }

      function pauseMobileLoop() {
        mobilePaused = true;
        if (rail) mobileAutoPosition = rail.scrollLeft;
        if (mobileResumeTimer) window.clearTimeout(mobileResumeTimer);
      }

      function pauseMobileLoopForKeyboard() {
        if (!lastGalleryInputWasPointer) pauseMobileLoop();
      }

      function resumeMobileLoopForKeyboard() {
        if (!lastGalleryInputWasPointer) resumeMobileLoopSoon();
      }

      function resumeMobileLoopSoon() {
        if (mobileResumeTimer) window.clearTimeout(mobileResumeTimer);
        mobileResumeTimer = window.setTimeout(function () {
          normalizeMobilePosition(rail ? rail.scrollLeft : mobileAutoPosition);
          mobilePaused = false;
          startMobileLoop();
        }, 2200);
      }

      if (rail) {
        rail.addEventListener("pointerdown", pauseMobileLoop, { passive: true });
        rail.addEventListener("pointerup", resumeMobileLoopSoon, { passive: true });
        rail.addEventListener("pointercancel", resumeMobileLoopSoon, { passive: true });
        rail.addEventListener("wheel", function () {
          pauseMobileLoop();
          resumeMobileLoopSoon();
        }, { passive: true });
        rail.addEventListener("focusin", pauseMobileLoopForKeyboard);
        rail.addEventListener("focusout", resumeMobileLoopForKeyboard);
      }

      if ("IntersectionObserver" in window && rail) {
        var mobileVisibilityObserver = new IntersectionObserver(function (entries) {
          mobileInView = entries.some(function (entry) { return entry.isIntersecting; });
          if (mobileInView) startMobileLoop();
          else stopMobileLoop();
        }, { rootMargin: "120px 0px" });
        mobileVisibilityObserver.observe(rail);
      }

      function syncLoop() {
        if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(function () {
          resizeFrame = 0;
          track.classList.remove("is-gallery-loop-ready");
          track.classList.remove("is-gallery-mobile-loop-ready");
          track.style.removeProperty("--gallery-loop-distance");
          track.style.removeProperty("--gallery-loop-duration");
          mobileLoopDistance = 0;
          stopMobileLoop();
          if (reducedMotion) return;

          var firstOriginal = originals[0];
          var firstClone = track.querySelector('[data-gallery-clone="true"]');
          if (!firstOriginal || !firstClone) return;
          var distance = firstClone.offsetLeft - firstOriginal.offsetLeft;
          if (!Number.isFinite(distance) || distance <= 0) return;

          track.style.setProperty("--gallery-loop-distance", (-distance).toFixed(2) + "px");
          track.style.setProperty("--gallery-loop-duration", Math.max(28, distance / 72).toFixed(2) + "s");
          if (desktopQuery.matches) {
            track.classList.add("is-gallery-loop-ready");
          } else {
            mobileLoopDistance = distance;
            mobileAutoPosition = rail ? rail.scrollLeft : 0;
            track.classList.add("is-gallery-mobile-loop-ready");
            startMobileLoop();
          }
        });
      }

      if (typeof desktopQuery.addEventListener === "function") desktopQuery.addEventListener("change", syncLoop);
      else if (typeof desktopQuery.addListener === "function") desktopQuery.addListener(syncLoop);
      window.addEventListener("resize", syncLoop, { passive: true });
      onReducedMotionChange(syncLoop);
      syncLoop();
    });
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
    items.forEach(function (item) { item.open = false; });

    var tags = createElement("div", "faq-quick-tags");
    tags.setAttribute("role", "group");
    tags.setAttribute("aria-label", faq.querySelector("h2") ? faq.querySelector("h2").textContent : "FAQ");
    var prompt = createElement("p", "faq-quick-tags-label", copy.faqPrompt);
    items.forEach(function (item, index) {
      var id = "faq-item-" + (index + 1);
      item.id = id;
      var button = createElement("button", "faq-quick-tag", copy.faq[index]);
      button.type = "button";
      button.setAttribute("aria-controls", id);
      button.setAttribute("aria-expanded", "false");
      tags.appendChild(button);

      item.addEventListener("toggle", function () {
        button.setAttribute("aria-expanded", String(item.open));
        button.classList.toggle("is-active", item.open);
      });
      button.addEventListener("click", function () {
        items.forEach(function (other) { other.open = other === item; });
        window.requestAnimationFrame(function () {
          item.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
        });
        var summary = item.querySelector("summary");
        summary.classList.remove("faq-summary-flash");
        void summary.offsetWidth;
        summary.classList.add("faq-summary-flash");
        window.setTimeout(function () { summary.classList.remove("faq-summary-flash"); }, 620);
      });
    });

    var heading = faq.querySelector(".section-heading");
    if (heading) {
      heading.insertAdjacentElement("afterend", prompt);
      prompt.insertAdjacentElement("afterend", tags);
    } else {
      faq.insertBefore(tags, faq.firstChild);
      faq.insertBefore(prompt, tags);
    }
  }

  function initSocialAccountDisclosure() {
    var social = document.querySelector(".social-platform-groups");
    if (!social) return;

    var groups = Array.prototype.slice.call(social.querySelectorAll(".social-platform-group"));

    groups.forEach(function (group) {
      group.dataset.socialPlatform = socialPlatformKey(group);
    });

    groups.forEach(function (group) {
      group.hidden = false;
      group.classList.remove("has-social-overflow", "is-social-expanded");
      Array.prototype.forEach.call(group.querySelectorAll(".team-card"), function (card) {
        card.hidden = false;
        card.classList.remove("is-social-card-collapsed");
      });
      Array.prototype.forEach.call(group.querySelectorAll(".social-platform-toggle"), function (toggle) {
        toggle.remove();
      });
    });

    var existingFilters = social.querySelector(".social-platform-filters");
    if (existingFilters) existingFilters.remove();

    if (groups.length > 1) {
      var filters = createElement("div", "social-platform-filters");
      filters.setAttribute("role", "group");
      filters.setAttribute("aria-label", copy.socialFilter);
      var filterItems = groups.map(function (group) {
        var title = group.querySelector(".social-platform-title");
        group.id = group.id || "social-platform-" + group.dataset.socialPlatform;
        return {
          key: group.dataset.socialPlatform,
          label: title ? title.textContent.trim() : group.dataset.socialPlatform,
          panelId: group.id
        };
      });

      function selectPlatform(selected, trackSelection) {
        Array.prototype.forEach.call(filters.querySelectorAll(".social-platform-filter"), function (candidate) {
          var active = candidate.dataset.socialFilter === selected;
          candidate.classList.toggle("is-active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
        groups.forEach(function (group) {
          group.hidden = group.dataset.socialPlatform !== selected;
        });
        social.classList.add("is-social-filtered");
        if (!trackSelection) return;
        window.jabbarTrack("social_platform_filter", withAttribution({
          locale: lang,
          source_path: safeLandingPath(window.location.pathname),
          platform: selected
        }, pageAttribution));
      }

      filterItems.forEach(function (item) {
        var button = createElement("button", "social-platform-filter", item.label);
        button.type = "button";
        button.dataset.socialFilter = item.key;
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-controls", item.panelId);
        button.addEventListener("click", function () {
          selectPlatform(button.dataset.socialFilter, true);
        });
        filters.appendChild(button);
      });

      var heading = social.querySelector(".social-accounts-heading") || social.querySelector(".section-heading");
      if (heading) heading.insertAdjacentElement("afterend", filters);
      else social.prepend(filters);

      selectPlatform(filterItems[0].key, false);
    }
  }

  initAnalyticsEvents();
  initCalculatorModes();
  initCalculatorInquiryBridge();
  initTrustStamps();
  initShipmentTicker();
  initCbmVisual();
  initScrollProgress();
  initGalleryMarquee();
  initHomepageMotion();
  initFaqTags();
  initSocialAccountDisclosure();
  initWhatsappQr();
})();
