#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.jabbarsourcing.com";
const CONSENT_VERSION = "consent-20260722a";
const UI_VERSION = "ui-20260720a";

const routes = {
  zh: { lang: "zh-CN", hreflang: "zh-Hans", path: "/website-privacy-policy.html", home: "/" },
  en: { lang: "en", hreflang: "en", path: "/en/website-privacy-policy.html", home: "/en/" },
  es: { lang: "es", hreflang: "es", path: "/es/website-privacy-policy.html", home: "/es/" },
  ar: { lang: "ar", hreflang: "ar", path: "/ar/website-privacy-policy.html", home: "/ar/", dir: "rtl" },
  fr: { lang: "fr", hreflang: "fr", path: "/fr/website-privacy-policy.html", home: "/fr/" },
  pt: { lang: "pt", hreflang: "pt", path: "/pt/website-privacy-policy.html", home: "/pt/" },
  ru: { lang: "ru", hreflang: "ru", path: "/ru/website-privacy-policy.html", home: "/ru/" },
  de: { lang: "de", hreflang: "de", path: "/de/website-privacy-policy.html", home: "/de/" },
  it: { lang: "it", hreflang: "it", path: "/it/website-privacy-policy.html", home: "/it/" },
  tr: { lang: "tr", hreflang: "tr", path: "/tr/website-privacy-policy.html", home: "/tr/" }
};

