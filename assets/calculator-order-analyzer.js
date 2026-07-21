/* Jabbar Sourcing local order workbook analyzer. No workbook data is uploaded. */
(function () {
  "use strict";

  var VERSION = "order-20260722a";
  var MAX_FILE_BYTES = 50 * 1024 * 1024;
  // Main-thread parsing is an emergency compatibility path. Keep its memory
  // ceiling well below the Worker limit so older mobile browsers stay usable.
  var MAIN_THREAD_FALLBACK_MAX_BYTES = 8 * 1024 * 1024;
  var MAX_FILES = 10;
  var WORKER_TIMEOUT_MS = 60000;
  var CONTAINER_CAPACITY_CBM = 68;
  var CONTAINER_EPSILON_CBM = 1e-7;
  var MAX_CONTAINER_BARS = 100;
  var WORKER_URL = "/assets/calculator-order-worker.js?v=" + VERSION;
  var CORE_URL = "/assets/calculator-order-worker.js?v=" + VERSION;
  var XLSX_URL = "/assets/vendor/xlsx.full.min.js?v=0.20.3";
  var FIELD_KEYS = ["product", "sku", "qty", "cartons", "unitWeight", "totalWeight", "unitVolume", "totalVolume", "unitPrice", "amount", "length", "width", "height", "currency", "weightUnit", "volumeUnit", "dimensionUnit"];
  var scriptPromises = {};

  var EN = {
    toolLabel: "Jabbar · Volume tool",
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
    lcl: "LCL / trial shipment", fortyHq: "40HQ",
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
      amount_value_pending: "{n} price or amount value(s) include a currency but no readable number. Correct them before exporting.",
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
      toolLabel: "Jabbar · 体积工具",
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
      containerTitle: "集装箱装载估算", lcl: "适合拼箱或小批量试单", fortyHq: "40英尺高柜", containerCount: "约需 {n} 个40英尺高柜", provisional: "体积单位确认前仅供暂估",
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
      toolLabel: "Jabbar · Herramienta de volumen",
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
      lcl: "LCL / envío de prueba", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · أداة الحجم",
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
      lcl: "LCL / شحنة تجريبية", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · Outil de volume",
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
      lcl: "LCL / envoi d’essai", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · Ferramenta de volume",
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
      lcl: "LCL / envio de teste", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · Расчёт объёма",
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
      lcl: "LCL / пробная отправка", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · Volumenrechner",
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
      lcl: "LCL / Testsendung", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · Calcolo volume",
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
      lcl: "LCL / spedizione di prova", fortyHq: "40HQ",
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
      toolLabel: "Jabbar · Hacim aracı",
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
      lcl: "LCL / deneme sevkiyatı", fortyHq: "40HQ",
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

  var BATCH_COPY = {
    en: { dropLead: "Drop up to 10 Excel files here or choose files", dropHint: ".xlsx, .xls, .xlsm or .csv · up to 10 files · 50 MB each", selectedFiles: "Selected files", tooManyFiles: "Choose no more than 10 files at once.", parsingBatch: "Reading file {current} of {total} locally…", fileCollection: "File collection", fileReady: "Ready", combinedReady: "{total} files analyzed and combined. Select a file below to review its details.", combinedReport: "COMBINED ORDER ANALYSIS", combinedFile: "{total} files", exportPreparing: "Preparing one lossless 4K PNG overview…", exportDone: "The lossless 4K PNG overview has been downloaded." },
    zh: { dropLead: "拖入最多 10 个 Excel 表格，或点击选择文件", dropHint: ".xlsx、.xls、.xlsm 或 .csv · 最多 10 个文件 · 每个最大 50 MB", selectedFiles: "已选择文件", tooManyFiles: "一次最多只能选择 10 个文件。", parsingBatch: "正在本地读取第 {current} / {total} 个文件…", fileCollection: "多文件集合", fileReady: "已完成", combinedReady: "已完成并合并统计 {total} 个文件，可点击下方文件查看各自明细。", combinedReport: "订单合并统计总览", combinedFile: "共 {total} 个文件", exportPreparing: "正在生成单张 4K 无损 PNG 总览…", exportDone: "4K 无损 PNG 总览已下载。" },
    es: { dropLead: "Suelta hasta 10 archivos Excel o selecciónalos", dropHint: ".xlsx, .xls, .xlsm o .csv · hasta 10 archivos · 50 MB cada uno", selectedFiles: "Archivos seleccionados", tooManyFiles: "Selecciona como máximo 10 archivos.", parsingBatch: "Leyendo localmente el archivo {current} de {total}…", fileCollection: "Colección de archivos", fileReady: "Listo", combinedReady: "Se analizaron y combinaron {total} archivos. Selecciona uno para revisar sus detalles.", combinedReport: "RESUMEN COMBINADO DEL PEDIDO", combinedFile: "{total} archivos", exportPreparing: "Preparando una imagen PNG 4K sin pérdida…", exportDone: "Se descargó la imagen PNG 4K sin pérdida." },
    ar: { dropLead: "أسقط ما يصل إلى 10 ملفات Excel أو اختر الملفات", dropHint: ".xlsx أو .xls أو .xlsm أو .csv · حتى 10 ملفات · 50 MB لكل ملف", selectedFiles: "الملفات المحددة", tooManyFiles: "اختر 10 ملفات كحد أقصى.", parsingBatch: "جارٍ قراءة الملف {current} من {total} محليًا…", fileCollection: "مجموعة الملفات", fileReady: "جاهز", combinedReady: "تم تحليل ودمج {total} ملفات. اختر ملفًا لمراجعة تفاصيله.", combinedReport: "ملخص تحليل الطلبات المدمج", combinedFile: "{total} ملفات", exportPreparing: "جارٍ إعداد صورة PNG واحدة بدقة 4K دون فقد…", exportDone: "تم تنزيل صورة PNG بدقة 4K دون فقد." },
    fr: { dropLead: "Déposez jusqu’à 10 fichiers Excel ou sélectionnez-les", dropHint: ".xlsx, .xls, .xlsm ou .csv · 10 fichiers max. · 50 MB chacun", selectedFiles: "Fichiers sélectionnés", tooManyFiles: "Sélectionnez au maximum 10 fichiers.", parsingBatch: "Lecture locale du fichier {current} sur {total}…", fileCollection: "Collection de fichiers", fileReady: "Prêt", combinedReady: "{total} fichiers ont été analysés et regroupés. Sélectionnez un fichier pour voir ses détails.", combinedReport: "SYNTHÈSE COMBINÉE DES COMMANDES", combinedFile: "{total} fichiers", exportPreparing: "Préparation d’une image PNG 4K unique sans perte…", exportDone: "L’image PNG 4K sans perte a été téléchargée." },
    pt: { dropLead: "Solte até 10 arquivos Excel ou selecione-os", dropHint: ".xlsx, .xls, .xlsm ou .csv · até 10 arquivos · 50 MB cada", selectedFiles: "Arquivos selecionados", tooManyFiles: "Selecione no máximo 10 arquivos.", parsingBatch: "Lendo localmente o arquivo {current} de {total}…", fileCollection: "Coleção de arquivos", fileReady: "Pronto", combinedReady: "{total} arquivos foram analisados e combinados. Selecione um arquivo para ver os detalhes.", combinedReport: "RESUMO COMBINADO DOS PEDIDOS", combinedFile: "{total} arquivos", exportPreparing: "Preparando uma única imagem PNG 4K sem perdas…", exportDone: "A imagem PNG 4K sem perdas foi baixada." },
    ru: { dropLead: "Перетащите до 10 файлов Excel или выберите их", dropHint: ".xlsx, .xls, .xlsm или .csv · до 10 файлов · 50 MB каждый", selectedFiles: "Выбранные файлы", tooManyFiles: "Выберите не более 10 файлов.", parsingBatch: "Локальная обработка файла {current} из {total}…", fileCollection: "Набор файлов", fileReady: "Готово", combinedReady: "Проанализировано и объединено файлов: {total}. Выберите файл для просмотра деталей.", combinedReport: "СВОДНЫЙ АНАЛИЗ ЗАКАЗОВ", combinedFile: "Файлов: {total}", exportPreparing: "Подготовка одной PNG 4K без потерь…", exportDone: "PNG 4K без потерь загружен." },
    de: { dropLead: "Bis zu 10 Excel-Dateien ablegen oder auswählen", dropHint: ".xlsx, .xls, .xlsm oder .csv · bis zu 10 Dateien · je 50 MB", selectedFiles: "Ausgewählte Dateien", tooManyFiles: "Wählen Sie höchstens 10 Dateien aus.", parsingBatch: "Datei {current} von {total} wird lokal gelesen…", fileCollection: "Dateisammlung", fileReady: "Fertig", combinedReady: "{total} Dateien wurden analysiert und zusammengeführt. Wählen Sie eine Datei für Details.", combinedReport: "KOMBINIERTE BESTELLÜBERSICHT", combinedFile: "{total} Dateien", exportPreparing: "Eine verlustfreie 4K-PNG-Übersicht wird erstellt…", exportDone: "Die verlustfreie 4K-PNG-Übersicht wurde heruntergeladen." },
    it: { dropLead: "Trascina fino a 10 file Excel o selezionali", dropHint: ".xlsx, .xls, .xlsm o .csv · fino a 10 file · 50 MB ciascuno", selectedFiles: "File selezionati", tooManyFiles: "Seleziona al massimo 10 file.", parsingBatch: "Lettura locale del file {current} di {total}…", fileCollection: "Raccolta file", fileReady: "Pronto", combinedReady: "Sono stati analizzati e uniti {total} file. Seleziona un file per vederne i dettagli.", combinedReport: "RIEPILOGO ORDINI COMBINATO", combinedFile: "{total} file", exportPreparing: "Preparazione di un’unica immagine PNG 4K senza perdita…", exportDone: "L’immagine PNG 4K senza perdita è stata scaricata." },
    tr: { dropLead: "En fazla 10 Excel dosyasını bırakın veya seçin", dropHint: ".xlsx, .xls, .xlsm veya .csv · en fazla 10 dosya · her biri 50 MB", selectedFiles: "Seçilen dosyalar", tooManyFiles: "En fazla 10 dosya seçin.", parsingBatch: "{total} dosyadan {current}. dosya yerel olarak okunuyor…", fileCollection: "Dosya koleksiyonu", fileReady: "Hazır", combinedReady: "{total} dosya analiz edilip birleştirildi. Ayrıntıları görmek için bir dosya seçin.", combinedReport: "BİRLEŞİK SİPARİŞ ÖZETİ", combinedFile: "{total} dosya", exportPreparing: "Tek bir kayıpsız 4K PNG hazırlanıyor…", exportDone: "Kayıpsız 4K PNG indirildi." }
  };
  var CLEAR_FILES_COPY = {
    "en": "Remove selected files",
    "zh": "删除已选文件",
    "es": "Quitar archivos seleccionados",
    "ar": "إزالة الملفات المحددة",
    "fr": "Supprimer les fichiers sélectionnés",
    "pt": "Remover arquivos selecionados",
    "ru": "Удалить выбранные файлы",
    "de": "Ausgewählte Dateien entfernen",
    "it": "Rimuovi i file selezionati",
    "tr": "Seçili dosyaları kaldır"
  };
  Object.keys(BATCH_COPY).forEach(function (code) {
    Object.assign(LOCALES[code], BATCH_COPY[code], { clearFiles: CLEAR_FILES_COPY[code] });
  });

  var ANALYZER_COPY = {
    en: {
      exportPng: "Export 4K PNG overview", exportPreparing: "Preparing one lossless 4K PNG overview…", exportDone: "The lossless 4K PNG overview has been downloaded.",
      readerUnavailable: "The local Excel reader could not load. Check your connection and try again.", workerTimeout: "Analysis timed out. Split this workbook or try again; it was not moved to the slower browser fallback.",
      fallbackTooLarge: "The Excel Worker is unavailable, and this file is larger than the safe {mb} MB browser fallback limit. Split the file or try again after the reader loads.",
      partialReady: "{success} of {total} files were analyzed. {failed} failed; review the file list below.", batchNoneReady: "No files could be analyzed. Review each failed file below.", fileFailed: "Could not analyze: {reason}"
    },
    zh: {
      exportPng: "导出 4K PNG 总览图", exportPreparing: "正在生成单张 4K 无损 PNG 总览图…", exportDone: "4K 无损 PNG 总览图已下载。",
      readerUnavailable: "本地 Excel 解析组件加载失败，请检查网络后重试。", workerTimeout: "分析超时。请拆分表格或重试；本次没有转到较慢的浏览器主线程处理。",
      fallbackTooLarge: "Excel Worker 当前不可用，且文件超过浏览器安全回退上限 {mb} MB。请拆分文件，或等待解析组件恢复后重试。",
      partialReady: "已完成 {success} / {total} 个文件，另有 {failed} 个失败；请在下方文件列表中检查。", batchNoneReady: "没有文件分析成功，请在下方逐个检查失败原因。", fileFailed: "分析失败：{reason}"
    },
    es: {
      exportPng: "Exportar resumen PNG 4K", exportPreparing: "Preparando un resumen PNG 4K sin pérdida…", exportDone: "Se descargó el resumen PNG 4K sin pérdida.",
      readerUnavailable: "No se pudo cargar el lector local de Excel. Comprueba la conexión e inténtalo de nuevo.", workerTimeout: "El análisis agotó el tiempo. Divide el archivo o vuelve a intentarlo; no se trasladó al modo lento del navegador.",
      fallbackTooLarge: "El Worker de Excel no está disponible y el archivo supera el límite seguro de {mb} MB del navegador. Divide el archivo o vuelve a intentarlo cuando cargue el lector.",
      partialReady: "Se analizaron {success} de {total} archivos. Fallaron {failed}; revisa la lista inferior.", batchNoneReady: "No se pudo analizar ningún archivo. Revisa cada error en la lista inferior.", fileFailed: "No se pudo analizar: {reason}"
    },
    ar: {
      exportPng: "تصدير ملخص PNG بدقة 4K", exportPreparing: "جارٍ إعداد ملخص PNG واحد بدقة 4K دون فقد…", exportDone: "تم تنزيل ملخص PNG بدقة 4K دون فقد.",
      readerUnavailable: "تعذر تحميل قارئ Excel المحلي. تحقق من الاتصال ثم حاول مرة أخرى.", workerTimeout: "انتهت مهلة التحليل. قسّم الملف أو حاول مجددًا؛ لم يُنقل إلى المعالجة الأبطأ في المتصفح.",
      fallbackTooLarge: "عامل Excel غير متاح، والملف أكبر من حد المعالجة الآمنة في المتصفح وهو {mb} MB. قسّم الملف أو أعد المحاولة بعد تحميل القارئ.",
      partialReady: "تم تحليل {success} من أصل {total} ملفات. فشل {failed}؛ راجع قائمة الملفات أدناه.", batchNoneReady: "تعذر تحليل أي ملف. راجع سبب فشل كل ملف أدناه.", fileFailed: "تعذر التحليل: {reason}"
    },
    fr: {
      exportPng: "Exporter l’aperçu PNG 4K", exportPreparing: "Préparation d’un aperçu PNG 4K unique sans perte…", exportDone: "L’aperçu PNG 4K sans perte a été téléchargé.",
      readerUnavailable: "Le lecteur Excel local n’a pas pu être chargé. Vérifiez la connexion et réessayez.", workerTimeout: "L’analyse a expiré. Divisez le fichier ou réessayez ; il n’a pas été transféré vers le mode navigateur plus lent.",
      fallbackTooLarge: "Le Worker Excel est indisponible et ce fichier dépasse la limite sûre de {mb} MB du navigateur. Divisez-le ou réessayez lorsque le lecteur sera chargé.",
      partialReady: "{success} fichier(s) sur {total} ont été analysés. {failed} ont échoué ; consultez la liste ci-dessous.", batchNoneReady: "Aucun fichier n’a pu être analysé. Consultez chaque erreur ci-dessous.", fileFailed: "Analyse impossible : {reason}"
    },
    pt: {
      exportPng: "Exportar visão geral PNG 4K", exportPreparing: "Preparando uma visão geral PNG 4K sem perdas…", exportDone: "A visão geral PNG 4K sem perdas foi baixada.",
      readerUnavailable: "Não foi possível carregar o leitor local de Excel. Verifique a conexão e tente novamente.", workerTimeout: "A análise excedeu o tempo limite. Divida o arquivo ou tente novamente; ele não foi transferido para o modo lento do navegador.",
      fallbackTooLarge: "O Worker do Excel está indisponível e o arquivo excede o limite seguro de {mb} MB do navegador. Divida-o ou tente novamente quando o leitor carregar.",
      partialReady: "{success} de {total} arquivos foram analisados. {failed} falharam; confira a lista abaixo.", batchNoneReady: "Nenhum arquivo pôde ser analisado. Confira cada falha abaixo.", fileFailed: "Não foi possível analisar: {reason}"
    },
    ru: {
      exportPng: "Экспорт обзора PNG 4K", exportPreparing: "Подготавливается единый обзор PNG 4K без потерь…", exportDone: "Обзор PNG 4K без потерь загружен.",
      readerUnavailable: "Не удалось загрузить локальный модуль Excel. Проверьте подключение и повторите попытку.", workerTimeout: "Время анализа истекло. Разделите файл или повторите попытку; медленный режим браузера не использовался.",
      fallbackTooLarge: "Excel Worker недоступен, а файл превышает безопасный предел браузера {mb} МБ. Разделите файл или повторите попытку после загрузки модуля.",
      partialReady: "Обработано файлов: {success} из {total}. Ошибок: {failed}; проверьте список ниже.", batchNoneReady: "Не удалось обработать ни одного файла. Проверьте ошибки ниже.", fileFailed: "Ошибка анализа: {reason}"
    },
    de: {
      exportPng: "4K-PNG-Übersicht exportieren", exportPreparing: "Eine verlustfreie 4K-PNG-Übersicht wird erstellt…", exportDone: "Die verlustfreie 4K-PNG-Übersicht wurde heruntergeladen.",
      readerUnavailable: "Der lokale Excel-Reader konnte nicht geladen werden. Prüfen Sie die Verbindung und versuchen Sie es erneut.", workerTimeout: "Die Analyse hat das Zeitlimit überschritten. Teilen Sie die Datei oder versuchen Sie es erneut; der langsamere Browsermodus wurde nicht verwendet.",
      fallbackTooLarge: "Der Excel Worker ist nicht verfügbar und die Datei überschreitet das sichere Browserlimit von {mb} MB. Teilen Sie die Datei oder versuchen Sie es nach dem Laden des Readers erneut.",
      partialReady: "{success} von {total} Dateien wurden analysiert. {failed} sind fehlgeschlagen; prüfen Sie die Liste unten.", batchNoneReady: "Keine Datei konnte analysiert werden. Prüfen Sie die Fehler unten.", fileFailed: "Analyse fehlgeschlagen: {reason}"
    },
    it: {
      exportPng: "Esporta panoramica PNG 4K", exportPreparing: "Preparazione di una panoramica PNG 4K senza perdita…", exportDone: "La panoramica PNG 4K senza perdita è stata scaricata.",
      readerUnavailable: "Impossibile caricare il lettore Excel locale. Controlla la connessione e riprova.", workerTimeout: "L’analisi è scaduta. Dividi il file o riprova; non è stato trasferito alla modalità lenta del browser.",
      fallbackTooLarge: "Il Worker Excel non è disponibile e il file supera il limite sicuro del browser di {mb} MB. Dividi il file o riprova quando il lettore sarà caricato.",
      partialReady: "Analizzati {success} file su {total}. {failed} non riusciti; controlla l’elenco in basso.", batchNoneReady: "Non è stato possibile analizzare alcun file. Controlla ogni errore in basso.", fileFailed: "Analisi non riuscita: {reason}"
    },
    tr: {
      exportPng: "4K PNG genel görünümünü dışa aktar", exportPreparing: "Tek bir kayıpsız 4K PNG genel görünümü hazırlanıyor…", exportDone: "Kayıpsız 4K PNG genel görünümü indirildi.",
      readerUnavailable: "Yerel Excel okuyucusu yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.", workerTimeout: "Analiz zaman aşımına uğradı. Dosyayı bölün veya yeniden deneyin; daha yavaş tarayıcı moduna aktarılmadı.",
      fallbackTooLarge: "Excel Worker kullanılamıyor ve dosya güvenli {mb} MB tarayıcı sınırını aşıyor. Dosyayı bölün veya okuyucu yüklendiğinde yeniden deneyin.",
      partialReady: "{total} dosyadan {success} tanesi analiz edildi. {failed} dosya başarısız; aşağıdaki listeyi kontrol edin.", batchNoneReady: "Hiçbir dosya analiz edilemedi. Aşağıdaki hata nedenlerini kontrol edin.", fileFailed: "Analiz edilemedi: {reason}"
    }
  };
  Object.keys(ANALYZER_COPY).forEach(function (code) { Object.assign(LOCALES[code], ANALYZER_COPY[code]); });

  var ANALYZER_WARNING_COPY = {
    en: { numeric_format_pending: "Some text numbers have an ambiguous decimal or thousands separator. Confirm their values before exporting.", summary_rows_pending: "Some unlabeled subtotal rows could not be reconciled safely. Confirm the mapping or simplify the workbook before exporting.", amount_value_pending: "{n} price or amount value(s) include a currency but no readable number. Correct them before exporting." },
    zh: { numeric_format_pending: "部分文本数字的小数点或千位分隔符存在歧义，请确认数值后再导出。", summary_rows_pending: "部分未标注的小计行无法安全核对，请确认列映射或精简表格后再导出。", amount_value_pending: "{n} 个单价或金额单元格包含币种但没有可识别的数字，请修正后再导出。" },
    es: { numeric_format_pending: "Algunos números de texto tienen separadores decimales o de miles ambiguos. Confirma los valores antes de exportar.", summary_rows_pending: "No se pudieron conciliar con seguridad algunas filas de subtotal sin etiqueta. Confirma la asignación o simplifica el archivo antes de exportar.", amount_value_pending: "{n} valor(es) de precio o importe incluyen una moneda, pero no un número legible. Corrígelos antes de exportar." },
    ar: { numeric_format_pending: "تحتوي بعض الأرقام النصية على فاصل عشري أو فاصل آلاف ملتبس. تحقق من القيم قبل التصدير.", summary_rows_pending: "تعذر التحقق بأمان من بعض صفوف الإجمالي الفرعي غير المسماة. أكد تعيين الأعمدة أو بسّط الملف قبل التصدير.", amount_value_pending: "تتضمن {n} من قيم السعر أو المبلغ عملة دون رقم قابل للقراءة. صححها قبل التصدير." },
    fr: { numeric_format_pending: "Certains nombres textuels ont un séparateur décimal ou de milliers ambigu. Confirmez les valeurs avant l’exportation.", summary_rows_pending: "Certaines lignes de sous-total non libellées n’ont pas pu être rapprochées de façon sûre. Confirmez le mappage ou simplifiez le fichier avant l’exportation.", amount_value_pending: "{n} valeur(s) de prix ou de montant indiquent une devise sans nombre lisible. Corrigez-les avant l’exportation." },
    pt: { numeric_format_pending: "Alguns números em texto têm separador decimal ou de milhar ambíguo. Confirme os valores antes de exportar.", summary_rows_pending: "Algumas linhas de subtotal sem rótulo não puderam ser conciliadas com segurança. Confirme o mapeamento ou simplifique o arquivo antes de exportar.", amount_value_pending: "{n} valor(es) de preço ou total incluem uma moeda, mas não um número legível. Corrija-os antes de exportar." },
    ru: { numeric_format_pending: "В некоторых текстовых числах неоднозначен десятичный разделитель или разделитель тысяч. Проверьте значения перед экспортом.", summary_rows_pending: "Некоторые неподписанные строки промежуточных итогов нельзя безопасно сверить. Подтвердите сопоставление или упростите файл перед экспортом.", amount_value_pending: "В {n} значениях цены или суммы указана валюта, но нет распознаваемого числа. Исправьте их перед экспортом." },
    de: { numeric_format_pending: "Bei einigen Textzahlen ist das Dezimal- oder Tausendertrennzeichen mehrdeutig. Prüfen Sie die Werte vor dem Export.", summary_rows_pending: "Einige unbeschriftete Zwischensummenzeilen konnten nicht sicher abgeglichen werden. Bestätigen Sie die Zuordnung oder vereinfachen Sie die Datei vor dem Export.", amount_value_pending: "{n} Preis- oder Betragswert(e) enthalten eine Währung, aber keine lesbare Zahl. Korrigieren Sie sie vor dem Export." },
    it: { numeric_format_pending: "Alcuni numeri testuali hanno un separatore decimale o delle migliaia ambiguo. Conferma i valori prima di esportare.", summary_rows_pending: "Non è stato possibile riconciliare in modo sicuro alcune righe di subtotale senza etichetta. Conferma la mappatura o semplifica il file prima di esportare.", amount_value_pending: "{n} valore/i di prezzo o importo includono una valuta ma non un numero leggibile. Correggili prima di esportare." },
    tr: { numeric_format_pending: "Bazı metin sayılarında ondalık veya binlik ayırıcı belirsiz. Dışa aktarmadan önce değerleri doğrulayın.", summary_rows_pending: "Bazı etiketsiz ara toplam satırları güvenli biçimde uzlaştırılamadı. Dışa aktarmadan önce eşlemeyi onaylayın veya dosyayı sadeleştirin.", amount_value_pending: "{n} fiyat veya tutar değerinde para birimi var ancak okunabilir sayı yok. Dışa aktarmadan önce düzeltin." }
  };
  Object.keys(ANALYZER_WARNING_COPY).forEach(function (code) { Object.assign(LOCALES[code].warnings, ANALYZER_WARNING_COPY[code]); });

  var ORDER_INQUIRY_LABELS = {
    zh: "携带此结果获取报价",
    en: "Get a quote with this result",
    es: "Solicitar cotización con este resultado",
    ar: "اطلب عرض سعر بهذه النتيجة",
    fr: "Demander un devis avec ce résultat",
    pt: "Pedir cotação com este resultado",
    ru: "Запросить расчёт с этим результатом",
    de: "Mit diesem Ergebnis Angebot anfragen",
    it: "Richiedi un preventivo con questo risultato",
    tr: "Bu sonuçla teklif isteyin"
  };

  function languageCode() {
    var code = (document.documentElement.lang || navigator.language || "en").toLowerCase().split("-")[0];
    return LOCALES[code] ? code : "en";
  }

  function trackEvent(eventName, params) {
    var payload = Object.assign({
      page_type: "calculator",
      locale: document.documentElement.lang || languageCode(),
      analyzer_version: VERSION
    }, params || {});
    if (typeof window.jabbarTrack === "function") {
      window.jabbarTrack(eventName, payload);
    } else if (typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
    }
  }

  function elapsedMilliseconds(startedAt) {
    return Math.max(0, Math.min(600000, Date.now() - startedAt));
  }

  function safeErrorCode(value, fallback) {
    var code = String(value || fallback || "unknown").split(":")[0].toLowerCase();
    code = code.replace(/[^a-z0-9_-]+/g, "_").slice(0, 48);
    return code || fallback || "unknown";
  }

  function errorText(error) {
    return String(error && error.message ? error.message : error || "unknown_error");
  }

  function workerInfrastructureFailed(error) {
    var message = errorText(error).toLowerCase();
    if (message.indexOf("worker_timeout") !== -1) return false;
    return /(?:xlsx_library_unavailable|script_load_failed|worker_failed|worker_unavailable|fallback_unavailable|importscripts|networkerror|network error)/.test(message);
  }

  function normalizeProductKeyFallback(value) {
    var text = String(value == null ? "" : value);
    if (text.normalize) text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return text.toLowerCase()
      .replace(/[\s\u00a0_\-–—:：/\\|()[\]{}（）.,，。;；'"“”‘’!?！？@#$%^&*+=~`<>《》]+/g, "")
      .trim();
  }

  function normalizeProductKey(value) {
    var core = window.JabbarOrderWorkerCore;
    if (core && typeof core.normalizeProductKey === "function") return core.normalizeProductKey(value);
    return normalizeProductKeyFallback(value);
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

  function isolatedText(value) {
    var node = element("bdi", "", value);
    node.dir = "ltr";
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
    var promise = new Promise(function (resolve, reject) {
      if (id && document.getElementById(id)) { resolve(); return; }
      var script = document.createElement("script");
      if (id) script.id = id;
      script.src = src;
      script.onload = resolve;
      script.onerror = function () {
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("script_load_failed:" + src));
      };
      document.head.appendChild(script);
    });
    scriptPromises[src] = promise;
    promise.catch(function () {
      if (scriptPromises[src] === promise) delete scriptPromises[src];
    });
    return promise;
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
    this.preferFallback = false;
    this.currentFile = null;
    this.currentFiles = [];
    this.fileEntries = [];
    this.fileResults = [];
    this.activeFileIndex = 0;
    this.mappingFileIndex = -1;
    this.isBatchMode = false;
    this.busy = false;
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
    this.fileInput.multiple = true;
    this.fileInput.accept = ".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";
    this.fileInput.setAttribute("data-order-file", "");
    dropzone.appendChild(this.fileInput);
    dropzone.appendChild(element("strong", "order-analyzer__upload-copy", t.dropLead));
    dropzone.appendChild(element("span", "order-analyzer__upload-hint", t.dropHint));
    this.fileMeta = element("span", "order-analyzer__file-meta", "");
    dropzone.appendChild(this.fileMeta);
    upload.appendChild(dropzone);
    this.clearButton = element("button", "order-analyzer__clear-files", t.clearFiles);
    this.clearButton.type = "button";
    this.clearButton.hidden = true;
    this.clearButton.setAttribute("data-order-clear", "");
    upload.appendChild(this.clearButton);
    this.root.appendChild(upload);
    this.status = element("p", "order-analyzer__status", "");
    this.status.setAttribute("data-order-status", "");
    this.status.setAttribute("aria-live", "polite");
    this.root.appendChild(this.status);
    this.fileList = element("section", "order-analyzer__file-list");
    this.fileList.hidden = true;
    this.fileList.setAttribute("data-order-file-list", "");
    this.root.appendChild(this.fileList);

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
    this.inquiryLink = element("a", "order-analyzer__inquiry calculator-inquiry-cta", ORDER_INQUIRY_LABELS[this.lang] || ORDER_INQUIRY_LABELS.en);
    this.inquiryLink.href = this.lang === "zh" ? "/inquiry/" : "/" + this.lang + "/inquiry/";
    this.inquiryLink.setAttribute("data-order-inquiry", "");
    actions.appendChild(this.inquiryLink);
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
    this.fileInput.addEventListener("change", function () {
      if (self.busy) { self.fileInput.value = ""; return; }
      if (self.fileInput.files.length) self.parseFiles(Array.from(self.fileInput.files), "picker");
    });
    var dropzone = this.root.querySelector("[data-order-dropzone]");
    ["dragenter", "dragover"].forEach(function (name) {
      dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        if (!self.busy) dropzone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (name) {
      dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.remove("is-dragging"); });
    });
    dropzone.addEventListener("drop", function (event) {
      if (self.busy) return;
      if (event.dataTransfer.files.length) self.parseFiles(Array.from(event.dataTransfer.files), "drop");
    });
    this.clearButton.addEventListener("click", function () { self.clearSelection(); });
    this.sheetSelect.addEventListener("change", function () { self.selectSheet(self.sheetSelect.value); });
    this.applyButton.addEventListener("click", function () { self.applyMapping(); });
    this.mappingGrid.addEventListener("change", function (event) {
      if (!event.target.matches("select[data-order-column]") || !event.target.value) return;
      self.mappingGrid.querySelectorAll("select[data-order-column]").forEach(function (select) {
        if (select !== event.target && select.value === event.target.value) select.value = "";
      });
    });
    this.exportButton.addEventListener("click", function () { self.exportReport(); });
    this.inquiryLink.addEventListener("click", function (event) {
      if (!self.payload) { event.preventDefault(); return; }
      self.storeInquiryResult();
    });
  };

  Analyzer.prototype.setStatus = function (text, error) {
    this.status.textContent = text || "";
    this.status.classList.toggle("is-error", Boolean(error));
    this.status.dataset.state = error ? "error" : (text ? "success" : "");
  };

  Analyzer.prototype.setBusy = function (busy) {
    this.busy = Boolean(busy);
    this.root.setAttribute("aria-busy", busy ? "true" : "false");
    this.fileInput.disabled = Boolean(busy);
    this.clearButton.disabled = Boolean(busy);
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

  Analyzer.prototype.messageForError = function (error) {
    var message = errorText(error).toLowerCase();
    if (message.indexOf("worker_timeout") !== -1) return this.copy.workerTimeout;
    if (message.indexOf("fallback_file_too_large") !== -1) {
      return replaceVars(this.copy.fallbackTooLarge, { mb: Math.floor(MAIN_THREAD_FALLBACK_MAX_BYTES / 1024 / 1024) });
    }
    if (workerInfrastructureFailed(error) || message.indexOf("reader_unavailable") !== -1) return this.copy.readerUnavailable;
    if (message.indexOf("unsupported_file") !== -1) return this.copy.unsupported;
    if (message.indexOf("file_too_large") !== -1) return this.copy.fileTooLarge;
    return this.copy.parseError;
  };

  Analyzer.prototype.resetAnalysis = function () {
    // Infrastructure fallback is scoped to one selection. A later upload must
    // retry the Worker in case a transient load/network failure has recovered.
    this.preferFallback = false;
    this.fileInput.value = "";
    this.fileMeta.textContent = "";
    this.setStatus("", false);
    this.clearButton.hidden = true;
    this.currentFile = null;
    this.currentFiles = [];
    this.fileEntries = [];
    this.fileResults = [];
    this.activeFileIndex = 0;
    this.mappingFileIndex = -1;
    this.isBatchMode = false;
    this.payload = null;
    this.exportCache = null;
    this.deliveryBlocked = "";
    this.mappingDetails.hidden = true;
    this.mappingDetails.open = false;
    this.results.hidden = true;
    this.exportButton.disabled = true;
    this.fileList.hidden = true;
    this.fileList.innerHTML = "";
    this.mappingGrid.innerHTML = "";
    this.headerMeta.textContent = "";
    this.sheetSelect.innerHTML = "";
    this.metrics.innerHTML = "";
    this.warningList.innerHTML = "";
    this.containerVisual.innerHTML = "";
    this.tableWrap.innerHTML = "";
    qa.lastResult = null;
    qa.combinedResult = null;
    qa.fileResults = [];
    qa.fileFailures = [];
    qa.exportPageCount = 0;
    qa.lastError = "";
  };

  Analyzer.prototype.clearSelection = function () {
    if (this.busy) return;
    var fileCount = this.currentFiles.length;
    this.resetAnalysis();
    trackEvent("order_files_cleared", { file_count: fileCount });
    this.fileInput.focus();
  };

  Analyzer.prototype.parseOneFile = async function (file) {
    this.currentFile = file;
    qa.lastFile = { name: file.name, size: file.size };
    var canUseMainThread = file.size <= MAIN_THREAD_FALLBACK_MAX_BYTES;
    if (this.preferFallback || typeof Worker === "undefined") {
      if (!canUseMainThread) throw new Error("fallback_file_too_large");
      try {
        var fallbackOnlyBuffer = await file.arrayBuffer();
        var fallbackOnlySession = await this.ensureFallback();
        return fallbackOnlySession.parse(fallbackOnlyBuffer, window.XLSX, file.name);
      } catch (fallbackOnlyError) {
        if (workerInfrastructureFailed(fallbackOnlyError)) throw new Error("reader_unavailable:" + errorText(fallbackOnlyError));
        throw fallbackOnlyError;
      }
    }
    if (typeof Worker !== "undefined") {
      var buffer = await file.arrayBuffer();
      // Workbooks are intentionally parsed one at a time. The ArrayBuffer is
      // transferred to the Worker and is not retained on the main thread.
      // Keep a second buffer only below the conservative main-thread limit, so
      // an importScripts/vendor failure can be recovered exactly once.
      var fallbackBuffer = canUseMainThread ? buffer.slice(0) : null;
      if (!this.worker && this.workerFailed) this.workerFailed = false;
      try {
        if (!this.ensureWorker()) throw new Error("worker_unavailable");
        return await this.workerRequest("parse", { buffer: buffer, fileName: file.name }, [buffer]);
      } catch (workerError) {
        // Timeouts and workbook parse errors are deliberately not retried on
        // the main thread: doing so can freeze the exact browser that timed out.
        if (!workerInfrastructureFailed(workerError)) throw workerError;
        this.preferFallback = true;
        this.workerFailed = true;
        if (this.worker) this.worker.terminate();
        this.worker = null;
        if (!fallbackBuffer) throw new Error("fallback_file_too_large");
        try {
          var recoveredSession = await this.ensureFallback();
          return recoveredSession.parse(fallbackBuffer, window.XLSX, file.name);
        } catch (fallbackError) {
          if (workerInfrastructureFailed(fallbackError)) throw new Error("reader_unavailable:" + errorText(fallbackError));
          throw fallbackError;
        }
      }
    }
    throw new Error("worker_unavailable");
  };

  Analyzer.prototype.combinePayloads = function (payloads) {
    if (payloads.length === 1) return payloads[0];
    var amountTotals = {};
    var uniqueProducts = {};
    var warningSet = {};
    var warningCounts = {};
    var pending = {};
    var assumptions = {};
    var metrics = { productRows: 0, uniqueProducts: null, quantity: null, cartons: null, volume: null, weight: null, amounts: [] };
    var complete = { quantity: true, cartons: true, volume: true, weight: true, amounts: true };
    var skippedSummaryRows = 0;
    var negativeValuesSkipped = 0;
    var subtotalMismatchCount = 0;
    payloads.forEach(function (payload) {
      var result = payload.result || {};
      var sourceMetrics = result.metrics || {};
      metrics.productRows += Number(sourceMetrics.productRows) || 0;
      ["quantity", "cartons", "volume", "weight"].forEach(function (key) {
        if (sourceMetrics[key] == null || !Number.isFinite(Number(sourceMetrics[key]))) {
          complete[key] = false;
          return;
        }
        metrics[key] = (metrics[key] == null ? 0 : metrics[key]) + Number(sourceMetrics[key]);
      });
      if (!Array.isArray(sourceMetrics.amounts) || !sourceMetrics.amounts.length) complete.amounts = false;
      (sourceMetrics.amounts || []).forEach(function (group) {
        var key = group.currency || "UNKNOWN";
        amountTotals[key] = (amountTotals[key] || 0) + Number(group.value || 0);
      });
      (result.items || []).forEach(function (item) {
        var key = normalizeProductKey(item.sku || item.product || "");
        if (key) uniqueProducts[key] = true;
      });
      (result.warnings || []).forEach(function (code) { warningSet[code] = true; });
      Object.keys(result.warningCounts || {}).forEach(function (code) { warningCounts[code] = (warningCounts[code] || 0) + Number(result.warningCounts[code] || 0); });
      Object.keys(result.pending || {}).forEach(function (key) { pending[key] = Boolean(pending[key] || result.pending[key]); });
      Object.keys(result.assumptions || {}).forEach(function (key) { assumptions[key] = Boolean(assumptions[key] || result.assumptions[key]); });
      skippedSummaryRows += Number(result.skippedSummaryRows) || 0;
      negativeValuesSkipped += Number(result.negativeValuesSkipped) || 0;
      subtotalMismatchCount += Number(result.subtotalMismatchCount) || 0;
    });
    ["quantity", "cartons", "volume", "weight"].forEach(function (key) {
      if (!complete[key]) metrics[key] = null;
    });
    metrics.uniqueProducts = Object.keys(uniqueProducts).length || null;
    metrics.amounts = complete.amounts ? Object.keys(amountTotals).sort().map(function (currency) {
      return { currency: currency === "UNKNOWN" ? null : currency, value: amountTotals[currency] };
    }) : [];
    return {
      version: VERSION,
      isBatch: true,
      fileName: replaceVars(this.copy.combinedFile, { total: payloads.length }),
      sheetName: "—",
      sheetNames: [],
      headerRow: "—",
      headers: [],
      mapping: {},
      overrides: {
        weightUnit: "kg", volumeUnit: "m3", dimensionUnit: "cm", currency: metrics.amounts.length === 1 ? (metrics.amounts[0].currency || "CNY") : "CNY",
        mappingConfirmed: payloads.every(function (payload) { return payload.overrides && payload.overrides.mappingConfirmed === true; })
      },
      files: payloads,
      result: {
        metrics: metrics,
        pending: pending,
        assumptions: assumptions,
        warnings: Object.keys(warningSet),
        warningCounts: warningCounts,
        skippedSummaryRows: skippedSummaryRows,
        negativeValuesSkipped: negativeValuesSkipped,
        subtotalMismatchCount: subtotalMismatchCount,
        items: []
      }
    };
  };

  Analyzer.prototype.renderFileList = function () {
    var self = this;
    if (!this.fileEntries.length) { this.fileList.hidden = true; this.fileList.innerHTML = ""; return; }
    this.fileList.hidden = false;
    this.fileList.innerHTML = "";
    this.fileList.appendChild(element("h3", "", this.copy.fileCollection));
    var grid = element("div", "order-analyzer__file-grid");
    this.fileEntries.forEach(function (entry, index) {
      var isActive = entry.resultIndex === self.activeFileIndex && Boolean(entry.payload);
      var button = element("button", "order-analyzer__file-item" + (isActive ? " is-active" : "") + (entry.errorMessage ? " is-error" : ""));
      button.type = "button";
      button.setAttribute("data-order-file-item", "");
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.disabled = !entry.payload;
      button.appendChild(element("strong", "", entry.file.name));
      if (entry.errorMessage) button.appendChild(element("span", "", replaceVars(self.copy.fileFailed, { reason: entry.errorMessage })));
      else if (!entry.payload) button.appendChild(element("span", "", self.copy.parsing));
      else {
        var metrics = entry.payload.result.metrics;
        button.appendChild(element("span", "", self.copy.fileReady + " · " + self.copy.productRows + " " + self.formatNumber(metrics.productRows, 0) + " · " + self.copy.quantity + " " + self.formatNumber(metrics.quantity, 2)));
      }
      button.addEventListener("click", function () {
        if (!entry.payload) return;
        self.activeFileIndex = entry.resultIndex;
        self.renderFileList();
        self.renderTable(entry.payload.result.items, entry.payload.fileName);
        if (self.isBatchMode && self.payloadNeedsConfirmation(entry.payload)) self.showBatchMapping(entry.resultIndex);
      });
      grid.appendChild(button);
    });
    this.fileList.appendChild(grid);
  };

  Analyzer.prototype.entryForResultIndex = function (resultIndex) {
    return this.fileEntries.find(function (entry) { return entry.resultIndex === resultIndex; }) || null;
  };

  Analyzer.prototype.parseFile = function (file) {
    return this.parseFiles(file ? [file] : [], "api");
  };

  Analyzer.prototype.parseFiles = async function (files, selectionMethod) {
    if (this.busy) return null;
    var startedAt = Date.now();
    files = Array.from(files || []);
    trackEvent("order_file_selected", {
      method: selectionMethod || "api",
      file_count: files.length
    });
    this.resetAnalysis();
    if (!files.length) {
      trackEvent("order_parse_error", { error_code: "no_files", file_count: 0, duration_ms: elapsedMilliseconds(startedAt) });
      this.setStatus(this.copy.unsupported, true);
      return null;
    }
    this.currentFiles = files.slice();
    this.fileMeta.textContent = (files.length === 1 ? this.copy.selectedFile : this.copy.selectedFiles) + ": " + (files.length === 1 ? files[0].name + " · " + (files[0].size / 1024 / 1024).toFixed(2) + " MB" : files.length);
    this.clearButton.hidden = false;
    if (files.length > MAX_FILES) {
      qa.lastError = "too_many_files:" + MAX_FILES;
      this.deliveryBlocked = this.copy.tooManyFiles;
      trackEvent("order_parse_error", { error_code: "too_many_files", file_count: files.length, duration_ms: elapsedMilliseconds(startedAt) });
      this.setStatus(this.copy.tooManyFiles, true);
      return null;
    }
    this.fileEntries = files.map(function (file) { return { file: file, payload: null, resultIndex: -1, errorCode: "", errorMessage: "" }; });
    qa.fileFailures = [];
    for (var validationIndex = 0; validationIndex < files.length; validationIndex += 1) {
      var validationFile = files[validationIndex];
      var extension = fileExtension(validationFile.name);
      var validationError = "";
      if (["xlsx", "xls", "xlsm", "csv"].indexOf(extension) === -1) {
        validationError = "unsupported_file";
      } else if (validationFile.size > MAX_FILE_BYTES) {
        validationError = "file_too_large";
      }
      if (validationError) {
        var validationMessage = this.messageForError(new Error(validationError));
        this.fileEntries[validationIndex].errorCode = validationError;
        this.fileEntries[validationIndex].errorMessage = validationMessage;
        qa.fileFailures.push({ index: validationIndex, code: validationError });
        qa.lastError = validationError + ":" + validationFile.name;
        trackEvent("order_parse_error", { error_code: validationError, file_count: files.length, duration_ms: elapsedMilliseconds(startedAt) });
      }
    }
    this.renderFileList();
    this.setBusy(true);
    qa.fileResults = [];
    qa.queueActive = 0;
    qa.queueMaxConcurrent = 0;
    try {
      for (var index = 0; index < files.length; index += 1) {
        if (this.fileEntries[index].errorCode) continue;
        this.setStatus(replaceVars(this.copy.parsingBatch, { current: index + 1, total: files.length }), false);
        qa.queueActive = 1;
        qa.queueMaxConcurrent = Math.max(qa.queueMaxConcurrent, qa.queueActive);
        try {
          var payload = await this.parseOneFile(files[index]);
          this.fileEntries[index].payload = payload;
          this.fileEntries[index].resultIndex = this.fileResults.length;
          this.fileResults.push(payload);
          qa.fileResults = this.fileResults.slice();
        } catch (fileError) {
          var fileErrorText = errorText(fileError);
          var fileErrorCode = safeErrorCode(fileErrorText, "parse_failed");
          var localizedError = this.messageForError(fileError);
          this.fileEntries[index].errorCode = fileErrorCode;
          this.fileEntries[index].errorMessage = localizedError;
          qa.fileFailures.push({ index: index, code: fileErrorCode });
          qa.lastError = fileErrorText;
          trackEvent("order_parse_error", {
            error_code: fileErrorCode,
            file_count: files.length,
            successful_files: this.fileResults.length,
            duration_ms: elapsedMilliseconds(startedAt)
          });
        }
        qa.queueActive = 0;
        this.renderFileList();
        // Yield between files so progress remains responsive on mobile.
        await new Promise(function (resolve) { window.setTimeout(resolve, 0); });
      }
      if (!this.fileResults.length) {
        this.deliveryBlocked = files.length === 1 && this.fileEntries[0].errorMessage
          ? this.fileEntries[0].errorMessage : this.copy.batchNoneReady;
        this.results.hidden = true;
        this.mappingDetails.hidden = true;
        this.setStatus(this.deliveryBlocked, true);
        return null;
      }
      this.isBatchMode = files.length > 1;
      this.activeFileIndex = 0;
      var combined = this.combinePayloads(this.fileResults);
      qa.combinedResult = combined;
      this.acceptPayload(combined);
      this.renderFileList();
      var failedCount = qa.fileFailures.length;
      this.setStatus(failedCount
        ? replaceVars(this.copy.partialReady, { success: this.fileResults.length, total: files.length, failed: failedCount })
        : this.isBatchMode
          ? (this.payloadNeedsConfirmation(combined) ? this.copy.confirmBeforeExport : replaceVars(this.copy.combinedReady, { total: files.length }))
          : this.copy.ready, false);
      trackEvent("order_parse_success", {
        file_count: files.length,
        successful_files: this.fileResults.length,
        failed_files: failedCount,
        batch: this.isBatchMode ? "yes" : "no",
        duration_ms: elapsedMilliseconds(startedAt),
        worker_mode: qa.fallbackUsed ? "fallback" : "worker"
      });
      return combined;
    } catch (error) {
      qa.queueActive = 0;
      var errorMessage = error && error.message ? error.message : String(error);
      qa.lastError = errorMessage;
      this.deliveryBlocked = this.messageForError(error);
      trackEvent("order_parse_error", {
        error_code: safeErrorCode(errorMessage, "parse_failed"),
        file_count: files.length,
        duration_ms: elapsedMilliseconds(startedAt)
      });
      this.setStatus(this.deliveryBlocked, true);
      return null;
    } finally {
      this.setBusy(false);
    }
  };

  Analyzer.prototype.selectSheet = async function (sheetName) {
    if (!this.payload || this.isBatchMode) return;
    this.setBusy(true);
    this.setStatus(this.copy.parsing, false);
    try {
      var payload;
      if (this.worker && !this.workerFailed) payload = await this.workerRequest("sheet", { sheetName: sheetName });
      else payload = this.fallbackSession.selectSheet(sheetName, window.XLSX);
      this.acceptPayload(payload);
      this.setStatus(this.copy.ready, false);
    } catch (error) {
      qa.lastError = errorText(error);
      this.setStatus(this.messageForError(error), true);
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
      if (this.isBatchMode) {
        var targetIndex = this.mappingFileIndex;
        var targetEntry = this.entryForResultIndex(targetIndex);
        if (targetIndex < 0 || !targetEntry) throw new Error("batch_mapping_target_missing");
        // Re-open only the selected workbook in the single reusable worker
        // session, then apply its confirmed column meanings. Files are still
        // processed strictly one at a time and no workbook buffer is retained.
        await this.parseOneFile(targetEntry.file);
        if (this.worker && !this.workerFailed) payload = await this.workerRequest("remap", { mapping: mapping, overrides: overrides });
        else payload = this.fallbackSession.remap(mapping, overrides);
        targetEntry.payload = payload;
        this.fileResults[targetIndex] = payload;
        qa.fileResults = this.fileResults.slice();
        var combined = this.combinePayloads(this.fileResults);
        qa.combinedResult = combined;
        this.acceptPayload(combined, true);
        this.renderFileList();
        this.setStatus(this.payloadNeedsConfirmation(combined) ? this.copy.confirmBeforeExport : replaceVars(this.copy.combinedReady, { total: this.fileResults.length }), false);
        return;
      }
      if (this.worker && !this.workerFailed) payload = await this.workerRequest("remap", { mapping: mapping, overrides: overrides });
      else payload = this.fallbackSession.remap(mapping, overrides);
      this.acceptPayload(payload, true);
      this.setStatus(this.copy.ready, false);
    } catch (error) {
      qa.lastError = errorText(error);
      this.setStatus(this.messageForError(error), true);
    } finally { this.setBusy(false); }
  };

  Analyzer.prototype.acceptPayload = function (payload, preserveMappingControls) {
    this.payload = payload;
    this.exportCache = null;
    qa.lastResult = payload;
    if (!this.isBatchMode) {
      this.fileResults = [payload];
      if (this.fileEntries[0]) this.fileEntries[0].payload = payload;
      qa.fileResults = this.fileResults.slice();
      qa.combinedResult = payload;
    }
    this.mappingDetails.hidden = this.isBatchMode;
    this.results.hidden = false;
    if (!this.isBatchMode && !preserveMappingControls) {
      this.renderSheetControl(payload);
      this.renderMapping(payload);
    }
    if (!this.isBatchMode) this.headerMeta.textContent = this.copy.headerRow + ": " + payload.headerRow;
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
    this.mappingDetails.open = !this.isBatchMode && Boolean(this.deliveryBlocked);
    this.exportButton.disabled = Boolean(this.deliveryBlocked);
    this.renderResult(payload);
    this.renderFileList();
    if (this.isBatchMode && needsConfirmation && !negativeValues && !incomplete) this.showBatchMapping();
  };

  Analyzer.prototype.payloadNeedsConfirmation = function (payload) {
    if (!payload || !payload.result) return false;
    var pending = payload.result.pending || {};
    return !payload.overrides || payload.overrides.mappingConfirmed !== true
      || Object.keys(pending).some(function (key) { return Boolean(pending[key]); });
  };

  Analyzer.prototype.showBatchMapping = function (preferredIndex) {
    if (!this.isBatchMode) return false;
    var index = Number.isInteger(preferredIndex) && this.payloadNeedsConfirmation(this.fileResults[preferredIndex])
      ? preferredIndex
      : this.fileResults.findIndex(this.payloadNeedsConfirmation.bind(this));
    if (index < 0) {
      this.mappingFileIndex = -1;
      this.mappingDetails.hidden = true;
      this.mappingDetails.open = false;
      return false;
    }
    var payload = this.fileResults[index];
    this.mappingFileIndex = index;
    this.activeFileIndex = index;
    this.mappingDetails.hidden = false;
    this.mappingDetails.open = true;
    this.renderSheetControl(payload);
    this.sheetSelect.disabled = true;
    this.headerMeta.textContent = this.copy.headerRow + ": " + payload.headerRow + " · " + payload.fileName;
    this.renderMapping(payload);
    this.renderTable(payload.result.items, payload.fileName);
    this.renderFileList();
    return true;
  };

  Analyzer.prototype.renderSheetControl = function (payload) {
    this.sheetSelect.innerHTML = "";
    this.sheetSelect.disabled = false;
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

  Analyzer.prototype.metric = function (label, value, isolateLtr) {
    var card = element("div", "order-analyzer__metric");
    card.appendChild(element("span", "", label));
    var output = element("strong", "");
    if (isolateLtr) output.appendChild(isolatedText(value));
    else output.textContent = value;
    card.appendChild(output);
    this.metrics.appendChild(card);
  };

  Analyzer.prototype.containerEstimate = function (volume, pending) {
    var t = this.copy;
    if (volume == null) return { label: t.fortyHq, capacity: CONTAINER_CAPACITY_CBM, percent: 0, count: 1, loads: [0], loadIndexes: [0], pending: false };
    var numericVolume = Number(volume);
    var value = Number.isFinite(numericVolume) ? Math.max(0, numericVolume) : 0;
    var count = Math.max(1, Math.ceil((value - CONTAINER_EPSILON_CBM) / CONTAINER_CAPACITY_CBM));
    var renderedCount = Math.min(count, MAX_CONTAINER_BARS);
    var loads = [];
    var loadIndexes = [];
    for (var index = 0; index < renderedCount; index += 1) {
      var containerIndex = count > MAX_CONTAINER_BARS && index === renderedCount - 1 ? count - 1 : index;
      var remaining = value - containerIndex * CONTAINER_CAPACITY_CBM;
      var load = remaining >= CONTAINER_CAPACITY_CBM - CONTAINER_EPSILON_CBM
        ? 100
        : remaining <= CONTAINER_EPSILON_CBM ? 0 : remaining / CONTAINER_CAPACITY_CBM * 100;
      loads.push(Math.max(0, Math.min(100, load)));
      loadIndexes.push(containerIndex);
    }
    var result;
    if (value <= 8) result = { label: t.lcl, capacity: CONTAINER_CAPACITY_CBM };
    else if (count === 1) result = { label: t.fortyHq, capacity: CONTAINER_CAPACITY_CBM };
    else result = { label: replaceVars(t.containerCount, { n: count }), capacity: count * CONTAINER_CAPACITY_CBM };
    result.count = count;
    result.loads = loads;
    result.loadIndexes = loadIndexes;
    result.loadsTruncated = count > MAX_CONTAINER_BARS;
    result.percent = loads[loads.length - 1] || 0;
    result.pending = Boolean(pending);
    result.volume = value;
    return result;
  };

  Analyzer.prototype.visibleContainerLoads = function (estimate, limit) {
    var loads = estimate && Array.isArray(estimate.loads) && estimate.loads.length ? estimate.loads : [0];
    var indexes = estimate && Array.isArray(estimate.loadIndexes) && estimate.loadIndexes.length === loads.length
      ? estimate.loadIndexes : loads.map(function (_, index) { return index; });
    var maximum = Math.max(1, Math.floor(Number(limit) || loads.length));
    var selected = loads.map(function (load, index) { return { percent: load, index: indexes[index] }; });
    if (selected.length > maximum) selected = selected.slice(0, maximum - 1).concat(selected.slice(-1));
    return selected;
  };

  Analyzer.prototype.renderContainer = function (estimate) {
    var loads = this.visibleContainerLoads(estimate, MAX_CONTAINER_BARS);
    var rowHeight = 48;
    var contentHeight = Math.max(190, 92 + loads.length * rowHeight);
    var rows = loads.map(function (entry, rowIndex) {
      var y = 52 + rowIndex * rowHeight;
      var safePct = Math.max(0, Math.min(100, entry.percent || 0));
      var fillWidth = Math.round(270 * safePct / 100);
      return [
        '<g data-container-load="' + safePct + '" data-container-index="' + entry.index + '">',
        '<text x="28" y="' + (y + 23) + '" font-size="13" font-family="ui-monospace,Consolas,monospace" fill="#475569">#' + (entry.index + 1) + '</text>',
        '<rect x="64" y="' + y + '" width="284" height="34" rx="5" fill="#f8fafc" stroke="#475569" stroke-width="3"/>',
        '<rect x="71" y="' + (y + 7) + '" width="' + fillWidth + '" height="20" rx="2" fill="#5DCAA5"/>',
        '<text x="206" y="' + (y + 24) + '" text-anchor="middle" font-size="16" font-weight="900" fill="#04342C">' + Math.round(safePct) + '%</text>',
        '</g>'
      ].join("");
    }).join("");
    this.containerVisual.innerHTML = [
      '<svg viewBox="0 0 420 ' + contentHeight + '" role="img" dir="ltr" style="direction:ltr" aria-label="' + this.copy.containerTitle.replace(/"/g, "&quot;") + ': ' + loads.map(function (entry) { return Math.round(entry.percent) + "%"; }).join(", ") + '">',
      '<text x="28" y="30" font-size="15" font-weight="800" fill="#0f172a">' + this.copy.containerTitle + '</text>',
      '<text x="392" y="30" text-anchor="end" font-size="14" font-family="ui-monospace,Consolas,monospace" fill="#475569">' + (estimate.volume == null ? "—" : this.formatNumber(estimate.volume, 3) + " m³") + '</text>',
      rows,
      '<text x="28" y="' + (contentHeight - 18) + '" font-size="16" font-weight="850" fill="#0f172a">' + estimate.label + '</text>',
      estimate.pending ? '<text x="392" y="' + (contentHeight - 18) + '" text-anchor="end" font-size="11" fill="#b45309">' + this.copy.provisional + '</text>' : "",
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
    this.metric(this.copy.amount, this.amountText(metrics.amounts), Boolean(metrics.amounts && metrics.amounts.length));
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
    var detailPayload = this.fileResults[this.activeFileIndex] || payload;
    this.renderTable(detailPayload.result.items, detailPayload.fileName);
  };

  Analyzer.prototype.inquiryProductText = function () {
    var names = [];
    var seen = {};
    (this.fileResults.length ? this.fileResults : [this.payload]).forEach(function (payload) {
      ((payload && payload.result && payload.result.items) || []).forEach(function (item) {
        var name = String(item.product || "").trim();
        var key = normalizeProductKey(name);
        if (!name || seen[key]) return;
        seen[key] = true;
        names.push(name);
      });
    });
    var value = names.slice(0, 3).join(" / ");
    if (names.length > 3) value += " +" + (names.length - 3);
    return value.slice(0, 120);
  };

  Analyzer.prototype.inquirySummary = function () {
    var payload = this.payload;
    var result = payload && payload.result;
    var metrics = result && result.metrics;
    if (!metrics) return "";
    var estimate = this.containerEstimate(metrics.volume, result.pending && result.pending.volumeUnit);
    var files = (this.fileResults.length ? this.fileResults : [payload]).map(function (item) { return item && item.fileName; }).filter(Boolean);
    var fileText = files.slice(0, 5).join(", ");
    if (files.length > 5) fileText += " +" + (files.length - 5);
    return [
      this.copy.resultTitle,
      this.copy.file + ": " + (fileText || payload.fileName || this.copy.missing),
      this.copy.productRows + ": " + this.formatNumber(metrics.productRows, 0),
      this.copy.uniqueProducts + ": " + this.formatNumber(metrics.uniqueProducts, 0),
      this.copy.quantity + ": " + this.formatNumber(metrics.quantity, 2),
      this.copy.cartons + ": " + this.formatNumber(metrics.cartons, 2),
      this.copy.volume + ": " + (metrics.volume == null ? this.copy.missing : this.formatNumber(metrics.volume, 3) + " m³"),
      this.copy.weight + ": " + (metrics.weight == null ? this.copy.missing : this.formatNumber(metrics.weight, 2) + " kg"),
      this.copy.amount + ": " + this.amountText(metrics.amounts),
      this.copy.containerTitle + ": " + estimate.label
    ].join("\n");
  };

  Analyzer.prototype.storeInquiryResult = function () {
    var metrics = this.payload && this.payload.result && this.payload.result.metrics;
    if (!metrics) return false;
    var estimate = this.containerEstimate(metrics.volume, this.payload.result.pending && this.payload.result.pending.volumeUnit);
    var handoff = {
      savedAt: Date.now(),
      message: this.inquirySummary(),
      product: this.inquiryProductText(),
      quantity: metrics.quantity == null ? "" : this.formatNumber(metrics.quantity, 2),
      totalCbm: metrics.volume == null ? 0 : Number(metrics.volume),
      bufferedCbm: metrics.volume == null ? 0 : Number(metrics.volume),
      container: estimate.label
    };
    try { window.sessionStorage.setItem("jabbarCalcResult", JSON.stringify(handoff)); } catch (_) {}
    trackEvent("calculator_inquiry", { method: "excel", file_count: this.fileResults.length || 1 });
    return true;
  };

  Analyzer.prototype.renderTable = function (items, fileName) {
    var t = this.copy;
    this.tableWrap.innerHTML = "";
    var table = element("table", "order-analyzer__table");
    var caption = element("caption", "", t.detailsTitle + " · " + items.length + (fileName ? " · " + fileName : ""));
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
      values.forEach(function (value, index) {
        var cell = element("td", "");
        if ((index === 7 || index === 8) && value !== "—") cell.appendChild(isolatedText(value));
        else cell.textContent = value;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    }, this);
    table.appendChild(tbody);
    this.tableWrap.appendChild(table);
  };

  Analyzer.prototype.roundRect = function (ctx, x, y, width, height, radius, fill, stroke) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  };

  Analyzer.prototype.drawContainerLoadBars = function (ctx, x, y, width, height, estimate) {
    var maximum = Math.max(1, Math.floor(height / 24));
    var entries = this.visibleContainerLoads(estimate, maximum);
    var gap = entries.length > 1 ? 5 : 0;
    var barHeight = (height - gap * (entries.length - 1)) / entries.length;
    entries.forEach(function (entry, rowIndex) {
      var rowY = y + rowIndex * (barHeight + gap);
      var labelWidth = Math.min(52, width * 0.16);
      var boxX = x + labelWidth;
      var boxWidth = width - labelWidth;
      var safePct = Math.max(0, Math.min(100, entry.percent || 0));
      ctx.textAlign = "left";
      ctx.fillStyle = "#475569";
      ctx.font = '800 ' + Math.max(11, Math.min(16, barHeight * 0.42)) + 'px ui-monospace,"SF Mono",Consolas,monospace';
      ctx.fillText("#" + (entry.index + 1), x, rowY + barHeight * 0.68);
      this.roundRect(ctx, boxX, rowY, boxWidth, barHeight, Math.min(7, barHeight / 4), "#ffffff", "#475569");
      ctx.fillStyle = "#5dcaa5";
      ctx.fillRect(boxX + 5, rowY + 5, Math.max(0, boxWidth - 10) * safePct / 100, Math.max(0, barHeight - 10));
      ctx.textAlign = "center";
      ctx.fillStyle = "#04342c";
      ctx.font = '900 ' + Math.max(11, Math.min(20, barHeight * 0.48)) + 'px ui-monospace,"SF Mono",Consolas,monospace';
      ctx.fillText(Math.round(safePct) + "%", boxX + boxWidth / 2, rowY + barHeight * 0.69);
    }, this);
  };

  Analyzer.prototype.canvasBlob = function (canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error("canvas_blob_failed")); }, "image/png");
    });
  };

  Analyzer.prototype.fitCanvasText = function (ctx, value, maxWidth) {
    var text = String(value == null || value === "" ? "—" : value);
    if (ctx.measureText(text).width <= maxWidth) return text;
    while (text.length > 1 && ctx.measureText(text + "…").width > maxWidth) text = text.slice(0, -1);
    return text + "…";
  };

  Analyzer.prototype.drawUhdMetric = function (ctx, x, y, width, label, value) {
    this.roundRect(ctx, x, y, width, 140, 26, "#ffffff", "#d5e5f0");
    var textX = this.rtl ? x + width - 34 : x + 34;
    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillStyle = "#64748b";
    ctx.font = '800 27px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(this.fitCanvasText(ctx, label, width - 68), textX, y + 44);
    ctx.fillStyle = "#0f172a";
    ctx.font = '900 46px ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace';
    ctx.fillText(this.fitCanvasText(ctx, value, width - 68), textX, y + 105);
  };

  Analyzer.prototype.drawUhdFileCard = function (ctx, payload, index, x, y, width) {
    var metrics = payload.result.metrics;
    this.roundRect(ctx, x, y, width, 170, 25, index % 2 ? "#f7fbfe" : "#ffffff", "#d5e5f0");
    var textX = this.rtl ? x + width - 34 : x + 34;
    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillStyle = "#0f766e";
    ctx.font = '900 31px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(String(index + 1).padStart(2, "0") + "  " + this.fitCanvasText(ctx, payload.fileName, width - 150), textX, y + 48);
    ctx.fillStyle = "#475569";
    ctx.font = '750 25px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    var firstLine = this.copy.productRows + " " + this.formatNumber(metrics.productRows, 0) + "  ·  " + this.copy.uniqueProducts + " " + this.formatNumber(metrics.uniqueProducts, 0) + "  ·  " + this.copy.quantity + " " + this.formatNumber(metrics.quantity, 2);
    ctx.fillText(this.fitCanvasText(ctx, firstLine, width - 68), textX, y + 96);
    ctx.fillStyle = "#0f172a";
    ctx.font = '800 26px ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace';
    var secondLine = this.copy.weight + " " + (metrics.weight == null ? this.copy.missing : this.formatNumber(metrics.weight, 2) + " kg") + "  ·  " + this.copy.volume + " " + (metrics.volume == null ? this.copy.missing : this.formatNumber(metrics.volume, 3) + " m³") + "  ·  " + this.copy.amount + " " + this.amountText(metrics.amounts);
    ctx.fillText(this.fitCanvasText(ctx, secondLine, width - 68), textX, y + 140);
  };

  Analyzer.prototype.drawUhdReport = function () {
    var width = 3840;
    var height = 2160;
    var margin = 180;
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d", { alpha: true });
    var gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#eff8ff");
    gradient.addColorStop(0.52, "#f8fbfd");
    gradient.addColorStop(1, "#ecfdf8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    this.roundRect(ctx, 70, 70, width - 140, height - 140, 42, "rgba(255,255,255,.86)", "#cfe1ed");
    ctx.direction = this.rtl ? "rtl" : "ltr";
    ctx.textBaseline = "alphabetic";
    var startX = this.rtl ? width - margin : margin;
    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillStyle = "#0f766e";
    ctx.font = '900 34px ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace';
    ctx.fillText(this.copy.toolLabel, startX, 155);
    ctx.fillStyle = "#0f172a";
    ctx.font = '950 70px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(this.isBatchMode ? this.copy.combinedReport : this.copy.reportTitle, startX, 245);
    ctx.fillStyle = "#64748b";
    ctx.font = '700 29px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    var sourceText = (this.isBatchMode ? replaceVars(this.copy.combinedFile, { total: this.fileResults.length }) : this.copy.file + ": " + this.payload.fileName) + "  ·  " + this.copy.generated + ": " + new Date().toLocaleString(this.locale);
    ctx.fillText(this.fitCanvasText(ctx, sourceText, width - margin * 2), startX, 295);

    var metrics = this.payload.result.metrics;
    var metricValues = [
      [this.copy.productRows, this.formatNumber(metrics.productRows, 0)],
      [this.copy.uniqueProducts, this.formatNumber(metrics.uniqueProducts, 0)],
      [this.copy.quantity, this.formatNumber(metrics.quantity, 2)],
      [this.copy.cartons, this.formatNumber(metrics.cartons, 2)],
      [this.copy.volume, metrics.volume == null ? this.copy.missing : this.formatNumber(metrics.volume, 3) + " m³"],
      [this.copy.weight, metrics.weight == null ? this.copy.missing : this.formatNumber(metrics.weight, 2) + " kg"],
      [this.copy.amount, this.amountText(metrics.amounts)]
    ];
    var metricGap = 26;
    var metricWidth = (width - margin * 2 - metricGap * 3) / 4;
    metricValues.forEach(function (entry, index) {
      this.drawUhdMetric(ctx, margin + (index % 4) * (metricWidth + metricGap), 340 + Math.floor(index / 4) * 164, metricWidth, entry[0], entry[1]);
    }, this);

    var estimate = this.containerEstimate(metrics.volume, this.payload.result.pending.volumeUnit);
    var containerY = 680;
    this.roundRect(ctx, margin, containerY, width - margin * 2, 220, 28, "#f8fbff", "#d5e5f0");
    this.drawContainerLoadBars(ctx, margin + 310, containerY + 70, width - margin * 2 - 620, 88, estimate);
    ctx.fillStyle = "#0f172a";
    ctx.font = '900 34px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(this.copy.containerTitle + " · " + estimate.label + " · " + (metrics.volume == null ? "—" : this.formatNumber(metrics.volume, 3) + " / " + this.formatNumber(estimate.capacity, 0) + " m³"), width / 2, containerY + 46);

    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillStyle = "#0f172a";
    ctx.font = '950 38px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",sans-serif';
    ctx.fillText(this.copy.fileCollection + " · " + this.fileResults.length, startX, 970);
    var fileGap = 28;
    var fileWidth = (width - margin * 2 - fileGap) / 2;
    this.fileResults.slice(0, MAX_FILES).forEach(function (payload, index) {
      this.drawUhdFileCard(ctx, payload, index, margin + (index % 2) * (fileWidth + fileGap), 1010 + Math.floor(index / 2) * 186, fileWidth);
    }, this);

    ctx.fillStyle = "#475569";
    ctx.font = '800 27px ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace';
    ctx.textAlign = this.rtl ? "right" : "left";
    ctx.fillText("Jabbar Sourcing · jabbarsourcing.com", this.rtl ? width - margin : margin, height - 105);
    ctx.textAlign = this.rtl ? "left" : "right";
    ctx.fillText("3840 × 2160 · LOSSLESS PNG", this.rtl ? margin : width - margin, height - 105);
    return canvas;
  };

  Analyzer.prototype.prepareExport = async function () {
    if (this.exportCache) return this.exportCache;
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (_) {} }
    var canvas = this.drawUhdReport();
    var blob = await this.canvasBlob(canvas);
    var base = this.isBatchMode ? "Jabbar-Sourcing-combined-order-report" : safeFileName(this.payload.fileName) + "-Jabbar-Sourcing-order-report";
    var files = [new File([blob], base + ".png", { type: "image/png", lastModified: Date.now() })];
    qa.exportDimensions = { width: canvas.width, height: canvas.height };
    canvas.width = 1;
    canvas.height = 1;
    this.exportCache = files;
    qa.exportPageCount = 1;
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
    var startedAt = Date.now();
    this.exportButton.disabled = true;
    this.setStatus(this.copy.exportPreparing, false);
    try {
      var files = await this.prepareExport();
      this.downloadFiles(files);
      this.setStatus(this.copy.exportDone, false);
      trackEvent("order_export_png", {
        page_count: files.length,
        batch: this.isBatchMode ? "yes" : "no",
        duration_ms: elapsedMilliseconds(startedAt)
      });
      return files;
    } catch (error) {
      qa.lastError = error && error.message ? error.message : String(error);
      trackEvent("order_export_error", {
        error_code: safeErrorCode(qa.lastError, "export_failed"),
        duration_ms: elapsedMilliseconds(startedAt)
      });
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
  qa.mainThreadFallbackMaxBytes = MAIN_THREAD_FALLBACK_MAX_BYTES;
  qa.maxFiles = MAX_FILES;
  qa.workerUsed = false;
  qa.fallbackUsed = false;
  qa.vendorRequested = false;
  qa.fileFailures = qa.fileFailures || [];
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
