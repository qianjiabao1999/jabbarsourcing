/* 手算尺寸单位：先确认意图，后改值。 */
(function () {
  "use strict";
  var form = document.getElementById("cbm-calculator");
  if (!form) return;
  var unit = form.elements.unit;
  var dims = ["length", "width", "height"].map(function (id) { return document.getElementById(id); });
  var badges = form.querySelectorAll("[data-dimension-unit]");
  var submit = form.querySelector("button[type=submit]");
  var strings = {
    zh: ["从 {a} 改为 {b}：换算现有尺寸，还是保留数字、仅更正单位？", "换算尺寸", "保留数字", "取消"],
    en: ["Change from {a} to {b}: convert the dimensions, or keep the numbers and correct only the unit?", "Convert dimensions", "Keep numbers", "Cancel"],
    es: ["Cambiar de {a} a {b}: ¿convertir las medidas o mantener las cifras y corregir solo la unidad?", "Convertir medidas", "Mantener cifras", "Cancelar"],
    ar: ["التغيير من {a} إلى {b}: هل تريد تحويل الأبعاد أم الاحتفاظ بالأرقام وتصحيح الوحدة فقط؟", "تحويل الأبعاد", "الاحتفاظ بالأرقام", "إلغاء"],
    fr: ["Passer de {a} à {b} : convertir les dimensions ou garder les valeurs pour corriger uniquement l’unité ?", "Convertir les dimensions", "Garder les valeurs", "Annuler"],
    pt: ["Mudar de {a} para {b}: converter as dimensões ou manter os números e corrigir apenas a unidade?", "Converter dimensões", "Manter os números", "Cancelar"],
    ru: ["Переход из {a} в {b}: пересчитать размеры или оставить числа и исправить только единицу?", "Пересчитать размеры", "Оставить числа", "Отмена"],
    de: ["Von {a} auf {b} wechseln: Maße umrechnen oder Zahlen beibehalten und nur die Einheit korrigieren?", "Maße umrechnen", "Zahlen beibehalten", "Abbrechen"],
    it: ["Passaggio da {a} a {b}: convertire le dimensioni o mantenere i valori e correggere solo l’unità?", "Converti dimensioni", "Mantieni i valori", "Annulla"],
    tr: ["{a} → {b}: ölçüler dönüştürülsün mü, yoksa sayılar korunarak yalnızca birim mi düzeltilsin?", "Ölçüleri dönüştür", "Sayıları koru", "İptal"]
  };
  var t = strings[document.documentElement.lang.split("-")[0]] || strings.en;
  var applied = unit.value, pending = "";
  var originals = form.cbmOriginals = [null, null, null];
  var panel = document.createElement("div");
  panel.className = "calculator-unit-choice";
  panel.hidden = true;
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-labelledby", "calculator-unit-question");
  var prompt = document.createElement("p");
  prompt.id = "calculator-unit-question";
  var actions = document.createElement("div");
  actions.className = "calculator-unit-actions";
  panel.append(prompt, actions);
  function announceUnits() {
    badges.forEach(function (b) { b.textContent = applied; });
  }
  function refresh() { form.dispatchEvent(new Event("input", { bubbles: true })); }
  function complete(mode) {
    if (!pending) return;
    if (mode === "convert") {
      if (!canConvert()) return;
      dims.forEach(function (f, i) {
        if (originals[i] !== null) {
          f.value = originals[i];
          originals[i] = null;
        } else if (f.value) {
          originals[i] = f.value;
          f.value = Number((applied === "cm" ? f.valueAsNumber / 2.54 : f.valueAsNumber * 2.54).toPrecision(12));
        }
      });
    } else if (mode === "keep") originals.fill(null);
    if (mode !== "cancel") applied = pending;
    unit.value = applied;
    pending = "";
    form.removeAttribute("data-unit-pending");
    submit.disabled = false;
    panel.hidden = true;
    announceUnits();
    refresh();
    saveEntry();
    unit.focus();
  }
  var buttons = ["convert", "keep", "cancel"].map(function (mode, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = index === 0 ? "calculator-button" : "calculator-secondary-button";
    btn.dataset.unitAction = mode;
    btn.textContent = t[index + 1];
    btn.addEventListener("click", function () { complete(mode); });
    actions.appendChild(btn);
    return btn;
  });
  function canConvert() {
    return dims.every(function (f) {
      if (f.validity.badInput) return false;
      if (!f.value) return true;
      var n = f.valueAsNumber;
      var converted = applied === "cm" ? n / 2.54 : n * 2.54;
      return Number.isFinite(converted) && (!n || converted !== 0);
    });
  }
  unit.addEventListener("input", function (e) { e.stopPropagation(); });
  unit.addEventListener("change", function () {
    var target = unit.value;
    if (target === applied) return;
    if (!dims.some(function (f) { return f.value !== "" || f.validity.badInput; })) {
      if (pending) complete("cancel");
      originals.fill(null);
      applied = target;
      unit.value = target;
      announceUnits();
      refresh();
      return;
    }
    pending = target;
    unit.value = applied;
    prompt.textContent = t[0].replace("{a}", "\u2066" + applied + "\u2069").replace("{b}", "\u2066" + pending + "\u2069");
    form.setAttribute("data-unit-pending", prompt.textContent);
    submit.disabled = true;
    buttons[0].disabled = !canConvert();
    unit.closest(".calculator-field").after(panel);
    panel.hidden = false;
    refresh();
    buttons[buttons[0].disabled ? 1 : 0].focus();
  });
  form.addEventListener("input", function (e) {
    var i = dims.indexOf(e.target);
    if (i < 0) return;
    originals[i] = null;
    if (pending) buttons[0].disabled = !canConvert();
  }, true);
  form.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pending) { e.preventDefault(); complete("cancel"); }
  });
  // 仅随本条浏览历史保留手算数字，不保存产品、备注、文件或联系方式。
  var key = "jabbarQuickDimensionsV1";
  var numeric = dims.concat([form.elements.qty, form.elements.weight]);
  var timer, restoring = false;
  function saveEntry() {
    clearTimeout(timer);
    window.removeEventListener("beforeunload", saveEntry);
    if (restoring) return;
    var values = numeric.map(function (f) { return f.value; });
    try {
      var draft = { unit: applied, values: values };
      if (originals.some(Boolean)) draft.originals = originals;
      var state = history.state || {};
      if (JSON.stringify(state[key]) === JSON.stringify(draft)) return;
      var next = Object.assign({}, state);
      next[key] = draft;
      history.replaceState(next, "");
    } catch (ignored) { /* 不支持历史存储时仍可使用本页计算。 */ }
  }
  function readEntry() {
    var d = history.state && history.state[key];
    if (!d || (d.unit !== "cm" && d.unit !== "in") || !Array.isArray(d.values) || d.values.length !== numeric.length) return null;
    return d.values.every(function (v) { return typeof v === "string" && (v === "" || Number.isFinite(Number(v))); }) ? d : null;
  }
  function applyEntry(d) {
    pending = "";
    dims.forEach(function (f, i) {
      var v = d && d.originals && d.originals[i];
      originals[i] = typeof v === "string" && v && Number.isFinite(Number(v)) ? v : null;
    });
    panel.hidden = true;
    if (d) numeric.forEach(function (f, index) { f.value = d.values[index]; });
    applied = d ? d.unit : (unit.value === "in" ? "in" : "cm");
    unit.value = applied;
    announceUnits();
    unit.disabled = submit.disabled = false;
    form.removeAttribute("data-unit-pending");
    refresh();
  }
  function resumesEntry() {
    var nav = performance.getEntriesByType("navigation")[0];
    if (nav) return nav.type === "back_forward" || nav.type === "reload";
    var type = performance.navigation && performance.navigation.type;
    return type === 2 || type === 1;
  }
  // 新打开的网址不恢复旧记录。
  var saved = resumesEntry() && readEntry();
  if (saved) applyEntry(saved);
  form.addEventListener("change", saveEntry);
  form.addEventListener("input", function (e) {
    if (restoring || numeric.indexOf(e.target) < 0) return;
    window.addEventListener("beforeunload", saveEntry);
    clearTimeout(timer);
    timer = setTimeout(saveEntry, 250);
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a[href]")) saveEntry();
  }, true);
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveEntry(); });
  window.addEventListener("pagehide", saveEntry);
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted && !resumesEntry()) return;
    var entry = readEntry();
    // 等浏览器填完表单再发布结果。
    restoring = true;
    unit.disabled = submit.disabled = true;
    form.setAttribute("data-unit-pending", "");
    refresh();
    setTimeout(function () { applyEntry(entry); restoring = false; }, 0);
  });
  announceUnits();
  unit.disabled = false;
})();