const copy = {
  en: {
    title: "Website Privacy Notice | Jabbar Sourcing",
    description: "How Jabbar Sourcing handles website inquiries, security verification and optional analytics.",
    h1: "Website Privacy Notice",
    updated: "Last updated: July 22, 2026",
    intro: "This notice explains how Zhejiang Haoduobao Brand Management Co., Ltd. handles personal information submitted through the Jabbar Sourcing website.",
    settings: "Analytics settings",
    regionalAnalytics: "Cloudflare uses the country code inferred from the network request only to decide whether the analytics choice panel should appear automatically. The page receives only that coarse decision, not the country code, and we do not store the location. In the EEA, United Kingdom and Switzerland, or when the location is unknown, Tor-based or unavailable, analytics stays off and the panel may appear automatically. In other regions analytics also stays off by default, but the panel does not open automatically; you can make a choice below. If your browser sends a Global Privacy Control (GPC) signal, analytics remains disabled.",
    sections: [
      ["Who is responsible", ["The data controller and personal information handler is Zhejiang Haoduobao Brand Management Co., Ltd. Jabbar Sourcing Team is the company’s sourcing service team for international buyers. Contact us at Building 3, No. 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, China; telephone {{phone}}; email {{email}}."]],
      ["Information we collect", ["When you submit an inquiry, we collect the product requirements, product reference URL, category, expected quantity, budget, destination market, contact details, name or company, and notes that you choose to provide.", "For source attribution, the inquiry email may also contain the first landing-page path, external referrer hostname, and length-limited UTM source, medium, campaign, term and content values from the URL. Cloudflare may process the IP address, browser information and network-security signals to prevent abuse."]],
      ["Why we use it", ["We use inquiry information only to respond to your request, prepare a sourcing proposal or quotation, take steps before a possible contract, provide necessary business follow-up, and protect the website against abuse. Clicking submit records your acknowledgement of this notice. Limited security processing relies on the security and legitimate interests permitted by applicable law."]],
      ["Service providers and international processing", ["The form uses Cloudflare Turnstile, Cloudflare Workers and Email Service to verify and deliver inquiries. Google Gmail receives the inquiry email. If you choose WhatsApp, Gmail, WeChat or Telegram as a fallback channel, that provider processes the information under its own privacy terms. These providers may process data outside your country or region."]],
      ["Optional analytics", ["We load Google Analytics 4 and Microsoft Clarity only after you choose “Allow analytics”. They may process page URLs, device and browser information, approximate network location, clicks and session diagnostics. Source-attribution fields may be sent to Google Analytics 4. We do not intentionally send products, contact details, product reference URLs, notes or other inquiry-form contents to either analytics service. Declining does not affect the website or inquiry form, and you can change your choice below.", "Your Allow or Reject choice, its time and this notice’s policy version are stored only in this browser on your device for up to 12 months; a Decide later choice is stored for up to 30 days. This preference record is not sent to our server."]],
      ["Retention", ["The inquiry API does not retain the raw inquiry, contact details, Turnstile token or IP address. It retains only random request and lease identifiers, a SHA-256 fingerprint derived with the random submission ID, delivery state and timing data, which logically expire and are scheduled for deletion after 24 hours.", "Cloudflare Workers Logs keeps one structured operational metric for each successful submission for up to 7 days, limited to response status, language, processing time, allowlisted UTM source and medium categories, and presence flags for campaign, term and content; it excludes the original UTM text, form content, contact details, name or company, reference URLs, notes, the Turnstile token and the IP address.", "Ordinary Gmail inquiry messages are generally kept for no more than 24 months after the last substantive communication and removed through manual review. If an inquiry becomes a quotation, order, contract or payment record, relevant records are retained for the period needed to perform the transaction and meet accounting, tax and applicable legal obligations."]],
      ["Your choices and rights", ["We do not use inquiry details for marketing that you have not chosen. Subject to applicable law, you may request access, correction, deletion or restriction, withdraw consent, object to processing, or complain to the competent authority. Email {{email}} with “Privacy Request” in the subject and the minimum information needed to locate the inquiry. We may carry out proportionate identity verification and will respond within 30 days or the period required by applicable law. Withdrawal does not affect earlier lawful processing."]],
      ["Security, sensitive information and children", ["We use access controls and service safeguards designed to protect information, but no internet transmission is completely secure. Do not submit identity documents, bank-card data, health information or other sensitive data. The inquiry service is not directed to children. We may update this notice when our practices or legal duties change; the date above identifies the current version."]]
    ]
  },
  es: {
    title: "Aviso de privacidad del sitio web | Jabbar Sourcing",
    description: "Cómo Jabbar Sourcing trata las consultas, la verificación de seguridad y los análisis opcionales del sitio web.",
    h1: "Aviso de privacidad del sitio web",
    updated: "Última actualización: 22 de julio de 2026",
    intro: "Este aviso explica cómo Zhejiang Haoduobao Brand Management Co., Ltd. trata la información personal enviada a través del sitio web de Jabbar Sourcing.",
    settings: "Configuración de análisis",
    regionalAnalytics: "Cloudflare usa el código de país deducido de la solicitud de red únicamente para decidir si el panel de preferencias de análisis debe mostrarse automáticamente. La página recibe solo esa decisión general, no el código de país, y no guardamos la ubicación. En el EEE, Reino Unido y Suiza, o cuando la ubicación es desconocida, procede de Tor o no está disponible, los análisis permanecen desactivados y el panel puede aparecer automáticamente. En otras regiones también están desactivados de forma predeterminada, pero el panel no se abre automáticamente; puede elegir abajo. Si el navegador envía una señal Global Privacy Control (GPC), los análisis permanecen desactivados.",
    sections: [
      ["Responsable del tratamiento", ["El responsable del tratamiento y de la información personal es Zhejiang Haoduobao Brand Management Co., Ltd. Jabbar Sourcing Team es el equipo de servicios de compra de la empresa para compradores internacionales. Contacto: Edificio 3, n.º 219 de Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, China; teléfono {{phone}}; correo {{email}}."]],
      ["Información que recopilamos", ["Al enviar una consulta, recopilamos los requisitos del producto, la URL de referencia, la categoría, la cantidad prevista, el presupuesto, el mercado de destino, los datos de contacto, el nombre o la empresa y las notas que decida proporcionar.", "Para atribuir el origen, el correo de la consulta puede incluir la ruta de la primera página visitada, el dominio del sitio remitente y los valores UTM source, medium, campaign, term y content de longitud limitada. Cloudflare puede tratar la dirección IP, la información del navegador y señales de seguridad de red para impedir abusos."]],
      ["Finalidades y fundamento", ["Usamos la información únicamente para responder, preparar una propuesta de abastecimiento o cotización, adoptar medidas previas a un posible contrato, realizar el seguimiento comercial necesario y proteger el sitio frente a abusos. Al enviar el formulario queda registrada su confirmación de este aviso. El tratamiento técnico limitado se basa en la seguridad y los intereses legítimos permitidos por la ley aplicable."]],
      ["Proveedores y transferencias internacionales", ["El formulario utiliza Cloudflare Turnstile, Workers y Email Service para verificar y entregar consultas. Google Gmail recibe el correo. Si elige WhatsApp, Gmail, WeChat o Telegram como canal alternativo, ese proveedor trata la información conforme a su propia política. Estos proveedores pueden tratar datos fuera de su país o región."]],
      ["Análisis opcionales", ["Solo cargamos Google Analytics 4 y Microsoft Clarity después de que elija “Permitir análisis”. Pueden tratar URL de páginas, información del dispositivo y navegador, ubicación de red aproximada, clics y diagnósticos de sesión. Los datos de atribución pueden enviarse a Google Analytics 4. No enviamos intencionadamente productos, datos de contacto, URL de referencia, notas ni otros campos de la consulta a estos servicios. Rechazar no afecta al sitio ni al formulario, y puede cambiar su elección abajo.", "Su elección de Permitir o Rechazar, la hora y la versión de esta política se guardan únicamente en este navegador de su dispositivo durante un máximo de 12 meses; la opción Decidir más tarde se guarda durante un máximo de 30 días. Este registro de preferencia no se envía a nuestro servidor."]],
      ["Conservación", ["La API no conserva la consulta original, los datos de contacto, el token de Turnstile ni la dirección IP. Solo conserva identificadores aleatorios de solicitud y arrendamiento, una huella SHA-256 derivada con el identificador aleatorio, el estado de entrega y datos temporales, que caducan lógicamente y se programan para eliminación tras 24 horas.", "Cloudflare Workers Logs conserva durante un máximo de 7 días una única métrica estructurada por cada envío exitoso, limitada al estado de respuesta, idioma, tiempo de procesamiento, categorías UTM source y medium incluidas en listas permitidas e indicadores de presencia para campaign, term y content; no incluye el texto UTM original, contenido del formulario, datos de contacto, nombre o empresa, URL de referencia, notas, token de Turnstile ni dirección IP.", "Los correos ordinarios se conservan normalmente como máximo 24 meses desde la última comunicación sustancial y se eliminan mediante revisión manual. Si la consulta se convierte en cotización, pedido, contrato o registro de pago, los registros necesarios se conservan durante el plazo exigido para ejecutar la operación y cumplir obligaciones contables, fiscales y legales."]],
      ["Sus opciones y derechos", ["No usamos los datos de la consulta para marketing que no haya elegido. Cuando la ley lo permita, puede solicitar acceso, rectificación, supresión o limitación, retirar el consentimiento, oponerse o reclamar ante la autoridad competente. Escriba a {{email}} con el asunto “Solicitud de privacidad” y la información mínima para localizar la consulta. Podemos verificar su identidad de forma proporcionada y responderemos en 30 días o en el plazo legal. La retirada no afecta al tratamiento lícito anterior."]],
      ["Seguridad, datos sensibles y menores", ["Aplicamos controles de acceso y salvaguardias de los servicios, aunque ninguna transmisión por Internet es totalmente segura. No envíe documentos de identidad, datos bancarios, información de salud ni otros datos sensibles. El servicio no está dirigido a menores. Podemos actualizar este aviso cuando cambien nuestras prácticas u obligaciones; la fecha superior indica la versión vigente."]]
    ]
  },
  ar: {
    title: "إشعار خصوصية الموقع | Jabbar Sourcing",
    description: "كيفية معالجة Jabbar Sourcing لاستفسارات الموقع والتحقق الأمني والتحليلات الاختيارية.",
    h1: "إشعار خصوصية الموقع",
    updated: "آخر تحديث: 22 يوليو 2026",
    intro: "يوضح هذا الإشعار كيفية معالجة Zhejiang Haoduobao Brand Management Co., Ltd. للمعلومات الشخصية المقدمة عبر موقع Jabbar Sourcing.",
    settings: "إعدادات التحليلات",
    regionalAnalytics: "تستخدم Cloudflare رمز البلد المستنتج من طلب الشبكة فقط لتحديد ما إذا كان ينبغي عرض لوحة خيارات التحليلات تلقائياً. لا تتلقى الصفحة سوى هذا القرار العام، ولا تتلقى رمز البلد، ولا نخزّن الموقع. في المنطقة الاقتصادية الأوروبية والمملكة المتحدة وسويسرا، أو عندما يكون الموقع غير معروف أو عبر Tor أو غير متاح، تبقى التحليلات معطلة وقد تظهر اللوحة تلقائياً. وفي المناطق الأخرى تبقى التحليلات معطلة افتراضياً أيضاً، لكن اللوحة لا تُفتح تلقائياً ويمكنك الاختيار أدناه. وإذا أرسل المتصفح إشارة Global Privacy Control (GPC)، فستظل التحليلات معطلة.",
    sections: [
      ["الجهة المسؤولة", ["المتحكم في البيانات ومعالج المعلومات الشخصية هو Zhejiang Haoduobao Brand Management Co., Ltd. وفريق Jabbar Sourcing هو فريق خدمات التوريد للمشترين الدوليين. العنوان: المبنى 3، رقم 219 طريق Sufu، بلدة Suxi، ييوو، جينهوا، تشجيانغ، الصين؛ الهاتف {{phone}}؛ البريد {{email}}."]],
      ["المعلومات التي نجمعها", ["عند إرسال استفسار، نجمع متطلبات المنتج ورابط المرجع والفئة والكمية المتوقعة والميزانية وسوق الوجهة وبيانات الاتصال والاسم أو الشركة والملاحظات التي تختار تقديمها.", "ولمعرفة مصدر الاستفسار، قد يتضمن البريد مسار أول صفحة دخول واسم نطاق الموقع المُحيل وقيم UTM source وmedium وcampaign وterm وcontent محدودة الطول. وقد تعالج Cloudflare عنوان IP ومعلومات المتصفح وإشارات أمن الشبكة لمنع إساءة الاستخدام."]],
      ["أغراض المعالجة وأساسها", ["نستخدم المعلومات فقط للرد على طلبك وإعداد عرض توريد أو سعر واتخاذ خطوات قبل عقد محتمل والمتابعة التجارية الضرورية وحماية الموقع من إساءة الاستخدام. يسجل الإرسال إقرارك بهذا الإشعار، وتستند المعالجة التقنية المحدودة إلى متطلبات الأمن والمصالح المشروعة التي يسمح بها القانون المعمول به."]],
      ["مزودو الخدمة والمعالجة الدولية", ["يستخدم النموذج Cloudflare Turnstile وWorkers وEmail Service للتحقق من الاستفسار وتسليمه، ويستقبل Google Gmail البريد. وإذا اخترت WhatsApp أو Gmail أو WeChat أو Telegram كقناة بديلة، يعالج المزود المعلومات وفق سياسة الخصوصية الخاصة به. وقد تتم المعالجة خارج بلدك أو منطقتك."]],
      ["التحليلات الاختيارية", ["لا نحمّل Google Analytics 4 وMicrosoft Clarity إلا بعد اختيار «السماح بالتحليلات». وقد يعالجان عناوين الصفحات ومعلومات الجهاز والمتصفح والموقع الشبكي التقريبي والنقرات وتشخيص الجلسة، وقد ترسل بيانات المصدر إلى Google Analytics 4. لا نرسل عمداً المنتجات أو بيانات الاتصال أو روابط المرجع أو الملاحظات أو حقول الاستفسار الأخرى إلى خدمتي التحليل. الرفض لا يؤثر في الموقع أو النموذج، ويمكنك تغيير اختيارك أدناه.", "يُحفظ اختيار السماح أو الرفض ووقت الاختيار وإصدار هذه السياسة في هذا المتصفح على جهازك فقط لمدة تصل إلى 12 شهراً، بينما يُحفظ اختيار «القرار لاحقاً» لمدة تصل إلى 30 يوماً. ولا يُرسل سجل التفضيل هذا إلى خادمنا."]],
      ["مدة الاحتفاظ", ["لا تحتفظ واجهة الاستفسار بالنص الأصلي أو بيانات الاتصال أو رمز Turnstile أو عنوان IP. وتحتفظ فقط بمعرفات عشوائية للطلب والتأجير وبصمة SHA-256 مشتقة من معرف الإرسال العشوائي وحالة التسليم والتوقيت، وتنتهي منطقياً وتُجدول للحذف بعد 24 ساعة.", "تحتفظ سجلات Cloudflare Workers لمدة لا تتجاوز 7 أيام بمقياس تشغيلي منظم واحد لكل إرسال ناجح، يقتصر على حالة الاستجابة واللغة ووقت المعالجة وفئات UTM source وmedium المدرجة في قوائم السماح ومؤشرات وجود campaign وterm وcontent؛ ولا يتضمن نصوص UTM الأصلية أو محتوى النموذج أو بيانات الاتصال أو الاسم أو الشركة أو روابط المرجع أو الملاحظات أو رمز Turnstile أو عنوان IP.", "تُحفظ رسائل Gmail العادية عادة لمدة لا تتجاوز 24 شهراً بعد آخر تواصل جوهري ثم تُحذف بالمراجعة اليدوية. وإذا أصبح الاستفسار عرضاً أو طلباً أو عقداً أو سجل دفع، تُحفظ السجلات اللازمة للمدة المطلوبة لتنفيذ المعاملة والوفاء بالالتزامات المحاسبية والضريبية والقانونية."]],
      ["اختياراتك وحقوقك", ["لا نستخدم بيانات الاستفسار لتسويق لم تختره. وبحسب القانون المطبق، يمكنك طلب الوصول أو التصحيح أو الحذف أو التقييد أو سحب الموافقة أو الاعتراض أو تقديم شكوى للجهة المختصة. راسل {{email}} بعنوان «طلب خصوصية» مع الحد الأدنى من المعلومات لتحديد الاستفسار. قد نتحقق من الهوية بشكل متناسب وسنرد خلال 30 يوماً أو المهلة القانونية. لا يؤثر السحب في المعالجة المشروعة السابقة."]],
      ["الأمن والمعلومات الحساسة والأطفال", ["نستخدم ضوابط وصول وضمانات خدمية لحماية المعلومات، لكن لا يوجد نقل عبر الإنترنت آمن تماماً. لا ترسل وثائق هوية أو بيانات بطاقات أو معلومات صحية أو معلومات حساسة أخرى. الخدمة غير موجهة للأطفال. قد نحدّث الإشعار عند تغير ممارساتنا أو التزاماتنا، ويحدد التاريخ أعلاه النسخة الحالية."]]
    ]
  },
  fr: {
    title: "Avis de confidentialité du site | Jabbar Sourcing",
    description: "Traitement des demandes, vérification de sécurité et mesures d’audience facultatives par Jabbar Sourcing.",
    h1: "Avis de confidentialité du site",
    updated: "Dernière mise à jour : 22 juillet 2026",
    intro: "Cet avis explique comment Zhejiang Haoduobao Brand Management Co., Ltd. traite les informations personnelles transmises sur le site Jabbar Sourcing.",
    settings: "Paramètres d’analyse",
    regionalAnalytics: "Cloudflare utilise le code pays déduit de la requête réseau uniquement pour déterminer si le panneau de choix analytique doit s’afficher automatiquement. La page ne reçoit que cette décision générale, pas le code pays, et nous ne conservons pas la localisation. Dans l’EEE, au Royaume-Uni et en Suisse, ou si la localisation est inconnue, issue de Tor ou indisponible, l’analyse reste désactivée et le panneau peut s’afficher automatiquement. Dans les autres régions, l’analyse reste également désactivée par défaut, mais le panneau ne s’ouvre pas automatiquement ; vous pouvez choisir ci-dessous. Si le navigateur envoie un signal Global Privacy Control (GPC), l’analyse reste désactivée.",
    sections: [
      ["Responsable du traitement", ["Le responsable du traitement des données et informations personnelles est Zhejiang Haoduobao Brand Management Co., Ltd. Jabbar Sourcing Team est l’équipe de services d’approvisionnement de la société pour les acheteurs internationaux. Adresse : bâtiment 3, 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, Chine ; téléphone {{phone}} ; e-mail {{email}}."]],
      ["Informations collectées", ["Lorsque vous envoyez une demande, nous collectons les besoins produit, l’URL de référence, la catégorie, la quantité prévue, le budget, le marché de destination, les coordonnées, le nom ou la société et les notes que vous choisissez de fournir.", "Pour l’attribution de la source, l’e-mail peut inclure le chemin de la première page, le domaine référent et les valeurs UTM source, medium, campaign, term et content de longueur limitée. Cloudflare peut traiter l’adresse IP, les informations du navigateur et les signaux de sécurité réseau afin de prévenir les abus."]],
      ["Finalités et fondement", ["Nous utilisons ces informations uniquement pour répondre, préparer une proposition d’approvisionnement ou un devis, prendre des mesures avant un éventuel contrat, assurer le suivi nécessaire et protéger le site. L’envoi enregistre votre prise de connaissance de cet avis. Le traitement technique limité repose sur la sécurité et les intérêts légitimes autorisés par la loi applicable."]],
      ["Prestataires et traitement international", ["Le formulaire utilise Cloudflare Turnstile, Workers et Email Service pour vérifier et transmettre les demandes. Google Gmail reçoit l’e-mail. Si vous choisissez WhatsApp, Gmail, WeChat ou Telegram comme canal de secours, ce prestataire traite les informations selon sa propre politique. Ces prestataires peuvent traiter des données hors de votre pays ou région."]],
      ["Analyse facultative", ["Google Analytics 4 et Microsoft Clarity ne sont chargés qu’après votre choix « Autoriser l’analyse ». Ils peuvent traiter les URL, les informations d’appareil et de navigateur, la localisation réseau approximative, les clics et les diagnostics de session. Les données d’attribution peuvent être envoyées à Google Analytics 4. Nous n’envoyons pas intentionnellement les produits, coordonnées, URL de référence, notes ni autres champs de demande à ces services. Le refus n’affecte pas le site ou le formulaire, et vous pouvez modifier votre choix ci-dessous.", "Votre choix Autoriser ou Refuser, sa date et la version de la présente politique sont conservés uniquement dans ce navigateur sur votre appareil pendant 12 mois au maximum ; le choix Décider plus tard est conservé pendant 30 jours au maximum. Ce choix n’est pas envoyé à notre serveur."]],
      ["Conservation", ["L’API ne conserve pas la demande brute, les coordonnées, le jeton Turnstile ni l’adresse IP. Elle conserve uniquement des identifiants aléatoires de requête et de bail, une empreinte SHA-256 dérivée avec l’identifiant aléatoire, l’état de livraison et des données temporelles, qui expirent logiquement et sont programmés pour suppression après 24 heures.", "Cloudflare Workers Logs conserve pendant 7 jours au maximum une seule mesure structurée par envoi réussi, limitée à l’état de la réponse, la langue, la durée de traitement, des catégories UTM source et medium figurant sur des listes autorisées et des indicateurs de présence pour campaign, term et content ; elle exclut le texte UTM original, le contenu du formulaire, les coordonnées, le nom ou la société, les URL de référence, les notes, le jeton Turnstile et l’adresse IP.", "Les e-mails ordinaires sont généralement conservés au maximum 24 mois après le dernier échange substantiel puis supprimés après examen manuel. Si la demande devient un devis, une commande, un contrat ou un paiement, les documents nécessaires sont conservés pendant la durée requise pour exécuter l’opération et respecter les obligations comptables, fiscales et légales."]],
      ["Vos choix et droits", ["Nous n’utilisons pas les demandes pour un marketing que vous n’avez pas choisi. Selon la loi applicable, vous pouvez demander l’accès, la rectification, l’effacement ou la limitation, retirer votre consentement, vous opposer ou saisir l’autorité compétente. Écrivez à {{email}} avec l’objet « Demande de confidentialité » et le minimum d’informations nécessaire. Nous pouvons vérifier votre identité de façon proportionnée et répondrons sous 30 jours ou dans le délai légal. Le retrait n’affecte pas le traitement licite antérieur."]],
      ["Sécurité, données sensibles et enfants", ["Nous utilisons des contrôles d’accès et des garanties de service, mais aucune transmission Internet n’est totalement sûre. N’envoyez pas de pièce d’identité, données bancaires, données de santé ou autres données sensibles. Le service ne s’adresse pas aux enfants. Nous pouvons actualiser cet avis lorsque nos pratiques ou obligations changent ; la date ci-dessus indique la version en vigueur."]]
    ]
  },
  pt: {
    title: "Aviso de privacidade do site | Jabbar Sourcing",
    description: "Como a Jabbar Sourcing trata pedidos, verificação de segurança e análises opcionais no site.",
    h1: "Aviso de privacidade do site",
    updated: "Última atualização: 22 de julho de 2026",
    intro: "Este aviso explica como a Zhejiang Haoduobao Brand Management Co., Ltd. trata as informações pessoais enviadas pelo site da Jabbar Sourcing.",
    settings: "Definições de análise",
    regionalAnalytics: "A Cloudflare utiliza o código do país inferido do pedido de rede apenas para decidir se o painel de escolha de análise deve aparecer automaticamente. A página recebe somente essa decisão geral, não o código do país, e não guardamos a localização. No EEE, Reino Unido e Suíça, ou quando a localização é desconhecida, proveniente de Tor ou indisponível, a análise permanece desativada e o painel pode aparecer automaticamente. Noutras regiões, a análise também permanece desativada por predefinição, mas o painel não abre automaticamente; pode escolher abaixo. Se o navegador enviar um sinal Global Privacy Control (GPC), a análise permanece desativada.",
    sections: [
      ["Responsável pelo tratamento", ["O responsável pelos dados e informações pessoais é Zhejiang Haoduobao Brand Management Co., Ltd. A Jabbar Sourcing Team é a equipa de serviços de compras da empresa para compradores internacionais. Endereço: Edifício 3, n.º 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, China; telefone {{phone}}; e-mail {{email}}."]],
      ["Informações recolhidas", ["Ao enviar um pedido, recolhemos requisitos do produto, URL de referência, categoria, quantidade prevista, orçamento, mercado de destino, contactos, nome ou empresa e notas que decidir fornecer.", "Para atribuição da origem, o e-mail pode incluir o caminho da primeira página visitada, o domínio de referência e valores UTM source, medium, campaign, term e content com comprimento limitado. A Cloudflare pode tratar o endereço IP, informações do navegador e sinais de segurança de rede para prevenir abusos."]],
      ["Finalidades e fundamento", ["Usamos as informações apenas para responder, preparar uma proposta de fornecimento ou cotação, tomar medidas antes de um possível contrato, realizar o acompanhamento necessário e proteger o site. O envio regista que tomou conhecimento deste aviso. O tratamento técnico limitado baseia-se na segurança e nos interesses legítimos permitidos pela lei aplicável."]],
      ["Prestadores e tratamento internacional", ["O formulário utiliza Cloudflare Turnstile, Workers e Email Service para verificar e entregar pedidos. O Google Gmail recebe o e-mail. Se escolher WhatsApp, Gmail, WeChat ou Telegram como canal alternativo, esse prestador trata as informações segundo a sua política. Estes prestadores podem tratar dados fora do seu país ou região."]],
      ["Análise opcional", ["Só carregamos Google Analytics 4 e Microsoft Clarity depois de escolher “Permitir análise”. Podem tratar URLs, informações do dispositivo e navegador, localização de rede aproximada, cliques e diagnósticos de sessão. Os dados de origem podem ser enviados ao Google Analytics 4. Não enviamos intencionalmente produtos, contactos, URLs de referência, notas ou outros campos do pedido a estes serviços. A recusa não afeta o site ou formulário e pode mudar a escolha abaixo.", "A escolha Permitir ou Recusar, a hora e a versão desta política são guardadas apenas neste navegador do dispositivo por até 12 meses; a opção Decidir mais tarde é guardada por até 30 dias. Este registo de preferência não é enviado ao nosso servidor."]],
      ["Conservação", ["A API não conserva o pedido original, contactos, token Turnstile ou endereço IP. Conserva apenas identificadores aleatórios de pedido e locação, uma impressão SHA-256 derivada com o identificador aleatório, estado de entrega e dados temporais, que expiram logicamente e são programados para eliminação após 24 horas.", "O Cloudflare Workers Logs conserva por até 7 dias uma única métrica estruturada por envio bem-sucedido, limitada ao estado da resposta, idioma, tempo de processamento, categorias UTM source e medium incluídas em listas permitidas e indicadores de presença para campaign, term e content; não inclui o texto UTM original, conteúdo do formulário, contactos, nome ou empresa, URLs de referência, notas, token Turnstile ou endereço IP.", "Os e-mails comuns são geralmente conservados até 24 meses após a última comunicação substancial e removidos por revisão manual. Se o pedido resultar em cotação, encomenda, contrato ou pagamento, os registos necessários são conservados pelo período exigido para executar a transação e cumprir obrigações contabilísticas, fiscais e legais."]],
      ["As suas escolhas e direitos", ["Não usamos os dados para marketing que não tenha escolhido. Conforme a lei aplicável, pode pedir acesso, correção, eliminação ou limitação, retirar o consentimento, opor-se ou reclamar à autoridade competente. Escreva para {{email}} com o assunto “Pedido de privacidade” e a informação mínima para localizar o pedido. Podemos verificar a identidade de forma proporcional e responderemos em 30 dias ou no prazo legal. A retirada não afeta o tratamento lícito anterior."]],
      ["Segurança, dados sensíveis e crianças", ["Usamos controlos de acesso e salvaguardas dos serviços, mas nenhuma transmissão pela Internet é totalmente segura. Não envie documentos de identidade, dados de cartões, informações de saúde ou outros dados sensíveis. O serviço não se destina a crianças. Podemos atualizar este aviso quando as práticas ou obrigações mudarem; a data acima identifica a versão atual."]]
    ]
  },
  ru: {
    title: "Уведомление о конфиденциальности сайта | Jabbar Sourcing",
    description: "Как Jabbar Sourcing обрабатывает запросы, проверку безопасности и необязательную аналитику сайта.",
    h1: "Уведомление о конфиденциальности сайта",
    updated: "Последнее обновление: 22 июля 2026 г.",
    intro: "В этом уведомлении описано, как Zhejiang Haoduobao Brand Management Co., Ltd. обрабатывает персональные данные, отправленные через сайт Jabbar Sourcing.",
    settings: "Настройки аналитики",
    regionalAnalytics: "Cloudflare использует код страны, определённый по сетевому запросу, только для решения, следует ли автоматически показывать панель выбора аналитики. Страница получает лишь это общее решение, но не код страны; местоположение мы не сохраняем. В ЕЭЗ, Великобритании и Швейцарии, а также при неизвестном местоположении, Tor или сбое определения аналитика остаётся отключённой, а панель может появиться автоматически. В других регионах аналитика также отключена по умолчанию, но панель не открывается автоматически; сделать выбор можно ниже. Если браузер передаёт сигнал Global Privacy Control (GPC), аналитика остаётся отключённой.",
    sections: [
      ["Ответственное лицо", ["Оператором данных и обработчиком персональной информации является Zhejiang Haoduobao Brand Management Co., Ltd. Jabbar Sourcing Team является службой закупок компании для зарубежных покупателей. Адрес: Building 3, No. 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, China; телефон {{phone}}; электронная почта {{email}}."]],
      ["Какие данные мы собираем", ["При отправке запроса мы получаем требования к товару, ссылку на товар, категорию, предполагаемое количество, бюджет, рынок назначения, контактные данные, имя или название компании и примечания, которые вы укажете.", "Для определения источника письмо может включать путь первой страницы, домен направившего сайта и ограниченные по длине значения UTM source, medium, campaign, term и content. Cloudflare может обрабатывать IP-адрес, сведения о браузере и сигналы сетевой безопасности для предотвращения злоупотреблений."]],
      ["Цели и основания", ["Мы используем данные только для ответа, подготовки предложения или расчёта, действий до возможного договора, необходимого делового сопровождения и защиты сайта. Отправка фиксирует ознакомление с уведомлением. Ограниченная техническая обработка основана на требованиях безопасности и законных интересах, допускаемых применимым правом."]],
      ["Поставщики услуг и международная обработка", ["Форма использует Cloudflare Turnstile, Workers и Email Service для проверки и доставки запроса. Google Gmail получает письмо. Если вы выберете WhatsApp, Gmail, WeChat или Telegram как резервный канал, поставщик обработает данные по собственной политике. Данные могут обрабатываться за пределами вашей страны или региона."]],
      ["Необязательная аналитика", ["Google Analytics 4 и Microsoft Clarity загружаются только после выбора «Разрешить аналитику». Они могут обрабатывать URL страниц, сведения об устройстве и браузере, примерное сетевое местоположение, клики и диагностику сеанса. Данные источника могут передаваться в Google Analytics 4. Мы намеренно не передаём товары, контакты, ссылки, примечания и иные поля запроса этим сервисам. Отказ не влияет на сайт или форму; изменить выбор можно ниже.", "Выбор «Разрешить» или «Отклонить», время выбора и версия этой политики хранятся только в этом браузере на устройстве не более 12 месяцев; выбор «Решить позже» хранится не более 30 дней. Эта запись о предпочтении не отправляется на наш сервер."]],
      ["Срок хранения", ["API не хранит исходный текст, контакты, токен Turnstile и IP-адрес. Сохраняются только случайные идентификаторы запроса и аренды, отпечаток SHA-256, созданный со случайным идентификатором отправки, состояние доставки и время; они логически истекают и планируются к удалению через 24 часа.", "Cloudflare Workers Logs хранит не более 7 дней одну структурированную метрику для каждой успешной отправки: статус ответа, язык, время обработки, категории UTM source и medium из разрешённых списков и признаки наличия campaign, term и content; исходный текст UTM, содержимое формы, контакты, имя или компания, ссылки, примечания, токен Turnstile и IP-адрес в неё не входят.", "Обычные письма Gmail, как правило, хранятся не более 24 месяцев после последнего существенного общения и удаляются вручную. Если запрос становится предложением, заказом, договором или платёжной записью, необходимые документы хранятся для исполнения сделки и соблюдения бухгалтерских, налоговых и правовых обязанностей."]],
      ["Ваш выбор и права", ["Мы не используем запрос для маркетинга, который вы не выбирали. В соответствии с законом вы можете запросить доступ, исправление, удаление или ограничение, отозвать согласие, возразить либо пожаловаться компетентному органу. Напишите на {{email}} с темой «Privacy Request» и минимумом данных для поиска запроса. Мы можем соразмерно подтвердить личность и ответим в течение 30 дней или законного срока. Отзыв не влияет на ранее законную обработку."]],
      ["Безопасность, чувствительные данные и дети", ["Мы применяем контроль доступа и защитные меры сервисов, однако передача через Интернет не бывает полностью безопасной. Не отправляйте удостоверения личности, данные карт, медицинскую или иную чувствительную информацию. Сервис не предназначен для детей. Мы можем обновлять уведомление при изменении практик или обязанностей; дата выше обозначает действующую версию."]]
    ]
  },
  de: {
    title: "Datenschutzhinweis der Website | Jabbar Sourcing",
    description: "Wie Jabbar Sourcing Website-Anfragen, Sicherheitsprüfungen und optionale Analysen verarbeitet.",
    h1: "Datenschutzhinweis der Website",
    updated: "Letzte Aktualisierung: 22. Juli 2026",
    intro: "Dieser Hinweis erläutert, wie Zhejiang Haoduobao Brand Management Co., Ltd. personenbezogene Daten verarbeitet, die über die Jabbar-Sourcing-Website übermittelt werden.",
    settings: "Analyse-Einstellungen",
    regionalAnalytics: "Cloudflare verwendet den aus der Netzwerkanfrage abgeleiteten Ländercode ausschließlich, um zu entscheiden, ob das Auswahlfenster für Analysen automatisch erscheinen soll. Die Seite erhält nur diese grobe Entscheidung, nicht den Ländercode; wir speichern den Standort nicht. Im EWR, im Vereinigten Königreich und in der Schweiz sowie bei unbekanntem Standort, Tor oder fehlgeschlagener Ermittlung bleibt die Analyse deaktiviert und das Fenster kann automatisch erscheinen. In anderen Regionen bleibt die Analyse ebenfalls standardmäßig deaktiviert, das Fenster öffnet sich jedoch nicht automatisch; unten können Sie wählen. Sendet der Browser ein Global-Privacy-Control-Signal (GPC), bleibt die Analyse deaktiviert.",
    sections: [
      ["Verantwortlicher", ["Verantwortlicher für Daten und personenbezogene Informationen ist Zhejiang Haoduobao Brand Management Co., Ltd. Das Jabbar Sourcing Team ist der Beschaffungsservice des Unternehmens für internationale Käufer. Anschrift: Gebäude 3, Nr. 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, China; Telefon {{phone}}; E-Mail {{email}}."]],
      ["Erhobene Informationen", ["Bei einer Anfrage erheben wir Produktanforderungen, Referenz-URL, Kategorie, voraussichtliche Menge, Budget, Zielmarkt, Kontaktdaten, Name oder Unternehmen und freiwillige Hinweise.", "Zur Quellenzuordnung kann die E-Mail den Pfad der ersten Zielseite, den Hostnamen der verweisenden Website und längenbegrenzte UTM-Werte source, medium, campaign, term und content enthalten. Cloudflare kann IP-Adresse, Browserinformationen und Netzwerksicherheitssignale zur Missbrauchsabwehr verarbeiten."]],
      ["Zwecke und Rechtsgrundlagen", ["Wir verwenden die Informationen nur zur Beantwortung, Erstellung eines Beschaffungsvorschlags oder Angebots, Durchführung vorvertraglicher Schritte, notwendigen geschäftlichen Nachverfolgung und zum Schutz der Website. Das Absenden dokumentiert die Kenntnisnahme dieses Hinweises. Begrenzte technische Verarbeitung beruht auf Sicherheit und berechtigten Interessen, soweit das anwendbare Recht dies gestattet."]],
      ["Dienstleister und internationale Verarbeitung", ["Das Formular nutzt Cloudflare Turnstile, Workers und Email Service zur Prüfung und Zustellung. Google Gmail empfängt die E-Mail. Wenn Sie WhatsApp, Gmail, WeChat oder Telegram als Ersatzkanal wählen, verarbeitet der Anbieter die Daten nach seiner eigenen Richtlinie. Die Verarbeitung kann außerhalb Ihres Landes oder Ihrer Region erfolgen."]],
      ["Optionale Analyse", ["Google Analytics 4 und Microsoft Clarity werden erst nach Ihrer Auswahl „Analyse erlauben“ geladen. Sie können Seiten-URLs, Geräte- und Browserinformationen, ungefähren Netzwerkstandort, Klicks und Sitzungsdiagnosen verarbeiten. Quellenangaben können an Google Analytics 4 übermittelt werden. Produkte, Kontaktdaten, Referenz-URLs, Notizen oder andere Formularinhalte senden wir nicht absichtlich an diese Dienste. Eine Ablehnung beeinträchtigt Website und Formular nicht; unten können Sie Ihre Wahl ändern.", "Ihre Auswahl Erlauben oder Ablehnen, der Zeitpunkt und die Version dieses Hinweises werden höchstens 12 Monate lang nur in diesem Browser auf Ihrem Gerät gespeichert; die Auswahl Später entscheiden wird höchstens 30 Tage gespeichert. Dieser Präferenzdatensatz wird nicht an unseren Server gesendet."]],
      ["Speicherdauer", ["Die Anfrage-API speichert weder Rohtext, Kontaktdaten, Turnstile-Token noch IP-Adresse. Gespeichert werden nur zufällige Anfrage- und Lease-Kennungen, ein mit der zufälligen Übermittlungs-ID abgeleiteter SHA-256-Fingerabdruck, Zustellstatus und Zeitdaten; sie laufen logisch ab und werden nach 24 Stunden zur Löschung vorgesehen.", "Cloudflare Workers Logs speichert für höchstens 7 Tage genau eine strukturierte Betriebsmetrik pro erfolgreicher Übermittlung, beschränkt auf Antwortstatus, Sprache, Verarbeitungsdauer, UTM-source- und medium-Kategorien aus festen Positivlisten sowie Vorhandenseinsmerkmale für campaign, term und content; ursprüngliche UTM-Texte, Formularinhalte, Kontaktdaten, Name oder Unternehmen, Referenz-URLs, Notizen, Turnstile-Token und IP-Adresse sind ausgeschlossen.", "Normale Gmail-Anfragen werden gewöhnlich höchstens 24 Monate nach der letzten wesentlichen Kommunikation aufbewahrt und manuell gelöscht. Wird daraus Angebot, Bestellung, Vertrag oder Zahlung, bleiben erforderliche Unterlagen so lange erhalten, wie Transaktion und buchhalterische, steuerliche oder gesetzliche Pflichten dies erfordern."]],
      ["Ihre Wahl und Rechte", ["Wir nutzen Anfragedaten nicht für ungewähltes Marketing. Nach anwendbarem Recht können Sie Auskunft, Berichtigung, Löschung oder Einschränkung verlangen, eine Einwilligung widerrufen, widersprechen oder sich bei der zuständigen Behörde beschweren. Schreiben Sie mit dem Betreff „Datenschutzanfrage“ und den minimal nötigen Angaben an {{email}}. Wir können die Identität verhältnismäßig prüfen und antworten innerhalb von 30 Tagen oder der gesetzlichen Frist. Der Widerruf berührt frühere rechtmäßige Verarbeitung nicht."]],
      ["Sicherheit, sensible Daten und Kinder", ["Wir setzen Zugriffskontrollen und Schutzmaßnahmen der Dienste ein; keine Internetübertragung ist jedoch völlig sicher. Senden Sie keine Ausweise, Kartendaten, Gesundheitsdaten oder andere sensible Informationen. Der Dienst richtet sich nicht an Kinder. Wir können diesen Hinweis bei geänderten Praktiken oder Pflichten aktualisieren; das Datum oben kennzeichnet die aktuelle Fassung."]]
    ]
  },
  it: {
    title: "Informativa sulla privacy del sito | Jabbar Sourcing",
    description: "Come Jabbar Sourcing tratta richieste, verifica di sicurezza e analisi facoltative del sito.",
    h1: "Informativa sulla privacy del sito",
    updated: "Ultimo aggiornamento: 22 luglio 2026",
    intro: "Questa informativa spiega come Zhejiang Haoduobao Brand Management Co., Ltd. tratta i dati personali inviati tramite il sito Jabbar Sourcing.",
    settings: "Preferenze di analisi",
    regionalAnalytics: "Cloudflare usa il codice Paese dedotto dalla richiesta di rete solo per decidere se il pannello delle preferenze di analisi debba apparire automaticamente. La pagina riceve soltanto questa decisione generale, non il codice Paese, e non conserviamo la posizione. Nel SEE, nel Regno Unito e in Svizzera, oppure quando la posizione è sconosciuta, proviene da Tor o non è disponibile, l’analisi resta disattivata e il pannello può apparire automaticamente. Nelle altre regioni l’analisi resta comunque disattivata per impostazione predefinita, ma il pannello non si apre automaticamente; puoi scegliere qui sotto. Se il browser invia un segnale Global Privacy Control (GPC), l’analisi resta disattivata.",
    sections: [
      ["Titolare del trattamento", ["Il titolare dei dati e delle informazioni personali è Zhejiang Haoduobao Brand Management Co., Ltd. Jabbar Sourcing Team è il servizio di approvvigionamento dell’azienda per acquirenti internazionali. Indirizzo: Edificio 3, n. 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, Cina; telefono {{phone}}; e-mail {{email}}."]],
      ["Dati raccolti", ["Quando invii una richiesta raccogliamo requisiti del prodotto, URL di riferimento, categoria, quantità prevista, budget, mercato di destinazione, recapiti, nome o azienda e note che scegli di fornire.", "Per attribuire la provenienza, l’e-mail può includere il percorso della prima pagina, il dominio referente e i valori UTM source, medium, campaign, term e content con lunghezza limitata. Cloudflare può trattare indirizzo IP, dati del browser e segnali di sicurezza di rete per impedire abusi."]],
      ["Finalità e basi", ["Usiamo i dati solo per rispondere, preparare una proposta o un preventivo, adottare misure prima di un possibile contratto, effettuare il necessario seguito commerciale e proteggere il sito. L’invio registra la presa visione dell’informativa. Il trattamento tecnico limitato si fonda sulla sicurezza e sugli interessi legittimi consentiti dalla legge applicabile."]],
      ["Fornitori e trattamento internazionale", ["Il modulo usa Cloudflare Turnstile, Workers ed Email Service per verificare e consegnare le richieste. Google Gmail riceve l’e-mail. Se scegli WhatsApp, Gmail, WeChat o Telegram come canale alternativo, il fornitore tratta i dati secondo la propria informativa. Il trattamento può avvenire fuori dal tuo Paese o dalla tua regione."]],
      ["Analisi facoltative", ["Carichiamo Google Analytics 4 e Microsoft Clarity solo dopo la scelta “Consenti analisi”. Possono trattare URL, dati di dispositivo e browser, posizione di rete approssimativa, clic e diagnostica della sessione. I dati di provenienza possono essere inviati a Google Analytics 4. Non inviamo intenzionalmente prodotti, recapiti, URL di riferimento, note o altri campi della richiesta ai servizi di analisi. Il rifiuto non influisce sul sito o sul modulo; puoi cambiare scelta qui sotto.", "La scelta Consenti o Rifiuta, l’ora e la versione di questa informativa vengono conservate solo in questo browser sul dispositivo per un massimo di 12 mesi; la scelta Decidi più tardi viene conservata per un massimo di 30 giorni. Questo registro delle preferenze non viene inviato al nostro server."]],
      ["Conservazione", ["L’API non conserva il testo originale, i recapiti, il token Turnstile o l’indirizzo IP. Conserva solo identificativi casuali di richiesta e lease, un’impronta SHA-256 derivata con l’ID casuale, stato di consegna e dati temporali, che scadono logicamente e sono programmati per l’eliminazione dopo 24 ore.", "Cloudflare Workers Logs conserva per non più di 7 giorni una sola metrica strutturata per ogni invio riuscito, limitata a stato della risposta, lingua, tempo di elaborazione, categorie UTM source e medium incluse in elenchi consentiti e indicatori di presenza per campaign, term e content; non include il testo UTM originale, contenuto del modulo, recapiti, nome o azienda, URL di riferimento, note, token Turnstile o indirizzo IP.", "Le comuni e-mail Gmail sono di norma conservate per non oltre 24 mesi dall’ultima comunicazione sostanziale e rimosse con revisione manuale. Se la richiesta diventa preventivo, ordine, contratto o pagamento, i documenti necessari sono conservati per eseguire l’operazione e adempiere agli obblighi contabili, fiscali e di legge."]],
      ["Scelte e diritti", ["Non usiamo i dati per marketing non scelto. In base alla legge applicabile puoi chiedere accesso, rettifica, cancellazione o limitazione, revocare il consenso, opporti o presentare reclamo all’autorità competente. Scrivi a {{email}} con oggetto “Richiesta privacy” e le informazioni minime per trovare la richiesta. Potremo verificare l’identità in modo proporzionato e risponderemo entro 30 giorni o nel termine di legge. La revoca non incide sul trattamento lecito precedente."]],
      ["Sicurezza, dati sensibili e minori", ["Adottiamo controlli di accesso e misure di protezione dei servizi, ma nessuna trasmissione Internet è completamente sicura. Non inviare documenti d’identità, dati di carte, dati sanitari o altre informazioni sensibili. Il servizio non è rivolto ai minori. Possiamo aggiornare l’informativa se cambiano pratiche o obblighi; la data sopra identifica la versione corrente."]]
    ]
  },
  tr: {
    title: "Web sitesi gizlilik bildirimi | Jabbar Sourcing",
    description: "Jabbar Sourcing’in web sitesi taleplerini, güvenlik doğrulamasını ve isteğe bağlı analizi nasıl işlediği.",
    h1: "Web sitesi gizlilik bildirimi",
    updated: "Son güncelleme: 22 Temmuz 2026",
    intro: "Bu bildirim, Zhejiang Haoduobao Brand Management Co., Ltd. şirketinin Jabbar Sourcing web sitesi üzerinden gönderilen kişisel bilgileri nasıl işlediğini açıklar.",
    settings: "Analiz tercihleri",
    regionalAnalytics: "Cloudflare, ağ isteğinden çıkarılan ülke kodunu yalnızca analiz tercih panelinin otomatik gösterilip gösterilmeyeceğine karar vermek için kullanır. Sayfa ülke kodunu değil, yalnızca bu genel kararı alır ve konumu saklamayız. AEA, Birleşik Krallık ve İsviçre’de ya da konum bilinmediğinde, Tor üzerinden geldiğinde veya belirlenemediğinde analiz kapalı kalır ve panel otomatik görünebilir. Diğer bölgelerde de analiz varsayılan olarak kapalıdır, ancak panel otomatik açılmaz; aşağıdan seçim yapabilirsiniz. Tarayıcı Global Privacy Control (GPC) sinyali gönderirse analiz kapalı kalır.",
    sections: [
      ["Sorumlu kuruluş", ["Veri sorumlusu ve kişisel bilgi işleyicisi Zhejiang Haoduobao Brand Management Co., Ltd.’dir. Jabbar Sourcing Team, şirketin uluslararası alıcılara yönelik tedarik hizmeti ekibidir. Adres: Bina 3, No. 219 Sufu Road, Suxi Town, Yiwu, Jinhua, Zhejiang, Çin; telefon {{phone}}; e-posta {{email}}."]],
      ["Topladığımız bilgiler", ["Talep gönderdiğinizde ürün gereksinimleri, referans URL’si, kategori, beklenen miktar, bütçe, hedef pazar, iletişim bilgileri, ad veya şirket ve vermeyi seçtiğiniz notları toplarız.", "Kaynak ilişkilendirmesi için e-posta ilk açılış sayfası yolunu, yönlendiren alan adını ve uzunluğu sınırlı UTM source, medium, campaign, term ve content değerlerini içerebilir. Cloudflare kötüye kullanımı önlemek için IP adresi, tarayıcı bilgisi ve ağ güvenliği sinyallerini işleyebilir."]],
      ["Amaçlar ve dayanak", ["Bilgileri yalnızca yanıt vermek, tedarik teklifi veya fiyat hazırlamak, olası sözleşme öncesi adımları atmak, gerekli iş takibini yapmak ve siteyi korumak için kullanırız. Gönderim, bu bildirimi gördüğünüzü kaydeder. Sınırlı teknik işleme, geçerli hukukun izin verdiği güvenlik ve meşru menfaatlere dayanır."]],
      ["Hizmet sağlayıcılar ve uluslararası işleme", ["Form, doğrulama ve teslim için Cloudflare Turnstile, Workers ve Email Service kullanır. Google Gmail e-postayı alır. Alternatif kanal olarak WhatsApp, Gmail, WeChat veya Telegram seçerseniz sağlayıcı bilgileri kendi politikasına göre işler. Veriler ülkeniz veya bölgeniz dışında işlenebilir."]],
      ["İsteğe bağlı analiz", ["Google Analytics 4 ve Microsoft Clarity yalnızca “Analize izin ver” seçiminizden sonra yüklenir. Sayfa URL’leri, cihaz ve tarayıcı bilgileri, yaklaşık ağ konumu, tıklamalar ve oturum tanılamasını işleyebilirler. Kaynak verileri Google Analytics 4’e gönderilebilir. Ürünleri, iletişim bilgilerini, referans URL’lerini, notları veya diğer talep alanlarını bu hizmetlere bilerek göndermeyiz. Reddetmek siteyi veya formu etkilemez; seçiminizi aşağıdan değiştirebilirsiniz.", "İzin ver veya Reddet seçiminiz, seçim zamanı ve bu politikanın sürümü yalnızca cihazınızdaki bu tarayıcıda en fazla 12 ay saklanır; Daha sonra karar ver seçimi en fazla 30 gün saklanır. Bu tercih kaydı sunucumuza gönderilmez."]],
      ["Saklama", ["Talep API’si ham talebi, iletişim bilgilerini, Turnstile belirtecini veya IP adresini tutmaz. Yalnızca rastgele talep ve lease kimlikleri, rastgele gönderim kimliğiyle türetilen SHA-256 parmak izi, teslim durumu ve zaman verileri tutulur; bunlar 24 saat sonra mantıksal olarak sona erer ve silinmek üzere planlanır.", "Cloudflare Workers Logs, her başarılı gönderim için yalnızca yanıt durumu, dil, işlem süresi, izin listelerindeki UTM source ve medium kategorileri ile campaign, term ve content için varlık göstergelerini içeren tek bir yapılandırılmış metriği en fazla 7 gün saklar; özgün UTM metni, form içeriği, iletişim bilgileri, ad veya şirket, referans URL'leri, notlar, Turnstile belirteci ve IP adresi bu metriğe dahil edilmez.", "Normal Gmail talepleri son önemli iletişimden sonra genellikle en fazla 24 ay tutulur ve manuel incelemeyle silinir. Talep teklif, sipariş, sözleşme veya ödeme kaydına dönüşürse gerekli kayıtlar işlemi yürütmek ve muhasebe, vergi ve hukuki yükümlülükleri karşılamak için gereken süre boyunca saklanır."]],
      ["Seçimleriniz ve haklarınız", ["Talep bilgilerini seçmediğiniz pazarlama için kullanmayız. Geçerli hukuka göre erişim, düzeltme, silme veya kısıtlama talep edebilir; onayı geri çekebilir, itiraz edebilir veya yetkili kuruma şikâyet edebilirsiniz. Konuya “Gizlilik Talebi” yazarak ve talebi bulmak için gereken asgari bilgilerle {{email}} adresine ulaşın. Ölçülü kimlik doğrulaması yapabilir ve 30 gün içinde veya yasal sürede yanıtlarız. Geri çekme önceki hukuka uygun işlemeyi etkilemez."]],
      ["Güvenlik, hassas bilgiler ve çocuklar", ["Erişim kontrolleri ve hizmet güvenlik önlemleri kullanırız; ancak hiçbir İnternet aktarımı tamamen güvenli değildir. Kimlik belgesi, kart verisi, sağlık bilgisi veya başka hassas bilgi göndermeyin. Hizmet çocuklara yönelik değildir. Uygulamalarımız veya yükümlülüklerimiz değişirse bildirimi güncelleyebiliriz; yukarıdaki tarih geçerli sürümü gösterir."]]
    ]
  }
};

