import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resumeText = String(body?.resumeText ?? "");
    const jdText = String(body?.jdText ?? "");
    const atsBefore = Number(body?.atsBefore ?? 0);

    if (resumeText.length < 200 || jdText.length < 200) {
      return NextResponse.json(
        { error: "resumeText and jdText must be at least 200 characters." },
        { status: 400 }
      );
    }

    const {
      LEMON_API_KEY,
      LEMON_STORE_ID,
      LEMON_VARIANT_ID,
      NEXT_PUBLIC_BASE_URL,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    } = process.env;

    if (
      !LEMON_API_KEY ||
      !LEMON_STORE_ID ||
      !LEMON_VARIANT_ID ||
      !NEXT_PUBLIC_BASE_URL ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: "Server misconfigured: missing env vars." },
        { status: 500 }
      );
    }

    // 1) Create internal session id
    const sid = randomUUID();

    // 2) Store session in Supabase
    const sb = supabaseServer();
    const { error: insErr } = await sb.from("checkout_sessions").insert({
      id: sid,
      status: "created",
      resume_text: resumeText,
      jd_text: jdText,
      ats_before: atsBefore,
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // 3) Create Lemon checkout (redirect to /success?sid=...)
    const redirectUrl = `${NEXT_PUBLIC_BASE_URL}/success?sid=${encodeURIComponent(
      sid
    )}`;

    const lemonRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${LEMON_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            redirect_url: redirectUrl,
            checkout_data: {
              custom: { sid },
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: String(LEMON_STORE_ID) },
            },
            variant: {
              data: { type: "variants", id: String(LEMON_VARIANT_ID) },
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

    const checkoutId = lemonJson?.data?.id;
    const checkoutUrl = lemonJson?.data?.attributes?.url;

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
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}