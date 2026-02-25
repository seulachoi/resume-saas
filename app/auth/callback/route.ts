import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL(`/auth/error?msg=missing_code`, url.origin));
  }

  // ✅ Next.js 16: cookies() is async
  const cookieStore = await cookies();

  // ✅ Response 객체를 먼저 생성
  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // ✅ Response 객체에 쿠키 설정
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ 코드를 세션으로 교환
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(
      new URL(`/auth/error?msg=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // ✅ 쿠키가 설정된 response 반환
  return response;
}