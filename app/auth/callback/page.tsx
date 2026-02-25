"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Signing you in…");
  const [errorMsg, setErrorMsg] = useState("");

  const run = async () => {
    try {
      const supabase = supabaseBrowser();

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/";

      if (!code) {
        setStatus("error");
        setMessage("Missing auth code.");
        setErrorMsg("No code was found in the callback URL.");
        return;
      }

      setMessage("Finalizing secure sign-in…");

      // ✅ 핵심: PKCE code -> session 교환 (브라우저 storage의 code_verifier 사용)
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setStatus("error");
        setMessage("Sign-in failed.");
        setErrorMsg(error.message);
        return;
      }

      // ✅ 세션이 실제로 생겼는지 한 번 더 확인
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus("error");
        setMessage("Sign-in failed.");
        setErrorMsg("Session was not created. Please try again.");
        return;
      }

      // ✅ URL 정리 후 이동
      window.location.replace(next);
    } catch (e: any) {
      setStatus("error");
      setMessage("Sign-in failed.");
      setErrorMsg(e?.message ?? "Unknown error");
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 space-y-4">
        <div className="text-xl font-semibold text-slate-900">ResumeUp</div>

        <div className="text-slate-700">{message}</div>

        {status === "working" && (
          <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
          </div>
        )}

        {status === "error" && (
          <>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
              {errorMsg}
            </div>

            <button
              onClick={run}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Retry sign-in
            </button>

            <a
              href="/"
              className="w-full inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Back to Home
            </a>
          </>
        )}

        <div className="text-xs text-slate-500">
          If this keeps failing, it’s usually caused by blocked cookies/storage or a domain mismatch.
        </div>
      </div>
    </main>
  );
}