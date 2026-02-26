"use client";

import { useEffect, useState } from "react";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_TRACK_KEY = "resumeup_track";
const LS_SENIORITY_KEY = "resumeup_seniority";

type CreditsResponse = { balance: number };
type AuthMeResponse = { user: { id: string; email: string | null } | null };

const DEFAULT_TOPUP_VARIANT_ID = "1332796";

export default function AuthContinuePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const mode = localStorage.getItem("resumeup_post_login_checkout_mode") || "";
        const variantId =
          localStorage.getItem("resumeup_post_login_topup_variant") || DEFAULT_TOPUP_VARIANT_ID;

        if (!mode) {
          window.location.href = "/";
          return;
        }

        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me: AuthMeResponse = await meRes.json();
        if (!me.user?.id) {
          window.location.href = "/";
          return;
        }

        const resumeText = localStorage.getItem(LS_RESUME_KEY) || "";
        const jdText = localStorage.getItem(LS_JD_KEY) || "";
        const track = localStorage.getItem(LS_TRACK_KEY) || "product_manager";
        const seniority = localStorage.getItem(LS_SENIORITY_KEY) || "mid";

        if (mode === "analysis") {
          const creditRes = await fetch("/api/auth/credits", { cache: "no-store" });
          const creditJson: CreditsResponse = await creditRes.json();
          const balance = creditRes.ok ? Number(creditJson.balance ?? 0) : 0;

          if (balance > 0) {
            const r = await fetch("/api/credit-session/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resumeText,
                jdText,
                atsBefore: 0,
                track,
                seniority,
              }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || "Failed to create credit session");
            localStorage.removeItem("resumeup_post_login_checkout_mode");
            localStorage.removeItem("resumeup_post_login_topup_variant");
            window.location.href = `/success?sid=${encodeURIComponent(j.sid)}`;
            return;
          }

          const r = await fetch("/api/checkout/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeText,
              jdText,
              atsBefore: 0,
              variantId,
              track,
              seniority,
              topupOnly: false,
            }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error || "Checkout creation failed");
          localStorage.removeItem("resumeup_post_login_checkout_mode");
          localStorage.removeItem("resumeup_post_login_topup_variant");
          window.location.href = j.checkoutUrl;
          return;
        }

        const dummy = "Top-up only. ".repeat(30);
        const r = await fetch("/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: dummy,
            jdText: dummy,
            atsBefore: 0,
            variantId,
            track,
            seniority,
            topupOnly: true,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Checkout creation failed");
        localStorage.removeItem("resumeup_post_login_checkout_mode");
        localStorage.removeItem("resumeup_post_login_topup_variant");
        window.location.href = j.checkoutUrl;
      } catch (e: any) {
        setError(e?.message ?? "Failed to continue after sign-in");
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900" />
          <div className="text-xl font-semibold text-slate-900">ResumeUp</div>
        </div>
        <div className="text-slate-700">
          Continuing your full report flow...
        </div>
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
