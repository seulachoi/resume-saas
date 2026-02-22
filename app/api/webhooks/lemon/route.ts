import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  // 1) Parse payload safely
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    // Always ACK to avoid Lemon "Pending"
    return NextResponse.json({ ok: true, note: "invalid_json_acked" });
  }

  // 2) Identify event
  const eventName =
    payload?.meta?.event_name ||
    payload?.meta?.event ||
    payload?.event_name ||
    payload?.name;

  // We only act on order_created (for test mode)
  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: true, eventName });
  }

  // 3) Extract order id
  const orderId =
    payload?.data?.id ||
    payload?.data?.attributes?.order_number ||
    payload?.data?.attributes?.identifier;

  // 4) Extract sid (try multiple known locations)
  const sid =
    payload?.data?.attributes?.first_order_item?.custom?.sid ||
    payload?.data?.attributes?.custom_data?.sid ||
    payload?.data?.attributes?.checkout_data?.custom?.sid ||
    payload?.data?.attributes?.checkout_data?.custom_data?.sid ||
    payload?.data?.attributes?.metadata?.sid ||
    payload?.meta?.custom_data?.sid;

  // If sid missing, ACK but mark for debugging
  if (!sid) {
    return NextResponse.json({
      ok: true,
      note: "sid_missing_acked",
      orderId: orderId ? String(orderId) : null,
    });
  }

  // 5) Update Supabase (best-effort)
  try {
    const sb = supabaseServer();
    await sb
      .from("checkout_sessions")
      .update({
        status: "paid",
        lemon_order_id: orderId ? String(orderId) : null,
      })
      .eq("id", String(sid));
  } catch {
    // ignore errors but still ACK
  }

  // 6) Always ACK
  return NextResponse.json({ ok: true });
}