import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// NOTE: Minimal webhook handler (no signature verification yet).
// We'll add signature verification next step for stronger security.

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Lemon webhook typical shape:
    // { meta: { event_name: "order_created" }, data: { ... } }
    const eventName =
      payload?.meta?.event_name || payload?.meta?.event || payload?.event_name;

    // We only care about successful order creation
    if (eventName !== "order_created") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Lemon order id (string) and custom data
    const orderId =
      payload?.data?.id ||
      payload?.data?.attributes?.order_number ||
      payload?.data?.attributes?.identifier;

    // Custom sid we stored during checkout creation:
    // We used checkout_data.custom.sid in Create Checkout API
    const sid =
      payload?.data?.attributes?.checkout_data?.custom?.sid ||
      payload?.data?.attributes?.custom_data?.sid ||
      payload?.data?.attributes?.metadata?.sid;

    if (!sid) {
      return NextResponse.json(
        { error: "Missing sid in webhook payload" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    // Mark session as paid
    const { error } = await sb
      .from("checkout_sessions")
      .update({
        status: "paid",
        lemon_order_id: orderId ? String(orderId) : null,
      })
      .eq("id", String(sid));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}