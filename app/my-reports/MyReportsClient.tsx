"use client";

import React, { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_TRACK_KEY = "resumeup_track";
const LS_SENIORITY_KEY = "resumeup_seniority";

// ✅ Most popular bundle
const DEFAULT_TOPUP_VARIANT_ID = "1332796";

type CheckoutRow = {
  id: string;
  created_at: string;
  ats_before: number | null;
  ats_after: number | null;
  report_title: string | null;
  target_track: string | null;
  target_seniority: string | null;
  resume_text: string | null;
  jd_text: string | null;
  status: string | null;
};

function clamp(n: number, min = 0, max = 100) {
  const v = Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, v));
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
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
  return t ? map[String(t)] ?? String(t) : "General";
}

function prettySeniority(s?: string | null) {
  const map: Record<string, string> = { entry: "Entry", mid: "Mid", senior: "Senior" };
  return s ? map[String(s)] ?? String(s) : "Mid";
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "purple" | "green";
}) {
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
  const cls =
    "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition " +
    "bg-slate-900 text-white hover:bg-slate-800 " +
    className;

  if (href) return <a className={cls} href={href}>{children}</a>;
  return <button className={cls} onClick={onClick} type="button">{children}</button>;
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

  if (href) return <a className={cls} href={href}>{children}</a>;
  return <button className={cls} onClick={onClick} type="button">{children}</button>;
}

function AccentButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-8 py-4 text-base font-semibold text-slate-950",
        "bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200",
        "shadow-xl shadow-emerald-500/25 transition hover:scale-[1.02] active:scale-[0.99]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function MyReportsClient({
  signedIn,
  email,
  credits,
  rows,
}: {
  signedIn: boolean;
  email: string | null;
  credits: number;
  rows: CheckoutRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const completedRows = useMemo(() => rows ?? [], [rows]);

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
    window.location.href = "/";
  };

  const goAnalyzer = () => {
    window.location.href = "/#analyzer";
  };

  // ✅ secure: we do NOT read DB here. We just start checkout.
  // If your /api/checkout/create currently requires userId, keep it as-is for now,
  // but the recommended secure next step is: server should derive user from cookie.
  const topUpCreditsNow = async (variantId = DEFAULT_TOPUP_VARIANT_ID) => {
    setError(null);
    if (!signedIn) {
      await signInWithGoogle();
      return;
    }

    try {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) {
        await signInWithGoogle();
        return;
      }

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topupOnly: true,
          variantId,
          userId: uid, // (next step: remove and let server read cookie)
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Checkout creation failed");
      window.location.href = j.checkoutUrl;
    } catch (e: any) {
      setError(e?.message ?? "Failed to start checkout");
    }
  };

  const reuseInputs = (r: CheckoutRow) => {
    try {
      if (r.resume_text) localStorage.setItem(LS_RESUME_KEY, r.resume_text);
      if (r.jd_text) localStorage.setItem(LS_JD_KEY, r.jd_text);

      if (r.target_track) localStorage.setItem(LS_TRACK_KEY, String(r.target_track));
      if (r.target_seniority) localStorage.setItem(LS_SENIORITY_KEY, String(r.target_seniority));

      window.location.href = "/#analyzer";
    } catch {
      window.location.href = "/#analyzer";
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header (same family as Home/My Reports) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold text-slate-900">ResumeUp</div>
          </a>

          <div className="flex items-center gap-2 flex-wrap">
            {signedIn && (
              <span className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border bg-emerald-50 border-emerald-200 text-emerald-900">
                Credits
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white px-2 text-slate-900 border border-slate-200">
                  {credits}
                </span>
              </span>
            )}

            <SecondaryButton href="/my-reports" className="border-slate-900 text-slate-900">
              My Results
            </SecondaryButton>

            {signedIn ? (
              <SecondaryButton onClick={signOut}>Sign out</SecondaryButton>
            ) : (
              <PrimaryButton onClick={signInWithGoogle}>Sign in</PrimaryButton>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-5xl font-semibold">My Results</h1>
          <p className="text-sm text-slate-600 mt-1">
            {signedIn && email ? `Signed in as ${email}` : "Not signed in"}
          </p>
        </div>

        {!signedIn && (
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

        {signedIn && (
          <>
            {/* Credits hero */}
            <div className="rounded-3xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div className="space-y-2">
                  <div className="text-sm text-white/70 font-semibold">Available credits</div>

                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="text-6xl font-semibold leading-none">{credits}</div>
                    <button
                      type="button"
                      onClick={() => topUpCreditsNow(DEFAULT_TOPUP_VARIANT_ID)}
                      className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                    >
                      + Top up credits
                    </button>
                  </div>

                  <div className="text-sm text-white/75">
                    Each full report uses <span className="font-semibold text-white">1 credit</span>.
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2">
                  <AccentButton onClick={goAnalyzer}>Analyze another role</AccentButton>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                {error}
              </div>
            )}

            {completedRows.length === 0 && (
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

            {completedRows.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {completedRows.map((r) => {
                  const before = r.ats_before;
                  const after = r.ats_after;
                  const hasScores = before !== null && after !== null;
                  const delta = hasScores ? after! - before! : null;

                  const title = (r.report_title && r.report_title.trim()) ? r.report_title.trim() : "ATS Optimization Report";

                  return (
                    <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-2 min-w-[360px]">
                          <div className="text-2xl font-semibold text-slate-900">{title}</div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Tag tone="purple">{prettyTrack(r.target_track)}</Tag>
                            <Tag tone="green">{prettySeniority(r.target_seniority)}</Tag>
                            <Tag>Personalized</Tag>
                          </div>

                          <div className="text-sm text-slate-600">{formatDate(r.created_at)}</div>

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

                        <div className="flex items-center gap-3 flex-wrap">
                          <SecondaryButton onClick={() => reuseInputs(r)}>Reuse inputs</SecondaryButton>
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