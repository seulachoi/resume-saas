import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  JD_EXTRACT_SYSTEM,
  jdExtractUser,
  ROLE_INFER_SYSTEM,
  roleInferUser,
  rewriteSystem,
  rewriteUser,
  type RoleProfile,
  type Track,
  type Seniority,
} from "@/lib/prompts";
import { supabaseServer } from "@/lib/supabaseServer";

/** ---------- helpers ---------- */

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
}

function wordCount(text: string) {
  return (text.trim().match(/\S+/g) || []).length;
}

function bulletLineRatio(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return 0;
  const bullet = lines.filter((l) => /^[-•*]\s+/.test(l)).length;
  return bullet / lines.length;
}

function impactSignalsRatio(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { signalRatio: 0, todoLines: 0, totalLines: 0 };

  const signalRe =
    /(\d)|(%|\$|₩)|\b(usd|krw)\b|\b(days?|weeks?|months?|yrs?|years?)\b|\b(x)\b/i;
  const todoRe = /todo:\s*add metric/i;

  const signalLines = lines.filter((l) => signalRe.test(l)).length;
  const todoLines = lines.filter((l) => todoRe.test(l)).length;

  return {
    signalRatio: signalLines / lines.length,
    todoLines,
    totalLines: lines.length,
  };
}

function computeBrevityScore(text: string) {
  const w = wordCount(text);
  const br = bulletLineRatio(text);

  let base: number;
  if (w <= 450) base = 85;
  else if (w <= 900) base = 100;
  else if (w <= 1300) base = 80 - ((w - 900) / 400) * 20;
  else base = 60 - ((w - 1300) / 700) * 30;

  let bonus = 0;
  if (br >= 0.5) bonus = 10;
  else if (br >= 0.35) bonus = 5;

  return clamp(Math.round(base + bonus));
}

function computeImpactScore(text: string, seniority: Seniority) {
  const { signalRatio, todoLines } = impactSignalsRatio(text);

  let base: number;
  if (seniority === "senior") {
    if (signalRatio >= 0.2) base = 95;
    else if (signalRatio >= 0.12) base = 80;
    else if (signalRatio > 0) base = 60;
    else base = 35;
  } else if (seniority === "mid") {
    if (signalRatio >= 0.2) base = 90;
    else if (signalRatio >= 0.1) base = 75;
    else if (signalRatio > 0) base = 60;
    else base = 40;
  } else {
    if (signalRatio >= 0.12) base = 85;
    else if (signalRatio >= 0.06) base = 70;
    else if (signalRatio > 0) base = 60;
    else base = 45;
  }

  const penalty = todoLines * 3;
  return clamp(Math.round(base - penalty));
}

function computeSkillsScoreByTrack(track: Track, rReq: number, rTools: number, rMetrics: number) {
  let wReq = 0.6;
  let wTools = 0.25;
  let wMetrics = 0.15;

  switch (track) {
    case "engineering":
      wReq = 0.45; wTools = 0.35; wMetrics = 0.20; break;
    case "data_analytics":
      wReq = 0.45; wTools = 0.30; wMetrics = 0.25; break;
    case "marketing_growth":
      wReq = 0.55; wTools = 0.20; wMetrics = 0.25; break;
    case "strategy_bizops":
      wReq = 0.60; wTools = 0.20; wMetrics = 0.20; break;
    case "sales_bd":
      wReq = 0.60; wTools = 0.20; wMetrics = 0.20; break;
    case "design_ux":
      wReq = 0.65; wTools = 0.20; wMetrics = 0.15; break;
    case "operations_program":
      wReq = 0.60; wTools = 0.25; wMetrics = 0.15; break;
    case "product_manager":
    default:
      wReq = 0.60; wTools = 0.25; wMetrics = 0.15; break;
  }

  const score = 100 * (wReq * rReq + wTools * rTools + wMetrics * rMetrics);
  return clamp(Math.round(score));
}

