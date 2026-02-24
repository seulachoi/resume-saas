import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { v4 as uuidv4 } from "uuid";
import type { Track, Seniority } from "@/lib/prompts";

function inferReportTitle(jdText: string) {
  const lines = String(jdText || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const first = lines[0] || "ATS Optimization Report";

  const generic = ["about", "company", "overview", "job description"];
  const isGeneric = generic.some((g) => first.toLowerCase().startsWith(g));

  const candidate = isGeneric ? (lines[1] || first) : first;
  return candidate.slice(0, 60);
}

function isTrack(x: any): x is Track {
  return [
    "product_manager",
    "strategy_bizops",
    "data_analytics",
    "engineering",
    "marketing_growth",
    "sales_bd",
    "design_ux",
    "operations_program",
  ].includes(String(x));
}

function isSeniority(x: any): x is Seniority {
  return ["entry", "mid", "senior"].includes(String(x));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const resumeText = String(body?.resumeText ?? "");
    const jdText = String(body?.jdText ?? "");
    const atsBefore = Number(body?.atsBefore ?? 0);
    const userId = String(body?.userId ?? "");

    // ✅ NEW: context from UI
    const track: Track = isTrack(body?.track) ? body.track : "product_manager";
    const seniority: Seniority = isSeniority(body?.seniority) ? body.seniority : "mid";

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (resumeText.length < 200 || jdText.length < 200) {
      return NextResponse.json(
        { error: "resumeText and jdText must be at least 200 characters." },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    // 1) current credits
    const { data: creditRow, error: creditErr } = await sb
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (creditErr) {
      return NextResponse.json(
        { error: `Failed to read credits: ${creditErr.message}` },
        { status: 500 }
      );
    }

    const current = Number(creditRow?.balance ?? 0);
    if (current < 1) {
      return NextResponse.json({ error: "Not enough credits" }, { status: 400 });
    }

    // 2) deduct credit (best-effort atomicity)
    const { error: decErr } = await sb
      .from("user_credits")
      .update({ balance: current - 1 })
      .eq("user_id", userId);

    if (decErr) {
      return NextResponse.json(
        { error: `Failed to deduct credit: ${decErr.message}` },
        { status: 500 }
      );
    }

    // 3) create session
    const sid = uuidv4();

    const { error: insErr } = await sb.from("checkout_sessions").insert({
      id: sid,
      user_id: userId,
      status: "paid", // credit-based full generation is already "paid"
      resume_text: resumeText,
      jd_text: jdText,
      ats_before: Number.isFinite(atsBefore) ? atsBefore : 0,
      report_title: inferReportTitle(jdText),
      credits: 0,
      target_track: track,
      target_seniority: seniority,
    });

    // rollback credit if insert fails
    if (insErr) {
      await sb.from("user_credits").update({ balance: current }).eq("user_id", userId);
      return NextResponse.json(
        { error: `Failed to create session: ${insErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ sid });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}