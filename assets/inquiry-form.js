(function () {
  "use strict";

  var FIELD_NAMES = [
    "product",
    "category",
    "quantity",
    "budget",
    "market",
    "contact",
    "company",
    "note"
  ];

  var MESSAGES = {
    zh: {
      privacyError: "直接提交前，请先同意《隐私政策》。",
      verifyError: "请完成安全验证。",
      sending: "正在安全提交…",
      success: "提交成功。我们会尽快与您联系。",
      accepted: "已受理，正在确认发送结果，请勿重复提交。",
      pending: "该询盘正在处理中，请几秒后重试。",
      conflict: "内容已更改，请重新提交。",
      rateLimit: "提交过于频繁，请稍后重试。",
      genericError: "暂时无法直接提交。请稍后重试，或使用下方其他联系方式。"
    },
    en: {
      privacyError: "Please agree to the Privacy Policy before submitting directly.",
      verifyError: "Please complete the security check.",
      sending: "Submitting securely…",
      success: "Submitted successfully. We will contact you soon.",
      accepted: "Accepted. We are confirming delivery; please do not submit again.",
      pending: "This inquiry is already being processed. Try again in a few seconds.",
      conflict: "The content changed. Please submit again.",
      rateLimit: "Too many attempts. Please try again later.",
      genericError: "Direct submission is temporarily unavailable. Try again later or use a contact option below."
    },
    es: {
      privacyError: "Antes de enviarla directamente, acepta la Política de privacidad.",
      verifyError: "Completa la verificación de seguridad.",
      sending: "Enviando de forma segura…",
      success: "Solicitud enviada. Nos pondremos en contacto pronto.",
      accepted: "Solicitud aceptada. Estamos confirmando el envío; no la envíes de nuevo.",
      pending: "Esta solicitud ya se está procesando. Inténtalo de nuevo en unos segundos.",
      conflict: "El contenido ha cambiado. Vuelve a enviar la solicitud.",
      rateLimit: "Demasiados intentos. Inténtalo de nuevo más tarde.",
      genericError: "El envío directo no está disponible temporalmente. Inténtalo más tarde o usa una opción de contacto de abajo."
    },
    ar: {
      privacyError: "يرجى الموافقة على سياسة الخصوصية قبل إرسال الطلب مباشرةً.",
      verifyError: "يرجى إكمال التحقق الأمني.",
      sending: "جارٍ الإرسال بأمان…",
      success: "تم الإرسال بنجاح. سنتواصل معك قريبًا.",
      accepted: "تم قبول الطلب، ويجري التحقق من وصوله. يرجى عدم إرساله مجددًا.",
      pending: "هذا الطلب قيد المعالجة بالفعل. حاول مجددًا بعد بضع ثوانٍ.",
      conflict: "تغيّر المحتوى. يرجى إرسال الطلب مجددًا.",
      rateLimit: "محاولات كثيرة جدًا. حاول مجددًا لاحقًا.",
      genericError: "الإرسال المباشر غير متاح مؤقتًا. حاول لاحقًا أو استخدم أحد خيارات التواصل أدناه."
    },
    fr: {
      privacyError: "Veuillez accepter la Politique de confidentialité avant l’envoi direct.",
      verifyError: "Veuillez effectuer la vérification de sécurité.",
      sending: "Envoi sécurisé en cours…",
      success: "Demande envoyée. Nous vous contacterons bientôt.",
      accepted: "Demande acceptée. Nous vérifions sa bonne transmission ; ne la renvoyez pas.",
      pending: "Cette demande est déjà en cours de traitement. Réessayez dans quelques secondes.",
      conflict: "Le contenu a changé. Veuillez renvoyer la demande.",
      rateLimit: "Trop de tentatives. Veuillez réessayer plus tard.",
      genericError: "L’envoi direct est temporairement indisponible. Réessayez plus tard ou utilisez une option de contact ci-dessous."
    },
    pt: {
      privacyError: "Aceite a Política de Privacidade antes do envio direto.",
      verifyError: "Complete a verificação de segurança.",
      sending: "Enviando com segurança…",
      success: "Solicitação enviada. Entraremos em contato em breve.",
      accepted: "Solicitação aceita. Estamos confirmando o envio; não envie novamente.",
      pending: "Esta solicitação já está sendo processada. Tente novamente em alguns segundos.",
      conflict: "O conteúdo mudou. Envie a solicitação novamente.",
      rateLimit: "Muitas tentativas. Tente novamente mais tarde.",
      genericError: "O envio direto está temporariamente indisponível. Tente mais tarde ou use uma opção de contato abaixo."
    },
    ru: {
      privacyError: "Перед прямой отправкой согласитесь с Политикой конфиденциальности.",
      verifyError: "Пройдите проверку безопасности.",
      sending: "Безопасная отправка…",
      success: "Запрос успешно отправлен. Мы скоро свяжемся с вами.",
      accepted: "Запрос принят. Проверяем доставку сообщения; не отправляйте его повторно.",
      pending: "Этот запрос уже обрабатывается. Повторите попытку через несколько секунд.",
      conflict: "Содержимое изменилось. Отправьте запрос еще раз.",
      rateLimit: "Слишком много попыток. Повторите попытку позже.",
      genericError: "Прямая отправка временно недоступна. Повторите попытку позже или выберите способ связи ниже."
    },
    de: {
      privacyError: "Bitte stimmen Sie vor dem direkten Senden der Datenschutzerklärung zu.",
      verifyError: "Bitte schließen Sie die Sicherheitsprüfung ab.",
      sending: "Wird sicher gesendet…",
      success: "Erfolgreich gesendet. Wir melden uns in Kürze.",
      accepted: "Anfrage angenommen. Die Zustellung wird bestätigt; bitte nicht erneut senden.",
      pending: "Diese Anfrage wird bereits bearbeitet. Versuchen Sie es in einigen Sekunden erneut.",
      conflict: "Der Inhalt hat sich geändert. Bitte senden Sie die Anfrage erneut.",
      rateLimit: "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
      genericError: "Direktes Senden ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut oder nutzen Sie eine der untenstehenden Kontaktmöglichkeiten."
    },
    it: {
      privacyError: "Prima dell’invio diretto, accetta l’Informativa sulla privacy.",
      verifyError: "Completa la verifica di sicurezza.",
      sending: "Invio sicuro in corso…",
      success: "Richiesta inviata. Ti contatteremo presto.",
      accepted: "Richiesta accettata. Stiamo confermando l’invio; non inviarla di nuovo.",
      pending: "Questa richiesta è già in elaborazione. Riprova tra qualche secondo.",
      conflict: "Il contenuto è cambiato. Invia di nuovo la richiesta.",
      rateLimit: "Troppi tentativi. Riprova più tardi.",
      genericError: "L’invio diretto è temporaneamente non disponibile. Riprova più tardi o usa una delle opzioni di contatto qui sotto."
    },
    tr: {
      privacyError: "Doğrudan göndermeden önce Gizlilik Politikası’nı kabul edin.",
      verifyError: "Lütfen güvenlik kontrolünü tamamlayın.",
      sending: "Güvenli şekilde gönderiliyor…",
      success: "Başarıyla gönderildi. Yakında sizinle iletişime geçeceğiz.",
      accepted: "Talep kabul edildi; iletim doğrulanıyor. Lütfen tekrar göndermeyin.",
      pending: "Bu talep zaten işleniyor. Birkaç saniye sonra tekrar deneyin.",
      conflict: "İçerik değişti. Lütfen tekrar gönderin.",
      rateLimit: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
      genericError: "Doğrudan gönderim geçici olarak kullanılamıyor. Daha sonra tekrar deneyin veya aşağıdaki iletişim seçeneklerinden birini kullanın."
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

  function initializeForm(form) {
    if (form.getAttribute("data-direct-inquiry-ready") === "true") return;
    form.setAttribute("data-direct-inquiry-ready", "true");

    var locale = form.getAttribute("data-inquiry-locale") || "en";
    var messages = MESSAGES[locale] || MESSAGES.en;
    var endpoint = form.getAttribute("data-inquiry-endpoint") || "";
    var sourcePath = form.getAttribute("data-inquiry-source") || "";
    var privacyVersion = form.getAttribute("data-privacy-version") || "";
    var directButton = form.querySelector(".js-inquiry-direct");
    var privacyCheckbox = form.querySelector(".js-inquiry-privacy");
    var privacyError = form.querySelector(".js-inquiry-privacy-error");
    var status = form.querySelector(".inquiry-status");
    var turnstileElement = form.querySelector(".js-inquiry-turnstile");
    var widgetId = null;
    var turnstileToken = "";
    var currentSubmissionId = "";
    var submitting = false;

    if (!directButton || !privacyCheckbox || !turnstileElement || !endpoint || !sourcePath || !privacyVersion) {
      return;
    }

    function setStatus(message, tone) {
      if (!status) return;
      status.textContent = message || "";
      status.classList.remove("is-success", "is-error", "is-pending");
      if (tone) status.classList.add("is-" + tone);
    }

    function setPrivacyError(message) {
      if (privacyError) privacyError.textContent = message || "";
      privacyCheckbox.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function setSubmitting(value) {
      submitting = value;
      directButton.disabled = value;
      directButton.setAttribute("aria-busy", value ? "true" : "false");
    }

    function resetTurnstile() {
      turnstileToken = "";
      if (widgetId !== null && window.turnstile && typeof window.turnstile.reset === "function") {
        try { window.turnstile.reset(widgetId); } catch (error) {}
      }
    }

    function readValue(name) {
      var field = form.elements[name];
      return field ? String(field.value || "").trim() : "";
    }

    function contentKey() {
      return JSON.stringify(FIELD_NAMES.map(readValue).concat([locale, sourcePath, privacyVersion]));
    }

    function buildPayload() {
      if (!currentSubmissionId) currentSubmissionId = newSubmissionId();
      return {
        product: readValue("product"),
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
        turnstileToken: turnstileToken
      };
    }

    function completeSubmission(message, submittedContentKey, statusCode) {
      if (!submittedContentKey || contentKey() === submittedContentKey) form.reset();
      currentSubmissionId = "";
      setPrivacyError("");
      resetTurnstile();
      setStatus(message, "success");
      var analyticsParams = {
        method: "direct",
        status: Number(statusCode),
        locale: locale
      };
      if (typeof window.jabbarTrack === "function") {
        window.jabbarTrack("inquiry_submit", analyticsParams);
      } else if (typeof window.gtag === "function") {
        window.gtag("event", "inquiry_submit", analyticsParams);
      }
    }

    FIELD_NAMES.forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      field.addEventListener("input", function () {
        if (!submitting) currentSubmissionId = "";
        setStatus("", "");
      });
      field.addEventListener("change", function () {
        if (!submitting) currentSubmissionId = "";
        setStatus("", "");
      });
    });

    privacyCheckbox.addEventListener("change", function () {
      if (privacyCheckbox.checked) setPrivacyError("");
    });

    directButton.disabled = false;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitting) return;
      setPrivacyError("");
      setStatus("", "");

      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;
      if (!privacyCheckbox.checked) {
        setPrivacyError(messages.privacyError);
        privacyCheckbox.focus();
        return;
      }
      if (!turnstileToken) {
        setStatus(messages.verifyError, "error");
        return;
      }

      var payload;
      var submittedContentKey;
      try {
        payload = buildPayload();
        submittedContentKey = contentKey();
      } catch (error) {
        setStatus(messages.genericError, "error");
        return;
      }

      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timeoutId = controller ? window.setTimeout(function () { controller.abort(); }, 20000) : null;
      setSubmitting(true);
      setStatus(messages.sending, "pending");

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
          completeSubmission(messages.success, submittedContentKey, response.status);
          return;
        }
        if (response.status === 202) {
          completeSubmission(messages.accepted, submittedContentKey, response.status);
          return;
        }

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
            callback: function (token) {
              turnstileToken = String(token || "");
            },
            "expired-callback": function () {
              turnstileToken = "";
              setStatus(messages.verifyError, "error");
            },
            "timeout-callback": function () {
              turnstileToken = "";
              setStatus(messages.verifyError, "error");
            },
            "error-callback": function () {
              turnstileToken = "";
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
