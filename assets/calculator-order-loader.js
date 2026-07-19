(function () {
  var root = document.querySelector("[data-order-analyzer]");
  if (!root || root.getAttribute("data-order-loader-bound") === "true") return;

  var VERSION = "order-20260719b";
  var SCRIPT_URL = "/assets/calculator-order-analyzer.js?v=" + VERSION;
  var language = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: { name: "Excel 订单分析", intro: "需要时再加载分析工具，订单表只在此浏览器中处理。", load: "打开 Excel 订单分析", loading: "正在加载…", error: "Excel 订单分析工具加载失败。请检查网络后重试。", retry: "重试加载" },
    en: { name: "Excel order analyzer", intro: "Load the analyzer when needed. Your workbook is processed only in this browser.", load: "Open Excel order analyzer", loading: "Loading…", error: "The Excel order analyzer could not load. Check your connection and try again.", retry: "Try again" },
    es: { name: "Analizador de pedidos Excel", intro: "Carga el analizador cuando lo necesites. El archivo se procesa solo en este navegador.", load: "Abrir analizador de Excel", loading: "Cargando…", error: "No se pudo cargar el analizador de Excel. Comprueba la conexión e inténtalo de nuevo.", retry: "Reintentar" },
    ar: { name: "محلل طلبات Excel", intro: "حمّل أداة التحليل عند الحاجة. تتم معالجة الملف داخل هذا المتصفح فقط.", load: "فتح محلل Excel", loading: "جارٍ التحميل…", error: "تعذر تحميل أداة تحليل Excel. تحقق من الاتصال ثم حاول مرة أخرى.", retry: "إعادة المحاولة" },
    fr: { name: "Analyseur de commandes Excel", intro: "Chargez l’analyseur au besoin. Le fichier est traité uniquement dans ce navigateur.", load: "Ouvrir l’analyseur Excel", loading: "Chargement…", error: "Impossible de charger l’analyseur Excel. Vérifiez votre connexion et réessayez.", retry: "Réessayer" },
    pt: { name: "Analisador de pedidos Excel", intro: "Carregue o analisador quando precisar. O arquivo é processado apenas neste navegador.", load: "Abrir analisador de Excel", loading: "Carregando…", error: "Não foi possível carregar o analisador de Excel. Verifique a conexão e tente novamente.", retry: "Tentar novamente" },
    ru: { name: "Анализатор заказов Excel", intro: "Загрузите анализатор при необходимости. Файл обрабатывается только в этом браузере.", load: "Открыть анализатор Excel", loading: "Загрузка…", error: "Не удалось загрузить анализатор Excel. Проверьте подключение и повторите попытку.", retry: "Повторить" },
    de: { name: "Excel-Bestellanalyse", intro: "Laden Sie die Analyse bei Bedarf. Die Datei wird nur in diesem Browser verarbeitet.", load: "Excel-Analyse öffnen", loading: "Wird geladen…", error: "Die Excel-Analyse konnte nicht geladen werden. Prüfen Sie die Verbindung und versuchen Sie es erneut.", retry: "Erneut versuchen" },
    it: { name: "Analizzatore ordini Excel", intro: "Carica l’analizzatore quando serve. Il file viene elaborato solo in questo browser.", load: "Apri analizzatore Excel", loading: "Caricamento…", error: "Impossibile caricare l’analizzatore Excel. Controlla la connessione e riprova.", retry: "Riprova" },
    tr: { name: "Excel sipariş analiz aracı", intro: "Analiz aracını gerektiğinde yükleyin. Dosya yalnızca bu tarayıcıda işlenir.", load: "Excel analiz aracını aç", loading: "Yükleniyor…", error: "Excel analiz aracı yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.", retry: "Tekrar dene" }
  };
  var copy = labels[language] || labels.en;
  var loading = false;
  var loaded = false;
  var failedScript = null;
  var intentEvents = ["pointerenter", "pointerdown", "touchstart", "click", "dragenter"];

  root.setAttribute("data-order-loader-bound", "true");
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", copy.name);
  root.setAttribute("aria-busy", "false");
  root.classList.add("order-analyzer");

  function showLoadPrompt() {
    root.innerHTML = "";

    var header = document.createElement("header");
    header.className = "order-analyzer__header";
    var title = document.createElement("h2");
    title.textContent = copy.name;
    var intro = document.createElement("p");
    intro.className = "order-analyzer__intro";
    intro.textContent = copy.intro;
    header.appendChild(title);
    header.appendChild(intro);

    var loadButton = document.createElement("button");
    loadButton.className = "order-analyzer__apply";
    loadButton.type = "button";
    loadButton.setAttribute("data-order-load", "");
    loadButton.textContent = copy.load;
    var actions = document.createElement("div");
    actions.className = "order-analyzer__actions";
    actions.appendChild(loadButton);

    root.appendChild(header);
    root.appendChild(actions);
  }

  function removeIntentListeners() {
    intentEvents.forEach(function (name) { root.removeEventListener(name, loadAnalyzer); });
  }

  function finishLoading() {
    if (!window.JabbarOrderAnalyzer || typeof window.JabbarOrderAnalyzer.init !== "function") {
      showLoadError();
      return;
    }
    loading = false;
    loaded = true;
    root.setAttribute("aria-busy", "false");
    root.removeAttribute("aria-label");
    removeIntentListeners();
    window.JabbarOrderAnalyzer.init();
  }

  function showLoadError() {
    loading = false;
    loaded = false;
    root.setAttribute("aria-busy", "false");
    if (failedScript && failedScript.parentNode) failedScript.parentNode.removeChild(failedScript);
    failedScript = null;
    root.innerHTML = "";

    var status = document.createElement("p");
    status.className = "order-analyzer__status is-error";
    status.setAttribute("data-state", "error");
    status.setAttribute("role", "alert");
    status.textContent = copy.error;

    var retry = document.createElement("button");
    retry.className = "order-analyzer__apply";
    retry.type = "button";
    retry.textContent = copy.retry;
    retry.addEventListener("click", loadAnalyzer, { once: true });

    var actions = document.createElement("div");
    actions.className = "order-analyzer__actions";
    actions.appendChild(retry);

    root.appendChild(status);
    root.appendChild(actions);
  }

  function loadAnalyzer() {
    if (loaded || loading) return;
    if (window.JabbarOrderAnalyzer && typeof window.JabbarOrderAnalyzer.init === "function") {
      finishLoading();
      return;
    }

    loading = true;
    root.setAttribute("aria-busy", "true");
    var loadButton = root.querySelector("[data-order-load]");
    if (loadButton) {
      loadButton.disabled = true;
      loadButton.textContent = copy.loading;
    }
    var script = document.createElement("script");
    failedScript = script;
    script.src = SCRIPT_URL;
    script.async = true;
    script.setAttribute("data-order-analyzer-runtime", "");
    script.addEventListener("load", finishLoading, { once: true });
    script.addEventListener("error", showLoadError, { once: true });
    document.head.appendChild(script);
  }

  showLoadPrompt();
  intentEvents.forEach(function (name) {
    root.addEventListener(name, loadAnalyzer, name === "touchstart" ? { passive: true } : false);
  });
})();
