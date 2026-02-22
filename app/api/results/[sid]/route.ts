import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = await params;
    if (!sid) {
      return NextResponse.json({ error: "Missing sid" }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("checkout_sessions")
      .select("id, status, result_json")
      .eq("id", sid)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    if (data.status !== "paid" && data.status !== "fulfilled") {
      return NextResponse.json(
        { error: "Payment not confirmed" },
        { status: 403 }
      );
    }

    const result = data.result_json;
    if (!result) {
      return NextResponse.json(
        { error: "Result not ready yet" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
