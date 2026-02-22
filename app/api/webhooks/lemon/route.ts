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

  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: true, eventName });
  }

  const sid = payload?.meta?.custom_data?.sid
    ? String(payload.meta.custom_data.sid)
    : "";

  const orderId = payload?.data?.id ? String(payload.data.id) : null;

  // Lemon payload includes purchaser email
  const purchaserEmail =
    payload?.data?.attributes?.user_email
      ? String(payload.data.attributes.user_email)
      : null;

  if (!sid) return NextResponse.json({ ok: true, note: "sid_missing" });

  const sb = supabaseServer();

  // 1) Mark session as paid and fetch user_id, credits
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

  let userId: string | null = session.user_id ? String(session.user_id) : null;
  const credits = Number(session.credits ?? 1);

  // 2) If user_id is missing, try to attach by matching auth.users email
  //    (service_role can read auth.users)
  if (!userId && purchaserEmail) {
    const { data: users, error: userErr } = await sb
      .from("auth.users")
      .select("id,email")
      .eq("email", purchaserEmail)
      .limit(1);

    if (!userErr && users && users.length > 0) {
      userId = String(users[0].id);

      // persist back to checkout_sessions
      await sb.from("checkout_sessions").update({ user_id: userId }).eq("id", sid);
    }
  }

  // 3) If we have userId, top up credits
  if (userId) {
    await sb.rpc("add_credits", { p_user_id: userId, p_amount: credits });
  }

  return NextResponse.json({ ok: true });
}