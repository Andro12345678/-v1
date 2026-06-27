// api/_arabic.js — Arabic NLP Utilities
// تطبيع النصوص العربية + قاموس العامية المصرية + بحث الكلمات المفتاحية

// ─── Arabic Normalization ─────────────────────────────────────────────────────

/**
 * ينظّف ويوحّد النص العربي:
 * - يحوّل أشكال الألف المختلفة → ا
 * - يحوّل ة → ه
 * - يحوّل ى → ي
 * - يزيل التشكيل والتطويل
 * - يزيل المسافات الزائدة
 */
export function normalizeArabic(text) {
  if (!text || typeof text !== "string") return "";

  return text
    // توحيد أشكال الألف
    .replace(/[أإآ]/g, "ا")
    // توحيد التاء المربوطة
    .replace(/ة/g, "ه")
    // توحيد الياء
    .replace(/ى/g, "ي")
    // إزالة التشكيل (الحركات)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // إزالة التطويل (ـ)
    .replace(/\u0640/g, "")
    // إزالة الحروف الزائدة (zero-width chars)
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    // توحيد علامات الترقيم
    .replace(/[،؛؟!]/g, " ")
    // تنظيف المسافات
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ─── Egyptian Dialect Dictionary ─────────────────────────────────────────────
// قاموس العامية المصرية → الفصحى
// سهل الإضافة: أضف سطراً جديداً بنفس النمط

const DIALECT_MAP = {
  // ── الاستفهام ───────────────────────────────────────────
  "امتي":    "موعد",
  "امتى":    "موعد",
  "إمتى":    "موعد",
  "إمتي":    "موعد",
  "ازاي":    "كيف",
  "إزاي":    "كيف",
  "ازيك":    "كيف",
  "ليه":     "سبب",
  "ليه":     "لماذا",
  "فين":     "أين",
  "فيه":     "أين",
  "كام":     "عدد",
  "قد ايه":  "مقدار",
  "قد إيه":  "مقدار",
  "إيه":     "ما",
  "ايه":     "ما",
  "مين":     "من",

  // ── الأفعال الشائعة ─────────────────────────────────────
  "عايز":        "أريد",
  "عاوز":        "أريد",
  "عاوزة":       "أريد",
  "عايزه":       "أريد",
  "عاوزه":       "أريد",
  "محتاج":       "أحتاج",
  "محتاجة":      "أحتاج",
  "بدي":         "أريد",
  "هدفع":        "سأدفع",
  "هدّفع":       "سأدفع",
  "بدفع":        "أدفع",
  "بيدفع":       "يدفع",
  "بتدفع":       "تدفع",
  "مدفعتش":      "لم أدفع",
  "مدفعش":       "لم يدفع",
  "هعمل":        "سأعمل",
  "هيعمل":       "سيعمل",
  "بعمل":        "أعمل",
  "بيعمل":       "يعمل",
  "بيتعمل":      "يتم",
  "بتتحسب":      "تحسب",
  "بتحسب":       "تحسب",
  "بتتحسب":      "حساب",
  "اتحسب":       "يحسب",
  "هيلحقني":     "عقوبة",
  "هيمسكني":     "عقوبة",
  "اتظلم":       "طعن",
  "أتظلم":       "طعن",
  "اعترض":       "طعن",
  "أعترض":       "طعن",
  "اتقدم":       "تقديم",
  "أتقدم":       "تقديم",

  // ── النفي والتعديل ──────────────────────────────────────
  "مش":          "غير",
  "مش عارف":     "لا أعرف",
  "مش قادر":     "عدم القدرة",
  "مش هدفع":     "إعفاء",
  "مش محتاج":    "إعفاء",
  "ملزمش":       "غير ملزم",
  "مش لازم":     "غير لازم",
  "مش موجود":    "غير موجود",
  "مفيش":        "لا يوجد",
  "ماعنيش":      "لا يعنيني",

  // ── الكيانات والأشياء ───────────────────────────────────
  "شقة":         "وحدة سكنية",
  "شقتي":        "وحدتي السكنية",
  "البيت":       "العقار",
  "بيتي":        "عقاري",
  "عمارة":       "مبنى",
  "العمارة":     "المبنى",
  "الأرض الفاضية": "الأرض غير المبنية",
  "أرض فاضية":   "أرض غير مبنية",
  "فاضية":       "فضاء",
  "خالية":       "فضاء",
  "اللي بيسكن":  "المستأجر",
  "ساكن":        "مستأجر",
  "الساكن":      "المستأجر",
  "مالك":        "مالك العقار",

  // ── الإجراءات القانونية ─────────────────────────────────
  "ورقة":        "مستند",
  "ورق":         "مستندات",
  "الأوراق":     "المستندات",
  "إقرار":       "تقديم إقرار",
  "تظلم":        "طعن",
  "شكوى":        "طعن",
  "استئناف":     "طعن",
  "خلاص":        "سداد",
  "سديت":        "سددت",
  "دفعت":        "سددت",
  "دفع":         "سداد",
  "رسوم":        "ضريبة",
  "غرامة":       "غرامة",
  "مخالفة":      "غرامة",
  "عقوبة":       "عقوبة",
  "ربنا يكرمك":  "",

  // ── الإعفاءات والتخفيضات ────────────────────────────────
  "معفي":        "إعفاء",
  "معفيه":       "إعفاء",
  "معفى":        "إعفاء",
  "مش هدفعش":   "إعفاء",
  "مش عليا":     "إعفاء",
  "تخفيض":       "تخفيض",

  // ── الوقت والمواعيد ─────────────────────────────────────
  "بعدين":       "لاحقاً",
  "دلوقتي":      "الآن",
  "دلوقت":       "الآن",
  "النهارده":    "اليوم",
  "امبارح":      "أمس",
  "اخر موعد":    "الموعد النهائي",
  "آخر موعد":    "الموعد النهائي",
  "اخر يوم":     "الموعد النهائي",
  "بكره":        "غداً",

  // ── الوراثة والملكية ────────────────────────────────────
  "ورثة":        "شيوع",
  "ورث":         "ميراث",
  "ورثنا":       "ورثنا",
  "شريك":        "شيوع",
  "شراكة":       "شيوع",

  // ── كلمات إضافية شائعة ──────────────────────────────────
  "كمان":        "أيضاً",
  "برضو":        "أيضاً",
  "أوعى":        "لا تفعل",
  "خليني":       "دعني",
  "يعني":        "أي",
  "طب":          "",
  "بس":          "لكن",
  "يلا":         "",
  "هو ده":       "هذا",
  "دي":          "هذه",
  "ده":          "هذا",
};

/**
 * يحوّل الكلمات العامية في النص إلى فصحى
 * يعالج كل كلمة ومجموعات الكلمات (bigrams/trigrams) أيضاً
 */
export function convertDialect(text) {
  if (!text) return text;

  let result = text;

  // ترتيب المدخلات من الأطول للأقصر (لتفادي تعارض الاستبدالات)
  const entries = Object.entries(DIALECT_MAP).sort((a, b) => b[0].length - a[0].length);

  for (const [dialect, msa] of entries) {
    if (!msa) {
      // كلمات فارغة نزيلها
      result = result.replace(new RegExp(`\\b${dialect}\\b`, "g"), "");
    } else {
      result = result.replace(new RegExp(dialect, "g"), msa);
    }
  }

  return result.replace(/\s+/g, " ").trim();
}

/**
 * المعالجة الكاملة للاستعلام:
 * 1. تطبيع الحروف
 * 2. تحويل العامية
 * 3. تطبيع ثانوي بعد التحويل
 */
export function preprocessQuery(rawQuery) {
  if (!rawQuery) return { original: "", normalized: "", expanded: [] };

  const normalized = normalizeArabic(rawQuery);
  const converted = convertDialect(normalized);
  const finalNorm = normalizeArabic(converted);

  // كلمات مفتاحية من كلا النسختين للبحث الموسّع
  const originalWords = normalized.split(/\s+/).filter(w => w.length > 1);
  const convertedWords = finalNorm.split(/\s+/).filter(w => w.length > 1);
  const expanded = [...new Set([...originalWords, ...convertedWords])];

  return {
    original: rawQuery.trim(),
    normalized,
    converted: finalNorm,
    expanded,
  };
}

// ─── Hybrid Keyword Scoring ───────────────────────────────────────────────────
// أوزان الحقول
const FIELD_WEIGHTS = {
  question: 5,    // أعلى وزن — السؤال هو المعيار الأساسي
  keywords: 3,    // كلمات مفتاحية إن وُجدت
  category: 2,    // التصنيف
  source: 1,      // المصدر القانوني
  legalAnswer: 1, // النص القانوني
};

/**
 * يحسب نقاط الصلة لعنصر KB واحد
 * يعيد رقماً كلما كان أعلى كانت الصلة أقوى
 */
function scoreItem(item, processedQuery) {
  const { expanded, converted, normalized } = processedQuery;
  let score = 0;

  // دوّال مساعدة
  const normItem = (str) => normalizeArabic(str || "");

  const fields = {
    question:    normItem(item.question),
    category:    normItem(item.category),
    source:      normItem(item.source),
    legalAnswer: normItem(item.legalAnswer),
    keywords:    normItem(item.keywords || ""),
  };

  // 1. مطابقة تامة للعبارة الكاملة (مكافأة كبيرة)
  if (converted && fields.question.includes(converted)) score += 30;
  if (normalized && fields.question.includes(normalized)) score += 20;

  // 2. مطابقة الكلمات الفردية مع أوزان الحقول
  for (const word of expanded) {
    if (word.length < 2) continue;
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      if (fields[field].includes(word)) {
        // كلمات أطول لها مكافأة إضافية
        const lengthBonus = word.length > 4 ? 2 : 1;
        score += weight * lengthBonus;
      }
    }
  }

  // 3. مطابقة في السؤال تحديداً (مكافأة إضافية)
  for (const word of expanded) {
    if (word.length >= 3 && fields.question.includes(word)) {
      score += 3;
    }
  }

  return score;
}

/**
 * يرتّب عناصر KB حسب الصلة ويعيد أفضل N عنصر
 * @param {Array} items - عناصر قاعدة المعرفة
 * @param {string} rawQuery - سؤال المستخدم الخام
 * @param {number} topN - عدد النتائج المطلوبة (افتراضياً 10)
 * @returns {{ candidates: Array, processedQuery: object }}
 */
export function rankCandidates(items, rawQuery, topN = 10) {
  const processedQuery = preprocessQuery(rawQuery);

  const scored = items
    .map(item => ({
      ...item,
      _score: scoreItem(item, processedQuery),
    }))
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score);

  return {
    candidates: scored.slice(0, topN),
    processedQuery,
    totalScored: scored.length,
  };
}
