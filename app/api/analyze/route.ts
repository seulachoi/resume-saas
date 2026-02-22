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
} from "@/lib/prompts";
import { supabaseServer } from "@/lib/supabaseServer";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
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
  else if (w <= 1300) base = 80 - ((w - 900) / 400) * 20; // 80→60
  else base = 60 - ((w - 1300) / 700) * 30; // 60→30-ish

  let bonus = 0;
  if (br >= 0.5) bonus = 10;
  else if (br >= 0.35) bonus = 5;

  return clamp(Math.round(base + bonus));
}

function computeImpactScore(text: string) {
  const { signalRatio, todoLines } = impactSignalsRatio(text);

  let base: number;
  if (signalRatio >= 0.2) base = 90;
  else if (signalRatio >= 0.1) base = 75;
  else if (signalRatio > 0) base = 60;
  else base = 40;

  const penalty = todoLines * 3;
  return clamp(Math.round(base - penalty));
}

function computeSkillsScore(rReq: number, rTools: number, rMetrics: number) {
  const score = 100 * (0.6 * rReq + 0.25 * rTools + 0.15 * rMetrics);
  return clamp(Math.round(score));
}

function computeOverall(skills: number, impact: number, brevity: number) {
  const v = 0.55 * skills + 0.3 * impact + 0.15 * brevity;
  return clamp(Math.round(v));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const resumeText = String(body?.resumeText ?? "");
    const jdText = String(body?.jdText ?? "");
    const mode = (body?.mode === "full" ? "full" : "preview") as
      | "preview"
      | "full";
    const sid = String(body?.sid ?? ""); // ✅ required for full

    if (resumeText.length < 200 || jdText.length < 200) {
      return NextResponse.json(
        { error: "resumeText and jdText must be at least 200 characters." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: OPENAI_API_KEY missing" },
        { status: 500 }
      );
    }

    // ✅ FULL mode: require paid sid
    if (mode === "full") {
      if (!sid) {
        return NextResponse.json(
          { error: "Missing sid for full mode" },
          { status: 403 }
        );
      }

      const sb = supabaseServer();
      const { data: session, error: sessErr } = await sb
        .from("checkout_sessions")
        .select("status")
        .eq("id", sid)
        .single();

      if (sessErr || !session) {
        return NextResponse.json({ error: "Invalid sid" }, { status: 403 });
      }

      if (session.status !== "paid" && session.status !== "fulfilled") {
        return NextResponse.json(
          { error: "Payment not confirmed" },
          { status: 403 }
        );
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1) JD keyword extraction (fast + cheap)
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

    // 2) Matching score
    const resumeLower = resumeText.toLowerCase();
    const list = (x: any) => (Array.isArray(x) ? x : []);

    const countMatch = (arr: string[]) => {
      const total = arr.length || 1;
      const matched = arr.filter((k) =>
        resumeLower.includes(String(k).toLowerCase())
      ).length;
      return { matched, total, rate: matched / total };
    };

    const rSkills = countMatch(list(extracted.required_skills));
    const rTools = countMatch(list(extracted.tools));
    const rMetrics = countMatch(list(extracted.metrics_keywords));
    const rSoft = countMatch(list(extracted.soft_skills));

    const weighted =
      (rSkills.rate * 2.0 +
        rTools.rate * 1.5 +
        rMetrics.rate * 2.0 +
        rSoft.rate * 1.0) /
      (2.0 + 1.5 + 2.0 + 1.0);

    const atsScore = Math.round(weighted * 100);

    const skillsBefore = computeSkillsScore(
      rSkills.rate,
      rTools.rate,
      rMetrics.rate
    );
    const impactBefore = computeImpactScore(resumeText);
    const brevityBefore = computeBrevityScore(resumeText);
    const overallBefore = computeOverall(
      skillsBefore,
      impactBefore,
      brevityBefore
    );

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

    // 3) Role inference (cheap)
    const roleResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: ROLE_INFER_SYSTEM.trim() },
        { role: "user", content: roleInferUser(resumeText, jdText) },
      ],
      response_format: { type: "json_object" } as any,
    });

    const roleProfile = JSON.parse(
      roleResp.choices[0].message.content || "{}"
    ) as RoleProfile;

    // Preview: no rewrite (save cost)
    if (mode === "preview") {
      return NextResponse.json({
        mode,
        overallBefore,
        subscoresBefore: {
          skills: skillsBefore,
          impact: impactBefore,
          brevity: brevityBefore,
        },
        // 기존 값도 유지(호환)
        atsScore: overallBefore,
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
        { role: "system", content: rewriteSystem(roleProfile) },
        { role: "user", content: rewriteUser({ resumeText, jdText, gapsJson: gaps }) },
      ],
    });

    const rewrittenResume = rewrite.choices[0].message.content || "";

    // --- compute ATS after using the same extracted keyword lists ---
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

    const atsAfter = Math.round(weightedAfter * 100);

    // --- improvements: which gap keywords are now included in the rewritten resume ---
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

    const skillsAfter = computeSkillsScore(
      aSkills.rate,
      aTools.rate,
      aMetrics.rate
    );
    const impactAfter = computeImpactScore(rewrittenResume);
    const brevityAfter = computeBrevityScore(rewrittenResume);
    const overallAfter = computeOverall(
      skillsAfter,
      impactAfter,
      brevityAfter
    );

    // --- persist to Supabase (sid must be present in full mode) ---
    if (sid) {
      const sb2 = supabaseServer();
      await sb2
        .from("checkout_sessions")
        .update({
          status: "fulfilled",
          ats_after: overallAfter,
          result_json: {
            overall_before: overallBefore,
            overall_after: overallAfter,
            subscores_before: {
              skills: skillsBefore,
              impact: impactBefore,
              brevity: brevityBefore,
            },
            subscores_after: {
              skills: skillsAfter,
              impact: impactAfter,
              brevity: brevityAfter,
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
        skills: skillsAfter,
        impact: impactAfter,
        brevity: brevityAfter,
      },
      roleProfile,
      extractedKeywords: extracted,
      gaps,
      improvements,
      rewrittenResume,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}