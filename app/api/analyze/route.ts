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
        atsScore,
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

    // ✅ mark fulfilled (optional) - requires sid exists and paid check already passed
    if (sid) {
      const sb = supabaseServer();
      await sb
        .from("checkout_sessions")
        .update({ status: "fulfilled" })
        .eq("id", sid);
    }

    return NextResponse.json({
      mode,
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