"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Status = "loading" | "need_signin" | "generating" | "error";
type AuthMeResponse = {
  user: { id: string; email: string | null } | null;
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function SuccessPage() {
  const [sid, setSid] = useState<string>("");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("Preparing your purchase…");
  const [error, setError] = useState<string>("");

  // Wait for a user session (prevents OAuth loop)
  const waitForUser = async (maxMs = 7000) => {
    const start = Date.now();

    while (Date.now() - start < maxMs) {
      let uid: string | null = null;
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data: AuthMeResponse = await res.json();
        uid = data.user?.id ?? null;
      } catch {
        uid = null;
      }
      if (uid) return uid;
      await sleep(400);
    }
    return null;
  };

  const runGenerate = async (sidValue: string) => {
    setStatus("generating");
    setError("");
    setMessage("Finalizing your purchase…");

    // Prefer having a user: attach purchase to account + apply credits reliably
    const uid = await waitForUser(7000);

    if (!uid) {
      setStatus("need_signin");
      setMessage("Sign in required to attach this purchase to your account.");
      return;
    }

    // Single, non-duplicated message (no “if you purchased…” text)
    setMessage("Generating your personalized report… (up to ~90s)");

    const res = await fetch("/api/results/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: sidValue }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setError(String(data?.error || "Failed to complete the purchase"));
      return;
    }

    // If this was a top-up only purchase, go to My Results (credits)
    if (data?.topupOnly) {
      window.location.href = "/my-reports";
      return;
    }

    // Otherwise, this purchase generates a report
    window.location.href = `/results/${sidValue}`;
  };

  useEffect(() => {
    // Remove hash fragments (avoid loops)
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
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 space-y-5">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900" />
          <div className="text-xl font-semibold text-slate-900">ResumeUp</div>
        </div>

        {/* Status message */}
        <div className="text-slate-700">{message}</div>

        {status === "generating" && (
          <div className="space-y-3">
            <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
              <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
            </div>
            <div className="text-xs text-slate-500">
              Please keep this tab open. You’ll be redirected automatically.
            </div>
          </div>
        )}

        {status === "need_signin" && (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              Sign in to link this purchase to your account and apply credits.
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

            <div className="text-xs text-slate-500">
              If the sign-in popup was blocked, allow popups and try again.
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
            {error}
          </div>
        )}

        {/* Small footer hint */}
        <div className="text-xs text-slate-500">
          After payment, we either (1) top up credits or (2) generate your report, depending on what you purchased.
        </div>
      </div>
    </main>
  );
}
