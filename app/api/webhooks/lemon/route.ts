import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function safeEq(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function getOrderId(payload: any): string | null {
  const cands = [
    payload?.data?.attributes?.order_id,
    payload?.data?.id,
    payload?.meta?.order_id,
  ];
  for (const c of cands) {
    if (c !== null && c !== undefined && String(c).length > 0) return String(c);
  }
  return null;
}

async function markWebhookProcessed(
  sb: any,
  eventId: string,
  status: "processed" | "failed",
  errorText?: string
) {
  try {
    await sb
      .from("webhook_events")
      .update({
        process_status: status,
        error_text: errorText ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);
  } catch {
    // best-effort logging
  }
}

export async function POST(req: Request) {
  const secret =
    process.env.LEMON_WEBHOOK_SECRET || process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Webhook secret missing" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = (req.headers.get("x-signature") || "").trim().toLowerCase();
  if (!rawBody || !signature) {
    return NextResponse.json({ ok: false, error: "Invalid webhook request" }, { status: 400 });
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex").toLowerCase();
  if (!safeEq(digest, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true, note: "invalid_json" });
  }

  const eventName =
    payload?.meta?.event_name || payload?.meta?.event || payload?.event_name || "";
  const sid = payload?.meta?.custom_data?.sid ? String(payload.meta.custom_data.sid) : "";
  const orderId = getOrderId(payload);
  const sb = supabaseServer();

  // Idempotency: best-effort event dedupe
  const fallbackEventId = crypto.createHash("sha256").update(rawBody).digest("hex");
  const eventId =
    String(payload?.meta?.event_id || payload?.meta?.webhook_id || payload?.data?.id || "") ||
    fallbackEventId;
  const { error: evtErr } = await sb
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_name: String(eventName || ""),
      sid: sid || null,
      order_id: orderId || null,
      process_status: "received",
      payload,
      received_at: new Date().toISOString(),
    });
  if (evtErr) {
    const msg = String(evtErr.message || "").toLowerCase();
    if (evtErr.code === "23505" || msg.includes("duplicate")) {
      return NextResponse.json({ ok: true, note: "duplicate_event_ignored", eventId });
    }
    // Do not fail webhook processing when optional dedupe table is unavailable.
  }

  if (eventName === "order_created") {
    if (!sid) return NextResponse.json({ ok: true, note: "sid_missing" });

    // Process only once: created -> paid
    const { data: session, error: updErr } = await sb
      .from("checkout_sessions")
      .update({
        status: "paid",
        lemon_order_id: orderId,
      })
      .eq("id", sid)
      .eq("status", "created")
      .select("user_id, credits")
      .maybeSingle();

    if (updErr) {
      await markWebhookProcessed(sb, eventId, "failed", updErr.message);
      return NextResponse.json({ ok: true, note: "session_update_failed", err: updErr.message });
    }
    if (!session) {
      await markWebhookProcessed(sb, eventId, "processed");
      return NextResponse.json({ ok: true, note: "already_processed_or_missing" });
    }

    const userId = session.user_id ? String(session.user_id) : null;
    const credits = Number(session.credits ?? 1);
    if (!userId || credits <= 0) {
      await markWebhookProcessed(sb, eventId, "processed");
      return NextResponse.json({ ok: true, note: "no_credit_to_add" });
    }

    const { error: rpcErr } = await sb.rpc("add_credits", {
      p_user_id: userId,
      p_amount: credits,
    });
    if (rpcErr) {
      await markWebhookProcessed(sb, eventId, "failed", rpcErr.message);
      return NextResponse.json({ ok: true, note: "add_credits_failed", rpc: rpcErr.message });
    }
    await markWebhookProcessed(sb, eventId, "processed");
    return NextResponse.json({ ok: true, note: "credits_added", userId, credits, sid, orderId });
  }

  if (
    eventName === "order_refunded" ||
    eventName === "refund_created" ||
    eventName === "subscription_refunded"
  ) {
    let session: any = null;
    if (sid) {
      const { data } = await sb
        .from("checkout_sessions")
        .select("id,user_id,credits,status,lemon_order_id")
        .eq("id", sid)
        .maybeSingle();
      session = data;
    }
    if (!session && orderId) {
      const { data } = await sb
        .from("checkout_sessions")
        .select("id,user_id,credits,status,lemon_order_id")
        .eq("lemon_order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      session = data;
    }
    if (!session) {
      await markWebhookProcessed(sb, eventId, "processed");
      return NextResponse.json({ ok: true, note: "refund_session_not_found", sid, orderId });
    }

    // Reclaim only once: paid/fulfilled -> refunded
    const { data: updated, error: stErr } = await sb
      .from("checkout_sessions")
      .update({ status: "refunded" })
      .eq("id", String(session.id))
      .in("status", ["paid", "fulfilled"])
      .select("id,user_id,credits")
      .maybeSingle();
    if (stErr) {
      await markWebhookProcessed(sb, eventId, "failed", stErr.message);
      return NextResponse.json({ ok: true, note: "refund_status_update_failed", err: stErr.message });
    }
    if (!updated) {
      await markWebhookProcessed(sb, eventId, "processed");
      return NextResponse.json({ ok: true, note: "refund_already_processed" });
    }

    const userId = String(updated.user_id || "");
    const reclaim = Math.max(0, Number(updated.credits ?? 0));
    if (!userId || reclaim <= 0) {
      await markWebhookProcessed(sb, eventId, "processed");
      return NextResponse.json({ ok: true, note: "refund_no_reclaim_needed" });
    }

    const { data: cRow, error: cErr } = await sb
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    if (cErr) {
      await markWebhookProcessed(sb, eventId, "failed", cErr.message);
      return NextResponse.json({ ok: true, note: "refund_balance_read_failed", err: cErr.message });
    }
    const current = Number(cRow?.balance ?? 0);
    const next = Math.max(0, current - reclaim);
    const { error: uErr } = await sb
      .from("user_credits")
      .update({ balance: next })
      .eq("user_id", userId);
    if (uErr) {
      await markWebhookProcessed(sb, eventId, "failed", uErr.message);
      return NextResponse.json({ ok: true, note: "refund_reclaim_failed", err: uErr.message });
    }

    await markWebhookProcessed(sb, eventId, "processed");
    return NextResponse.json({
      ok: true,
      note: "refund_reclaimed",
      userId,
      reclaimed: reclaim,
      sid: updated.id,
      orderId,
    });
  }

  await markWebhookProcessed(sb, eventId, "processed");
  return NextResponse.json({ ok: true, ignored: true, eventName });
}
