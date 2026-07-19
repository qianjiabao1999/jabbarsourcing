(function () {
  "use strict";

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var shipmentLabels = {
    zh: "最近发运",
    en: "Recent shipments",
    es: "Envíos recientes",
    ar: "الشحنات الأخيرة",
    fr: "Expéditions récentes",
    pt: "Envios recentes",
    ru: "Последние отправки",
    de: "Letzte Sendungen",
    it: "Spedizioni recenti",
    tr: "Son gönderiler"
  };
  var quoteLabels = {
    zh: "获取与你采购需求匹配的报价",
    en: "Get a quote for your sourcing needs",
    es: "Solicita una cotización para tu compra",
    ar: "احصل على عرض سعر لاحتياجات الشراء",
    fr: "Obtenez un devis pour votre projet d’achat",
    pt: "Peça uma cotação para sua compra",
    ru: "Получить предложение для вашей закупки",
    de: "Angebot für Ihren Einkauf anfordern",
    it: "Richiedi un preventivo per il tuo acquisto",
    tr: "Satın alma ihtiyacınız için teklif alın"
  };
  var copy = {
    shipments: shipmentLabels[lang] || shipmentLabels.en,
    quote: quoteLabels[lang] || quoteLabels.en
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

  function initShipmentTicker() {
    var ticker = document.querySelector(".shipment-ticker");
    if (!ticker) return;
    var rail = ticker.querySelector(".shipment-ticker-rail");
    var track = ticker.querySelector(".shipment-ticker-track");
    if (!rail || !track) return;

    if (rail.getAttribute("data-shipments-enabled") !== "true") {
      ticker.classList.add("is-unavailable");
      return;
    }

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

    fetch(source, { credentials: "same-origin" }).then(function (response) {
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

  function initReviewQuoteCta() {
    var reviews = document.querySelector("#reviews");
    if (!reviews || reviews.querySelector(".testimonial-quote-cta")) return;
    var link = createElement("a", "testimonial-quote-cta", copy.quote);
    link.href = lang === "zh" ? "/inquiry/" : "/" + lang + "/inquiry/";
    reviews.appendChild(link);
  }

  initShipmentTicker();
  initReviewQuoteCta();
})();
