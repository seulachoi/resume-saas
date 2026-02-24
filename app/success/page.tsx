"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Status = "loading" | "need_signin" | "generating" | "error";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function SuccessPage() {
  const [sid, setSid] = useState<string>("");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Preparing…");
  const [error, setError] = useState<string>("");

  // Wait for user session (prevents OAuth loop)
  const waitForUser = async (maxMs = 7000) => {
    const supabase = supabaseBrowser();
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (uid) return uid;
      await sleep(400);
    }
    return null;
  };

  const runGenerate = async (sidValue: string) => {
    setStatus("generating");
    setError("");
    setMessage("Confirming payment…");

    // Prefer having a user (bind purchase to account + credits)
    const uid = await waitForUser(7000);

    if (!uid) {
      setStatus("need_signin");
      setMessage("Sign in required to attach this purchase to your account.");
      return;
    }

    setMessage("Generating… (this can take up to ~90s)");

    const res = await fetch("/api/results/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ userId is optional; still send for post-payment binding if session user_id is missing
      body: JSON.stringify({ sid: sidValue, userId: uid }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = String(data?.error || "Failed to complete the purchase");
      setStatus("error");
      setError(msg);
      return;
    }

    // ✅ If this was a top-up only purchase, go to My Results (credits page)
    if (data?.topupOnly) {
      window.location.href = "/my-reports";
      return;
    }

    // Otherwise, this purchase generates a report
    window.location.href = `/results/${sidValue}`;
  };

  useEffect(() => {
    // Remove hash fragments (avoid loop)
    if (window.location.hash) {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }

    const params = new URLSearchParams(window.location.search);
    const sidFromQuery = params.get("sid") || "";
    setSid(sidFromQuery);

    if (!sidFromQuery) {
      setStatus("error");
      setError("Missing sid in URL.");
      return;
    }

    runGenerate(sidFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    const supabase = supabaseBrowser();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      `/success?sid=${sid}`
    )}`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 space-y-4">
        <div className="text-xl font-semibold text-slate-900">ResumeUp</div>

        <div className="text-slate-700">{message}</div>

        {status === "generating" && (
          <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
          </div>
        )}

        {status === "need_signin" && (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              Please sign in to attach this purchase to your account and apply credits.
            </div>

            <button
              onClick={signIn}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 w-full"
            >
              Sign in with Google
            </button>

            <button
              onClick={() => runGenerate(sid)}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 w-full"
            >
              I already signed in — continue
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
            {error}
          </div>
        )}

        <div className="text-xs text-slate-500">
          You’ll be redirected to the generated report page.
        </div>
      </div>
    </main>
  );
}