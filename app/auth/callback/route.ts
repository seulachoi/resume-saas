// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  // Supabase OAuth 에러가 내려오는 경우도 처리
  const oauthError =
    url.searchParams.get("error") ||
    url.searchParams.get("error_code") ||
    url.searchParams.get("error_description");

  // ✅ Next.js 최신 버전: cookies()가 Promise -> 반드시 await
  const cookieStore = await cookies();

  // code 없거나 에러면 홈으로(에러 표시용 query)
  if (!code || oauthError) {
    const redirectUrl = new URL(next, url.origin);
    redirectUrl.searchParams.set("auth_error", "1");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ @supabase/ssr 권장: getAll / setAll
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  const redirectUrl = new URL(next, url.origin);
  if (error) redirectUrl.searchParams.set("auth_error", "1");

  return NextResponse.redirect(redirectUrl);
}