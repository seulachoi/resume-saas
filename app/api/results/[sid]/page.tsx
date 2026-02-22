import { supabaseServer } from "@/lib/supabaseServer";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
      <div className="h-2" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export default async function ResultsPage({ params }: { params: { sid: string } }) {
  const sb = supabaseServer();
  const { data: session } = await sb
    .from("checkout_sessions")
    .select("status,ats_before,ats_after,result_json")
    .eq("id", params.sid)
    .single();

  if (!session) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">Result not found</h1>
          <p className="mt-2 text-slate-600">Invalid link or expired session.</p>
        </div>
      </main>
    );
  }

  if (session.status !== "fulfilled" || !session.result_json) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Preparing your report…</h1>
          <p className="mt-2 text-slate-600">
            Your payment is confirmed. Please refresh this page in a moment.
          </p>
        </div>
      </main>
    );
  }

  const r = session.result_json as any;

  const overallBefore = Number(r.overall_before ?? r.ats_before ?? session.ats_before ?? 0);
  const overallAfter = Number(r.overall_after ?? r.ats_after ?? session.ats_after ?? overallBefore);

  const sbB = r.subscores_before || {};
  const sbA = r.subscores_after || {};

  const keywords = r.extractedKeywords || {};
  const gaps = r.gaps || {};
  const improvements = r.improvements || {};

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold">ResumeUp</div>
          </div>
          <div className="flex items-center gap-2">
            <Pill>Paid</Pill>
            <Pill>Report saved</Pill>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">Overall score</div>
            <div className="mt-2 text-4xl font-semibold">{overallAfter}/100</div>
            <div className="mt-2 text-sm text-slate-600">
              Before {overallBefore} → After {overallAfter} (Δ {overallAfter - overallBefore})
            </div>
            <div className="mt-4 space-y-2">
              <Bar value={overallBefore} color="#94a3b8" />
              <Bar value={overallAfter} color="#0f172a" />
              <div className="text-xs text-slate-500">Top: before • Bottom: after</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <div className="text-sm text-slate-500">Sub-scores</div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ["Skills", sbB.skills ?? 0, sbA.skills ?? 0],
                ["Impact", sbB.impact ?? 0, sbA.impact ?? 0],
                ["Brevity", sbB.brevity ?? 0, sbA.brevity ?? 0],
              ].map(([name, b, a]) => (
                <div key={String(name)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {String(b)} → <span className="font-semibold text-slate-900">{String(a)}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Bar value={Number(b)} color="#94a3b8" />
                    <Bar value={Number(a)} color="#0f172a" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-xl font-semibold">Keyword report</div>
          <div className="mt-2 text-slate-600">
            Matched vs Missing keywords from the job description.
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {[
              ["Required skills", keywords.required_skills, gaps.required_skills],
              ["Tools", keywords.tools, gaps.tools],
              ["Metrics", keywords.metrics_keywords, gaps.metrics_keywords],
              ["Soft skills", keywords.soft_skills, gaps.soft_skills],
            ].map(([title, all, miss]) => {
              const allArr = Array.isArray(all) ? all : [];
              const missArr = Array.isArray(miss) ? miss : [];
              const missSet = new Set(missArr.map((x: any) => String(x).toLowerCase()));
              const matched = allArr.filter((x: any) => !missSet.has(String(x).toLowerCase()));
              return (
                <div key={String(title)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold">{title}</div>
                  <div className="mt-3">
                    <div className="text-slate-500">Missing</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(missArr as any[]).slice(0, 30).map((k) => (
                        <span key={"m-" + String(k)} className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs text-rose-800">
                          {String(k)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-slate-500">Matched</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(matched as any[]).slice(0, 30).map((k) => (
                        <span key={"g-" + String(k)} className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-800">
                          {String(k)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-xl font-semibold">What changed</div>
          <div className="mt-2 text-slate-600">
            Keywords added and next recommended actions.
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-semibold">Keywords added</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...(improvements.required_skills_added || []),
                  ...(improvements.tools_added || []),
                  ...(improvements.metrics_added || []),
                ]
                  .slice(0, 24)
                  .map((k: any) => (
                    <span key={"a-" + String(k)} className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-800">
                      {String(k)}
                    </span>
                  ))}
              </div>
            </div>
            <div>
              <div className="font-semibold">Next actions</div>
              <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-1">
                <li>Add 2–3 measurable metrics (%, $, time saved).</li>
                <li>Keep bullets concise; avoid long paragraphs.</li>
                <li>Mirror JD wording naturally (no stuffing).</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-xl font-semibold">Rewritten resume</div>
          <div className="mt-2 text-slate-600">Copy/paste into your resume template.</div>
          <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-4">
            {String(r.rewrittenResume || "")}
          </pre>
        </div>
      </div>
    </main>
  );
}