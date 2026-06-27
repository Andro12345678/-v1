// api/kb.js — Vercel Serverless Function
// يجلب بيانات Google Sheets ويحوّلها لـ JSON

// ─── Cache ────────────────────────────────────────────────────────────────────
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// يدعم: multiline cells، quotes مضاعفة، BOM، أسطر Windows وUnix
function parseCSV(text) {
  // إزالة BOM
  text = text.replace(/^\uFEFF/, "");

  const rows = [];
  let row = [], field = "", inQuote = false, i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        // escaped quote داخل حقل
        field += '"';
        i += 2;
        continue;
      }
      inQuote = !inQuote;
      i++;
      continue;
    }

    if (ch === ',' && !inQuote) {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(f => f.trim())) rows.push(row);
      row = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // آخر حقل/صف
  row.push(field);
  if (row.some(f => f.trim())) rows.push(row);

  if (rows.length < 2) return [];

  // الصف الأول هو الـ headers — تنظيف وتوحيد
  const headers = rows[0].map(h =>
    h.trim()
      .replace(/[\u200B-\u200F\uFEFF]/g, '') // zero-width chars
      .toLowerCase()
  );

  return rows.slice(1)
    .filter(r => r.some(f => f.trim()))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] || '').trim();
      });
      return obj;
    });
}

// ─── Column Mapper ────────────────────────────────────────────────────────────
// يدعم أسماء الأعمدة بالعربية والإنجليزية والاختلافات الشائعة
function getField(raw, ...keys) {
  for (const k of keys) {
    const val = raw[k];
    if (val && typeof val === 'string' && val.trim()) return val.trim();
  }
  return '';
}

function mapItem(raw, idx) {
  const id = getField(raw, 'id', 'رقم', 'no', '#') || String(idx + 1);

  const category = getField(
    raw,
    'category', 'التصنيف', 'تصنيف', 'cat', 'قسم', 'الفئه', 'فئة'
  ) || 'عام';

  const question = getField(
    raw,
    'question', 'السؤال', 'سؤال', 'q', 'الاستفسار', 'استفسار', 'العنوان'
  );

  const legalAnswer = getField(
    raw,
    'legal', 'legal_answer', 'legalanswer',
    'النص القانوني', 'النص_القانوني', 'نص قانوني', 'نص_قانوني',
    'القانون', 'الإجابة القانونية', 'الإجابة', 'الجواب', 'الرد القانوني'
  );

  const simpleAnswer = getField(
    raw,
    'simple', 'simple_answer', 'simpleanswer',
    'الرد المبسط', 'الرد_المبسط', 'رد مبسط', 'رد_مبسط',
    'الرد', 'رد للعميل', 'رد العميل'
  );

  const stepsRaw = getField(
    raw,
    'steps', 'الخطوات', 'خطوات', 'steps_ar', 'الخطوة', 'خطوة'
  );

  const source = getField(
    raw,
    'source', 'المصدر', 'مصدر', 'src', 'القانون', 'مرجع'
  );

  const keywords = getField(
    raw,
    'keywords', 'كلمات مفتاحية', 'كلمات_مفتاحية', 'tags'
  );

  return {
    id,
    category,
    question,
    legalAnswer,
    simpleAnswer,
    steps: stepsRaw
      ? stepsRaw.split(/[|؛\n]/).map(s => s.trim()).filter(Boolean)
      : [],
    source,
    keywords,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', items: [] });
  }

  const forceRefresh = req.query?.refresh === '1';
  const now = Date.now();

  // ── إرجاع الـ cache لو لسه صالح ─────────────────────────────────────────
  if (cache && !forceRefresh && now - cacheTime < CACHE_TTL) {
    console.log(`[kb] cache hit — ${cache.items.length} items`);
    return res.json({ ...cache, source: 'cache' });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    console.error('[kb] GOOGLE_SHEET_ID is not set');
    return res.status(500).json({
      error: 'GOOGLE_SHEET_ID غير محدد في Environment Variables',
      items: [],
      source: 'config_error',
    });
  }

  const fetchStart = Date.now();

  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const resp = await fetch(url, {
      headers: {
        Accept: 'text/csv, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; LegalKB/1.0)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15 ثانية timeout
    });

    if (!resp.ok) {
      const reason =
        resp.status === 403 ? 'الشيت غير مشارك — اعمل "Share → Anyone with the link"' :
        resp.status === 404 ? 'GOOGLE_SHEET_ID غلط' :
        `HTTP ${resp.status}`;
      throw new Error(`فشل جلب الشيت: ${reason}`);
    }

    const csv = await resp.text();

    if (!csv || csv.length < 20) {
      throw new Error('الشيت فاضي أو لا يمكن قراءته');
    }

    const rawItems = parseCSV(csv);

    const items = rawItems
      .map((raw, idx) => mapItem(raw, idx))
      .filter(item => item.question && item.legalAnswer); // يتجاهل الصفوف الناقصة

    if (items.length === 0) {
      throw new Error(
        'لا توجد بيانات صالحة في الشيت — تأكد من أسماء الأعمدة (راجع README)'
      );
    }

    const fetchDuration = Date.now() - fetchStart;
    console.log(`[kb] fetched ${items.length} items in ${fetchDuration}ms`);

    cache = {
      items,
      total: items.length,
      categories: [...new Set(items.map(i => i.category))].length,
      fetchedAt: new Date().toISOString(),
    };
    cacheTime = now;

    return res.json({ ...cache, source: 'live' });

  } catch (err) {
    const fetchDuration = Date.now() - fetchStart;
    console.error(`[kb] fetch error after ${fetchDuration}ms:`, err.message);

    // إرجاع الـ cache القديم مع تحذير بدلاً من خطأ كامل
    if (cache) {
      console.log('[kb] returning stale cache due to fetch error');
      return res.json({
        ...cache,
        source: 'cache_stale',
        warning: err.message,
      });
    }

    return res.status(500).json({
      error: err.message,
      items: [],
      source: 'fetch_failed',
      hint: "تأكد إن GOOGLE_SHEET_ID صح وإن الشيت مشارك بـ 'Anyone with the link'",
    });
  }
}
