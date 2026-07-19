(function () {
  "use strict";

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: ["语言", "返回顶部", "关闭提示", "已从体积工具带入计算结果，请确认并补充询盘信息。"],
    en: ["Language", "Back to top", "Dismiss notice", "Your calculator result has been added. Review it and complete your inquiry."],
    es: ["Idioma", "Volver arriba", "Cerrar aviso", "El resultado de la calculadora se ha añadido. Revísalo y completa tu solicitud."],
    ar: ["اللغة", "العودة إلى الأعلى", "إغلاق التنبيه", "تمت إضافة نتيجة الحاسبة. راجعها وأكمل تفاصيل طلبك."],
    fr: ["Langue", "Retour en haut", "Fermer l’avis", "Le résultat du calculateur a été ajouté. Vérifiez-le et complétez votre demande."],
    pt: ["Idioma", "Voltar ao topo", "Fechar aviso", "O resultado da calculadora foi adicionado. Revise e complete sua consulta."],
    ru: ["Язык", "Наверх", "Закрыть уведомление", "Результат расчета добавлен. Проверьте его и заполните запрос."],
    de: ["Sprache", "Nach oben", "Hinweis schließen", "Das Rechnergebnis wurde übernommen. Prüfen und vervollständigen Sie Ihre Anfrage."],
    it: ["Lingua", "Torna su", "Chiudi avviso", "Il risultato del calcolatore è stato aggiunto. Controllalo e completa la richiesta."],
    tr: ["Dil", "Başa dön", "Bildirimi kapat", "Hesaplama sonucu eklendi. Sonucu kontrol edip talebinizi tamamlayın."]
  };
  var copy = labels[lang] || labels.en;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function initCalculatorPrefillNotice() {
    var form = document.querySelector('.js-inquiry-form[data-calculator-prefill="true"]');
    if (!form || form.querySelector(".calculator-prefill-notice")) return;
    var notice = element("div", "calculator-prefill-notice");
    notice.setAttribute("role", "status");
    var dismiss = element("button", "calculator-prefill-notice-dismiss", "×");
    dismiss.type = "button";
    dismiss.setAttribute("aria-label", copy[2]);
    dismiss.title = copy[2];
    dismiss.addEventListener("click", function () { notice.remove(); });
    notice.appendChild(element("span", "calculator-prefill-notice-text", copy[3]));
    notice.appendChild(dismiss);
    form.insertBefore(notice, form.firstChild);
  }

  function routeForLocale(locale) {
    var path = window.location.pathname
      .replace(/\/index\.html$/, "/")
      .replace(/^\/(?:en|es|ar|fr|pt|ru|de|it|tr)(?=\/)/, "");
    var prefix = locale === "zh" ? "" : "/" + locale;
    if (/\/inquiry\/$/.test(path)) return prefix + "/inquiry/";
    if (/\/calculator\/$/.test(path)) return prefix + "/calculator/";
    if (/\/website-privacy-policy\.html$/.test(path)) return prefix + "/website-privacy-policy.html";
    return prefix + "/";
  }

  function initFooterTools() {
    var footerInner = document.querySelector(".site-footer-inner");
    if (!footerInner || footerInner.querySelector(".site-footer-tools")) return;
    var languages = [
      ["zh", "中文"], ["en", "English"], ["es", "Español"], ["ar", "العربية"], ["fr", "Français"],
      ["pt", "Português"], ["ru", "Русский"], ["de", "Deutsch"], ["it", "Italiano"], ["tr", "Türkçe"]
    ];
    var tools = element("div", "site-footer-tools");
    var languageControl = element("label", "site-footer-language");
    var select = element("select", "site-footer-language-select");
    select.setAttribute("aria-label", copy[0]);
    languages.forEach(function (item) {
      var option = element("option", "", item[1]);
      option.value = item[0];
      option.selected = item[0] === lang;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      var destination = routeForLocale(select.value);
      if (destination !== window.location.pathname) window.location.assign(destination);
    });
    languageControl.appendChild(element("span", "site-footer-language-label", copy[0]));
    languageControl.appendChild(select);
    var backToTop = element("button", "site-footer-backtop", copy[1]);
    backToTop.type = "button";
    backToTop.addEventListener("click", function () {
      var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
    tools.appendChild(languageControl);
    tools.appendChild(backToTop);
    var contacts = footerInner.querySelector(".bottom-contact-block");
    if (contacts) footerInner.insertBefore(tools, contacts);
    else footerInner.appendChild(tools);
  }

  initCalculatorPrefillNotice();
  initFooterTools();
})();