function computeOverall(skills: number, impact: number, brevity: number) {
  const v = 0.55 * skills + 0.3 * impact + 0.15 * brevity;
  return clamp(Math.round(v));
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

function labelTrack(track: Track) {
  const map: Record<Track, string> = {
    product_manager: "Product Manager",
    strategy_bizops: "Strategy / BizOps",
    data_analytics: "Data & Analytics",
    engineering: "Software Engineering",
    marketing_growth: "Marketing / Growth",
    sales_bd: "Sales / Business Development",
    design_ux: "Design / UX",
    operations_program: "Operations / Program",
  };
  return map[track] ?? "General";
}

function labelSeniority(s: Seniority) {
  const map: Record<Seniority, string> = {
    entry: "Entry-level",
    mid: "Mid-level",
    senior: "Senior-level",
  };
  return map[s] ?? "Mid-level";
}

/** ---------- handler ---------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const mode = (body?.mode === "full" ? "full" : "preview") as "preview" | "full";
    const sid = String(body?.sid ?? "");

    // Body inputs (preview uses these)
    let resumeText = String(body?.resumeText ?? "");
    let jdText = String(body?.jdText ?? "");

    // Default context (preview fallback)
    let track: Track = isTrack(body?.track) ? body.track : "product_manager";
    let seniority: Seniority = isSeniority(body?.seniority) ? body.seniority : "mid";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: OPENAI_API_KEY missing" },
        { status: 500 }
      );
    }

    const sb = supabaseServer();

    // ✅ FULL mode: verify payment + load DB context (DB wins) + prefer DB resume/jd
    if (mode === "full") {
      if (!sid) {
        return NextResponse.json({ error: "Missing sid for full mode" }, { status: 403 });
      }

      const { data: session, error: sessErr } = await sb
        .from("checkout_sessions")
        .select("status, resume_text, jd_text, target_track, target_seniority")
        .eq("id", sid)
        .single();

      if (sessErr || !session) {
        return NextResponse.json({ error: "Invalid sid" }, { status: 403 });
      }

      if (session.status !== "paid" && session.status !== "fulfilled") {
        return NextResponse.json({ error: "Payment not confirmed" }, { status: 403 });
      }

      // DB context wins
      if (isTrack(session.target_track)) track = session.target_track;
      if (isSeniority(session.target_seniority)) seniority = session.target_seniority;

      // prefer DB resume/jd
      if (typeof session.resume_text === "string" && session.resume_text.length >= 200) {
        resumeText = session.resume_text;
      }
      if (typeof session.jd_text === "string" && session.jd_text.length >= 200) {
        jdText = session.jd_text;
      }
    }

    // Validate inputs
    if (resumeText.length < 200 || jdText.length < 200) {
      return NextResponse.json(
        { error: "resumeText and jdText must be at least 200 characters." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1) JD keyword extraction
    const extract = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: JD_EXTRACT_SYSTEM.trim() },
        { role: "user", content: jdExtractUser(jdText) },
      ],
      response_format: { type: "json_object" } as any,
    });

    const extracted = JSON.parse(extract.choices[0].message.content || "{}");

    // 2) Keyword matching
    const resumeLower = resumeText.toLowerCase();
    const list = (x: any) => (Array.isArray(x) ? x : []);

    const countMatch = (arr: string[]) => {
      const total = arr.length || 1;
      const matched = arr.filter((k) => resumeLower.includes(String(k).toLowerCase())).length;
      return { matched, total, rate: matched / total };
    };

    const rSkills = countMatch(list(extracted.required_skills));
    const rTools = countMatch(list(extracted.tools));
    const rMetrics = countMatch(list(extracted.metrics_keywords));
    const rSoft = countMatch(list(extracted.soft_skills));

    const weighted =
      (rSkills.rate * 2.0 + rTools.rate * 1.5 + rMetrics.rate * 2.0 + rSoft.rate * 1.0) /
      (2.0 + 1.5 + 2.0 + 1.0);

    const atsScore = Math.round(weighted * 100);

    const skillsBefore = computeSkillsScoreByTrack(track, rSkills.rate, rTools.rate, rMetrics.rate);
    const impactBefore = computeImpactScore(resumeText, seniority);
    const brevityBefore = computeBrevityScore(resumeText);
    const overallBefore = computeOverall(skillsBefore, impactBefore, brevityBefore);

    const gaps = {
      required_skills: list(extracted.required_skills).filter(
        (k: string) => !resumeLower.includes(String(k).toLowerCase())
      ),
      tools: list(extracted.tools).filter(
        (k: string) => !resumeLower.includes(String(k).toLowerCase())
      ),
      metrics_keywords: list(extracted.metrics_keywords).filter(
        (k: string) => !resumeLower.includes(String(k).toLowerCase())
      ),
      soft_skills: list(extracted.soft_skills).filter(
        (k: string) => !resumeLower.includes(String(k).toLowerCase())
      ),
    };

    // 3) Role inference (context-aware)
    const roleResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: ROLE_INFER_SYSTEM.trim() },
        { role: "user", content: roleInferUser(resumeText, jdText, track, seniority) },
      ],
      response_format: { type: "json_object" } as any,
    });

    const roleProfile = JSON.parse(roleResp.choices[0].message.content || "{}") as RoleProfile;

    // ✅ Personalized UX copy (for UI to show)
    const personalization = {
      headline: `Personalized report for ${labelTrack(track)} · ${labelSeniority(seniority)}`,
      subline:
        "This report applied role-specific keyword weighting and seniority-adjusted impact expectations (no keyword stuffing, no invented metrics).",
      trackLabel: labelTrack(track),
      seniorityLabel: labelSeniority(seniority),
    };

    // Preview: no rewrite
    if (mode === "preview") {
      return NextResponse.json({
        mode,
        selectedContext: { track, seniority },
        personalization,
        overallBefore,
        subscoresBefore: {
          skills: skillsBefore,
          impact: impactBefore,
          brevity: brevityBefore,
        },
        atsScore: overallBefore, // backward compatibility
        roleProfile,
        extractedKeywords: extracted,
        gaps,
        rewrittenResume: "",
      });
    }

    // 4) Full rewrite
    const rewrite = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        { role: "system", content: rewriteSystem({ roleProfile, track, seniority }) },
        { role: "user", content: rewriteUser({ resumeText, jdText, gapsJson: gaps }) },
      ],
    });

    const rewrittenResume = rewrite.choices[0].message.content || "";

    // --- ATS after ---
    const rewrittenLower = rewrittenResume.toLowerCase();

    const countMatchText = (textLower: string, arr: string[]) => {
      const total = arr.length || 1;
      const matched = arr.filter((k) => textLower.includes(String(k).toLowerCase())).length;
      return { matched, total, rate: matched / total };
    };

    const aSkills = countMatchText(rewrittenLower, list(extracted.required_skills));
    const aTools = countMatchText(rewrittenLower, list(extracted.tools));
    const aMetrics = countMatchText(rewrittenLower, list(extracted.metrics_keywords));
    const aSoft = countMatchText(rewrittenLower, list(extracted.soft_skills));

    const weightedAfter =
      (aSkills.rate * 2.0 + aTools.rate * 1.5 + aMetrics.rate * 2.0 + aSoft.rate * 1.0) /
      (2.0 + 1.5 + 2.0 + 1.0);

    const atsAfterRaw = Math.round(weightedAfter * 100);

    const improvements = {
      required_skills_added: gaps.required_skills.filter((k: string) =>
        rewrittenLower.includes(String(k).toLowerCase())
      ),
      tools_added: gaps.tools.filter((k: string) =>
        rewrittenLower.includes(String(k).toLowerCase())
      ),
      metrics_added: gaps.metrics_keywords.filter((k: string) =>
        rewrittenLower.includes(String(k).toLowerCase())
      ),
      soft_skills_added: gaps.soft_skills.filter((k: string) =>
        rewrittenLower.includes(String(k).toLowerCase())
      ),
    };

    const skillsAfterRaw = computeSkillsScoreByTrack(track, aSkills.rate, aTools.rate, aMetrics.rate);
    const impactAfterRaw = computeImpactScore(rewrittenResume, seniority);
    const brevityAfterRaw = computeBrevityScore(rewrittenResume);
    const overallAfterRaw = computeOverall(skillsAfterRaw, impactAfterRaw, brevityAfterRaw);

    // ✅ Safety: paid flow must never show after score lower than before
    const overallAfter = Math.max(overallBefore, overallAfterRaw);
    const atsAfter = Math.max(atsScore, atsAfterRaw);

    // ✅ Score driver deltas for richer "What changed"
    const scoreDrivers = {
      deltas: {
        skills: clamp(skillsAfterRaw) - clamp(skillsBefore),
        impact: clamp(impactAfterRaw) - clamp(impactBefore),
        brevity: clamp(brevityAfterRaw) - clamp(brevityBefore),
        overall: clamp(overallAfter) - clamp(overallBefore),
      },
      narrative: [
        `Skills score uses ${labelTrack(track)} keyword weighting.`,
        `Impact expectations are calibrated to ${labelSeniority(seniority)} roles.`,
        "Brevity reflects length and bullet readability.",
      ],
    };

    // --- persist to Supabase ---
    if (sid) {
      await sb
        .from("checkout_sessions")
        .update({
          status: "fulfilled",
          ats_after: overallAfter,
          result_json: {
            selectedContext: { track, seniority },
            personalization,
            scoreDrivers,
            overall_before: overallBefore,
            overall_after: overallAfter,
            subscores_before: {
              skills: skillsBefore,
              impact: impactBefore,
              brevity: brevityBefore,
            },
            // store raw subscores (truth), overall is clamped for UX
            subscores_after: {
              skills: skillsAfterRaw,
              impact: impactAfterRaw,
              brevity: brevityAfterRaw,
            },
            extractedKeywords: extracted,
            gaps,
            improvements,
            rewrittenResume,
          },
        })
        .eq("id", sid);
    }

    return NextResponse.json({
      mode,
      selectedContext: { track, seniority },
      personalization,
      scoreDrivers,
      atsScore,
      atsAfter,
      overallBefore,
      overallAfter,
      subscoresBefore: {
        skills: skillsBefore,
        impact: impactBefore,
        brevity: brevityBefore,
      },
      subscoresAfter: {
        skills: skillsAfterRaw,
        impact: impactAfterRaw,
        brevity: brevityAfterRaw,
      },
      roleProfile,
      extractedKeywords: extracted,
      gaps,
      improvements,
      rewrittenResume,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}