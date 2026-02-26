import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/";
  const response = NextResponse.redirect(new URL(next, url.origin));

  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  for (const c of all) {
    // Supabase auth cookies: sb-<project-ref>-auth-token(.0/.1...)
    if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) {
      response.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    }
  }

  return response;
}
