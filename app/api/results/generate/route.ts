import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function waitForCredits(sb: any, userId: string, timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const { data } = await sb
            .from("user_credits")
            .select("balance")
            .eq("user_id", userId)
            .single();

        const bal = Number(data?.balance ?? 0);
        if (bal >= 1) return bal;

        await sleep(800);
    }
    return 0;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const sid = String(body?.sid ?? "");
        const userId = body?.userId ? String(body.userId) : null;

        if (!sid) {
            return NextResponse.json({ error: "Missing sid" }, { status: 400 });
        }

        const sb = supabaseServer();

        // 1) Load session row (must exist)
        const { data: session, error } = await sb
            .from("checkout_sessions")
            .select("status,resume_text,jd_text,result_json,user_id")
            .eq("id", sid)
            .single();

        if (error || !session) {
            return NextResponse.json({ error: "Invalid sid" }, { status: 404 });
        }

        // 2) Must be paid or fulfilled
        if (session.status !== "paid" && session.status !== "fulfilled") {
            return NextResponse.json({ error: "Payment not confirmed" }, { status: 403 });
        }

        // 3) Idempotent: if already fulfilled with result_json, do NOT spend again
        if (session.status === "fulfilled" && session.result_json) {
            return NextResponse.json({ ok: true, reused: true });
        }

        // 4) Attach user_id if missing (post-payment binding)
        let uid = session.user_id as string | null;

        if (!uid && userId) {
            const { error: updUserErr } = await sb
                .from("checkout_sessions")
                .update({ user_id: userId })
                .eq("id", sid);

            if (!updUserErr) uid = userId;
        }

        if (!uid) {
            return NextResponse.json(
                { error: "Sign-in required to use credits." },
                { status: 403 }
            );
        }

        // ✅ Wait for webhook credit top-up (prevents race condition right after payment)
        const bal = await waitForCredits(sb, uid, 12000);
        if (bal < 1) {
            return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
        }
        
        // 5) Spend 1 credit atomically
        const { data: okSpend, error: spendErr } = await sb.rpc("spend_credit", {
            p_user_id: uid,
        });

        if (spendErr) {
            return NextResponse.json({ error: "Credit spend failed" }, { status: 500 });
        }
        if (!okSpend) {
            return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
        }

        // 6) Trigger full generation (analyze route enforces paid + sid)
        const base = process.env.NEXT_PUBLIC_BASE_URL;
        if (!base) {
            return NextResponse.json(
                { error: "Server misconfigured: NEXT_PUBLIC_BASE_URL missing" },
                { status: 500 }
            );
        }

        const res = await fetch(`${base}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resumeText: session.resume_text,
                jdText: session.jd_text,
                mode: "full",
                sid,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            // Optional: refund credit on failure (advanced). For now keep simple.
            return NextResponse.json(
                { error: data?.error || "Analyze failed" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}