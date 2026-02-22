import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { sid } = await req.json();
    if (!sid) return NextResponse.json({ error: "Missing sid" }, { status: 400 });

    const sb = supabaseServer();
    const { data: session, error } = await sb
      .from("checkout_sessions")
      .select("status,resume_text,jd_text,ats_before,result_json")
      .eq("id", sid)
      .single();

    if (error || !session) return NextResponse.json({ error: "Invalid sid" }, { status: 404 });
    if (session.status !== "paid" && session.status !== "fulfilled") {
      return NextResponse.json({ error: "Payment not confirmed" }, { status: 403 });
    }

    // If already generated, do nothing (idempotent)
    if (session.result_json && session.status === "fulfilled") {
      return NextResponse.json({ ok: true, reused: true });
    }

    // Call analyze full (server-to-server)
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText: session.resume_text,
        jdText: session.jd_text,
        mode: "full",
        sid,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error || "Analyze failed" }, { status: 500 });

    // analyze route should already save fulfilled + result_json.
    // But to be safe, ensure status is fulfilled.
    await sb.from("checkout_sessions").update({ status: "fulfilled" }).eq("id", sid);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}