function contactMarkup(text) {
  return text
    .replaceAll("{{phone}}", '<a class="num-mono" href="tel:+8618658925544">+8618658925544</a>')
    .replaceAll("{{email}}", '<!--email_off--><a href="mailto:qianjiabao1999@gmail.com">qianjiabao1999@gmail.com</a><!--/email_off-->');
}

function alternateLinks() {
  const links = [
    `    <link rel="alternate" hreflang="x-default" href="${ORIGIN}${routes.en.path}" />`
  ];
  for (const route of Object.values(routes)) {
    links.push(`    <link rel="alternate" hreflang="${route.hreflang}" href="${ORIGIN}${route.path}" />`);
  }
  return links.join("\n");
}

function footerFor(locale) {
  const source = fs.readFileSync(path.join(ROOT, locale, "index.html"), "utf8");
  const match = source.match(/<footer class="site-footer"[\s\S]*?<\/footer>/);
  if (!match) throw new Error(`${locale}/index.html: localized footer not found`);
  return match[0].replace(
    'class="contact-link contact-wechat js-contact-modal-open" href="#wechat-modal" data-modal-target="wechat-modal"',
    'class="contact-link contact-wechat js-app-open" href="weixin://" data-app-link="weixin://" data-web-link="weixin://" data-no-fallback="true"'
  );
}

