import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const eventName =
    payload?.meta?.event_name || payload?.meta?.event || payload?.event_name;

  // test/live 모두 order_created면 paid 상태가 포함됨(현재 payload에 status:"paid")
  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: true, eventName });
  }

  const sid = payload?.meta?.custom_data?.sid
    ? String(payload.meta.custom_data.sid)
    : "";

  const orderId = payload?.data?.id ? String(payload.data.id) : null;

  if (!sid) {
    return NextResponse.json({ ok: true, note: "sid_missing" });
  }

  const sb = supabaseServer();

  // 1) checkout_sessions 업데이트 + user_id/credits 조회
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

  const userId = session.user_id as string | null;
  const credits = Number(session.credits ?? 1);

  // 2) 로그인 유저가 결제한 경우에만 크레딧 충전
  if (userId) {
    await sb.rpc("add_credits", { p_user_id: userId, p_amount: credits });
  }

  return NextResponse.json({ ok: true });
}