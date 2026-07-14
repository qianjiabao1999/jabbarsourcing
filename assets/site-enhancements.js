(function () {
  "use strict";

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: {
      contact: "联系我们", ai: "AI 采购助理", scan: "手机扫码直聊", reply: "在线 · 24 小时内回复",
      countries: "服务国家和地区", shipments: "最近发运", cbmTitle: "集装箱装载示意",
      faq: ["佣金", "起订量", "验货", "付款", "报价时效", "拼柜", "代发"]
    },
    en: {
      contact: "Contact us", ai: "AI Sourcing Assistant", scan: "Scan to chat", reply: "Online · replies within 24h",
      countries: "Countries and regions served", shipments: "Recent shipments", cbmTitle: "Container loading illustration",
      faq: ["Commission", "MOQ", "Inspection", "Payment", "Quote time", "Consolidation", "Dropshipping"]
    },
    es: {
      contact: "Contáctanos", ai: "Asistente de compras AI", scan: "Escanea para chatear", reply: "En línea · respuesta en 24 h",
      countries: "Países y regiones atendidos", shipments: "Envíos recientes", cbmTitle: "Ilustración de carga del contenedor",
      faq: ["Comisión", "Pedido mínimo", "Inspección", "Pago", "Plazo de cotización", "Consolidación", "Envío directo"]
    },
    ar: {
      contact: "تواصل معنا", ai: "مساعد الشراء بالذكاء الاصطناعي", scan: "امسح للدردشة", reply: "متصل · نرد خلال 24 ساعة",
      countries: "الدول والمناطق التي نخدمها", shipments: "الشحنات الأخيرة", cbmTitle: "رسم توضيحي لتحميل الحاوية",
      faq: ["العمولة", "الحد الأدنى", "الفحص", "الدفع", "مدة عرض السعر", "الشحن المجمع", "الشحن المباشر"]
    },
    fr: {
      contact: "Contactez-nous", ai: "Assistant achat IA", scan: "Scannez pour discuter", reply: "En ligne · réponse sous 24 h",
      countries: "Pays et régions desservis", shipments: "Expéditions récentes", cbmTitle: "Illustration du chargement du conteneur",
      faq: ["Commission", "MOQ", "Inspection", "Paiement", "Délai de devis", "Groupage", "Livraison directe"]
    },
    pt: {
      contact: "Fale conosco", ai: "Assistente de compras AI", scan: "Escaneie para conversar", reply: "Online · resposta em até 24 h",
      countries: "Países e regiões atendidos", shipments: "Envios recentes", cbmTitle: "Ilustração do carregamento do contêiner",
      faq: ["Comissão", "Pedido mínimo", "Inspeção", "Pagamento", "Prazo da cotação", "Consolidação", "Dropshipping"]
    },
    ru: {
      contact: "Связаться", ai: "AI помощник по закупкам", scan: "Сканируйте для чата", reply: "Онлайн · ответим в течение 24 ч",
      countries: "Страны и регионы обслуживания", shipments: "Последние отправки", cbmTitle: "Схема загрузки контейнера",
      faq: ["Комиссия", "Мин. заказ", "Проверка", "Оплата", "Срок расчёта", "Сборный груз", "Дропшиппинг"]
    },
    de: {
      contact: "Kontakt", ai: "KI Einkaufsassistent", scan: "Zum Chatten scannen", reply: "Online · Antwort innerhalb 24 Std.",
      countries: "Bediente Länder und Regionen", shipments: "Letzte Sendungen", cbmTitle: "Darstellung der Containerbeladung",
      faq: ["Provision", "Mindestmenge", "Prüfung", "Zahlung", "Angebotszeit", "Sammelversand", "Dropshipping"]
    },
    it: {
      contact: "Contattaci", ai: "Assistente acquisti AI", scan: "Scansiona per chattare", reply: "Online · risposta entro 24 ore",
      countries: "Paesi e regioni serviti", shipments: "Spedizioni recenti", cbmTitle: "Illustrazione del carico del container",
      faq: ["Commissione", "Ordine minimo", "Ispezione", "Pagamento", "Tempi preventivo", "Consolidamento", "Dropshipping"]
    },
    tr: {
      contact: "İletişim", ai: "AI Satın Alma Asistanı", scan: "Sohbet için tarayın", reply: "Çevrimiçi · 24 saat içinde yanıt",
      countries: "Hizmet verilen ülkeler ve bölgeler", shipments: "Son gönderiler", cbmTitle: "Konteyner yükleme görseli",
      faq: ["Komisyon", "Minimum sipariş", "Denetim", "Ödeme", "Teklif süresi", "Konsolidasyon", "Stoksuz satış"]
    }
  };
  var copy = labels[lang] || labels.en;
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reducedMotion = reducedMotionQuery.matches;

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function initAnalyticsEvents() {
    if (typeof window.jabbarTrack !== "function") {
      window.jabbarTrack = function (eventName, params) {
        if (typeof window.gtag !== "function") return;
        window.gtag("event", eventName, params || {});
      };
    }

    if (!document.querySelector("main.calculator-page")) return;
    document.addEventListener("click", function (event) {
      var whatsappLink = event.target.closest('a[href*="wa.me"], a[data-app-link^="whatsapp:"], .contact-whatsapp');
      if (!whatsappLink) return;
      window.jabbarTrack("contact_whatsapp", {
        page_type: "calculator"
      });
    }, true);
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
      if (reducedMotion) {
        ticker.classList.add("is-static");
        return;
      }

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
        if (!visible || paused || document.hidden || width <= 0) stop();
        else if (!frameId) frameId = window.requestAnimationFrame(frame);
      }
      function setPaused(value) {
        paused = value;
        ticker.classList.toggle("is-paused", paused);
        sync();
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
      measure();
      sync();
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

  function initContactSpeedDial() {
    var aiToggle = document.querySelector(".jabbar-ai-toggle");
    var aiPanel = document.querySelector(".jabbar-ai-panel");
    if (!aiToggle || !aiPanel || document.querySelector(".contact-speed-dial")) return;

    aiToggle.setAttribute("aria-hidden", "true");
    aiToggle.setAttribute("tabindex", "-1");

    var root = createElement("div", "contact-speed-dial is-open");
    var menu = createElement("div", "contact-speed-dial-menu");

    function optionLink(className, href, icon, text) {
      var link = createElement("a", "contact-speed-dial-option " + className);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      var iconWrap = createElement("span", "contact-speed-dial-option-icon");
      if (icon.tag === "img") {
        var image = document.createElement("img");
        image.src = icon.src;
        image.alt = "";
        image.width = 24;
        image.height = 24;
        iconWrap.appendChild(image);
      } else {
        iconWrap.textContent = icon.text;
      }
      link.appendChild(iconWrap);
      link.appendChild(createElement("span", "contact-speed-dial-option-label", text));
      return link;
    }

    var whatsapp = optionLink(
      "contact-speed-dial-whatsapp",
      "https://wa.me/8618658925544",
      { tag: "img", src: "/assets/whatsapp-ios-icon.webp" },
      "WhatsApp"
    );
    var telegram = optionLink(
      "contact-speed-dial-telegram",
      "https://t.me/Jabbar_in_Yiwu",
      { tag: "img", src: "/assets/telegram-ios-icon.svg" },
      "Telegram"
    );
    var ai = createElement("button", "contact-speed-dial-option contact-speed-dial-ai");
    ai.type = "button";
    ai.appendChild(createElement("span", "contact-speed-dial-option-icon contact-speed-dial-ai-icon", "AI"));
    ai.appendChild(createElement("span", "contact-speed-dial-option-label", copy.ai));

    menu.appendChild(whatsapp);
    menu.appendChild(telegram);
    menu.appendChild(ai);

    root.appendChild(menu);
    document.body.appendChild(root);

    ai.addEventListener("click", function () {
      aiToggle.click();
    });

    var footer = document.querySelector(".site-footer");
    if (footer && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          root.classList.toggle("is-footer-hidden", entry.isIntersecting);
        });
      }, { rootMargin: "0px 0px 48px" }).observe(footer);
    }
  }

  function initCbmVisual() {
    var results = document.querySelector(".calculator-results");
    if (!results) return;

    var visual = results.querySelector(".cbm-visual");
    if (!visual) {
      visual = createElement("div", "cbm-visual");
      visual.setAttribute("aria-hidden", "false");
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
        '<rect id="cbmFill" x="12" y="48" width="0" height="72" fill="#5DCAA5"/>',
        '<g id="cbmRibs" stroke="#0F6E56" stroke-width="1"></g>',
        '<text id="cbmPct" class="num-mono" x="150" y="92" text-anchor="middle" font-size="18" font-weight="600" fill="#04342C">0%</text>',
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
      fill.setAttribute("fill", over ? "#EF9F27" : "#5DCAA5");
      var ribs = visual.querySelector("#cbmRibs");
      ribs.innerHTML = "";
      for (var x = 46; x < 12 + width; x += 34) {
        ribs.insertAdjacentHTML("beforeend", '<line x1="' + x + '" y1="48" x2="' + x + '" y2="120"/>');
      }
      visual.querySelector("#cbmPct").textContent = Math.round(totalCbm / pick[1] * 100) + "%";
      visual.querySelector("#cbmCap").textContent = pick[0] + " · " + totalCbm.toFixed(1) + " / " + pick[1] + " " + volumeUnit + (over ? " ×" + Math.ceil(totalCbm / 68) : "");
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
      var top = rect.top - box.height - 12;
      if (top < 8) top = Math.min(window.innerHeight - box.height - 8, rect.bottom + 12);
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
      trigger.addEventListener("mouseenter", function () { show(trigger, 400); });
      trigger.addEventListener("mouseleave", function () { hide(200); });
    });
    card.addEventListener("mouseenter", clearTimers);
    card.addEventListener("mouseleave", function () { hide(200); });
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
    strong.setAttribute("aria-label", original);
    numberElement.textContent = "0";
    return { element: numberElement, original: token, target: target, grouped: /[,.]/.test(token) };
  }

  function animateCounter(counter) {
    var start = performance.now();
    function step(now) {
      var elapsed = Math.min(1, (now - start) / 1200);
      var eased = 1 - Math.pow(1 - elapsed, 3);
      var value = Math.round(counter.target * eased);
      counter.element.textContent = value.toLocaleString("en-US", { useGrouping: counter.grouped });
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
    var marqueeState = { visible: false };
    var sharedObserver = null;

    if (!reducedMotion && "IntersectionObserver" in window) {
      sharedObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.target.classList.contains("service-country-marquee")) {
            marqueeState.visible = entry.isIntersecting;
            return;
          }
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
          section.classList.add("ui-section-reveal");
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

    var introLayout = document.querySelector(".company-intro-layout");
    var metricGrid = document.querySelector(".company-metrics");
    if (!introLayout || !metricGrid || document.querySelector(".service-country-marquee")) return;

    var countries = [
      ["🇬🇭", "GH"], ["🇳🇬", "NG"], ["🇧🇷", "BR"], ["🇲🇽", "MX"],
      ["🇷🇺", "RU"], ["🇸🇦", "SA"], ["🇦🇪", "AE"], ["🇹🇷", "TR"],
      ["🇰🇿", "KZ"], ["🇮🇩", "ID"], ["🇪🇸", "ES"], ["🇮🇹", "IT"]
    ];
    var fallbackNames = ["Ghana", "Nigeria", "Brazil", "Mexico", "Russia", "Saudi Arabia", "United Arab Emirates", "Turkey", "Kazakhstan", "Indonesia", "Spain", "Italy"];
    var displayNames = null;
    try { displayNames = new Intl.DisplayNames([lang], { type: "region" }); } catch (error) {}

    var marquee = createElement("div", "service-country-marquee");
    marquee.setAttribute("role", "region");
    marquee.setAttribute("aria-label", copy.countries);
    var track = createElement("div", "service-country-track");
    function countryList(hidden) {
      var list = createElement("ul", "service-country-list");
      if (hidden) list.setAttribute("aria-hidden", "true");
      countries.forEach(function (country, index) {
        var item = createElement("li", "service-country-item");
        item.setAttribute("dir", "auto");
        item.appendChild(createElement("span", "service-country-flag", country[0]));
        item.appendChild(createElement("span", "service-country-name", displayNames ? displayNames.of(country[1]) : fallbackNames[index]));
        list.appendChild(item);
      });
      return list;
    }
    var firstList = countryList(false);
    track.appendChild(firstList);
    track.appendChild(countryList(true));
    marquee.appendChild(track);
    introLayout.appendChild(marquee);

    if (reducedMotion) {
      marquee.classList.add("is-static");
      return;
    }
    if (sharedObserver) sharedObserver.observe(marquee);
    else marqueeState.visible = true;

    var offset = 0;
    var width = 0;
    var paused = false;
    var last = 0;
    var rtl = document.documentElement.dir === "rtl";
    function measure() {
      width = firstList.getBoundingClientRect().width;
      if (rtl) offset = -width;
    }
    function frame(now) {
      if (!last) last = now;
      var frameScale = Math.min(2, Math.max(0, (now - last) / 16.67));
      last = now;
      if (!paused && marqueeState.visible && !document.hidden && width > 0) {
        offset += (rtl ? 0.5 : -0.5) * frameScale;
        if (!rtl && offset <= -width) offset += width;
        if (rtl && offset >= 0) offset -= width;
        track.style.transform = "translate3d(" + offset + "px,0,0)";
      }
      window.requestAnimationFrame(frame);
    }
    marquee.addEventListener("pointerenter", function () { paused = true; });
    marquee.addEventListener("pointerleave", function () { paused = false; });
    marquee.addEventListener("focusin", function () { paused = true; });
    marquee.addEventListener("focusout", function () { paused = false; });
    window.addEventListener("resize", measure, { passive: true });
    measure();
    window.requestAnimationFrame(frame);
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

  initAnalyticsEvents();
  initTrustStamps();
  initShipmentTicker();
  initContactSpeedDial();
  initCbmVisual();
  initScrollProgress();
  initHomepageMotion();
  initFaqTags();
  initWhatsappQr();
})();