function page(locale) {
  const route = routes[locale];
  const value = copy[locale];
  const sectionMarkup = value.sections.map(([heading, paragraphs], index) => {
    const localizedParagraphs = index === 4
      ? [...paragraphs, value.regionalAnalytics]
      : paragraphs;
    return [
      `        <section${index === 0 ? ' id="website-inquiries"' : ""}>`,
      `          <h2>${heading}</h2>`,
      ...localizedParagraphs.map((paragraph) => `          <p>${contactMarkup(paragraph)}</p>`),
      "        </section>"
    ].join("\n");
  }).join("\n");

  return `<!doctype html>
<html lang="${route.lang}"${route.dir ? ` dir="${route.dir}"` : ""}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${value.description}" />
    <meta name="theme-color" content="#173f35" />
    <meta property="og:site_name" content="Jabbar Sourcing" />
    <meta property="og:title" content="${value.title}" />
    <meta property="og:description" content="${value.description}" />
    <meta property="og:image" content="${ORIGIN}/assets/og-cover-whatsapp.jpg" />
    <meta property="og:image:alt" content="Jabbar Sourcing" />
    <meta property="og:url" content="${ORIGIN}${route.path}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${value.title}" />
    <meta name="twitter:description" content="${value.description}" />
    <title>${value.title}</title>
    <link rel="canonical" href="${ORIGIN}${route.path}" />
${alternateLinks()}
    <link rel="icon" href="/assets/favicon.png?v=jabbar-5" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=jabbar-5" sizes="180x180" />
    <link rel="stylesheet" href="/styles.min.css?v=apple-179" />
    <script src="/assets/analytics-consent.js?v=${CONSENT_VERSION}" defer></script>
    <script src="/script.js?v=apple-154" defer></script>
  </head>
  <body class="legal-page">
    <header class="site-header legal-header">
      <div class="container-wide nav-wrap">
        <a class="brand" href="${route.home}" aria-label="Jabbar Sourcing">
          <span class="brand-mark" aria-hidden="true">J</span>
          <span>Jabbar Sourcing</span>
        </a>
      </div>
    </header>
    <main class="legal-main">
      <section class="legal-hero">
        <div class="container-wide legal-hero-inner">
          <span class="section-kicker light">Jabbar Sourcing</span>
          <h1>${value.h1}</h1>
          <p>${value.updated}</p>
        </div>
      </section>
      <article class="container-narrow legal-content">
        <p>${value.intro}</p>
${sectionMarkup}
        <button class="privacy-consent-control" type="button" data-analytics-consent-open>${value.settings}</button>
      </article>
    </main>
    ${footerFor(locale)}
    <script src="/assets/site-enhancements.js?v=${UI_VERSION}" defer></script>
  </body>
</html>
`;
}

