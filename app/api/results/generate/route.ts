import { NextResponse } from "next/server";
import { supabaseAuthServer, supabaseServer } from "@/lib/supabaseServer";
import { POST as analyzePost } from "@/app/api/analyze/route";

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
    const { sid } = await req.json();
    if (!sid) {
      return NextResponse.json(
        { error: "Missing sid" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();
    const auth = await supabaseAuthServer();

    // 1️⃣ 로그인 사용자 확인
    const {
      data: { user },
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign-in required" },
        { status: 403 }
      );
    }
    const userId = user.id;



    // 2️⃣ 세션 조회
    const { data: session, error: sessErr } = await sb
      .from("checkout_sessions")
      .select("*")
      .eq("id", sid)
      .eq("user_id", userId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 404 }
      );
    }

    // 이미 생성된 경우 → 재사용 (idempotent)
    if (session.status === "fulfilled" && session.result_json) {
      return NextResponse.json({
        ok: true,
        alreadyGenerated: true,
      });
    }

    // 3️⃣ 결제 완료 여부 확인
    if (session.status !== "paid") {
      return NextResponse.json(
        { error: "Payment not confirmed" },
        { status: 403 }
      );
    }

    // top-up only purchase: no report generation
    const hasResume = typeof session.resume_text === "string" && session.resume_text.length >= 200;
    const hasJd = typeof session.jd_text === "string" && session.jd_text.length >= 200;
    if (!hasResume || !hasJd) {
      return NextResponse.json({ ok: true, topupOnly: true });
    }

    // credit-session flow already deducted 1 credit at session creation time.
    // checkout flow (credits > 0 from paid package) should deduct 1 here.
    const alreadyCharged = Number(session.credits ?? 0) === 0;
    if (!alreadyCharged) {
      // 4️⃣ 크레딧 대기 (웹훅 반영 대기)
      const balance = await waitForCredits(sb, userId, 12000);

      if (balance < 1) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 403 }
        );
      }

      // 5️⃣ 크레딧 차감
      const { data: creditRow, error: creditErr } = await sb
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (creditErr) {
        return NextResponse.json(
          { error: "Credit deduction failed" },
          { status: 500 }
        );
      }
      const current = Number(creditRow?.balance ?? 0);
      if (current < 1) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 403 }
        );
      }
      const { error: decErr } = await sb
        .from("user_credits")
        .update({ balance: current - 1 })
        .eq("user_id", userId);
      if (decErr) {
        return NextResponse.json(
          { error: "Credit deduction failed" },
          { status: 500 }
        );
      }
    }

    // 6️⃣ 실제 리포트 생성 (full analyze pipeline with scores + context)
    const analyzeReq = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "full", sid }),
    });
    const analyzeRes = await analyzePost(analyzeReq);
    const analyzeBody = await analyzeRes.json();

    if (!analyzeRes.ok) {
      await sb.rpc("add_credits", {
        p_user_id: userId,
        p_amount: 1,
      });
      return NextResponse.json(
        { error: analyzeBody?.error || "Report generation failed" },
        { status: analyzeRes.status || 500 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
