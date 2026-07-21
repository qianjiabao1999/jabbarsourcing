(function () {
  "use strict";

  if (window.jabbarAnalyticsConsent) return;

  var STORAGE_KEY = "jabbar.analyticsConsent.v1";
  var SESSION_DEFER_KEY = "jabbar.analyticsConsent.deferred";
  var POLICY_VERSION = "2026-07-22";
  var CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
  var DECISION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var AUTO_PROMPT_DELAY_MS = 1800;
  var REGION_TIMEOUT_MS = 1200;
  var REGION_ENDPOINT = "/api/consent-region";
  var GOOGLE_ID = "G-C6X14RZHNZ";
  var CLARITY_ID = "xgsjhmd527";
  var VALID_STATES = { granted: true, denied: true, later: true };
  var VALID_REGION_POLICIES = { strict: true, "quiet-denied": true };
  var queuedEvents = [];
  var analyticsLoaded = false;
  var panel = null;
  var primaryAction = null;
  var rejectAction = null;
  var bodyText = null;
  var lastFocusedElement = null;
  var autoPromptTimer = 0;
  var autoPromptInputEventsInstalled = false;
  var autoPromptTriggered = false;
  var inquiryForm = null;
  var inquiryFormFocused = false;
  var regionPolicy = "strict";
  var regionResolved = false;
  var gpcActive = navigatorGlobalPrivacyControl();
  var userDecisionMade = false;

  var messages = {
    "zh": {
      title: "分析与隐私",
      body: "只有在您同意后，我们才会加载 Google Analytics 和 Microsoft Clarity，用于了解网站使用情况并改进体验。拒绝不会影响网站功能。",
      gpcBody: "您的浏览器已发送 Global Privacy Control (GPC) 信号。我们已关闭 Google Analytics 和 Microsoft Clarity；只要该信号保持开启，“同意分析”就不可用。",
      accept: "同意分析",
      reject: "拒绝",
      later: "稍后决定",
      privacy: "查看隐私政策",
      dialogLabel: "网站分析偏好"
    },
    "en": {
      title: "Analytics and privacy",
      body: "We load Google Analytics and Microsoft Clarity only after you agree. They help us understand website use and improve the experience. Declining will not affect site features.",
      gpcBody: "Your browser sent a Global Privacy Control (GPC) signal. Google Analytics and Microsoft Clarity are disabled, and analytics cannot be enabled while that signal remains active.",
      accept: "Allow analytics",
      reject: "Decline",
      later: "Decide later",
      privacy: "View privacy policy",
      dialogLabel: "Website analytics preferences"
    },
    "es": {
      title: "Análisis y privacidad",
      body: "Solo cargamos Google Analytics y Microsoft Clarity después de que usted lo acepte. Nos ayudan a comprender el uso del sitio y mejorar la experiencia. Rechazarlos no afecta las funciones del sitio.",
      gpcBody: "Su navegador ha enviado una señal Global Privacy Control (GPC). Google Analytics y Microsoft Clarity están desactivados y no pueden habilitarse mientras la señal permanezca activa.",
      accept: "Permitir análisis",
      reject: "Rechazar",
      later: "Decidir después",
      privacy: "Ver política de privacidad",
      dialogLabel: "Preferencias de análisis del sitio"
    },
    "ar": {
      title: "التحليلات والخصوصية",
      body: "لن نحمّل Google Analytics وMicrosoft Clarity إلا بعد موافقتك. يساعداننا على فهم استخدام الموقع وتحسين التجربة، ولن يؤثر الرفض في وظائف الموقع.",
      gpcBody: "أرسل متصفحك إشارة Global Privacy Control (GPC). تم تعطيل Google Analytics وMicrosoft Clarity، ولا يمكن تفعيل التحليلات ما دامت الإشارة نشطة.",
      accept: "السماح بالتحليلات",
      reject: "رفض",
      later: "القرار لاحقًا",
      privacy: "عرض سياسة الخصوصية",
      dialogLabel: "تفضيلات تحليلات الموقع"
    },
    "fr": {
      title: "Analyse et confidentialité",
      body: "Nous chargeons Google Analytics et Microsoft Clarity uniquement après votre accord. Ils nous aident à comprendre l’utilisation du site et à améliorer l’expérience. Refuser n’affecte pas les fonctions du site.",
      gpcBody: "Votre navigateur a envoyé un signal Global Privacy Control (GPC). Google Analytics et Microsoft Clarity sont désactivés et ne peuvent pas être activés tant que ce signal reste actif.",
      accept: "Autoriser l’analyse",
      reject: "Refuser",
      later: "Décider plus tard",
      privacy: "Voir la politique de confidentialité",
      dialogLabel: "Préférences d’analyse du site"
    },
    "pt": {
      title: "Análise e privacidade",
      body: "Só carregamos o Google Analytics e o Microsoft Clarity depois da sua autorização. Eles ajudam-nos a compreender a utilização do site e a melhorar a experiência. Recusar não afeta as funções do site.",
      gpcBody: "O seu navegador enviou um sinal Global Privacy Control (GPC). O Google Analytics e o Microsoft Clarity estão desativados e não podem ser ativados enquanto o sinal permanecer ativo.",
      accept: "Permitir análise",
      reject: "Recusar",
      later: "Decidir depois",
      privacy: "Ver política de privacidade",
      dialogLabel: "Preferências de análise do site"
    },
    "ru": {
      title: "Аналитика и конфиденциальность",
      body: "Мы загружаем Google Analytics и Microsoft Clarity только после вашего согласия. Они помогают понять, как используется сайт, и улучшить его. Отказ не влияет на функции сайта.",
      gpcBody: "Браузер передал сигнал Global Privacy Control (GPC). Google Analytics и Microsoft Clarity отключены и не могут быть включены, пока этот сигнал активен.",
      accept: "Разрешить аналитику",
      reject: "Отклонить",
      later: "Решить позже",
      privacy: "Политика конфиденциальности",
      dialogLabel: "Настройки аналитики сайта"
    },
    "de": {
      title: "Analyse und Datenschutz",
      body: "Wir laden Google Analytics und Microsoft Clarity erst nach Ihrer Zustimmung. Damit verstehen wir die Nutzung der Website und verbessern das Erlebnis. Eine Ablehnung beeinträchtigt keine Funktionen.",
      gpcBody: "Ihr Browser hat ein Global-Privacy-Control-Signal (GPC) gesendet. Google Analytics und Microsoft Clarity sind deaktiviert und können nicht aktiviert werden, solange dieses Signal aktiv bleibt.",
      accept: "Analyse erlauben",
      reject: "Ablehnen",
      later: "Später entscheiden",
      privacy: "Datenschutzerklärung ansehen",
      dialogLabel: "Analyse-Einstellungen der Website"
    },
    "it": {
      title: "Analisi e privacy",
      body: "Carichiamo Google Analytics e Microsoft Clarity solo dopo il tuo consenso. Ci aiutano a capire l’uso del sito e a migliorare l’esperienza. Il rifiuto non influisce sulle funzioni del sito.",
      gpcBody: "Il browser ha inviato un segnale Global Privacy Control (GPC). Google Analytics e Microsoft Clarity sono disattivati e non possono essere attivati finché il segnale resta attivo.",
      accept: "Consenti analisi",
      reject: "Rifiuta",
      later: "Decidi più tardi",
      privacy: "Vedi informativa sulla privacy",
      dialogLabel: "Preferenze di analisi del sito"
    },
    "tr": {
      title: "Analiz ve gizlilik",
      body: "Google Analytics ve Microsoft Clarity yalnızca onayınızdan sonra yüklenir. Site kullanımını anlamamıza ve deneyimi geliştirmemize yardımcı olurlar. Reddetmeniz site işlevlerini etkilemez.",
      gpcBody: "Tarayıcınız Global Privacy Control (GPC) sinyali gönderdi. Google Analytics ve Microsoft Clarity devre dışıdır ve bu sinyal etkin kaldığı sürece açılamaz.",
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
  var storedConsentState = readStoredState();
  var consentState = storedConsentState;

  function navigatorGlobalPrivacyControl() {
    try {
      return window.navigator.globalPrivacyControl === true;
    } catch (error) {
      return false;
    }
  }

  function resolveRegionPolicy() {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = window.setTimeout(function () {
        finish({ policy: "strict", gpc: false });
      }, REGION_TIMEOUT_MS);

      function finish(value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      }

      try {
        window.fetch(REGION_ENDPOINT, {
          method: "GET",
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          headers: { Accept: "application/json" }
        }).then(function (response) {
          if (!response.ok) throw new Error("consent region unavailable");
          return response.json();
        }).then(function (value) {
          if (!value || !VALID_REGION_POLICIES[value.policy] || typeof value.gpc !== "boolean") {
            throw new Error("invalid consent region response");
          }
          finish({ policy: value.policy, gpc: value.gpc });
        }).catch(function () {
          finish({ policy: "strict", gpc: false });
        });
      } catch (error) {
        finish({ policy: "strict", gpc: false });
      }
    });
  }

  function updatePanelForGlobalPrivacyControl() {
    if (!panel || !bodyText || !primaryAction) return;
    bodyText.textContent = gpcActive ? copy.gpcBody : copy.body;
    primaryAction.disabled = gpcActive;
    primaryAction.setAttribute("aria-disabled", gpcActive ? "true" : "false");
    if (gpcActive) panel.setAttribute("data-gpc-active", "true");
    else panel.removeAttribute("data-gpc-active");
  }

  function applyRegionPolicy(value) {
    regionPolicy = VALID_REGION_POLICIES[value.policy] ? value.policy : "strict";
    gpcActive = gpcActive || value.gpc === true;
    regionResolved = true;
    updatePanelForGlobalPrivacyControl();

    if (gpcActive) {
      consentState = "denied";
      queuedEvents.length = 0;
      clearAutomaticPromptTriggers();
      clearKnownAnalyticsCookies();
      return;
    }

    if (userDecisionMade) {
      if (consentState === "granted") window.setTimeout(loadAnalytics, 0);
      return;
    }

    if (storedConsentState) {
      consentState = storedConsentState;
      if (consentState === "granted") window.setTimeout(loadAnalytics, 0);
      return;
    }

    if (regionPolicy === "quiet-denied") {
      consentState = "denied";
      queuedEvents.length = 0;
      clearAutomaticPromptTriggers();
      return;
    }

    consentState = null;
    installAutomaticPrompt();
  }

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
      var stateTtl = record.state === "later" ? DECISION_TTL_MS : CONSENT_TTL_MS;
      if (record.policy !== POLICY_VERSION || Date.now() - record.at > stateTtl || record.at > Date.now() + 60000) {
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

  function isTerminalConsentState(state) {
    return state === "granted" || state === "denied" || state === "later";
  }

  function isActionBlocked() {
    return gpcActive || consentState === "denied";
  }

  function queueEvent(eventName, params) {
    if (!eventName) return;
    if (queuedEvents.length >= 40) queuedEvents.shift();
    queuedEvents.push([eventName, params || {}]);
  }

  function track(eventName, params) {
    if (!eventName || isActionBlocked()) return;
    if (consentState === "granted" && typeof window.gtag === "function") {
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
    if (analyticsLoaded || !regionResolved || gpcActive || consentState !== "granted") return;
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
      focusWithoutScroll(primaryAction && !primaryAction.disabled ? primaryAction : rejectAction);
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
    return regionResolved && regionPolicy === "strict" && !gpcActive
      && !isTerminalConsentState(consentState) && !readSessionDeferred() && !inquiryFormFocused;
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
    if (!regionResolved || regionPolicy !== "strict" || gpcActive
      || isTerminalConsentState(consentState) || readSessionDeferred()) return;
    autoPromptTimer = window.setTimeout(triggerAutomaticPanel, AUTO_PROMPT_DELAY_MS);
    window.addEventListener("wheel", handleAutomaticScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleAutomaticScrollIntent, { passive: true });
    document.addEventListener("keydown", handleAutomaticScrollIntent);
    autoPromptInputEventsInstalled = true;
  }

  function accept() {
    if (gpcActive) {
      consentState = "denied";
      queuedEvents.length = 0;
      updatePanelForGlobalPrivacyControl();
      return;
    }
    userDecisionMade = true;
    consentState = "granted";
    clearAutomaticPromptTriggers();
    setPanelOpen(false);
    setSessionDeferred(false);
    storeState(consentState);
    if (regionResolved) window.setTimeout(loadAnalytics, 0);
  }

  function reject() {
    var requiresReload = analyticsLoaded;
    userDecisionMade = true;
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
    userDecisionMade = true;
    consentState = "later";
    clearAutomaticPromptTriggers();
    storeState(consentState);
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
      ".jabbar-consent-actions button:disabled{cursor:not-allowed;opacity:.58;filter:saturate(.45)}",
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
    bodyText = addTextElement(card, "p", "jabbar-consent-body", copy.body);

    var actions = document.createElement("div");
    actions.className = "jabbar-consent-actions";
    card.appendChild(actions);
    primaryAction = addButton(actions, "jabbar-consent-accept", copy.accept, accept);
    rejectAction = addButton(actions, "jabbar-consent-reject", copy.reject, reject);
    addButton(actions, "jabbar-consent-later", copy.later, decideLater);

    var privacyLink = addTextElement(actions, "a", "jabbar-consent-privacy", copy.privacy);
    privacyLink.href = languageKey() === "zh"
      ? "/website-privacy-policy.html"
      : "/" + languageKey() + "/website-privacy-policy.html";

    document.body.appendChild(panel);
    updatePanelForGlobalPrivacyControl();

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
  }

  window.jabbarTrack = track;
  window.jabbarAnalyticsConsent = {
    accept: accept,
    reject: reject,
    open: function () {
      setSessionDeferred(false);
      setPanelOpen(true, true);
    },
    getState: function () { return consentState; },
    getRegionPolicy: function () { return regionPolicy; },
    isRegionResolved: function () { return regionResolved; },
    isGlobalPrivacyControlActive: function () { return gpcActive; }
  };

  function initialize() {
    renderControls();
    resolveRegionPolicy().then(applyRegionPolicy);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
