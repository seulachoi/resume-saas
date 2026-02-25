"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"working" | "error">("working");
  const [msg, setMsg] = useState("Signing you in…");
  const [detail, setDetail] = useState("");

  const retryLogin = async () => {
    // 홈으로 보내서 다시 Sign in 누르게 (가장 단순/확실)
    window.location.replace("/?login_retry=1");
  };

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = supabaseBrowser();

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // ✅ next는 localStorage에서 복구 (없으면 /)
        let next = "/";
        try {
          next = localStorage.getItem("resumeup_oauth_next") || "/";
          localStorage.removeItem("resumeup_oauth_next");
        } catch {}

        // ✅ (A) code가 없으면: 지금 케이스 → 명확히 에러 표시
        if (!code) {
          setStatus("error");
          setMsg("Sign-in failed (missing code).");
          setDetail(
            "OAuth callback did not include a `code`. This usually happens when the redirect URL is not handled as a PKCE callback. Please retry sign-in."
          );
          return;
        }

        // ✅ (B) code가 있으면: PKCE exchange
        setMsg("Finalizing secure sign-in…");
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setStatus("error");
          setMsg("Sign-in failed.");
          setDetail(error.message);
          return;
        }

        // ✅ 세션 확인
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setStatus("error");
          setMsg("Sign-in failed.");
          setDetail("Session was not created. Please retry.");
          return;
        }

        window.location.replace(next);
      } catch (e: any) {
        setStatus("error");
        setMsg("Sign-in failed.");
        setDetail(e?.message ?? "Unknown error");
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 space-y-4">
        <div className="text-xl font-semibold text-slate-900">ResumeUp</div>
        <div className="text-slate-700">{msg}</div>

        {status === "working" && (
          <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
          </div>
        )}

        {status === "error" && (
          <>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
              {detail}
            </div>

            <button
              onClick={retryLogin}
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
      </div>
    </main>
  );
}