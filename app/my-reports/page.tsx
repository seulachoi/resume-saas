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
  report_title?: string | null; // ✅ NEW
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white " +
    "bg-slate-900 hover:bg-slate-800 transition";

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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold " +
    "border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-900";

  if (href) return <a href={href} className={cls}>{children}</a>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function CreditBadge({ credits }: { credits: number }) {
  const tone = credits <= 1 ? "warning" : "success";
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border",
        tone === "warning"
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

function deriveLabel(row: CheckoutRow): { title: string; subtitle: string } {
  // ✅ report_title(=JD 기반 제목) 우선
  if (row.report_title && row.report_title.trim()) {
    return {
      title: row.report_title.trim(),
      subtitle: formatDate(row.created_at),
    };
  }

  // fallback: roleProfile
  const r = row.result_json || {};
  const rp =
    r.roleProfile ||
    r.role_profile ||
    r.role_profile_json ||
    r.roleprofile ||
    null;

  const primaryRole =
    rp?.primary_role || rp?.primaryRole || r?.roleProfile?.primary_role || null;

  const industry =
    rp?.industry || r?.roleProfile?.industry || null;

  const title = primaryRole
    ? `${String(primaryRole)} report`
    : "Resume report";

  const subtitleParts: string[] = [];
  if (industry) subtitleParts.push(String(industry));
  subtitleParts.push(formatDate(row.created_at));

  return { title, subtitle: subtitleParts.join(" • ") };
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

      // user
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

      // credits
      const cRes = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", u.id)
        .single();

      setCredits(Number(cRes.data?.balance ?? 0));

      // reports
      const { data, error: listErr } = await supabase
        .from("checkout_sessions")
        .select("id,status,created_at,ats_before,ats_after,resume_text,jd_text,result_json,report_title") // ✅ include report_title
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
    return () => {
      sub.subscription.unsubscribe();
    };
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

  const buyCredits = () => {
    window.location.href = "/?buy=1&reason=insufficient#analyzer";
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
            <a className="text-sm text-slate-600 hover:text-slate-900" href="/#pricing">
              Pricing
            </a>
            <a className="text-sm text-slate-600 hover:text-slate-900" href="/terms">
              Terms
            </a>

            {userId ? (
              <>
                {credits !== null && <CreditBadge credits={credits} />}
                <SecondaryButton href="/#analyzer">New analysis</SecondaryButton>
                <SecondaryButton href="/my-reports">My Reports</SecondaryButton>
                <SecondaryButton onClick={signOut}>Sign out</SecondaryButton>
              </>
            ) : (
              <PrimaryButton onClick={signInWithGoogle}>Sign in</PrimaryButton>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Title */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-semibold">My Reports</h1>
            <p className="text-sm text-slate-600">
              {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
            </p>
          </div>
        </div>

        {/* Not signed in */}
        {!userId && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="text-xl font-semibold">Sign in to see your saved reports</div>
            <p className="mt-2 text-slate-600">
              Your credits and report history are tied to your account.
            </p>
            <div className="mt-6">
              <PrimaryButton onClick={signInWithGoogle}>Sign in with Google</PrimaryButton>
            </div>
          </div>
        )}

        {/* Signed in */}
        {userId && (
          <>
            {/* Credits CTA bar */}
            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-7 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-sm text-white/70">Available credits</div>
                <div className="mt-1 text-4xl font-semibold">{credits ?? 0}</div>
                <div className="mt-2 text-sm text-white/70">
                  Use credits for recruiter-grade full rewrites and after-score reports.
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href="/#analyzer"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
                >
                  Use a credit (new analysis)
                </a>

                {(credits ?? 0) <= 1 && (
                  <button
                    type="button"
                    onClick={buyCredits}
                    className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 border border-white/20 transition"
                  >
                    Buy more credits
                  </button>
                )}
              </div>
            </div>

            {/* Errors */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                Loading…
              </div>
            )}

            {/* Empty state (completed only) */}
            {!loading && completedRows.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-8">
                <div className="text-xl font-semibold">No completed reports yet</div>
                <p className="mt-2 text-slate-600">
                  Reports appear here once completed.
                </p>
                <div className="mt-6">
                  <PrimaryButton href="/#analyzer">Start analysis</PrimaryButton>
                </div>
              </div>
            )}

            {/* Completed reports only */}
            {!loading && completedRows.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {completedRows.map((r) => {
                  const before = r.ats_before;
                  const after = r.ats_after;
                  const hasScores = before !== null && after !== null;
                  const delta = hasScores ? (after! - before!) : null;

                  const label = deriveLabel(r);

                  return (
                    <div
                      key={r.id}
                      className="rounded-3xl border border-slate-200 bg-white p-6"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        {/* ✅ Title 강조: JD 기반 title 크게, 날짜는 작게 */}
                        <div className="space-y-1">
                          <div className="text-xl font-semibold text-slate-900">
                            {label.title}
                          </div>
                          <div className="text-sm text-slate-600">
                            {label.subtitle}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {hasScores ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-xs text-slate-500">Score</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {clamp(before!)} → {clamp(after!)}{" "}
                                <span className={delta! >= 0 ? "text-emerald-700" : "text-rose-700"}>
                                  ({delta! >= 0 ? "+" : ""}{delta} pts)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-xs text-slate-500">Score</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {before !== null ? clamp(before) : "—"} → —
                              </div>
                            </div>
                          )}

                          {/* ✅ 버튼 순서 변경: Reuse -> View */}
                          <SecondaryButton onClick={() => reuseInputs(r)}>
                            Reuse inputs
                          </SecondaryButton>

                          <PrimaryButton href={`/results/${r.id}`}>
                            View report
                          </PrimaryButton>
                        </div>
                      </div>

                      {/* Optional hint if inputs missing */}
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