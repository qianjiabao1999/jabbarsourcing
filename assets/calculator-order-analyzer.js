/* Jabbar Sourcing local order workbook analyzer. No workbook data is uploaded. */
(function () {
  "use strict";

  var VERSION = "order-20260714b";
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  var WORKER_TIMEOUT_MS = 60000;
  var WORKER_URL = "/assets/calculator-order-worker.js?v=" + VERSION;
  var CORE_URL = "/assets/calculator-order-worker.js?v=" + VERSION;
  var XLSX_URL = "/assets/vendor/xlsx.full.min.js?v=0.20.3";
  var FIELD_KEYS = ["product", "sku", "qty", "cartons", "unitWeight", "totalWeight", "unitVolume", "totalVolume", "unitPrice", "amount", "length", "width", "height", "currency", "weightUnit", "volumeUnit", "dimensionUnit"];
  var scriptPromises = {};

  var EN = {
    eyebrow: "ORDER WORKBOOK",
    title: "Analyze an Excel order",
    intro: "Upload a customer order to calculate products, quantity, weight, volume, value and container usage.",
    privacy: "Processed only in this browser. The workbook is not uploaded to Jabbar Sourcing or any third party.",
    dropLead: "Drop an Excel file here or choose a file",
    dropHint: ".xlsx, .xls, .xlsm or .csv · up to 50 MB",
    selectedFile: "Selected file",
    parsing: "Reading the workbook locally…",
    loadingLib: "Loading the local Excel reader…",
    ready: "Analysis complete. Review the detected columns before exporting.",
    fileTooLarge: "The file is larger than 50 MB.",
    unsupported: "Please choose an Excel or CSV file.",
    parseError: "This workbook could not be read. Check that it is not password protected or damaged.",
    mappingTitle: "Check detected columns and defaults",
    mappingHelp: "Columns are detected automatically. Reassign only a misidentified column. Source units are converted to kg, m³ and cm; order values are reported in CNY.",
    sheet: "Worksheet",
    headerRow: "Header row",
    confirmUnits: "Confirm units",
    weightUnit: "Weight unit",
    volumeUnit: "Volume unit",
    dimensionUnit: "Dimension unit",
    currency: "Currency",
    autoPending: "Auto / pending confirmation",
    apply: "Confirm mapping and recalculate",
    ignore: "Ignore this column",
    resultTitle: "Order analysis",
    productRows: "Product rows",
    uniqueProducts: "Unique products",
    quantity: "Total quantity",
    cartons: "Total cartons",
    volume: "Total volume",
    weight: "Total weight",
    amount: "Order value",
    missing: "Not provided",
    unitPending: "unit pending",
    currencyPending: "currency pending",
    warningsTitle: "Please confirm",
    detailsTitle: "Product details",
    sourceRow: "Row",
    product: "Product",
    sku: "SKU",
    exportPng: "Export complete result image",
    noResult: "Analyze a workbook first.",
    exportPreparing: "Preparing the complete PNG report…",
    exportDone: "The complete PNG report has been downloaded.",
    exportError: "The PNG report could not be created in this browser.",
    confirmBeforeExport: "Confirm the detected column meanings before exporting.",
    incompleteBlocked: "This workbook exceeds the safe analysis limit. Split it into smaller files so every row is included before exporting.",
    negativeBlocked: "Negative quantities or values were found. Correct or remove those rows before exporting.",
    containerTitle: "Container estimate",
    lcl: "LCL / trial shipment",
    twenty: "20GP",
    forty: "40GP",
    fortyHq: "40HQ",
    containerCount: "About {n} × 40HQ",
    provisional: "Provisional until the volume unit is confirmed",
    reportTitle: "ORDER ANALYSIS REPORT",
    generated: "Generated",
    page: "Page {current} / {total}",
    file: "File",
    warnings: {
      weight_unit_pending: "Weight was treated provisionally as kg. Confirm the unit above.",
      volume_unit_pending: "Volume was treated provisionally as m³. Confirm the unit above.",
      currency_pending: "The workbook does not identify a currency. Confirm it above.",
      dimension_unit_pending: "Dimensions were treated provisionally as cm. Confirm their unit.",
      weight_meaning_pending: "The generic weight column is treated as per-unit weight. Confirm the mapping or change it to line-total weight.",
      volume_meaning_pending: "The generic volume column is treated as per-unit volume. Confirm the mapping or change it to line-total volume.",
      rows_truncated: "More than 10,000 rows were found. Export is blocked until the workbook is split so every row can be included.",
      columns_truncated: "More than 100 columns were found. Export is blocked until the workbook is simplified so no data is omitted.",
      summary_rows_skipped: "Summary/total rows were excluded to avoid double counting.",
      negative_values_skipped: "{n} row(s) with negative quantities or values were excluded.",
      subtotal_mismatch: "{n} row(s) have a subtotal different from unit price × quantity; the supplied subtotal was used.",
      unit_weight_multiplied: "Unit weight was multiplied by quantity.",
      unit_volume_multiplied: "Unit volume was multiplied by quantity.",
      unit_price_multiplied: "Unit price was multiplied by quantity where no line subtotal existed.",
      no_product_rows: "No product rows were found with the current mapping."
    },
    fields: {
      product: "Product name", sku: "SKU / item code", qty: "Quantity", cartons: "Cartons",
      unitWeight: "Weight per unit", totalWeight: "Line total weight", unitVolume: "Volume per unit", totalVolume: "Line total volume",
      unitPrice: "Unit price", amount: "Line subtotal / amount", length: "Length", width: "Width", height: "Height",
      currency: "Currency column", weightUnit: "Weight-unit column", volumeUnit: "Volume-unit column", dimensionUnit: "Dimension-unit column"
    }
  };

  var LOCALES = {
    en: EN,
    zh: Object.assign({}, EN, {
      eyebrow: "订单表格分析", title: "上传 Excel 自动统计订单", intro: "自动统计商品种类、数量、重量、体积、金额，并生成集装箱装载可视化。",
      privacy: "文件只在当前浏览器本地处理，不会上传到 Jabbar Sourcing 或任何第三方。", dropLead: "拖入 Excel 表格，或点击选择文件", dropHint: ".xlsx、.xls、.xlsm 或 .csv，最大 50 MB",
      selectedFile: "已选择文件", parsing: "正在本地读取表格…", loadingLib: "正在加载本地 Excel 解析组件…", ready: "分析完成。导出前请检查识别的列。",
      fileTooLarge: "文件超过 50 MB，暂时无法处理。", unsupported: "请选择 Excel 或 CSV 文件。", parseError: "无法读取此表格，请确认文件未加密、未损坏。",
      mappingTitle: "检查列识别与默认设置", mappingHelp: "每一列都可以重新指定。系统固定采用 kg、m³/CBM、cm 和 CNY/RMB；通用重量或体积标题会结合合计行自动复核。",
      sheet: "工作表", headerRow: "表头所在行", confirmUnits: "确认单位", weightUnit: "重量单位", volumeUnit: "体积单位", dimensionUnit: "尺寸单位", currency: "币种", autoPending: "自动识别 / 待确认", apply: "确认映射并重新计算", ignore: "忽略此列",
      resultTitle: "订单自动统计结果", productRows: "商品行数", uniqueProducts: "商品种类", quantity: "总数量", cartons: "总箱数", volume: "总体积", weight: "总重量", amount: "订单金额", missing: "表格未提供", unitPending: "单位待确认", currencyPending: "币种待确认",
      warningsTitle: "请确认以下信息", detailsTitle: "全部商品明细", sourceRow: "行号", product: "商品", sku: "货号", exportPng: "导出完整结果图片",
      noResult: "请先上传并分析一个订单表格。", exportPreparing: "正在生成包含全部明细的 PNG 图片…", exportDone: "完整结果图片已下载。", exportError: "当前浏览器无法生成结果图片。",
      confirmBeforeExport: "导出前请确认识别的列含义。", incompleteBlocked: "表格超过安全分析上限。请拆分为较小文件，确保每一行都能纳入后再导出。", negativeBlocked: "检测到负数数量或数值。请先修正或删除这些行，再导出。",
      containerTitle: "集装箱装载估算", lcl: "适合拼箱或小批量试单", twenty: "20英尺普柜", forty: "40英尺普柜", fortyHq: "40英尺高柜", containerCount: "约需 {n} 个40英尺高柜", provisional: "体积单位确认前仅供暂估",
      reportTitle: "订单自动统计报告", generated: "生成时间", page: "第 {current} / {total} 页", file: "文件",
      warnings: Object.assign({}, EN.warnings, {
        weight_unit_pending: "重量暂按千克计算，请在上方确认单位。", volume_unit_pending: "体积暂按立方米计算，请在上方确认单位。", currency_pending: "表格没有标明币种，请在上方确认。", dimension_unit_pending: "尺寸暂按厘米计算，请确认尺寸单位。",
        weight_meaning_pending: "通用“重量”列暂按单件重量计算。请确认当前映射，或改为本行总重量。", volume_meaning_pending: "通用“体积”列暂按单件体积计算。请确认当前映射，或改为本行总体积。",
        rows_truncated: "检测到超过 10,000 个数据行。为避免漏项，拆分表格前禁止导出。", columns_truncated: "检测到超过 100 列。为避免漏项，精简表格前禁止导出。", summary_rows_skipped: "为避免重复统计，已排除合计/总计行。",
        negative_values_skipped: "已排除 {n} 行包含负数数量或金额的数据。", subtotal_mismatch: "有 {n} 行的小计与“单价 × 数量”不一致，本次以表格小计为准。",
        unit_weight_multiplied: "已按“单件重量 × 数量”计算总重量。", unit_volume_multiplied: "已按“单件体积 × 数量”计算总体积。", unit_price_multiplied: "没有小计时，已按“单价 × 数量”计算金额。", no_product_rows: "当前列映射下没有识别到商品数据行。"
      }),
      fields: { product: "商品名称", sku: "SKU / 货号", qty: "数量", cartons: "箱数", unitWeight: "单件重量", totalWeight: "本行总重量", unitVolume: "单件体积", totalVolume: "本行总体积", unitPrice: "单价", amount: "小计 / 金额", length: "长", width: "宽", height: "高", currency: "币种列", weightUnit: "重量单位列", volumeUnit: "体积单位列", dimensionUnit: "尺寸单位列" }
    }),
    es: {
      eyebrow: "HOJA DE PEDIDO",
      title: "Analizar un pedido de Excel",
      intro: "Sube un pedido de cliente para calcular productos, cantidad, peso, volumen, valor y ocupación del contenedor.",
      privacy: "El archivo se procesa únicamente en este navegador. No se envía a Jabbar Sourcing ni a terceros.",
      dropLead: "Suelta aquí un archivo Excel o selecciónalo",
      dropHint: ".xlsx, .xls, .xlsm o .csv · máximo 50 MB",
      selectedFile: "Archivo seleccionado",
      parsing: "Leyendo el archivo localmente…",
      loadingLib: "Cargando el lector local de Excel…",
      ready: "Análisis terminado. Revisa las columnas detectadas antes de exportar.",
      fileTooLarge: "El archivo supera los 50 MB.",
      unsupported: "Selecciona un archivo Excel o CSV.",
      parseError: "No se pudo leer este archivo. Comprueba que no esté protegido con contraseña ni dañado.",
      mappingTitle: "Revisar columnas y valores predeterminados",
      mappingHelp: "Las columnas se detectan automáticamente. Reasigna solo las que estén mal identificadas. Las unidades de origen se convierten a kg, m³ y cm; los importes se muestran en CNY.",
      sheet: "Hoja de cálculo",
      headerRow: "Fila de encabezados",
      confirmUnits: "Confirmar unidades",
      weightUnit: "Unidad de peso",
      volumeUnit: "Unidad de volumen",
      dimensionUnit: "Unidad de medida",
      currency: "Moneda",
      autoPending: "Automático / pendiente de confirmar",
      apply: "Confirmar la asignación y recalcular",
      ignore: "Ignorar esta columna",
      resultTitle: "Análisis del pedido",
      productRows: "Filas de producto",
      uniqueProducts: "Productos distintos",
      quantity: "Cantidad total",
      cartons: "Cajas totales",
      volume: "Volumen total",
      weight: "Peso total",
      amount: "Valor del pedido",
      missing: "No indicado",
      unitPending: "unidad pendiente",
      currencyPending: "moneda pendiente",
      warningsTitle: "Confirma estos datos",
      detailsTitle: "Detalle de productos",
      sourceRow: "Fila",
      product: "Producto",
      sku: "SKU",
      exportPng: "Exportar imagen completa del resultado",
      noResult: "Primero analiza un archivo de pedido.",
      exportPreparing: "Preparando el informe PNG completo…",
      exportDone: "El informe PNG completo se ha descargado.",
      exportError: "No se pudo crear el informe PNG en este navegador.",
      confirmBeforeExport: "Confirma el significado de las columnas detectadas antes de exportar.",
      incompleteBlocked: "Este archivo supera el límite de análisis seguro. Divídelo en archivos más pequeños antes de exportar.",
      negativeBlocked: "Se detectaron cantidades o valores negativos. Corrige o elimina esas filas antes de exportar.",
      containerTitle: "Estimación del contenedor",
      lcl: "LCL / envío de prueba",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Aprox. {n} × 40HQ",
      provisional: "Provisional hasta confirmar la unidad de volumen",
      reportTitle: "INFORME DE ANÁLISIS DEL PEDIDO",
      generated: "Generado",
      page: "Página {current} / {total}",
      file: "Archivo",
      warnings: {
        weight_unit_pending: "El peso se calculó provisionalmente en kg. Confirma la unidad arriba.",
        volume_unit_pending: "El volumen se calculó provisionalmente en m³. Confirma la unidad arriba.",
        currency_pending: "El archivo no indica la moneda. Confírmala arriba.",
        dimension_unit_pending: "Las dimensiones se interpretaron provisionalmente en cm. Confirma su unidad.",
        weight_meaning_pending: "La columna genérica de peso se interpreta como peso por unidad. Confirma la asignación o cámbiala a peso total de la línea.",
        volume_meaning_pending: "La columna genérica de volumen se interpreta como volumen por unidad. Confirma la asignación o cámbiala a volumen total de la línea.",
        rows_truncated: "Se encontraron más de 10.000 filas. La exportación queda bloqueada hasta dividir el archivo.",
        columns_truncated: "Se encontraron más de 100 columnas. La exportación queda bloqueada hasta simplificar el archivo.",
        summary_rows_skipped: "Se excluyeron las filas de resumen o total para evitar duplicar valores.",
        negative_values_skipped: "Se excluyeron {n} fila(s) con cantidades o valores negativos.",
        subtotal_mismatch: "En {n} fila(s), el subtotal difiere de precio unitario × cantidad; se utilizó el subtotal proporcionado.",
        unit_weight_multiplied: "El peso unitario se multiplicó por la cantidad.",
        unit_volume_multiplied: "El volumen unitario se multiplicó por la cantidad.",
        unit_price_multiplied: "Cuando no había subtotal de línea, el precio unitario se multiplicó por la cantidad.",
        no_product_rows: "No se encontraron filas de producto con la asignación actual."
      },
      fields: {
        product: "Nombre del producto", sku: "SKU / código del artículo", qty: "Cantidad", cartons: "Cajas",
        unitWeight: "Peso por unidad", totalWeight: "Peso total de la línea", unitVolume: "Volumen por unidad", totalVolume: "Volumen total de la línea",
        unitPrice: "Precio unitario", amount: "Subtotal / importe de la línea", length: "Largo", width: "Ancho", height: "Alto",
        currency: "Columna de moneda", weightUnit: "Columna de unidad de peso", volumeUnit: "Columna de unidad de volumen", dimensionUnit: "Columna de unidad de medida"
      }
    },
    ar: {
      eyebrow: "جدول الطلب",
      title: "تحليل طلب Excel",
      intro: "ارفع طلب العميل لحساب المنتجات والكمية والوزن والحجم والقيمة ونسبة استخدام الحاوية.",
      privacy: "تتم معالجة الملف داخل هذا المتصفح فقط، ولا يُرفع إلى Jabbar Sourcing أو أي طرف ثالث.",
      dropLead: "أسقط ملف Excel هنا أو اختر ملفًا",
      dropHint: ".xlsx أو .xls أو .xlsm أو .csv · بحد أقصى 50 MB",
      selectedFile: "الملف المحدد",
      parsing: "جارٍ قراءة الملف محليًا…",
      loadingLib: "جارٍ تحميل قارئ Excel المحلي…",
      ready: "اكتمل التحليل. راجع الأعمدة والوحدات المكتشفة قبل إرسال النتيجة.",
      fileTooLarge: "حجم الملف أكبر من 50 MB.",
      unsupported: "يرجى اختيار ملف Excel أو CSV.",
      parseError: "تعذرت قراءة هذا الملف. تحقق من أنه غير محمي بكلمة مرور وغير تالف.",
      mappingTitle: "مراجعة الأعمدة والإعدادات الافتراضية",
      mappingHelp: "يتم اكتشاف الأعمدة تلقائيًا. أعد تعيين العمود فقط إذا تم التعرف عليه بصورة خاطئة. تُحوّل الوحدات إلى kg وm³ وcm وتُعرض القيم بعملة CNY.",
      sheet: "ورقة العمل",
      headerRow: "صف العناوين",
      confirmUnits: "تأكيد الوحدات",
      weightUnit: "وحدة الوزن",
      volumeUnit: "وحدة الحجم",
      dimensionUnit: "وحدة القياس",
      currency: "العملة",
      autoPending: "تلقائي / بانتظار التأكيد",
      apply: "تأكيد التعيين وإعادة الحساب",
      ignore: "تجاهل هذا العمود",
      resultTitle: "تحليل الطلب",
      productRows: "صفوف المنتجات",
      uniqueProducts: "المنتجات المختلفة",
      quantity: "إجمالي الكمية",
      cartons: "إجمالي الكراتين",
      volume: "إجمالي الحجم",
      weight: "إجمالي الوزن",
      amount: "قيمة الطلب",
      missing: "غير متوفر",
      unitPending: "الوحدة بانتظار التأكيد",
      currencyPending: "العملة بانتظار التأكيد",
      warningsTitle: "يرجى التأكيد",
      detailsTitle: "تفاصيل المنتجات",
      sourceRow: "الصف",
      product: "المنتج",
      sku: "SKU",
      exportPng: "تصدير صورة النتيجة الكاملة",
      noResult: "حلّل ملف طلب أولًا.",
      exportPreparing: "جارٍ إعداد تقرير PNG الكامل…",
      exportDone: "تم تنزيل تقرير PNG الكامل.",
      exportError: "تعذر إنشاء تقرير PNG في هذا المتصفح.",
      confirmBeforeExport: "أكّد معاني الأعمدة المكتشفة قبل التصدير.",
      incompleteBlocked: "يتجاوز هذا الملف حد التحليل الآمن. قسّمه إلى ملفات أصغر قبل التصدير.",
      negativeBlocked: "تم اكتشاف كميات أو قيم سالبة. صحّح هذه الصفوف أو احذفها قبل التصدير.",
      containerTitle: "تقدير الحاوية",
      lcl: "LCL / شحنة تجريبية",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "حوالي {n} × 40HQ",
      provisional: "تقدير مؤقت حتى تأكيد وحدة الحجم",
      reportTitle: "تقرير تحليل الطلب",
      generated: "تاريخ الإنشاء",
      page: "الصفحة {current} / {total}",
      file: "الملف",
      warnings: {
        weight_unit_pending: "اعتُبر الوزن مؤقتًا بوحدة kg. أكّد الوحدة أعلاه.",
        volume_unit_pending: "اعتُبر الحجم مؤقتًا بوحدة m³. أكّد الوحدة أعلاه.",
        currency_pending: "لا يحدد الملف العملة. أكّدها أعلاه.",
        dimension_unit_pending: "اعتُبرت الأبعاد مؤقتًا بوحدة cm. أكّد وحدتها.",
        weight_meaning_pending: "يُعامل عمود الوزن العام كوزن للوحدة. أكّد التعيين أو غيّره إلى إجمالي وزن السطر.",
        volume_meaning_pending: "يُعامل عمود الحجم العام كحجم للوحدة. أكّد التعيين أو غيّره إلى إجمالي حجم السطر.",
        rows_truncated: "تم العثور على أكثر من 10,000 صف. يُحظر التصدير حتى تقسيم الملف.",
        columns_truncated: "تم العثور على أكثر من 100 عمود. يُحظر التصدير حتى تبسيط الملف.",
        summary_rows_skipped: "تم استبعاد صفوف الملخص أو الإجمالي لتجنب احتساب القيم مرتين.",
        negative_values_skipped: "تم استبعاد {n} صف يحتوي على كميات أو قيم سالبة.",
        subtotal_mismatch: "يختلف المجموع الفرعي في {n} صف عن سعر الوحدة × الكمية؛ تم اعتماد المجموع الفرعي الوارد في الملف.",
        unit_weight_multiplied: "تم ضرب وزن الوحدة في الكمية.",
        unit_volume_multiplied: "تم ضرب حجم الوحدة في الكمية.",
        unit_price_multiplied: "عند عدم وجود مجموع فرعي للسطر، تم ضرب سعر الوحدة في الكمية.",
        no_product_rows: "لم يتم العثور على صفوف منتجات وفق تعيين الأعمدة الحالي."
      },
      fields: {
        product: "اسم المنتج", sku: "SKU / رمز الصنف", qty: "الكمية", cartons: "الكراتين",
        unitWeight: "وزن الوحدة", totalWeight: "إجمالي وزن السطر", unitVolume: "حجم الوحدة", totalVolume: "إجمالي حجم السطر",
        unitPrice: "سعر الوحدة", amount: "المجموع الفرعي / مبلغ السطر", length: "الطول", width: "العرض", height: "الارتفاع",
        currency: "عمود العملة", weightUnit: "عمود وحدة الوزن", volumeUnit: "عمود وحدة الحجم", dimensionUnit: "عمود وحدة القياس"
      }
    },
    fr: {
      eyebrow: "FEUILLE DE COMMANDE",
      title: "Analyser une commande Excel",
      intro: "Importez une commande client pour calculer les produits, la quantité, le poids, le volume, la valeur et le taux de chargement du conteneur.",
      privacy: "Le fichier est traité uniquement dans ce navigateur. Il n’est envoyé ni à Jabbar Sourcing ni à un tiers.",
      dropLead: "Déposez un fichier Excel ici ou choisissez un fichier",
      dropHint: ".xlsx, .xls, .xlsm ou .csv · 50 MB maximum",
      selectedFile: "Fichier sélectionné",
      parsing: "Lecture locale du fichier…",
      loadingLib: "Chargement du lecteur Excel local…",
      ready: "Analyse terminée. Vérifiez les colonnes détectées avant l’exportation.",
      fileTooLarge: "Le fichier dépasse 50 MB.",
      unsupported: "Choisissez un fichier Excel ou CSV.",
      parseError: "Ce fichier ne peut pas être lu. Vérifiez qu’il n’est ni protégé par mot de passe ni endommagé.",
      mappingTitle: "Vérifier les colonnes et les valeurs par défaut",
      mappingHelp: "Les colonnes sont détectées automatiquement. Ne réaffectez qu’une colonne mal identifiée. Les unités source sont converties en kg, m³ et cm ; les montants sont affichés en CNY.",
      sheet: "Feuille de calcul",
      headerRow: "Ligne d’en-tête",
      confirmUnits: "Confirmer les unités",
      weightUnit: "Unité de poids",
      volumeUnit: "Unité de volume",
      dimensionUnit: "Unité de mesure",
      currency: "Devise",
      autoPending: "Automatique / à confirmer",
      apply: "Confirmer la correspondance et recalculer",
      ignore: "Ignorer cette colonne",
      resultTitle: "Analyse de la commande",
      productRows: "Lignes produit",
      uniqueProducts: "Produits distincts",
      quantity: "Quantité totale",
      cartons: "Nombre total de cartons",
      volume: "Volume total",
      weight: "Poids total",
      amount: "Valeur de la commande",
      missing: "Non indiqué",
      unitPending: "unité à confirmer",
      currencyPending: "devise à confirmer",
      warningsTitle: "Éléments à confirmer",
      detailsTitle: "Détail des produits",
      sourceRow: "Ligne",
      product: "Produit",
      sku: "SKU",
      exportPng: "Exporter l’image complète du résultat",
      noResult: "Analysez d’abord un fichier de commande.",
      exportPreparing: "Préparation du rapport PNG complet…",
      exportDone: "Le rapport PNG complet a été téléchargé.",
      exportError: "Le rapport PNG ne peut pas être créé dans ce navigateur.",
      confirmBeforeExport: "Confirmez la signification des colonnes détectées avant l’exportation.",
      incompleteBlocked: "Ce fichier dépasse la limite d’analyse sûre. Divisez-le avant l’exportation.",
      negativeBlocked: "Des quantités ou valeurs négatives ont été détectées. Corrigez-les avant l’exportation.",
      containerTitle: "Estimation du conteneur",
      lcl: "LCL / envoi d’essai",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Environ {n} × 40HQ",
      provisional: "Estimation provisoire jusqu’à confirmation de l’unité de volume",
      reportTitle: "RAPPORT D’ANALYSE DE COMMANDE",
      generated: "Généré le",
      page: "Page {current} / {total}",
      file: "Fichier",
      warnings: {
        weight_unit_pending: "Le poids a été provisoirement interprété en kg. Confirmez l’unité ci-dessus.",
        volume_unit_pending: "Le volume a été provisoirement interprété en m³. Confirmez l’unité ci-dessus.",
        currency_pending: "Le fichier n’indique pas la devise. Confirmez-la ci-dessus.",
        dimension_unit_pending: "Les dimensions ont été provisoirement interprétées en cm. Confirmez leur unité.",
        weight_meaning_pending: "La colonne de poids générique est interprétée comme un poids unitaire. Confirmez la correspondance ou choisissez le poids total de la ligne.",
        volume_meaning_pending: "La colonne de volume générique est interprétée comme un volume unitaire. Confirmez la correspondance ou choisissez le volume total de la ligne.",
        rows_truncated: "Plus de 10 000 lignes ont été trouvées. L’exportation est bloquée jusqu’à la division du fichier.",
        columns_truncated: "Plus de 100 colonnes ont été trouvées. L’exportation est bloquée jusqu’à la simplification du fichier.",
        summary_rows_skipped: "Les lignes de récapitulatif ou de total ont été exclues pour éviter un double comptage.",
        negative_values_skipped: "{n} ligne(s) contenant des quantités ou valeurs négatives ont été exclues.",
        subtotal_mismatch: "Pour {n} ligne(s), le sous-total diffère du prix unitaire × quantité ; le sous-total fourni a été utilisé.",
        unit_weight_multiplied: "Le poids unitaire a été multiplié par la quantité.",
        unit_volume_multiplied: "Le volume unitaire a été multiplié par la quantité.",
        unit_price_multiplied: "En l’absence de sous-total de ligne, le prix unitaire a été multiplié par la quantité.",
        no_product_rows: "Aucune ligne produit n’a été trouvée avec la correspondance actuelle."
      },
      fields: {
        product: "Nom du produit", sku: "SKU / code article", qty: "Quantité", cartons: "Cartons",
        unitWeight: "Poids par unité", totalWeight: "Poids total de la ligne", unitVolume: "Volume par unité", totalVolume: "Volume total de la ligne",
        unitPrice: "Prix unitaire", amount: "Sous-total / montant de la ligne", length: "Longueur", width: "Largeur", height: "Hauteur",
        currency: "Colonne de devise", weightUnit: "Colonne d’unité de poids", volumeUnit: "Colonne d’unité de volume", dimensionUnit: "Colonne d’unité de mesure"
      }
    },
    pt: {
      eyebrow: "PLANILHA DO PEDIDO",
      title: "Analisar um pedido Excel",
      intro: "Envie um pedido de cliente para calcular produtos, quantidade, peso, volume, valor e ocupação do contêiner.",
      privacy: "O arquivo é processado somente neste navegador. Ele não é enviado à Jabbar Sourcing nem a terceiros.",
      dropLead: "Solte um arquivo Excel aqui ou escolha um arquivo",
      dropHint: ".xlsx, .xls, .xlsm ou .csv · até 50 MB",
      selectedFile: "Arquivo selecionado",
      parsing: "Lendo o arquivo localmente…",
      loadingLib: "Carregando o leitor local de Excel…",
      ready: "Análise concluída. Revise as colunas detectadas antes de exportar.",
      fileTooLarge: "O arquivo é maior que 50 MB.",
      unsupported: "Escolha um arquivo Excel ou CSV.",
      parseError: "Não foi possível ler este arquivo. Verifique se ele não está protegido por senha nem danificado.",
      mappingTitle: "Revisar colunas e valores padrão",
      mappingHelp: "As colunas são detectadas automaticamente. Reatribua apenas uma coluna identificada incorretamente. As unidades de origem são convertidas para kg, m³ e cm; os valores são exibidos em CNY.",
      sheet: "Planilha",
      headerRow: "Linha do cabeçalho",
      confirmUnits: "Confirmar unidades",
      weightUnit: "Unidade de peso",
      volumeUnit: "Unidade de volume",
      dimensionUnit: "Unidade de medida",
      currency: "Moeda",
      autoPending: "Automático / aguardando confirmação",
      apply: "Confirmar o mapeamento e recalcular",
      ignore: "Ignorar esta coluna",
      resultTitle: "Análise do pedido",
      productRows: "Linhas de produto",
      uniqueProducts: "Produtos distintos",
      quantity: "Quantidade total",
      cartons: "Total de caixas",
      volume: "Volume total",
      weight: "Peso total",
      amount: "Valor do pedido",
      missing: "Não informado",
      unitPending: "unidade a confirmar",
      currencyPending: "moeda a confirmar",
      warningsTitle: "Confirme estas informações",
      detailsTitle: "Detalhes dos produtos",
      sourceRow: "Linha",
      product: "Produto",
      sku: "SKU",
      exportPng: "Exportar imagem completa do resultado",
      noResult: "Analise primeiro um arquivo de pedido.",
      exportPreparing: "Preparando o relatório PNG completo…",
      exportDone: "O relatório PNG completo foi baixado.",
      exportError: "Não foi possível criar o relatório PNG neste navegador.",
      confirmBeforeExport: "Confirme o significado das colunas detectadas antes de exportar.",
      incompleteBlocked: "Este arquivo excede o limite de análise segura. Divida-o antes de exportar.",
      negativeBlocked: "Foram detectadas quantidades ou valores negativos. Corrija-as antes de exportar.",
      containerTitle: "Estimativa de contêiner",
      lcl: "LCL / envio de teste",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Aprox. {n} × 40HQ",
      provisional: "Estimativa provisória até confirmar a unidade de volume",
      reportTitle: "RELATÓRIO DE ANÁLISE DO PEDIDO",
      generated: "Gerado em",
      page: "Página {current} / {total}",
      file: "Arquivo",
      warnings: {
        weight_unit_pending: "O peso foi considerado provisoriamente em kg. Confirme a unidade acima.",
        volume_unit_pending: "O volume foi considerado provisoriamente em m³. Confirme a unidade acima.",
        currency_pending: "O arquivo não identifica a moeda. Confirme-a acima.",
        dimension_unit_pending: "As dimensões foram consideradas provisoriamente em cm. Confirme a unidade.",
        weight_meaning_pending: "A coluna genérica de peso é tratada como peso por unidade. Confirme o mapeamento ou altere para o peso total da linha.",
        volume_meaning_pending: "A coluna genérica de volume é tratada como volume por unidade. Confirme o mapeamento ou altere para o volume total da linha.",
        rows_truncated: "Foram encontradas mais de 10.000 linhas. A exportação fica bloqueada até dividir o arquivo.",
        columns_truncated: "Foram encontradas mais de 100 colunas. A exportação fica bloqueada até simplificar o arquivo.",
        summary_rows_skipped: "Linhas de resumo ou total foram excluídas para evitar contagem duplicada.",
        negative_values_skipped: "Foram excluídas {n} linha(s) com quantidades ou valores negativos.",
        subtotal_mismatch: "Em {n} linha(s), o subtotal difere de preço unitário × quantidade; foi usado o subtotal informado.",
        unit_weight_multiplied: "O peso unitário foi multiplicado pela quantidade.",
        unit_volume_multiplied: "O volume unitário foi multiplicado pela quantidade.",
        unit_price_multiplied: "Quando não havia subtotal da linha, o preço unitário foi multiplicado pela quantidade.",
        no_product_rows: "Nenhuma linha de produto foi encontrada com o mapeamento atual."
      },
      fields: {
        product: "Nome do produto", sku: "SKU / código do item", qty: "Quantidade", cartons: "Caixas",
        unitWeight: "Peso por unidade", totalWeight: "Peso total da linha", unitVolume: "Volume por unidade", totalVolume: "Volume total da linha",
        unitPrice: "Preço unitário", amount: "Subtotal / valor da linha", length: "Comprimento", width: "Largura", height: "Altura",
        currency: "Coluna de moeda", weightUnit: "Coluna da unidade de peso", volumeUnit: "Coluna da unidade de volume", dimensionUnit: "Coluna da unidade de medida"
      }
    },
    ru: {
      eyebrow: "ТАБЛИЦА ЗАКАЗА",
      title: "Анализ заказа Excel",
      intro: "Загрузите заказ клиента, чтобы рассчитать товары, количество, вес, объем, стоимость и загрузку контейнера.",
      privacy: "Файл обрабатывается только в этом браузере. Он не загружается в Jabbar Sourcing и не передается третьим лицам.",
      dropLead: "Перетащите сюда файл Excel или выберите файл",
      dropHint: ".xlsx, .xls, .xlsm или .csv · до 50 MB",
      selectedFile: "Выбранный файл",
      parsing: "Файл обрабатывается локально…",
      loadingLib: "Загружается локальный модуль чтения Excel…",
      ready: "Анализ завершен. Перед экспортом проверьте распознанные столбцы.",
      fileTooLarge: "Размер файла превышает 50 MB.",
      unsupported: "Выберите файл Excel или CSV.",
      parseError: "Не удалось прочитать файл. Убедитесь, что он не защищен паролем и не поврежден.",
      mappingTitle: "Проверить столбцы и настройки по умолчанию",
      mappingHelp: "Столбцы распознаются автоматически. Переназначайте только ошибочно определённые столбцы. Исходные единицы переводятся в кг, м³ и см; суммы отображаются в CNY.",
      sheet: "Лист",
      headerRow: "Строка заголовков",
      confirmUnits: "Подтвердить единицы",
      weightUnit: "Единица веса",
      volumeUnit: "Единица объема",
      dimensionUnit: "Единица размера",
      currency: "Валюта",
      autoPending: "Авто / ожидает подтверждения",
      apply: "Подтвердить сопоставление и пересчитать",
      ignore: "Игнорировать этот столбец",
      resultTitle: "Анализ заказа",
      productRows: "Строки товаров",
      uniqueProducts: "Уникальные товары",
      quantity: "Общее количество",
      cartons: "Всего коробок",
      volume: "Общий объем",
      weight: "Общий вес",
      amount: "Стоимость заказа",
      missing: "Не указано",
      unitPending: "единица не подтверждена",
      currencyPending: "валюта не подтверждена",
      warningsTitle: "Требуется подтверждение",
      detailsTitle: "Детали товаров",
      sourceRow: "Строка",
      product: "Товар",
      sku: "SKU",
      exportPng: "Экспортировать полное изображение результата",
      noResult: "Сначала проанализируйте файл заказа.",
      exportPreparing: "Подготавливается полный отчет PNG…",
      exportDone: "Полный отчет PNG загружен.",
      exportError: "В этом браузере не удалось создать отчет PNG.",
      confirmBeforeExport: "Перед экспортом подтвердите назначение распознанных столбцов.",
      incompleteBlocked: "Файл превышает безопасный предел анализа. Разделите его перед экспортом.",
      negativeBlocked: "Обнаружены отрицательные количества или значения. Исправьте их перед экспортом.",
      containerTitle: "Расчет контейнера",
      lcl: "LCL / пробная отправка",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Примерно {n} × 40HQ",
      provisional: "Предварительно до подтверждения единицы объема",
      reportTitle: "ОТЧЕТ ПО АНАЛИЗУ ЗАКАЗА",
      generated: "Создано",
      page: "Страница {current} / {total}",
      file: "Файл",
      warnings: {
        weight_unit_pending: "Вес предварительно рассчитан в kg. Подтвердите единицу выше.",
        volume_unit_pending: "Объем предварительно рассчитан в m³. Подтвердите единицу выше.",
        currency_pending: "В файле не указана валюта. Подтвердите ее выше.",
        dimension_unit_pending: "Размеры предварительно приняты в cm. Подтвердите их единицу.",
        weight_meaning_pending: "Общий столбец веса считается весом единицы. Подтвердите сопоставление или измените его на общий вес строки.",
        volume_meaning_pending: "Общий столбец объема считается объемом единицы. Подтвердите сопоставление или измените его на общий объем строки.",
        rows_truncated: "Обнаружено более 10 000 строк. Экспорт заблокирован, пока файл не будет разделен.",
        columns_truncated: "Обнаружено более 100 столбцов. Экспорт заблокирован, пока файл не будет упрощен.",
        summary_rows_skipped: "Строки итогов исключены, чтобы избежать двойного подсчета.",
        negative_values_skipped: "Исключено строк с отрицательным количеством или значением: {n}.",
        subtotal_mismatch: "В строках ({n}) итог отличается от цены единицы × количество; использован указанный в файле итог.",
        unit_weight_multiplied: "Вес единицы умножен на количество.",
        unit_volume_multiplied: "Объем единицы умножен на количество.",
        unit_price_multiplied: "Если итог по строке отсутствовал, цена единицы умножена на количество.",
        no_product_rows: "При текущем сопоставлении строки товаров не найдены."
      },
      fields: {
        product: "Название товара", sku: "SKU / код товара", qty: "Количество", cartons: "Коробки",
        unitWeight: "Вес единицы", totalWeight: "Общий вес строки", unitVolume: "Объем единицы", totalVolume: "Общий объем строки",
        unitPrice: "Цена за единицу", amount: "Итог / сумма строки", length: "Длина", width: "Ширина", height: "Высота",
        currency: "Столбец валюты", weightUnit: "Столбец единицы веса", volumeUnit: "Столбец единицы объема", dimensionUnit: "Столбец единицы размера"
      }
    },
    de: {
      eyebrow: "BESTELLTABELLE",
      title: "Excel-Bestellung analysieren",
      intro: "Laden Sie eine Kundenbestellung hoch, um Produkte, Menge, Gewicht, Volumen, Wert und Containerauslastung zu berechnen.",
      privacy: "Die Datei wird ausschließlich in diesem Browser verarbeitet. Sie wird weder an Jabbar Sourcing noch an Dritte hochgeladen.",
      dropLead: "Excel-Datei hier ablegen oder Datei auswählen",
      dropHint: ".xlsx, .xls, .xlsm oder .csv · maximal 50 MB",
      selectedFile: "Ausgewählte Datei",
      parsing: "Datei wird lokal gelesen…",
      loadingLib: "Lokaler Excel-Reader wird geladen…",
      ready: "Analyse abgeschlossen. Prüfen Sie vor dem Senden die erkannten Spalten und Einheiten.",
      fileTooLarge: "Die Datei ist größer als 50 MB.",
      unsupported: "Wählen Sie eine Excel- oder CSV-Datei aus.",
      parseError: "Diese Datei konnte nicht gelesen werden. Prüfen Sie, ob sie passwortgeschützt oder beschädigt ist.",
      mappingTitle: "Spalten und Standardwerte prüfen",
      mappingHelp: "Spalten werden automatisch erkannt. Ordnen Sie nur falsch erkannte Spalten neu zu. Ausgangseinheiten werden in kg, m³ und cm umgerechnet; Beträge werden in CNY angezeigt.",
      sheet: "Arbeitsblatt",
      headerRow: "Kopfzeile",
      confirmUnits: "Einheiten bestätigen",
      weightUnit: "Gewichtseinheit",
      volumeUnit: "Volumeneinheit",
      dimensionUnit: "Maßeinheit",
      currency: "Währung",
      autoPending: "Automatisch / Bestätigung ausstehend",
      apply: "Zuordnung bestätigen und neu berechnen",
      ignore: "Diese Spalte ignorieren",
      resultTitle: "Bestellanalyse",
      productRows: "Produktzeilen",
      uniqueProducts: "Unterschiedliche Produkte",
      quantity: "Gesamtmenge",
      cartons: "Kartons gesamt",
      volume: "Gesamtvolumen",
      weight: "Gesamtgewicht",
      amount: "Bestellwert",
      missing: "Nicht angegeben",
      unitPending: "Einheit ausstehend",
      currencyPending: "Währung ausstehend",
      warningsTitle: "Bitte bestätigen",
      detailsTitle: "Produktdetails",
      sourceRow: "Zeile",
      product: "Produkt",
      sku: "SKU",
      exportPng: "Vollständiges Ergebnisbild exportieren",
      noResult: "Analysieren Sie zuerst eine Bestelldatei.",
      exportPreparing: "Vollständiger PNG-Bericht wird erstellt…",
      exportDone: "Der vollständige PNG-Bericht wurde heruntergeladen.",
      exportError: "Der PNG-Bericht konnte in diesem Browser nicht erstellt werden.",
      confirmBeforeExport: "Bestätigen Sie vor dem Exportieren die Bedeutung der erkannten Spalten.",
      incompleteBlocked: "Diese Datei überschreitet das sichere Analyselimit. Teilen Sie sie vor dem Exportieren auf.",
      negativeBlocked: "Es wurden negative Mengen oder Werte erkannt. Korrigieren Sie diese vor dem Exportieren.",
      containerTitle: "Containerschätzung",
      lcl: "LCL / Testsendung",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Etwa {n} × 40HQ",
      provisional: "Vorläufig bis zur Bestätigung der Volumeneinheit",
      reportTitle: "BERICHT ZUR BESTELLANALYSE",
      generated: "Erstellt",
      page: "Seite {current} / {total}",
      file: "Datei",
      warnings: {
        weight_unit_pending: "Das Gewicht wurde vorläufig als kg behandelt. Bestätigen Sie die Einheit oben.",
        volume_unit_pending: "Das Volumen wurde vorläufig als m³ behandelt. Bestätigen Sie die Einheit oben.",
        currency_pending: "Die Datei nennt keine Währung. Bestätigen Sie sie oben.",
        dimension_unit_pending: "Die Maße wurden vorläufig als cm behandelt. Bestätigen Sie ihre Einheit.",
        weight_meaning_pending: "Die allgemeine Gewichtsspalte wird als Stückgewicht behandelt. Bestätigen Sie die Zuordnung oder ändern Sie sie in das Gesamtgewicht der Zeile.",
        volume_meaning_pending: "Die allgemeine Volumenspalte wird als Stückvolumen behandelt. Bestätigen Sie die Zuordnung oder ändern Sie sie in das Gesamtvolumen der Zeile.",
        rows_truncated: "Es wurden mehr als 10.000 Zeilen gefunden. Der Export ist gesperrt, bis die Datei aufgeteilt wurde.",
        columns_truncated: "Es wurden mehr als 100 Spalten gefunden. Der Export ist gesperrt, bis die Datei vereinfacht wurde.",
        summary_rows_skipped: "Summen- und Gesamtzeilen wurden ausgeschlossen, um Doppelzählungen zu vermeiden.",
        negative_values_skipped: "{n} Zeile(n) mit negativen Mengen oder Werten wurden ausgeschlossen.",
        subtotal_mismatch: "Bei {n} Zeile(n) weicht die Zwischensumme von Stückpreis × Menge ab; die angegebene Zwischensumme wurde verwendet.",
        unit_weight_multiplied: "Das Stückgewicht wurde mit der Menge multipliziert.",
        unit_volume_multiplied: "Das Stückvolumen wurde mit der Menge multipliziert.",
        unit_price_multiplied: "Wenn keine Zeilensumme vorhanden war, wurde der Stückpreis mit der Menge multipliziert.",
        no_product_rows: "Mit der aktuellen Zuordnung wurden keine Produktzeilen gefunden."
      },
      fields: {
        product: "Produktname", sku: "SKU / Artikelcode", qty: "Menge", cartons: "Kartons",
        unitWeight: "Gewicht pro Einheit", totalWeight: "Gesamtgewicht der Zeile", unitVolume: "Volumen pro Einheit", totalVolume: "Gesamtvolumen der Zeile",
        unitPrice: "Stückpreis", amount: "Zeilensumme / Betrag", length: "Länge", width: "Breite", height: "Höhe",
        currency: "Währungsspalte", weightUnit: "Spalte der Gewichtseinheit", volumeUnit: "Spalte der Volumeneinheit", dimensionUnit: "Spalte der Maßeinheit"
      }
    },
    it: {
      eyebrow: "FOGLIO ORDINE",
      title: "Analizza un ordine Excel",
      intro: "Carica un ordine cliente per calcolare prodotti, quantità, peso, volume, valore e utilizzo del container.",
      privacy: "Il file viene elaborato esclusivamente in questo browser. Non viene caricato su Jabbar Sourcing né inviato a terzi.",
      dropLead: "Trascina qui un file Excel o scegli un file",
      dropHint: ".xlsx, .xls, .xlsm o .csv · massimo 50 MB",
      selectedFile: "File selezionato",
      parsing: "Lettura locale del file…",
      loadingLib: "Caricamento del lettore Excel locale…",
      ready: "Analisi completata. Controlla le colonne rilevate prima di esportare.",
      fileTooLarge: "Il file supera i 50 MB.",
      unsupported: "Scegli un file Excel o CSV.",
      parseError: "Impossibile leggere questo file. Verifica che non sia protetto da password o danneggiato.",
      mappingTitle: "Controlla colonne e valori predefiniti",
      mappingHelp: "Le colonne vengono rilevate automaticamente. Riassegna solo quelle identificate in modo errato. Le unità di origine vengono convertite in kg, m³ e cm; gli importi sono mostrati in CNY.",
      sheet: "Foglio di lavoro",
      headerRow: "Riga di intestazione",
      confirmUnits: "Conferma le unità",
      weightUnit: "Unità di peso",
      volumeUnit: "Unità di volume",
      dimensionUnit: "Unità di misura",
      currency: "Valuta",
      autoPending: "Automatico / in attesa di conferma",
      apply: "Conferma la mappatura e ricalcola",
      ignore: "Ignora questa colonna",
      resultTitle: "Analisi dell’ordine",
      productRows: "Righe prodotto",
      uniqueProducts: "Prodotti distinti",
      quantity: "Quantità totale",
      cartons: "Cartoni totali",
      volume: "Volume totale",
      weight: "Peso totale",
      amount: "Valore dell’ordine",
      missing: "Non indicato",
      unitPending: "unità da confermare",
      currencyPending: "valuta da confermare",
      warningsTitle: "Dati da confermare",
      detailsTitle: "Dettaglio dei prodotti",
      sourceRow: "Riga",
      product: "Prodotto",
      sku: "SKU",
      exportPng: "Esporta l’immagine completa del risultato",
      noResult: "Analizza prima un file d’ordine.",
      exportPreparing: "Preparazione del report PNG completo…",
      exportDone: "Il report PNG completo è stato scaricato.",
      exportError: "Impossibile creare il report PNG in questo browser.",
      confirmBeforeExport: "Conferma il significato delle colonne rilevate prima di esportare.",
      incompleteBlocked: "Questo file supera il limite di analisi sicuro. Dividilo prima di esportare.",
      negativeBlocked: "Sono state rilevate quantità o valori negativi. Correggile prima di esportare.",
      containerTitle: "Stima del container",
      lcl: "LCL / spedizione di prova",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Circa {n} × 40HQ",
      provisional: "Stima provvisoria fino alla conferma dell’unità di volume",
      reportTitle: "REPORT DI ANALISI DELL’ORDINE",
      generated: "Generato",
      page: "Pagina {current} / {total}",
      file: "File",
      warnings: {
        weight_unit_pending: "Il peso è stato considerato provvisoriamente in kg. Conferma l’unità qui sopra.",
        volume_unit_pending: "Il volume è stato considerato provvisoriamente in m³. Conferma l’unità qui sopra.",
        currency_pending: "Il file non indica la valuta. Confermala qui sopra.",
        dimension_unit_pending: "Le dimensioni sono state considerate provvisoriamente in cm. Conferma la loro unità.",
        weight_meaning_pending: "La colonna generica del peso viene interpretata come peso per unità. Conferma la mappatura o impostala come peso totale della riga.",
        volume_meaning_pending: "La colonna generica del volume viene interpretata come volume per unità. Conferma la mappatura o impostala come volume totale della riga.",
        rows_truncated: "Sono state trovate più di 10.000 righe. L’esportazione è bloccata finché il file non viene diviso.",
        columns_truncated: "Sono state trovate più di 100 colonne. L’esportazione è bloccata finché il file non viene semplificato.",
        summary_rows_skipped: "Le righe di riepilogo o totale sono state escluse per evitare doppi conteggi.",
        negative_values_skipped: "Sono state escluse {n} riga/righe con quantità o valori negativi.",
        subtotal_mismatch: "In {n} riga/righe il subtotale differisce da prezzo unitario × quantità; è stato usato il subtotale fornito.",
        unit_weight_multiplied: "Il peso unitario è stato moltiplicato per la quantità.",
        unit_volume_multiplied: "Il volume unitario è stato moltiplicato per la quantità.",
        unit_price_multiplied: "Quando mancava il subtotale di riga, il prezzo unitario è stato moltiplicato per la quantità.",
        no_product_rows: "Con la mappatura attuale non sono state trovate righe prodotto."
      },
      fields: {
        product: "Nome del prodotto", sku: "SKU / codice articolo", qty: "Quantità", cartons: "Cartoni",
        unitWeight: "Peso per unità", totalWeight: "Peso totale della riga", unitVolume: "Volume per unità", totalVolume: "Volume totale della riga",
        unitPrice: "Prezzo unitario", amount: "Subtotale / importo della riga", length: "Lunghezza", width: "Larghezza", height: "Altezza",
        currency: "Colonna della valuta", weightUnit: "Colonna dell’unità di peso", volumeUnit: "Colonna dell’unità di volume", dimensionUnit: "Colonna dell’unità di misura"
      }
    },
    tr: {
      eyebrow: "SİPARİŞ TABLOSU",
      title: "Excel siparişini analiz et",
      intro: "Ürünleri, miktarı, ağırlığı, hacmi, tutarı ve konteyner kullanımını hesaplamak için müşteri siparişini yükleyin.",
      privacy: "Dosya yalnızca bu tarayıcıda işlenir. Jabbar Sourcing’e veya herhangi bir üçüncü tarafa yüklenmez.",
      dropLead: "Excel dosyasını buraya bırakın veya bir dosya seçin",
      dropHint: ".xlsx, .xls, .xlsm veya .csv · en fazla 50 MB",
      selectedFile: "Seçilen dosya",
      parsing: "Dosya yerel olarak okunuyor…",
      loadingLib: "Yerel Excel okuyucu yükleniyor…",
      ready: "Analiz tamamlandı. Dışa aktarmadan önce algılanan sütunları kontrol edin.",
      fileTooLarge: "Dosya 50 MB’den büyük.",
      unsupported: "Bir Excel veya CSV dosyası seçin.",
      parseError: "Bu dosya okunamadı. Parola korumalı veya bozuk olmadığını kontrol edin.",
      mappingTitle: "Sütunları ve varsayılanları kontrol et",
      mappingHelp: "Sütunlar otomatik olarak algılanır. Yalnızca yanlış tanımlanan sütunları yeniden atayın. Kaynak birimler kg, m³ ve cm'ye dönüştürülür; tutarlar CNY olarak gösterilir.",
      sheet: "Çalışma sayfası",
      headerRow: "Başlık satırı",
      confirmUnits: "Birimleri onayla",
      weightUnit: "Ağırlık birimi",
      volumeUnit: "Hacim birimi",
      dimensionUnit: "Ölçü birimi",
      currency: "Para birimi",
      autoPending: "Otomatik / onay bekliyor",
      apply: "Eşlemeyi onayla ve yeniden hesapla",
      ignore: "Bu sütunu yok say",
      resultTitle: "Sipariş analizi",
      productRows: "Ürün satırları",
      uniqueProducts: "Farklı ürünler",
      quantity: "Toplam miktar",
      cartons: "Toplam koli",
      volume: "Toplam hacim",
      weight: "Toplam ağırlık",
      amount: "Sipariş tutarı",
      missing: "Belirtilmemiş",
      unitPending: "birim onayı bekliyor",
      currencyPending: "para birimi onayı bekliyor",
      warningsTitle: "Lütfen onaylayın",
      detailsTitle: "Ürün ayrıntıları",
      sourceRow: "Satır",
      product: "Ürün",
      sku: "SKU",
      exportPng: "Tam sonuç görselini dışa aktar",
      noResult: "Önce bir sipariş dosyasını analiz edin.",
      exportPreparing: "Tam PNG raporu hazırlanıyor…",
      exportDone: "Tam PNG raporu indirildi.",
      exportError: "PNG raporu bu tarayıcıda oluşturulamadı.",
      confirmBeforeExport: "Dışa aktarmadan önce algılanan sütunların anlamlarını onaylayın.",
      incompleteBlocked: "Bu dosya güvenli analiz sınırını aşıyor. Dışa aktarmadan önce dosyayı bölün.",
      negativeBlocked: "Negatif miktarlar veya değerler algılandı. Dışa aktarmadan önce bunları düzeltin.",
      containerTitle: "Konteyner tahmini",
      lcl: "LCL / deneme sevkiyatı",
      twenty: "20GP",
      forty: "40GP",
      fortyHq: "40HQ",
      containerCount: "Yaklaşık {n} × 40HQ",
      provisional: "Hacim birimi onaylanana kadar geçici tahmin",
      reportTitle: "SİPARİŞ ANALİZ RAPORU",
      generated: "Oluşturulma",
      page: "Sayfa {current} / {total}",
      file: "Dosya",
      warnings: {
        weight_unit_pending: "Ağırlık geçici olarak kg kabul edildi. Yukarıdan birimi onaylayın.",
        volume_unit_pending: "Hacim geçici olarak m³ kabul edildi. Yukarıdan birimi onaylayın.",
        currency_pending: "Dosyada para birimi belirtilmemiş. Yukarıdan onaylayın.",
        dimension_unit_pending: "Ölçüler geçici olarak cm kabul edildi. Birimlerini onaylayın.",
        weight_meaning_pending: "Genel ağırlık sütunu birim ağırlık olarak kabul edilir. Eşlemeyi onaylayın veya satır toplam ağırlığı olarak değiştirin.",
        volume_meaning_pending: "Genel hacim sütunu birim hacim olarak kabul edilir. Eşlemeyi onaylayın veya satır toplam hacmi olarak değiştirin.",
        rows_truncated: "10.000’den fazla satır bulundu. Dosya bölünene kadar dışa aktarma engellenir.",
        columns_truncated: "100’den fazla sütun bulundu. Dosya sadeleştirilene kadar dışa aktarma engellenir.",
        summary_rows_skipped: "Çift sayımı önlemek için özet veya toplam satırları hariç tutuldu.",
        negative_values_skipped: "Negatif miktar veya değer içeren {n} satır hariç tutuldu.",
        subtotal_mismatch: "{n} satırda ara toplam, birim fiyat × miktardan farklıdır; dosyada verilen ara toplam kullanıldı.",
        unit_weight_multiplied: "Birim ağırlık miktarla çarpıldı.",
        unit_volume_multiplied: "Birim hacim miktarla çarpıldı.",
        unit_price_multiplied: "Satır ara toplamı olmadığında birim fiyat miktarla çarpıldı.",
        no_product_rows: "Geçerli eşlemeyle hiçbir ürün satırı bulunamadı."
      },
      fields: {
        product: "Ürün adı", sku: "SKU / ürün kodu", qty: "Miktar", cartons: "Koliler",
        unitWeight: "Birim başına ağırlık", totalWeight: "Satır toplam ağırlığı", unitVolume: "Birim başına hacim", totalVolume: "Satır toplam hacmi",
        unitPrice: "Birim fiyat", amount: "Satır ara toplamı / tutarı", length: "Uzunluk", width: "Genişlik", height: "Yükseklik",
        currency: "Para birimi sütunu", weightUnit: "Ağırlık birimi sütunu", volumeUnit: "Hacim birimi sütunu", dimensionUnit: "Ölçü birimi sütunu"
      }
    }
  };

  function languageCode() {
    var code = (document.documentElement.lang || navigator.language || "en").toLowerCase().split("-")[0];
    return LOCALES[code] ? code : "en";
  }

  function replaceVars(text, vars) {
    return String(text || "").replace(/\{([^}]+)\}/g, function (_, key) { return vars && vars[key] != null ? vars[key] : ""; });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function option(value, text) {
    var node = document.createElement("option");
    node.value = value;
    node.textContent = text;
    return node;
  }

  function loadScript(src, id) {
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (resolve, reject) {
      if (id && document.getElementById(id)) { resolve(); return; }
      var script = document.createElement("script");
      if (id) script.id = id;
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("script_load_failed:" + src)); };
      document.head.appendChild(script);
    });
    return scriptPromises[src];
  }

  function fileExtension(name) {
    var match = String(name || "").toLowerCase().match(/\.([^.]+)$/);
    return match ? match[1] : "";
  }

  function safeFileName(name) {
    return String(name || "order").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").trim().slice(0, 80) || "order";
  }

  function Analyzer(root, index) {
    this.root = root;
    this.index = index;
    this.lang = languageCode();
    this.copy = LOCALES[this.lang] || EN;
    this.locale = document.documentElement.lang || this.lang;
    this.rtl = document.documentElement.dir === "rtl" || this.lang === "ar";
    this.worker = null;
    this.workerFailed = false;
    this.workerRequests = {};
    this.workerSequence = 0;
    this.fallbackSession = null;
    this.currentFile = null;
    this.payload = null;
    this.exportCache = null;
    this.deliveryBlocked = "";
    this.build();
    this.bind();
  }

  Analyzer.prototype.build = function () {
    var t = this.copy;
    this.root.classList.add("order-analyzer");
    this.root.setAttribute("dir", this.rtl ? "rtl" : "ltr");
    this.root.innerHTML = "";
    var header = element("header", "order-analyzer__header");
    header.appendChild(element("p", "order-analyzer__eyebrow", t.eyebrow));
    var title = element("h2", "", t.title);
    title.id = "order-analyzer-title-" + this.index;
    this.root.setAttribute("aria-labelledby", title.id);
    header.appendChild(title);
    header.appendChild(element("p", "order-analyzer__intro", t.intro));
    header.appendChild(element("p", "order-analyzer__privacy", t.privacy));
    this.root.appendChild(header);

    var upload = element("div", "order-analyzer__upload");
    var dropzone = element("label", "order-analyzer__dropzone");
    dropzone.setAttribute("data-order-dropzone", "");
    this.fileInput = element("input", "");
    this.fileInput.type = "file";
    this.fileInput.accept = ".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
    this.fileInput.setAttribute("data-order-file", "");
    dropzone.appendChild(this.fileInput);
    dropzone.appendChild(element("strong", "order-analyzer__upload-copy", t.dropLead));
    dropzone.appendChild(element("span", "order-analyzer__upload-hint", t.dropHint));
    this.fileMeta = element("span", "order-analyzer__file-meta", "");
    dropzone.appendChild(this.fileMeta);
    upload.appendChild(dropzone);
    this.root.appendChild(upload);
    this.status = element("p", "order-analyzer__status", "");
    this.status.setAttribute("data-order-status", "");
    this.status.setAttribute("aria-live", "polite");
    this.root.appendChild(this.status);

    this.mappingDetails = element("details", "order-analyzer__mapping");
    this.mappingDetails.hidden = true;
    this.mappingDetails.setAttribute("data-order-mapping", "");
    this.mappingDetails.appendChild(element("summary", "", t.mappingTitle));
    var mappingBody = element("div", "order-analyzer__mapping-body");
    mappingBody.appendChild(element("p", "order-analyzer__mapping-help", t.mappingHelp));
    var sheetRow = element("div", "order-analyzer__sheet-row");
    var sheetLabel = element("label", "", t.sheet);
    this.sheetSelect = element("select", "");
    this.sheetSelect.setAttribute("data-order-sheet", "");
    sheetLabel.appendChild(this.sheetSelect);
    sheetRow.appendChild(sheetLabel);
    this.headerMeta = element("div", "order-analyzer__file-meta", "");
    sheetRow.appendChild(this.headerMeta);
    mappingBody.appendChild(sheetRow);
    this.mappingGrid = element("div", "order-analyzer__mapping-grid");
    mappingBody.appendChild(this.mappingGrid);
    var confirm = element("div", "order-analyzer__confirm");
    this.weightUnitSelect = this.confirmFixed(confirm, t.weightUnit, "data-order-weight-unit", "kg", "kg");
    this.volumeUnitSelect = this.confirmFixed(confirm, t.volumeUnit, "data-order-volume-unit", "m3", "m³ / CBM");
    this.dimensionUnitSelect = this.confirmFixed(confirm, t.dimensionUnit, "data-order-dimension-unit", "cm", "cm");
    this.currencySelect = this.confirmFixed(confirm, t.currency, "data-order-currency", "CNY", "CNY / RMB");
    mappingBody.appendChild(confirm);
    this.applyButton = element("button", "order-analyzer__apply", t.apply);
    this.applyButton.type = "button";
    this.applyButton.setAttribute("data-order-apply", "");
    mappingBody.appendChild(this.applyButton);
    this.mappingDetails.appendChild(mappingBody);
    this.root.appendChild(this.mappingDetails);

    this.results = element("section", "order-analyzer__results");
    this.results.hidden = true;
    this.results.setAttribute("data-order-results", "");
    var resultHead = element("header", "order-analyzer__result-head");
    resultHead.appendChild(element("h3", "", t.resultTitle));
    this.results.appendChild(resultHead);
    this.metrics = element("div", "order-analyzer__metrics");
    this.results.appendChild(this.metrics);
    this.warningList = element("ul", "order-analyzer__warnings");
    this.results.appendChild(this.warningList);
    this.containerVisual = element("div", "order-analyzer__container");
    this.results.appendChild(this.containerVisual);
    var actions = element("div", "order-analyzer__actions");
    this.exportButton = element("button", "order-analyzer__export", t.exportPng);
    this.exportButton.type = "button";
    this.exportButton.setAttribute("data-order-export", "");
    actions.appendChild(this.exportButton);
    this.results.appendChild(actions);
    this.tableWrap = element("div", "order-analyzer__table-wrap");
    this.results.appendChild(this.tableWrap);
    this.root.appendChild(this.results);
  };

  Analyzer.prototype.confirmFixed = function (parent, labelText, attribute, value, displayValue) {
    var field = element("div", "order-analyzer__fixed-setting");
    field.appendChild(element("span", "", labelText));
    var output = element("strong", "", displayValue);
    field.appendChild(output);
    var input = element("input", "");
    input.type = "hidden";
    input.value = value;
    input.setAttribute(attribute, "");
    input.__displayOutput = output;
    field.appendChild(input);
    parent.appendChild(field);
    return input;
  };

  Analyzer.prototype.setFixedSetting = function (input, value, labels, fixedDisplayValue) {
    input.value = value;
    if (input.__displayOutput) input.__displayOutput.textContent = fixedDisplayValue || labels[value] || value;
  };

  Analyzer.prototype.bind = function () {
    var self = this;
    this.fileInput.addEventListener("change", function () { if (self.fileInput.files[0]) self.parseFile(self.fileInput.files[0]); });
    var dropzone = this.root.querySelector("[data-order-dropzone]");
    ["dragenter", "dragover"].forEach(function (name) {
      dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.add("is-dragging"); });
    });
    ["dragleave", "drop"].forEach(function (name) {
      dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.remove("is-dragging"); });
    });
    dropzone.addEventListener("drop", function (event) { if (event.dataTransfer.files[0]) self.parseFile(event.dataTransfer.files[0]); });
    this.sheetSelect.addEventListener("change", function () { self.selectSheet(self.sheetSelect.value); });
    this.applyButton.addEventListener("click", function () { self.applyMapping(); });
    this.mappingGrid.addEventListener("change", function (event) {
      if (!event.target.matches("select[data-order-column]") || !event.target.value) return;
      self.mappingGrid.querySelectorAll("select[data-order-column]").forEach(function (select) {
        if (select !== event.target && select.value === event.target.value) select.value = "";
      });
    });
    this.exportButton.addEventListener("click", function () { self.exportReport(); });
  };

  Analyzer.prototype.setStatus = function (text, error) {
    this.status.textContent = text || "";
    this.status.classList.toggle("is-error", Boolean(error));
    this.status.dataset.state = error ? "error" : (text ? "success" : "");
  };

  Analyzer.prototype.setBusy = function (busy) {
    this.root.setAttribute("aria-busy", busy ? "true" : "false");
    this.fileInput.disabled = Boolean(busy);
    this.applyButton.disabled = Boolean(busy);
    if (busy) {
      this.exportButton.disabled = true;
    } else if (this.payload) {
      this.exportButton.disabled = Boolean(this.deliveryBlocked);
    }
  };

  Analyzer.prototype.ensureWorker = function () {
    var self = this;
    if (this.worker || this.workerFailed || typeof Worker === "undefined") return this.worker;
    try {
      this.worker = new Worker(WORKER_URL);
      this.worker.addEventListener("message", function (event) {
        var message = event.data || {};
        if (message.type === "progress") {
          if (message.stage === "vendor") {
            qa.vendorRequested = true;
            self.setStatus(self.copy.loadingLib, false);
          }
          return;
        }
        var pending = self.workerRequests[message.id];
        if (!pending) return;
        delete self.workerRequests[message.id];
        window.clearTimeout(pending.timer);
        if (message.type === "error") pending.reject(new Error(message.error || "worker_error"));
        else pending.resolve(message.payload);
      });
      this.worker.addEventListener("error", function () {
        self.workerFailed = true;
        Object.keys(self.workerRequests).forEach(function (id) {
          window.clearTimeout(self.workerRequests[id].timer);
          self.workerRequests[id].reject(new Error("worker_failed"));
          delete self.workerRequests[id];
        });
        if (self.worker) self.worker.terminate();
        self.worker = null;
      });
      qa.workerUsed = true;
    } catch (_) {
      this.workerFailed = true;
      this.worker = null;
    }
    return this.worker;
  };

  Analyzer.prototype.workerRequest = function (type, data, transfer) {
    var worker = this.ensureWorker();
    if (!worker) return Promise.reject(new Error("worker_unavailable"));
    var id = ++this.workerSequence;
    var self = this;
    return new Promise(function (resolve, reject) {
      var timer = window.setTimeout(function () {
        if (!self.workerRequests[id]) return;
        delete self.workerRequests[id];
        self.workerFailed = true;
        if (self.worker) self.worker.terminate();
        self.worker = null;
        reject(new Error("worker_timeout"));
      }, WORKER_TIMEOUT_MS);
      self.workerRequests[id] = { resolve: resolve, reject: reject, timer: timer };
      var message = Object.assign({ id: id, type: type }, data || {});
      worker.postMessage(message, transfer || []);
    });
  };

  Analyzer.prototype.ensureFallback = function () {
    var self = this;
    qa.vendorRequested = true;
    this.setStatus(this.copy.loadingLib, false);
    return loadScript(CORE_URL, "jabbar-order-worker-core").then(function () {
      return loadScript(XLSX_URL, "jabbar-order-xlsx");
    }).then(function () {
      if (!window.JabbarOrderWorkerCore || !window.XLSX) throw new Error("fallback_unavailable");
      if (!self.fallbackSession) self.fallbackSession = window.JabbarOrderWorkerCore.createSession();
      qa.fallbackUsed = true;
      return self.fallbackSession;
    });
  };

  Analyzer.prototype.parseFile = async function (file) {
    if (!file) { this.setStatus(this.copy.unsupported, true); return null; }
    this.currentFile = file;
    this.payload = null;
    this.exportCache = null;
    this.deliveryBlocked = "";
    this.mappingDetails.hidden = true;
    this.mappingDetails.open = false;
    this.results.hidden = true;
    this.exportButton.disabled = true;
    qa.lastResult = null;
    this.fileMeta.textContent = this.copy.selectedFile + ": " + file.name + " · " + (file.size / 1024 / 1024).toFixed(2) + " MB";
    var extension = fileExtension(file.name);
    if (["xlsx", "xls", "xlsm", "csv"].indexOf(extension) === -1) { this.setStatus(this.copy.unsupported, true); return null; }
    if (file.size > MAX_FILE_BYTES) { this.setStatus(this.copy.fileTooLarge, true); return null; }
    this.setBusy(true);
    this.setStatus(this.copy.parsing, false);
    qa.lastFile = { name: file.name, size: file.size };
    var payload;
    try {
      var buffer = await file.arrayBuffer();
      if (typeof Worker !== "undefined") {
        // A failed runtime Worker may be rebuilt, but it must never trigger a
        // main-thread retry of the same workbook.
        if (!this.worker && this.workerFailed) this.workerFailed = false;
        if (!this.ensureWorker()) throw new Error("worker_unavailable");
        payload = await this.workerRequest("parse", { buffer: buffer, fileName: file.name }, [buffer]);
      } else {
        var session = await this.ensureFallback();
        payload = session.parse(buffer, window.XLSX, file.name);
      }
      this.acceptPayload(payload);
      this.setStatus(this.copy.ready, false);
      return payload;
    } catch (error) {
      qa.lastError = error && error.message ? error.message : String(error);
      this.setStatus(this.copy.parseError, true);
      return null;
    } finally {
      this.setBusy(false);
    }
  };

  Analyzer.prototype.selectSheet = async function (sheetName) {
    if (!this.payload) return;
    this.setBusy(true);
    this.setStatus(this.copy.parsing, false);
    try {
      var payload;
      if (this.worker && !this.workerFailed) payload = await this.workerRequest("sheet", { sheetName: sheetName });
      else payload = this.fallbackSession.selectSheet(sheetName, window.XLSX);
      this.acceptPayload(payload);
      this.setStatus(this.copy.ready, false);
    } catch (_) {
      this.setStatus(this.copy.parseError, true);
    } finally { this.setBusy(false); }
  };

  Analyzer.prototype.currentMapping = function () {
    var mapping = {};
    this.mappingGrid.querySelectorAll("select[data-order-column]").forEach(function (select) {
      if (select.value) mapping[select.value] = Number(select.dataset.columnIndex);
    });
    return mapping;
  };

  Analyzer.prototype.currentOverrides = function () {
    return {
      weightUnit: this.weightUnitSelect.value,
      volumeUnit: this.volumeUnitSelect.value,
      dimensionUnit: this.dimensionUnitSelect.value,
      currency: this.currencySelect.value,
      mappingConfirmed: true
    };
  };

  Analyzer.prototype.applyMapping = async function () {
    if (!this.payload) return;
    this.setBusy(true);
    this.setStatus(this.copy.parsing, false);
    try {
      var mapping = this.currentMapping();
      var overrides = this.currentOverrides();
      var payload;
      if (this.worker && !this.workerFailed) payload = await this.workerRequest("remap", { mapping: mapping, overrides: overrides });
      else payload = this.fallbackSession.remap(mapping, overrides);
      this.acceptPayload(payload, true);
      this.setStatus(this.copy.ready, false);
    } catch (_) {
      this.setStatus(this.copy.parseError, true);
    } finally { this.setBusy(false); }
  };

  Analyzer.prototype.acceptPayload = function (payload, preserveMappingControls) {
    this.payload = payload;
    this.exportCache = null;
    qa.lastResult = payload;
    this.mappingDetails.hidden = false;
    this.results.hidden = false;
    if (!preserveMappingControls) {
      this.renderSheetControl(payload);
      this.renderMapping(payload);
    }
    this.headerMeta.textContent = this.copy.headerRow + ": " + payload.headerRow;
    var pending = payload.result.pending || {};
    var warningCodes = payload.result.warnings || [];
    var incomplete = warningCodes.indexOf("rows_truncated") !== -1 || warningCodes.indexOf("columns_truncated") !== -1;
    var negativeValues = warningCodes.indexOf("negative_values_skipped") !== -1;
    var needsConfirmation = payload.overrides.mappingConfirmed !== true
      || Object.keys(pending).some(function (key) { return Boolean(pending[key]); });
    this.deliveryBlocked = negativeValues
      ? (this.copy.negativeBlocked || this.copy.confirmBeforeExport || this.copy.mappingHelp)
      : incomplete
      ? (this.copy.incompleteBlocked || this.copy.mappingHelp)
      : (needsConfirmation || !payload.result.metrics.productRows ? (this.copy.confirmBeforeExport || this.copy.mappingHelp) : "");
    this.mappingDetails.open = Boolean(this.deliveryBlocked);
    this.exportButton.disabled = Boolean(this.deliveryBlocked);
    this.renderResult(payload);
  };

  Analyzer.prototype.renderSheetControl = function (payload) {
    this.sheetSelect.innerHTML = "";
    payload.sheetNames.forEach(function (name) { var node = option(name, name); node.selected = name === payload.sheetName; this.sheetSelect.appendChild(node); }, this);
  };

  Analyzer.prototype.renderMapping = function (payload) {
    var self = this;
    var reverse = {};
    Object.keys(payload.mapping || {}).forEach(function (field) { reverse[payload.mapping[field]] = field; });
    this.mappingGrid.innerHTML = "";
    payload.headers.forEach(function (header) {
      var label = element("label", "order-analyzer__mapping-item", header.column + " · " + header.label);
      var select = element("select", "");
      select.setAttribute("data-order-column", "");
      select.dataset.columnIndex = header.index;
      select.appendChild(option("", self.copy.ignore));
      FIELD_KEYS.forEach(function (field) { select.appendChild(option(field, self.copy.fields[field] || EN.fields[field] || field)); });
      select.value = reverse[header.index] || "";
      label.appendChild(select);
      self.mappingGrid.appendChild(label);
    });
    this.setFixedSetting(this.weightUnitSelect, payload.overrides.weightUnit || "kg", { kg: "kg", g: "g", lb: "lb", t: "t" }, "kg");
    this.setFixedSetting(this.volumeUnitSelect, payload.overrides.volumeUnit || "m3", { m3: "m³ / CBM", cm3: "cm³", l: "L", ft3: "ft³" }, "m³ / CBM");
    this.setFixedSetting(this.dimensionUnitSelect, payload.overrides.dimensionUnit || "cm", { mm: "mm", cm: "cm", in: "in", m: "m" }, "cm");
    var detectedCurrency = payload.overrides.currency || "CNY";
    this.setFixedSetting(this.currencySelect, detectedCurrency, { CNY: "CNY / RMB" }, detectedCurrency === "CNY" ? "CNY / RMB" : detectedCurrency);
  };

  Analyzer.prototype.formatNumber = function (value, digits) {
    if (value == null || !Number.isFinite(Number(value))) return this.copy.missing;
    return Number(value).toLocaleString(this.locale, { maximumFractionDigits: digits == null ? 2 : digits, minimumFractionDigits: 0 });
  };

  Analyzer.prototype.amountText = function (groups) {
    var self = this;
    if (!groups || !groups.length) return this.copy.missing;
    return groups.map(function (group) { return (group.currency ? group.currency + " " : "") + self.formatNumber(group.value, 2) + (group.currency ? "" : " · " + self.copy.currencyPending); }).join(" / ");
  };

  Analyzer.prototype.metric = function (label, value) {
    var card = element("div", "order-analyzer__metric");
    card.appendChild(element("span", "", label));
    card.appendChild(element("strong", "", value));
    this.metrics.appendChild(card);
  };

  Analyzer.prototype.containerEstimate = function (volume, pending) {
    var t = this.copy;
    if (volume == null) return { label: t.fortyHq, capacity: 68, percent: 0, pending: false };
    var value = Math.max(0, Number(volume));
    var result;
    if (value <= 8) result = { label: t.lcl, capacity: 68, percent: value / 68 * 100 };
    else if (value <= 68) result = { label: t.fortyHq, capacity: 68, percent: value / 68 * 100 };
    else {
      var count = Math.ceil(value / 68);
      result = { label: replaceVars(t.containerCount, { n: count }), capacity: count * 68, percent: value / (count * 68) * 100, count: count };
    }
    result.pending = Boolean(pending);
    result.volume = value;
    return result;
  };

  Analyzer.prototype.renderContainer = function (estimate) {
    var safePct = Math.max(0, Math.min(100, estimate.percent || 0));
    var fillWidth = Math.round(300 * safePct / 100);
    this.containerVisual.innerHTML = [
      '<svg viewBox="0 0 420 190" role="img" aria-label="' + this.copy.containerTitle.replace(/"/g, "&quot;") + '">',
      '<text x="28" y="30" font-size="15" font-weight="800" fill="#0f172a">' + this.copy.containerTitle + '</text>',
      '<text x="392" y="30" text-anchor="end" font-size="14" font-family="ui-monospace,Consolas,monospace" fill="#475569">' + (estimate.volume == null ? "—" : this.formatNumber(estimate.volume, 3) + " m³") + '</text>',
      '<rect x="28" y="55" width="320" height="84" rx="7" fill="#f8fafc" stroke="#475569" stroke-width="4"/>',
      '<rect x="38" y="65" width="' + fillWidth + '" height="64" rx="3" fill="#5DCAA5"/>',
      '<line x1="348" y1="66" x2="382" y2="66" stroke="#475569" stroke-width="4"/><line x1="348" y1="128" x2="382" y2="128" stroke="#475569" stroke-width="4"/>',
      '<text x="188" y="105" text-anchor="middle" font-size="24" font-weight="900" fill="#04342C">' + Math.round(estimate.percent || 0) + '%</text>',
      '<text x="28" y="166" font-size="16" font-weight="850" fill="#0f172a">' + estimate.label + '</text>',
      estimate.pending ? '<text x="392" y="166" text-anchor="end" font-size="11" fill="#b45309">' + this.copy.provisional + '</text>' : "",
      "</svg>"
    ].join("");
  };

  Analyzer.prototype.renderResult = function (payload) {
    var result = payload.result;
    var metrics = result.metrics;
    this.metrics.innerHTML = "";
    this.metric(this.copy.productRows, this.formatNumber(metrics.productRows, 0));
    this.metric(this.copy.uniqueProducts, this.formatNumber(metrics.uniqueProducts, 0));
    this.metric(this.copy.quantity, this.formatNumber(metrics.quantity, 2));
    this.metric(this.copy.cartons, this.formatNumber(metrics.cartons, 2));
    this.metric(this.copy.volume, metrics.volume == null ? this.copy.missing : this.formatNumber(metrics.volume, 3) + " m³" + (result.pending.volumeUnit ? " · " + this.copy.unitPending : ""));
    this.metric(this.copy.weight, metrics.weight == null ? this.copy.missing : this.formatNumber(metrics.weight, 2) + " kg" + (result.pending.weightUnit ? " · " + this.copy.unitPending : ""));
    this.metric(this.copy.amount, this.amountText(metrics.amounts));
    this.warningList.innerHTML = "";
    var warningCodes = result.warnings || [];
    if (!warningCodes.length) this.warningList.hidden = true;
    else {
      this.warningList.hidden = false;
      warningCodes.forEach(function (code) {
        var message = (this.copy.warnings && this.copy.warnings[code]) || EN.warnings[code] || code;
        var count = result.warningCounts && result.warningCounts[code];
        this.warningList.appendChild(element("li", "", replaceVars(message, { n: count == null ? "" : count })));
      }, this);
    }
    var estimate = this.containerEstimate(metrics.volume, result.pending.volumeUnit);
    this.renderContainer(estimate);
    this.renderTable(result.items);
  };

  Analyzer.prototype.renderTable = function (items) {
    var t = this.copy;
    this.tableWrap.innerHTML = "";
    var table = element("table", "order-analyzer__table");
    var caption = element("caption", "", t.detailsTitle + " · " + items.length);
    table.appendChild(caption);
    var thead = element("thead", "");
    var head = element("tr", "");
    [t.sourceRow, t.product, t.sku, t.quantity, t.cartons, t.volume, t.weight, t.fields.unitPrice, t.amount].forEach(function (label) { head.appendChild(element("th", "", label)); });
    thead.appendChild(head);
    table.appendChild(thead);
    var tbody = element("tbody", "");
    items.forEach(function (item) {
      var row = element("tr", "");
      var values = [
        item.row,
        item.product || "—",
        item.sku || "—",
        item.quantity == null ? "—" : this.formatNumber(item.quantity, 2),
        item.cartons == null ? "—" : this.formatNumber(item.cartons, 2),
        item.volume == null ? "—" : this.formatNumber(item.volume, 4) + " m³" + (!item.volumeUnit ? " ?" : ""),
        item.weight == null ? "—" : this.formatNumber(item.weight, 3) + " kg" + (!item.weightUnit ? " ?" : ""),
        item.unitPrice == null ? "—" : (item.currency ? item.currency + " " : "") + this.formatNumber(item.unitPrice, 2) + (!item.currency ? " ?" : ""),
        item.amount == null ? "—" : (item.currency ? item.currency + " " : "") + this.formatNumber(item.amount, 2) + (!item.currency ? " ?" : "")
      ];
      values.forEach(function (value, index) { row.appendChild(element("td", index === 1 || index === 2 ? "" : "num", value)); });
      tbody.appendChild(row);
    }, this);
    table.appendChild(tbody);
    this.tableWrap.appendChild(table);
  };

  Analyzer.prototype.wrapLines = function (ctx, value, maxWidth) {
    var text = String(value == null || value === "" ? "—" : value);
    var lines = [];
    var current = "";
    Array.from(text).forEach(function (character) {
      var candidate = current + character;
      if (current && ctx.measureText(candidate).width > maxWidth) { lines.push(current); current = character; }
      else current = candidate;
    });
    if (current) lines.push(current);
    return lines.length ? lines : ["—"];
  };

  Analyzer.prototype.reportRows = function (ctx) {
    var self = this;
    ctx.font = '22px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    return this.payload.result.items.map(function (item) {
      var productText = (item.product || "—") + (item.sku ? " · " + item.sku : "");
      var lines = self.wrapLines(ctx, productText, 470);
      return { item: item, lines: lines, height: Math.max(64, 22 + lines.length * 26) };
    });
  };

  Analyzer.prototype.roundRect = function (ctx, x, y, width, height, radius, fill, stroke) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  };

  Analyzer.prototype.drawMetricCard = function (ctx, x, y, width, label, value) {
    this.roundRect(ctx, x, y, width, 96, 18, "#f8fbff", "#d7e6f3");
    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillStyle = "#64748b"; ctx.font = '700 17px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(label, this.rtl ? x + width - 22 : x + 22, y + 31);
    ctx.fillStyle = "#0f172a"; ctx.font = '800 28px ui-monospace,"SF Mono",Consolas,monospace';
    var trimmed = String(value).length > 30 ? String(value).slice(0, 29) + "…" : String(value);
    ctx.fillText(trimmed, this.rtl ? x + width - 22 : x + 22, y + 70);
  };

  Analyzer.prototype.drawContainer = function (ctx, x, y, width, estimate) {
    this.roundRect(ctx, x, y, width, 184, 22, "#f8fbff", "#d7e6f3");
    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillStyle = "#0f172a"; ctx.font = '800 21px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(this.copy.containerTitle, this.rtl ? x + width - 24 : x + 24, y + 38);
    var boxX = x + 24, boxY = y + 62, boxWidth = width - 48, boxHeight = 68;
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 7, "#ffffff", "#475569");
    var fill = Math.max(0, Math.min(1, (estimate.percent || 0) / 100));
    ctx.fillStyle = "#5dcaa5"; ctx.fillRect(boxX + 7, boxY + 7, (boxWidth - 14) * fill, boxHeight - 14);
    ctx.textAlign = "center"; ctx.fillStyle = "#04342c"; ctx.font = '900 26px ui-monospace,"SF Mono",Consolas,monospace';
    ctx.fillText(Math.round(estimate.percent || 0) + "%", x + width / 2, boxY + 43);
    ctx.textAlign = this.rtl ? "right" : "left"; ctx.fillStyle = "#0f172a"; ctx.font = '800 20px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(estimate.label, this.rtl ? x + width - 24 : x + 24, y + 162);
  };

  Analyzer.prototype.createReportPages = async function () {
    if (!this.payload) throw new Error("no_result");
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (_) {} }
    var scratch = document.createElement("canvas");
    scratch.width = 1600; scratch.height = 1000;
    var scratchCtx = scratch.getContext("2d");
    var rowLayouts = this.reportRows(scratchCtx);
    // Keep each bitmap below the conservative iOS/Safari canvas-area limit.
    // Large orders are split into numbered PNG files instead of dropping rows.
    var maxPageHeight = 8400;
    var topHeight = 770;
    var footerHeight = 76;
    var pages = [];
    var pageRows = [];
    var used = topHeight;
    rowLayouts.forEach(function (layout) {
      if (pageRows.length && used + layout.height + footerHeight > maxPageHeight) { pages.push(pageRows); pageRows = []; used = topHeight; }
      pageRows.push(layout); used += layout.height;
    });
    pages.push(pageRows);
    scratch.width = 1;
    scratch.height = 1;
    return pages;
  };

  Analyzer.prototype.drawReportPage = function (rows, pageIndex, totalPages) {
    var width = 1600, margin = 80, topHeight = 770, footerHeight = 76;
    var rowsHeight = rows.reduce(function (sum, row) { return sum + row.height; }, 0);
    var height = Math.max(980, topHeight + rowsHeight + footerHeight);
    var canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4f8fc"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(38, 38, width - 76, height - 76);
    ctx.textBaseline = "alphabetic";
    ctx.direction = this.rtl ? "rtl" : "ltr";
    ctx.textAlign = this.rtl ? "right" : "left";
    var startX = this.rtl ? width - margin : margin;
    ctx.fillStyle = "#0f766e"; ctx.font = '800 18px ui-monospace,"SF Mono",Consolas,monospace'; ctx.fillText("Jabbar · 体积工具", startX, 92);
    ctx.fillStyle = "#0f172a"; ctx.font = '900 46px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif'; ctx.fillText(this.copy.reportTitle, startX, 150);
    ctx.fillStyle = "#64748b"; ctx.font = '20px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(this.copy.file + ": " + this.payload.fileName + " · " + this.copy.sheet + ": " + this.payload.sheetName, startX, 192);
    ctx.fillText(this.copy.generated + ": " + new Date().toLocaleString(this.locale), startX, 226);
    var m = this.payload.result.metrics;
    var metricValues = [
      [this.copy.productRows, this.formatNumber(m.productRows, 0)], [this.copy.uniqueProducts, this.formatNumber(m.uniqueProducts, 0)], [this.copy.quantity, this.formatNumber(m.quantity, 2)],
      [this.copy.cartons, this.formatNumber(m.cartons, 2)], [this.copy.volume, m.volume == null ? this.copy.missing : this.formatNumber(m.volume, 3) + " m³" + (this.payload.result.pending.volumeUnit ? " ?" : "")],
      [this.copy.weight, m.weight == null ? this.copy.missing : this.formatNumber(m.weight, 2) + " kg" + (this.payload.result.pending.weightUnit ? " ?" : "")], [this.copy.amount, this.amountText(m.amounts)]
    ];
    var cardWidth = 346, gap = 18;
    metricValues.slice(0, 6).forEach(function (entry, index) {
      var column = index % 3, row = Math.floor(index / 3);
      this.drawMetricCard(ctx, margin + column * (cardWidth + gap), 270 + row * 114, cardWidth, entry[0], entry[1]);
    }, this);
    this.drawMetricCard(ctx, margin + 3 * (cardWidth + gap), 270, 346, metricValues[6][0], metricValues[6][1]);
    var estimate = this.containerEstimate(m.volume, this.payload.result.pending.volumeUnit);
    this.drawContainer(ctx, margin + 3 * (cardWidth + gap), 384, 346, estimate);
    ctx.fillStyle = "#0f172a"; ctx.font = '900 28px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif'; ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillText(this.copy.detailsTitle, this.rtl ? width - margin : margin, 628);
    var columns = [70, 400, 110, 110, 175, 175, 180, 220];
    var labels = [this.copy.sourceRow, this.copy.product + " / " + this.copy.sku, this.copy.quantity, this.copy.cartons, this.copy.volume, this.copy.weight, this.copy.fields.unitPrice, this.copy.amount];
    var tableX = margin, headerY = 660, tableWidth = columns.reduce(function (a, b) { return a + b; }, 0);
    var rtl = this.rtl;
    var columnStarts = [];
    var cursorX = rtl ? tableX + tableWidth : tableX;
    columns.forEach(function (columnWidth) {
      if (rtl) cursorX -= columnWidth;
      columnStarts.push(cursorX);
      if (!rtl) cursorX += columnWidth;
    });
    function tableTextX(index) { return rtl ? columnStarts[index] + columns[index] - 12 : columnStarts[index] + 12; }
    ctx.fillStyle = "#eaf3fa"; ctx.fillRect(tableX, headerY, tableWidth, 58);
    ctx.fillStyle = "#334155"; ctx.font = '800 17px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif'; ctx.textAlign = rtl ? "right" : "left";
    labels.forEach(function (label, index) { ctx.fillText(label, tableTextX(index), headerY + 37); });
    var y = headerY + 58;
    rows.forEach(function (layout, rowIndex) {
      var item = layout.item;
      ctx.fillStyle = rowIndex % 2 ? "#f8fafc" : "#ffffff"; ctx.fillRect(tableX, y, tableWidth, layout.height);
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tableX, y + layout.height); ctx.lineTo(tableX + tableWidth, y + layout.height); ctx.stroke();
      var amount = item.amount == null ? "—" : (item.currency ? item.currency + " " : "") + this.formatNumber(item.amount, 2) + (!item.currency ? " ?" : "");
      var unitPrice = item.unitPrice == null ? "—" : (item.currency ? item.currency + " " : "") + this.formatNumber(item.unitPrice, 2) + (!item.currency ? " ?" : "");
      var values = [String(item.row), null, item.quantity == null ? "—" : this.formatNumber(item.quantity, 2), item.cartons == null ? "—" : this.formatNumber(item.cartons, 2), item.volume == null ? "—" : this.formatNumber(item.volume, 4) + " m³" + (!item.volumeUnit ? " ?" : ""), item.weight == null ? "—" : this.formatNumber(item.weight, 3) + " kg" + (!item.weightUnit ? " ?" : ""), unitPrice, amount];
      ctx.fillStyle = "#0f172a"; ctx.font = '20px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif'; ctx.textAlign = rtl ? "right" : "left";
      values.forEach(function (value, index) { if (value != null) ctx.fillText(value, tableTextX(index), y + 38); });
      ctx.font = '20px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
      layout.lines.forEach(function (line, lineIndex) { ctx.fillText(line, tableTextX(1), y + 28 + lineIndex * 26); });
      y += layout.height;
    }, this);
    ctx.fillStyle = "#64748b"; ctx.font = '18px ui-monospace,"SF Mono",Consolas,monospace';
    ctx.textAlign = this.rtl ? "right" : "left"; ctx.fillText("Jabbar Sourcing · jabbarsourcing.com", this.rtl ? width - margin : margin, height - 58);
    ctx.textAlign = this.rtl ? "left" : "right"; ctx.fillText(replaceVars(this.copy.page, { current: pageIndex + 1, total: totalPages }), this.rtl ? margin : width - margin, height - 58);
    return canvas;
  };

  Analyzer.prototype.canvasBlob = function (canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error("canvas_blob_failed")); }, "image/png");
    });
  };

  Analyzer.prototype.prepareExport = async function () {
    if (this.exportCache) return this.exportCache;
    var pages = await this.createReportPages();
    var total = pages.length;
    var base = safeFileName(this.payload.fileName) + "-Jabbar-Sourcing-order-report";
    var files = [];
    for (var index = 0; index < pages.length; index += 1) {
      var canvas = this.drawReportPage(pages[index], index, total);
      var blob = await this.canvasBlob(canvas);
      var suffix = total > 1 ? "-" + String(index + 1).padStart(2, "0") + "-of-" + String(total).padStart(2, "0") : "";
      files.push(new File([blob], base + suffix + ".png", { type: "image/png", lastModified: Date.now() }));
      // Release the potentially tall bitmap before creating the next page.
      canvas.width = 1;
      canvas.height = 1;
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
    }
    this.exportCache = files;
    qa.exportPageCount = files.length;
    qa.lastExportFiles = files.map(function (file) { return { name: file.name, size: file.size, type: file.type }; });
    return files;
  };

  Analyzer.prototype.downloadFiles = function (files) {
    files.forEach(function (file, index) {
      var url = URL.createObjectURL(file);
      window.setTimeout(function () {
        var anchor = document.createElement("a");
        anchor.href = url; anchor.download = file.name; anchor.hidden = true;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      }, index * 180);
    });
  };

  Analyzer.prototype.exportReport = async function () {
    if (!this.payload) { this.setStatus(this.copy.noResult, true); return []; }
    if (this.deliveryBlocked) { this.setStatus(this.deliveryBlocked, true); return []; }
    this.exportButton.disabled = true;
    this.setStatus(this.copy.exportPreparing, false);
    try {
      var files = await this.prepareExport();
      this.downloadFiles(files);
      this.setStatus(this.copy.exportDone, false);
      return files;
    } catch (error) {
      qa.lastError = error && error.message ? error.message : String(error);
      this.setStatus(this.copy.exportError, true);
      return [];
    } finally {
      this.exportButton.disabled = Boolean(this.deliveryBlocked);
    }
  };

  var qa = window.__JABBAR_ORDER_ANALYZER_QA__ = window.__JABBAR_ORDER_ANALYZER_QA__ || {};
  window.JABBAR_ORDER_ANALYZER_QA = qa;
  qa.version = VERSION;
  qa.noUpload = true;
  qa.maxFileBytes = MAX_FILE_BYTES;
  qa.workerUsed = false;
  qa.fallbackUsed = false;
  qa.vendorRequested = false;
  qa.instances = qa.instances || [];

  function init() {
    document.querySelectorAll("[data-order-analyzer]").forEach(function (root, index) {
      if (root.__jabbarOrderAnalyzer) return;
      var instance = new Analyzer(root, index);
      root.__jabbarOrderAnalyzer = instance;
      qa.instances.push(instance);
    });
    qa.ready = true;
  }

  window.JabbarOrderAnalyzer = { init: init, version: VERSION };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
