import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
    try {
        const { sid } = await req.json();
        if (!sid) return NextResponse.json({ error: "Missing sid" }, { status: 400 });

        const sb = supabaseServer();
        const { data: session, error } = await sb
            .from("checkout_sessions")
            .select("status,resume_text,jd_text,result_json,user_id")
            .eq("id", sid)
            .single();

        if (error || !session) return NextResponse.json({ error: "Invalid sid" }, { status: 404 });
        if (session.status !== "paid" && session.status !== "fulfilled") {
            return NextResponse.json({ error: "Payment not confirmed" }, { status: 403 });
        }
        const userId = session.user_id as string | null;
        if (!userId) {
            return NextResponse.json({ error: "Sign-in required to use credits." }, { status: 403 });
        }

        const { data: okSpend, error: spendErr } = await sb.rpc("spend_credit", { p_user_id: userId });

        if (spendErr) {
            return NextResponse.json({ error: "Credit spend failed" }, { status: 500 });
        }
        if (!okSpend) {
            return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
        }
        if (session.status === "fulfilled" && session.result_json) {
            return NextResponse.json({ ok: true, reused: true });
        }

        const base = process.env.NEXT_PUBLIC_BASE_URL!;
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
        if (!res.ok) return NextResponse.json({ error: data?.error || "Analyze failed" }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}