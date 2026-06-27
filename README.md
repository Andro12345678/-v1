# قاعدة المعرفة الضريبية العقارية

تطبيق Next.js يبحث في بيانات Google Sheets مباشرة، ويستخدم Gemini لاختيار أقرب سؤال وإرجاع:

```json
{
  "matchedQuestion": "",
  "legalAnswer": "",
  "aiExplanation": ""
}
```

## المتغيرات المطلوبة

أضف هذه المتغيرات في `.env.local` محلياً وفي Vercel Environment Variables:

```bash
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GEMINI_API_KEY=
```

صيغة `GOOGLE_PRIVATE_KEY` في Vercel تكون عادة بسطور جديدة escaped:

```bash
"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## أعمدة Google Sheets

الصف الأول هو أسماء الأعمدة. يدعم المشروع أسماء عربية أو إنجليزية، والأعمدة الأساسية هي:

| English | Arabic | Required |
| --- | --- | --- |
| `id` | `رقم` | لا |
| `category` | `التصنيف` | لا |
| `question` | `السؤال` | نعم |
| `legal` أو `answer` | `الإجابة` أو `النص القانوني` | نعم |
| `source` | `المصدر` | لا |
| `steps` | `الخطوات` | لا |
| `keywords` | `كلمات مفتاحية` | لا |

يجب مشاركة الشيت مع Service Account Email بصلاحية Viewer.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## هيكل المشروع

```text
lib/
  gemini.js   # اختيار أقرب سؤال وتوليد الشرح باستخدام Gemini
  sheets.js   # قراءة Google Sheets عبر Service Account
pages/
  api/
    kb.js     # ملخص الأسئلة والاقتراحات للواجهة
    search.js # بحث Gemini النهائي
  index.js    # الواجهة
styles/
  globals.css
```
