(function () {
  "use strict";

  var FIELD_NAMES = [
    "product",
    "referenceUrl",
    "category",
    "quantity",
    "budget",
    "market",
    "contact",
    "company",
    "note"
  ];

  var CALCULATOR_RESULT_KEY = "jabbarCalcResult";
  var CALCULATOR_RESULT_MAX_AGE = 2 * 60 * 60 * 1000;
  var ATTRIBUTION_KEY = "jabbarAttributionV1";
  var ATTRIBUTION_FIELDS = [
    "landing_path",
    "referrer_host",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content"
  ];
  var OPTIONAL_LABELS = {
    zh: "可选", en: "optional", es: "opcional", ar: "اختياري", fr: "facultatif",
    pt: "opcional", ru: "необязательно", de: "optional", it: "facoltativo", tr: "isteğe bağlı"
  };
  var MESSAGES = {
    zh: {
      privacyError: "直接提交前，请先同意《隐私政策》。",
      verifyError: "请完成安全验证。",
      sending: "正在安全提交…",
      sendingLabel: "提交中…",
      success: "我们已收到您的询盘，将在 24 小时内回复。",
      accepted: "我们已收到您的询盘，正在确认发送结果；请勿重复提交，我们会在 24 小时内回复。",
      pending: "该询盘正在处理中，请几秒后重试。",
      conflict: "内容已更改，请重新提交。",
      rateLimit: "提交过于频繁，请稍后重试。",
      genericError: "安全提交暂时不可用。请稍后重试，或通过页脚联系方式联系我们。"
    },
    en: {
      privacyError: "Please agree to the Privacy Policy before submitting directly.",
      verifyError: "Please complete the security check.",
      sending: "Submitting securely…",
      sendingLabel: "Submitting…",
      success: "We have received your inquiry and will reply within 24 hours.",
      accepted: "We have received your inquiry and are confirming delivery. Please do not submit again; we will reply within 24 hours.",
      pending: "This inquiry is already being processed. Try again in a few seconds.",
      conflict: "The content changed. Please submit again.",
      rateLimit: "Too many attempts. Please try again later.",
      genericError: "Secure submission is temporarily unavailable. Try again later or contact us through the page footer."
    },
    es: {
      privacyError: "Antes de enviarla directamente, acepta la Política de privacidad.",
      verifyError: "Completa la verificación de seguridad.",
      sending: "Enviando de forma segura…",
      sendingLabel: "Enviando…",
      success: "Hemos recibido tu solicitud y responderemos en un plazo de 24 horas.",
      accepted: "Hemos recibido tu solicitud y estamos confirmando el envío. No la envíes de nuevo; responderemos en un plazo de 24 horas.",
      pending: "Esta solicitud ya se está procesando. Inténtalo de nuevo en unos segundos.",
      conflict: "El contenido ha cambiado. Vuelve a enviar la solicitud.",
      rateLimit: "Demasiados intentos. Inténtalo de nuevo más tarde.",
      genericError: "El envío seguro no está disponible temporalmente. Inténtalo más tarde o contáctanos desde el pie de página."
    },
    ar: {
      privacyError: "يرجى الموافقة على سياسة الخصوصية قبل إرسال الطلب مباشرةً.",
      verifyError: "يرجى إكمال التحقق الأمني.",
      sending: "جارٍ الإرسال بأمان…",
      sendingLabel: "جارٍ الإرسال…",
      success: "لقد استلمنا طلبك وسنرد عليك خلال 24 ساعة.",
      accepted: "لقد استلمنا طلبك ونتحقق من وصوله. يرجى عدم إرساله مجددًا؛ سنرد عليك خلال 24 ساعة.",
      pending: "هذا الطلب قيد المعالجة بالفعل. حاول مجددًا بعد بضع ثوانٍ.",
      conflict: "تغيّر المحتوى. يرجى إرسال الطلب مجددًا.",
      rateLimit: "محاولات كثيرة جدًا. حاول مجددًا لاحقًا.",
      genericError: "الإرسال الآمن غير متاح مؤقتًا. حاول لاحقًا أو تواصل معنا عبر تذييل الصفحة."
    },
    fr: {
      privacyError: "Veuillez accepter la Politique de confidentialité avant l’envoi direct.",
      verifyError: "Veuillez effectuer la vérification de sécurité.",
      sending: "Envoi sécurisé en cours…",
      sendingLabel: "Envoi…",
      success: "Nous avons bien reçu votre demande et vous répondrons sous 24 heures.",
      accepted: "Nous avons bien reçu votre demande et vérifions sa transmission. Ne la renvoyez pas ; nous vous répondrons sous 24 heures.",
      pending: "Cette demande est déjà en cours de traitement. Réessayez dans quelques secondes.",
      conflict: "Le contenu a changé. Veuillez renvoyer la demande.",
      rateLimit: "Trop de tentatives. Veuillez réessayer plus tard.",
      genericError: "L’envoi sécurisé est temporairement indisponible. Réessayez plus tard ou contactez-nous via le pied de page."
    },
    pt: {
      privacyError: "Aceite a Política de Privacidade antes do envio direto.",
      verifyError: "Complete a verificação de segurança.",
      sending: "Enviando com segurança…",
      sendingLabel: "Enviando…",
      success: "Recebemos sua solicitação e responderemos em até 24 horas.",
      accepted: "Recebemos sua solicitação e estamos confirmando o envio. Não envie novamente; responderemos em até 24 horas.",
      pending: "Esta solicitação já está sendo processada. Tente novamente em alguns segundos.",
      conflict: "O conteúdo mudou. Envie a solicitação novamente.",
      rateLimit: "Muitas tentativas. Tente novamente mais tarde.",
      genericError: "O envio seguro está temporariamente indisponível. Tente mais tarde ou fale conosco pelo rodapé da página."
    },
    ru: {
      privacyError: "Перед прямой отправкой согласитесь с Политикой конфиденциальности.",
      verifyError: "Пройдите проверку безопасности.",
      sending: "Безопасная отправка…",
      sendingLabel: "Отправка…",
      success: "Мы получили ваш запрос и ответим в течение 24 часов.",
      accepted: "Мы получили ваш запрос и проверяем его доставку. Не отправляйте его повторно; мы ответим в течение 24 часов.",
      pending: "Этот запрос уже обрабатывается. Повторите попытку через несколько секунд.",
      conflict: "Содержимое изменилось. Отправьте запрос еще раз.",
      rateLimit: "Слишком много попыток. Повторите попытку позже.",
      genericError: "Безопасная отправка временно недоступна. Повторите попытку позже или свяжитесь с нами через контакты внизу страницы."
    },
    de: {
      privacyError: "Bitte stimmen Sie vor dem direkten Senden der Datenschutzerklärung zu.",
      verifyError: "Bitte schließen Sie die Sicherheitsprüfung ab.",
      sending: "Wird sicher gesendet…",
      sendingLabel: "Wird gesendet…",
      success: "Wir haben Ihre Anfrage erhalten und antworten innerhalb von 24 Stunden.",
      accepted: "Wir haben Ihre Anfrage erhalten und bestätigen gerade die Zustellung. Bitte senden Sie sie nicht erneut; wir antworten innerhalb von 24 Stunden.",
      pending: "Diese Anfrage wird bereits bearbeitet. Versuchen Sie es in einigen Sekunden erneut.",
      conflict: "Der Inhalt hat sich geändert. Bitte senden Sie die Anfrage erneut.",
      rateLimit: "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
      genericError: "Sicheres Senden ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut oder kontaktieren Sie uns über die Fußzeile."
    },
    it: {
      privacyError: "Prima dell’invio diretto, accetta l’Informativa sulla privacy.",
      verifyError: "Completa la verifica di sicurezza.",
      sending: "Invio sicuro in corso…",
      sendingLabel: "Invio…",
      success: "Abbiamo ricevuto la tua richiesta e risponderemo entro 24 ore.",
      accepted: "Abbiamo ricevuto la tua richiesta e ne stiamo confermando l’invio. Non inviarla di nuovo; risponderemo entro 24 ore.",
      pending: "Questa richiesta è già in elaborazione. Riprova tra qualche secondo.",
      conflict: "Il contenuto è cambiato. Invia di nuovo la richiesta.",
      rateLimit: "Troppi tentativi. Riprova più tardi.",
      genericError: "L’invio sicuro è temporaneamente non disponibile. Riprova più tardi o contattaci dal piè di pagina."
    },
    tr: {
      privacyError: "Doğrudan göndermeden önce Gizlilik Politikası’nı kabul edin.",
      verifyError: "Lütfen güvenlik kontrolünü tamamlayın.",
      sending: "Güvenli şekilde gönderiliyor…",
      sendingLabel: "Gönderiliyor…",
      success: "Talebinizi aldık ve 24 saat içinde yanıt vereceğiz.",
      accepted: "Talebinizi aldık ve iletimi doğruluyoruz. Lütfen tekrar göndermeyin; 24 saat içinde yanıt vereceğiz.",
      pending: "Bu talep zaten işleniyor. Birkaç saniye sonra tekrar deneyin.",
      conflict: "İçerik değişti. Lütfen tekrar gönderin.",
      rateLimit: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
      genericError: "Güvenli gönderim geçici olarak kullanılamıyor. Daha sonra tekrar deneyin veya sayfa alt bilgisinden bize ulaşın."
    }
  };

  function newSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("secure_random_unavailable");
    }
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map.call(bytes, function (value) {
      return value.toString(16).padStart(2, "0");
    }).join("");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
  }

  function parseResponse(response) {
    return response.json().catch(function () { return {}; });
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
    return {
      landing_path: safeLandingPath(record.landing_path || window.location.pathname),
      referrer_host: normalizeAttributionValue(record.referrer_host || "", 253).toLowerCase(),
      utm_source: normalizeAttributionValue(record.utm_source || "", 100),
      utm_medium: normalizeAttributionValue(record.utm_medium || "", 100),
      utm_campaign: normalizeAttributionValue(record.utm_campaign || "", 100),
      utm_term: normalizeAttributionValue(record.utm_term || "", 100),
      utm_content: normalizeAttributionValue(record.utm_content || "", 100)
    };
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
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (key) {
        attribution[key] = normalizeAttributionValue(query.get(key) || "", 100);
      });
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch (error) {}
    return attribution;
  }

  if (typeof window.jabbarCaptureAttribution !== "function") {
    window.jabbarCaptureAttribution = captureAttribution;
  }

  function initializeForm(form) {
    if (form.getAttribute("data-direct-inquiry-ready") === "true") return;
    form.setAttribute("data-direct-inquiry-ready", "true");

    var locale = form.getAttribute("data-inquiry-locale") || "en";
    var messages = MESSAGES[locale] || MESSAGES.en;
    var endpoint = form.getAttribute("data-inquiry-endpoint") || "";
    var sourcePath = form.getAttribute("data-inquiry-source") || "";
    var privacyVersion = form.getAttribute("data-privacy-version") || "";
    var directButton = form.querySelector(".js-inquiry-direct");
    var status = form.querySelector(".inquiry-status");
    var turnstileElement = form.querySelector(".js-inquiry-turnstile");
    var widgetId = null;
    var turnstileToken = "";
    var currentSubmissionId = "";
    var submitting = false;
    var formStarted = false;
    var nativeValidationTracked = false;
    var attribution = sanitizeAttribution(window.jabbarCaptureAttribution());

    if (!directButton || !turnstileElement || !endpoint || !sourcePath || !privacyVersion) {
      return;
    }

    var directButtonLabel = directButton.textContent;

    function analyticsParams(extra) {
      var params = {
        locale: locale,
        source_path: sourcePath
      };
      ATTRIBUTION_FIELDS.forEach(function (key) {
        params[key] = attribution[key] || "";
      });
      return Object.assign(params, extra || {});
    }

    function trackEvent(eventName, extra) {
      var params = analyticsParams(extra);
      if (typeof window.jabbarTrack === "function") {
        window.jabbarTrack(eventName, params);
      } else if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params);
      }
    }

    function boundedDuration(startedAt) {
      var elapsed = Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
      return Math.max(0, Math.min(60000, Math.round(elapsed)));
    }

    function trackSubmitError(errorCode, statusCode, stage, startedAt) {
      var normalizedCode = typeof errorCode === "string" && /^[a-z0-9_]{1,64}$/.test(errorCode)
        ? errorCode
        : "request_failed";
      trackEvent("inquiry_submit_error", {
        method: "direct",
        status: Number(statusCode) || 0,
        stage: stage,
        error_code: normalizedCode,
        duration_ms: boundedDuration(startedAt)
      });
    }

    function trackNativeValidationError() {
      if (nativeValidationTracked) return;
      nativeValidationTracked = true;
      trackSubmitError("native_validation", 0, "validation");
      window.setTimeout(function () { nativeValidationTracked = false; }, 0);
    }

    function decorateFieldLabels() {
      Array.prototype.forEach.call(form.querySelectorAll("label.field"), function (label) {
        if (label.querySelector(".field-label-marker")) return;
        var control = label.querySelector("input, select, textarea");
        var caption = label.firstElementChild;
        if (caption && caption.tagName !== "SPAN") caption = null;
        if (!control || !caption) return;
        var marker = document.createElement("small");
        marker.className = "field-label-marker";
        marker.setAttribute("aria-hidden", "true");
        if (control.required) {
          label.classList.add("is-required");
          marker.classList.add("is-required");
          marker.textContent = "*";
        } else {
          label.classList.add("is-optional");
          marker.textContent = "(" + (OPTIONAL_LABELS[locale] || OPTIONAL_LABELS.en) + ")";
        }
        caption.appendChild(marker);
      });
    }

    function consumeCalculatorResult() {
      var raw = null;
      try {
        raw = window.sessionStorage.getItem(CALCULATOR_RESULT_KEY);
        if (!raw) return;
        var result = JSON.parse(raw);
        var savedAt = Number(result && (result.savedAt || result.createdAt || result.timestamp));
        if (!Number.isFinite(savedAt)) return;
        if (savedAt < 1000000000000) savedAt *= 1000;
        var age = Date.now() - savedAt;
        if (age < -5 * 60 * 1000 || age > CALCULATOR_RESULT_MAX_AGE) return;

        var values = {
          product: result.product,
          quantity: result.quantity,
          note: result.note || result.message
        };
        ["product", "quantity", "note"].forEach(function (name) {
          var field = form.elements[name];
          var value = typeof values[name] === "string" ? values[name].trim() : "";
          if (!field || !value || String(field.value || "").trim()) return;
          var maximum = Number(field.getAttribute("maxlength"));
          field.value = Number.isFinite(maximum) && maximum > 0 ? value.slice(0, maximum) : value;
        });
      } catch (error) {
      } finally {
        if (raw !== null) {
          try { window.sessionStorage.removeItem(CALCULATOR_RESULT_KEY); } catch (error) {}
        }
      }
    }

    consumeCalculatorResult();

    decorateFieldLabels();

    function setStatus(message, tone) {
      if (!status) return;
      while (status.firstChild) status.removeChild(status.firstChild);
      status.classList.remove("is-success", "is-error", "is-pending");
      if (tone) status.classList.add("is-" + tone);
      if (!message) return;

      if (tone === "success") {
        var icon = document.createElement("span");
        icon.className = "inquiry-status-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "✓";
        var text = document.createElement("span");
        text.className = "inquiry-status-message";
        text.textContent = message;
        status.appendChild(icon);
        status.appendChild(text);
      } else {
        status.textContent = message;
      }

      window.requestAnimationFrame(function () {
        var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        try {
          status.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
        } catch (error) {
          status.scrollIntoView();
        }
        if (tone === "success" || tone === "error") {
          var activeElement = document.activeElement;
          var mayMoveFocus = !activeElement
            || activeElement === document.body
            || activeElement === document.documentElement
            || activeElement === directButton
            || activeElement === status;
          if (mayMoveFocus) {
            try { status.focus({ preventScroll: true }); } catch (error) { status.focus(); }
          }
        }
      });
    }

    function setSubmitting(value) {
      submitting = value;
      directButton.disabled = value || !turnstileToken;
      directButton.setAttribute("aria-busy", value ? "true" : "false");
      directButton.textContent = value ? messages.sendingLabel : directButtonLabel;
    }

    function resetTurnstile() {
      turnstileToken = "";
      directButton.disabled = true;
      if (widgetId !== null && window.turnstile && typeof window.turnstile.reset === "function") {
        try { window.turnstile.reset(widgetId); } catch (error) {}
      }
    }

    function readValue(name) {
      var field = form.elements[name];
      return field ? String(field.value || "").trim() : "";
    }

    function contentKey() {
      return JSON.stringify(FIELD_NAMES.map(readValue).concat([
        locale,
        sourcePath,
        privacyVersion,
        JSON.stringify(attribution)
      ]));
    }

    function buildPayload() {
      if (!currentSubmissionId) currentSubmissionId = newSubmissionId();
      return {
        product: readValue("product"),
        referenceUrl: readValue("referenceUrl"),
        category: readValue("category"),
        quantity: readValue("quantity"),
        budget: readValue("budget"),
        market: readValue("market"),
        contact: readValue("contact"),
        company: readValue("company"),
        note: readValue("note"),
        locale: locale,
        sourcePath: sourcePath,
        privacyAcknowledged: true,
        privacyVersion: privacyVersion,
        submissionId: currentSubmissionId,
        turnstileToken: turnstileToken,
        attribution: attribution
      };
    }

    function completeSubmission(message, submittedContentKey, statusCode, startedAt) {
      if (!submittedContentKey || contentKey() === submittedContentKey) form.reset();
      currentSubmissionId = "";
      resetTurnstile();
      setStatus(message, "success");
      trackEvent("inquiry_submit", {
        method: "direct",
        status: Number(statusCode),
        duration_ms: boundedDuration(startedAt)
      });
    }

    function markFormStart() {
      if (formStarted) return;
      formStarted = true;
      trackEvent("inquiry_form_start", { form_name: "sourcing_inquiry" });
    }

    FIELD_NAMES.forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      field.addEventListener("input", function () {
        markFormStart();
        if (!submitting) currentSubmissionId = "";
        setStatus("", "");
      });
      field.addEventListener("change", function () {
        markFormStart();
        if (!submitting) currentSubmissionId = "";
        setStatus("", "");
      });
    });

    form.addEventListener("invalid", function () {
      trackNativeValidationError();
    }, true);

    trackEvent("inquiry_view", { form_name: "sourcing_inquiry" });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitting) return;
      setStatus("", "");

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        trackNativeValidationError();
        return;
      }
      if (!turnstileToken) {
        setStatus(messages.verifyError, "error");
        trackSubmitError("turnstile_missing", 0, "turnstile");
        return;
      }

      var payload;
      var submittedContentKey;
      try {
        payload = buildPayload();
        submittedContentKey = contentKey();
      } catch (error) {
        setStatus(messages.genericError, "error");
        trackSubmitError("payload_build_failed", 0, "client");
        return;
      }

      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timeoutId = controller ? window.setTimeout(function () { controller.abort(); }, 20000) : null;
      var submissionStartedAt = Date.now();
      setSubmitting(true);
      setStatus(messages.sending, "pending");
      trackEvent("inquiry_submit_start", { method: "direct", duration_ms: 0 });

      fetch(endpoint, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      }).then(function (response) {
        return parseResponse(response).then(function (body) {
          return { response: response, body: body };
        });
      }).then(function (result) {
        var response = result.response;
        var body = result.body || {};

        if (response.status === 200 || response.status === 201) {
          completeSubmission(messages.success, submittedContentKey, response.status, submissionStartedAt);
          return;
        }
        if (response.status === 202) {
          completeSubmission(messages.accepted, submittedContentKey, response.status, submissionStartedAt);
          return;
        }

        trackSubmitError(body.error, response.status, "response", submissionStartedAt);
        resetTurnstile();
        if (response.status === 409 && body.error === "submission_in_progress") {
          var pendingRetryAfter = response.headers.get("Retry-After");
          setStatus(messages.pending + (pendingRetryAfter ? " (" + pendingRetryAfter + "s)" : ""), "pending");
          return;
        }
        if (response.status === 409 && body.error === "submission_id_conflict") {
          currentSubmissionId = "";
          setStatus(messages.conflict, "error");
          return;
        }
        if (response.status === 422) {
          setStatus(messages.verifyError, "error");
          return;
        }
        if (response.status === 429) {
          var retryAfter = response.headers.get("Retry-After");
          setStatus(messages.rateLimit + (retryAfter ? " (" + retryAfter + "s)" : ""), "error");
          return;
        }
        setStatus(messages.genericError, "error");
      }).catch(function () {
        resetTurnstile();
        setStatus(messages.genericError, "error");
        trackSubmitError("network_or_timeout", 0, "network", submissionStartedAt);
      }).finally(function () {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        if (submittedContentKey && contentKey() !== submittedContentKey) currentSubmissionId = "";
        setSubmitting(false);
      });
    });

    var renderAttempts = 0;
    function renderTurnstile() {
      if (window.turnstile && typeof window.turnstile.render === "function") {
        try {
          widgetId = window.turnstile.render(turnstileElement, {
            sitekey: turnstileElement.getAttribute("data-sitekey"),
            action: turnstileElement.getAttribute("data-action") || "turnstile-spin-v1",
            language: turnstileElement.getAttribute("data-language") || "auto",
            size: "flexible",
            theme: "auto",
            appearance: "interaction-only",
            callback: function (token) {
              turnstileToken = String(token || "");
              directButton.disabled = !turnstileToken;
            },
            "expired-callback": function () {
              turnstileToken = "";
              directButton.disabled = true;
              setStatus(messages.verifyError, "error");
            },
            "timeout-callback": function () {
              turnstileToken = "";
              directButton.disabled = true;
              setStatus(messages.verifyError, "error");
            },
            "error-callback": function () {
              turnstileToken = "";
              directButton.disabled = true;
              setStatus(messages.genericError, "error");
            }
          });
        } catch (error) {
          setStatus(messages.genericError, "error");
        }
        return;
      }
      renderAttempts += 1;
      if (renderAttempts < 20) {
        window.setTimeout(renderTurnstile, 250);
      } else {
        setStatus(messages.genericError, "error");
      }
    }

    renderTurnstile();
  }

  function initialize() {
    document.querySelectorAll(".js-inquiry-form").forEach(initializeForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
