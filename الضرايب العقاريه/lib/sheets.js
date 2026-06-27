import { google } from "googleapis";

const DEFAULT_RANGE = "A:Z";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

function normalizeKey(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

function serviceAccountAuth() {
  const clientEmail = requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
}

const FIELD_ALIASES = {
  id: ["id", "رقم", "م", "no", "#"],
  category: ["category", "cat", "section", "التصنيف", "تصنيف", "القسم", "قسم", "الفئه", "فئه"],
  question: ["question", "q", "title", "السؤال", "سؤال", "الاستفسار", "استفسار", "العنوان"],
  legalAnswer: [
    "legal",
    "answer",
    "legal_answer",
    "legalanswer",
    "official_answer",
    "النص_القانوني",
    "نص_قانوني",
    "القانون",
    "الاجابه",
    "الاجابه_القانونيه",
    "الجواب",
    "الرد_القانوني",
  ],
  source: ["source", "src", "reference", "المصدر", "مصدر", "مرجع"],
  steps: ["steps", "steps_ar", "الخطوات", "خطوات", "الخطوه", "خطوه"],
  keywords: ["keywords", "tags", "كلمات_مفتاحيه", "كلمات_مفتاحية", "وسوم"],
};

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([field, aliases]) => [
    field,
    aliases.map(normalizeKey),
  ])
);

function readField(row, field) {
  const aliases = NORMALIZED_ALIASES[field] || [];
  for (const alias of aliases) {
    const value = row[alias];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function splitSteps(value) {
  if (!value) return [];
  return value
    .split(/[|؛\n]/)
    .map((step) => step.trim())
    .filter(Boolean);
}

function mapRows(values) {
  if (!Array.isArray(values) || values.length < 2) return [];

  const headers = values[0].map(normalizeKey);

  return values
    .slice(1)
    .map((cells, index) => {
      const row = {};
      headers.forEach((header, cellIndex) => {
        row[header] = String(cells[cellIndex] || "").trim();
      });

      const question = readField(row, "question");
      const legalAnswer = readField(row, "legalAnswer");

      return {
        id: readField(row, "id") || String(index + 1),
        category: readField(row, "category") || "عام",
        question,
        legalAnswer,
        source: readField(row, "source"),
        steps: splitSteps(readField(row, "steps")),
        keywords: readField(row, "keywords"),
      };
    })
    .filter((item) => item.question && item.legalAnswer);
}

export async function getKnowledgeBase() {
  const spreadsheetId = requiredEnv("GOOGLE_SHEET_ID");
  const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth() });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: DEFAULT_RANGE,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const items = mapRows(response.data.values || []);
  if (!items.length) {
    throw new Error("Google Sheet must contain rows with question and legal answer columns");
  }

  return {
    items,
    total: items.length,
    categories: new Set(items.map((item) => item.category)).size,
    fetchedAt: new Date().toISOString(),
  };
}

export function publicKnowledgeSummary(data) {
  const items = data?.items || [];
  return {
    total: items.length,
    categories: new Set(items.map((item) => item.category)).size,
    suggestions: items.slice(0, 8).map((item) => item.question),
    fetchedAt: data?.fetchedAt || null,
  };
}
