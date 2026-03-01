import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

  const { data: exData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_err=exchange_failed&msg=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // Best-effort beta grant at callback time (reduces post-login delay on home)
  try {
    const betaEnabled =
      process.env.BETA_FREE_UNLOCK_ENABLED === "true" ||
      process.env.NEXT_PUBLIC_BETA_FREE_UNLOCK === "true";
    if (betaEnabled) {
      const userId =
        (exData as any)?.user?.id ||
        (exData as any)?.session?.user?.id ||
        null;

      if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const amount = Number(process.env.BETA_FREE_UNLOCK_CREDITS || "10") || 10;
        const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { error: insErr, data: inserted } = await sb
          .from("beta_credit_grants")
          .insert({
            user_id: userId,
            granted_credits: amount,
            source: "beta_unlock_v1",
            granted_at: new Date().toISOString(),
          })
          .select("user_id")
          .maybeSingle();

        const canGrant = !insErr && Boolean(inserted?.user_id);
        if (canGrant) {
          const { data: cRow } = await sb
            .from("user_credits")
            .select("balance")
            .eq("user_id", userId)
            .maybeSingle();
          const current = Number(cRow?.balance ?? 0);
          if (!cRow) {
            await sb.from("user_credits").upsert({ user_id: userId, balance: current + amount }, { onConflict: "user_id" });
          } else {
            await sb.from("user_credits").update({ balance: current + amount }).eq("user_id", userId);
          }
        }
      }
    }
  } catch {
    // Do not block login redirect on beta grant issues.
  }

  // ✅ 이 response에 Set-Cookie가 붙어서 내려감
  return response;
}
