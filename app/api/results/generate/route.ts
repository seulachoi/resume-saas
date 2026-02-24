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

function isTopupOnlySession(session: any) {
  // ✅ topup-only: no resume/jd stored (purchase credits only)
  const r = typeof session.resume_text === "string" ? session.resume_text.trim() : "";
  const j = typeof session.jd_text === "string" ? session.jd_text.trim() : "";
  return r.length < 200 || j.length < 200;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sid = String(body?.sid ?? "");
    // userId is OPTIONAL now (we prefer session.user_id)
    const userIdFromBody = body?.userId ? String(body.userId) : "";

    if (!sid) {
      return NextResponse.json({ error: "Missing sid" }, { status: 400 });
    }

    const sb = supabaseServer();

    // 1) Load session (include context columns if you want later)
    const { data: session, error: sessErr } = await sb
      .from("checkout_sessions")
      .select("id,status,resume_text,jd_text,result_json,user_id,credits")
      .eq("id", sid)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 404 });
    }

    // Resolve user id
    const resolvedUserId = String(session.user_id ?? userIdFromBody ?? "");

    if (!resolvedUserId) {
      return NextResponse.json(
        { error: "Sign-in required to proceed." },
        { status: 403 }
      );
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
      await sb.from("checkout_sessions").update({ user_id: resolvedUserId }).eq("id", sid);
    }

    // ✅ TOP-UP ONLY FLOW:
    // If this session has no resume/jd (credit purchase only), do not spend credit, do not analyze.
    if (isTopupOnlySession(session)) {
      // wait for webhook to top up credits (prevents race)
      await waitForCredits(sb, resolvedUserId, 12000);
      // mark fulfilled so it doesn't keep trying
      await sb.from("checkout_sessions").update({ status: "fulfilled" }).eq("id", sid);

      return NextResponse.json({ ok: true, topupOnly: true });
    }

    // 5) Wait for credit top-up (prevents webhook race) - for paid flow
    const bal = await waitForCredits(sb, resolvedUserId, 12000);
    if (bal < 1) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
    }

    // 6) Spend 1 credit atomically (RPC)
    const { data: okSpend, error: spendErr } = await sb.rpc("spend_credit", {
      p_user_id: resolvedUserId,
    });

    if (spendErr) {
      return NextResponse.json({ error: "Credit spend failed" }, { status: 500 });
    }
    if (!okSpend) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
    }

    // 7) Trigger full analyze (now analyze loads resume/jd + context from DB using sid)
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
      // ✅ Only sid + mode are needed (analyze pulls everything from DB in full mode)
      body: JSON.stringify({
        mode: "full",
        sid,
        resumeText: "", // not used in full (DB wins)
        jdText: "",     // not used in full (DB wins)
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || "Analyze failed" },
        { status: 500 }
      );
    }

    // Ensure fulfilled
    await sb.from("checkout_sessions").update({ status: "fulfilled" }).eq("id", sid);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}