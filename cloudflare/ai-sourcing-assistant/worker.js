const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 10;

const LANGUAGE_NAMES = {
  zh: "Chinese",
  en: "English",
  es: "Spanish",
  ar: "Arabic",
  fr: "French",
  pt: "Portuguese",
  ru: "Russian",
  de: "German",
  it: "Italian",
  tr: "Turkish",
  ja: "Japanese",
};

const QUICK_REPLIES = {
  zh: "请告诉我产品名称、数量、目标国家和预算，我会帮你整理成采购询盘。",
  en: "Tell me the product, quantity, target country, and budget. I will turn it into a sourcing inquiry.",
  es: "Dime el producto, cantidad, país de destino y presupuesto. Lo convertiré en una solicitud de compra.",
  ar: "أخبرني بالمنتج والكمية وبلد البيع والميزانية، وسأحوّلها إلى طلب شراء واضح.",
  fr: "Indiquez le produit, la quantité, le pays cible et le budget. Je prépare une demande d'achat claire.",
  pt: "Informe produto, quantidade, país de destino e orçamento. Vou transformar isso em uma solicitação de compra.",
  ru: "Укажите товар, количество, страну продажи и бюджет. Я оформлю это как запрос на закупку.",
  de: "Nennen Sie Produkt, Menge, Zielland und Budget. Ich formuliere daraus eine Einkaufsanfrage.",
  it: "Dimmi prodotto, quantita, paese di destinazione e budget. Lo trasformero in una richiesta di sourcing.",
  tr: "Urunu, adedi, hedef ulkeyi ve butceyi yazin. Bunu satin alma talebine donusturecegim.",
  ja: "商品名、数量、販売国、予算を教えてください。仕入れ依頼として整理します。",
};

function jsonResponse(body, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "https://www.jabbarsourcing.com";
  const allowOrigin = origin === allowed || origin === "http://127.0.0.1:4173" || origin === "http://localhost:4173"
    ? origin
    : allowed;

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

function normalizeLanguage(value) {
  const lang = String(value || "en").toLowerCase().slice(0, 2);
  return LANGUAGE_NAMES[lang] ? lang : "en";
}

function cleanText(value, max = MAX_MESSAGE_LENGTH) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanAssistantReply(value, max = 2000) {
  const withoutThinking = String(value || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "");

  return cleanText(withoutThinking, max);
}

function buildSystemPrompt(lang) {
  const languageName = LANGUAGE_NAMES[lang] || "English";
  return [
    `You are the Jabbar Sourcing AI purchasing assistant. Reply in ${languageName}.`,
    "You only help with China/Yiwu product sourcing, quotes, inspection, warehousing, consolidation, and international shipping.",
    "Ask concise follow-up questions when product details are missing: product name, quantity, target market, budget, photos/specifications, and deadline.",
    "Do not invent final prices, supplier names, certificates, or delivery dates. Say the team will confirm after checking suppliers.",
    "When the buyer provides enough detail, produce a short WhatsApp-ready inquiry summary with bullet points.",
    "Service facts: 0 buyer commission, trial orders from USD 1,000, regular orders from USD 3,000, consolidation from USD 10,000, inspection with unpacking and photo/video feedback, Alibaba.com Pay USD account and Alipay supported, T/T bank transfer can be discussed with the team.",
    "Jabbar Sourcing address: Building 3, No. 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, China.",
    "Keep answers friendly, practical, and under 140 words unless the buyer asks for details.",
  ].join("\n");
}

function historyToMessages(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_ITEMS).map((item) => {
    const role = item && item.role === "assistant" ? "assistant" : "user";
    return { role, content: cleanText(item && item.content, 1000) };
  }).filter((item) => item.content);
}

function buildWhatsappText(lang, userMessage, reply) {
  const intro = {
    zh: "你好，我想咨询义乌采购：",
    en: "Hello, I would like to ask about China/Yiwu sourcing:",
    es: "Hola, quiero consultar sobre compras en Yiwu/China:",
    ar: "مرحباً، أريد الاستفسار عن الشراء من ييوو/الصين:",
    fr: "Bonjour, je souhaite demander un devis pour du sourcing a Yiwu/Chine :",
    pt: "Ola, gostaria de consultar sourcing em Yiwu/China:",
    ru: "Здравствуйте, хочу запросить закупку из Иу/Китая:",
    de: "Hallo, ich mochte eine Anfrage fur Yiwu/China-Sourcing stellen:",
    it: "Buongiorno, vorrei richiedere sourcing da Yiwu/Cina:",
    tr: "Merhaba, Yiwu/Cin sourcing icin bilgi almak istiyorum:",
    ja: "こんにちは。中国・義烏の仕入れについて相談したいです：",
  }[lang] || "Hello, I would like to ask about China/Yiwu sourcing:";

  return `${intro}\n\n${userMessage}\n\nAI summary:\n${reply}`.slice(0, 1800);
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "jabbar-sourcing-ai-assistant" }, 200, corsHeaders);
    }

    if (request.method !== "POST" || url.pathname !== "/chat") {
      return jsonResponse({ error: "Not found" }, 404, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const lang = normalizeLanguage(body.lang);
    const message = cleanText(body.message);
    const history = historyToMessages(body.history);

    if (!message) {
      return jsonResponse({
        reply: QUICK_REPLIES[lang] || QUICK_REPLIES.en,
        whatsappUrl: `https://wa.me/${env.WHATSAPP_PHONE || "8618658925544"}`,
      }, 200, corsHeaders);
    }

    const messages = [
      { role: "system", content: buildSystemPrompt(lang) },
      ...history,
      { role: "user", content: message },
    ];

    let aiResult;
    try {
      aiResult = await env.AI.run(env.AI_MODEL || "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", {
        messages,
        max_tokens: 420,
      });
    } catch (error) {
      return jsonResponse({
        error: "AI service temporarily unavailable",
        detail: error && error.message ? error.message : "Unknown error",
      }, 502, corsHeaders);
    }

    const reply = cleanAssistantReply(aiResult.response || aiResult.result || aiResult.text || QUICK_REPLIES[lang] || QUICK_REPLIES.en);
    const whatsappText = buildWhatsappText(lang, message, reply);
    const whatsappUrl = `https://wa.me/${env.WHATSAPP_PHONE || "8618658925544"}?text=${encodeURIComponent(whatsappText)}`;

    return jsonResponse({ reply, whatsappUrl }, 200, corsHeaders);
  },
};
