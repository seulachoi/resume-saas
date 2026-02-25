// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  const cookieStore = await cookies();

  // 1) Supabase/Google이 내려준 에러 파라미터가 있는지 먼저 확인
  const oauthErr =
    url.searchParams.get("error") ||
    url.searchParams.get("error_code") ||
    url.searchParams.get("error_description");

  // ✅ code가 없으면: 어떤 파라미터로 돌아왔는지 표시
  if (!code) {
    const to = new URL(next, url.origin);
    to.searchParams.set("auth_err", "missing_code");
    to.searchParams.set("oauth_err", oauthErr ? String(oauthErr).slice(0, 120) : "none");
    // callback에 실제로 들어온 query key 목록(원인 추적)
    to.searchParams.set(
      "keys",
      Array.from(url.searchParams.keys()).slice(0, 12).join(",") || "none"
    );
    return NextResponse.redirect(to);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // 2) code -> session 교환
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const to = new URL(next, url.origin);
    to.searchParams.set("auth_err", "exchange_failed");
    to.searchParams.set("msg", encodeURIComponent(String(error.message).slice(0, 160)));
    return NextResponse.redirect(to);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}