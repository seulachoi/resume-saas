// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  // code가 없으면 (해시 토큰으로 돌아온 케이스 등) 에러로 처리
  if (!code) {
    const to = new URL(`/?auth_error=missing_code`, url.origin);
    return NextResponse.redirect(to);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Next cookies().set은 객체도 지원
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // 원인 추적용 (너무 길면 잘릴 수 있으니 code만)
    const to = new URL(`/?auth_error=exchange_failed`, url.origin);
    to.searchParams.set("msg", encodeURIComponent(error.message.slice(0, 120)));
    return NextResponse.redirect(to);
  }

  // 정상 -> next로
  return NextResponse.redirect(new URL(next, url.origin));
}