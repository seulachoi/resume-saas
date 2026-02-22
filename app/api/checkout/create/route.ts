import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { resumeText, jdText, atsBefore, variantId } = await req.json();

    if (!variantId) {
      return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
    }

    const creditsMap: Record<string, number> = {
      "1320252": 1,
      "1332796": 5,
      "1332798": 10,
    };

    const credits = creditsMap[String(variantId)] ?? 1;

    const sb = supabaseServer();

    const { data: insertData, error: insErr } = await sb
      .from("checkout_sessions")
      .insert({
        status: "created",
        resume_text: resumeText,
        jd_text: jdText,
        ats_before: atsBefore,
        credits,
      })
      .select()
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const sid = insertData.id;

    const lemonRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LEMON_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              custom: {
                sid,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: process.env.LEMON_STORE_ID,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: variantId,
              },
            },
          },
        },
      }),
    });

    const lemonData = await lemonRes.json();

    if (!lemonRes.ok) {
      return NextResponse.json(
        { error: "Failed to create Lemon checkout", lemon_body: lemonData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sid,
      checkoutUrl: lemonData.data.attributes.url,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}