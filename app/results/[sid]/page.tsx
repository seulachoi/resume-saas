"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportView, resultJsonToReport } from "@/components/ReportView";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ sid: string }>;
}) {
  const [sid, setSid] = useState<string | null>(null);
  const [report, setReport] = useState<ReturnType<typeof resultJsonToReport> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSid(p.sid));
  }, [params]);

  useEffect(() => {
    if (!sid) return;

    setLoading(true);
    setError(null);

    fetch(`/api/results/${sid}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Result not found");
          if (res.status === 403) throw new Error("Payment not confirmed");
          throw new Error("Failed to load result");
        }
        return res.json();
      })
      .then((data) => {
        setReport(resultJsonToReport(data));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sid]);

  if (loading || !sid) {
    return (
      <main className="max-w-5xl mx-auto p-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="text-gray-400">Loading your result...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <h2 className="text-xl font-semibold text-rose-200">{error}</h2>
          <p className="mt-2 text-sm text-gray-400">
            If you just completed payment, the result may take a moment to be ready.
            Try refreshing or return to the analyzer.
          </p>
          <Link
            href="/#analyzer"
            className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Back to Analyzer
          </Link>
        </div>
      </main>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Resume Report</h1>
          <p className="text-sm text-gray-400 mt-1">
            Save or share this link to revisit your result anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200"
          >
            Copy link
          </button>
          <Link
            href="/#analyzer"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200"
          >
            New analysis
          </Link>
        </div>
      </div>

      <ReportView report={report} />

      <footer className="pt-8 border-t border-white/10 text-sm text-gray-400 space-x-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <a href="/terms" className="hover:text-white">Terms</a>
        <a href="/privacy" className="hover:text-white">Privacy</a>
      </footer>
    </main>
  );
}
