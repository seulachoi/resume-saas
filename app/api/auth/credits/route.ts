import { NextResponse } from "next/server";
import { supabaseAuthServer, supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const auth = await supabaseAuthServer();
    const { data } = await auth.auth.getUser();
    const user = data.user ?? null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = supabaseServer();
    const { data: row, error } = await db
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!row) {
      const { error: upErr } = await db
        .from("user_credits")
        .upsert({ user_id: user.id, balance: 0 }, { onConflict: "user_id" });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
      return NextResponse.json({ balance: 0 }, { status: 200 });
    }

    return NextResponse.json({ balance: Number(row.balance ?? 0) }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
