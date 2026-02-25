"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// ✅ use the same enums as prompts/analyze
import type { Track, Seniority } from "@/lib/prompts";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_TRACK_KEY = "resumeup_track";
const LS_SENIORITY_KEY = "resumeup_seniority";

// ✅ Lemon bundle default (Most popular = 5 credits)
const DEFAULT_TOPUP_VARIANT_ID = "1332796";

type CheckoutRow = {
  id: string;
  status: string | null;
  created_at: string;
  ats_before: number | null;
  ats_after: number | null;
  resume_text?: string | null;
  jd_text?: string | null;
  result_json?: any | null;
  report_title?: string | null;

  // ✅ NEW: stored context columns
  target_track?: Track | string | null;
  target_seniority?: Seniority | string | null;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function PrimaryButton({
  children,
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition " +
    "focus:outline-none focus:ring-4 focus:ring-emerald-300/40";

  const cls = `${base} bg-slate-900 text-white hover:bg-slate-800 ${className}`;

  if (href) return <a href={href} className={cls}>{children}</a>;

  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function AccentButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-8 py-4 text-base font-semibold text-slate-950",
        "bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200",
        "shadow-xl shadow-emerald-500/25 transition hover:scale-[1.02] active:scale-[0.99]",
        "focus:outline-none focus:ring-4 focus:ring-emerald-300/40",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition " +
    "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 " +
    className;

  if (href) return <a href={href} className={cls}>{children}</a>;

  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function CreditPill({ credits }: { credits: number }) {
  const low = credits <= 1;
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border",
        low
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : "bg-emerald-50 border-emerald-200 text-emerald-900",
      ].join(" ")}
    >
      Credits
      <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white px-2 text-slate-900 border border-slate-200">
        {credits}
      </span>
    </span>
  );
}

function deriveTitle(row: CheckoutRow): string {
  if (row.report_title && row.report_title.trim()) return row.report_title.trim();

  const r = row.result_json || {};
  const rp =
    r.roleProfile ||
    r.role_profile ||
    r.role_profile_json ||
    r.roleprofile ||
    null;

  const primaryRole =
    rp?.primary_role || rp?.primaryRole || r?.roleProfile?.primary_role || null;

  if (primaryRole) return String(primaryRole);

  return "ATS Optimization Report";
}

function prettyTrack(t?: string | null) {
  const map: Record<string, string> = {
    product_manager: "Product Manager",
    strategy_bizops: "Strategy / BizOps",
    data_analytics: "Data & Analytics",
    engineering: "Software Engineering",
    marketing_growth: "Marketing / Growth",
    sales_bd: "Sales / Business Dev",
    design_ux: "Design / UX",
    operations_program: "Operations / Program",
  };
  return t ? (map[String(t)] ?? String(t)) : "General";
}

