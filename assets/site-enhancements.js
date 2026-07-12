(function () {
  "use strict";

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: {
      contact: "联系我们", ai: "AI 采购助理", scan: "手机扫码直聊", reply: "在线 · 24 小时内回复",
      countries: "服务国家和地区", cbmTitle: "集装箱装载示意",
      faq: ["佣金", "起订量", "验货", "付款", "报价时效", "拼柜", "代发"]
    },
    en: {
      contact: "Contact us", ai: "AI Sourcing Assistant", scan: "Scan to chat", reply: "Online · replies within 24h",
      countries: "Countries and regions served", cbmTitle: "Container loading illustration",
      faq: ["Commission", "MOQ", "Inspection", "Payment", "Quote time", "Consolidation", "Dropshipping"]
    },
    es: {
      contact: "Contáctanos", ai: "Asistente de compras AI", scan: "Escanea para chatear", reply: "En línea · respuesta en 24 h",
      countries: "Países y regiones atendidos", cbmTitle: "Ilustración de carga del contenedor",
      faq: ["Comisión", "Pedido mínimo", "Inspección", "Pago", "Plazo de cotización", "Consolidación", "Envío directo"]
    },
    ar: {
      contact: "تواصل معنا", ai: "مساعد الشراء بالذكاء الاصطناعي", scan: "امسح للدردشة", reply: "متصل · نرد خلال 24 ساعة",
      countries: "الدول والمناطق التي نخدمها", cbmTitle: "رسم توضيحي لتحميل الحاوية",
      faq: ["العمولة", "الحد الأدنى", "الفحص", "الدفع", "مدة عرض السعر", "الشحن المجمع", "الشحن المباشر"]
    },
    fr: {
      contact: "Contactez-nous", ai: "Assistant achat IA", scan: "Scannez pour discuter", reply: "En ligne · réponse sous 24 h",
      countries: "Pays et régions desservis", cbmTitle: "Illustration du chargement du conteneur",
      faq: ["Commission", "MOQ", "Inspection", "Paiement", "Délai de devis", "Groupage", "Livraison directe"]
    },
    pt: {
      contact: "Fale conosco", ai: "Assistente de compras AI", scan: "Escaneie para conversar", reply: "Online · resposta em até 24 h",
      countries: "Países e regiões atendidos", cbmTitle: "Ilustração do carregamento do contêiner",
      faq: ["Comissão", "Pedido mínimo", "Inspeção", "Pagamento", "Prazo da cotação", "Consolidação", "Dropshipping"]
    },
    ru: {
      contact: "Связаться", ai: "AI помощник по закупкам", scan: "Сканируйте для чата", reply: "Онлайн · ответим в течение 24 ч",
      countries: "Страны и регионы обслуживания", cbmTitle: "Схема загрузки контейнера",
      faq: ["Комиссия", "Мин. заказ", "Проверка", "Оплата", "Срок расчёта", "Сборный груз", "Дропшиппинг"]
    },
    de: {
      contact: "Kontakt", ai: "KI Einkaufsassistent", scan: "Zum Chatten scannen", reply: "Online · Antwort innerhalb 24 Std.",
      countries: "Bediente Länder und Regionen", cbmTitle: "Darstellung der Containerbeladung",
      faq: ["Provision", "Mindestmenge", "Prüfung", "Zahlung", "Angebotszeit", "Sammelversand", "Dropshipping"]
    },
    it: {
      contact: "Contattaci", ai: "Assistente acquisti AI", scan: "Scansiona per chattare", reply: "Online · risposta entro 24 ore",
      countries: "Paesi e regioni serviti", cbmTitle: "Illustrazione del carico del container",
      faq: ["Commissione", "Ordine minimo", "Ispezione", "Pagamento", "Tempi preventivo", "Consolidamento", "Dropshipping"]
    },
    tr: {
      contact: "İletişim", ai: "AI Satın Alma Asistanı", scan: "Sohbet için tarayın", reply: "Çevrimiçi · 24 saat içinde yanıt",
      countries: "Hizmet verilen ülkeler ve bölgeler", cbmTitle: "Konteyner yükleme görseli",
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

  function initContactSpeedDial() {
    var aiToggle = document.querySelector(".jabbar-ai-toggle");
    var aiPanel = document.querySelector(".jabbar-ai-panel");
    if (!aiToggle || !aiPanel || document.querySelector(".contact-speed-dial")) return;

    aiToggle.setAttribute("aria-hidden", "true");
    aiToggle.setAttribute("tabindex", "-1");

    var root = createElement("div", "contact-speed-dial");
    var menu = createElement("div", "contact-speed-dial-menu");
    var menuId = "contact-speed-dial-menu";
    menu.id = menuId;
    menu.hidden = true;

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
      "https://t.me/Jabbar199901",
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

    var main = createElement("button", "contact-speed-dial-main");
    main.type = "button";
    main.setAttribute("aria-label", copy.contact);
    main.setAttribute("aria-expanded", "false");
    main.setAttribute("aria-controls", menuId);
    var mainIcon = createElement("span", "contact-speed-dial-main-icon", "🎧");
    mainIcon.setAttribute("aria-hidden", "true");
    main.appendChild(mainIcon);
    main.appendChild(createElement("span", "contact-speed-dial-main-label", copy.contact));

    root.appendChild(menu);
    root.appendChild(main);
    document.body.appendChild(root);

    var menuHideTimer = 0;
    var menuFocusTimer = 0;
    function setOpen(open, moveFocus) {
      window.clearTimeout(menuHideTimer);
      window.clearTimeout(menuFocusTimer);
      main.setAttribute("aria-expanded", String(open));
      mainIcon.textContent = open ? "×" : "🎧";
      if (open) {
        menu.hidden = false;
        window.requestAnimationFrame(function () { root.classList.add("is-open"); });
      } else {
        root.classList.remove("is-open");
        menuHideTimer = window.setTimeout(function () { menu.hidden = true; }, reducedMotion ? 0 : 210);
      }
      if (open && moveFocus) {
        menuFocusTimer = window.setTimeout(function () { whatsapp.focus(); }, reducedMotion ? 0 : 210);
      }
    }

    main.addEventListener("click", function () {
      setOpen(!root.classList.contains("is-open"), true);
    });
    ai.addEventListener("click", function () {
      setOpen(false, false);
      aiToggle.click();
    });
    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) setOpen(false, false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !root.classList.contains("is-open")) return;
      setOpen(false, false);
      main.focus();
    });

    var footer = document.querySelector(".site-footer");
    if (footer && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          root.classList.toggle("is-footer-hidden", entry.isIntersecting);
          if (entry.isIntersecting) setOpen(false, false);
        });
      }, { rootMargin: "0px 0px 48px" }).observe(footer);
    }
  }

  function initCbmVisual() {
    var results = document.querySelector(".calculator-results");
    if (!results || document.getElementById("cbmFill")) return;

    var visual = createElement("div", "cbm-visual");
    visual.setAttribute("aria-hidden", "false");
    visual.innerHTML = [
      '<svg viewBox="0 0 320 130" role="img" aria-labelledby="cbmVizTitle">',
      '<title id="cbmVizTitle"></title>',
      '<rect x="8" y="24" width="284" height="80" rx="4" fill="none" stroke="#475569" stroke-width="3"/>',
      '<line x1="292" y1="32" x2="308" y2="32" stroke="#475569" stroke-width="3"/>',
      '<line x1="292" y1="96" x2="308" y2="96" stroke="#475569" stroke-width="3"/>',
      '<rect id="cbmFill" x="12" y="28" width="0" height="72" fill="#5DCAA5"/>',
      '<g id="cbmRibs" stroke="#0F6E56" stroke-width="1"></g>',
      '<text id="cbmPct" x="150" y="72" text-anchor="middle" font-size="18" font-weight="600" fill="#04342C"></text>',
      '<text id="cbmCap" x="12" y="122" font-size="13" fill="#475569" direction="ltr"></text>',
      "</svg>"
    ].join("");
    visual.querySelector("#cbmVizTitle").textContent = copy.cbmTitle;
    var heading = results.querySelector("h2");
    if (heading) heading.insertAdjacentElement("afterend", visual);
    else results.insertBefore(visual, results.firstChild);

    window.renderCbmVisual = function (totalCbm) {
      totalCbm = Math.max(0, Number(totalCbm) || 0);
      var caps = [["20GP", 28], ["40GP", 58], ["40HQ", 68]];
      var pick = caps.find(function (item) { return totalCbm <= item[1]; }) || caps[2];
      var over = totalCbm > 68;
      var pct = Math.min(totalCbm / pick[1], 1);
      var width = Math.round(276 * pct);
      var fill = document.getElementById("cbmFill");
      fill.setAttribute("width", width);
      fill.setAttribute("fill", over ? "#EF9F27" : "#5DCAA5");
      var ribs = document.getElementById("cbmRibs");
      ribs.innerHTML = "";
      for (var x = 46; x < 12 + width; x += 34) {
        ribs.insertAdjacentHTML("beforeend", '<line x1="' + x + '" y1="28" x2="' + x + '" y2="100"/>');
      }
      document.getElementById("cbmPct").textContent = Math.round(totalCbm / pick[1] * 100) + "%";
      document.getElementById("cbmCap").textContent = pick[0] + " · " + totalCbm.toFixed(1) + " / " + pick[1] + " CBM" + (over ? " ×" + Math.ceil(totalCbm / 68) : "");
    };
    window.renderCbmVisual(0);
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
    var numberElement = strong.querySelector("bdi");
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
      numberElement = createElement("span", "company-metric-number", token);
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
      [".sourcing-gallery", ".company-intro", ".work-process", ".testimonials", ".faq-section", ".social-platform-groups"].forEach(function (selector) {
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

  initContactSpeedDial();
  initCbmVisual();
  initScrollProgress();
  initHomepageMotion();
  initFaqTags();
  initWhatsappQr();
})();
