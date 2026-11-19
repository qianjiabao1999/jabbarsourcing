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
  var DRAFT_KEY = "jabbarInquiryDraftV1";
  var DRAFT_MAX_AGE = 30 * 60 * 1000;
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
      turnstileLoading: "正在加载安全验证…",
      turnstileChecking: "正在进行安全验证…",
      turnstileSlow: "安全验证耗时较长。请重试，或改用 WhatsApp。",
      turnstileUnavailable: "暂时无法完成安全验证。请重试，或改用 WhatsApp。",
      turnstileRetryLabel: "重试安全验证",
      verifyRetry: "安全验证已失效。请完成新的验证后再次提交。",
      whatsappFallback: "改用 WhatsApp",
      whatsappDetails: "打开 WhatsApp 会预填您已填写的产品、联系方式及其他询盘资料。发送前可核对或修改。",
      draftConfirmPrompt: "要清除所有已填写的内容和草稿吗？",
      draftConfirmLabel: "确认清除",
      draftCancelLabel: "取消",
      calculatorAdded: "已带入计算结果",
      calculatorReview: "查看或修改",
      calculatorDismiss: "关闭计算结果摘要",
      successAttachment: "用此询盘编号通过 WhatsApp 补发图片或 Excel 清单",
      referenceLabel: "询盘编号",
      success: "我们已收到您的询盘，将在 24 小时内回复。",
      accepted: "我们已收到您的询盘，正在确认发送结果；请勿重复提交，我们会在 24 小时内回复。",
      pending: "该询盘正在处理中，请几秒后重试。",
      conflict: "内容已更改，请重新提交。",
      rateLimit: "提交过于频繁，请稍后重试。",
      retryAfterUnit: "秒",
      genericError: "安全提交暂时不可用。请稍后重试，或通过页脚联系方式联系我们。"
    },
    en: {
      privacyError: "Please agree to the Privacy Policy before submitting directly.",
      verifyError: "Please complete the security check.",
      sending: "Submitting securely…",
      sendingLabel: "Submitting…",
      turnstileLoading: "Loading the security check…",
      turnstileChecking: "Running the security check…",
      turnstileSlow: "The security check is taking longer than expected. Retry or continue on WhatsApp.",
      turnstileUnavailable: "The security check could not be completed. Retry or continue on WhatsApp.",
      turnstileRetryLabel: "Retry security check",
      verifyRetry: "The security check expired. Complete the new check, then submit again.",
      whatsappFallback: "Continue on WhatsApp",
      whatsappDetails: "WhatsApp will open with your product, contact details and other inquiry information you entered. Review or edit the message before sending.",
      draftConfirmPrompt: "Clear all entered information and the saved draft?",
      draftConfirmLabel: "Confirm clear",
      draftCancelLabel: "Cancel",
      calculatorAdded: "Calculator result added",
      calculatorReview: "Review or edit",
      calculatorDismiss: "Dismiss calculator summary",
      successAttachment: "Send photos or an Excel list on WhatsApp with this reference",
      referenceLabel: "Inquiry reference",
      success: "We have received your inquiry and will reply within 24 hours.",
      accepted: "We have received your inquiry and are confirming delivery. Please do not submit again; we will reply within 24 hours.",
      pending: "This inquiry is already being processed. Try again in a few seconds.",
      conflict: "The content changed. Please submit again.",
      rateLimit: "Too many attempts. Please try again later.",
      retryAfterUnit: "sec",
      genericError: "Secure submission is temporarily unavailable. Try again later or contact us through the page footer."
    },
    es: {
      privacyError: "Antes de enviarla directamente, acepta la Política de privacidad.",
      verifyError: "Completa la verificación de seguridad.",
      sending: "Enviando de forma segura…",
      sendingLabel: "Enviando…",
      turnstileLoading: "Cargando la verificación de seguridad…",
      turnstileChecking: "Verificación de seguridad en curso…",
      turnstileSlow: "La verificación está tardando más de lo previsto. Inténtalo de nuevo o continúa por WhatsApp.",
      turnstileUnavailable: "No se pudo completar la verificación. Inténtalo de nuevo o continúa por WhatsApp.",
      turnstileRetryLabel: "Reintentar la verificación",
      verifyRetry: "La verificación de seguridad caducó. Completa la nueva verificación y vuelve a enviar.",
      whatsappFallback: "Continuar por WhatsApp",
      whatsappDetails: "WhatsApp se abrirá con el producto, los datos de contacto y demás información que hayas indicado. Revisa o edita el mensaje antes de enviarlo.",
      draftConfirmPrompt: "¿Borrar toda la información ingresada y el borrador guardado?",
      draftConfirmLabel: "Confirmar borrado",
      draftCancelLabel: "Cancelar",
      calculatorAdded: "Resultado de la calculadora añadido",
      calculatorReview: "Revisar o editar",
      calculatorDismiss: "Cerrar resumen del cálculo",
      successAttachment: "Enviar fotos o una lista de Excel por WhatsApp con esta referencia",
      referenceLabel: "Referencia de solicitud",
      success: "Hemos recibido tu solicitud y responderemos en un plazo de 24 horas.",
      accepted: "Hemos recibido tu solicitud y estamos confirmando el envío. No la envíes de nuevo; responderemos en un plazo de 24 horas.",
      pending: "Esta solicitud ya se está procesando. Inténtalo de nuevo en unos segundos.",
      conflict: "El contenido ha cambiado. Vuelve a enviar la solicitud.",
      rateLimit: "Demasiados intentos. Inténtalo de nuevo más tarde.",
      retryAfterUnit: "s",
      genericError: "El envío seguro no está disponible temporalmente. Inténtalo más tarde o contáctanos desde el pie de página."
    },
    ar: {
      privacyError: "يرجى الموافقة على سياسة الخصوصية قبل إرسال الطلب مباشرةً.",
      verifyError: "يرجى إكمال التحقق الأمني.",
      sending: "جارٍ الإرسال بأمان…",
      sendingLabel: "جارٍ الإرسال…",
      turnstileLoading: "جارٍ تحميل التحقق الأمني…",
      turnstileChecking: "التحقق الأمني قيد التنفيذ…",
      turnstileSlow: "استغرق التحقق الأمني وقتًا أطول من المتوقع. أعد المحاولة أو تابع عبر WhatsApp.",
      turnstileUnavailable: "تعذّر إكمال التحقق الأمني. أعد المحاولة أو تابع عبر WhatsApp.",
      turnstileRetryLabel: "إعادة محاولة التحقق الأمني",
      verifyRetry: "انتهت صلاحية التحقق الأمني. أكمل التحقق الجديد ثم أرسل الطلب مجددًا.",
      whatsappFallback: "المتابعة عبر WhatsApp",
      whatsappDetails: "سيفتح WhatsApp برسالة تتضمن بيانات المنتج والتواصل ومعلومات الطلب الأخرى التي أدخلتها. راجع الرسالة أو عدّلها قبل إرسالها.",
      draftConfirmPrompt: "هل تريد مسح كل المعلومات المدخلة والمسودة المحفوظة؟",
      draftConfirmLabel: "تأكيد المسح",
      draftCancelLabel: "إلغاء",
      calculatorAdded: "تمت إضافة نتيجة الحاسبة",
      calculatorReview: "مراجعة أو تعديل",
      calculatorDismiss: "إغلاق ملخص الحاسبة",
      successAttachment: "أرسل الصور أو قائمة Excel عبر WhatsApp مع هذا المرجع",
      referenceLabel: "مرجع الطلب",
      success: "لقد استلمنا طلبك وسنرد عليك خلال 24 ساعة.",
      accepted: "لقد استلمنا طلبك ونتحقق من وصوله. يرجى عدم إرساله مجددًا؛ سنرد عليك خلال 24 ساعة.",
      pending: "هذا الطلب قيد المعالجة بالفعل. حاول مجددًا بعد بضع ثوانٍ.",
      conflict: "تغيّر المحتوى. يرجى إرسال الطلب مجددًا.",
      rateLimit: "محاولات كثيرة جدًا. حاول مجددًا لاحقًا.",
      retryAfterUnit: "ث",
      genericError: "الإرسال الآمن غير متاح مؤقتًا. حاول لاحقًا أو تواصل معنا عبر تذييل الصفحة."
    },
    fr: {
      privacyError: "Veuillez accepter la Politique de confidentialité avant l’envoi direct.",
      verifyError: "Veuillez effectuer la vérification de sécurité.",
      sending: "Envoi sécurisé en cours…",
      sendingLabel: "Envoi…",
      turnstileLoading: "Chargement de la vérification de sécurité…",
      turnstileChecking: "Vérification de sécurité en cours…",
      turnstileSlow: "La vérification prend plus de temps que prévu. Réessayez ou continuez sur WhatsApp.",
      turnstileUnavailable: "La vérification n’a pas pu aboutir. Réessayez ou continuez sur WhatsApp.",
      turnstileRetryLabel: "Relancer la vérification",
      verifyRetry: "La vérification de sécurité a expiré. Effectuez la nouvelle vérification, puis renvoyez la demande.",
      whatsappFallback: "Continuer sur WhatsApp",
      whatsappDetails: "WhatsApp s’ouvrira avec le produit, vos coordonnées et les autres informations saisies. Vérifiez ou modifiez le message avant de l’envoyer.",
      draftConfirmPrompt: "Effacer toutes les informations saisies et le brouillon enregistré ?",
      draftConfirmLabel: "Confirmer l’effacement",
      draftCancelLabel: "Annuler",
      calculatorAdded: "Résultat du calculateur ajouté",
      calculatorReview: "Vérifier ou modifier",
      calculatorDismiss: "Fermer le résumé du calcul",
      successAttachment: "Envoyer des photos ou une liste Excel sur WhatsApp avec cette référence",
      referenceLabel: "Référence de la demande",
      success: "Nous avons bien reçu votre demande et vous répondrons sous 24 heures.",
      accepted: "Nous avons bien reçu votre demande et vérifions sa transmission. Ne la renvoyez pas ; nous vous répondrons sous 24 heures.",
      pending: "Cette demande est déjà en cours de traitement. Réessayez dans quelques secondes.",
      conflict: "Le contenu a changé. Veuillez renvoyer la demande.",
      rateLimit: "Trop de tentatives. Veuillez réessayer plus tard.",
      retryAfterUnit: "s",
      genericError: "L’envoi sécurisé est temporairement indisponible. Réessayez plus tard ou contactez-nous via le pied de page."
    },
    pt: {
      privacyError: "Aceite a Política de Privacidade antes do envio direto.",
      verifyError: "Complete a verificação de segurança.",
      sending: "Enviando com segurança…",
      sendingLabel: "Enviando…",
      turnstileLoading: "Carregando a verificação de segurança…",
      turnstileChecking: "Verificação de segurança em andamento…",
      turnstileSlow: "A verificação está demorando mais do que o esperado. Tente novamente ou continue no WhatsApp.",
      turnstileUnavailable: "Não foi possível concluir a verificação. Tente novamente ou continue no WhatsApp.",
      turnstileRetryLabel: "Tentar a verificação de novo",
      verifyRetry: "A verificação de segurança expirou. Conclua a nova verificação e envie novamente.",
      whatsappFallback: "Continuar no WhatsApp",
      whatsappDetails: "O WhatsApp abrirá com o produto, seus dados de contato e outras informações da consulta que você preencheu. Confira ou edite a mensagem antes de enviar.",
      draftConfirmPrompt: "Limpar todos os dados informados e o rascunho salvo?",
      draftConfirmLabel: "Confirmar exclusão",
      draftCancelLabel: "Cancelar",
      calculatorAdded: "Resultado da calculadora adicionado",
      calculatorReview: "Revisar ou editar",
      calculatorDismiss: "Fechar resumo do cálculo",
      successAttachment: "Enviar fotos ou uma lista do Excel pelo WhatsApp com esta referência",
      referenceLabel: "Referência da solicitação",
      success: "Recebemos sua solicitação e responderemos em até 24 horas.",
      accepted: "Recebemos sua solicitação e estamos confirmando o envio. Não envie novamente; responderemos em até 24 horas.",
      pending: "Esta solicitação já está sendo processada. Tente novamente em alguns segundos.",
      conflict: "O conteúdo mudou. Envie a solicitação novamente.",
      rateLimit: "Muitas tentativas. Tente novamente mais tarde.",
      retryAfterUnit: "s",
      genericError: "O envio seguro está temporariamente indisponível. Tente mais tarde ou fale conosco pelo rodapé da página."
    },
    ru: {
      privacyError: "Перед прямой отправкой согласитесь с Политикой конфиденциальности.",
      verifyError: "Пройдите проверку безопасности.",
      sending: "Безопасная отправка…",
      sendingLabel: "Отправка…",
      turnstileLoading: "Загрузка проверки безопасности…",
      turnstileChecking: "Выполняется проверка безопасности…",
      turnstileSlow: "Проверка длится дольше обычного. Повторите попытку или продолжите в WhatsApp.",
      turnstileUnavailable: "Не удалось завершить проверку. Повторите попытку или продолжите в WhatsApp.",
      turnstileRetryLabel: "Повторить проверку",
      verifyRetry: "Срок проверки безопасности истёк. Пройдите новую проверку и отправьте запрос ещё раз.",
      whatsappFallback: "Продолжить в WhatsApp",
      whatsappDetails: "WhatsApp откроется с данными о товаре, контактами и другой информацией, которую вы ввели. Проверьте или измените сообщение перед отправкой.",
      draftConfirmPrompt: "Удалить все введённые данные и сохранённый черновик?",
      draftConfirmLabel: "Подтвердить удаление",
      draftCancelLabel: "Отмена",
      calculatorAdded: "Результат расчёта добавлен",
      calculatorReview: "Проверить или изменить",
      calculatorDismiss: "Закрыть сводку расчёта",
      successAttachment: "Отправьте фото или список Excel в WhatsApp с этим номером запроса",
      referenceLabel: "Номер запроса",
      success: "Мы получили ваш запрос и ответим в течение 24 часов.",
      accepted: "Мы получили ваш запрос и проверяем его доставку. Не отправляйте его повторно; мы ответим в течение 24 часов.",
      pending: "Этот запрос уже обрабатывается. Повторите попытку через несколько секунд.",
      conflict: "Содержимое изменилось. Отправьте запрос еще раз.",
      rateLimit: "Слишком много попыток. Повторите попытку позже.",
      retryAfterUnit: "с",
      genericError: "Безопасная отправка временно недоступна. Повторите попытку позже или свяжитесь с нами через контакты внизу страницы."
    },
    de: {
      privacyError: "Bitte stimmen Sie vor dem direkten Senden der Datenschutzerklärung zu.",
      verifyError: "Bitte schließen Sie die Sicherheitsprüfung ab.",
      sending: "Wird sicher gesendet…",
      sendingLabel: "Wird gesendet…",
      turnstileLoading: "Sicherheitsprüfung wird geladen…",
      turnstileChecking: "Sicherheitsprüfung läuft…",
      turnstileSlow: "Die Sicherheitsprüfung dauert länger als erwartet. Versuchen Sie es erneut oder fahren Sie über WhatsApp fort.",
      turnstileUnavailable: "Die Sicherheitsprüfung konnte nicht abgeschlossen werden. Versuchen Sie es erneut oder fahren Sie über WhatsApp fort.",
      turnstileRetryLabel: "Sicherheitsprüfung wiederholen",
      verifyRetry: "Die Sicherheitsprüfung ist abgelaufen. Schließen Sie die neue Prüfung ab und senden Sie erneut.",
      whatsappFallback: "Über WhatsApp fortfahren",
      whatsappDetails: "WhatsApp öffnet sich mit Ihren Angaben zum Produkt, Ihren Kontaktdaten und weiteren eingegebenen Informationen. Prüfen oder bearbeiten Sie die Nachricht vor dem Senden.",
      draftConfirmPrompt: "Alle Eingaben und den gespeicherten Entwurf löschen?",
      draftConfirmLabel: "Löschen bestätigen",
      draftCancelLabel: "Abbrechen",
      calculatorAdded: "Rechnergebnis übernommen",
      calculatorReview: "Prüfen oder bearbeiten",
      calculatorDismiss: "Rechnergebnis ausblenden",
      successAttachment: "Fotos oder eine Excel-Liste mit dieser Anfragereferenz per WhatsApp senden",
      referenceLabel: "Anfragereferenz",
      success: "Wir haben Ihre Anfrage erhalten und antworten innerhalb von 24 Stunden.",
      accepted: "Wir haben Ihre Anfrage erhalten und bestätigen gerade die Zustellung. Bitte senden Sie sie nicht erneut; wir antworten innerhalb von 24 Stunden.",
      pending: "Diese Anfrage wird bereits bearbeitet. Versuchen Sie es in einigen Sekunden erneut.",
      conflict: "Der Inhalt hat sich geändert. Bitte senden Sie die Anfrage erneut.",
      rateLimit: "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
      retryAfterUnit: "Sek.",
      genericError: "Sicheres Senden ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut oder kontaktieren Sie uns über die Fußzeile."
    },
    it: {
      privacyError: "Prima dell’invio diretto, accetta l’Informativa sulla privacy.",
      verifyError: "Completa la verifica di sicurezza.",
      sending: "Invio sicuro in corso…",
      sendingLabel: "Invio…",
      turnstileLoading: "Caricamento della verifica di sicurezza…",
      turnstileChecking: "Verifica di sicurezza in corso…",
      turnstileSlow: "La verifica sta impiegando più tempo del previsto. Riprova o continua su WhatsApp.",
      turnstileUnavailable: "Non è stato possibile completare la verifica. Riprova o continua su WhatsApp.",
      turnstileRetryLabel: "Ripeti la verifica",
      verifyRetry: "La verifica di sicurezza è scaduta. Completa la nuova verifica e invia di nuovo.",
      whatsappFallback: "Continua su WhatsApp",
      whatsappDetails: "WhatsApp si aprirà con il prodotto, i recapiti e le altre informazioni della richiesta che hai inserito. Controlla o modifica il messaggio prima di inviarlo.",
      draftConfirmPrompt: "Cancellare tutte le informazioni inserite e la bozza salvata?",
      draftConfirmLabel: "Conferma cancellazione",
      draftCancelLabel: "Annulla",
      calculatorAdded: "Risultato del calcolatore aggiunto",
      calculatorReview: "Controlla o modifica",
      calculatorDismiss: "Chiudi riepilogo del calcolo",
      successAttachment: "Invia foto o un elenco Excel su WhatsApp con questo riferimento",
      referenceLabel: "Riferimento richiesta",
      success: "Abbiamo ricevuto la tua richiesta e risponderemo entro 24 ore.",
      accepted: "Abbiamo ricevuto la tua richiesta e ne stiamo confermando l’invio. Non inviarla di nuovo; risponderemo entro 24 ore.",
      pending: "Questa richiesta è già in elaborazione. Riprova tra qualche secondo.",
      conflict: "Il contenuto è cambiato. Invia di nuovo la richiesta.",
      rateLimit: "Troppi tentativi. Riprova più tardi.",
      retryAfterUnit: "s",
      genericError: "L’invio sicuro è temporaneamente non disponibile. Riprova più tardi o contattaci dal piè di pagina."
    },
    tr: {
      privacyError: "Doğrudan göndermeden önce Gizlilik Politikası’nı kabul edin.",
      verifyError: "Lütfen güvenlik kontrolünü tamamlayın.",
      sending: "Güvenli şekilde gönderiliyor…",
      sendingLabel: "Gönderiliyor…",
      turnstileLoading: "Güvenlik kontrolü yükleniyor…",
      turnstileChecking: "Güvenlik kontrolü yapılıyor…",
      turnstileSlow: "Güvenlik kontrolü beklenenden uzun sürüyor. Tekrar deneyin veya WhatsApp ile devam edin.",
      turnstileUnavailable: "Güvenlik kontrolü tamamlanamadı. Tekrar deneyin veya WhatsApp ile devam edin.",
      turnstileRetryLabel: "Güvenlik kontrolünü tekrarla",
      verifyRetry: "Güvenlik kontrolünün süresi doldu. Yeni kontrolü tamamlayıp tekrar gönderin.",
      whatsappFallback: "WhatsApp ile devam et",
      whatsappDetails: "WhatsApp, girdiğiniz ürün, iletişim ve diğer talep bilgileriyle açılır. Göndermeden önce mesajı kontrol edebilir veya düzenleyebilirsiniz.",
      draftConfirmPrompt: "Girilen tüm bilgiler ve kayıtlı taslak silinsin mi?",
      draftConfirmLabel: "Silme işlemini onayla",
      draftCancelLabel: "İptal",
      calculatorAdded: "Hesaplama sonucu eklendi",
      calculatorReview: "İncele veya düzenle",
      calculatorDismiss: "Hesaplama özetini kapat",
      successAttachment: "Fotoğraf veya Excel listesini bu referansla WhatsApp’tan gönderin",
      referenceLabel: "Talep referansı",
      success: "Talebinizi aldık ve 24 saat içinde yanıt vereceğiz.",
      accepted: "Talebinizi aldık ve iletimi doğruluyoruz. Lütfen tekrar göndermeyin; 24 saat içinde yanıt vereceğiz.",
      pending: "Bu talep zaten işleniyor. Birkaç saniye sonra tekrar deneyin.",
      conflict: "İçerik değişti. Lütfen tekrar gönderin.",
      rateLimit: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
      retryAfterUnit: "sn",
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

  function formatRetryAfter(value, unit) {
    var seconds = typeof value === "string" ? value.trim() : "";
    if (!/^\d+$/.test(seconds)) return "";
    return " (\u2068" + seconds + "\u2069 " + unit + ")";
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
    if (["/privacy-policy.html", "/website-privacy-policy.html", "/support.html", "/404.html"].indexOf(path) !== -1) return path;
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

  var TURNSTILE_API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=";
  var turnstileReadyPromise = null;
  var turnstileLoadAttempt = 0;
  var cancelTurnstileLoad = null;

  function loadTurnstileApi() {
    if (window.turnstile && typeof window.turnstile.render === "function") {
      return Promise.resolve(window.turnstile);
    }
    if (turnstileReadyPromise) return turnstileReadyPromise;

    turnstileReadyPromise = new Promise(function (resolve, reject) {
      var attempt = turnstileLoadAttempt++;
      var callbackName = "jabbarTurnstileApiReady" + (attempt ? attempt : "");
      var script = document.createElement("script");
      var settled = false;
      var timeoutId = window.setTimeout(function () {
        fail("turnstile_load_timeout");
      }, 30000);

      function cleanup() {
        settled = true;
        window.clearTimeout(timeoutId);
        delete window[callbackName];
        cancelTurnstileLoad = null;
      }

      function fail(code) {
        if (settled) return;
        cleanup();
        script.remove();
        turnstileReadyPromise = null;
        reject(new Error(code));
      }

      function finish() {
        if (settled) return;
        if (!window.turnstile || typeof window.turnstile.render !== "function") {
          fail("turnstile_api_unavailable");
          return;
        }
        cleanup();
        resolve(window.turnstile);
      }

      window[callbackName] = finish;
      cancelTurnstileLoad = function () { fail("turnstile_load_restarted"); };
      script.src = TURNSTILE_API_URL + callbackName;
      script.async = true;
      script.setAttribute("data-jabbar-turnstile-api", "true");
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", function () { fail("turnstile_load_failed"); }, { once: true });
      document.head.appendChild(script);
    });

    return turnstileReadyPromise;
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
    var verificationAttempt = 0;
    var verificationTimer = null;
    var turnstileToken = "";
    var currentSubmissionId = "";
    var submitting = false;
    var formStarted = false;
    var nativeValidationTracked = false;
    var attribution = sanitizeAttribution(window.jabbarCaptureAttribution());
    var additionalDetails = form.querySelector(".inquiry-additional-details");
    var draftPanel = form.querySelector(".inquiry-draft-panel");
    var draftNotice = form.querySelector(".inquiry-draft-notice");
    var draftClearButton = form.querySelector(".inquiry-draft-clear");
    var draftFeedback = form.querySelector(".inquiry-draft-feedback");
    var draftNoticeText = draftNotice ? draftNotice.textContent : "";
    var draftLastSignature = "";
    var draftLastSavedAt = 0;
    var draftStorageReadable = true;
    var draftRemovalPending = false;
    var draftExpiryTimer = null;
    var calculatorPrefilledFields = {};
    var calculatorResult = null;
    var calculatorNotice = null;
    var calculatorSummary = null;
    var calculatorVolumeFormat = null;
    var draftConfirmation = null;

    if (!directButton || !turnstileElement || !endpoint || !sourcePath || !privacyVersion) {
      return;
    }

    var directButtonLabel = directButton.textContent;
    form.setAttribute("data-calculator-summary", "true");

    function focusControl(control) {
      if (!control) return;
      try { control.focus({ preventScroll: true }); } catch (error) { control.focus(); }
    }

    function button(className, text) {
      var control = document.createElement("button");
      control.type = "button";
      control.className = className;
      control.textContent = text;
      return control;
    }

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

    function revealFieldDetails(field) {
      var details = field && field.closest("details.inquiry-additional-details");
      if (details) details.open = true;
    }

    function revealPopulatedDetails() {
      FIELD_NAMES.forEach(function (name) {
        var field = form.elements[name];
        if (field && String(field.value || "").trim()) revealFieldDetails(field);
      });
    }

    function validVolume(value) {
      return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
    }

    function setCalculatorResult(volume, dismissed) {
      calculatorResult = {
        volume: validVolume(volume),
        quantity: readValue("quantity"),
        note: readValue("note"),
        dismissed: dismissed === true
      };
    }

    function calculatorDraftMetadata() {
      if (!calculatorResult) return null;
      var note = readValue("note");
      var quantity = readValue("quantity");
      // 早期交接可能只有数量。主动删除原有备注时，不再显示旧结果。
      if (!note && (calculatorResult.note || !quantity)) return null;
      var unchanged = calculatorResult.note === note && calculatorResult.quantity === quantity;
      return { volume: unchanged ? calculatorResult.volume : null, dismissed: calculatorResult.dismissed };
    }

    function renderCalculatorSummary() {
      var metadata = calculatorDraftMetadata();
      if (metadata) form.setAttribute("data-calculator-prefill", "true");
      else form.removeAttribute("data-calculator-prefill");
      if (!metadata || metadata.dismissed || !additionalDetails) {
        if (calculatorNotice) calculatorNotice.remove();
        calculatorNotice = null;
        calculatorSummary = null;
        return;
      }
      if (!calculatorNotice) {
        var detailsControl = additionalDetails.querySelector("summary");
        calculatorNotice = document.createElement("div");
        calculatorNotice.className = "calculator-prefill-notice";
        calculatorNotice.setAttribute("role", "status");
        var copy = document.createElement("span");
        copy.className = "calculator-prefill-notice-text";
        copy.textContent = messages.calculatorAdded;
        calculatorNotice.appendChild(copy);
        calculatorSummary = document.createElement("span");
        calculatorSummary.className = "calculator-prefill-summary";
        calculatorNotice.appendChild(calculatorSummary);
        var edit = button("calculator-prefill-edit", messages.calculatorReview);
        edit.addEventListener("click", function () {
          additionalDetails.open = true;
          focusControl(detailsControl);
          if (detailsControl) detailsControl.scrollIntoView({ block: "nearest" });
        });
        var dismiss = button("calculator-prefill-notice-dismiss", "×");
        dismiss.setAttribute("aria-label", messages.calculatorDismiss);
        dismiss.addEventListener("click", function () {
          calculatorResult.dismissed = true;
          draftLastSignature = "";
          renderCalculatorSummary();
          saveDraft();
          focusControl(detailsControl);
        });
        calculatorNotice.appendChild(edit);
        calculatorNotice.appendChild(dismiss);
        additionalDetails.parentNode.insertBefore(calculatorNotice, additionalDetails);
      }
      var values = [readValue("quantity")];
      if (metadata.volume !== null) {
        if (!calculatorVolumeFormat) {
          calculatorVolumeFormat = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : locale, {
            minimumFractionDigits: 3, maximumFractionDigits: 3
          });
        }
        values.push(calculatorVolumeFormat.format(metadata.volume) + " m³");
      }
      var summaryText = values.filter(Boolean).join(" · ");
      if (calculatorSummary.textContent === summaryText) return;
      calculatorSummary.textContent = "";
      values.filter(Boolean).forEach(function (value, index) {
        if (index) calculatorSummary.appendChild(document.createTextNode(" · "));
        var isolated = document.createElement("bdi");
        isolated.textContent = value;
        calculatorSummary.appendChild(isolated);
      });
    }

    function clearCalculatorSummary() {
      calculatorResult = null;
      renderCalculatorSummary();
    }

    function consumeCalculatorResult() {
      var raw = null;
      calculatorPrefilledFields = {};
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
        var prefilled = false;
        ["product", "quantity", "note"].forEach(function (name) {
          var field = form.elements[name];
          var value = typeof values[name] === "string" ? values[name].trim() : "";
          if (!field || !value) return;
          var maximum = Number(field.getAttribute("maxlength"));
          field.value = Number.isFinite(maximum) && maximum > 0 ? value.slice(0, maximum) : value;
          calculatorPrefilledFields[name] = true;
          prefilled = true;
        });
        if (prefilled) setCalculatorResult(result.totalCbm, false);
        return prefilled;
      } catch (error) {
      } finally {
        if (raw !== null) {
          try { window.sessionStorage.removeItem(CALCULATOR_RESULT_KEY); } catch (error) {}
        }
      }
    }

    function draftFieldValue(field) {
      if (!field) return "";
      if (field.name === "category" && field.tagName === "SELECT") {
        var option = field.options[field.selectedIndex];
        return option ? String(option.getAttribute("data-draft-value") || "") : "";
      }
      return String(field.value || "");
    }

    function draftFields() {
      var values = {};
      FIELD_NAMES.forEach(function (name) {
        var field = form.elements[name];
        values[name] = draftFieldValue(field);
      });
      return values;
    }

    function hasDraftContent(values) {
      return FIELD_NAMES.some(function (name) { return Boolean(String(values[name] || "").trim()); });
    }

    function draftSignature(values, detailsOpen) {
      return JSON.stringify({ fields: values, detailsOpen: Boolean(detailsOpen) });
    }

    function showDraftFeedback(kind) {
      if (!draftFeedback || !draftPanel) return;
      draftFeedback.textContent = draftPanel.getAttribute("data-draft-" + kind) || "";
      draftFeedback.hidden = !draftFeedback.textContent;
    }

    function draftStorageUnavailable() {
      draftStorageReadable = false;
      if (draftNotice && draftPanel) draftNotice.textContent = draftPanel.getAttribute("data-draft-unavailable") || "";
      if (draftFeedback) draftFeedback.hidden = true;
    }

    function updateDraftControls() {
      if (!draftClearButton) return;
      draftClearButton.hidden = !hasDraftContent(draftFields());
      if (draftClearButton.hidden) setDraftConfirmation(false);
    }

    function setDraftConfirmation(open, returnFocus) {
      if (!draftConfirmation || !draftClearButton) return;
      draftConfirmation.hidden = !open;
      draftClearButton.setAttribute("aria-expanded", String(open));
      if (open) focusControl(draftConfirmation.querySelector(".inquiry-draft-cancel"));
      else if (returnFocus) focusControl(draftClearButton);
    }

    function clearDraftFields() {
      if (submitting) return;
      FIELD_NAMES.forEach(function (name) {
        if (form.elements[name]) form.elements[name].value = "";
      });
      if (additionalDetails) additionalDetails.open = false;
      clearCalculatorSummary();
      currentSubmissionId = "";
      var draftRemoved = removeDraft();
      draftLastSavedAt = 0;
      draftLastSignature = draftSignature(draftFields(), false);
      updateDraftControls();
      updateStatusForDraftEdit();
      showDraftFeedback(draftRemoved ? "cleared" : "delete-failed");
      var firstField = form.elements.product;
      if (firstField) {
        focusControl(firstField);
        firstField.scrollIntoView({ block: "nearest", behavior: "auto" });
      }
    }

    function initDraftConfirmation() {
      if (!draftClearButton) return;
      draftConfirmation = document.createElement("div");
      draftConfirmation.id = "inquiry-draft-confirmation";
      draftConfirmation.className = "inquiry-draft-confirmation";
      draftConfirmation.setAttribute("role", "group");
      draftConfirmation.setAttribute("aria-labelledby", "inquiry-draft-confirmation-text");
      draftConfirmation.hidden = true;
      var prompt = document.createElement("p");
      prompt.id = "inquiry-draft-confirmation-text";
      prompt.className = "inquiry-draft-confirmation-text";
      prompt.textContent = messages.draftConfirmPrompt;
      draftConfirmation.appendChild(prompt);
      var cancel = button("inquiry-draft-cancel", messages.draftCancelLabel);
      cancel.addEventListener("click", function () { setDraftConfirmation(false, true); });
      var accept = button("inquiry-draft-confirm", messages.draftConfirmLabel);
      accept.addEventListener("click", clearDraftFields);
      draftConfirmation.appendChild(cancel);
      draftConfirmation.appendChild(accept);
      draftConfirmation.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setDraftConfirmation(false, true);
      });
      draftPanel.appendChild(draftConfirmation);
      draftClearButton.setAttribute("aria-controls", draftConfirmation.id);
      draftClearButton.setAttribute("aria-expanded", "false");
      draftClearButton.addEventListener("click", function () {
        if (!submitting) setDraftConfirmation(draftConfirmation.hidden);
      });
    }

    function removeDraft() {
      window.clearTimeout(draftExpiryTimer);
      draftExpiryTimer = null;
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
        draftRemovalPending = false;
        return true;
      } catch (error) {
        draftRemovalPending = true;
        draftStorageUnavailable();
        return false;
      }
    }

    function scheduleDraftExpiry(savedAt) {
      window.clearTimeout(draftExpiryTimer);
      draftExpiryTimer = window.setTimeout(function () {
        try {
          var current = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY));
          if (!current || Number(current.savedAt) !== savedAt) return;
        } catch (error) { draftStorageUnavailable(); return; }
        removeDraft();
        draftLastSavedAt = 0;
        // 只删除过期的存储副本，不突然擦除用户正在编辑的表单。
        draftLastSignature = draftSignature(draftFields(), additionalDetails && additionalDetails.open);
        showDraftFeedback("expired");
      }, Math.max(0, savedAt + DRAFT_MAX_AGE - Date.now()));
    }

    function readDraft() {
      try {
        if (draftRemovalPending && !removeDraft()) return null;
        var raw = window.sessionStorage.getItem(DRAFT_KEY);
        draftStorageReadable = true;
        if (!raw) return null;
        var record = JSON.parse(raw);
        var age = Date.now() - Number(record && record.savedAt);
        if (!record || record.version !== 1 || !Number.isFinite(age) || age < 0
            || age >= DRAFT_MAX_AGE || !record.fields || typeof record.fields !== "object") {
          removeDraft();
          if (Number.isFinite(age) && age >= DRAFT_MAX_AGE) showDraftFeedback("expired");
          return null;
        }
        var fields = {};
        FIELD_NAMES.forEach(function (name) {
          var field = form.elements[name];
          var value = typeof record.fields[name] === "string" ? record.fields[name] : "";
          var maximum = field ? Number(field.getAttribute("maxlength")) : 0;
          if (maximum > 0) value = value.slice(0, maximum);
          if (field && field.tagName === "SELECT" && !Array.prototype.some.call(field.options, function (option) { return option.getAttribute("data-draft-value") === value; })) value = "";
          fields[name] = value;
        });
        if (!hasDraftContent(fields)) {
          removeDraft();
          return null;
        }
        return {
          fields: fields,
          detailsOpen: record.detailsOpen === true,
          savedAt: Number(record.savedAt),
          calculator: record.calculator && typeof record.calculator === "object" && (fields.note || fields.quantity) ? record.calculator : null
        };
      } catch (error) {
        // 损坏的草稿或禁用存储不影响表单、原生校验和安全提交。
        removeDraft();
        draftStorageUnavailable();
        return null;
      }
    }

    function saveDraft() {
      if (!draftPanel) return;
      // 删除失败时保留内存重试标记；可访问后先删除旧副本，不让它复活。
      if (draftRemovalPending && !removeDraft()) {
        updateDraftControls();
        return;
      }
      var fields = draftFields();
      var detailsOpen = Boolean(additionalDetails && additionalDetails.open);
      var signature = draftSignature(fields, detailsOpen);
      updateDraftControls();
      renderCalculatorSummary();
      if (signature === draftLastSignature) return;
      draftLastSignature = signature;
      if (!hasDraftContent(fields)) {
        removeDraft();
        clearCalculatorSummary();
        draftLastSavedAt = 0;
        return;
      }
      try {
        var savedAt = Date.now();
        // 只存九个业务字段和展示偏好；不保存验证令牌、同意状态或提交标识。
        var record = { version: 1, savedAt: savedAt, detailsOpen: detailsOpen, fields: fields };
        var metadata = calculatorDraftMetadata();
        if (metadata) record.calculator = metadata;
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(record));
        draftLastSavedAt = savedAt;
        if (draftNotice) draftNotice.textContent = draftNoticeText;
        if (draftFeedback) draftFeedback.hidden = true;
        scheduleDraftExpiry(savedAt);
      } catch (error) { draftStorageUnavailable(); }
    }

    function restoreInquiryContext() {
      var calculatorPrefilled = consumeCalculatorResult();
      var previousSavedAt = draftLastSavedAt;
      var record = draftPanel ? readDraft() : null;
      var browserRestoredDetails = false;
      if (record) {
        var newerDraft = previousSavedAt > 0 && record.savedAt > previousSavedAt;
        FIELD_NAMES.forEach(function (name) {
          var field = form.elements[name];
          if (!field || calculatorPrefilledFields[name]) return;
          // 保留浏览器已恢复或用户正在编辑的值；草稿补齐未恢复的字段。
          if (!newerDraft && String(field.value || "").trim()) {
            if (draftFieldValue(field) !== record.fields[name] && field.closest(".inquiry-additional-details")) browserRestoredDetails = true;
          } else {
            if (field.tagName === "SELECT") {
              Array.prototype.some.call(field.options, function (option) {
                if (option.getAttribute("data-draft-value") !== record.fields[name]) return false;
                field.value = option.value;
                return true;
              });
            } else {
              field.value = record.fields[name];
            }
          }
        });
        if (!calculatorPrefilled) {
          if (record.calculator && readValue("note") === record.fields.note.trim()) {
            var restoredVolume = readValue("quantity") === record.fields.quantity.trim() ? record.calculator.volume : null;
            setCalculatorResult(restoredVolume, record.calculator.dismissed);
          } else if (newerDraft || !readValue("note")) {
            clearCalculatorSummary();
          }
        }
        if (additionalDetails) additionalDetails.open = !calculatorPrefilled && record.detailsOpen;
        draftLastSignature = draftSignature(record.fields, record.detailsOpen);
        draftLastSavedAt = record.savedAt;
        scheduleDraftExpiry(record.savedAt);
        if (!calculatorPrefilled) showDraftFeedback("restored");
      } else {
        // 同标签页另一语言已清除/过期：BFCache 的旧表单不得复活该草稿。
        if (draftStorageReadable && previousSavedAt > 0) {
          FIELD_NAMES.forEach(function (name) {
            if (form.elements[name] && !calculatorPrefilledFields[name]) form.elements[name].value = "";
          });
          if (additionalDetails) additionalDetails.open = false;
          if (!calculatorPrefilled) clearCalculatorSummary();
          draftLastSavedAt = 0;
          if (draftFeedback && draftFeedback.hidden) showDraftFeedback("cleared");
        }
        if (!calculatorPrefilled && !calculatorResult) revealPopulatedDetails();
        draftLastSignature = draftSignature(draftFields(), additionalDetails && additionalDetails.open);
      }
      if (calculatorPrefilled) {
        // 显示摘要，完整字段由客户按需打开。新计算结果仍优先于旧草稿。
        if (additionalDetails) additionalDetails.open = false;
        draftLastSignature = "";
        saveDraft();
      } else if (browserRestoredDetails) {
        revealPopulatedDetails();
        saveDraft();
      }
      renderCalculatorSummary();
      updateDraftControls();
      refreshVerificationFallback();
    }

    if (draftPanel) {
      draftPanel.hidden = false;
      if (additionalDetails) additionalDetails.addEventListener("toggle", saveDraft);
      window.addEventListener("pagehide", saveDraft);
      initDraftConfirmation();
    }
    restoreInquiryContext();
    window.addEventListener("pageshow", restoreInquiryContext);

    decorateFieldLabels();

    function buildWhatsAppSummary() {
      var labels = {
        product: "Product",
        quantity: "Quantity",
        budget: "Budget",
        market: "Market",
        contact: "Contact",
        company: "Name / company",
        note: "Notes"
      };
      var lines = ["Jabbar Sourcing inquiry: secure form unavailable"];
      Object.keys(labels).forEach(function (name) {
        var value = readValue(name);
        if (value) lines.push(labels[name] + ": " + value);
      });
      lines.push("Page: " + window.location.href.split("#")[0]);
      return "https://wa.me/8618658925544?text=" + encodeURIComponent(lines.join("\n"));
    }

    function refreshVerificationFallback() {
      var whatsapp = status && status.querySelector(".inquiry-status-whatsapp");
      if (whatsapp) whatsapp.href = buildWhatsAppSummary();
    }

    function updateStatusForDraftEdit() {
      if (submitting) return;
      if (status && status.dataset.securityRelated === "true") refreshVerificationFallback();
      else setStatus("", "");
    }

    function setStatus(message, tone, options) {
      if (!status) return;
      options = options || {};
      while (status.firstChild) status.removeChild(status.firstChild);
      status.classList.remove("is-success", "is-error", "is-pending");
      delete status.dataset.securityRelated;
      if (tone) status.classList.add("is-" + tone);
      if (options.securityRelated) status.dataset.securityRelated = "true";
      if (!message) return;

      if (tone === "success") {
        var icon = document.createElement("span");
        icon.className = "inquiry-status-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "✓";
        var text = document.createElement("span");
        text.className = "inquiry-status-message";
        text.textContent = message;
        if (options.reference) {
          var reference = document.createElement("small");
          reference.className = "inquiry-status-reference";
          reference.textContent = messages.referenceLabel + ": " + options.reference;
          text.appendChild(reference);
          var attachmentLink = form.querySelector(".inquiry-attachment-note a");
          if (attachmentLink) {
            var attachmentHint = document.createElement("span");
            attachmentHint.className = "inquiry-success-attachment";
            var link = attachmentLink.cloneNode(false);
            link.textContent = messages.successAttachment;
            attachmentHint.appendChild(link);
            text.appendChild(attachmentHint);
          }
        }
        status.appendChild(icon);
        status.appendChild(text);
      } else if (options.whatsappFallback || options.retryVerification) {
        var messageText = document.createElement("span");
        messageText.className = "inquiry-status-message";
        messageText.textContent = message;
        status.appendChild(messageText);

        var actions = document.createElement("span");
        actions.className = "inquiry-status-actions";
        if (options.retryVerification) {
          var retryButton = document.createElement("button");
          retryButton.type = "button";
          retryButton.className = "inquiry-status-retry";
          retryButton.textContent = messages.turnstileRetryLabel;
          retryButton.addEventListener("click", function () {
            if (submitting) return;
            startTurnstile();
            try { status.focus({ preventScroll: true }); } catch (error) { status.focus(); }
          });
          actions.appendChild(retryButton);
        }
        if (options.whatsappFallback) {
          var disclosure = document.createElement("span");
          disclosure.id = "inquiry-whatsapp-disclosure";
          disclosure.className = "inquiry-whatsapp-disclosure";
          disclosure.textContent = messages.whatsappDetails;
          actions.appendChild(disclosure);
          var whatsapp = document.createElement("a");
          whatsapp.className = "inquiry-status-whatsapp";
          whatsapp.href = buildWhatsAppSummary();
          whatsapp.target = "_blank";
          whatsapp.rel = "noopener noreferrer";
          whatsapp.textContent = messages.whatsappFallback;
          whatsapp.setAttribute("aria-describedby", disclosure.id);
          actions.appendChild(whatsapp);
        }
        status.appendChild(actions);
      } else {
        status.textContent = message;
      }

      if (options.skipScroll) return;
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
      if (value) setDraftConfirmation(false);
      if (draftClearButton) draftClearButton.disabled = value;
      directButton.disabled = value || !turnstileToken;
      directButton.setAttribute("aria-busy", value ? "true" : "false");
      directButton.textContent = value ? messages.sendingLabel : directButtonLabel;
    }

    function resetTurnstile() {
      stopVerificationTimer();
      delete turnstileElement.dataset.interactive;
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

    function completeSubmission(message, submittedContentKey, statusCode, startedAt, submissionId) {
      var hasNewEdits = Boolean(submittedContentKey && contentKey() !== submittedContentKey);
      if (!hasNewEdits) {
        form.reset();
        clearCalculatorSummary();
      }
      var submittedDraftRemoved = removeDraft();
      draftLastSavedAt = 0;
      // 仅清除已提交副本；请求期间的新输入仍是未提交草稿，不能丢失。
      draftLastSignature = hasNewEdits ? "" : draftSignature(draftFields(), additionalDetails && additionalDetails.open);
      if (hasNewEdits) saveDraft();
      updateDraftControls();
      if (submittedDraftRemoved) {
        if (draftFeedback) draftFeedback.hidden = true;
      } else {
        showDraftFeedback("delete-failed");
      }
      currentSubmissionId = "";
      resetTurnstile();
      setStatus(message, "success", { reference: String(submissionId || "").slice(0, 8) });
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
        revealFieldDetails(field);
        saveDraft();
        markFormStart();
        if (!submitting) currentSubmissionId = "";
        updateStatusForDraftEdit();
      });
      field.addEventListener("change", function () {
        revealFieldDetails(field);
        saveDraft();
        markFormStart();
        if (!submitting) currentSubmissionId = "";
        updateStatusForDraftEdit();
      });
    });

    form.addEventListener("invalid", function (event) {
      var field = event.target;
      var details = field.closest("details.inquiry-additional-details");
      var wasClosed = details && !details.open;
      var firstInvalid = form.querySelector("input:invalid, select:invalid, textarea:invalid");
      // 原生校验先展开详情；WebKit 需等布局后才能聚焦原先隐藏的字段。
      revealFieldDetails(event.target);
      if (wasClosed && field === firstInvalid) {
        window.requestAnimationFrame(function () {
          if (!field.isConnected || field.validity.valid
              || form.querySelector("input:invalid, select:invalid, textarea:invalid") !== field) return;
          try { field.focus({ preventScroll: true }); } catch (error) { field.focus(); }
          field.scrollIntoView({ block: "nearest", behavior: "auto" });
        });
      }
      trackNativeValidationError();
    }, true);

    trackEvent("inquiry_view", { form_name: "sourcing_inquiry" });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitting) return;

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        trackNativeValidationError();
        return;
      }
      if (!turnstileToken) {
        if (!status || status.dataset.securityRelated !== "true") {
          setStatus(messages.verifyError, "error", { securityRelated: true });
        }
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
          completeSubmission(messages.success, submittedContentKey, response.status, submissionStartedAt, payload.submissionId);
          return;
        }
        if (response.status === 202) {
          completeSubmission(messages.accepted, submittedContentKey, response.status, submissionStartedAt, payload.submissionId);
          return;
        }

        trackSubmitError(body.error, response.status, "response", submissionStartedAt);
        resetTurnstile();
        if (response.status === 409 && body.error === "submission_in_progress") {
          var pendingRetryAfter = response.headers.get("Retry-After");
          setStatus(messages.pending + formatRetryAfter(pendingRetryAfter, messages.retryAfterUnit), "pending");
          return;
        }
        if (response.status === 409 && body.error === "submission_id_conflict") {
          currentSubmissionId = "";
          setStatus(messages.conflict, "error");
          return;
        }
        if (response.status === 422) {
          setStatus(messages.verifyRetry, "error", { securityRelated: true, whatsappFallback: true, retryVerification: true });
          return;
        }
        if (response.status === 429) {
          var retryAfter = response.headers.get("Retry-After");
          setStatus(messages.rateLimit + formatRetryAfter(retryAfter, messages.retryAfterUnit), "error");
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

    function stopVerificationTimer() {
      if (verificationTimer !== null) window.clearTimeout(verificationTimer);
      verificationTimer = null;
    }

    function showVerificationStatus(message, tone, showActions) {
      setStatus(message, tone, {
        securityRelated: true,
        skipScroll: true,
        whatsappFallback: showActions,
        retryVerification: showActions
      });
    }

    function showTurnstileFailure(errorCode) {
      stopVerificationTimer();
      delete turnstileElement.dataset.interactive;
      turnstileToken = "";
      directButton.disabled = true;
      if (!submitting && (!status || !status.classList.contains("is-success"))) {
        showVerificationStatus(messages.turnstileUnavailable, "error", true);
      }
      trackSubmitError(errorCode, 0, "turnstile");
    }

    function startTurnstile() {
      var attempt = ++verificationAttempt;
      delete turnstileElement.dataset.interactive;
      turnstileToken = "";
      directButton.disabled = true;
      stopVerificationTimer();
      if (cancelTurnstileLoad) cancelTurnstileLoad();
      if (widgetId !== null) {
        try {
          window.turnstile.remove(widgetId);
          widgetId = null;
        } catch (error) {
          showTurnstileFailure("turnstile_remove_failed");
          return;
        }
      }
      showVerificationStatus(messages.turnstileLoading, "pending", false);
      verificationTimer = window.setTimeout(function () {
        verificationTimer = null;
        if (attempt === verificationAttempt && !turnstileToken && !submitting) {
          showVerificationStatus(messages.turnstileSlow, "pending", true);
        }
      }, 8000);
      loadTurnstileApi().then(function (turnstileApi) {
        if (attempt === verificationAttempt) renderTurnstile(turnstileApi, attempt);
      }).catch(function (error) {
        if (attempt === verificationAttempt) showTurnstileFailure(error.message);
      });
    }

    function renderTurnstile(turnstileApi, attempt) {
      if (verificationTimer !== null) showVerificationStatus(messages.turnstileChecking, "pending", false);
      try {
          widgetId = turnstileApi.render(turnstileElement, {
            sitekey: turnstileElement.getAttribute("data-sitekey"),
            action: turnstileElement.getAttribute("data-action") || "turnstile-spin-v1",
            language: turnstileElement.getAttribute("data-language") || "auto",
            size: directButton.clientWidth < 300 ? "compact" : "normal",
            theme: "light",
            appearance: "interaction-only",
            callback: function (token) {
              if (attempt !== verificationAttempt || !token) return;
              stopVerificationTimer();
              delete turnstileElement.dataset.interactive;
              turnstileToken = String(token || "");
              if (!submitting) directButton.disabled = !turnstileToken;
              if (status && status.dataset.securityRelated === "true") setStatus("", "");
            },
            "before-interactive-callback": function () {
              if (attempt !== verificationAttempt || submitting || turnstileToken) return;
              turnstileElement.dataset.interactive = "true";
              if (!status || status.dataset.securityRelated !== "true") return;
              stopVerificationTimer();
              showVerificationStatus(messages.verifyError, "pending", false);
            },
            "expired-callback": function () {
              if (attempt !== verificationAttempt) return;
              delete turnstileElement.dataset.interactive;
              turnstileToken = "";
              directButton.disabled = true;
            },
            "timeout-callback": function () {
              if (attempt === verificationAttempt) showTurnstileFailure("turnstile_timeout");
            },
            "error-callback": function () {
              if (attempt === verificationAttempt) showTurnstileFailure("turnstile_widget_error");
            },
            "unsupported-callback": function () {
              if (attempt === verificationAttempt) showTurnstileFailure("turnstile_unsupported");
            }
          });
      } catch (error) {
        showTurnstileFailure("turnstile_render_failed");
      }
    }

    startTurnstile();
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
