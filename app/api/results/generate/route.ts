import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import OpenAI from "openai";

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

    // 1️⃣ 로그인 사용자 확인
    const {
      data: { user },
    } = await sb.auth.getUser();

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

    // 4️⃣ 크레딧 대기 (웹훅 반영 대기)
    const balance = await waitForCredits(sb, userId, 12000);

    if (balance < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 403 }
      );
    }

    // 5️⃣ 크레딧 차감 (atomic)
    const { error: spendErr } = await sb.rpc("spend_credit", {
      uid: userId,
    });

    if (spendErr) {
      return NextResponse.json(
        { error: "Credit deduction failed" },
        { status: 500 }
      );
    }

    // 6️⃣ 실제 리포트 생성
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const rewriteResp = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "Rewrite the resume in a concise ATS-optimized format.",
        },
        {
          role: "user",
          content: session.resume_text + "\n\nJD:\n" + session.jd_text,
        },
      ],
    });

    const rewrittenResume =
      rewriteResp.choices[0].message.content || "";

    // 7️⃣ 결과 저장
    await sb
      .from("checkout_sessions")
      .update({
        status: "fulfilled",
        result_json: {
          rewrittenResume,
        },
      })
      .eq("id", sid);

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}