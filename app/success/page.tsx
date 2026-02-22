"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SuccessPage() {
  const [sid, setSid] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "need_signin" | "generating" | "error"
  >("loading");
  const [message, setMessage] = useState<string>("Preparing your report…");
  const [error, setError] = useState<string>("");

  // helper: run generate
  const runGenerate = async (sidValue: string) => {
    setStatus("generating");
    setMessage("Confirming payment & generating your report…");
    setError("");

    const supabase = supabaseBrowser();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    // If not signed in, stop here
    if (!userId) {
      setStatus("need_signin");
      setMessage("Sign-in required to use credits.");
      return;
    }

    const res = await fetch("/api/results/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: sidValue, userId }),
    });

    const data = await res.json();

    if (!res.ok) {
        const msg = String(data?.error || "Failed to generate report");
      
        // ✅ Only show modal if truly insufficient credits
        if (res.status === 403 && msg.toLowerCase().includes("insufficient")) {
          window.location.href = "/?buy=1&reason=insufficient#analyzer";
          return;
        }
      
        // ✅ If sign-in required, show sign-in UI (do NOT open buy modal)
        if (res.status === 403 && msg.toLowerCase().includes("sign-in")) {
          setStatus("need_signin");
          setMessage("Sign-in required to use credits.");
          return;
        }
      
        setStatus("error");
        setError(msg);
        return;
      }

    // success → go to results
    window.location.href = `/results/${sidValue}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sidFromQuery = params.get("sid") || "";
    setSid(sidFromQuery);

    if (!sidFromQuery) {
      setStatus("error");
      setError("Missing sid in URL.");
      return;
    }

    // auto-generate
    runGenerate(sidFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/success?sid=${encodeURIComponent(
          sid
        )}`,
      },
    });
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
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
              Please sign in to attach this purchase to your account and use credits.
            </div>
            <button
              onClick={signIn}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 w-full"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
            {error}
          </div>
        )}

        <div className="text-xs text-slate-500">
          This usually takes 30–90 seconds depending on resume length.
        </div>
      </div>
    </main>
  );
}