import { NextResponse } from "next/server";
import { supabaseAuthServer, supabaseServer } from "@/lib/supabaseServer";

function isBetaEnabled() {
  if (process.env.BETA_FREE_UNLOCK_ENABLED !== undefined) {
    return process.env.BETA_FREE_UNLOCK_ENABLED === "true";
  }
  return process.env.NEXT_PUBLIC_BETA_FREE_UNLOCK === "true";
}

function betaCreditsAmount() {
  const raw =
    process.env.BETA_FREE_UNLOCK_CREDITS ||
    process.env.NEXT_PUBLIC_BETA_FREE_UNLOCK_CREDITS ||
    "10";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

async function ensureCreditRow(sb: any, userId: string) {
  const { data: row, error } = await sb
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to read credits");
  if (!row) {
    const { error: upErr } = await sb
      .from("user_credits")
      .upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id" });
    if (upErr) throw new Error(upErr.message || "Failed to initialize credits");
    return 0;
  }
  return Number(row.balance ?? 0);
}

async function addCreditsDirect(sb: any, userId: string, amount: number) {
  const current = await ensureCreditRow(sb, userId);
  const next = Math.max(0, current + amount);
  const { error } = await sb
    .from("user_credits")
    .update({ balance: next })
    .eq("user_id", userId);
  if (error) throw new Error(error.message || "Failed to update credits");
  return next;
}

export async function POST() {
  if (!isBetaEnabled()) {
    return NextResponse.json({ error: "Beta mode disabled" }, { status: 403 });
  }

  const auth = await supabaseAuthServer();
  const { data } = await auth.auth.getUser();
  const user = data.user ?? null;
  if (!user?.id) {
    return NextResponse.json({ error: "Sign-in required" }, { status: 403 });
  }

  const amount = betaCreditsAmount();
  const sb = supabaseServer();
  await ensureCreditRow(sb, user.id);

  // Preferred path: DB one-time guard table (if migration is applied).
  const { error: insErr, data: inserted } = await sb
    .from("beta_credit_grants")
    .insert({
      user_id: user.id,
      granted_credits: amount,
      source: "beta_unlock_v1",
      granted_at: new Date().toISOString(),
    })
    .select("user_id")
    .maybeSingle();

  if (!insErr) {
    if (inserted?.user_id) {
      const balance = await addCreditsDirect(sb, user.id, amount);
      return NextResponse.json({
        ok: true,
        granted: true,
        grantedCredits: amount,
        balance,
        alreadyGranted: false,
        mode: "table_guard",
      });
    }
    const balance = await ensureCreditRow(sb, user.id);
    return NextResponse.json({
      ok: true,
      granted: false,
      grantedCredits: 0,
      balance,
      alreadyGranted: true,
      mode: "table_guard",
    });
  }

  // Unique violation means already granted.
  if (String(insErr?.code || "") === "23505") {
    const balance = await ensureCreditRow(sb, user.id);
    return NextResponse.json({
      ok: true,
      granted: false,
      grantedCredits: 0,
      balance,
      alreadyGranted: true,
      mode: "table_guard",
    });
  }

  const grantErr = insErr;
  if (grantErr) {
    // Fallback: if DB migration wasn't applied yet, enforce one-time grant via auth user_metadata.
    const fallbackAllowed =
      String(grantErr.message || "").toLowerCase().includes("beta_credit_grants") ||
      String(grantErr.message || "").toLowerCase().includes("does not exist") ||
      String(grantErr.code || "") === "42p01";
    if (!fallbackAllowed) {
      return NextResponse.json(
        { error: grantErr.message || "Failed to process beta grant" },
        { status: 500 }
      );
    }

    const { data: uRow, error: uErr } = await sb.auth.admin.getUserById(user.id);
    if (uErr) {
      return NextResponse.json({ error: uErr.message || "Failed to read user metadata" }, { status: 500 });
    }
    const meta = (uRow.user?.user_metadata || {}) as Record<string, any>;
    const already = Boolean(meta.beta_free_credits_granted);
    if (already) {
      const bal = await ensureCreditRow(sb, user.id);
      return NextResponse.json({
        ok: true,
        granted: false,
        grantedCredits: 0,
        balance: bal,
        alreadyGranted: true,
      });
    }

    const balance = await addCreditsDirect(sb, user.id, amount);

    const { error: updErr } = await sb.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        beta_free_credits_granted: true,
        beta_free_credits_granted_at: new Date().toISOString(),
      },
    });
    if (updErr) {
      return NextResponse.json({ error: updErr.message || "Failed to update user metadata" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      granted: true,
      grantedCredits: amount,
      balance,
      alreadyGranted: false,
      mode: "metadata_fallback",
    });
  }
}
