// 只从站内路径识别语言，不根据 IP 或浏览器设置重定向。
(function () {
  var first = location.pathname.split("/")[1];
  var copy = {
    zh: ["页面不存在", "链接可能已失效，或网址输入有误。你可以返回首页继续浏览。", "返回首页"],
    en: ["Page not found", "This link may be outdated or the address may be incorrect. Return to the homepage to continue browsing.", "Return home"],
    es: ["Página no encontrada", "Es posible que el enlace haya caducado o que la dirección sea incorrecta.", "Volver al inicio"],
    ar: ["الصفحة غير موجودة", "قد يكون الرابط قديمًا أو العنوان غير صحيح. يمكنك العودة إلى الصفحة الرئيسية.", "العودة إلى الصفحة الرئيسية"],
    fr: ["Page introuvable", "Le lien est peut-être obsolète ou l’adresse est incorrecte.", "Retour à l’accueil"],
    pt: ["Página não encontrada", "O link pode estar desatualizado ou o endereço pode estar incorreto.", "Voltar ao início"],
    ru: ["Страница не найдена", "Возможно, ссылка устарела или адрес введён неверно.", "На главную"],
    de: ["Seite nicht gefunden", "Der Link ist möglicherweise veraltet oder die Adresse ist nicht korrekt.", "Zur Startseite"],
    it: ["Pagina non trovata", "Il link potrebbe non essere più valido oppure l’indirizzo è errato.", "Torna alla home"],
    tr: ["Sayfa bulunamadı", "Bağlantı güncelliğini yitirmiş veya adres yanlış yazılmış olabilir.", "Ana sayfaya dön"]
  };
  // 无语言前缀的中文主站使用中文；未提供的两字母语种保持通用双语 404。
  var known = Object.prototype.hasOwnProperty.call(copy, first);
  if (first === "404.html" || (/^[a-z]{2}$/i.test(first) && !known)) return;
  var lang = known ? first : "zh";
  var row = copy[lang], home = lang === "zh" ? "/" : "/" + lang + "/";
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = row[0] + " | Jabbar Sourcing";
  document.querySelector("#not-found-title").textContent = row[0];
  document.querySelector("#not-found-title + p").textContent = row[1];
  var button = document.querySelector(".not-found-actions a");
  button.textContent = row[2]; button.href = home;
  var brand = document.querySelector(".not-found-logo");
  brand.href = home; brand.setAttribute("aria-label", row[2]+" · Jabbar Sourcing");
})();