let written = 0;
for (const locale of Object.keys(copy)) {
  const target = path.join(ROOT, locale, "website-privacy-policy.html");
  fs.writeFileSync(target, page(locale));
  written += 1;
}

const sitemapPath = path.join(ROOT, "sitemap.xml");
const sitemapSource = fs.readFileSync(sitemapPath, "utf8");
const sitemapAlternates = [
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${routes.en.path}" />`,
  ...Object.values(routes).map((route) => `    <xhtml:link rel="alternate" hreflang="${route.hreflang}" href="${ORIGIN}${route.path}" />`)
].join("\n");
const sitemapPolicies = Object.values(routes).map((route) => [
  "  <url>",
  `    <loc>${ORIGIN}${route.path}</loc>`,
  "    <lastmod>2026-07-22</lastmod>",
  "    <changefreq>yearly</changefreq>",
  "    <priority>0.3</priority>",
  sitemapAlternates,
  "  </url>"
].join("\n")).join("\n");
const sitemapPattern = /  <url>\n    <loc>https:\/\/www\.jabbarsourcing\.com\/website-privacy-policy\.html<\/loc>[\s\S]*?(?=  <url>\n    <loc>https:\/\/www\.jabbarsourcing\.com\/support\.html<\/loc>)/;
if (!sitemapPattern.test(sitemapSource)) throw new Error("sitemap.xml: website privacy policy block not found");
fs.writeFileSync(sitemapPath, sitemapSource.replace(sitemapPattern, sitemapPolicies + "\n"));

console.log(`Generated ${written} localized website privacy policies and updated sitemap.xml.`);
