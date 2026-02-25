"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // ✅ 브라우저에서 URL의 code를 읽고 PKCE verifier(브라우저 storage)로 세션 생성
      const { error } = await supabase.auth.getSession(); 
      // getSession() 호출만으로도 detectSessionInUrl 옵션이 켜져있으면 code 처리합니다.
      // (버전에 따라 exchangeCodeForSession을 직접 안 불러도 됨)

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";

      if (error) {
        window.location.replace(`/?auth_err=client_session_failed`);
        return;
      }

      // ✅ URL 정리 + 이동
      window.location.replace(next);
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 space-y-3">
        <div className="text-xl font-semibold text-slate-900">Signing you in…</div>
        <div className="text-sm text-slate-600">Finalizing secure sign-in. Please wait.</div>
        <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
          <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
        </div>
      </div>
    </main>
  );
}