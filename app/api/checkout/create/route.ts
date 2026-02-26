import { NextResponse } from "next/server";
import { supabaseAuthServer, supabaseServer } from "@/lib/supabaseServer";
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
    const variantId = String(body?.variantId ?? "");
    const track: Track = isTrack(body?.track) ? body.track : "product_manager";
    const seniority: Seniority = isSeniority(body?.seniority) ? body.seniority : "mid";
    // ✅ top-up only mode:
    // - explicit flag OR empty resume/jd from My Results
    const topupOnly = Boolean(body?.topupOnly) || (resumeText.length === 0 && jdText.length === 0);

    const auth = await supabaseAuthServer();
    const { data: authData } = await auth.auth.getUser();
    const user = authData.user ?? null;
    if (!user) {
      return NextResponse.json({ error: "Sign-in required" }, { status: 403 });
    }
    const userId = user.id;

    if (!variantId) {
      return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
    }

    // ✅ Only require resume/jd for "analysis checkout" flow
    if (!topupOnly) {
      if (resumeText.length < 200 || jdText.length < 200) {
        return NextResponse.json(
          { error: "resumeText and jdText must be at least 200 characters." },
          { status: 400 }
        );
      }
    }

    const creditsMap: Record<string, number> = {
      "1320252": 1,
      "1332796": 5,
      "1332798": 10,
    };
    const credits = creditsMap[variantId] ?? 1;

    const sb = supabaseServer();

    // ✅ For top-up-only, store minimal fields (no resume/jd)
    const reportTitle = topupOnly
      ? `Credit top-up (${credits} credits)`
      : inferReportTitle(jdText);

    // status should NOT be "paid" before payment
    const { data: row, error: insErr } = await sb
      .from("checkout_sessions")
      .insert({
        user_id: userId,
        status: "created",
        resume_text: topupOnly ? null : resumeText,
        jd_text: topupOnly ? null : jdText,
        ats_before: topupOnly ? 0 : atsBefore,
        credits,
        report_title: reportTitle,
        target_track: topupOnly ? null : track,
        target_seniority: topupOnly ? null : seniority,
      })
      .select("id")
      .single();

    if (insErr || !row?.id) {
      return NextResponse.json(
        { error: insErr?.message ?? "Failed to create checkout session" },
        { status: 500 }
      );
    }

    const sid = String(row.id);

    // Redirect back to your app after payment
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/success?sid=${encodeURIComponent(sid)}`;

    const lemonRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${process.env.LEMON_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_options: {
              redirect_url: redirectUrl,
            },
            checkout_data: {
              custom: { sid },
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: String(process.env.LEMON_STORE_ID) },
            },
            variant: {
              data: { type: "variants", id: String(variantId) },
            },
          },
        },
      }),
    });

    const lemonJson = await lemonRes.json();

    if (!lemonRes.ok) {
      await sb.from("checkout_sessions").update({ status: "failed" }).eq("id", sid);
      return NextResponse.json(
        {
          error: "Failed to create Lemon checkout",
          lemon_status: lemonRes.status,
          lemon_body: lemonJson,
        },
        { status: 500 }
      );
    }

    const checkoutUrl = lemonJson?.data?.attributes?.url;
    const checkoutId = lemonJson?.data?.id;

    if (!checkoutUrl) {
      await sb.from("checkout_sessions").update({ status: "failed" }).eq("id", sid);
      return NextResponse.json({ error: "Lemon checkout URL missing" }, { status: 500 });
    }

    await sb
      .from("checkout_sessions")
      .update({ lemon_checkout_id: String(checkoutId ?? "") })
      .eq("id", sid);

    return NextResponse.json({ sid, checkoutUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
