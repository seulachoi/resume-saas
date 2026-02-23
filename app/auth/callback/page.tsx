"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // 0) 이미 세션이 있으면 바로 next로
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const next = new URLSearchParams(window.location.search).get("next") || "/";
        window.location.replace(next);
        return;
      }

      // 1) URL에서 code만 추출
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/";

      if (!code) {
        setMsg("Login failed: missing auth code. Please try again.");
        return;
      }

      // 2) code -> session 교환
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMsg(`Login failed: ${error.message}`);
        return;
      }

      // 3) next로 이동
      window.location.replace(next);
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