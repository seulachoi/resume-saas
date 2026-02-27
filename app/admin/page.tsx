import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabaseServer";

function dayKey(ts: string) {
  return new Date(ts).toISOString().slice(0, 10);
}

function bucketLast7Days(rows: { created_at: string; status: string }[]) {
  const out: Record<string, { created: number; fulfilled: number; paid: number; failed: number }> = {};
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    out[k] = { created: 0, fulfilled: 0, paid: 0, failed: 0 };
  }
  for (const r of rows) {
    const k = dayKey(r.created_at);
    if (!out[k]) continue;
    out[k].created += 1;
    if (r.status === "fulfilled") out[k].fulfilled += 1;
    if (r.status === "paid") out[k].paid += 1;
    if (r.status === "failed") out[k].failed += 1;
  }
  return Object.entries(out).map(([date, v]) => ({ date, ...v }));
}

export default async function AdminPage() {
  const { user, isAdmin } = await getAdminUser();
  if (!user) redirect("/");
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-2xl font-semibold text-rose-900">Admin access denied</h1>
          <p className="mt-2 text-rose-800">`ADMIN_EMAILS`에 등록된 계정만 접근 가능합니다.</p>
        </div>
      </main>
    );
  }

  const sb = supabaseServer();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const [
    usersQ,
    sessionsQ,
    stalledQ,
    webhookRateQ,
    generateRateQ,
    recentReportsQ,
  ] = await Promise.all([
    sb.from("user_credits").select("user_id", { count: "exact", head: true }),
    sb
      .from("checkout_sessions")
      .select("id,created_at,status,topup_only,variant_id,credits,user_id,report_title")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    sb.from("ops_paid_stalled").select("id", { count: "exact", head: true }),
    sb.from("ops_webhook_failure_rate_1d").select("failure_rate,failed_events,total_events").maybeSingle(),
    sb.from("ops_generate_failure_rate_1d").select("failure_rate,failed_events,total_events").maybeSingle(),
    sb
      .from("checkout_sessions")
      .select("id,created_at,report_title,ats_before,ats_after,status,user_id")
      .eq("status", "fulfilled")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const sessions = sessionsQ.data || [];
  const chart = bucketLast7Days(
    sessions.map((s: any) => ({ created_at: String(s.created_at), status: String(s.status || "") }))
  );

  const summary = {
    users: usersQ.count || 0,
    sessions7d: sessions.length,
    paidStalled: stalledQ.count || 0,
    webhookFailureRate: Number(webhookRateQ.data?.failure_rate ?? 0),
    generateFailureRate: Number(generateRateQ.data?.failure_rate ?? 0),
    webhookFailed: Number(webhookRateQ.data?.failed_events ?? 0),
    webhookTotal: Number(webhookRateQ.data?.total_events ?? 0),
    generateFailed: Number(generateRateQ.data?.failed_events ?? 0),
    generateTotal: Number(generateRateQ.data?.total_events ?? 0),
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">ResumeUp Admin</h1>
          <a href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">Home</a>
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Users</div><div className="text-xl font-semibold">{summary.users}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Sessions (7d)</div><div className="text-xl font-semibold">{summary.sessions7d}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Paid stalled</div><div className="text-xl font-semibold">{summary.paidStalled}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Webhook fail rate</div><div className="text-xl font-semibold">{(summary.webhookFailureRate * 100).toFixed(2)}%</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Generate fail rate</div><div className="text-xl font-semibold">{(summary.generateFailureRate * 100).toFixed(2)}%</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Email</div><div className="text-sm font-medium truncate">{user.email}</div></div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Traffic (last 7 days, DB events)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Fulfilled</th>
                  <th className="py-2 pr-4">Paid (stuck)</th>
                  <th className="py-2 pr-4">Failed</th>
                </tr>
              </thead>
              <tbody>
                {chart.map((r) => (
                  <tr key={r.date} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">{r.created}</td>
                    <td className="py-2 pr-4">{r.fulfilled}</td>
                    <td className="py-2 pr-4">{r.paid}</td>
                    <td className="py-2 pr-4">{r.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Recent fulfilled reports</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">SID</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Before</th>
                  <th className="py-2 pr-4">After</th>
                </tr>
              </thead>
              <tbody>
                {(recentReportsQ.data || []).map((r: any) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.id}</td>
                    <td className="py-2 pr-4">{r.report_title || "-"}</td>
                    <td className="py-2 pr-4">{Number(r.ats_before ?? 0)}</td>
                    <td className="py-2 pr-4">{Number(r.ats_after ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

