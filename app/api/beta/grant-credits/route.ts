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

  const { data: grantRows, error: grantErr } = await sb.rpc("grant_beta_credits_once", {
    p_user_id: user.id,
    p_amount: amount,
    p_source: "beta_unlock_v1",
  });
  if (grantErr) {
    return NextResponse.json(
      { error: grantErr.message || "Failed to process beta grant" },
      { status: 500 }
    );
  }

  const row = Array.isArray(grantRows) ? grantRows[0] : null;
  const granted = Boolean(row?.granted);
  const balance = Number(row?.balance ?? 0);

  return NextResponse.json({
    ok: true,
    granted,
    grantedCredits: granted ? amount : 0,
    balance,
    alreadyGranted: !granted,
  });
}
