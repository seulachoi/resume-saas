import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  let payload: any = null;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true, note: "invalid_json_acked" });
  }

  const eventName =
    payload?.meta?.event_name || payload?.meta?.event || payload?.event_name;

  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: true, eventName });
  }

  // ✅ Lemon order id
  const orderId = payload?.data?.id ? String(payload.data.id) : null;

  // ✅ THIS IS THE REAL SID LOCATION (from your payload)
  const sid = payload?.meta?.custom_data?.sid
    ? String(payload.meta.custom_data.sid)
    : "";

  if (!sid) {
    return NextResponse.json({ ok: true, note: "sid_missing_acked", orderId });
  }

  try {
    const sb = supabaseServer();

    const { error } = await sb
      .from("checkout_sessions")
      .update({
        status: "paid",
        lemon_order_id: orderId,
      })
      .eq("id", sid);

    if (error) {
      // still ACK to Lemon so it doesn't keep retrying
      return NextResponse.json({ ok: true, note: "db_update_failed_acked" });
    }
  } catch {
    return NextResponse.json({ ok: true, note: "exception_acked" });
  }

  return NextResponse.json({ ok: true });
}