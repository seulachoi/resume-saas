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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { resumeText, jdText } = await req.json();

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "resumeText and jdText are required" },
        { status: 400 }
      );
    }

    // 1) JD keyword extraction (fast + cheap)
    const extract = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: JD_EXTRACT_SYSTEM.trim() },
        { role: "user", content: jdExtractUser(String(jdText)) },
      ],
      response_format: { type: "json_object" } as any,
    });

    const extracted = JSON.parse(extract.choices[0].message.content || "{}");

    // 2) Simple matching score (MVP)
    const resumeLower = String(resumeText).toLowerCase();
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
      (rSkills.rate * 2.0 + rTools.rate * 1.5 + rMetrics.rate * 2.0 + rSoft.rate * 1.0) /
      (2.0 + 1.5 + 2.0 + 1.0);

    const atsScore = Math.round(weighted * 100);

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

    // 3) Role inference (cheap) to stabilize rewrite quality for "all roles"
    const roleResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: ROLE_INFER_SYSTEM.trim() },
        { role: "user", content: roleInferUser(String(resumeText), String(jdText)) },
      ],
      response_format: { type: "json_object" } as any,
    });

    const roleProfile = JSON.parse(roleResp.choices[0].message.content || "{}") as RoleProfile;

    // 4) Rewrite (higher quality model)
    const rewrite = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        { role: "system", content: rewriteSystem(roleProfile) },
        { role: "user", content: rewriteUser({ resumeText, jdText, gapsJson: gaps }) },
      ],
    });

    const rewrittenResume = rewrite.choices[0].message.content || "";

    return NextResponse.json({
      atsScore,
      roleProfile,
      extractedKeywords: extracted,
      gaps,
      rewrittenResume,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
