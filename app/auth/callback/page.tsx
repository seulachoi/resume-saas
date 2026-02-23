"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = supabaseBrowser();

        // Exchange the OAuth "code" for a session and persist it
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          setMsg(`Login failed: ${error.message}`);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const next = params.get("next") || "/";

        window.location.replace(next);
      } catch (e: any) {
        setMsg(`Login failed: ${e?.message ?? "Unknown error"}`);
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-xl font-semibold text-slate-900">ResumeUp</div>
        <div className="mt-3 text-slate-700">{msg}</div>
        <div className="mt-4 h-2 w-full rounded bg-slate-100 overflow-hidden">
          <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
        </div>
      </div>
    </main>
  );
}