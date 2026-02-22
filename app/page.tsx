"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_SID_KEY = "resumeup_sid";

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900"
    >
      {children}
    </button>
  );
}

function ScoreRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      className="h-16 w-16 rounded-full"
      style={{
        background: `conic-gradient(#0f172a ${v * 3.6}deg, #e2e8f0 0deg)`,
      }}
    >
      <div className="h-full w-full p-2">
        <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
          <div className="text-sm font-semibold text-slate-900">{v}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<any>(null); // preview result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const signInWithGoogle = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },

    });

  };
  const signOut = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const supabase = supabaseBrowser();

    // 1) 최초 세션 확인
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });

    // 2) 로그인/로그아웃 변화 감지
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
  // restore input
  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_RESUME_KEY) || "";
      const j = localStorage.getItem(LS_JD_KEY) || "";
      if (r) setResumeText(r);
      if (j) setJdText(j);
    } catch { }
  }, []);

  // persist input
  useEffect(() => {
    try {
      localStorage.setItem(LS_RESUME_KEY, resumeText);
      localStorage.setItem(LS_JD_KEY, jdText);
    } catch { }
  }, [resumeText, jdText]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, mode: "preview" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const unlock = async (variantId: string) => {
    setError(null);

    if (!result) {
      setError("Run preview first.");
      return;
    }

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText,
          atsBefore: result.overallBefore ?? result.atsScore ?? 0,
          variantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout creation failed");

      localStorage.setItem(LS_SID_KEY, data.sid);
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message);
    }
  };

  const missingSummary = useMemo(() => {
    const gaps = result?.gaps || {};
    return (
      (gaps.required_skills?.length || 0) +
      (gaps.tools?.length || 0) +
      (gaps.metrics_keywords?.length || 0) +
      (gaps.soft_skills?.length || 0)
    );
  }, [result]);

  const previewOverall = useMemo(() => {
    return Number(result?.overallBefore ?? result?.atsScore ?? 0);
  }, [result]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold">ResumeUp</div>
          </div>
          <div className="flex items-center gap-3">
            <a className="text-sm text-slate-600 hover:text-slate-900" href="#pricing">
              Pricing
            </a>
            <a className="text-sm text-slate-600 hover:text-slate-900" href="/terms">
              Terms
            </a>
            {userEmail ? (
              <div className="flex items-center gap-2">
                <a
                  href="/my-reports"
                  className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  My Reports
                </a>
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
          {/* LEFT */}
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {["Secure checkout", "English-first output", "No keyword stuffing", "No invented metrics"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
                >
                  {t}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
              Improve your resume with a
              <span className="text-emerald-400"> score-first report</span>
            </h1>

            <p className="text-lg text-white/75 max-w-xl">
              Paste your resume + job description. Get an ATS-style score preview and keyword gap report.
              Unlock the full rewrite and after-score improvement report.
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

          {/* RIGHT: sample report mock */}
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
                    <div className="relative h-24 w-24">
                      <div className="absolute inset-0 rounded-full border-[10px] border-slate-200"></div>
                      <div className="absolute inset-0 rounded-full border-[10px] border-emerald-500 border-t-transparent rotate-45"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-3xl font-semibold">78</div>
                      </div>
                    </div>
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
                        <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
                          <div className="h-2 bg-slate-300" style={{ width: `${b}%` }} />
                        </div>
                        <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
                          <div className="h-2 bg-emerald-500" style={{ width: `${a}%` }} />
                        </div>
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
            </div>

            <div className="absolute -bottom-6 left-6 rounded-2xl bg-white/90 backdrop-blur border border-black/5 shadow px-4 py-3 hidden md:block">
              <div className="text-xs text-slate-500">Report includes</div>
              <div className="text-sm font-semibold text-slate-900">
                Keyword gaps • After-score • Full rewrite
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANALYZER */}
      <section id="analyzer" className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Analyzer</h2>
          <p className="text-slate-600">Run preview first, then choose a bundle to unlock.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-sm font-medium text-slate-700">Resume</div>
            <textarea
              className="w-full h-64 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text..."
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-sm font-medium text-slate-700">Job description</div>
            <textarea
              className="w-full h-64 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={runPreview} disabled={loading || resumeText.length < 200 || jdText.length < 200}>
            {loading ? "Analyzing..." : "Run preview"}
          </PrimaryButton>

          <span className="text-xs text-slate-500">Minimum 200 characters each</span>
        </div>

        {/* Bundle buttons (disabled until preview exists) */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 text-white">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-white/70 font-semibold">Unlock full report</div>
              <div className="text-xs text-white/60 mt-1">
                Choose a bundle (USD) • Includes after-score + keyword report + rewritten resume
              </div>
            </div>
            <div className="text-xs text-white/60">
              {result ? "Ready to unlock" : "Run preview first"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {[
              { id: "1320252", label: "1 Report", price: "$1", note: "Try once", popular: false },
              { id: "1332796", label: "5 Reports", price: "$4.5", note: "Most popular", popular: true },
              { id: "1332798", label: "10 Reports", price: "$8", note: "Best value", popular: false },
            ].map((plan) => (
              <button
                key={plan.id}
                onClick={() => unlock(plan.id)}
                disabled={!result}
                className={[
                  "relative text-left rounded-2xl border p-5 transition",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  plan.popular
                    ? "border-emerald-400/40 bg-white/10 ring-2 ring-emerald-400/20 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
                ].join(" ")}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{plan.label}</div>
                    <div className="text-sm text-white/70">{plan.note}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-semibold">{plan.price}</div>
                    <div className="text-xs text-white/60">one-time</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div
                    className={[
                      "w-full rounded-xl px-4 py-3 text-sm font-semibold text-center",
                      plan.popular
                        ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                        : "bg-white/10 text-white hover:bg-white/15",
                    ].join(" ")}
                  >
                    {result ? "Unlock & Generate Now" : "Run preview first"}
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/60">
                  After payment → results page (saved link)
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            {error}
          </div>
        )}

        {/* PREVIEW RESULT CARD */}
        {result && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <div className="text-xl font-semibold">{previewOverall}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Preview score</div>
                  <div className="text-xl font-semibold text-slate-900">
                    Overall {previewOverall}/100
                  </div>
                  <div className="text-sm text-slate-600">
                    Missing keywords: <span className="font-semibold">{missingSummary}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Skills", result.subscoresBefore?.skills ?? 0],
                  ["Impact", result.subscoresBefore?.impact ?? 0],
                  ["Brevity", result.subscoresBefore?.brevity ?? 0],
                ].map(([label, v]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center"
                  >
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="text-lg font-semibold text-slate-900">{Number(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-900">Top missing keywords</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...(result.gaps?.required_skills ?? []),
                  ...(result.gaps?.tools ?? []),
                  ...(result.gaps?.metrics_keywords ?? []),
                ]
                  .slice(0, 12)
                  .map((k: string) => (
                    <span
                      key={k}
                      className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs text-rose-800"
                    >
                      {k}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-500">
              After payment, you will be redirected to a dedicated report page: <code>/results/[sid]</code>
            </div>
          </div>
        )}
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <p className="mt-2 text-slate-600">Bundles available in USD.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "1 Report", price: "$1", note: "Try once" },
              { label: "5 Reports", price: "$4.5", note: "Most popular" },
              { label: "10 Reports", price: "$8", note: "Best value" },
            ].map((p) => (
              <div key={p.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-lg font-semibold">{p.label}</div>
                <div className="mt-1 text-3xl font-semibold">{p.price}</div>
                <div className="text-sm text-slate-600">{p.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500 space-x-4">
            <a href="/terms" className="hover:text-slate-900">Terms</a>
            <a href="/privacy" className="hover:text-slate-900">Privacy</a>
            <a href="/refund" className="hover:text-slate-900">Refund</a>
            <a href="/contact" className="hover:text-slate-900">Contact</a>
          </div>
        </div>
      </section>
    </main>
  );
}