/* Jabbar Sourcing shared 40HQ container visualization. */
(function () {
  "use strict";

  var CONTAINER_CAPACITY_CBM = 68;
  var CONTAINER_EPSILON_CBM = 0.000001;
  var MAX_VISIBLE_CONTAINERS = 12;
  var SHELL_ASSET = "/assets/container-40hq-shell-20260722.webp";
  var CARGO_ASSET = "/assets/container-cargo-stack-20260722.webp";
  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: { title: "集装箱装载示意", forty: "40英尺高柜", unit: "立方米", full: "满载", loaded: "已装载" },
    en: { title: "Container loading illustration", forty: "40HQ", unit: "CBM", full: "Full", loaded: "loaded" },
    es: { title: "Ilustración de carga del contenedor", forty: "40HQ", unit: "CBM", full: "Completo", loaded: "cargado" },
    ar: { title: "رسم توضيحي لتحميل الحاوية", forty: "40HQ", unit: "CBM", full: "ممتلئة", loaded: "محمّلة" },
    fr: { title: "Illustration du chargement du conteneur", forty: "40HQ", unit: "CBM", full: "Plein", loaded: "chargé" },
    pt: { title: "Ilustração do carregamento do contêiner", forty: "40HQ", unit: "CBM", full: "Cheio", loaded: "carregado" },
    ru: { title: "Схема загрузки контейнера", forty: "40HQ", unit: "CBM", full: "Полный", loaded: "загружено" },
    de: { title: "Darstellung der Containerbeladung", forty: "40HQ", unit: "CBM", full: "Voll", loaded: "beladen" },
    it: { title: "Illustrazione del carico del container", forty: "40HQ", unit: "CBM", full: "Pieno", loaded: "caricato" },
    tr: { title: "Konteyner yükleme görseli", forty: "40HQ", unit: "CBM", full: "Dolu", loaded: "yüklü" }
  };
  var copy = labels[lang] || labels.en;

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function clampPercentage(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric));
  }

  function image(className, src) {
    var element = document.createElement("img");
    element.className = className;
    element.src = src;
    element.alt = "";
    element.width = 1280;
    element.height = className.indexOf("cargo") !== -1 ? 372 : 438;
    element.loading = "lazy";
    element.decoding = "async";
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  function createCard(options) {
    options = options || {};
    var percentage = clampPercentage(options.percentage);
    var percentageText = Math.round(percentage) + "%";
    var isFull = percentage >= 99.999;
    var index = Math.max(0, Math.floor(Number(options.index) || 0));
    var capacityText = String(options.capacityText || copy.forty);
    var title = String(options.title || copy.title);
    var statusText = isFull ? copy.full : percentageText + " " + copy.loaded;

    var card = createElement("article", "cbm-container-visual container-load-card" + (isFull ? " is-full" : ""));
    card.setAttribute("data-container-load", String(percentage));
    card.setAttribute("data-container-index", String(index));
    card.setAttribute("role", "progressbar");
    card.setAttribute("aria-valuemin", "0");
    card.setAttribute("aria-valuemax", "100");
    card.setAttribute("aria-valuenow", String(percentage));
    card.setAttribute("aria-valuetext", percentageText + " · " + capacityText);
    card.setAttribute("aria-label", title + ": " + percentageText + " · " + capacityText);

    var meta = createElement("div", "container-load-card__meta");
    var identity = createElement("span", "container-load-card__identity", "#" + (index + 1) + " · 40HQ");
    var percentageNode = createElement("strong", "num-mono cbm-container-percentage", percentageText);
    if (options.primary) percentageNode.id = "cbmPct";
    meta.appendChild(identity);
    meta.appendChild(percentageNode);

    var scene = createElement("div", "container-load-card__scene");
    // Keep the physical loading direction stable without forcing localized
    // card labels out of the page's LTR/RTL reading direction.
    scene.dir = "ltr";
    scene.setAttribute("aria-hidden", "true");
    scene.appendChild(image("container-load-card__shell", SHELL_ASSET));
    var bay = createElement("div", "container-load-card__bay");
    var cargoClip = createElement("div", "cbm-container-fill container-load-card__cargo-clip" + (isFull ? " is-full" : ""));
    cargoClip.style.width = percentage + "%";
    if (options.primary) cargoClip.id = "cbmFill";
    var cargo = image("container-load-card__cargo", CARGO_ASSET);
    cargo.style.width = percentage > 0.001 ? 10000 / percentage + "%" : "100%";
    cargoClip.appendChild(cargo);
    bay.appendChild(cargoClip);
    scene.appendChild(bay);

    var footer = createElement("div", "container-load-card__footer");
    var capacityNode = createElement("span", "num-mono cbm-container-capacity", capacityText);
    if (options.primary) capacityNode.id = "cbmCap";
    var state = createElement("span", "container-load-card__state", statusText);
    footer.appendChild(capacityNode);
    footer.appendChild(state);

    card.appendChild(meta);
    card.appendChild(scene);
    card.appendChild(footer);
    return card;
  }

  function renderCards(container, entries, options) {
    if (!container) return;
    options = options || {};
    container.replaceChildren();
    entries.forEach(function (entry, position) {
      container.appendChild(createCard({
        percentage: entry.percentage,
        index: entry.index,
        capacityText: entry.capacityText,
        title: options.title,
        primary: position === 0
      }));
    });
  }

  function initQuickCalculator() {
    var results = document.querySelector(".calculator-results");
    if (!results) return;
    var visual = results.querySelector(".cbm-visual");
    if (!visual) {
      visual = createElement("div", "cbm-visual");
      var heading = results.querySelector("h2");
      if (heading) heading.insertAdjacentElement("afterend", visual);
      else results.insertBefore(visual, results.firstChild);
    }

    window.renderCbmVisual = function (totalCbm) {
      totalCbm = Math.max(0, Number(totalCbm) || 0);
      var count = totalCbm > 0
        ? Math.max(1, Math.ceil((totalCbm - CONTAINER_EPSILON_CBM) / CONTAINER_CAPACITY_CBM))
        : 1;
      var entries = [];
      for (var index = 0; index < Math.min(count, MAX_VISIBLE_CONTAINERS); index += 1) {
        var remaining = Math.max(0, totalCbm - index * CONTAINER_CAPACITY_CBM);
        var load = Math.min(CONTAINER_CAPACITY_CBM, remaining);
        entries.push({
          percentage: Math.min(100, Math.max(0, load / CONTAINER_CAPACITY_CBM * 100)),
          index: index,
          capacityText: copy.forty + " " + (index + 1) + "/" + count + " · " + load.toFixed(1) + " / " + CONTAINER_CAPACITY_CBM + " " + copy.unit
        });
      }
      visual.setAttribute("data-container-count", String(count));
      renderCards(visual, entries, { title: copy.title });
      if (count > MAX_VISIBLE_CONTAINERS) {
        visual.appendChild(createElement("p", "cbm-visual-overflow", "+" + (count - MAX_VISIBLE_CONTAINERS)));
      }
    };

    window.renderCbmVisual(0);
    var form = document.getElementById("cbm-calculator");
    if (form) form.dispatchEvent(new Event("input", { bubbles: true }));
  }

  window.JabbarContainerVisual = {
    assets: { shell: SHELL_ASSET, cargo: CARGO_ASSET },
    capacity: CONTAINER_CAPACITY_CBM,
    createCard: createCard,
    renderCards: renderCards,
    version: "container-20260722a"
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initQuickCalculator, { once: true });
  else initQuickCalculator();
})();
