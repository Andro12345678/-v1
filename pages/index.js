import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const MoonIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const SunIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const CopyIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const CheckIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ClockIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const PrintIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const AIIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
    <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>
    <path d="M9 17c1 1 5 1 6 0"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function Home() {
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [sheetMeta, setSheetMeta] = useState({ total: 0, categories: 0, suggestions: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(null);
  const [understoodAs, setUnderstoodAs] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dots, setDots] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setDots(d => (d + 1) % 4), 380);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/kb")
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        setSheetMeta({
          total: Number(data.total || 0),
          categories: Number(data.categories || 0),
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSheetMeta({ total: 0, categories: 0, suggestions: [] });
        }
      });

    return () => { cancelled = true; };
  }, []);

  const doSearch = useCallback(async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(false);
    setUnderstoodAs("");
    setErrorMessage("");
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "تعذر تنفيذ البحث حالياً.");
        setResults([]);
        setUnderstoodAs("");
      } else if (!data.matchedQuestion || !data.legalAnswer) {
        setResults([]);
        setUnderstoodAs("");
      } else {
        setResults([{
          id: data.matchedQuestion,
          category: "Google Sheets",
          question: data.matchedQuestion,
          answer: data.legalAnswer,
          aiExplanation: data.aiExplanation || "",
          source: "Google Sheets",
          steps: [],
        }]);
        setUnderstoodAs("تم اختيار أقرب سؤال من قاعدة البيانات");
      }
    } catch {
      setErrorMessage("تعذر الاتصال بخدمة البحث.");
      setResults([]);
      setUnderstoodAs("");
    } finally {
      setSearched(true);
      setLoading(false);
      setHistory(prev => [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 6));
    }
  }, [query]);

  const handleKey = e => { if (e.key === "Enter") doSearch(); };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const escapeHtml = value => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const handlePrint = (r) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const safeQuestion = escapeHtml(r.question);
    const safeCategory = escapeHtml(r.category);
    const safeSource = escapeHtml(r.source);
    const safeAnswer = escapeHtml(r.answer);
    const safeExplanation = escapeHtml(r.aiExplanation);
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>${safeQuestion}</title>
    <style>body{font-family:Arial,sans-serif;padding:2rem;direction:rtl;max-width:800px;margin:0 auto;color:#1e293b}
    h2{color:#4338ca;border-bottom:2px solid #4338ca;padding-bottom:.5rem;font-size:1.2rem}
    .meta{color:#64748b;font-size:.85rem;margin-bottom:1.5rem;padding:.5rem;background:#f1f5f9;border-radius:8px}
    .answer{line-height:2;white-space:pre-line;font-size:.95rem}
    .explain{line-height:1.9;white-space:pre-line;font-size:.95rem;background:#eef2ff;border-radius:10px;padding:1rem;margin-top:1rem}
    .step{display:flex;gap:.5rem;margin:.4rem 0;align-items:flex-start}
    .num{background:#4338ca;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.7rem;flex-shrink:0;margin-top:2px}
    </style></head><body>
    <h2>${safeQuestion}</h2>
    <div class="meta">📂 ${safeCategory} &nbsp;|&nbsp; 📄 ${safeSource}</div>
    <div class="answer">${safeAnswer}</div>
    ${safeExplanation ? `<div class="explain"><strong>الشرح المبسط:</strong><br>${safeExplanation}</div>` : ""}
    ${r.steps?.length ? `<br><strong>خطوات التنفيذ:</strong>${r.steps.map((s, i) => `<div class="step"><div class="num">${i + 1}</div><div>${escapeHtml(s)}</div></div>`).join("")}` : ""}
    </body></html>`);
    w.print();
  };

  // ── Theme ──
  const c = {
    grad: dark ? "linear-gradient(135deg,#080e1e 0%,#10184a 60%,#080e1e 100%)" : "linear-gradient(135deg,#eef2ff 0%,#dde4ff 60%,#eef2ff 100%)",
    card: dark ? "rgba(20,30,65,0.82)" : "rgba(255,255,255,0.88)",
    border: dark ? "rgba(100,116,255,0.22)" : "rgba(100,116,255,0.18)",
    text: dark ? "#e2e8f0" : "#1e293b",
    sub: dark ? "#94a3b8" : "#64748b",
    inputBg: dark ? "rgba(8,14,30,0.7)" : "rgba(248,250,255,0.95)",
    chipBg: dark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)",
    histBg: dark ? "rgba(20,30,65,0.6)" : "rgba(238,242,255,0.8)",
    glow: dark ? "0 0 50px rgba(99,102,241,0.18)" : "0 0 50px rgba(99,102,241,0.1)",
    ansBg: dark ? "rgba(8,14,30,0.55)" : "rgba(238,242,255,0.55)",
    headerBg: dark ? "rgba(8,14,30,0.85)" : "rgba(255,255,255,0.85)",
  };

  const S = {
    root: { minHeight:"100vh", background:c.grad, color:c.text, fontFamily:"'Segoe UI',Arial,sans-serif", direction:"rtl" },
    header: { background:c.headerBg, backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderBottom:`1px solid ${c.border}`, padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 },
    logoIcon: { width:38, height:38, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"1.1rem", boxShadow:"0 4px 14px rgba(99,102,241,0.4)", flexShrink:0 },
    themeBtn: { background:c.chipBg, border:`1px solid ${c.border}`, borderRadius:9, padding:"0.45rem", cursor:"pointer", color:c.sub, display:"flex", alignItems:"center", transition:"all .2s" },
    main: { maxWidth:860, margin:"0 auto", padding:"1.8rem 1rem 3rem" },
    heroTitle: { fontSize:"clamp(1.3rem,4vw,1.9rem)", fontWeight:800, background:"linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", marginBottom:"0.4rem", lineHeight:1.3, textAlign:"center" },
    heroSub: { color:c.sub, fontSize:"0.88rem", textAlign:"center", marginBottom:"1.8rem" },
    searchCard: { background:c.card, backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderRadius:22, border:`1px solid ${c.border}`, padding:"1.4rem", boxShadow:c.glow, marginBottom:"1.2rem" },
    input: { flex:1, background:c.inputBg, border:`1.5px solid ${c.border}`, borderRadius:13, padding:"0.8rem 1rem", fontSize:"1rem", color:c.text, outline:"none", direction:"rtl", fontFamily:"inherit", transition:"border-color .2s, box-shadow .2s", width:"100%" },
    btn: { background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:13, padding:"0.8rem 1.3rem", color:"white", cursor:"pointer", fontSize:"0.92rem", fontWeight:700, display:"flex", alignItems:"center", gap:"0.45rem", whiteSpace:"nowrap", transition:"all .2s", boxShadow:"0 4px 15px rgba(99,102,241,0.35)", flexShrink:0 },
    chip: { background:c.chipBg, border:`1px solid ${c.border}`, borderRadius:20, padding:"0.3rem 0.75rem", fontSize:"0.78rem", cursor:"pointer", color:c.sub, transition:"all .2s", whiteSpace:"nowrap" },
    aiTag: { display:"inline-flex", alignItems:"center", gap:"0.35rem", background:"linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))", border:"1px solid rgba(99,102,241,0.3)", borderRadius:20, padding:"0.2rem 0.7rem", fontSize:"0.72rem", color:"#a78bfa", fontWeight:700, marginBottom:"0.8rem" },
    card: { background:c.card, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderRadius:20, border:`1px solid ${c.border}`, padding:"1.4rem", marginBottom:"0.9rem", boxShadow:dark?"0 4px 24px rgba(0,0,0,0.35)":"0 4px 24px rgba(0,0,0,0.07)", transition:"transform .2s,box-shadow .2s" },
    catTag: { background:"linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.18))", border:"1px solid rgba(99,102,241,0.3)", borderRadius:20, padding:"0.22rem 0.7rem", fontSize:"0.72rem", color:"#a78bfa", fontWeight:700, whiteSpace:"nowrap" },
    ansBg: { background:c.ansBg, borderRadius:13, padding:"1rem", marginBottom:"0.9rem", whiteSpace:"pre-line", lineHeight:1.9, fontSize:"0.9rem", border:`1px solid ${c.border}` },
    stepNum: { width:20, height:20, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", color:"white", fontWeight:700, flexShrink:0, marginTop:2 },
    metaRow: { display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.5rem", paddingTop:"0.7rem", borderTop:`1px solid ${c.border}` },
    actBtn: { background:c.chipBg, border:`1px solid ${c.border}`, borderRadius:8, padding:"0.3rem 0.6rem", cursor:"pointer", fontSize:"0.72rem", color:c.sub, display:"flex", alignItems:"center", gap:"0.28rem", transition:"all .2s" },
    histChip: { background:c.histBg, border:`1px solid ${c.border}`, borderRadius:20, padding:"0.28rem 0.7rem", fontSize:"0.75rem", cursor:"pointer", color:c.sub, display:"flex", alignItems:"center", gap:"0.38rem", transition:"all .2s" },
    understood: { background:dark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)", border:`1px solid ${c.border}`, borderRadius:14, padding:"0.7rem 1rem", marginBottom:"1rem", fontSize:"0.85rem", color:c.sub, display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap" },
    spinner: { width:44, height:44, border:`3px solid ${c.border}`, borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .75s linear infinite", margin:"0 auto 1rem" },
    noRes: { background:c.card, backdropFilter:"blur(20px)", borderRadius:20, border:`1px solid ${c.border}`, padding:"2.5rem 1.5rem", textAlign:"center" },
    footer: { textAlign:"center", padding:"1.5rem", color:c.sub, fontSize:"0.73rem", borderTop:`1px solid ${c.border}`, marginTop:"2rem" },
  };

  return (
    <>
      <Head>
        <title>قاعدة المعرفة الضريبية العقارية</title>
        <meta name="description" content="بحث ذكي في قاعدة معرفة الضرائب العقارية المصرية" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={S.root}>

        {/* Header */}
        <header style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <div style={S.logoIcon}>🏛️</div>
            <div>
              <div style={{ fontWeight:700, fontSize:"0.95rem", lineHeight:1.2 }}>قاعدة المعرفة الضريبية</div>
              <div style={{ fontSize:"0.68rem", color:c.sub }}>مصلحة الضرائب العقارية — مصر</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            <div style={{
              background: "rgba(74,222,128,0.12)",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius:20, padding:"0.22rem 0.7rem", fontSize:"0.7rem",
              color: "#4ade80",
              display:"flex", alignItems:"center", gap:"0.3rem",
            }}>
              <span style={{ width:6, height:6, background:"#4ade80", borderRadius:"50%", display:"inline-block" }}/>
              بحث ذكي
            </div>
            <button style={S.themeBtn} className="ab" onClick={() => setDark(d => !d)} aria-label="تبديل الوضع">
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        {/* Main */}
        <main style={S.main}>
          <h1 style={S.heroTitle}>ابحث بكلامك — بالعامية أو الفصحى</h1>
          <p style={S.heroSub}>البحث الذكي يفهم قصدك ويجيب من القانون الرسمي فقط</p>

          {/* Stats */}
          {!searched && !loading && (
            <div style={{ display:"flex", justifyContent:"center", gap:"2rem", marginBottom:"1.5rem", flexWrap:"wrap" }}>
              {[
                { n: sheetMeta.total || "—", l: "سؤال وإجابة" },
                { n: sheetMeta.categories || "—", l: "تصنيف" },
                { n: "⚡", l: "بحث بالمعنى والنية" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"1.6rem", fontWeight:900, color:"#6366f1" }}>{s.n}</div>
                  <div style={{ fontSize:"0.73rem", color:c.sub }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search Card */}
          <div style={S.searchCard}>
            <div style={S.aiTag}><AIIcon /><SparkleIcon /> بحث ذكي — يفهم العامية المصرية والفصحى</div>
            <div style={{ display:"flex", gap:"0.65rem", alignItems:"stretch" }}>
              <input
                ref={inputRef}
                className="inp"
                style={S.input}
                placeholder='مثال: "امتى اخر موعد؟"  أو  "مش قادر أدفع"  أو  "الضريبة بتتحسب إزاي"'
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                autoFocus
                autoComplete="off"
              />
              <button className="sbtn" style={S.btn} onClick={() => doSearch()}>
                <SearchIcon />بحث
              </button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.45rem", marginTop:"0.9rem" }}>
              {sheetMeta.suggestions.map((s, i) => (
                <button key={i} className="ch" style={S.chip} onClick={() => { setQuery(s); doSearch(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && !loading && (
            <div style={{ marginBottom:"1rem" }}>
              <div style={{ fontSize:"0.74rem", color:c.sub, marginBottom:"0.45rem", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                <ClockIcon /> آخر عمليات البحث:
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.38rem" }}>
                {history.map((h, i) => (
                  <button key={i} style={S.histChip} className="ch" onClick={() => { setQuery(h); doSearch(h); }}>
                    <ClockIcon />{h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
              <div style={S.spinner} />
              <div style={{ color:c.sub, fontSize:"0.88rem", marginBottom:"0.4rem" }}>
                جاري فهم سؤالك والبحث في قاعدة البيانات{".".repeat(dots)}
              </div>
              <div style={{ fontSize:"0.75rem", color:"#6366f1" }} className="ai-pulse">
                تحليل النية • البحث في قاعدة البيانات • ترتيب النتائج
              </div>
            </div>
          )}

          {/* Results */}
          {searched && !loading && (
            <>
              {results.length === 0 ? (
                <div style={S.noRes}>
                  <div style={{ fontSize:"3rem", marginBottom:"0.75rem" }}>🔍</div>
                  <div style={{ fontSize:"1.05rem", fontWeight:700, marginBottom:"0.5rem" }}>لا توجد معلومات داخل قاعدة البيانات.</div>
                  <div style={{ color:c.sub, fontSize:"0.88rem" }}>{errorMessage || "حاول إعادة صياغة السؤال أو استخدم كلمات مختلفة."}</div>
                </div>
              ) : (
                <>
                  {/* Understood banner */}
                  {understoodAs && (
                    <div style={S.understood}>
                      <AIIcon />
                      <span><strong style={{ color:"#818cf8" }}>النظام فهم سؤالك:</strong> {understoodAs}</span>
                      <span style={{ marginRight:"auto", fontSize:"0.7rem" }}>تم العثور على {results.length} نتيجة</span>
                    </div>
                  )}

                  {/* Result cards */}
                  {results.map((r, idx) => (
                      <div key={r.id} style={{ ...S.card, animationDelay:`${idx * 0.1}s` }} className="rc card-h">
                        <div style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", marginBottom:"0.9rem", flexWrap:"wrap" }}>
                          <span style={S.catTag}>{r.category}</span>
                          <span style={{ fontSize:"1rem", fontWeight:700, lineHeight:1.55, flex:1 }}>{r.question}</span>
                        </div>

                        <div style={S.ansBg}>{r.answer}</div>

                        {r.aiExplanation && (
                          <div style={{ ...S.ansBg, background:dark?"rgba(99,102,241,0.1)":"rgba(99,102,241,0.08)" }}>
                            <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#6366f1", marginBottom:"0.45rem" }}>شرح مبسط</div>
                            {r.aiExplanation}
                          </div>
                        )}

                        {r.steps?.length > 0 && (
                          <div style={{ marginBottom:"0.9rem" }}>
                            <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#6366f1", marginBottom:"0.55rem" }}>📋 خطوات التنفيذ</div>
                            {r.steps.map((s, si) => (
                              <div key={si} style={{ display:"flex", alignItems:"flex-start", gap:"0.55rem", marginBottom:"0.45rem", fontSize:"0.85rem", lineHeight:1.5 }}>
                                <div style={S.stepNum}>{si + 1}</div>
                                <div>{s}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={S.metaRow}>
                          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", fontSize:"0.72rem", color:c.sub, flexWrap:"wrap" }}>
                            <span>📄 {r.source}</span>
                            <span style={{ opacity:.4 }}>|</span>
                            <span>تمت المطابقة بواسطة Gemini</span>
                          </div>
                          <div style={{ display:"flex", gap:"0.35rem" }}>
                            <button className="ab" style={S.actBtn} onClick={() => handleCopy(`${r.answer}${r.aiExplanation ? `\n\n${r.aiExplanation}` : ""}`, r.id)}>
                              {copied === r.id ? <CheckIcon /> : <CopyIcon />}
                              {copied === r.id ? "تم" : "نسخ"}
                            </button>
                            <button className="ab" style={S.actBtn} onClick={() => handlePrint(r)}>
                              <PrintIcon />طباعة
                            </button>
                          </div>
                        </div>
                      </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* Empty state */}
          {!searched && !loading && (
            <div style={{ textAlign:"center", padding:"2rem 1rem", color:c.sub }}>
              <div style={{ fontSize:"3.5rem", marginBottom:"0.9rem", opacity:.3 }}>🏛️</div>
              <div style={{ fontSize:"0.88rem", maxWidth:420, margin:"0 auto", lineHeight:1.8 }}>
                اكتب سؤالك بأي طريقة — عامية مصرية، فصحى، أو حتى كلمات ناقصة.<br />
                <strong style={{ color:"#6366f1" }}>البحث الذكي</strong> يفهم قصدك ويجيب فقط من قاعدة البيانات الرسمية.
              </div>
            </div>
          )}
        </main>

        <footer style={S.footer}>
          <div>قاعدة المعرفة الضريبية العقارية • جمهورية مصر العربية</div>
          <div style={{ marginTop:"0.3rem", opacity:.55 }}>للاستخدام الداخلي فقط • جميع الإجابات من المصدر الرسمي القانوني</div>
        </footer>
      </div>
    </>
  );
}
