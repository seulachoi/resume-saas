import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCredits(sb: any, userId: string, timeoutMs = 12000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data } = await sb
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const bal = Number(data?.balance ?? 0);
    if (bal >= 1) return bal;

    await sleep(800);
  }

  return 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sid = String(body?.sid ?? "");
    const userId = body?.userId ? String(body.userId) : "";

    if (!sid) {
      return NextResponse.json({ error: "Missing sid" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Sign-in required to use credits." },
        { status: 403 }
      );
    }

    const sb = supabaseServer();

    // 1) Load session
    const { data: session, error: sessErr } = await sb
      .from("checkout_sessions")
      .select("id,status,resume_text,jd_text,result_json,user_id")
      .eq("id", sid)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 404 });
    }

    // 2) If already generated, reuse (do NOT spend again)
    if (session.status === "fulfilled" && session.result_json) {
      return NextResponse.json({ ok: true, reused: true });
    }

    // 3) Payment must be confirmed
    if (session.status !== "paid" && session.status !== "fulfilled") {
      return NextResponse.json({ error: "Payment not confirmed" }, { status: 403 });
    }

    // 4) Attach user_id if missing (post-payment binding)
    if (!session.user_id) {
      await sb.from("checkout_sessions").update({ user_id: userId }).eq("id", sid);
    }

    // 5) Wait for credit top-up (prevents webhook race)
    const bal = await waitForCredits(sb, userId, 12000);
    if (bal < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
    }

    // 6) Spend 1 credit atomically
    // spend_credit(uid uuid) returns boolean in our earlier SQL.
    const { data: okSpend, error: spendErr } = await sb.rpc("spend_credit", {
      p_user_id: userId,
    });

    if (spendErr) {
      return NextResponse.json({ error: "Credit spend failed" }, { status: 500 });
    }
    if (!okSpend) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
    }

    // 7) Trigger full analyze (analyze route should persist result_json + mark fulfilled)
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    if (!base) {
      return NextResponse.json(
        { error: "Server misconfigured: NEXT_PUBLIC_BASE_URL missing" },
        { status: 500 }
      );
    }

    const res = await fetch(`${base}/api/analyze`, {
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

    if (!res.ok) {
      // Optional: refund credit (advanced). For now keep it simple.
      return NextResponse.json(
        { error: data?.error || "Analyze failed" },
        { status: 500 }
      );
    }

    // In case analyze didn't mark fulfilled for some reason, ensure it
    await sb.from("checkout_sessions").update({ status: "fulfilled" }).eq("id", sid);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}