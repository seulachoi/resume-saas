import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // ✅ redirect response를 먼저 만들고, 여기에 쿠키를 “응답으로” 심습니다.
  const redirectUrl = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectUrl);

  if (!code) {
    // 에러시 홈으로
    return NextResponse.redirect(new URL(`/?auth_error=missing_code`, url.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 요청 쿠키 읽기
        getAll() {
          return cookieStore.getAll();
        },
        // ✅ 여기서 "반드시" response에 Set-Cookie를 심어야 함
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_err=exchange_failed&msg=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // ✅ 이 response에 Set-Cookie가 붙어서 내려감
  return response;
}
