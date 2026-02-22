import ClientActions from "./ClientActions";
import { supabaseServer } from "@/lib/supabaseServer";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function Bar({ value, tone }: { value: number; tone: "before" | "after" }) {
  const v = clamp(Number(value || 0));
  const color = tone === "after" ? "#0f172a" : "#94a3b8";
  return (
    <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
      <div className="h-2" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

function Chip({
  text,
  tone,
}: {
  text: string;
  tone: "missing" | "matched" | "added";
}) {
  const cls =
    tone === "missing"
      ? "bg-rose-50 border-rose-200 text-rose-800"
      : tone === "matched"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : "bg-indigo-50 border-indigo-200 text-indigo-800";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${cls}`}>
      {text}
    </span>
  );
}

function Ring({ value }: { value: number }) {
  const v = clamp(value);
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#0f172a"
          strokeWidth="12"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-3xl font-semibold text-slate-900">{v}</div>
      </div>
    </div>
  );
}

function list(x: any): string[] {
  return Array.isArray(x) ? x.map((v) => String(v)) : [];
}

function computeMatched(all: string[], missing: string[]) {
  const missSet = new Set(missing.map((v) => v.toLowerCase()));
  return all.filter((k) => !missSet.has(k.toLowerCase()));
}

export default async function ResultsPage({ params }: { params: { sid: string } }) {
  const sb = supabaseServer();
  const { data: session } = await sb
    .from("checkout_sessions")
    .select("status, result_json, ats_before, ats_after, created_at")
    .eq("id", params.sid)
    .single();

  if (!session) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">Result not found</h1>
          <p className="mt-2 text-slate-600">Invalid link or expired session.</p>
        </div>
      </main>
    );
  }

  if (session.status !== "fulfilled" || !session.result_json) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Preparing your report…</h1>
          <p className="mt-2 text-slate-600">Please refresh in a moment.</p>
          <div className="mt-4 h-2 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  const r = session.result_json as any;

  // Overall
  const overallBefore = Number(r.overall_before ?? r.ats_before ?? session.ats_before ?? 0);
  const overallAfter = Number(r.overall_after ?? r.ats_after ?? session.ats_after ?? overallBefore);
  const delta = overallAfter - overallBefore;

  // Subscores
  const sbB = r.subscores_before || {};
  const sbA = r.subscores_after || {};

  const subsBefore = {
    skills: Number(sbB.skills ?? 0),
    impact: Number(sbB.impact ?? 0),
    brevity: Number(sbB.brevity ?? 0),
  };
  const subsAfter = {
    skills: Number(sbA.skills ?? subsBefore.skills ?? 0),
    impact: Number(sbA.impact ?? subsBefore.impact ?? 0),
    brevity: Number(sbA.brevity ?? subsBefore.brevity ?? 0),
  };

  // Keywords + gaps + improvements
  const keywords = r.extractedKeywords || {};
  const gaps = r.gaps || {};
  const improvements = r.improvements || {};

  const reqAll = list(keywords.required_skills);
  const toolsAll = list(keywords.tools);
  const metricsAll = list(keywords.metrics_keywords);
  const softAll = list(keywords.soft_skills);

  const reqMissing = list(gaps.required_skills);
  const toolsMissing = list(gaps.tools);
  const metricsMissing = list(gaps.metrics_keywords);
  const softMissing = list(gaps.soft_skills);

  const reqMatched = computeMatched(reqAll, reqMissing);
  const toolsMatched = computeMatched(toolsAll, toolsMissing);
  const metricsMatched = computeMatched(metricsAll, metricsMissing);
  const softMatched = computeMatched(softAll, softMissing);

  const addedKeywords = [
    ...(improvements.required_skills_added || []),
    ...(improvements.tools_added || []),
    ...(improvements.metrics_added || []),
    ...(improvements.soft_skills_added || []),
  ].map((x: any) => String(x));

  const rewritten = String(r.rewrittenResume || "");
  const downloadName = `resumeup-rewritten-${params.sid.slice(0, 8)}.txt`;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold">ResumeUp</div>
          </div>
          <div className="flex items-center gap-2">
            <Pill>Report saved</Pill>
            <Pill>Secure checkout</Pill>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* HERO REPORT HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-2">
              <div className="text-sm text-slate-500">Overall score</div>
              <div className="text-4xl font-semibold">
                {clamp(overallAfter)}/100{" "}
                <span
                  className={`text-base font-semibold ${delta >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                >
                  ({delta >= 0 ? "+" : ""}
                  {delta} pts)
                </span>
              </div>
              <div className="text-sm text-slate-600">
                Before {clamp(overallBefore)} → After {clamp(overallAfter)}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Session: <span className="font-mono">{params.sid}</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <Ring value={overallAfter} />
              <div className="space-y-3 min-w-[260px]">
                <div className="text-xs text-slate-500">Before → After</div>
                {[
                  ["Overall", overallBefore, overallAfter],
                  ["Skills", subsBefore.skills, subsAfter.skills],
                  ["Impact", subsBefore.impact, subsAfter.impact],
                  ["Brevity", subsBefore.brevity, subsAfter.brevity],
                ].map(([label, b, a]) => (
                  <div key={String(label)} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{label}</span>
                      <span>
                        {clamp(Number(b))} →{" "}
                        <span className="font-semibold text-slate-900">
                          {clamp(Number(a))}
                        </span>
                      </span>
                    </div>
                    <Bar value={Number(b)} tone="before" />
                    <Bar value={Number(a)} tone="after" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SUBSCORES */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            ["Skills", subsBefore.skills, subsAfter.skills, "Keyword alignment vs JD"],
            ["Impact", subsBefore.impact, subsAfter.impact, "Evidence of measurable outcomes"],
            ["Brevity", subsBefore.brevity, subsAfter.brevity, "Conciseness & bullet readability"],
          ].map(([name, b, a, desc]) => (
            <div key={String(name)} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">{name}</div>
              <div className="mt-2 text-2xl font-semibold">{clamp(Number(a))}/100</div>
              <div className="mt-1 text-sm text-slate-600">
                Before {clamp(Number(b))} → After{" "}
                <span className="font-semibold text-slate-900">{clamp(Number(a))}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">{String(desc)}</div>
            </div>
          ))}
        </section>

        {/* KEYWORD REPORT */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          <div>
            <div className="text-2xl font-semibold">Keyword report</div>
            <div className="mt-1 text-slate-600">
              Missing keywords are the fastest way to increase your score.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(
              [
                ["Required skills", reqMatched, reqMissing],
                ["Tools", toolsMatched, toolsMissing],
                ["Metrics keywords", metricsMatched, metricsMissing],
                ["Soft skills", softMatched, softMissing],
              ] as Array<[string, string[], string[]]>
            ).map(([title, matched, missing]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{title}</div>
                  <div className="text-xs text-slate-500">
                    Matched {matched.length} • Missing {missing.length}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Missing</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missing.slice(0, 18).map((k) => (
                      <Chip key={"x-" + k} text={k} tone="missing" />
                    ))}
                    {missing.length > 18 && (
                      <span className="text-xs text-slate-500">
                        +{missing.length - 18} more
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Matched</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matched.slice(0, 18).map((k) => (
                      <Chip key={"m-" + k} text={k} tone="matched" />
                    ))}
                    {matched.length > 18 && (
                      <span className="text-xs text-slate-500">
                        +{matched.length - 18} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT CHANGED */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          <div>
            <div className="text-2xl font-semibold">What changed</div>
            <div className="mt-1 text-slate-600">
              Keywords integrated naturally into the rewritten resume (no stuffing).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="font-semibold">Keywords added</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {addedKeywords.slice(0, 24).map((k) => (
                  <Chip key={"a-" + k} text={k} tone="added" />
                ))}
                {addedKeywords.length === 0 && (
                  <div className="text-sm text-slate-500">No added keywords detected.</div>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold">Next actions</div>
              <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2 text-sm">
                <li>Add 2–3 measurable metrics (%, $, time saved) where possible.</li>
                <li>Keep bullets concise; avoid long paragraphs.</li>
                <li>Mirror JD wording naturally (no keyword stuffing).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* REWRITTEN RESUME */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-2xl font-semibold">Rewritten resume</div>
              <div className="mt-1 text-slate-600">Copy/paste into your resume template.</div>
            </div>

            {/* ✅ client-side actions */}
            <ClientActions textToCopy={rewritten} filename={downloadName} />
          </div>

          <pre className="whitespace-pre-wrap text-sm bg-slate-50 border border-slate-200 rounded-xl p-5">
            {rewritten}
          </pre>

          <div className="text-xs text-slate-500">
            Note: This report does not guarantee interviews. It improves clarity and keyword alignment.
          </div>
        </section>
      </div>
    </main>
  );
}