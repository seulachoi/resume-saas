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
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      setEmail(user?.email ?? null);

      if (!user?.id) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("checkout_sessions")
        .select("id,status,created_at,ats_before,ats_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setRows(data as any);
      setLoading(false);
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-white p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My Reports</h1>
            <p className="text-slate-600 text-sm">
              {email ? `Signed in as ${email}` : "Not signed in"}
            </p>
          </div>

          <a
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            href="/#analyzer"
          >
            New analysis
          </a>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            Loading…
          </div>
        ) : !email ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-slate-900 font-semibold">Sign in required</div>
            <p className="mt-2 text-slate-600 text-sm">
              Please sign in from the homepage to view your saved reports.
            </p>
            <a className="mt-4 inline-block underline text-slate-900" href="/">
              Go to homepage
            </a>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-slate-900 font-semibold">No reports yet</div>
            <p className="mt-2 text-slate-600 text-sm">
              Run an analysis and purchase a bundle to generate your first report.
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