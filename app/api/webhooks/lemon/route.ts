import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true, note: "invalid_json" });
  }

  const eventName =
    payload?.meta?.event_name || payload?.meta?.event || payload?.event_name;

  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: true, eventName });
  }

  const sid = payload?.meta?.custom_data?.sid
    ? String(payload.meta.custom_data.sid)
    : "";

  const orderId = payload?.data?.id ? String(payload.data.id) : null;

  if (!sid) return NextResponse.json({ ok: true, note: "sid_missing" });

  const sb = supabaseServer();

  // 1) mark paid and fetch user_id/credits
  const { data: session, error: updErr } = await sb
    .from("checkout_sessions")
    .update({
      status: "paid",
      lemon_order_id: orderId,
    })
    .eq("id", sid)
    .select("user_id, credits")
    .single();

  if (updErr || !session) {
    return NextResponse.json({ ok: true, note: "session_update_failed" });
  }

  const userId = session.user_id ? String(session.user_id) : null;
  const credits = Number(session.credits ?? 1);

  if (!userId) {
    return NextResponse.json({ ok: true, note: "user_id_missing_no_topup" });
  }

  // 2) credit top-up
  const { error: rpcErr } = await sb.rpc("add_credits", {
    p_user_id: userId,
    p_amount: credits,
  });

  if (rpcErr) {
    return NextResponse.json({ ok: true, note: "add_credits_failed", rpc: rpcErr.message });
  }

  return NextResponse.json({ ok: true, note: "credits_added", userId, credits });
}