// 重排已有节点，确保朗读、链接焦点和屏幕上的顺序相符。
(function () {
  function initResultLayout() {
    var results = document.querySelector(".calculator-results");
    if (!results) return;
    var visual = results.querySelector(".cbm-visual");
    var grid = results.querySelector(".calculator-result-grid");
    var link = results.querySelector(".calculator-inquiry-cta");
    if (!visual || !grid || !link) return;
    var total = grid.querySelector("[data-total-cbm]").closest(".calculator-result-card");
    var buffered = grid.querySelector("[data-buffer-cbm]").closest(".calculator-result-card");
    var originalNext = buffered.nextElementSibling;
    var primary = document.createElement("div");
    primary.className = "calculator-primary-metrics";
    var narrow = window.matchMedia("(max-width: 767px)");
    function arrange() {
      var focused = document.activeElement === link;
      if (narrow.matches && !primary.isConnected) {
        primary.append(total, buffered);
        visual.before(primary, link);
      } else if (!narrow.matches && primary.isConnected) {
        grid.insertBefore(total, originalNext);
        grid.insertBefore(buffered, originalNext);
        primary.remove();
        results.appendChild(link);
      }
      if (focused && document.activeElement !== link) link.focus({ preventScroll: true });
    }
    arrange();
    if (narrow.addEventListener) narrow.addEventListener("change", arrange);
    else narrow.addListener(arrange);
  }
  if (document.readyState === "loading" || !document.querySelector(".calculator-results .calculator-inquiry-cta"))
    document.addEventListener("DOMContentLoaded", initResultLayout, { once: true });
  else initResultLayout();
})();
