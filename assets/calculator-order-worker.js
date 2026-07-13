/*
 * Jabbar Sourcing order workbook parser.
 * Runs as a Web Worker in production and exposes the same core on window for
 * the no-Worker fallback used by older browsers.
 */
(function (scope) {
  "use strict";

  var VERSION = "order-20260713b";
  var MAX_ROWS = 3000;
  var MAX_COLUMNS = 200;
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
    { key: "sku", words: ["sku", "货号", "貨號", "款号", "编号", "产品编码", "product code", "item code", "article no", "reference", "referencia", "référence", "código", "артикул", "номер товара", "artikelnummer", "codice articolo", "ürün kodu", "رمز المنتج"] },
    { key: "length", words: ["长", "长度", "length", "largo", "longueur", "comprimento", "длина", "länge", "lunghezza", "uzunluk", "الطول"] },
    { key: "width", words: ["宽", "宽度", "width", "ancho", "largeur", "largura", "ширина", "breite", "larghezza", "genişlik", "العرض"] },
    { key: "height", words: ["高", "高度", "height", "alto", "hauteur", "altura", "высота", "höhe", "altezza", "yükseklik", "الارتفاع"] },
    { key: "currency", words: ["币种", "货币", "currency", "moneda", "devise", "moeda", "валюта", "währung", "valuta", "para birimi", "العملة"] },
    { key: "weightUnit", words: ["重量单位", "weight unit", "unidad de peso", "unité de poids", "unidade de peso", "единица веса", "gewichtseinheit", "unità di peso", "ağırlık birimi", "وحدة الوزن"] },
    { key: "volumeUnit", words: ["体积单位", "volume unit", "unidad de volumen", "unité de volume", "unidade de volume", "единица объема", "volumeneinheit", "unità di volume", "hacim birimi", "وحدة الحجم"] },
    { key: "dimensionUnit", words: ["尺寸单位", "dimension unit", "unidad de medida", "unité de mesure", "unidade de medida", "единица размера", "maßeinheit", "unità di misura", "ölçü birimi", "وحدة القياس"] },
    { key: "image", words: ["图片", "照片", "图", "image", "photo", "picture", "imagen", "foto", "image", "photo", "imagem", "foto", "изображение", "фото", "bild", "foto", "immagine", "görsel", "fotoğraf", "صورة"] }
  ];

  var SUMMARY_WORDS = /^(合计|总计|總計|小计|小計|總和|总和|total|subtotal|sum|grand total|gesamt|summe|totale|итого|итог|всего|المجموع|الإجمالي|total geral|toplam)$/i;
  var SUMMARY_CJK_WORDS = /(合计|总计|總計|小计|小計|總和|总和)/;
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

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize ? String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s\u00a0_\-–—:：/\\|()[\]{}]+/g, " ").replace(/\s+/g, " ").trim() : String(value == null ? "" : value).toLowerCase().trim();
  }

  function isSummaryValue(value) {
    var text = normalize(value);
    return Boolean(text && (SUMMARY_WORDS.test(text) || SUMMARY_CJK_WORDS.test(text)));
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

  function matchHeader(value) {
    var text = normalize(value);
    if (!text) return null;
    var exact = null;
    var partial = null;
    var partialLength = 0;
    FIELD_DEFINITIONS.forEach(function (definition) {
      definition.words.forEach(function (word) {
        var normalizedWord = normalize(word);
        if (text === normalizedWord && !exact) exact = definition.key;
        else if (normalizedWord.length >= 3 && text.indexOf(normalizedWord) !== -1 && normalizedWord.length > partialLength) {
          partial = definition.key;
          partialLength = normalizedWord.length;
        }
      });
    });
    return exact || partial;
  }

  function isBlank(value) {
    return value == null || String(value).trim() === "";
  }

  function numeric(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value == null) return null;
    var text = String(value).trim();
    if (!text || /^[-—–/]$/.test(text)) return null;
    var negative = /^\(.*\)$/.test(text);
    text = text.replace(/[()]/g, "").replace(/[\s\u00a0,，]/g, "").replace(/[^0-9eE+\-.]/g, "");
    if (!text || text === "." || text === "-") return null;
    var result = Number(text);
    if (!Number.isFinite(result)) return null;
    return negative ? -result : result;
  }

  function textValue(value) {
    if (isBlank(value)) return "";
    return String(value).trim();
  }

  function detectCurrency(value) {
    var text = String(value == null ? "" : value).toUpperCase();
    if (/\b(CNY|RMB)\b|[¥￥]|元/.test(text)) return "CNY";
    if (/\bUSD\b|US\$/.test(text)) return "USD";
    if (/\bEUR\b|€/.test(text)) return "EUR";
    if (/\bGBP\b|£/.test(text)) return "GBP";
    if (/\bRUB\b|₽/.test(text)) return "RUB";
    if (/\bTRY\b|₺/.test(text)) return "TRY";
    if (/\bAED\b/.test(text)) return "AED";
    if (/\bSAR\b/.test(text)) return "SAR";
    if (/\bJPY\b|円/.test(text)) return "JPY";
    if (/\bCAD\b/.test(text)) return "CAD";
    if (/\bAUD\b/.test(text)) return "AUD";
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
    headers.forEach(function (header) {
      var field = matchHeader(header.label);
      if (field && field !== "image" && mapping[field] == null) mapping[field] = header.index;
    });
    return mapping;
  }

  function buildTable(sheet, XLSX) {
    if (!sheet || !sheet["!ref"]) return { headerRow: 0, headers: [], rows: [], truncatedRows: false, truncatedColumns: false };
    var decoded = XLSX.utils.decode_range(sheet["!ref"]);
    var range = {
      s: { r: decoded.s.r, c: decoded.s.c },
      e: { r: Math.min(decoded.e.r, decoded.s.r + MAX_ROWS + 29), c: Math.min(decoded.e.c, decoded.s.c + MAX_COLUMNS - 1) }
    };
    var matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: range,
      raw: false,
      defval: null,
      blankrows: true
    });
    if (!matrix.length) return { headerRow: 0, headers: [], rows: [], truncatedRows: false, truncatedColumns: false };
    var headerRow = findHeaderRow(matrix);
    var headerValues = matrix[headerRow] || [];
    var lastColumn = 0;
    matrix.slice(headerRow).forEach(function (row) {
      row = row || [];
      for (var index = Math.min(row.length, MAX_COLUMNS) - 1; index >= 0; index -= 1) {
        if (!isBlank(row[index])) { lastColumn = Math.max(lastColumn, index); break; }
      }
    });
    var headers = [];
    for (var column = 0; column <= lastColumn; column += 1) {
      headers.push({ index: column, column: columnName(column), label: textValue(headerValues[column]) || ("Column " + columnName(column)) });
    }
    var rows = matrix.slice(headerRow + 1, headerRow + 1 + MAX_ROWS).map(function (row, rowOffset) {
      return {
        sourceRow: range.s.r + headerRow + rowOffset + 2,
        cells: (row || []).slice(0, lastColumn + 1)
      };
    }).filter(function (entry) {
      return entry.cells.some(function (cell) { return !isBlank(cell); });
    });
    return {
      headerRow: range.s.r + headerRow + 1,
      headers: headers,
      rows: rows,
      truncatedRows: decoded.e.r > range.s.r + headerRow + MAX_ROWS,
      truncatedColumns: decoded.e.c >= range.s.c + MAX_COLUMNS
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

  function hasSummaryValue(row, mapping) {
    return Object.keys(mapping).some(function (field) {
      if (field === "image") return false;
      return isSummaryValue(valueAt(row, mapping, field));
    });
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
      weightMeaning: weightMeaningAmbiguous && !mappingConfirmed,
      volumeMeaning: volumeMeaningAmbiguous && !mappingConfirmed
    };
    var assumptions = {};
    var skippedSummaryRows = 0;
    var negativeValuesSkipped = 0;
    var subtotalMismatchCount = 0;
    var items = [];

    table.rows.forEach(function (rowEntry, rowOffset) {
      var row = Array.isArray(rowEntry) ? rowEntry : (rowEntry && rowEntry.cells) || [];
      var sourceRow = !Array.isArray(rowEntry) && rowEntry && Number.isFinite(rowEntry.sourceRow)
        ? rowEntry.sourceRow
        : table.headerRow + rowOffset + 1;
      if (!hasAnyMappedValue(row, mapping)) return;
      var product = textValue(valueAt(row, mapping, "product"));
      var sku = textValue(valueAt(row, mapping, "sku"));
      var quantity = numeric(valueAt(row, mapping, "qty"));
      var cartons = numeric(valueAt(row, mapping, "cartons"));
      var unitWeight = numeric(valueAt(row, mapping, "unitWeight"));
      var directWeight = numeric(valueAt(row, mapping, "totalWeight"));
      var unitVolume = numeric(valueAt(row, mapping, "unitVolume"));
      var directVolume = numeric(valueAt(row, mapping, "totalVolume"));
      var unitPrice = numeric(valueAt(row, mapping, "unitPrice"));
      var directAmount = numeric(valueAt(row, mapping, "amount"));
      var length = numeric(valueAt(row, mapping, "length"));
      var width = numeric(valueAt(row, mapping, "width"));
      var height = numeric(valueAt(row, mapping, "height"));

      if (hasSummaryValue(row, mapping) || (!product && !sku && quantity == null && cartons == null)) {
        skippedSummaryRows += 1;
        return;
      }
      if ([quantity, cartons, unitWeight, directWeight, unitVolume, directVolume, unitPrice, directAmount, length, width, height].some(function (value) {
        return value != null && value < 0;
      })) {
        negativeValuesSkipped += 1;
        return;
      }

      var rowWeightUnit = overrideWeight || detectWeightUnit(valueAt(row, mapping, "weightUnit")) || detectWeightUnit(valueAt(row, mapping, "unitWeight")) || detectWeightUnit(valueAt(row, mapping, "totalWeight")) || headerWeightUnit;
      var rowVolumeUnit = overrideVolume || detectVolumeUnit(valueAt(row, mapping, "volumeUnit")) || detectVolumeUnit(valueAt(row, mapping, "unitVolume")) || detectVolumeUnit(valueAt(row, mapping, "totalVolume")) || headerVolumeUnit;
      var rowCurrency = overrideCurrency || detectCurrency(valueAt(row, mapping, "currency")) || detectCurrency(valueAt(row, mapping, "amount")) || detectCurrency(valueAt(row, mapping, "unitPrice")) || headerCurrency;
      var rowDimensionUnit = overrideDimension || detectDimensionUnit(valueAt(row, mapping, "dimensionUnit")) || headerDimensionUnit;
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
      var uniqueKey = normalize(sku || product);
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
      warningCounts: {
        summary_rows_skipped: skippedSummaryRows,
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
      session.mapping = createMapping(session.table.headers);
      session.overrides = {};
      return publicPayload(session, session.mapping, session.overrides);
    }
    return {
      parse: function (buffer, XLSX, fileName, sheetName) {
        session.fileName = fileName || "order.xlsx";
        session.workbook = XLSX.read(buffer, { type: "array", cellDates: false, cellFormula: false, cellHTML: false, dense: true });
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
