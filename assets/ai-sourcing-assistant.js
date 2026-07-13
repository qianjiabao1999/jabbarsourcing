(function () {
  var endpoint = window.JABBAR_AI_ASSISTANT_ENDPOINT;
  if (!endpoint) return;

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: { title: "AI 采购助理", placeholder: "告诉我你想采购什么...", send: "发送", open: "AI 采购助理", whatsapp: "转 WhatsApp", unavailable: "助理暂时无法使用，请通过 WhatsApp 联系我们。", limit: "本次对话已达到 20 轮，请通过 WhatsApp 继续联系。" },
    en: { title: "AI Sourcing Assistant", placeholder: "Tell me what you want to source...", send: "Send", open: "AI Assistant", whatsapp: "Send to WhatsApp", unavailable: "The assistant is temporarily unavailable. Please contact us on WhatsApp.", limit: "This chat has reached 20 turns. Please continue on WhatsApp." },
    es: { title: "Asistente de compras AI", placeholder: "Dime que quieres comprar...", send: "Enviar", open: "Asistente AI", whatsapp: "Enviar por WhatsApp", unavailable: "El asistente no está disponible temporalmente. Contáctanos por WhatsApp.", limit: "Este chat llegó a 20 turnos. Continúa por WhatsApp." },
    ar: { title: "مساعد الشراء بالذكاء الاصطناعي", placeholder: "أخبرني بما تريد شراءه...", send: "إرسال", open: "مساعد AI", whatsapp: "إرسال واتساب", unavailable: "المساعد غير متاح مؤقتاً. يرجى التواصل معنا عبر واتساب.", limit: "وصلت المحادثة إلى 20 جولة. يرجى المتابعة عبر واتساب." },
    fr: { title: "Assistant achat IA", placeholder: "Dites-moi ce que vous voulez acheter...", send: "Envoyer", open: "Assistant IA", whatsapp: "Envoyer WhatsApp", unavailable: "L'assistant est temporairement indisponible. Contactez-nous sur WhatsApp.", limit: "Cette conversation a atteint 20 tours. Continuez sur WhatsApp." },
    pt: { title: "Assistente de compras AI", placeholder: "Diga o que quer comprar...", send: "Enviar", open: "Assistente AI", whatsapp: "Enviar WhatsApp", unavailable: "O assistente está temporariamente indisponível. Fale conosco pelo WhatsApp.", limit: "Esta conversa atingiu 20 turnos. Continue pelo WhatsApp." },
    ru: { title: "AI помощник по закупкам", placeholder: "Напишите, что хотите закупить...", send: "Отправить", open: "AI помощник", whatsapp: "В WhatsApp", unavailable: "Помощник временно недоступен. Свяжитесь с нами в WhatsApp.", limit: "Диалог достиг 20 сообщений. Продолжите в WhatsApp." },
    de: { title: "KI Einkaufsassistent", placeholder: "Was mochten Sie einkaufen?", send: "Senden", open: "KI Assistent", whatsapp: "An WhatsApp", unavailable: "Der Assistent ist vorübergehend nicht verfügbar. Kontaktieren Sie uns per WhatsApp.", limit: "Dieser Chat hat 20 Runden erreicht. Bitte über WhatsApp fortfahren." },
    it: { title: "Assistente acquisti AI", placeholder: "Dimmi cosa vuoi acquistare...", send: "Invia", open: "Assistente AI", whatsapp: "Invia WhatsApp", unavailable: "L'assistente non è temporaneamente disponibile. Contattaci su WhatsApp.", limit: "Questa chat ha raggiunto 20 turni. Continua su WhatsApp." },
    tr: { title: "AI Satın Alma Asistanı", placeholder: "Ne tedarik etmek istiyorsunuz?", send: "Gonder", open: "AI Asistan", whatsapp: "WhatsApp'a Gonder", unavailable: "Asistan geçici olarak kullanılamıyor. Lütfen WhatsApp üzerinden bize ulaşın.", limit: "Bu sohbet 20 tura ulaştı. WhatsApp üzerinden devam edin." },
  };
  var copy = labels[lang] || labels.en;
  var history = [];
  var sessionTurns = 0;
  var lastWhatsappUrl = "";
  var firstMessageTracked = false;
  try {
    firstMessageTracked = sessionStorage.getItem("jabbarAiFirstMessageTracked") === "1";
  } catch (error) {}

  function trackFirstMessage() {
    if (firstMessageTracked) return;
    var params = { locale: lang };
    if (typeof window.jabbarTrack === "function") {
      window.jabbarTrack("ai_first_message", params);
    } else if (typeof window.gtag === "function") {
      window.gtag("event", "ai_first_message", params);
    }
    firstMessageTracked = true;
    try {
      sessionStorage.setItem("jabbarAiFirstMessageTracked", "1");
    } catch (error) {}
  }

  var style = document.createElement("style");
  style.textContent = [
    ".jabbar-ai-toggle{position:fixed;right:22px;bottom:88px;z-index:1200;min-height:48px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:#087f8c;color:#fff;font:700 15px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:14px 18px;box-shadow:0 16px 36px rgba(8,127,140,.28);cursor:pointer;transition:opacity .18s ease,transform .18s ease}",
    ".jabbar-ai-toggle.is-footer-hidden,.jabbar-ai-toggle.is-panel-open{visibility:hidden;opacity:0;pointer-events:none;transform:translateY(12px)}",
    ".jabbar-ai-panel{position:fixed;right:22px;bottom:148px;z-index:1200;width:min(380px,calc(100vw - 32px));background:rgba(255,255,255,.96);border:1px solid rgba(15,23,42,.12);border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.22);overflow:hidden;display:none}",
    ".jabbar-ai-panel.is-open{display:flex;flex-direction:column}",
    ".jabbar-ai-head{display:flex;align-items:center;justify-content:space-between;flex:0 0 auto;padding:16px 18px;border-bottom:1px solid rgba(15,23,42,.08);font:800 17px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033}",
    ".jabbar-ai-close{border:0;background:#eef3f8;border-radius:999px;width:32px;height:32px;font-size:18px;cursor:pointer}",
    ".jabbar-ai-log{height:280px;min-height:0;flex:1 1 280px;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}",
    ".jabbar-ai-msg{max-width:86%;padding:10px 12px;border-radius:16px;font:500 14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;white-space:pre-wrap}",
    ".jabbar-ai-msg.user{align-self:flex-end;background:#087f8c;color:#fff;border-bottom-right-radius:5px}",
    ".jabbar-ai-msg.bot{align-self:flex-start;background:#f1f5f9;color:#172033;border-bottom-left-radius:5px}",
    ".jabbar-ai-form{display:grid;grid-template-columns:minmax(0,1fr) auto;flex:0 0 auto;gap:8px;padding:14px;border-top:1px solid rgba(15,23,42,.08)}",
    ".jabbar-ai-input{min-width:0;border:1px solid rgba(15,23,42,.16);border-radius:999px;padding:12px 14px;font:500 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    ".jabbar-ai-send{border:0;border-radius:999px;background:#087f8c;color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:0 16px;cursor:pointer}",
    ".jabbar-ai-whatsapp{display:none;flex:0 0 auto;margin:0 14px 14px;text-align:center;text-decoration:none;border-radius:999px;background:#25d366;color:#073b20;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:12px}",
    ".jabbar-ai-whatsapp.is-visible{display:block}",
    ".jabbar-ai-toggle.is-compact{right:var(--jabbar-ai-toggle-right,14px);bottom:var(--jabbar-ai-toggle-bottom,72px);max-width:calc(var(--jabbar-ai-vv-width,100vw) - 28px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".jabbar-ai-panel.is-compact{right:var(--jabbar-ai-panel-right,12px);bottom:var(--jabbar-ai-panel-bottom,12px);width:min(380px,calc(var(--jabbar-ai-vv-width,100vw) - 24px));height:min(419px,calc(var(--jabbar-ai-vv-height,100vh) - 24px));max-height:calc(var(--jabbar-ai-vv-height,100vh) - 24px)}",
    ".jabbar-ai-panel.is-compact .jabbar-ai-input{font-size:16px}",
    "@media (max-width:767px){.jabbar-ai-toggle{right:14px;bottom:72px}.jabbar-ai-panel{right:12px;bottom:12px}.jabbar-ai-input{font-size:16px}}",
  ].join("");
  document.head.appendChild(style);

  var toggle = document.createElement("button");
  toggle.className = "jabbar-ai-toggle";
  toggle.type = "button";
  toggle.textContent = copy.open;

  var panel = document.createElement("section");
  panel.className = "jabbar-ai-panel";
  panel.setAttribute("aria-label", copy.title);
  panel.innerHTML = [
    '<div class="jabbar-ai-head"><span></span><button class="jabbar-ai-close" type="button" aria-label="Close">×</button></div>',
    '<div class="jabbar-ai-log" role="log" aria-live="polite"></div>',
    '<form class="jabbar-ai-form">',
    '<input class="jabbar-ai-input" type="text" autocomplete="off">',
    '<button class="jabbar-ai-send" type="submit"></button>',
    "</form>",
    '<a class="jabbar-ai-whatsapp" target="_blank" rel="noopener noreferrer"></a>',
  ].join("");

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  var conversionBar = document.querySelector(".mobile-conversion-bar");
  var title = panel.querySelector(".jabbar-ai-head span");
  var close = panel.querySelector(".jabbar-ai-close");
  var log = panel.querySelector(".jabbar-ai-log");
  var form = panel.querySelector(".jabbar-ai-form");
  var input = panel.querySelector(".jabbar-ai-input");
  var send = panel.querySelector(".jabbar-ai-send");
  var whatsapp = panel.querySelector(".jabbar-ai-whatsapp");
  var viewportFrame = 0;

  function syncViewportLayout() {
    var viewport = window.visualViewport;
    var viewportWidth = Math.max(1, viewport ? viewport.width : window.innerWidth);
    var viewportHeight = Math.max(1, viewport ? viewport.height : window.innerHeight);
    var viewportLeft = viewport ? viewport.offsetLeft : 0;
    var viewportTop = viewport ? viewport.offsetTop : 0;
    var layoutWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    var layoutHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    var viewportReduced = viewportWidth < layoutWidth - 1 || viewportHeight < layoutHeight - 1;
    var compact = viewportWidth <= 767 || viewportHeight <= 640 || viewportReduced || (viewport && viewport.scale > 1.01);

    toggle.classList.toggle("is-compact", compact);
    panel.classList.toggle("is-compact", compact);

    if (!compact) {
      [
        "--jabbar-ai-vv-width",
        "--jabbar-ai-toggle-right",
        "--jabbar-ai-toggle-bottom",
      ].forEach(function (property) {
        toggle.style.removeProperty(property);
      });
      [
        "--jabbar-ai-vv-width",
        "--jabbar-ai-vv-height",
        "--jabbar-ai-panel-right",
        "--jabbar-ai-panel-bottom",
      ].forEach(function (property) {
        panel.style.removeProperty(property);
      });
      return;
    }

    var hiddenRight = Math.max(0, layoutWidth - (viewportLeft + viewportWidth));
    var hiddenBottom = Math.max(0, layoutHeight - (viewportTop + viewportHeight));
    var conversionBarHeight = 0;
    if (conversionBar && !panel.classList.contains("is-open")) {
      var conversionBarStyle = window.getComputedStyle(conversionBar);
      if (conversionBarStyle.display !== "none" && conversionBarStyle.visibility !== "hidden") {
        conversionBarHeight = Math.ceil(conversionBar.getBoundingClientRect().height);
      }
    }
    var toggleBottom = conversionBarHeight ? conversionBarHeight + 16 : 72;

    toggle.style.setProperty("--jabbar-ai-vv-width", viewportWidth + "px");
    toggle.style.setProperty("--jabbar-ai-toggle-right", hiddenRight + 14 + "px");
    toggle.style.setProperty("--jabbar-ai-toggle-bottom", hiddenBottom + toggleBottom + "px");
    panel.style.setProperty("--jabbar-ai-vv-width", viewportWidth + "px");
    panel.style.setProperty("--jabbar-ai-vv-height", viewportHeight + "px");
    panel.style.setProperty("--jabbar-ai-panel-right", hiddenRight + 12 + "px");
    panel.style.setProperty("--jabbar-ai-panel-bottom", hiddenBottom + 12 + "px");
  }

  function scheduleViewportLayout() {
    if (viewportFrame) window.cancelAnimationFrame(viewportFrame);
    viewportFrame = window.requestAnimationFrame(function () {
      viewportFrame = 0;
      syncViewportLayout();
    });
  }

  function setPanelOpen(open) {
    panel.classList.toggle("is-open", open);
    toggle.classList.toggle("is-panel-open", open);
    document.body.classList.toggle("jabbar-ai-open", open);
    if (!open) input.blur();
    syncViewportLayout();
    scheduleViewportLayout();
  }

  window.addEventListener("resize", scheduleViewportLayout, { passive: true });
  window.addEventListener("orientationchange", scheduleViewportLayout, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleViewportLayout, { passive: true });
    window.visualViewport.addEventListener("scroll", scheduleViewportLayout, { passive: true });
  }
  syncViewportLayout();

  var footer = document.querySelector(".site-footer");
  if (footer && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        toggle.classList.toggle("is-footer-hidden", entry.isIntersecting);
        if (entry.isIntersecting) setPanelOpen(false);
      });
    }, { rootMargin: "0px 0px 48px" }).observe(footer);
  }

  title.textContent = copy.title;
  input.placeholder = copy.placeholder;
  send.textContent = copy.send;
  whatsapp.textContent = copy.whatsapp;

  function addMessage(role, text) {
    var item = document.createElement("div");
    item.className = "jabbar-ai-msg " + (role === "user" ? "user" : "bot");
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function cleanReplyText(text) {
    return String(text || "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*/gi, "")
      .replace(/[*＊★☆✦✧✱✳]/g, "")
      .replace(/：/g, ":")
      .split(/\r?\n/)
      .map(function (line) {
        return line
          .replace(/^\s*#{1,6}\s*/, "")
          .replace(/^\s*(?:[-•]|\d+[.)])\s+/, "")
          .replace(/[ \t]+/g, " ")
          .trim();
      })
      .filter(Boolean)
      .join("\n")
      .trim()
      .slice(0, 900);
  }

  function detectMessageLanguage(text) {
    var value = String(text || "").trim();
    if (!value) return lang;
    if (/[\u4e00-\u9fff]/.test(value)) return "zh";
    if (/[\u0600-\u06ff]/.test(value)) return "ar";
    if (/[\u0400-\u04ff]/.test(value)) return "ru";

    var normalized = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var words = normalized.match(/[a-z]+/g) || [];
    var markers = {
      en: "hello hi what can you please want need source sourcing buy product products quantity price quote shipping write tell ignore instructions rules role".split(" "),
      es: "hola quiero necesito buscamos busco comprar producto productos cantidad precio cotizacion presupuesto envio puedes ignora instrucciones reglas actua cambia rol".split(" "),
      fr: "bonjour veux voudrais besoin acheter produit produits quantite prix devis livraison merci ignore instructions regles agis change role".split(" "),
      pt: "ola quero preciso buscamos comprar produto produtos quantidade preco cotacao orcamento envio ignora instrucoes regras aja mude papel".split(" "),
      de: "hallo ich brauche mochte kaufen produkt produkte menge preis angebot versand bitte ignoriere anweisungen regeln rolle andern".split(" "),
      it: "ciao vorrei voglio bisogno comprare prodotto prodotti quantita prezzo preventivo spedizione grazie ignora istruzioni regole comportati cambia ruolo".split(" "),
      tr: "merhaba istiyorum ihtiyac urun adet miktar fiyat teklif butce sevkiyat lutfen talimatlari kurallari yok say unut rolunu degistir".split(" "),
    };
    var best = lang;
    var bestScore = 0;

    Object.keys(markers).forEach(function (candidate) {
      var score = words.reduce(function (total, word) {
        return total + (markers[candidate].indexOf(word) >= 0 ? 1 : 0);
      }, 0);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    return best;
  }

  function setWhatsapp(url) {
    lastWhatsappUrl = url || "";
    whatsapp.href = lastWhatsappUrl;
    whatsapp.classList.toggle("is-visible", Boolean(lastWhatsappUrl));
    scheduleViewportLayout();
  }

  toggle.addEventListener("click", function () {
    var open = !panel.classList.contains("is-open");
    setPanelOpen(open);
    if (open) {
      try {
        input.focus({ preventScroll: true });
      } catch (error) {
        input.focus();
      }
      scheduleViewportLayout();
    }
  });

  close.addEventListener("click", function () {
    setPanelOpen(false);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!message) return;
    var messageLang = detectMessageLanguage(message);
    var messageCopy = labels[messageLang] || copy;
    if (sessionTurns >= 20) {
      addMessage("assistant", messageCopy.limit || labels.en.limit);
      return;
    }

    input.value = "";
    addMessage("user", message);
    send.disabled = true;
    send.textContent = "...";

    fetch(endpoint.replace(/\/$/, "") + "/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: lang, message: message, history: history.slice(-8), sessionTurns: sessionTurns }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { data: data, ok: response.ok };
        });
      })
      .then(function (result) {
        var data = result.data;
        var reply = cleanReplyText(data.reply || messageCopy.unavailable);
        addMessage("assistant", reply);
        if (result.ok) {
          history.push({ role: "user", content: message }, { role: "assistant", content: reply });
          sessionTurns += 1;
          trackFirstMessage();
        }
        setWhatsapp(data.whatsappUrl);
      })
      .catch(function () {
        addMessage("assistant", messageCopy.unavailable);
      })
      .finally(function () {
        send.disabled = false;
        send.textContent = copy.send;
      });
  });
})();
