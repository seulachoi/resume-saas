import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type AlertSnapshot = {
  paidStalled: number;
  webhookFailureRate: number;
  webhookFailed: number;
  webhookTotal: number;
  generateFailureRate: number;
  generateFailed: number;
  generateTotal: number;
};

async function sendMail(subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.OPS_ALERT_EMAIL_FROM || "";
  const to = String(process.env.OPS_ALERT_EMAIL_TO || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!apiKey || !from || to.length === 0) {
    return { ok: false, reason: "email_env_missing" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, reason: `resend_failed:${res.status}:${body}` };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const secret = process.env.OPS_ALERT_CRON_SECRET || "";
  const incoming = req.headers.get("x-ops-cron-secret") || "";
  if (!secret || incoming !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseServer();

  const [stalledQ, webhookQ, generateQ] = await Promise.all([
    sb.from("ops_paid_stalled").select("id", { count: "exact", head: true }),
    sb.from("ops_webhook_failure_rate_1d").select("failure_rate,failed_events,total_events").maybeSingle(),
    sb.from("ops_generate_failure_rate_1d").select("failure_rate,failed_events,total_events").maybeSingle(),
  ]);

  const snapshot: AlertSnapshot = {
    paidStalled: stalledQ.count || 0,
    webhookFailureRate: Number(webhookQ.data?.failure_rate ?? 0),
    webhookFailed: Number(webhookQ.data?.failed_events ?? 0),
    webhookTotal: Number(webhookQ.data?.total_events ?? 0),
    generateFailureRate: Number(generateQ.data?.failure_rate ?? 0),
    generateFailed: Number(generateQ.data?.failed_events ?? 0),
    generateTotal: Number(generateQ.data?.total_events ?? 0),
  };

  const issues: string[] = [];
  if (snapshot.paidStalled > 0) issues.push(`paid_stalled=${snapshot.paidStalled}`);
  if (snapshot.webhookFailureRate >= 0.01) {
    issues.push(
      `webhook_failure_rate=${(snapshot.webhookFailureRate * 100).toFixed(2)}% (${snapshot.webhookFailed}/${snapshot.webhookTotal})`
    );
  }
  if (snapshot.generateFailureRate >= 0.02) {
    issues.push(
      `generate_failure_rate=${(snapshot.generateFailureRate * 100).toFixed(2)}% (${snapshot.generateFailed}/${snapshot.generateTotal})`
    );
  }

  if (issues.length === 0) {
    return NextResponse.json({ ok: true, alertSent: false, snapshot });
  }

  const subject = `[ResumeUp][OPS] Alert ${new Date().toISOString()}`;
  const text = [
    "ResumeUp 운영 알림",
    "",
    ...issues.map((v) => `- ${v}`),
    "",
    "Snapshot",
    JSON.stringify(snapshot, null, 2),
  ].join("\n");

  const mail = await sendMail(subject, text);
  return NextResponse.json({ ok: true, alertSent: mail.ok, mail, snapshot, issues });
}

