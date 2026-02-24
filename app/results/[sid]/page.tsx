import ClientActions from "./ClientActions";
import { supabaseServer } from "@/lib/supabaseServer";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
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

  const prefix =
    tone === "missing" ? "✕ " : tone === "matched" ? "✓ " : "+ ";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${cls}`}>
      {prefix}
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

function prettyTrack(t?: string) {
  const map: Record<string, string> = {
    product_manager: "Product Manager",
    strategy_bizops: "Strategy / BizOps",
    data_analytics: "Data & Analytics",
    engineering: "Software Engineering",
    marketing_growth: "Marketing / Growth",
    sales_bd: "Sales / Business Dev",
    design_ux: "Design / UX",
    operations_program: "Operations / Program",
  };
  return t ? (map[t] ?? t) : "General";
}

function prettySeniority(s?: string) {
  const map: Record<string, string> = {
    entry: "Entry-level",
    mid: "Mid-level",
    senior: "Senior-level",
  };
  return s ? (map[s] ?? s) : "Mid-level";
}

export default async function ResultsPage({
  params,
}: {
  params: { sid?: string } | Promise<{ sid?: string }>;
}) {
  const p: any = await params;
  const sid = typeof p?.sid === "string" ? p.sid : "";

  if (!sid) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">Result not found</h1>
          <p className="mt-2 text-slate-600">Missing sid in route params.</p>
        </div>
      </main>
    );
  }

  const sb = supabaseServer();
  const { data: authData } = await sb.auth.getUser();
  const user = authData.user ?? null;

  let balance: number | null = null;
  if (user?.id) {
    const { data: cRow } = await sb
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    balance = Number(cRow?.balance ?? 0);
  }

  const { data: session, error } = await sb
    .from("checkout_sessions")
    .select("status, result_json, ats_before, ats_after, created_at")
    .eq("id", sid)
    .single();

  if (error) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">Results load failed</h1>
          <p className="mt-2 text-slate-600">{error.message}</p>
          <p className="mt-2 text-xs text-slate-500 font-mono">sid: {sid}</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">Result not found</h1>
          <p className="mt-2 text-slate-600">Invalid link or expired session.</p>
          <p className="mt-2 text-xs text-slate-500 font-mono">sid: {sid}</p>
        </div>
      </main>
    );
  }

  if (session.status !== "fulfilled" || !session.result_json) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Preparing your report…</h1>
          <p className="mt-2 text-slate-600">Your payment is confirmed. Please refresh in a moment.</p>
          <div className="mt-4 h-2 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  const r = session.result_json as any;

  // Context / personalization
  const ctx = r.selectedContext || {};
  const trackLabel = prettyTrack(ctx.track);
  const seniorityLabel = prettySeniority(ctx.seniority);

  const personalization = r.personalization || {
    headline: `Personalized report for ${trackLabel} · ${seniorityLabel}`,
    subline:
      "This report applied role-specific keyword weighting and seniority-adjusted impact expectations.",
  };

  const scoreDrivers = r.scoreDrivers || null;
  const deltas = scoreDrivers?.deltas || null;

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
  const downloadName = `resumeup-rewritten-${sid.slice(0, 8)}.txt`;

  // richer “what changed” summaries
  const changedSummary = {
    addedTotal: addedKeywords.length,
    requiredAdded: (improvements.required_skills_added || []).length,
    toolsAdded: (improvements.tools_added || []).length,
    metricsAdded: (improvements.metrics_added || []).length,
    softAdded: (improvements.soft_skills_added || []).length,
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold">ResumeUp</div>
          </a>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/#analyzer"
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              Analyze again
            </a>

            <a
              href="/my-reports"
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              My Reports
            </a>

            {balance !== null && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                Credits
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white/10 px-2 text-white">
                  {balance}
                </span>
              </span>
            )}

            <Pill>Report saved</Pill>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* PERSONALIZED BANNER */}
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-emerald-50 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">Personalized report</div>
              <div className="text-xl font-semibold text-slate-900">
                {String(personalization.headline ?? `Personalized for ${trackLabel} · ${seniorityLabel}`)}
              </div>
              <div className="text-sm text-slate-600 max-w-3xl">
                {String(
                  personalization.subline ??
                    "This report applied role-specific keyword weighting and seniority-adjusted impact expectations."
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Pill>{trackLabel}</Pill>
              <Pill>{seniorityLabel}</Pill>
            </div>
          </div>
        </section>

        {/* HERO REPORT HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-2">
              <div className="text-sm text-slate-500">Overall score</div>
              <div className="text-4xl font-semibold">
                {clamp(overallAfter)}/100{" "}
                <span
                  className={`text-base font-semibold ${
                    delta >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  ({delta >= 0 ? "+" : ""}
                  {delta} pts)
                </span>
              </div>
              <div className="text-sm text-slate-600">
                Before {clamp(overallBefore)} → After {clamp(overallAfter)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                (Paid reports never regress — score is guaranteed to stay the same or improve.)
              </div>
            </div>

            <div className="flex items-center gap-8">
              <Ring value={overallAfter} />
              <div className="space-y-3 min-w-[260px]">
                <div className="text-xs text-slate-500">Before → After</div>
                {(
                  [
                    ["Overall", overallBefore, overallAfter],
                    ["Skills", subsBefore.skills, subsAfter.skills],
                    ["Impact", subsBefore.impact, subsAfter.impact],
                    ["Brevity", subsBefore.brevity, subsAfter.brevity],
                  ] as Array<[string, number, number]>
                ).map(([label, b, a]) => (
                  <div key={label} className="space-y-1">
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

        {/* SCORE DRIVERS (NEW) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div>
            <div className="text-2xl font-semibold">Score drivers</div>
            <div className="mt-1 text-slate-600">
              Why your score moved (role-weighted and seniority-adjusted).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                k: "Skills",
                v: deltas?.skills ?? (subsAfter.skills - subsBefore.skills),
                hint: `${trackLabel} keyword weighting`,
              },
              {
                k: "Impact",
                v: deltas?.impact ?? (subsAfter.impact - subsBefore.impact),
                hint: `${seniorityLabel} metric expectations`,
              },
              {
                k: "Brevity",
                v: deltas?.brevity ?? (subsAfter.brevity - subsBefore.brevity),
                hint: "structure & scannability",
              },
              {
                k: "Overall",
                v: deltas?.overall ?? (overallAfter - overallBefore),
                hint: "combined weighted score",
              },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs text-slate-500">{x.k}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {x.v >= 0 ? "+" : ""}
                  {Math.round(x.v)} pts
                </div>
                <div className="mt-2 text-xs text-slate-600">{x.hint}</div>
              </div>
            ))}
          </div>

          {Array.isArray(scoreDrivers?.narrative) && scoreDrivers.narrative.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
              {scoreDrivers.narrative.slice(0, 6).map((t: string) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </section>

        {/* SUBSCORES */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            [
              ["Skills", subsBefore.skills, subsAfter.skills, "Keyword alignment vs JD"],
              ["Impact", subsBefore.impact, subsAfter.impact, "Evidence of measurable outcomes"],
              ["Brevity", subsBefore.brevity, subsAfter.brevity, "Conciseness & bullet readability"],
            ] as Array<[string, number, number, string]>
          ).map(([name, b, a, desc]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">{name}</div>
              <div className="mt-2 text-2xl font-semibold">{clamp(Number(a))}/100</div>
              <div className="mt-1 text-sm text-slate-600">
                Before {clamp(Number(b))} → After{" "}
                <span className="font-semibold text-slate-900">{clamp(Number(a))}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">{desc}</div>
            </div>
          ))}
        </section>

        {/* INSTANT RESUME REVIEW */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div>
            <div className="text-2xl font-semibold">Instant resume review</div>
            <div className="mt-1 text-slate-600">
              Fast fixes that typically move the score the most.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Resume length",
                status: "good",
                tip: "Aim for 450–900 words. Keep it scannable.",
              },
              {
                title: "Bullet structure",
                status: "ok",
                tip: "Use more bullet points (≥35% of lines). Reduce long paragraphs.",
              },
              {
                title: "Measurable impact",
                status: "needs_work",
                tip: "Add 2–3 metrics: %, $, time saved, users, revenue, throughput.",
              },
              {
                title: "Action verbs",
                status: "good",
                tip: "Start bullets with strong verbs: Led, Built, Improved, Launched, Optimized.",
              },
            ].map((item) => {
              const badge =
                item.status === "good"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : item.status === "ok"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-rose-50 border-rose-200 text-rose-800";

              const label =
                item.status === "good" ? "Strong" : item.status === "ok" ? "Average" : "Fix";

              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{item.title}</div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge}`}>
                      {label}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">{item.tip}</div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-500">
            We never invent metrics. If unknown, we keep a TODO placeholder instead.
          </div>
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
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
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
                      <span className="text-xs text-slate-500">+{missing.length - 18} more</span>
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
                      <span className="text-xs text-slate-500">+{matched.length - 18} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT CHANGED (UPGRADED) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          <div>
            <div className="text-2xl font-semibold">What changed</div>
            <div className="mt-1 text-slate-600">
              A deeper summary of what was improved and why it matters for ATS screens.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { k: "Required skills added", v: changedSummary.requiredAdded },
              { k: "Tools added", v: changedSummary.toolsAdded },
              { k: "Metrics language added", v: changedSummary.metricsAdded },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs text-slate-500">{x.k}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{x.v}</div>
                <div className="mt-1 text-xs text-slate-600">Integrated naturally (no stuffing)</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="font-semibold">Keywords added</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {addedKeywords.slice(0, 28).map((k) => (
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
                <li>
                  Maintain scope expectations for <b>{trackLabel}</b> at <b>{seniorityLabel}</b>.
                </li>
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