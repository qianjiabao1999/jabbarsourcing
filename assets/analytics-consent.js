(function () {
  "use strict";

  if (window.jabbarAnalyticsConsent) return;

  var STORAGE_KEY = "jabbar.analyticsConsent.v1";
  var SESSION_DEFER_KEY = "jabbar.analyticsConsent.deferred";
  var POLICY_VERSION = "2026-07-19";
  var CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
  var AUTO_PROMPT_DELAY_MS = 1800;
  var GOOGLE_ID = "G-C6X14RZHNZ";
  var CLARITY_ID = "xgsjhmd527";
  var VALID_STATES = { granted: true, denied: true };
  var queuedEvents = [];
  var analyticsLoaded = false;
  var panel = null;
  var primaryAction = null;
  var lastFocusedElement = null;
  var autoPromptTimer = 0;
  var autoPromptInputEventsInstalled = false;
  var autoPromptTriggered = false;
  var inquiryForm = null;
  var inquiryFormFocused = false;

  var messages = {
    "zh": {
      title: "分析与隐私",
      body: "只有在您同意后，我们才会加载 Google Analytics 和 Microsoft Clarity，用于了解网站使用情况并改进体验。拒绝不会影响网站功能。",
      accept: "同意分析",
      reject: "拒绝",
      later: "稍后决定",
      privacy: "查看隐私政策",
      dialogLabel: "网站分析偏好"
    },
    "en": {
      title: "Analytics and privacy",
      body: "We load Google Analytics and Microsoft Clarity only after you agree. They help us understand website use and improve the experience. Declining will not affect site features.",
      accept: "Allow analytics",
      reject: "Decline",
      later: "Decide later",
      privacy: "View privacy policy",
      dialogLabel: "Website analytics preferences"
    },
    "es": {
      title: "Análisis y privacidad",
      body: "Solo cargamos Google Analytics y Microsoft Clarity después de que usted lo acepte. Nos ayudan a comprender el uso del sitio y mejorar la experiencia. Rechazarlos no afecta las funciones del sitio.",
      accept: "Permitir análisis",
      reject: "Rechazar",
      later: "Decidir después",
      privacy: "Ver política de privacidad",
      dialogLabel: "Preferencias de análisis del sitio"
    },
    "ar": {
      title: "التحليلات والخصوصية",
      body: "لن نحمّل Google Analytics وMicrosoft Clarity إلا بعد موافقتك. يساعداننا على فهم استخدام الموقع وتحسين التجربة، ولن يؤثر الرفض في وظائف الموقع.",
      accept: "السماح بالتحليلات",
      reject: "رفض",
      later: "القرار لاحقًا",
      privacy: "عرض سياسة الخصوصية",
      dialogLabel: "تفضيلات تحليلات الموقع"
    },
    "fr": {
      title: "Analyse et confidentialité",
      body: "Nous chargeons Google Analytics et Microsoft Clarity uniquement après votre accord. Ils nous aident à comprendre l’utilisation du site et à améliorer l’expérience. Refuser n’affecte pas les fonctions du site.",
      accept: "Autoriser l’analyse",
      reject: "Refuser",
      later: "Décider plus tard",
      privacy: "Voir la politique de confidentialité",
      dialogLabel: "Préférences d’analyse du site"
    },
    "pt": {
      title: "Análise e privacidade",
      body: "Só carregamos o Google Analytics e o Microsoft Clarity depois da sua autorização. Eles ajudam-nos a compreender a utilização do site e a melhorar a experiência. Recusar não afeta as funções do site.",
      accept: "Permitir análise",
      reject: "Recusar",
      later: "Decidir depois",
      privacy: "Ver política de privacidade",
      dialogLabel: "Preferências de análise do site"
    },
    "ru": {
      title: "Аналитика и конфиденциальность",
      body: "Мы загружаем Google Analytics и Microsoft Clarity только после вашего согласия. Они помогают понять, как используется сайт, и улучшить его. Отказ не влияет на функции сайта.",
      accept: "Разрешить аналитику",
      reject: "Отклонить",
      later: "Решить позже",
      privacy: "Политика конфиденциальности",
      dialogLabel: "Настройки аналитики сайта"
    },
    "de": {
      title: "Analyse und Datenschutz",
      body: "Wir laden Google Analytics und Microsoft Clarity erst nach Ihrer Zustimmung. Damit verstehen wir die Nutzung der Website und verbessern das Erlebnis. Eine Ablehnung beeinträchtigt keine Funktionen.",
      accept: "Analyse erlauben",
      reject: "Ablehnen",
      later: "Später entscheiden",
      privacy: "Datenschutzerklärung ansehen",
      dialogLabel: "Analyse-Einstellungen der Website"
    },
    "it": {
      title: "Analisi e privacy",
      body: "Carichiamo Google Analytics e Microsoft Clarity solo dopo il tuo consenso. Ci aiutano a capire l’uso del sito e a migliorare l’esperienza. Il rifiuto non influisce sulle funzioni del sito.",
      accept: "Consenti analisi",
      reject: "Rifiuta",
      later: "Decidi più tardi",
      privacy: "Vedi informativa sulla privacy",
      dialogLabel: "Preferenze di analisi del sito"
    },
    "tr": {
      title: "Analiz ve gizlilik",
      body: "Google Analytics ve Microsoft Clarity yalnızca onayınızdan sonra yüklenir. Site kullanımını anlamamıza ve deneyimi geliştirmemize yardımcı olurlar. Reddetmeniz site işlevlerini etkilemez.",
      accept: "Analize izin ver",
      reject: "Reddet",
      later: "Daha sonra karar ver",
      privacy: "Gizlilik politikasını görüntüle",
      dialogLabel: "Site analiz tercihleri"
    }
  };

  function languageKey() {
    var language = String(document.documentElement.lang || "en").toLowerCase();
    var shortCode = language.split("-")[0];
    return messages[shortCode] ? shortCode : "en";
  }

  var copy = messages[languageKey()];
  var consentState = readStoredState();

  function readStoredState() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return null;
      if (VALID_STATES[value]) {
        storeState(value);
        return value;
      }
      var record = JSON.parse(value);
      if (!record || !VALID_STATES[record.state] || typeof record.at !== "number") return null;
      if (record.policy !== POLICY_VERSION || Date.now() - record.at > CONSENT_TTL_MS || record.at > Date.now() + 60000) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return record.state;
    } catch (error) {
      return null;
    }
  }

  function storeState(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        state: value,
        at: Date.now(),
        policy: POLICY_VERSION
      }));
    } catch (error) {}
  }

  function readSessionDeferred() {
    try {
      return window.sessionStorage.getItem(SESSION_DEFER_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function setSessionDeferred(isDeferred) {
    try {
      if (isDeferred) window.sessionStorage.setItem(SESSION_DEFER_KEY, "1");
      else window.sessionStorage.removeItem(SESSION_DEFER_KEY);
    } catch (error) {}
  }

  function queueEvent(eventName, params) {
    if (!eventName || queuedEvents.length >= 40) return;
    queuedEvents.push([eventName, params || {}]);
  }

  function track(eventName, params) {
    if (consentState !== "granted" || !eventName) return;
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params || {});
      return;
    }
    queueEvent(eventName, params);
  }

  function flushQueuedEvents() {
    if (consentState !== "granted" || typeof window.gtag !== "function") return;
    var events = queuedEvents.slice();
    queuedEvents.length = 0;
    events.forEach(function (eventData) {
      window.gtag("event", eventData[0], eventData[1]);
    });
  }

  function appendExternalScript(id, source) {
    if (document.getElementById(id)) return;
    var script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = source;
    document.head.appendChild(script);
  }

  function loadAnalytics() {
    if (analyticsLoaded || consentState !== "granted") return;
    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
      };
      window.gtag("consent", "default", {
        ad_storage: "denied",
        analytics_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        wait_for_update: 500
      });
      window.gtag("consent", "update", {
        ad_storage: "denied",
        analytics_storage: "granted",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
      window.gtag("js", new Date());
      window.gtag("config", GOOGLE_ID, { anonymize_ip: true });
      appendExternalScript(
        "jabbar-google-analytics",
        "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GOOGLE_ID)
      );

      window.clarity = window.clarity || function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
      appendExternalScript(
        "jabbar-microsoft-clarity",
        "https://www.clarity.ms/tag/" + encodeURIComponent(CLARITY_ID)
      );
      window.clarity("consentv2", {
        ad_Storage: "denied",
        analytics_Storage: "granted"
      });

      analyticsLoaded = true;
      flushQueuedEvents();
    } catch (error) {
      analyticsLoaded = false;
    }
  }

  function clearKnownAnalyticsCookies() {
    var cookieNames = (document.cookie || "")
      .split(";")
      .map(function (entry) { return entry.split("=")[0].trim(); })
      .filter(function (name) {
        return /^(_ga|_gid|_gat|_clck|_clsk)/.test(name);
      });
    var host = window.location.hostname;
    var hostParts = host.split(".");
    var parentDomain = hostParts.length > 2 ? hostParts.slice(-2).join(".") : "";
    cookieNames.forEach(function (name) {
      document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax";
      if (host) {
        document.cookie = name + "=; Max-Age=0; path=/; domain=" + host + "; SameSite=Lax";
        document.cookie = name + "=; Max-Age=0; path=/; domain=." + host + "; SameSite=Lax";
      }
      if (parentDomain && parentDomain !== host) {
        document.cookie = name + "=; Max-Age=0; path=/; domain=." + parentDomain + "; SameSite=Lax";
      }
    });
  }

  function focusWithoutScroll(element) {
    if (!element || typeof element.focus !== "function") return;
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  function setPanelOpen(isOpen, shouldFocus) {
    if (!panel) return;
    panel.hidden = !isOpen;
    if (isOpen && shouldFocus) {
      lastFocusedElement = document.activeElement;
      focusWithoutScroll(primaryAction);
    } else if (!isOpen && lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      focusWithoutScroll(lastFocusedElement);
      lastFocusedElement = null;
    }
  }

  function clearAutomaticPromptTriggers() {
    if (autoPromptTimer) {
      window.clearTimeout(autoPromptTimer);
      autoPromptTimer = 0;
    }
    if (autoPromptInputEventsInstalled) {
      window.removeEventListener("wheel", handleAutomaticScrollIntent);
      window.removeEventListener("touchmove", handleAutomaticScrollIntent);
      document.removeEventListener("keydown", handleAutomaticScrollIntent);
      autoPromptInputEventsInstalled = false;
    }
  }

  function canShowAutomaticPanel() {
    return !consentState && !readSessionDeferred() && !inquiryFormFocused;
  }

  function maybeShowAutomaticPanel() {
    if (!autoPromptTriggered || !canShowAutomaticPanel() || !panel || !panel.hidden) return;
    setPanelOpen(true, false);
  }

  function triggerAutomaticPanel() {
    autoPromptTriggered = true;
    clearAutomaticPromptTriggers();
    maybeShowAutomaticPanel();
  }

  function handleAutomaticScrollIntent(event) {
    if (event.type === "wheel" && !event.deltaY) return;
    if (event.type === "keydown") {
      var scrollKeys = {
        ArrowDown: true,
        ArrowUp: true,
        End: true,
        Home: true,
        PageDown: true,
        PageUp: true,
        Spacebar: true,
        " ": true
      };
      if (!scrollKeys[event.key]) return;
      var target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))) return;
    }
    triggerAutomaticPanel();
  }

  function hidePanelForInquiryFocus() {
    inquiryFormFocused = true;
    if (!panel || panel.hidden) return;
    lastFocusedElement = null;
    setPanelOpen(false, false);
  }

  function syncInquiryFormFocus() {
    inquiryFormFocused = Boolean(inquiryForm && inquiryForm.contains(document.activeElement));
    if (inquiryFormFocused) hidePanelForInquiryFocus();
    else maybeShowAutomaticPanel();
  }

  function installInquiryFormGuard() {
    inquiryForm = document.querySelector(".js-inquiry-form");
    if (!inquiryForm) return;
    inquiryForm.addEventListener("focusin", hidePanelForInquiryFocus);
    inquiryForm.addEventListener("focusout", function () {
      window.setTimeout(syncInquiryFormFocus, 0);
    });
    syncInquiryFormFocus();
  }

  function installAutomaticPrompt() {
    if (consentState || readSessionDeferred()) return;
    autoPromptTimer = window.setTimeout(triggerAutomaticPanel, AUTO_PROMPT_DELAY_MS);
    window.addEventListener("wheel", handleAutomaticScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleAutomaticScrollIntent, { passive: true });
    document.addEventListener("keydown", handleAutomaticScrollIntent);
    autoPromptInputEventsInstalled = true;
  }

  function accept() {
    consentState = "granted";
    clearAutomaticPromptTriggers();
    setPanelOpen(false);
    setSessionDeferred(false);
    storeState(consentState);
    window.setTimeout(loadAnalytics, 0);
  }

  function reject() {
    var requiresReload = analyticsLoaded;
    consentState = "denied";
    clearAutomaticPromptTriggers();
    queuedEvents.length = 0;
    setPanelOpen(false);
    setSessionDeferred(false);
    storeState(consentState);
    try {
      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", {
          ad_storage: "denied",
          analytics_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied"
        });
      }
      clearKnownAnalyticsCookies();
    } catch (error) {}
    if (requiresReload) window.location.reload();
  }

  function decideLater() {
    clearAutomaticPromptTriggers();
    setSessionDeferred(true);
    setPanelOpen(false);
  }

  function addTextElement(parent, tagName, className, text) {
    var element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function addButton(parent, className, text, handler) {
    var button = addTextElement(parent, "button", className, text);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function installStyles() {
    if (document.getElementById("jabbar-analytics-consent-style")) return;
    var style = document.createElement("style");
    style.id = "jabbar-analytics-consent-style";
    style.textContent = [
      "#jabbar-analytics-consent{position:fixed;z-index:2147483000;left:50%;bottom:max(14px,env(safe-area-inset-bottom));width:min(760px,calc(100% - 28px));transform:translateX(-50%);font-family:Arial,Helvetica,sans-serif;color:#17243a}",
      "#jabbar-analytics-consent[hidden]{display:none!important}",
      ".jabbar-consent-card{border:1px solid rgba(15,118,110,.2);border-radius:20px;background:rgba(255,255,255,.98);box-shadow:0 6px 18px rgba(20,51,86,.08);padding:18px 20px;backdrop-filter:blur(16px)}",
      ".jabbar-consent-title{margin:0 0 6px;font-size:18px;line-height:1.35;font-weight:750;color:#12334d}",
      ".jabbar-consent-body{margin:0;font-size:14px;line-height:1.6;color:#43546a}",
      ".jabbar-consent-actions{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:15px}",
      ".jabbar-consent-actions button,.jabbar-consent-actions a{min-height:42px;border-radius:999px;padding:9px 16px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none}",
      ".jabbar-consent-accept{border:1px solid transparent;background-color:#0f766e;background-image:linear-gradient(135deg,#147ca6,#0f766e);color:#fff}",
      ".jabbar-consent-reject,.jabbar-consent-later{border:1px solid rgba(40,79,112,.2);background:#f6fafc;color:#24445f}",
      ".jabbar-consent-privacy{display:inline-flex;align-items:center;color:#116d77}",
      ".jabbar-consent-actions button:focus-visible,.jabbar-consent-actions a:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}",
      "@media(max-width:560px){.jabbar-consent-card{padding:16px;border-radius:18px}.jabbar-consent-title{font-size:17px}.jabbar-consent-body{font-size:13px}.jabbar-consent-actions{display:grid;grid-template-columns:1fr 1fr}.jabbar-consent-actions button{width:100%}.jabbar-consent-privacy{grid-column:1/-1;justify-content:center}.jabbar-consent-later{grid-column:1/-1}}",
      "@media(prefers-reduced-motion:reduce){#jabbar-analytics-consent{scroll-behavior:auto}}"
    ].join("");
    document.head.appendChild(style);
  }

  function renderControls() {
    if (document.getElementById("jabbar-analytics-consent")) return;
    installStyles();

    panel = document.createElement("section");
    panel.id = "jabbar-analytics-consent";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-label", copy.dialogLabel);
    panel.setAttribute("aria-live", "polite");
    panel.hidden = true;

    var card = document.createElement("div");
    card.className = "jabbar-consent-card";
    panel.appendChild(card);
    addTextElement(card, "h2", "jabbar-consent-title", copy.title);
    addTextElement(card, "p", "jabbar-consent-body", copy.body);

    var actions = document.createElement("div");
    actions.className = "jabbar-consent-actions";
    card.appendChild(actions);
    primaryAction = addButton(actions, "jabbar-consent-accept", copy.accept, accept);
    addButton(actions, "jabbar-consent-reject", copy.reject, reject);
    addButton(actions, "jabbar-consent-later", copy.later, decideLater);

    var privacyLink = addTextElement(actions, "a", "jabbar-consent-privacy", copy.privacy);
    privacyLink.href = languageKey() === "zh"
      ? "/website-privacy-policy.html"
      : "/" + languageKey() + "/website-privacy-policy.html";

    document.body.appendChild(panel);

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;
      var opener = target.closest("[data-analytics-consent-open]");
      if (!opener) return;
      event.preventDefault();
      setSessionDeferred(false);
      setPanelOpen(true, true);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) decideLater();
    });

    installInquiryFormGuard();
    installAutomaticPrompt();
  }

  window.jabbarTrack = track;
  window.jabbarAnalyticsConsent = {
    accept: accept,
    reject: reject,
    open: function () {
      setSessionDeferred(false);
      setPanelOpen(true, true);
    },
    getState: function () { return consentState; }
  };

  if (consentState === "granted") loadAnalytics();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderControls, { once: true });
  } else {
    renderControls();
  }
})();
