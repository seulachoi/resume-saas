"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Track, Seniority } from "@/lib/prompts";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

/** ===================== LocalStorage Keys ===================== */
const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_SID_KEY = "resumeup_sid";
const LS_TRACK_KEY = "resumeup_track";
const LS_SENIORITY_KEY = "resumeup_seniority";

// Lemon default bundle (Most popular = 5 credits)
const DEFAULT_TOPUP_VARIANT_ID = "1332796";

/** ===================== Role Context (UI) ===================== */
const TRACKS: { key: Track; label: string }[] = [
  { key: "product_manager", label: "Product Manager" },
  { key: "strategy_bizops", label: "Strategy / BizOps" },
  { key: "data_analytics", label: "Data & Analytics" },
  { key: "engineering", label: "Software Engineering" },
  { key: "marketing_growth", label: "Marketing / Growth" },
  { key: "sales_bd", label: "Sales / Business Dev" },
  { key: "design_ux", label: "Design / UX" },
  { key: "operations_program", label: "Operations / Program" },
];

const SENIORITIES: { key: Seniority; label: string }[] = [
  { key: "entry", label: "Entry (0–2y)" },
  { key: "mid", label: "Mid (3–6y)" },
  { key: "senior", label: "Senior (7y+)" },
];

/** ===================== UI Helpers ===================== */
function useInViewOnce<T extends Element>(threshold = 0.25) {
  const [seen, setSeen] = useState(false);
  const ref = useState<React.RefObject<T>>(() => ({ current: null } as any))[0];

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold, ref]);

  return { ref, seen };
}

