// api/simplify.js — Vercel Serverless Function
// يولّد رداً مبسطاً بالعامية المصرية من النص القانوني باستخدام Gemini

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const reqLog = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000; // دقيقة واحدة

function isRateLimited(ip) {
  const now = Date.now();
  const history = (reqLog.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (history.length >= RATE_LIMIT) return true;
  history.push(now);
  reqLog.set(ip, history);
  return false;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({
      simpleAnswer: '',
      error: 'Rate limit exceeded — حاول بعد دقيقة',
    });
  }

  const { legalText, question } = req.body || {};

  if (!legalText || typeof legalText !== 'string') {
    return res.status(400).json({ error: 'legalText مطلوب' });
  }

  // حد أمان على طول المدخلات
  const safeLegal = legalText.slice(0, 3000);
  const safeQuestion = (question || '').slice(0, 300);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[simplify] GEMINI_API_KEY not set');
    return res.json({ simpleAnswer: '', fallback: true });
  }

  const systemInstruction = `أنت موظف خدمة عملاء محترف في مصلحة الضرائب العقارية المصرية.

مهمتك الوحيدة: تبسيط النص القانوني في رد للعميل.

قواعد الرد المثالي:
• استخدم عامية مصرية محترمة ومهذبة
• ابدأ بـ "حضرتك..." أو "أهلاً..."
• 3 إلى 5 جمل فقط — موجز وواضح
• احتفظ بالأرقام والتواريخ والنسب كما هي
• لا تُضِف أي معلومة غير موجودة في النص
• مناسب للإرسال عبر واتساب

قاعدة صارمة: استخدم فقط المعلومات الموجودة في النص — لا تخترع أي معلومة قانونية.`;

  const userContent = `النص القانوني:\n${safeLegal}${safeQuestion ? `\n\nالسؤال: ${safeQuestion}` : ''}`;

  const startTime = Date.now();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    const duration = Date.now() - startTime;

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[simplify] Gemini error ${resp.status} after ${duration}ms:`, body.slice(0, 200));

      if (resp.status === 429) {
        return res.status(429).json({
          simpleAnswer: '',
          error: 'تجاوزنا الحد المسموح — حاول بعد قليل',
        });
      }

      throw new Error(`Gemini API error: ${resp.status}`);
    }

    const data = await resp.json();
    const simpleAnswer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    console.log(`[simplify] generated in ${duration}ms — ${simpleAnswer.length} chars`);

    return res.json({ simpleAnswer });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[simplify] error after ${duration}ms:`, err.message);

    return res.json({
      simpleAnswer: '',
      error: err.message,
    });
  }
}
