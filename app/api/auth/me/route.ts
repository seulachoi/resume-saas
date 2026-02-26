import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  void req;
  const cookieStore = await cookies();
  const cookiesToApply: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  try {
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
              cookiesToApply.push({ name, value, options });
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.getUser();
    const payload =
      error || !data.user
        ? { user: null as { id: string; email: string | null } | null }
        : { user: { id: data.user.id, email: data.user.email ?? null } };

    const response = NextResponse.json(payload, { status: 200 });
    cookiesToApply.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch {
    const response = NextResponse.json({ user: null }, { status: 200 });
    cookiesToApply.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }
}