function AnimatedRing({
  value,
  size = 96,
  duration = 800,
  start = true,
}: {
  value: number;
  size?: number;
  duration?: number;
  start?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value || 0));
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!start) {
      setP(0);
      return;
    }

    let raf = 0;
    setP(0);

    const startAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setP(Math.round(eased * v));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v, duration, start]);

  const stroke = 12;
  const r = 44;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (p / 100) * c;

  // unique gradient id per component instance (prevents collisions)
  const gid = useMemo(() => `ringGradient_${Math.random().toString(16).slice(2)}`, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 40ms linear" }}
        />
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="120" y2="120">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function AnimatedBar({
  value,
  tone = "after",
  duration = 700,
  start = true,
}: {
  value: number;
  tone?: "before" | "after";
  duration?: number;
  start?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value || 0));
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!start) {
      setW(0);
      return;
    }
    const t = setTimeout(() => setW(v), 30);
    return () => clearTimeout(t);
  }, [v, start]);

  const color = tone === "after" ? "bg-emerald-500" : "bg-slate-300";

  return (
    <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
      <div className={`h-2 ${color}`} style={{ width: `${w}%`, transition: `width ${duration}ms ease-out` }} />
    </div>
  );
}
function WhyResumeUpSection() {
  const s = useInViewOnce<HTMLDivElement>(0.25);
  const start = s.seen;

  const [kwOn, setKwOn] = useState(false);
  useEffect(() => {
    if (!start) return;
    const t = setTimeout(() => setKwOn(true), 700);
    return () => clearTimeout(t);
  }, [start]);

  return (
    <section ref={s.ref} className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-semibold text-slate-900">Why ResumeUp?</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Not just “feedback.” A visual, score-first report you can act on — then generate a recruiter-grade rewrite.
          </p>
        </div>

        {/* BEFORE vs AFTER */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 overflow-hidden relative">
          <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />

          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="text-sm text-slate-500 font-semibold">Score-first clarity</div>
              <div className="text-2xl font-semibold text-slate-900">See exactly what changed (before → after)</div>
              <div className="text-sm text-slate-600">
                Score + keyword gaps + concrete fixes — then a full rewrite and after-score report.
              </div>
            </div>

            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Preview first, upgrade when ready
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BEFORE */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">Before</div>
                <span className="text-xs text-slate-500">sample</span>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="relative h-20 w-20">
                  <svg viewBox="0 0 120 120" className="h-20 w-20 -rotate-90">
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 46 * 0.52} ${2 * Math.PI * 46}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xl font-semibold text-slate-900">52</div>
                  </div>
                </div>

                <div className="text-sm text-slate-600 space-y-1">
                  <div>Skills: 55</div>
                  <div>Impact: 48</div>
                  <div>Brevity: 62</div>
                </div>
              </div>

              <div className="mt-5 text-xs text-slate-500">Missing keywords</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Cross-functional", "SaaS", "Revenue tooling", "Experimentation"].map((k) => (
                  <span key={k} className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs text-rose-800">
                    {k}
                  </span>
                ))}
              </div>

              <div className="mt-5 text-xs text-slate-500">Typical issues</div>
              <ul className="mt-2 text-sm text-slate-700 list-disc pl-5 space-y-1">
                <li>Vague bullets without measurable outcomes</li>
                <li>Keyword gaps vs job description</li>
                <li>Long paragraphs (low scannability)</li>
              </ul>
            </div>

            {/* AFTER */}
            <div className="rounded-3xl border border-slate-900 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="font-semibold">After</div>
                <span className="text-xs text-white/70">sample</span>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="bg-white rounded-2xl p-2">
                  <AnimatedRing value={82} size={80} start={start} />
                </div>

                <div className="text-sm text-white/80 space-y-1">
                  <div>Skills: <span className="font-semibold text-white">84</span></div>
                  <div>Impact: <span className="font-semibold text-white">80</span></div>
                  <div>Brevity: <span className="font-semibold text-white">78</span></div>
                </div>
              </div>

              <div className="mt-6 text-xs text-white/70">Before → After</div>
              <div className="mt-3 space-y-3">
                {[
                  ["Overall", 52, 82],
                  ["Skills", 55, 84],
                  ["Impact", 48, 80],
                ].map(([label, b, a]) => (
                  <div key={String(label)} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>{label}</span>
                      <span>
                        {b} → <span className="font-semibold text-white">{a}</span>
                      </span>
                    </div>
                    <div className="opacity-70">
                      <AnimatedBar value={Number(b)} tone="before" start={start} />
                    </div>
                    <AnimatedBar value={Number(a)} tone="after" start={start} />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                  Recruiter-grade rewrite
                </span>
                <span className="text-xs text-white/70">Saved to My Reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* Keyword intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="text-sm text-slate-500 font-semibold">Keyword intelligence</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">Fill gaps naturally (no stuffing)</div>
            <div className="mt-2 text-slate-600">
              We extract required skills, tools, and metric keywords from the job description — then integrate them naturally.
            </div>

            <div className="mt-6 text-sm font-semibold text-slate-900">Example: missing → added</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Cross-functional", "SaaS", "Revenue tooling", "Stakeholders", "Experimentation"].map((k) => (
                <span
                  key={k}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-700",
                    kwOn
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800",
                  ].join(" ")}
                >
                  {kwOn ? `✓ ${k}` : `✕ ${k}`}
                </span>
              ))}
            </div>

            <div className="mt-6 text-xs text-slate-500">
              We never invent metrics. If unknown, we keep a TODO placeholder.
            </div>
          </div>

          {/* AI rewrite preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="text-sm text-slate-500 font-semibold">AI rewrite preview</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">Strong bullets recruiters can scan</div>
            <div className="mt-2 text-slate-600">
              We rewrite your experience into a clean ATS format with action verbs + structured impact.
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 font-semibold">Before</div>
                <div className="mt-2 text-sm text-slate-700">
                  Built a web app and supported cross-functional stakeholders.
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs text-emerald-700 font-semibold">After</div>
                <div className="mt-2 text-sm text-slate-900">
                  Led cross-functional roadmap execution across product, engineering, and finance, improving conversion by{" "}
                  <span className="font-semibold">+12%</span> (TODO: confirm metric).
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-600">
              <span>AI restructures bullets using action verbs + measurable impact formatting.</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center pt-6 space-y-4">
          <a
            href="#analyzer"
            className="group inline-flex items-center justify-center rounded-3xl px-14 py-5 text-lg font-semibold text-white
            bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500
            hover:from-indigo-500 hover:via-purple-500 hover:to-emerald-400
            shadow-2xl shadow-purple-500/30 transition-all duration-300 hover:scale-105"
          >
            See your score now
            <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>

          <div className="text-sm text-slate-500">Free ATS preview · No credit required</div>
        </div>
      </div>
    </section>
  );
}
export default function HomePage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");

  const [result, setResult] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [modalReason, setModalReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  const [track, setTrack] = useState<Track>("product_manager");
  const [seniority, setSeniority] = useState<Seniority>("mid");

  const how = useInViewOnce<HTMLDivElement>(0.25);

  const creditsByVariant: Record<string, number> = {
    "1320252": 1,
    "1332796": 5,
    "1332798": 10,
  };

  const signInWithGoogle = async () => {
    const supabase = supabaseBrowser();
  
    // ✅ next 경로는 localStorage로 전달 (redirectTo query 제거)
    try {
      localStorage.setItem("resumeup_oauth_next", "/");
    } catch {}
  
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
  };

  const refreshCredits = async () => {
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;

    if (!uid) {
      setCredits(null);
      return;
    }

    const { data: cRow } = await supabase.from("user_credits").select("balance").eq("user_id", uid).single();
    setCredits(Number(cRow?.balance ?? 0));
  };

  // ✅ Top up credits: logout -> login -> Lemon checkout, login -> Lemon checkout
  const topUpCreditsNow = async (variantId: string = DEFAULT_TOPUP_VARIANT_ID) => {
    setError(null);

    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;

    // 1) 비로그인: 로그인 먼저 → 로그인 후 바로 결제 이어가기
    if (!uid) {
      try {
        localStorage.setItem("resumeup_post_login_topup_variant", variantId);
      } catch { }
      await signInWithGoogle();
      return;
    }

    // 2) create route가 200자 검증을 걸고 있으니, top-up이라도 더미 텍스트로 통과
    const dummy = "Top-up only. ".repeat(30); // 약 360자
    const safeResume = resumeText && resumeText.length >= 200 ? resumeText : dummy;
    const safeJd = jdText && jdText.length >= 200 ? jdText : dummy;

    // toast after redirect
    try {
      const creditsByVariant: Record<string, number> = {
        "1320252": 1,
        "1332796": 5,
        "1332798": 10,
      };
      localStorage.setItem("resumeup_last_purchase_credits", String(creditsByVariant[variantId] ?? 1));
      localStorage.setItem("resumeup_last_purchase_ts", String(Date.now()));
    } catch { }

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: safeResume,
          jdText: safeJd,
          atsBefore: result?.atsScore ?? 0,
          variantId,
          userId: uid,
          track,
          seniority,
          topupOnly: true, // create route에서 무시해도 OK
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Checkout creation failed");

      // ✅ 무조건 레몬 체크아웃으로 이동
      window.location.href = json.checkoutUrl;
    } catch (e: any) {
      setError(e?.message ?? "Failed to start checkout");
    }
  };

  // ✅ "Unlock full rewrite" just means: top up credits (from $1)
  const handleUnlockClick = async () => {
    setError(null);
    await topUpCreditsNow(DEFAULT_TOPUP_VARIANT_ID);
  };

  const generateFullWithCredit = async () => {
    setError(null);

    const supabase = supabaseBrowser();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    if (!userId) {
      setError("Please sign in to generate a full report and use credits.");
      return;
    }

    if (!credits || credits < 1) {
      setModalReason("insufficient");
      setShowBundleModal(true);
      return;
    }

    const res = await fetch("/api/credit-session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText,
        jdText,
        atsBefore: result?.atsScore ?? 0,
        userId,
        track,
        seniority,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Failed to create credit session");
      return;
    }

    window.location.href = `/success?sid=${encodeURIComponent(data.sid)}`;
  };

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, mode: "preview", track, seniority }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  /** ========= Effects ========= */

  // restore inputs + context
  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_RESUME_KEY) || "";
      const j = localStorage.getItem(LS_JD_KEY) || "";
      if (r) setResumeText(r);
      if (j) setJdText(j);

      const t = localStorage.getItem(LS_TRACK_KEY);
      const s = localStorage.getItem(LS_SENIORITY_KEY);
      if (t && TRACKS.some((x) => x.key === (t as any))) setTrack(t as any);
      if (s && SENIORITIES.some((x) => x.key === (s as any))) setSeniority(s as any);
    } catch { }
  }, []);

  // persist inputs
  useEffect(() => {
    try {
      localStorage.setItem(LS_RESUME_KEY, resumeText);
      localStorage.setItem(LS_JD_KEY, jdText);
    } catch { }
  }, [resumeText, jdText]);

  // persist context
  useEffect(() => {
    try {
      localStorage.setItem(LS_TRACK_KEY, track);
      localStorage.setItem(LS_SENIORITY_KEY, seniority);
    } catch { }
  }, [track, seniority]);

  // email session + resume pending topup after login
  useEffect(() => {
    const supabase = supabaseBrowser();

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session ?? null;
      setUserEmail(s?.user?.email ?? null);
      setUserId(s?.user?.id ?? null);
    };

    syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setUserEmail(session?.user?.email ?? null);
        setUserId(session?.user?.id ?? null);

        // 로그인 직후: “top up 클릭→로그인→바로 결제” 이어가기
        if (event === "SIGNED_IN") {
          const v = localStorage.getItem("resumeup_post_login_topup_variant");
          if (v) {
            localStorage.removeItem("resumeup_post_login_topup_variant");
            setTimeout(() => topUpCreditsNow(v), 200);
          }
        }
      }
    );

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // credits refresh
  useEffect(() => {
    refreshCredits();
    const supabase = supabaseBrowser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refreshCredits());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // post-purchase toast
  useEffect(() => {
    try {
      const ts = Number(localStorage.getItem("resumeup_last_purchase_ts") || "0");
      const c = Number(localStorage.getItem("resumeup_last_purchase_credits") || "0");

      if (c > 0 && ts && Date.now() - ts < 10 * 60 * 1000) {
        setToast(`Credits +${c} added`);
        refreshCredits();
        localStorage.removeItem("resumeup_last_purchase_ts");
        localStorage.removeItem("resumeup_last_purchase_credits");
        setTimeout(() => setToast(null), 2500);
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingSummary = useMemo(() => {
    const gaps = result?.gaps || {};
    return (
      (gaps.required_skills?.length || 0) +
      (gaps.tools?.length || 0) +
      (gaps.metrics_keywords?.length || 0) +
      (gaps.soft_skills?.length || 0)
    );
  }, [result]);

  const topMissing = useMemo(() => {
    const g = result?.gaps || {};
    const all = [
      ...(g.required_skills ?? []),
      ...(g.tools ?? []),
      ...(g.metrics_keywords ?? []),
      ...(g.soft_skills ?? []),
    ].map((x: any) => String(x)).filter(Boolean);

    // 중복 제거
    return Array.from(new Set(all)).slice(0, 12);
  }, [result]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header (Pricing/Terms removed) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold text-slate-900">ResumeUp</div>
          </a>

          <div className="flex items-center gap-3">
            {userId ? (
              <div className="flex items-center gap-2">
                <a
                  href="/my-reports"
                  className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  My Reports
                </a>

                {credits !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (credits === 0) topUpCreditsNow(DEFAULT_TOPUP_VARIANT_ID);
                    }}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      credits === 0
                        ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                        : "bg-slate-900 border-slate-200 text-white",
                    ].join(" ")}
                    title={credits === 0 ? "Click to top up credits" : undefined}
                  >
                    Credits
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white/10 px-2">
                      {credits}
                    </span>
                    {credits === 0 && <span className="ml-1 text-xs underline underline-offset-2">Top up</span>}
                  </button>
                )}

                <button
                  onClick={signOut}
                  className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight">
              Improve your resume
              <br />
              with a <span className="text-emerald-400">score-first</span> report
            </h1>

            <p className="text-lg text-white/75 max-w-xl">
              Paste your resume + job description. Get an ATS-style score preview and keyword gap report. Unlock the full
              rewrite and after-score improvement report.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#analyzer"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Improve My Resume
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Pricing
              </a>
            </div>

            <div className="text-xs text-white/60">
              Tip: Add 2–3 measurable metrics (%, $, time saved). If unknown, we’ll keep TODO placeholders.
            </div>
          </div>

          {/* sample report card */}
          <div className="relative">
            <div className="rounded-3xl bg-white shadow-2xl p-6 md:p-8 text-slate-900 border border-black/5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Resume Report</div>
                <div className="text-xs text-slate-500">Sample</div>
              </div>

              <div className="mt-5 grid grid-cols-12 gap-4 items-start">
                <div className="col-span-5">
                  <div className="text-xs text-slate-500">Overall score</div>
                  <div className="mt-2 flex items-center gap-4">
                    <AnimatedRing value={78} size={96} />
                    <div className="space-y-1">
                      <div className="text-sm text-slate-600">
                        Skills <span className="font-semibold text-slate-900">80</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        Impact <span className="font-semibold text-slate-900">85</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        Brevity <span className="font-semibold text-slate-900">72</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-7">
                  <div className="text-xs text-slate-500">Before → After</div>
                  <div className="mt-3 space-y-3">
                    {[
                      ["Overall", 62, 78],
                      ["Skills", 68, 80],
                      ["Impact", 71, 85],
                    ].map(([label, b, a]) => (
                      <div key={String(label)} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{label}</span>
                          <span>
                            {b} → <span className="font-semibold text-slate-900">{a}</span>
                          </span>
                        </div>
                        <AnimatedBar value={Number(b)} tone="before" />
                        <AnimatedBar value={Number(a)} tone="after" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs text-slate-500">Missing keywords</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Cross-functional", "SaaS", "Revenue tooling", "Experimentation", "Stakeholders"].map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs text-rose-800"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Report includes</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Keyword gaps • After-score • Full rewrite
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-gradient-to-r from-slate-50 to-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">4.8/5</span>
            <span>average rating</span>
          </div>
          <div className="hidden md:block h-4 w-px bg-slate-200" />
          <div>Trusted by professionals applying to Shopify, Google, Amazon, and 100+ global teams</div>
          <div className="hidden md:block h-4 w-px bg-slate-200" />
          <div className="text-slate-500">Secure checkout · Credits never expire</div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div ref={how.ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* left mock */}
          <div className="anim-fadeup">
            <div className="rounded-[32px] bg-sky-50 border border-slate-200 p-8 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-14 -right-14 h-56 w-56 rounded-full bg-indigo-200/40 blur-2xl" />

              <div className="relative">
                <div className="absolute -top-6 -left-6 w-[85%] rounded-2xl bg-white border border-slate-200 shadow-sm p-4 opacity-80">
                  <div className="h-3 w-32 rounded bg-slate-200" />
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-5/6 rounded bg-slate-100" />
                    <div className="h-2 w-4/6 rounded bg-slate-100" />
                  </div>
                </div>

                <div className="relative rounded-3xl bg-white shadow-xl p-6 md:p-7 border border-black/5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Resume Report</div>
                    <div className="text-xs text-slate-500">Sample</div>
                  </div>

                  <div className="mt-5 grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-5">
                      <div className="text-xs text-slate-500">Overall score</div>
                      <div className="mt-2 flex items-center gap-4">
                        <AnimatedRing value={78} size={96} start={how.seen} />
                        <div className="space-y-1">
                          <div className="text-sm text-slate-600">
                            Skills <span className="font-semibold text-slate-900">80</span>
                          </div>
                          <div className="text-sm text-slate-600">
                            Impact <span className="font-semibold text-slate-900">85</span>
                          </div>
                          <div className="text-sm text-slate-600">
                            Brevity <span className="font-semibold text-slate-900">72</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-7">
                      <div className="text-xs text-slate-500">Before → After</div>
                      <div className="mt-3 space-y-3">
                        {[
                          ["Overall", 62, 78],
                          ["Skills", 68, 80],
                          ["Impact", 71, 85],
                        ].map(([label, b, a]) => (
                          <div key={String(label)} className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>{label}</span>
                              <span>
                                {b} → <span className="font-semibold text-slate-900">{a}</span>
                              </span>
                            </div>
                            <AnimatedBar value={Number(b)} tone="before" start={how.seen} />
                            <AnimatedBar value={Number(a)} tone="after" start={how.seen} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs text-slate-500">Missing keywords</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Cross-functional", "SaaS", "Revenue tooling"].map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs text-rose-800"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Report includes</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      Keyword gaps • After-score • Full rewrite
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 left-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold px-4 py-2 shadow border border-emerald-200">
                  Get the job faster
                </div>
              </div>
            </div>
          </div>

          {/* right steps */}
          <div className="anim-fadeup space-y-8">
            <div>
              <h2 className="text-4xl font-semibold leading-tight">
                Improve your resume <span className="text-emerald-500">in 3 simple steps</span>
              </h2>
              <p className="mt-4 text-slate-600 max-w-xl">
                You’ll see your score and gaps first — then generate a recruiter-grade rewrite with after-score improvements.
              </p>
            </div>

            <div className="relative pl-10 space-y-8">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />
              {[
                {
                  step: "STEP 1",
                  title: "Paste your resume + job description",
                  desc: "No upload required. Paste text and we analyze it instantly.",
                  icon: "📋",
                },
                {
                  step: "STEP 2",
                  title: "Get your free preview",
                  desc: "See ATS score + missing keywords + quick fixes (no payment).",
                  icon: "📊",
                },
                {
                  step: "STEP 3",
                  title: "Generate the full report (credits)",
                  desc: "Full rewrite + after-score report. Saved to My Reports for reuse.",
                  icon: "✨",
                },
              ].map((s) => (
                <div key={s.step} className="relative">
                  <div className="absolute -left-1 top-0 h-10 w-10 rounded-full bg-sky-50 border border-slate-200 flex items-center justify-center text-lg">
                    {s.icon}
                  </div>
                  <div className="ml-10">
                    <div className="text-xs text-slate-400 font-semibold tracking-wide">{s.step}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{s.title}</div>
                    <div className="mt-2 text-sm text-slate-600">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-center">
              <a
                href="#analyzer"
                className="inline-flex items-center justify-center rounded-2xl px-10 py-4 text-base font-semibold text-white
                bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300
                shadow-lg shadow-emerald-500/20 transition"
              >
                Get free preview
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <WhyResumeUpSection />

      {/* ANALYZER */}
      <section id="analyzer" className="mx-auto max-w-6xl px-6 py-20 space-y-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold">Start here</h2>
          <p className="text-slate-600">
            Paste your resume + job description. Get a detailed free preview (score + checklist + keyword gaps), then generate a full recruiter-grade report.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
          {/* role context */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mt-1">
              <div className="text-s font-semibold text-slate-500 mb-2">Role track</div>
              <div className="flex flex-wrap gap-2">
                {TRACKS.map((t) => {
                  const active = t.key === track;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTrack(t.key)}
                      className={[
                        "rounded-full px-3 py-2 text-sm font-semibold border transition",
                        active
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-s font-semibold text-slate-500 mb-2">Seniority</div>
              <div className="flex flex-wrap gap-2">
                {SENIORITIES.map((s) => {
                  const active = s.key === seniority;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSeniority(s.key)}
                      className={[
                        "rounded-full px-3 py-2 text-sm font-semibold border transition",
                        active
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 text-s text-slate-500">
              We’ll tailor keyword expectations, impact thresholds, and rewrite style to your selection.
            </div>
          </div>

          {/* inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-sm font-medium text-slate-700">Resume</div>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="h-56 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Paste resume..."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-sm font-medium text-slate-700">Job description</div>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="h-56 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Paste job description..."
              />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {credits && credits > 0 ? (
              <>
                <button
                  type="button"
                  onClick={generateFullWithCredit}
                  disabled={loading || resumeText.length < 200 || jdText.length < 200}
                  className="rounded-2xl px-10 py-4 text-base font-semibold text-white
                  bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300
                  shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  Generate full report now (uses 1 credit)
                </button>

                <span className="text-sm text-slate-600">
                  You have <b>{credits}</b> credits. Generate instantly.
                </span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={runPreview}
                  disabled={loading || resumeText.length < 200 || jdText.length < 200}
                  className="rounded-2xl px-10 py-4 text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {loading ? "Analyzing..." : "Get free preview"}
                </button>

                <button
                  type="button"
                  onClick={() => topUpCreditsNow(DEFAULT_TOPUP_VARIANT_ID)}
                  className="rounded-2xl px-8 py-4 text-base font-semibold
                  bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                  text-white shadow-lg transition"
                >
                  Top up credits
                </button>
              </>
            )}
          </div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</div>}


          {/* preview report (Keyword gaps UI like screenshot) */}
          {(credits === null || credits === 0) && result && (
            <div className="anim-fadeup rounded-3xl border border-slate-200 bg-white p-6 space-y-6">
              {/* Top summary row */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-900 text-white flex items-center justify-center">
                    <div className="text-xl font-semibold">
                      {Number(result.overallBefore ?? result.atsScore ?? 0)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-500">ATS preview score</div>
                    <div className="text-xl font-semibold text-slate-900">
                      {Number(result.overallBefore ?? result.atsScore ?? 0)}/100
                    </div>
                    <div className="text-sm text-slate-600">
                      Missing keywords: <span className="font-semibold">{missingSummary}</span>
                    </div>
                  </div>
                </div>

                {/* <button
                  type="button"
                  onClick={handleUnlockClick}
                  className="rounded-2xl px-8 py-4 text-base font-semibold text-slate-950
          bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
          shadow-xl shadow-emerald-500/25 transition"
                >
                  Unlock full rewrite - from $1
                </button> */}
              </div>

              {/* Keyword gaps section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Keyword gaps</div>
                    <div className="text-sm text-slate-600">
                      Missing keywords are the fastest way to increase your score.
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    The fastest way to increase your score.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Required skills", items: result.gaps?.required_skills ?? [] },
                    { title: "Tools", items: result.gaps?.tools ?? [] },
                    { title: "Metrics", items: result.gaps?.metrics_keywords ?? [] },
                    { title: "Soft skills", items: result.gaps?.soft_skills ?? [] },
                  ].map((box) => {
                    const items: string[] = (box.items as any[]).map((x) => String(x));
                    return (
                      <div
                        key={box.title}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-900">{box.title}</div>
                          <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-800">
                            Missing {items.length}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {items.length === 0 ? (
                            <div className="text-sm text-slate-500">No missing keywords in this category.</div>
                          ) : (
                            <>
                              {items.slice(0, 12).map((k) => (
                                <span
                                  key={k}
                                  className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs text-rose-800"
                                  title="Missing keyword"
                                >
                                  ✕ {k}
                                </span>
                              ))}
                              {items.length > 12 && (
                                <span className="text-xs text-slate-500">
                                  +{items.length - 12} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 text-white">

                  <div className="text-lg font-semibold">
                    Want the full rewrite + after-score improvement report?
                  </div>

                  <div className="mt-2 text-sm text-white/80">
                    Use credits to generate instantly — or top up in Pricing below.
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    {credits && credits > 0 ? (
                      <button
                        type="button"
                        onClick={generateFullWithCredit}
                        className="rounded-2xl px-10 py-4 text-base font-semibold text-slate-950
        bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
        shadow-xl shadow-emerald-500/25 transition"
                      >
                        Generate full report now (uses 1 credit)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUnlockClick}
                        className="rounded-2xl px-10 py-4 text-base font-semibold text-slate-950
        bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
        shadow-xl shadow-emerald-500/25 transition"
                      >
                        Unlock full rewrite - from $1
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* <div className="text-xs text-slate-500">
                We don’t sell your data. No keyword stuffing. If a metric is unknown, we keep a TODO placeholder instead of inventing numbers.
              </div> */}
            </div>
          )}

          <div className="text-xs text-slate-500">
            We don’t sell your data. No keyword stuffing. If a metric is unknown, we keep a TODO placeholder instead of inventing numbers.
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white py-24">
        <div className="mx-auto max-w-6xl px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-semibold">
              Invest once. <span className="text-emerald-400">Apply everywhere.</span>
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Each credit generates one full recruiter-grade report. Credits never expire and can be reused for multiple job applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: "1320252",
                title: "1 Report",
                price: "$1",
                save: null,
                bullets: [
                  "1 full recruiter-grade rewrite",
                  "After-score improvements",
                  "Saved in My Reports",
                  "Reusable credits",
                ],
                foot: "For a single application",
                variant: "basic",
              },
              {
                id: "1332796",
                title: "5 Reports",
                price: "$4.5",
                save: "Save 10% vs single purchases",
                bullets: [
                  "5 full recruiter-grade rewrites",
                  "After-score improvements",
                  "Saved in My Reports",
                  "Reusable credits",
                ],
                foot: "Best for active job search (5+ roles)",
                variant: "popular",
                badge: "Most Popular",
              },
              {
                id: "1332798",
                title: "10 Reports",
                price: "$8",
                save: "Save 20% vs single purchases",
                bullets: [
                  "10 full recruiter-grade rewrites",
                  "After-score improvements",
                  "Saved in My Reports",
                  "Reusable credits",
                  "Best value per report",
                ],
                foot: "Ideal for aggressive job search",
                variant: "value",
              },
            ].map((plan) => {
              const isPopular = plan.variant === "popular";
              return (
                <div
                  key={plan.id}
                  className={[
                    "relative rounded-3xl p-8 transition-all flex flex-col",
                    "border bg-white/10 border-white/20",
                    "hover:-translate-y-1 hover:bg-white/15",
                    isPopular ? "border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-105" : "",
                  ].join(" ")}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-400 text-slate-950 text-xs font-semibold px-4 py-1 rounded-full shadow-md">
                      {plan.badge}
                    </div>
                  )}

                  <div className="text-xl font-semibold text-white">{plan.title}</div>
                  <div className="mt-3 text-4xl font-semibold text-white">{plan.price}</div>

                  {plan.save && <div className="mt-2 text-xs font-semibold text-emerald-200">{plan.save}</div>}

                  <div className="mt-6 space-y-2 text-sm text-white/85">
                    {plan.bullets.map((b) => (
                      <div key={b} className="flex items-start gap-2">
                        <span className="text-emerald-300">✓</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 text-sm font-semibold text-white">{plan.foot}</div>

                  {/* ✅ buttons aligned: bottom fixed */}
                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      onClick={() => topUpCreditsNow(plan.id)}
                      className={[
                        "w-full rounded-2xl px-6 py-4 text-base font-semibold transition",
                        isPopular
                          ? "bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-500/25"
                          : "bg-white/10 text-white hover:bg-white/15 border border-white/20",
                      ].join(" ")}
                    >
                      Top up credits
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-10 text-center text-sm text-slate-500">
        <div className="space-x-4">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund">Refund</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="mt-4">© {new Date().getFullYear()} ResumeUp</div>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-lg border border-white/10 text-sm font-semibold">
            {toast}
          </div>
        </div>
      )}

      {/* Bundle Modal (kept) */}
      {showBundleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBundleModal(false)} />
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold text-slate-900">Get more credits</div>
                <div className="mt-1 text-sm text-slate-600">
                  {modalReason === "signin"
                    ? "Please sign in to attach credits to your account."
                    : "You don’t have enough credits to generate a new full report."}
                </div>
              </div>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => setShowBundleModal(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: "1320252", label: "1 Report", price: "$1", note: "Try once" },
                { id: "1332796", label: "5 Reports", price: "$4.5", note: "Most popular" },
                { id: "1332798", label: "10 Reports", price: "$8", note: "Best value" },
              ].map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setShowBundleModal(false);
                    topUpCreditsNow(plan.id);
                  }}
                  className={`rounded-2xl border p-4 text-left hover:shadow-sm transition ${plan.id === "1332796" ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
                    }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{plan.label}</div>
                  <div className="text-2xl font-semibold text-slate-900 mt-1">{plan.price}</div>
                  <div className="text-xs text-slate-600 mt-1">{plan.note}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 text-xs text-slate-500">Credits are tied to your account. Each full report uses 1 credit.</div>
          </div>
        </div>
      )}
    </main>
  );
}