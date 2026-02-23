"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Row = {
  id: string;
  status: string;
  created_at: string;
  ats_before: number | null;
  ats_after: number | null;
};

export default function MyReportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      // 1) user
      const userRes = await supabase.auth.getUser();
      const u = userRes.data.user;

      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);

      if (!u?.id) {
        setCredits(null);
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) credits
      const creditRes = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", u.id)
        .single();

      setCredits(Number(creditRes.data?.balance ?? 0));

      // 3) reports
      const { data, error: listErr } = await supabase
        .from("checkout_sessions")
        .select("id,status,created_at,ats_before,ats_after")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false });

      if (listErr) throw new Error(listErr.message);
      setRows((data ?? []) as any);
    } catch (e: any) {
      setError(e.message);
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
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          "/my-reports"
        )}`,
      },
    });
  };

  const signOut = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold text-slate-900">ResumeUp</div>
          </a>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/"
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              Home
            </a>

            <a
              href="/#analyzer"
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              New analysis
            </a>

            {credits !== null && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                Credits
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white/10 px-2 text-white">
                  {credits}
                </span>
              </span>
            )}

            {userId ? (
              <button
                onClick={signOut}
                className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Sign out
              </button>
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

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">My Reports</h1>
            <p className="text-slate-600 text-sm">
              {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
            </p>
          </div>

          <button
            onClick={refresh}
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {/* Credits big card */}
        {userId && credits !== null && (
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white">
            <div className="text-sm text-white/70">Available credits</div>
            <div className="mt-2 text-5xl font-semibold">{credits}</div>
            <div className="mt-2 text-sm text-white/70">
              Each full report uses <span className="font-semibold text-white">1 credit</span>.
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <a
                href="/#analyzer"
                className="inline-flex rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                Use a credit (new analysis)
              </a>
              <a
                href="/"
                className="inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Home
              </a>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            {error}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            Loading…
          </div>
        ) : !userId ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-slate-900 font-semibold">Sign in required</div>
            <p className="mt-2 text-slate-600 text-sm">
              Sign in to view your saved reports and credits.
            </p>
            <button
              onClick={signInWithGoogle}
              className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign in with Google
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-slate-900 font-semibold">No reports yet</div>
            <p className="mt-2 text-slate-600 text-sm">
              Run an analysis and generate your first report.
            </p>
            <a className="mt-4 inline-block underline text-slate-900" href="/#analyzer">
              Create a report
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
              <div className="col-span-4">Created</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2">Before</div>
              <div className="col-span-2">After</div>
              <div className="col-span-1">Link</div>
            </div>

            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-2 px-4 py-4 text-sm border-b border-slate-100"
              >
                <div className="col-span-4 text-slate-700">
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="col-span-3">
                  <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs">
                    {r.status}
                  </span>
                </div>
                <div className="col-span-2">{r.ats_before ?? "-"}</div>
                <div className="col-span-2">{r.ats_after ?? "-"}</div>
                <div className="col-span-1">
                  <a
                    className="underline"
                    href={`/results/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}