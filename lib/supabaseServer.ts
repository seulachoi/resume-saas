// lib/supabaseServer.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ✅ 1) Admin(DB) client — SERVICE ROLE
 * - API에서 checkout_sessions, user_credits 등 서버측 DB 작업용
 * - auth 세션/유저 판별 용도로 쓰면 안 됩니다 (항상 anon처럼 보일 수 있음)
 */
export function supabaseServer(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_URL is not defined");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * ✅ 2) Auth(SSR) client — ANON + cookies
 * - 서버 컴포넌트/route에서 로그인 세션(쿠키)을 읽어야 할 때 사용
 * - 예: 서버에서 현재 로그인 유저 id/email 확인 등
 */
export async function supabaseAuthServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  if (!anon) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // ✅ Server Component에서는 쿠키를 set할 수 없으므로
        // 읽기 전용으로만 사용 (middleware나 route handler에서만 set 가능)
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Server Component에서 호출 시 무시
          // Route Handler나 Middleware에서만 쿠키 설정 가능
        }
      },
    },
  });
}