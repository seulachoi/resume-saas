"use client";

import { useEffect, useState } from "react";

const LS_SID_KEY = "resumeup_sid";

export default function SuccessPage() {
  const [msg, setMsg] = useState("Confirming payment & generating your report...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sid") || "";

    if (!sid) {
      setMsg("Missing session id. Please return to the homepage.");
      return;
    }

    localStorage.setItem(LS_SID_KEY, sid);

    (async () => {
      try {
        // Ask server to generate full report and persist it
        const res = await fetch("/api/results/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sid }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to generate report");

        window.location.href = `/results/${sid}`;
      } catch (e: any) {
        setMsg(e.message);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-xl font-semibold text-slate-900">ResumeUp</div>
        <div className="mt-3 text-slate-600">{msg}</div>
        <div className="mt-4 h-2 w-full rounded bg-slate-100 overflow-hidden">
          <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
        </div>
        <div className="mt-4 text-xs text-slate-500">
          This usually takes 30–90 seconds depending on resume length.
        </div>
      </div>
    </main>
  );
}