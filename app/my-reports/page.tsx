"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";

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

  const cls = `${base} bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 hover:from-emerald-300 hover:to-teal-200 shadow-xl shadow-emerald-500/20 ${className}`;

  if (href) return <a href={href} className={cls}>{children}</a>;

  return (
    <button type="button" onClick={onClick} className={cls}>
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

      const { data, error: listErr } = await supabase
        .from("checkout_sessions")
        .select("id,status,created_at,ats_before,ats_after,resume_text,jd_text,result_json,report_title")
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
      if (r.resume_text) localStorage.setItem(LS_RESUME_KEY, r.resume_text);
      if (r.jd_text) localStorage.setItem(LS_JD_KEY, r.jd_text);
      window.location.href = "/#analyzer";
    } catch {
      window.location.href = "/#analyzer";
    }
  };

  // ✅ FIX: Top up should go to pricing (bundle selection) not analyzer
  const buyCredits = () => {
    // If your home opens bundle modal via ?buy=1, keep it; just change hash to #pricing
    window.location.href = "/?buy=1&reason=insufficient#pricing";
  };

  const goAnalyzer = () => {
    window.location.href = "/#analyzer";
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header: minimal */}
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
              <PrimaryButton onClick={signInWithGoogle} className="px-5 py-2">
                Sign in
              </PrimaryButton>
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

                    {/* Top up link next to number */}
                    <button
                      type="button"
                      onClick={buyCredits}
                      className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                    >
                      + Top up credits
                    </button>
                  </div>

                  <div className="text-sm text-white/75">
                    Each full report uses <span className="font-semibold text-white">1 credit</span>.
                    Full rewrite + after-score improvements.
                  </div>
                </div>

                {/* Primary action */}
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={goAnalyzer}
                    className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-base font-semibold text-slate-950
                               bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
                               shadow-xl shadow-emerald-500/25 transition hover:scale-[1.02] active:scale-[0.99]"
                  >
                    Analyze another role
                  </button>

                  {/* ✅ outside the button */}
                  <div className="text-xs text-white/70">
                    Uses 1 credit per full report
                  </div>
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
                  <PrimaryButton onClick={goAnalyzer}>Start analysis</PrimaryButton>
                </div>
              </div>
            )}

            {/* ✅ Card layout: title/date first (left) -> score -> actions */}
            {!loading && completedRows.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {completedRows.map((r) => {
                  const before = r.ats_before;
                  const after = r.ats_after;
                  const hasScores = before !== null && after !== null;
                  const delta = hasScores ? after! - before! : null;

                  const title = deriveTitle(r);
                  const subtitle = formatDate(r.created_at);

                  return (
                    <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        {/* LEFT: title + date first */}
                        <div className="space-y-1 min-w-[280px]">
                          <div className="text-2xl font-semibold text-slate-900">
                            {title}
                          </div>
                          <div className="text-sm text-slate-600">{subtitle}</div>
                        </div>

                        {/* MIDDLE: score */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 min-w-[220px]">
                          <div className="text-xs text-slate-500">Score</div>
                          {hasScores ? (
                            <div className="mt-1 text-base font-semibold text-slate-900">
                              {clamp(before!)} → {clamp(after!)}{" "}
                              <span className={delta! >= 0 ? "text-emerald-700" : "text-rose-700"}>
                                ({delta! >= 0 ? "+" : ""}{delta} pts)
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 text-base font-semibold text-slate-900">
                              {before !== null ? clamp(before) : "—"} → —
                            </div>
                          )}
                        </div>

                        {/* RIGHT: actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <SecondaryButton onClick={() => reuseInputs(r)}>
                            Reuse inputs
                          </SecondaryButton>
                          <SecondaryButton href={`/results/${r.id}`} className="border-slate-900">
                            View report
                          </SecondaryButton>
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