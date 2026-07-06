(function () {
  var endpoint = window.JABBAR_AI_ASSISTANT_ENDPOINT;
  if (!endpoint) return;

  var lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var labels = {
    zh: { title: "AI 采购助理", placeholder: "告诉我你想采购什么...", send: "发送", open: "AI 采购助理", whatsapp: "转 WhatsApp" },
    en: { title: "AI Sourcing Assistant", placeholder: "Tell me what you want to source...", send: "Send", open: "AI Assistant", whatsapp: "Send to WhatsApp" },
    es: { title: "Asistente de compras AI", placeholder: "Dime que quieres comprar...", send: "Enviar", open: "Asistente AI", whatsapp: "Enviar por WhatsApp" },
    ar: { title: "مساعد الشراء بالذكاء الاصطناعي", placeholder: "أخبرني بما تريد شراءه...", send: "إرسال", open: "مساعد AI", whatsapp: "إرسال واتساب" },
    fr: { title: "Assistant achat IA", placeholder: "Dites-moi ce que vous voulez acheter...", send: "Envoyer", open: "Assistant IA", whatsapp: "Envoyer WhatsApp" },
    pt: { title: "Assistente de compras AI", placeholder: "Diga o que quer comprar...", send: "Enviar", open: "Assistente AI", whatsapp: "Enviar WhatsApp" },
    ru: { title: "AI помощник по закупкам", placeholder: "Напишите, что хотите закупить...", send: "Отправить", open: "AI помощник", whatsapp: "В WhatsApp" },
    de: { title: "KI Einkaufsassistent", placeholder: "Was mochten Sie einkaufen?", send: "Senden", open: "KI Assistent", whatsapp: "An WhatsApp" },
    it: { title: "Assistente acquisti AI", placeholder: "Dimmi cosa vuoi acquistare...", send: "Invia", open: "Assistente AI", whatsapp: "Invia WhatsApp" },
    tr: { title: "AI Satın Alma Asistanı", placeholder: "Ne tedarik etmek istiyorsunuz?", send: "Gonder", open: "AI Asistan", whatsapp: "WhatsApp'a Gonder" },
    ja: { title: "AI仕入れアシスタント", placeholder: "仕入れたい商品を入力してください...", send: "送信", open: "AIアシスタント", whatsapp: "WhatsAppへ" },
  };
  var copy = labels[lang] || labels.en;
  var history = [];
  var lastWhatsappUrl = "";

  var style = document.createElement("style");
  style.textContent = [
    ".jabbar-ai-toggle{position:fixed;right:22px;bottom:88px;z-index:1200;border:0;border-radius:999px;background:#087f8c;color:#fff;font:700 15px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:14px 18px;box-shadow:0 16px 36px rgba(8,127,140,.28);cursor:pointer}",
    ".jabbar-ai-panel{position:fixed;right:22px;bottom:148px;z-index:1200;width:min(380px,calc(100vw - 32px));background:rgba(255,255,255,.96);border:1px solid rgba(15,23,42,.12);border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.22);overflow:hidden;display:none}",
    ".jabbar-ai-panel.is-open{display:block}",
    ".jabbar-ai-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(15,23,42,.08);font:800 17px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033}",
    ".jabbar-ai-close{border:0;background:#eef3f8;border-radius:999px;width:32px;height:32px;font-size:18px;cursor:pointer}",
    ".jabbar-ai-log{height:280px;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}",
    ".jabbar-ai-msg{max-width:86%;padding:10px 12px;border-radius:16px;font:500 14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;white-space:pre-wrap}",
    ".jabbar-ai-msg.user{align-self:flex-end;background:#087f8c;color:#fff;border-bottom-right-radius:5px}",
    ".jabbar-ai-msg.bot{align-self:flex-start;background:#f1f5f9;color:#172033;border-bottom-left-radius:5px}",
    ".jabbar-ai-form{display:grid;grid-template-columns:1fr auto;gap:8px;padding:14px;border-top:1px solid rgba(15,23,42,.08)}",
    ".jabbar-ai-input{min-width:0;border:1px solid rgba(15,23,42,.16);border-radius:999px;padding:12px 14px;font:500 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    ".jabbar-ai-send{border:0;border-radius:999px;background:#087f8c;color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:0 16px;cursor:pointer}",
    ".jabbar-ai-whatsapp{display:none;margin:0 14px 14px;text-align:center;text-decoration:none;border-radius:999px;background:#25d366;color:#073b20;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:12px}",
    ".jabbar-ai-whatsapp.is-visible{display:block}",
    "@media (max-width:767px){.jabbar-ai-toggle{right:14px;bottom:72px}.jabbar-ai-panel{right:12px;bottom:126px}}",
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

  var title = panel.querySelector(".jabbar-ai-head span");
  var close = panel.querySelector(".jabbar-ai-close");
  var log = panel.querySelector(".jabbar-ai-log");
  var form = panel.querySelector(".jabbar-ai-form");
  var input = panel.querySelector(".jabbar-ai-input");
  var send = panel.querySelector(".jabbar-ai-send");
  var whatsapp = panel.querySelector(".jabbar-ai-whatsapp");

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

  function setWhatsapp(url) {
    lastWhatsappUrl = url || "";
    whatsapp.href = lastWhatsappUrl;
    whatsapp.classList.toggle("is-visible", Boolean(lastWhatsappUrl));
  }

  toggle.addEventListener("click", function () {
    panel.classList.toggle("is-open");
    if (panel.classList.contains("is-open")) input.focus();
  });

  close.addEventListener("click", function () {
    panel.classList.remove("is-open");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!message) return;

    input.value = "";
    addMessage("user", message);
    send.disabled = true;
    send.textContent = "...";

    fetch(endpoint.replace(/\/$/, "") + "/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: lang, message: message, history: history.slice(-8) }),
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        var reply = data.reply || "Please try again.";
        addMessage("assistant", reply);
        history.push({ role: "user", content: message }, { role: "assistant", content: reply });
        setWhatsapp(data.whatsappUrl);
      })
      .catch(function () {
        addMessage("assistant", "The assistant is temporarily unavailable. Please contact us on WhatsApp.");
      })
      .finally(function () {
        send.disabled = false;
        send.textContent = copy.send;
      });
  });
})();