function prettySeniority(s?: string | null) {
  const map: Record<string, string> = {
    entry: "Entry",
    mid: "Mid",
    senior: "Senior",
  };
  return s ? (map[String(s)] ?? String(s)) : "Mid";
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "purple" | "green" }) {
  const cls =
    tone === "purple"
      ? "bg-indigo-50 border-indigo-200 text-indigo-900"
      : tone === "green"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export default function MyReportsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      const uRes = await supabase.auth.getUser();
      const u = uRes.data.user ?? null;

      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);

      if (!u?.id) {
        setCredits(null);
        setRows([]);
        setLoading(false);
        return;
      }

      const cRes = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", u.id)
        .single();

      setCredits(Number(cRes.data?.balance ?? 0));

      // ✅ include target_track/target_seniority
      const { data, error: listErr } = await supabase
        .from("checkout_sessions")
        .select(
          "id,status,created_at,ats_before,ats_after,resume_text,jd_text,result_json,report_title,target_track,target_seniority"
        )
        .eq("user_id", u.id)
        .order("created_at", { ascending: false });

      if (listErr) throw new Error(listErr.message);

      setRows((data ?? []) as any);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const supabase = supabaseBrowser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/my-reports")}`,
      },
    });
  };

  const signOut = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
  };

  const completedRows = useMemo(
    () => rows.filter((r) => r.status === "fulfilled"),
    [rows]
  );

  const reuseInputs = (r: CheckoutRow) => {
    try {
      // 1) resume + jd
      if (r.resume_text) localStorage.setItem(LS_RESUME_KEY, r.resume_text);
      if (r.jd_text) localStorage.setItem(LS_JD_KEY, r.jd_text);
  
      // 2) track/seniority (prefer columns, fallback to result_json)
      const ctxTrack =
        (r.target_track as any) ||
        r.result_json?.selectedContext?.track ||
        "product_manager";
  
      const ctxSeniority =
        (r.target_seniority as any) ||
        r.result_json?.selectedContext?.seniority ||
        "mid";
  
      localStorage.setItem(LS_TRACK_KEY, String(ctxTrack));
      localStorage.setItem(LS_SENIORITY_KEY, String(ctxSeniority));
  
      // jump to analyzer
      window.location.href = "/#analyzer";
    } catch {
      window.location.href = "/#analyzer";
    }
  };

  const goAnalyzer = () => {
    window.location.href = "/#analyzer";
  };

  // ✅ Top up goes straight to Lemon checkout (no bundle selection)
  const topUpCreditsNow = async () => {
    setError(null);

    try {
      const supabase = supabaseBrowser();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      if (!uid) {
        setError("Please sign in to purchase credits.");
        return;
      }

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topupOnly: true,
          variantId: DEFAULT_TOPUP_VARIANT_ID,
          userId: uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout creation failed");

      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e?.message ?? "Failed to start checkout");
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold text-slate-900">ResumeUp</div>
          </a>

          <div className="flex items-center gap-2 flex-wrap">
            {userId && credits !== null && <CreditPill credits={credits} />}
            <SecondaryButton href="/my-reports" className="border-slate-900 text-slate-900">
              My Results
            </SecondaryButton>
            {userId ? (
              <SecondaryButton onClick={signOut}>Sign out</SecondaryButton>
            ) : (
              <PrimaryButton onClick={signInWithGoogle}>Sign in</PrimaryButton>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-5xl font-semibold">My Results</h1>
          <p className="text-sm text-slate-600 mt-1">
            {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
          </p>
        </div>

        {!userId && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="text-xl font-semibold">Sign in to see your saved results</div>
            <p className="mt-2 text-slate-600">
              Credits and report history are tied to your account.
            </p>
            <div className="mt-6">
              <PrimaryButton onClick={signInWithGoogle}>Sign in with Google</PrimaryButton>
            </div>
          </div>
        )}

        {userId && (
          <>
            {/* Credits hero card */}
            <div className="rounded-3xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div className="space-y-2">
                  <div className="text-sm text-white/70 font-semibold">Available credits</div>

                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="text-6xl font-semibold leading-none">
                      {credits ?? 0}
                    </div>

                    <button
                      type="button"
                      onClick={topUpCreditsNow}
                      className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                    >
                      + Top up credits
                    </button>
                  </div>

                  <div className="text-sm text-white/75">
                    Each full report uses <span className="font-semibold text-white">1 credit</span>. Personalized rewrite + after-score improvements.
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2">
                  <AccentButton onClick={goAnalyzer}>
                    Analyze another role
                  </AccentButton>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                {error}
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                Loading…
              </div>
            )}

            {!loading && completedRows.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8">
                <div className="text-xl font-semibold">No completed results yet</div>
                <p className="mt-2 text-slate-600">
                  Results will appear here once completed.
                </p>
                <div className="mt-6">
                  <AccentButton onClick={goAnalyzer}>Start analysis</AccentButton>
                </div>
              </div>
            )}

            {/* Report cards */}
            {!loading && completedRows.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {completedRows.map((r) => {
                  const before = r.ats_before;
                  const after = r.ats_after;
                  const hasScores = before !== null && after !== null;
                  const delta = hasScores ? after! - before! : null;

                  const title = deriveTitle(r);
                  const subtitle = formatDate(r.created_at);

                  // ✅ context from columns; fallback to result_json.selectedContext
                  const ctx = r.target_track || r.result_json?.selectedContext?.track || null;
                  const lvl = r.target_seniority || r.result_json?.selectedContext?.seniority || null;

                  return (
                    <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        {/* LEFT: title + badges + date */}
                        <div className="space-y-2 min-w-[360px]">
                          <div className="text-2xl font-semibold text-slate-900">
                            {title}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Tag tone="purple">{prettyTrack(String(ctx ?? ""))}</Tag>
                            <Tag tone="green">{prettySeniority(String(lvl ?? ""))}</Tag>
                            <Tag>Personalized</Tag>
                          </div>

                          <div className="text-sm text-slate-600">{subtitle}</div>

                          {/* Score */}
                          <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 inline-block">
                            <div className="text-xs text-slate-500">Score</div>
                            {hasScores ? (
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {clamp(before!)} → {clamp(after!)}{" "}
                                <span className={delta! >= 0 ? "text-emerald-700" : "text-rose-700"}>
                                  ({delta! >= 0 ? "+" : ""}{delta} pts)
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {before !== null ? clamp(before) : "—"} → —
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT: actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <SecondaryButton onClick={() => reuseInputs(r)}>
                            Reuse inputs
                          </SecondaryButton>

                          <PrimaryButton href={`/results/${r.id}`} className="px-6 py-3">
                            View report
                          </PrimaryButton>
                        </div>
                      </div>

                      {(!r.resume_text || !r.jd_text) && (
                        <div className="mt-4 text-xs text-slate-500">
                          Note: This report doesn’t have stored inputs for quick reuse.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}