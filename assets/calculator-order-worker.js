/*
 * Jabbar Sourcing order workbook parser.
 * Runs as a Web Worker in production and exposes the same core on window for
 * the no-Worker fallback used by older browsers.
 */
(function (scope) {
  "use strict";

  var VERSION = "order-20260719b";
  var MAX_ROWS = 10000;
  var MAX_COLUMNS = 100;
  var XLSX_URL = "/assets/vendor/xlsx.full.min.js?v=0.20.3";
  var isWorker = typeof WorkerGlobalScope !== "undefined" && scope instanceof WorkerGlobalScope;

  var FIELD_DEFINITIONS = [
    { key: "totalWeight", words: ["总重量", "总重", "total weight", "gross weight total", "peso total", "poids total", "peso total", "общий вес", "итоговый вес", "gesamtgewicht", "peso totale", "toplam ağırlık", "الوزن الإجمالي"] },
    { key: "totalVolume", words: ["总体积", "总体積", "total volume", "volume total", "volumen total", "volume total", "volume total", "общий объем", "общий объём", "gesamtvolumen", "volume totale", "toplam hacim", "الحجم الإجمالي"] },
    { key: "unitWeight", words: ["单件重量", "单重", "每件重量", "单位重量", "重量", "unit weight", "weight per unit", "weight", "peso unitario", "peso", "poids unitaire", "poids", "peso unitário", "вес единицы", "вес", "stückgewicht", "gewicht", "peso unitario", "peso", "birim ağırlık", "ağırlık", "وزن الوحدة", "الوزن"] },
    { key: "unitVolume", words: ["单件体积", "单体积", "每件体积", "单位体积", "体积", "體積", "unit volume", "volume per unit", "volume", "volumen unitario", "volumen", "volume unitaire", "volume", "volume unitário", "объем единицы", "объём единицы", "объем", "объём", "stückvolumen", "volumen", "volume unitario", "volume", "birim hacim", "hacim", "حجم الوحدة", "الحجم"] },
    { key: "unitPrice", words: ["单价", "单位价格", "unit price", "price per unit", "price", "precio unitario", "precio", "prix unitaire", "prix", "preço unitário", "preço", "цена за единицу", "цена", "einzelpreis", "preis", "prezzo unitario", "prezzo", "birim fiyat", "fiyat", "سعر الوحدة", "السعر"] },
    { key: "amount", words: ["小计", "金额", "合计金额", "总价", "line total", "subtotal", "amount", "total price", "importe", "subtotal", "montant", "sous total", "valor", "subtotal", "сумма", "итого", "gesamtbetrag", "zwischensumme", "importo", "subtotale", "ara toplam", "tutar", "المجموع الفرعي", "المبلغ"] },
    { key: "cartons", words: ["箱数", "纸箱数", "件箱", "cartons", "carton count", "boxes", "number of cartons", "cajas", "cartones", "nombre de cartons", "colis", "caixas", "коробки", "коробов", "kartons", "kartonanzahl", "cartoni", "koli", "koli sayısı", "كراتين", "عدد الكراتين"] },
    { key: "qty", words: ["数量", "採購數量", "采购数量", "订购数量", "件数", "qty", "quantity", "units", "cantidad", "quantité", "quantidade", "количество", "menge", "quantità", "adet", "miktar", "الكمية", "عدد"] },
    { key: "product", words: ["商品名称", "产品名称", "商品", "产品", "品名", "货品", "物品", "product name", "product", "item name", "item", "goods", "nombre del producto", "producto", "artículo", "article", "nom du produit", "produit", "article", "nome do produto", "produto", "наименование товара", "наименование", "товар", "продукт", "produktname", "produkt", "artikel", "nome prodotto", "prodotto", "articolo", "ürün adı", "ürün", "malzeme", "اسم المنتج", "المنتج", "الصنف"] },
    { key: "sku", words: ["sku", "货号", "貨號", "款号", "商品编号", "商品编码", "编号", "产品编码", "product code", "item code", "article no", "reference", "referencia", "référence", "código", "артикул", "номер товара", "artikelnummer", "codice articolo", "ürün kodu", "رمز المنتج"] },
    { key: "length", words: ["箱长", "长", "长度", "length", "largo", "longueur", "comprimento", "длина", "länge", "lunghezza", "uzunluk", "الطول"] },
    { key: "width", words: ["箱宽", "宽", "宽度", "width", "ancho", "largeur", "largura", "ширина", "breite", "larghezza", "genişlik", "العرض"] },
    { key: "height", words: ["箱高", "高", "高度", "height", "alto", "hauteur", "altura", "высота", "höhe", "altezza", "yükseklik", "الارتفاع"] },
    { key: "currency", words: ["币种", "货币", "currency", "moneda", "devise", "moeda", "валюта", "währung", "valuta", "para birimi", "العملة"] },
    { key: "weightUnit", words: ["重量单位", "weight unit", "unidad de peso", "unité de poids", "unidade de peso", "единица веса", "gewichtseinheit", "unità di peso", "ağırlık birimi", "وحدة الوزن"] },
    { key: "volumeUnit", words: ["体积单位", "volume unit", "unidad de volumen", "unité de volume", "unidade de volume", "единица объема", "volumeneinheit", "unità di volume", "hacim birimi", "وحدة الحجم"] },
    { key: "dimensionUnit", words: ["尺寸单位", "dimension unit", "unidad de medida", "unité de mesure", "unidade de medida", "единица размера", "maßeinheit", "unità di misura", "ölçü birimi", "وحدة القياس"] },
    { key: "image", words: ["图片", "照片", "图", "image", "photo", "picture", "imagen", "foto", "image", "photo", "imagem", "foto", "изображение", "фото", "bild", "foto", "immagine", "görsel", "fotoğraf", "صورة"] }
  ];

  var SUMMARY_WORDS = /^(?:(?:订单|訂單|order)\s*)?(?:合计|合計|总计|總計|小计|小計|總和|总和|汇总|彙總|summary|grand\s+total|total(?:\s+(?:g[eé]n[eé]ral|geral|global))?|subtotal|sum|suma\s+total|gesamt(?:\s*summe)?|summe|totale(?:\s+(?:complessivo|generale))?|итого|итог|общи[ий]\s+итог|всего|المجموع(?:\s+الكلي)?|الإجمالي(?:\s+الكلي)?|genel\s+toplam|toplam)(?:\s*(?:数量|數量|金额|金額|重量|体积|體積|箱数|箱數|quantity|amount|weight|volume|cartons?))?(?:\s*(?:共|共计|共計|total)?\s*[0-9.,，]+\s*(?:款|项|項|种|種|件|行|products?|items?|rows?)?)?$/i;
  var EXPLICIT_UNIT_WEIGHT_HEADERS = [
    "单件重量", "单重", "每件重量", "单位重量", "unit weight", "weight per unit",
    "peso unitario", "poids unitaire", "peso unitário", "вес единицы", "stückgewicht",
    "birim ağırlık", "وزن الوحدة"
  ];
  var EXPLICIT_UNIT_VOLUME_HEADERS = [
    "单件体积", "单体积", "每件体积", "单位体积", "unit volume", "volume per unit",
    "volumen unitario", "volume unitaire", "volume unitário", "объем единицы", "объём единицы",
    "stückvolumen", "volume unitario", "birim hacim", "حجم الوحدة"
  ];
  var BARCODE_HEADER_WORDS = [
    "商品条码", "商品條碼", "商品条形码", "商品條形碼", "条码", "條碼", "条形码", "條形碼",
    "barcode", "bar code", "product barcode", "codigo de barras", "código de barras", "code barres",
    "code-barres", "código de barras", "штрихкод", "штрих код", "strichcode", "strich code",
    "codice a barre", "barkod", "باركود", "الرمز الشريطي"
  ];
  var IMAGE_HEADER_WORDS = [
    "商品图片", "商品圖片", "产品图片", "產品圖片", "商品图", "商品圖", "产品图", "產品圖", "图片", "圖片", "照片",
    "product image", "product photo", "item image", "item photo", "image", "photo", "picture",
    "imagen", "foto", "image produit", "photo produit", "imagem", "фото", "изображение", "produktbild",
    "bild", "immagine", "görsel", "fotoğraf", "صورة"
  ];

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize ? String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s\u00a0_\-–—:：/\\|()[\]{}（）]+/g, " ").replace(/\s+/g, " ").trim() : String(value == null ? "" : value).toLowerCase().trim();
  }

  function normalizeProductKey(value) {
    var text = String(value == null ? "" : value);
    if (text.normalize) text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return text.toLowerCase()
      .replace(/[\s\u00a0_\-–—:：/\\|()[\]{}（）.,，。;；'"“”‘’!?！？@#$%^&*+=~`<>《》]+/g, "")
      .trim();
  }

  function isSummaryValue(value) {
    var text = normalize(value);
    return Boolean(text && SUMMARY_WORDS.test(text));
  }

  function hasExplicitUnitMeaning(value, kind) {
    var text = normalize(value);
    var phrases = kind === "weight" ? EXPLICIT_UNIT_WEIGHT_HEADERS : EXPLICIT_UNIT_VOLUME_HEADERS;
    return Boolean(text && phrases.some(function (phrase) { return text.indexOf(normalize(phrase)) !== -1; }));
  }

  function columnName(index) {
    var name = "";
    for (var n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    return name;
  }

  function matchHeaderDetail(value) {
    var text = normalize(value);
    if (!text) return null;
    // Image columns are display-only data. Resolve them before generic product
    // words so Product Image / 商品图片 never becomes the product-name column.
    if (IMAGE_HEADER_WORDS.some(function (word) { return text.indexOf(normalize(word)) !== -1; })) return { key: "image", score: 2500 };
    // Barcode columns are identifiers, never product names. Check them before
    // generic words such as 商品 / product so compound headers like 商品条码
    // and Product Barcode cannot be captured by the product-name mapping.
    if (BARCODE_HEADER_WORDS.some(function (word) { return text.indexOf(normalize(word)) !== -1; })
      || /(^|\s)(?:ean(?:8|13)?|upc(?:a|e)?|gtin(?:8|12|13|14)?)(?:\s|$)/.test(text)) return { key: "sku", score: 2500 };
    var best = null;
    FIELD_DEFINITIONS.forEach(function (definition) {
      definition.words.forEach(function (word) {
        var normalizedWord = normalize(word);
        var exact = text === normalizedWord;
        var partial = !exact && (normalizedWord.length >= 3 || (/[\u3400-\u9fff]/.test(normalizedWord) && normalizedWord.length >= 2)) && text.indexOf(normalizedWord) !== -1;
        if (!exact && !partial) return;
        var score = (exact ? 3000 : 1000) + normalizedWord.length;
        if (!best || score > best.score) best = { key: definition.key, score: score };
      });
    });
    return best;
  }

  function matchHeader(value) {
    var match = matchHeaderDetail(value);
    return match ? match.key : null;
  }

  function isBlank(value) {
    return value == null || String(value).trim() === "";
  }

  function numericDetails(value) {
    if (typeof value === "number") return { value: Number.isFinite(value) ? value : null, ambiguous: false };
    if (value == null) return { value: null, ambiguous: false };
    var original = String(value).trim();
    if (!original || /^[-—–/]$/.test(original)) return { value: null, ambiguous: false };

    var parenthesizedNegative = /^\(.*\)$/.test(original);
    var compact = original
      .replace(/[，]/g, ",")
      .replace(/[。]/g, ".")
      .replace(/[−—–]/g, "-")
      .replace(/[()]/g, "")
      .replace(/[\s\u00a0\u202f]/g, "");
    // Extract the numeric token instead of retaining arbitrary E/e letters.
    // This keeps scientific notation (1E+3) while EUR 30 no longer becomes E30.
    var match = compact.match(/[+-]?(?:\d[\d.,]*|[.,]\d+)(?:[eE][+-]?\d+)?/);
    if (!match) return { value: null, ambiguous: false };
    var token = match[0].replace(/[.,]+$/, "");
    if (!token) return { value: null, ambiguous: false };

    var exponentMatch = token.match(/([eE][+-]?\d+)$/);
    var exponent = exponentMatch ? exponentMatch[1] : "";
    var mantissa = exponent ? token.slice(0, -exponent.length) : token;
    var sign = "";
    if (/^[+-]/.test(mantissa)) {
      sign = mantissa.charAt(0);
      mantissa = mantissa.slice(1);
    }
    var commaCount = (mantissa.match(/,/g) || []).length;
    var dotCount = (mantissa.match(/\./g) || []).length;
    var ambiguous = false;
    var normalizedMantissa = mantissa;

    if (commaCount && dotCount) {
      var decimalSeparator = mantissa.lastIndexOf(",") > mantissa.lastIndexOf(".") ? "," : ".";
      var groupingSeparator = decimalSeparator === "," ? "." : ",";
      normalizedMantissa = mantissa.split(groupingSeparator).join("");
      if (decimalSeparator === ",") normalizedMantissa = normalizedMantissa.replace(",", ".");
      if ((normalizedMantissa.match(/\./g) || []).length > 1) ambiguous = true;
    } else if (commaCount) {
      if (commaCount === 1) {
        var commaParts = mantissa.split(",");
        if (commaParts[1].length === 3 && /^\d{1,3}$/.test(commaParts[0])) {
          // 1,234 can mean one thousand two hundred thirty-four or 1.234.
          // Use the grouping interpretation provisionally but block export.
          normalizedMantissa = commaParts.join("");
          ambiguous = true;
        } else normalizedMantissa = commaParts[0] + "." + commaParts[1];
      } else if (/^\d{1,3}(?:,\d{3})+$/.test(mantissa)) normalizedMantissa = mantissa.replace(/,/g, "");
      else {
        var lastComma = mantissa.lastIndexOf(",");
        normalizedMantissa = mantissa.slice(0, lastComma).replace(/,/g, "") + "." + mantissa.slice(lastComma + 1);
        ambiguous = true;
      }
    } else if (dotCount === 1) {
      var dotParts = mantissa.split(".");
      if (dotParts[1].length === 3 && /^\d{1,3}$/.test(dotParts[0])) {
        // 1.234 can mean one thousand two hundred thirty-four or 1.234.
        // Use the grouping interpretation provisionally but block export.
        normalizedMantissa = dotParts.join("");
        ambiguous = true;
      }
    } else if (dotCount > 1) {
      if (/^\d{1,3}(?:\.\d{3})+$/.test(mantissa)) normalizedMantissa = mantissa.replace(/\./g, "");
      else {
        var lastDot = mantissa.lastIndexOf(".");
        normalizedMantissa = mantissa.slice(0, lastDot).replace(/\./g, "") + "." + mantissa.slice(lastDot + 1);
        ambiguous = true;
      }
    }

    if (!normalizedMantissa || normalizedMantissa === ".") return { value: null, ambiguous: ambiguous };
    var result = Number(sign + normalizedMantissa + exponent);
    if (!Number.isFinite(result)) return { value: null, ambiguous: ambiguous };
    if (parenthesizedNegative) result = -Math.abs(result);
    return { value: result, ambiguous: ambiguous };
  }

  function numeric(value) {
    return numericDetails(value).value;
  }

  function textValue(value) {
    if (isBlank(value)) return "";
    return String(value).trim();
  }

  function detectCurrency(value) {
    var text = String(value == null ? "" : value).toUpperCase();
    // Match named foreign currencies before the generic Chinese 元 suffix.
    if (/\bUSD\b|US\$|美元|美金/.test(text)) return "USD";
    if (/\bEUR\b|€|欧元|歐元/.test(text)) return "EUR";
    if (/\bGBP\b|£|英镑|英鎊/.test(text)) return "GBP";
    if (/\bRUB\b|₽|卢布|盧布/.test(text)) return "RUB";
    if (/\bTRY\b|₺|土耳其里拉/.test(text)) return "TRY";
    if (/\bAED\b|迪拉姆/.test(text)) return "AED";
    if (/\bSAR\b|沙特里亚尔|沙特里亞爾/.test(text)) return "SAR";
    if (/\bJPY\b|円|日元|日圆|日圓/.test(text)) return "JPY";
    if (/\bCAD\b|加元/.test(text)) return "CAD";
    if (/\bAUD\b|澳元/.test(text)) return "AUD";
    if (/\b(CNY|RMB)\b|人民币|人民幣|[¥￥]|元/.test(text)) return "CNY";
    if (/\$/.test(text)) return "USD";
    return null;
  }

  function detectWeightUnit(value) {
    var text = normalize(value).replace(/³/g, "3");
    if (/(^|\s)(kg|kgs|kilogram|kilograms|公斤|千克)(\s|$)/.test(text)) return "kg";
    if (/(^|\s)(lb|lbs|pound|pounds|磅)(\s|$)/.test(text)) return "lb";
    if (/(^|\s)(ton|tons|tonne|tonnes|吨|噸)(\s|$)/.test(text)) return "t";
    if (/(^|\s)(g|gram|grams|克)(\s|$)/.test(text)) return "g";
    return null;
  }

  function detectVolumeUnit(value) {
    var text = normalize(value).replace(/[³]/g, "3");
    if (/\b(cbm|m3|cubic meter|cubic metre)\b|立方米/.test(text)) return "m3";
    if (/\b(cm3|cc|cubic centimeter|cubic centimetre)\b|立方厘米/.test(text)) return "cm3";
    if (/\b(l|liter|litre|liters|litres)\b|升/.test(text)) return "l";
    if (/\b(ft3|cubic foot|cubic feet)\b/.test(text)) return "ft3";
    return null;
  }

  function detectDimensionUnit(value) {
    var text = normalize(value);
    if (/\b(mm|millimeter|millimetre)\b|毫米/.test(text)) return "mm";
    if (/\b(cm|centimeter|centimetre)\b|厘米/.test(text)) return "cm";
    if (/\b(in|inch|inches)\b|英寸/.test(text)) return "in";
    if (/\b(m|meter|metre)\b|米/.test(text)) return "m";
    return null;
  }

  function weightMultiplier(unit) {
    return unit === "g" ? 0.001 : unit === "lb" ? 0.45359237 : unit === "t" ? 1000 : 1;
  }

  function volumeMultiplier(unit) {
    return unit === "cm3" ? 0.000001 : unit === "l" ? 0.001 : unit === "ft3" ? 0.0283168466 : 1;
  }

  function dimensionMultiplier(unit) {
    return unit === "mm" ? 0.001 : unit === "cm" ? 0.01 : unit === "in" ? 0.0254 : 1;
  }

  function findHeaderRow(rows) {
    var best = { index: 0, score: -1, matches: 0 };
    var limit = Math.min(30, rows.length);
    for (var rowIndex = 0; rowIndex < limit; rowIndex += 1) {
      var seen = {};
      var nonempty = 0;
      (rows[rowIndex] || []).forEach(function (cell) {
        if (!isBlank(cell)) nonempty += 1;
        var match = matchHeader(cell);
        if (match) seen[match] = true;
      });
      var matches = Object.keys(seen).length;
      var score = matches * 10 + Math.min(nonempty, 8);
      if (matches >= 2 && score > best.score) best = { index: rowIndex, score: score, matches: matches };
      else if (best.score < 0 && nonempty > 1) best = { index: rowIndex, score: nonempty, matches: 0 };
    }
    return best.index;
  }

  function createMapping(headers) {
    var mapping = {};
    var scores = {};
    headers.forEach(function (header) {
      var match = matchHeaderDetail(header.label);
      if (!match || match.key === "image") return;
      if (mapping[match.key] == null || match.score > scores[match.key]) {
        mapping[match.key] = header.index;
        scores[match.key] = match.score;
      }
    });
    return mapping;
  }

  function worksheetContentBounds(sheet, XLSX) {
    var maxRow = -1;
    var maxColumn = -1;
    function hasContent(cell) {
      if (!cell) return false;
      if (cell.f) return true;
      var value = cell.v != null ? cell.v : cell.w;
      return !isBlank(value);
    }
    var dense = sheet && sheet["!data"];
    if (Array.isArray(dense)) {
      Object.keys(dense).forEach(function (rowKey) {
        if (!/^\d+$/.test(rowKey)) return;
        var rowIndex = Number(rowKey);
        var row = dense[rowIndex];
        if (!Array.isArray(row)) return;
        Object.keys(row).forEach(function (columnKey) {
          if (!/^\d+$/.test(columnKey) || !hasContent(row[Number(columnKey)])) return;
          maxRow = Math.max(maxRow, rowIndex);
          maxColumn = Math.max(maxColumn, Number(columnKey));
        });
      });
    } else {
      Object.keys(sheet || {}).forEach(function (address) {
        if (address.charAt(0) === "!" || !/^[A-Z]+[1-9][0-9]*$/i.test(address) || !hasContent(sheet[address])) return;
        var decoded = XLSX.utils.decode_cell(address);
        maxRow = Math.max(maxRow, decoded.r);
        maxColumn = Math.max(maxColumn, decoded.c);
      });
    }
    return { maxRow: maxRow, maxColumn: maxColumn };
  }

  function worksheetCell(sheet, XLSX, rowIndex, columnIndex) {
    var dense = sheet && sheet["!data"];
    if (Array.isArray(dense)) return dense[rowIndex] && dense[rowIndex][columnIndex];
    return sheet && sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
  }

  function buildTable(sheet, XLSX) {
    if (!sheet || !sheet["!ref"]) return { headerRow: 0, headers: [], rows: [], truncatedRows: false, truncatedColumns: false };
    var decoded = XLSX.utils.decode_range(sheet["!ref"]);
    var contentBounds = worksheetContentBounds(sheet, XLSX);
    var range = {
      s: { r: decoded.s.r, c: decoded.s.c },
      e: { r: Math.min(decoded.e.r, decoded.s.r + MAX_ROWS + 29), c: Math.min(decoded.e.c, decoded.s.c + MAX_COLUMNS - 1) }
    };
    var matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: range,
      // Preserve numeric cell types. Formatted Excel values such as 1,234 are
      // not locale-ambiguous when the underlying cell is already a number.
      // Text CSV values still pass through the locale-aware parser below.
      raw: true,
      defval: null,
      blankrows: true
    });
    if (!matrix.length) return { headerRow: 0, headers: [], rows: [], truncatedRows: false, truncatedColumns: false };
    var headerRow = findHeaderRow(matrix);
    var headerValues = matrix[headerRow] || [];
    var ignoredImageColumns = {};
    headerValues.forEach(function (value, index) {
      if (matchHeader(value) === "image") ignoredImageColumns[index] = true;
    });
    var lastColumn = 0;
    matrix.slice(headerRow).forEach(function (row) {
      row = row || [];
      for (var index = Math.min(row.length, MAX_COLUMNS) - 1; index >= 0; index -= 1) {
        if (!isBlank(row[index])) { lastColumn = Math.max(lastColumn, index); break; }
      }
    });
    var headers = [];
    for (var column = 0; column <= lastColumn; column += 1) {
      if (!ignoredImageColumns[column]) headers.push({ index: column, column: columnName(column), label: textValue(headerValues[column]) || ("Column " + columnName(column)) });
    }
    var rows = matrix.slice(headerRow + 1, headerRow + 1 + MAX_ROWS).map(function (row, rowOffset) {
      var cells = (row || []).slice(0, lastColumn + 1);
      var sheetRowIndex = range.s.r + headerRow + rowOffset + 1;
      var formulaColumns = {};
      for (var formulaColumn = 0; formulaColumn <= lastColumn; formulaColumn += 1) {
        var formulaCell = worksheetCell(sheet, XLSX, sheetRowIndex, range.s.c + formulaColumn);
        if (formulaCell && typeof formulaCell.f === "string" && formulaCell.f.trim()) formulaColumns[formulaColumn] = formulaCell.f;
      }
      Object.keys(ignoredImageColumns).forEach(function (index) { cells[Number(index)] = null; });
      return {
        sourceRow: range.s.r + headerRow + rowOffset + 2,
        cells: cells,
        formulaColumns: formulaColumns
      };
    }).filter(function (entry) {
      return entry.cells.some(function (cell) { return !isBlank(cell); });
    });
    return {
      headerRow: range.s.r + headerRow + 1,
      headers: headers,
      rows: rows,
      // Excel often keeps a historically formatted UsedRange far beyond the
      // actual data. Enforce limits against populated cells, not inflated !ref.
      truncatedRows: contentBounds.maxRow > range.s.r + headerRow + MAX_ROWS,
      truncatedColumns: contentBounds.maxColumn >= range.s.c + MAX_COLUMNS
    };
  }

  function headerFor(table, mapping, field) {
    var index = mapping[field];
    if (index == null) return "";
    var found = table.headers.find(function (header) { return header.index === Number(index); });
    return found ? found.label : "";
  }

  function valueAt(row, mapping, field) {
    var index = mapping[field];
    return index == null ? null : row[Number(index)];
  }

  function hasAnyMappedValue(row, mapping) {
    return Object.keys(mapping).some(function (field) {
      if (field === "image") return false;
      return !isBlank(valueAt(row, mapping, field));
    });
  }

  function rowCells(rowEntry) {
    return Array.isArray(rowEntry) ? rowEntry : (rowEntry && rowEntry.cells) || [];
  }

  function formulaAt(rowEntry, mapping, field) {
    if (Array.isArray(rowEntry) || !rowEntry || !rowEntry.formulaColumns) return "";
    var index = mapping[field];
    return index == null ? "" : String(rowEntry.formulaColumns[Number(index)] || "");
  }

  function isAggregateFormula(formula) {
    // Excel may wrap a total in ROUND/IFERROR while the aggregate function is
    // still the provenance signal we need. We never evaluate the formula; its
    // cached value must independently reconcile with the preceding rows.
    return /(?:^|[^a-z0-9_])(?:_xlfn\.)?(?:sum|subtotal|aggregate)\s*\(/i.test(String(formula || "").replace(/^=/, "").trim());
  }

  function hasSummaryMarker(row) {
    return row.some(function (cell) { return isSummaryValue(cell); });
  }

  function hasMappedSummaryIdentity(row, mapping) {
    var sku = valueAt(row, mapping, "sku");
    var product = valueAt(row, mapping, "product");
    if (!isBlank(sku) && isSummaryValue(sku)) return true;
    return !isBlank(product) && isSummaryValue(product) && (isBlank(sku) || isSummaryValue(sku));
  }

  function isMarkedSummaryRow(row, mapping) {
    if (hasMappedSummaryIdentity(row, mapping)) return true;
    return hasSummaryMarker(row);
  }

  function nearlyEqual(left, right) {
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    var tolerance = Math.max(0.0001, Math.abs(right) * 0.00001);
    return Math.abs(left - right) <= tolerance;
  }

  function summaryNumericFields(mapping) {
    var fields = ["qty", "cartons", "amount"];
    if (mapping.totalWeight != null) fields.push("totalWeight");
    else if (mapping.unitWeight != null) fields.push("unitWeight");
    if (mapping.totalVolume != null) fields.push("totalVolume");
    else if (mapping.unitVolume != null) fields.push("unitVolume");
    return fields.filter(function (field, index) {
      return mapping[field] != null && fields.indexOf(field) === index;
    });
  }

  function hasBlankMappedIdentity(row, mapping) {
    if (mapping.product == null && mapping.sku == null) return false;
    return isBlank(valueAt(row, mapping, "product")) && isBlank(valueAt(row, mapping, "sku"));
  }

  function numericSummaryFieldCount(row, mapping) {
    return summaryNumericFields(mapping).reduce(function (count, field) {
      var value = numeric(valueAt(row, mapping, field));
      return count + (value != null && value >= 0 ? 1 : 0);
    }, 0);
  }

  function rawColumnSum(table, mapping, field, endIndex, multiplyByQuantity, reconciledSummaryRows, startIndex) {
    var found = false;
    var sum = 0;
    startIndex = Number.isFinite(startIndex) ? startIndex : 0;
    table.rows.forEach(function (rowEntry, rowIndex) {
      if (rowIndex < startIndex || rowIndex >= endIndex) return;
      var row = rowCells(rowEntry);
      if (isMarkedSummaryRow(row, mapping)) return;
      if (reconciledSummaryRows && reconciledSummaryRows[rowIndex]) return;
      var value = numeric(valueAt(row, mapping, field));
      if (value == null || value < 0) return;
      if (multiplyByQuantity) {
        var quantity = numeric(valueAt(row, mapping, "qty"));
        if (quantity == null || quantity < 0) return;
        value *= quantity;
      }
      sum += value;
      found = true;
    });
    return found ? sum : null;
  }

  function detailRowCountBefore(table, mapping, endIndex, reconciledSummaryRows, startIndex) {
    var count = 0;
    startIndex = Number.isFinite(startIndex) ? startIndex : 0;
    table.rows.forEach(function (rowEntry, rowIndex) {
      if (rowIndex < startIndex || rowIndex >= endIndex) return;
      var row = rowCells(rowEntry);
      if (!hasAnyMappedValue(row, mapping) || isMarkedSummaryRow(row, mapping)) return;
      if (reconciledSummaryRows && reconciledSummaryRows[rowIndex]) return;
      if (numericSummaryFieldCount(row, mapping)) count += 1;
    });
    return count;
  }

  function sameSummaryValues(left, right, mapping) {
    var comparable = 0;
    var matches = 0;
    summaryNumericFields(mapping).forEach(function (field) {
      var leftValue = numeric(valueAt(left, mapping, field));
      var rightValue = numeric(valueAt(right, mapping, field));
      if (leftValue == null || rightValue == null) return;
      comparable += 1;
      if (nearlyEqual(leftValue, rightValue)) matches += 1;
    });
    return comparable >= 2 && matches === comparable;
  }

  function analyzeSummaryRows(table, mapping) {
    var reconciled = {};
    var ambiguous = {};
    var fields = summaryNumericFields(mapping);
    if (!fields.length || (mapping.product == null && mapping.sku == null)) return { reconciled: reconciled, ambiguous: ambiguous };

    var segmentStart = 0;
    var lastReconciledRow = null;
    for (var rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
      var row = rowCells(table.rows[rowIndex]);
      if (!hasAnyMappedValue(row, mapping)) continue;
      if (isMarkedSummaryRow(row, mapping)) {
        // A labelled subtotal is already safe to skip and starts a new section.
        segmentStart = rowIndex + 1;
        lastReconciledRow = row;
        continue;
      }
      var numericCount = numericSummaryFieldCount(row, mapping);
      if (!numericCount) continue;
      if (!hasBlankMappedIdentity(row, mapping) || !isBlank(valueAt(row, mapping, "unitPrice")) || numericCount < 2) continue;

      var candidateEntry = table.rows[rowIndex];
      var candidate = row;
      function reconcileAgainst(startIndex) {
        var result = {
          matches: 0,
          keyMatches: 0,
          positiveMatches: 0,
          aggregateFormulaMatches: 0,
          mismatches: 0,
          detailRows: detailRowCountBefore(table, mapping, rowIndex, reconciled, startIndex)
        };
        fields.forEach(function (field) {
          var statedTotal = numeric(valueAt(candidate, mapping, field));
          if (statedTotal == null || statedTotal < 0) return;
          var directSum = rawColumnSum(table, mapping, field, rowIndex, false, reconciled, startIndex);
          if (directSum == null) return;
          var matchesDirect = nearlyEqual(statedTotal, directSum);
          var matchesMultiplied = false;
          if (field === "unitWeight" || field === "unitVolume") {
            var multipliedSum = rawColumnSum(table, mapping, field, rowIndex, true, reconciled, startIndex);
            matchesMultiplied = multipliedSum != null && nearlyEqual(statedTotal, multipliedSum);
          }
          if (matchesDirect || matchesMultiplied) {
            result.matches += 1;
            if (field === "qty" || field === "cartons" || field === "amount") result.keyMatches += 1;
            if (statedTotal > 0) result.positiveMatches += 1;
            if (isAggregateFormula(formulaAt(candidateEntry, mapping, field))) result.aggregateFormulaMatches += 1;
          } else result.mismatches += 1;
        });
        result.formulaBackedSingleDetail = result.detailRows >= 1 && result.aggregateFormulaMatches >= 2;
        result.safe = !result.mismatches && result.matches >= 2 && result.keyMatches >= 1 && result.positiveMatches >= 1 && (result.detailRows >= 2 || result.formulaBackedSingleDetail);
        result.summaryLike = result.aggregateFormulaMatches || (result.matches >= 2 && result.keyMatches >= 1 && result.positiveMatches >= 1);
        return result;
      }
      var segmentResult = reconcileAgainst(segmentStart);
      // A final unlabelled grand total follows the last inline subtotal, so
      // the current segment can be empty. Reconcile it against all detail rows
      // as well, excluding already reconciled subtotals, to avoid counting the
      // grand total as another product row.
      var globalResult = segmentStart > 0 ? reconcileAgainst(0) : segmentResult;
      var detailRows = segmentResult.detailRows;
      var duplicateReconciledSummary = detailRows === 0 && lastReconciledRow && sameSummaryValues(candidate, lastReconciledRow, mapping);
      // A single detail row and a blank-identity continuation can contain the
      // same three values, so value reconciliation alone is ambiguous. Only
      // formula provenance can safely classify that one-detail case as total.
      if (duplicateReconciledSummary || segmentResult.safe || globalResult.safe) {
        reconciled[rowIndex] = true;
        segmentStart = rowIndex + 1;
        lastReconciledRow = candidate;
      } else if (segmentResult.summaryLike || globalResult.summaryLike) {
        // This row is summary-like but cannot be excluded without guessing
        // (for example, an exact one-detail continuation without formulas or
        // a subtotal with one mismatched field). Keep it provisional and make
        // the ambiguity block report export instead of silently double-counting.
        ambiguous[rowIndex] = true;
      }
    }
    return { reconciled: reconciled, ambiguous: ambiguous };
  }

  function findReconciledSummaryRows(table, mapping) {
    return analyzeSummaryRows(table, mapping).reconciled;
  }

  function inferLineTotalField(table, mapping, unitField, totalField, reconciledSummaryRows) {
    if (mapping[unitField] == null || mapping[totalField] != null) return false;
    var kind = unitField === "unitWeight" ? "weight" : "volume";
    if (hasExplicitUnitMeaning(headerFor(table, mapping, unitField), kind)) return false;
    for (var rowIndex = table.rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
      var row = rowCells(table.rows[rowIndex]);
      if (!isMarkedSummaryRow(row, mapping) && !(reconciledSummaryRows && reconciledSummaryRows[rowIndex])) continue;
      var statedTotal = numeric(valueAt(row, mapping, unitField));
      if (statedTotal == null) continue;
      var directSum = rawColumnSum(table, mapping, unitField, rowIndex, false, reconciledSummaryRows);
      var multipliedSum = rawColumnSum(table, mapping, unitField, rowIndex, true, reconciledSummaryRows);
      var directMatches = directSum != null && nearlyEqual(statedTotal, directSum);
      var multipliedMatches = multipliedSum != null && nearlyEqual(statedTotal, multipliedSum);
      if (directMatches && (!multipliedMatches || nearlyEqual(directSum, multipliedSum))) {
        mapping[totalField] = mapping[unitField];
        delete mapping[unitField];
        return true;
      }
    }
    return false;
  }

  function refineMapping(table, mapping) {
    var refined = Object.assign({}, mapping);
    var reconciledSummaryRows = findReconciledSummaryRows(table, refined);
    inferLineTotalField(table, refined, "unitWeight", "totalWeight", reconciledSummaryRows);
    inferLineTotalField(table, refined, "unitVolume", "totalVolume", reconciledSummaryRows);
    return refined;
  }

  function deriveAutoOverrides(table, mapping) {
    var overrides = {};
    var weightUnit = detectWeightUnit(headerFor(table, mapping, "totalWeight") || headerFor(table, mapping, "unitWeight"));
    var volumeUnit = detectVolumeUnit(headerFor(table, mapping, "totalVolume") || headerFor(table, mapping, "unitVolume"));
    var dimensionUnit = detectDimensionUnit([headerFor(table, mapping, "length"), headerFor(table, mapping, "width"), headerFor(table, mapping, "height")].join(" "));
    // CNY is the no-input default shown by the UI. An explicit currency in a
    // price/amount header is still detected automatically, without exposing a
    // customer-facing currency selector.
    var currency = detectCurrency(headerFor(table, mapping, "amount")) || detectCurrency(headerFor(table, mapping, "unitPrice")) || "CNY";
    overrides.weightUnit = weightUnit || "kg";
    overrides.volumeUnit = volumeUnit || "m3";
    overrides.dimensionUnit = dimensionUnit || "cm";
    overrides.currency = currency;
    var weightMeaningAmbiguous = mapping.unitWeight != null && !hasExplicitUnitMeaning(headerFor(table, mapping, "unitWeight"), "weight");
    var volumeMeaningAmbiguous = mapping.unitVolume != null && !hasExplicitUnitMeaning(headerFor(table, mapping, "unitVolume"), "volume");
    overrides.mappingConfirmed = !weightMeaningAmbiguous && !volumeMeaningAmbiguous;
    return overrides;
  }

  function decodeTextWorkbook(buffer) {
    if (typeof TextDecoder === "undefined") return null;
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var encoding = "utf-8";
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
    else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";
    else {
      try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\ufeff/, "");
      } catch (error) {
        encoding = "gb18030";
      }
    }
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\ufeff/, "");
    } catch (error) {
      return null;
    }
  }

  function aggregate(table, mapping, overrides) {
    overrides = overrides || {};
    var headerWeightUnit = detectWeightUnit(headerFor(table, mapping, "totalWeight") || headerFor(table, mapping, "unitWeight"));
    var headerVolumeUnit = detectVolumeUnit(headerFor(table, mapping, "totalVolume") || headerFor(table, mapping, "unitVolume"));
    var headerDimensionUnit = detectDimensionUnit([headerFor(table, mapping, "length"), headerFor(table, mapping, "width"), headerFor(table, mapping, "height")].join(" "));
    var headerCurrency = detectCurrency(headerFor(table, mapping, "amount") || headerFor(table, mapping, "unitPrice"));
    var overrideWeight = overrides.weightUnit && overrides.weightUnit !== "auto" ? overrides.weightUnit : null;
    var overrideVolume = overrides.volumeUnit && overrides.volumeUnit !== "auto" ? overrides.volumeUnit : null;
    var overrideCurrency = overrides.currency && overrides.currency !== "auto" ? overrides.currency : null;
    var overrideDimension = overrides.dimensionUnit && overrides.dimensionUnit !== "auto" ? overrides.dimensionUnit : null;
    var mappingConfirmed = overrides.mappingConfirmed === true;
    var weightMeaningAmbiguous = mapping.unitWeight != null && !hasExplicitUnitMeaning(headerFor(table, mapping, "unitWeight"), "weight");
    var volumeMeaningAmbiguous = mapping.unitVolume != null && !hasExplicitUnitMeaning(headerFor(table, mapping, "unitVolume"), "volume");
    var unique = {};
    var totals = { quantity: 0, cartons: 0, volume: 0, weight: 0, amounts: {} };
    var present = { quantity: false, cartons: false, volume: false, weight: false, amount: false };
    var pending = {
      volumeUnit: false,
      weightUnit: false,
      currency: false,
      dimensionUnit: false,
      numericFormat: false,
      summaryRows: false,
      weightMeaning: weightMeaningAmbiguous && !mappingConfirmed,
      volumeMeaning: volumeMeaningAmbiguous && !mappingConfirmed
    };
    var assumptions = {};
    var skippedSummaryRows = 0;
    var negativeValuesSkipped = 0;
    var subtotalMismatchCount = 0;
    var ambiguousNumericValues = 0;
    var items = [];
    var summaryAnalysis = analyzeSummaryRows(table, mapping);
    var reconciledSummaryRows = summaryAnalysis.reconciled;
    var ambiguousSummaryRows = summaryAnalysis.ambiguous;
    var ambiguousSummaryRowCount = Object.keys(ambiguousSummaryRows).length;
    pending.summaryRows = ambiguousSummaryRowCount > 0;

    table.rows.forEach(function (rowEntry, rowOffset) {
      var row = rowCells(rowEntry);
      var sourceRow = !Array.isArray(rowEntry) && rowEntry && Number.isFinite(rowEntry.sourceRow)
        ? rowEntry.sourceRow
        : table.headerRow + rowOffset + 1;
      if (!hasAnyMappedValue(row, mapping)) return;
      var product = textValue(valueAt(row, mapping, "product"));
      var sku = textValue(valueAt(row, mapping, "sku"));
      var numericFields = {
        quantity: numericDetails(valueAt(row, mapping, "qty")),
        cartons: numericDetails(valueAt(row, mapping, "cartons")),
        unitWeight: numericDetails(valueAt(row, mapping, "unitWeight")),
        directWeight: numericDetails(valueAt(row, mapping, "totalWeight")),
        unitVolume: numericDetails(valueAt(row, mapping, "unitVolume")),
        directVolume: numericDetails(valueAt(row, mapping, "totalVolume")),
        unitPrice: numericDetails(valueAt(row, mapping, "unitPrice")),
        directAmount: numericDetails(valueAt(row, mapping, "amount")),
        length: numericDetails(valueAt(row, mapping, "length")),
        width: numericDetails(valueAt(row, mapping, "width")),
        height: numericDetails(valueAt(row, mapping, "height"))
      };
      Object.keys(numericFields).forEach(function (key) {
        if (numericFields[key].ambiguous) ambiguousNumericValues += 1;
      });
      var quantity = numericFields.quantity.value;
      var cartons = numericFields.cartons.value;
      var unitWeight = numericFields.unitWeight.value;
      var directWeight = numericFields.directWeight.value;
      var unitVolume = numericFields.unitVolume.value;
      var directVolume = numericFields.directVolume.value;
      var unitPrice = numericFields.unitPrice.value;
      var directAmount = numericFields.directAmount.value;
      var length = numericFields.length.value;
      var width = numericFields.width.value;
      var height = numericFields.height.value;

      if (isMarkedSummaryRow(row, mapping) || reconciledSummaryRows[rowOffset] || (!product && !sku && quantity == null && cartons == null)) {
        skippedSummaryRows += 1;
        return;
      }
      if ([quantity, cartons, unitWeight, directWeight, unitVolume, directVolume, unitPrice, directAmount, length, width, height].some(function (value) {
        return value != null && value < 0;
      })) {
        negativeValuesSkipped += 1;
        return;
      }

      var rowWeightUnit = detectWeightUnit(valueAt(row, mapping, "weightUnit")) || detectWeightUnit(valueAt(row, mapping, "unitWeight")) || detectWeightUnit(valueAt(row, mapping, "totalWeight")) || headerWeightUnit || overrideWeight;
      var rowVolumeUnit = detectVolumeUnit(valueAt(row, mapping, "volumeUnit")) || detectVolumeUnit(valueAt(row, mapping, "unitVolume")) || detectVolumeUnit(valueAt(row, mapping, "totalVolume")) || headerVolumeUnit || overrideVolume;
      var rowCurrency = detectCurrency(valueAt(row, mapping, "currency")) || detectCurrency(valueAt(row, mapping, "amount")) || detectCurrency(valueAt(row, mapping, "unitPrice")) || headerCurrency || overrideCurrency || "CNY";
      var rowDimensionUnit = detectDimensionUnit(valueAt(row, mapping, "dimensionUnit")) || detectDimensionUnit([valueAt(row, mapping, "length"), valueAt(row, mapping, "width"), valueAt(row, mapping, "height")].join(" ")) || headerDimensionUnit || overrideDimension;
      var computedWeight = null;
      var computedVolume = null;
      var computedAmount = null;

      if (directWeight != null) computedWeight = directWeight * weightMultiplier(rowWeightUnit || "kg");
      else if (unitWeight != null && quantity != null) {
        computedWeight = unitWeight * quantity * weightMultiplier(rowWeightUnit || "kg");
        assumptions.unitWeightTimesQuantity = true;
      }
      if ((directWeight != null || unitWeight != null) && !rowWeightUnit) pending.weightUnit = true;

      if (directVolume != null) computedVolume = directVolume * volumeMultiplier(rowVolumeUnit || "m3");
      else if (unitVolume != null && quantity != null) {
        computedVolume = unitVolume * quantity * volumeMultiplier(rowVolumeUnit || "m3");
        assumptions.unitVolumeTimesQuantity = true;
      } else {
        if (length != null && width != null && height != null && (cartons != null || quantity != null)) {
          var multiplier = dimensionMultiplier(rowDimensionUnit || "cm");
          computedVolume = length * width * height * Math.pow(multiplier, 3) * (cartons != null ? cartons : quantity);
          assumptions.dimensionsTimesCount = true;
          if (!rowDimensionUnit) pending.dimensionUnit = true;
        }
      }
      if ((directVolume != null || unitVolume != null) && !rowVolumeUnit) pending.volumeUnit = true;

      if (directAmount != null && unitPrice != null && quantity != null) {
        var expectedAmount = unitPrice * quantity;
        var subtotalTolerance = Math.max(0.01, Math.abs(directAmount) * 0.005);
        if (Math.abs(expectedAmount - directAmount) > subtotalTolerance) subtotalMismatchCount += 1;
      }
      if (directAmount != null) computedAmount = directAmount;
      else if (unitPrice != null && quantity != null) {
        computedAmount = unitPrice * quantity;
        assumptions.unitPriceTimesQuantity = true;
      }
      if (computedAmount != null && !rowCurrency) pending.currency = true;

      if (quantity != null) { totals.quantity += quantity; present.quantity = true; }
      if (cartons != null) { totals.cartons += cartons; present.cartons = true; }
      if (computedWeight != null) { totals.weight += computedWeight; present.weight = true; }
      if (computedVolume != null) { totals.volume += computedVolume; present.volume = true; }
      if (computedAmount != null) {
        var currencyKey = rowCurrency || "UNKNOWN";
        totals.amounts[currencyKey] = (totals.amounts[currencyKey] || 0) + computedAmount;
        present.amount = true;
      }
      var uniqueKey = normalizeProductKey(sku || product);
      if (uniqueKey) unique[uniqueKey] = true;
      items.push({
        row: sourceRow,
        product: product,
        sku: sku,
        quantity: quantity,
        cartons: cartons,
        unitWeight: unitWeight,
        weight: computedWeight,
        weightUnit: rowWeightUnit || null,
        unitVolume: unitVolume,
        volume: computedVolume,
        volumeUnit: rowVolumeUnit || null,
        unitPrice: unitPrice,
        amount: computedAmount,
        currency: rowCurrency || null
      });
    });

    var amountGroups = Object.keys(totals.amounts).sort().map(function (currency) {
      return { currency: currency === "UNKNOWN" ? null : currency, value: totals.amounts[currency] };
    });
    var warnings = [];
    if (pending.weightUnit) warnings.push("weight_unit_pending");
    if (pending.volumeUnit) warnings.push("volume_unit_pending");
    if (pending.currency) warnings.push("currency_pending");
    if (pending.dimensionUnit) warnings.push("dimension_unit_pending");
    if (ambiguousNumericValues) {
      pending.numericFormat = true;
      warnings.push("numeric_format_pending");
    }
    if (ambiguousSummaryRowCount) warnings.push("summary_rows_pending");
    if (pending.weightMeaning) warnings.push("weight_meaning_pending");
    if (pending.volumeMeaning) warnings.push("volume_meaning_pending");
    if (table.truncatedRows) warnings.push("rows_truncated");
    if (table.truncatedColumns) warnings.push("columns_truncated");
    if (skippedSummaryRows) warnings.push("summary_rows_skipped");
    if (negativeValuesSkipped) warnings.push("negative_values_skipped");
    if (subtotalMismatchCount) warnings.push("subtotal_mismatch");
    if (assumptions.unitWeightTimesQuantity) warnings.push("unit_weight_multiplied");
    if (assumptions.unitVolumeTimesQuantity) warnings.push("unit_volume_multiplied");
    if (assumptions.unitPriceTimesQuantity) warnings.push("unit_price_multiplied");
    if (!items.length) warnings.push("no_product_rows");

    return {
      metrics: {
        productRows: items.length,
        uniqueProducts: Object.keys(unique).length || null,
        quantity: present.quantity ? totals.quantity : null,
        cartons: present.cartons ? totals.cartons : null,
        volume: present.volume ? totals.volume : null,
        weight: present.weight ? totals.weight : null,
        amounts: present.amount ? amountGroups : []
      },
      pending: pending,
      assumptions: assumptions,
      warnings: warnings,
      skippedSummaryRows: skippedSummaryRows,
      negativeValuesSkipped: negativeValuesSkipped,
      subtotalMismatchCount: subtotalMismatchCount,
      ambiguousNumericValues: ambiguousNumericValues,
      ambiguousSummaryRows: ambiguousSummaryRowCount,
      warningCounts: {
        summary_rows_skipped: skippedSummaryRows,
        summary_rows_pending: ambiguousSummaryRowCount,
        numeric_format_pending: ambiguousNumericValues,
        negative_values_skipped: negativeValuesSkipped,
        subtotal_mismatch: subtotalMismatchCount
      },
      items: items
    };
  }

  function publicPayload(session, mapping, overrides) {
    return {
      version: VERSION,
      fileName: session.fileName,
      sheetName: session.sheetName,
      sheetNames: session.workbook ? session.workbook.SheetNames.slice() : [],
      headerRow: session.table.headerRow,
      headers: session.table.headers,
      mapping: mapping,
      overrides: overrides || {},
      result: aggregate(session.table, mapping, overrides || {})
    };
  }

  function createSession() {
    var session = { workbook: null, table: null, sheetName: "", fileName: "", mapping: {}, overrides: {} };
    function selectSheet(sheetName, XLSX) {
      if (!session.workbook) throw new Error("workbook_not_loaded");
      var selected = sheetName && session.workbook.Sheets[sheetName] ? sheetName : session.workbook.SheetNames.find(function (name) {
        var sheet = session.workbook.Sheets[name];
        return sheet && sheet["!ref"];
      }) || session.workbook.SheetNames[0];
      session.sheetName = selected;
      session.table = buildTable(session.workbook.Sheets[selected], XLSX);
      session.mapping = refineMapping(session.table, createMapping(session.table.headers));
      session.overrides = deriveAutoOverrides(session.table, session.mapping);
      return publicPayload(session, session.mapping, session.overrides);
    }
    return {
      parse: function (buffer, XLSX, fileName, sheetName) {
        session.fileName = fileName || "order.xlsx";
        var textWorkbook = /\.(?:csv|tsv|txt)$/i.test(session.fileName) ? decodeTextWorkbook(buffer) : null;
        session.workbook = XLSX.read(textWorkbook == null ? buffer : textWorkbook, {
          type: textWorkbook == null ? "array" : "string",
          cellDates: false,
          // Retain formula provenance so a one-item workbook can distinguish
          // two cached SUM cells from an otherwise identical continuation row.
          // Cached values remain the source of all displayed calculations.
          cellFormula: true,
          cellHTML: false,
          cellStyles: false,
          bookFiles: false,
          bookVBA: false,
          dense: true
        });
        if (!session.workbook.SheetNames.length) throw new Error("workbook_has_no_sheets");
        return selectSheet(sheetName, XLSX);
      },
      selectSheet: function (sheetName, XLSX) { return selectSheet(sheetName, XLSX); },
      remap: function (mapping, overrides) {
        session.mapping = mapping || {};
        session.overrides = overrides || {};
        return publicPayload(session, session.mapping, session.overrides);
      }
    };
  }

  var core = {
    VERSION: VERSION,
    MAX_ROWS: MAX_ROWS,
    MAX_COLUMNS: MAX_COLUMNS,
    XLSX_URL: XLSX_URL,
    normalizeProductKey: normalizeProductKey,
    createSession: createSession
  };
  scope.JabbarOrderWorkerCore = core;

  if (isWorker) {
    var workerSession = createSession();
    function ensureXlsx() {
      if (scope.XLSX) return;
      scope.postMessage({ type: "progress", stage: "vendor" });
      scope.importScripts(XLSX_URL);
      if (!scope.XLSX) throw new Error("xlsx_library_unavailable");
    }
    scope.addEventListener("message", function (event) {
      var message = event.data || {};
      var id = message.id;
      try {
        ensureXlsx();
        var payload;
        if (message.type === "parse") payload = workerSession.parse(message.buffer, scope.XLSX, message.fileName, message.sheetName);
        else if (message.type === "sheet") payload = workerSession.selectSheet(message.sheetName, scope.XLSX);
        else if (message.type === "remap") payload = workerSession.remap(message.mapping, message.overrides);
        else throw new Error("unknown_worker_message");
        scope.postMessage({ id: id, type: "result", payload: payload });
      } catch (error) {
        scope.postMessage({ id: id, type: "error", error: error && error.message ? error.message : String(error) });
      }
    });
  }
})(typeof self !== "undefined" ? self : window);
