import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { v4 as uuidv4 } from "uuid";

function inferReportTitle(jdText: string) {
  const lines = String(jdText || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const first = lines[0] || "Resume report";

  const generic = ["about", "company", "overview", "job description"];
  const isGeneric =
    generic.some((g) => first.toLowerCase().startsWith(g));

  const candidate = isGeneric ? (lines[1] || first) : first;

  return candidate.slice(0, 60);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resumeText, jdText, atsBefore, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    // 🔹 1. 현재 크레딧 조회
    const { data: creditRow } = await sb
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const current = Number(creditRow?.balance ?? 0);

    if (current < 1) {
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 400 }
      );
    }

    // 🔹 2. 크레딧 차감
    await sb
      .from("user_credits")
      .update({ balance: current - 1 })
      .eq("user_id", userId);

    // 🔹 3. 세션 생성
    const sid = uuidv4();

    await sb.from("checkout_sessions").insert({
      id: sid,
      user_id: userId,
      status: "paid",
      resume_text: resumeText,
      jd_text: jdText,
      ats_before: atsBefore ?? 0,
      report_title: inferReportTitle(jdText),
      credits: 0,
    });

    return NextResponse.json({ sid });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}