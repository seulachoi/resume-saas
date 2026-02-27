import ClientActions from "./ClientActions";
import { supabaseAuthServer, supabaseServer } from "@/lib/supabaseServer";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
}

function nonNegativeDelta(after: number, before: number) {
  const d = Math.round(after - before);
  return d < 0 ? 0 : d;
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
  // ✅ color system: before=slate, after=emerald (brand)
  const color = tone === "after" ? "#10b981" : "#94a3b8";
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

  const prefix = tone === "missing" ? "✕ " : tone === "matched" ? "✓ " : "+ ";

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
        {/* ✅ emerald ring */}
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#10b981"
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
  return t ? map[t] ?? t : "General";
}

function prettySeniority(s?: string) {
  const map: Record<string, string> = {
    entry: "Entry-level",
    mid: "Mid-level",
    senior: "Senior-level",
  };
  return s ? map[s] ?? s : "Mid-level";
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

  const auth = await supabaseAuthServer();
  const { data: authData } = await auth.auth.getUser();
  const user = authData.user ?? null;
  const userEmail = user?.email ?? null;

  if (!user?.id) {
    return (
      <main className="min-h-screen bg-white p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-slate-600">Please sign in to view this report.</p>
        </div>
      </main>
    );
  }

  const sb = supabaseServer();

  // credits
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
    .eq("user_id", user.id)
    .maybeSingle();

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
          <p className="mt-2 text-slate-600">Invalid link, expired session, or access denied.</p>
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
          <p className="mt-2 text-slate-600">Payment is confirmed. Please refresh in a moment.</p>
          <div className="mt-4 h-2 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-2 w-1/2 bg-slate-900 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  const r = session.result_json as any;

  // Context
  const ctx = r.selectedContext || {};
  const trackLabel = prettyTrack(ctx.track);
  const seniorityLabel = prettySeniority(ctx.seniority);

  // Overall
  const overallBefore = Number(r.overall_before ?? r.ats_before ?? session.ats_before ?? 0);
  const overallAfterRaw = Number(r.overall_after ?? r.ats_after ?? session.ats_after ?? overallBefore);

  // ✅ never show regression
  const overallAfter = Math.max(overallBefore, overallAfterRaw);
  const deltaSafe = nonNegativeDelta(overallAfter, overallBefore);

  // Score drivers (if present)
  const scoreDrivers = r.scoreDrivers || null;
  const deltas = scoreDrivers?.deltas || null;

  // Subscores for bars (we keep to show in header bars, but REMOVE the 3-card grid)
  const sbB = r.subscores_before || {};
  const sbA = r.subscores_after || {};

  const subsBefore = {
    skills: Number(sbB.skills ?? 0),
    impact: Number(sbB.impact ?? 0),
    brevity: Number(sbB.brevity ?? 0),
  };
  const subsAfterRaw = {
    skills: Number(sbA.skills ?? subsBefore.skills ?? 0),
    impact: Number(sbA.impact ?? subsBefore.impact ?? 0),
    brevity: Number(sbA.brevity ?? subsBefore.brevity ?? 0),
  };

  // ✅ never show regression in subs either (trust guard)
  const subsAfter = {
    skills: Math.max(subsBefore.skills, subsAfterRaw.skills),
    impact: Math.max(subsBefore.impact, subsAfterRaw.impact),
    brevity: Math.max(subsBefore.brevity, subsAfterRaw.brevity),
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

  // ✅ show added by category (detailed)
  const addedRequired = list(improvements.required_skills_added);
  const addedTools = list(improvements.tools_added);
  const addedMetrics = list(improvements.metrics_added);
  const addedSoft = list(improvements.soft_skills_added);

  const rewritten = String(r.rewrittenResume || "");
  const downloadName = `resumeup-rewritten-${sid.slice(0, 8)}.txt`;

  // Personalized banner copy (with email)
  const headline = userEmail
    ? `Personalized report for ${userEmail} — ${trackLabel} · ${seniorityLabel}`
    : `Personalized report — ${trackLabel} · ${seniorityLabel}`;

  const subline =
    "This report applied role-specific keyword weighting and seniority-adjusted impact expectations.";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ✅ Header: match my-reports style (no Pricing/Terms) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold text-slate-900">ResumeUp</div>
          </a>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/my-reports"
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              My Reports
            </a>

            {user?.id ? (
              <>
                {balance !== null && (
                  <a
                    href="/my-reports"
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                  >
                    Credits
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white px-2 text-slate-900 border border-slate-200">
                      {balance}
                    </span>
                    <span className="text-xs underline underline-offset-2">Top up</span>
                  </a>
                )}
                <a
                  href="/auth/logout?next=/"
                  className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Sign out
                </a>
              </>
            ) : (
              <a
                href="/"
                className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Sign in
              </a>
            )}

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* ✅ Personalized banner (with email) */}
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-emerald-50 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">Personalized report</div>
              <div className="text-xl font-semibold text-slate-900">{headline}</div>
              <div className="text-sm text-slate-600 max-w-3xl">{subline}</div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Pill>{trackLabel}</Pill>
                <Pill>{seniorityLabel}</Pill>
              </div>
            </div>
          </div>
        </section>

        {/* Overall header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-2">
              <div className="text-sm text-slate-500">Overall score</div>
              <div className="text-4xl font-semibold">
                {clamp(overallAfter)}/100{" "}
                <span className="text-base font-semibold text-emerald-700">
                  {deltaSafe === 0 ? "(No change)" : `(+${deltaSafe} pts)`}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                Before {clamp(overallBefore)} → After {clamp(overallAfter)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Paid reports never regress — score is guaranteed to stay the same or improve.
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
                        <span className="font-semibold text-slate-900">{clamp(Number(a))}</span>
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

        {/* Score drivers */}
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
                v: Number(deltas?.skills ?? subsAfter.skills - subsBefore.skills),
                hint: `${trackLabel} keyword weighting`,
              },
              {
                k: "Impact",
                v: Number(deltas?.impact ?? subsAfter.impact - subsBefore.impact),
                hint: `${seniorityLabel} metric expectations`,
              },
              {
                k: "Brevity",
                v: Number(deltas?.brevity ?? subsAfter.brevity - subsBefore.brevity),
                hint: "structure & scannability",
              },
              {
                k: "Overall",
                v: Number(deltas?.overall ?? overallAfter - overallBefore),
                hint: "combined weighted score",
              },
            ].map((x) => {
              const safe = Math.max(0, Math.round(x.v));
              return (
                <div key={x.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs text-slate-500">{x.k}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {safe === 0 ? "0 pts" : `+${safe} pts`}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{x.hint}</div>
                </div>
              );
            })}
          </div>

          {Array.isArray(scoreDrivers?.narrative) && scoreDrivers.narrative.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
              {scoreDrivers.narrative.slice(0, 6).map((t: string) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </section>

        {/* ✅ (8) removed SUBSCORES 3-card grid entirely */}

        {/* Keyword report */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          <div>
            <div className="text-2xl font-semibold">Keyword report</div>
            <div className="mt-1 text-slate-600">
              Missing keywords are the fastest way to increase your ATS match.
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

        {/* ✅ (9) What changed: show per category + professional recommendations */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          <div>
            <div className="text-2xl font-semibold">What changed</div>
            <div className="mt-1 text-slate-600">
              What was added and strengthened to improve ATS matching for your target role.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
              <div className="font-semibold text-slate-900">Required skills added</div>
              <div className="text-xs text-slate-600">
                {addedRequired.length} item(s) integrated.
              </div>
              <div className="flex flex-wrap gap-2">
                {addedRequired.slice(0, 24).map((k) => (
                  <Chip key={"req-" + k} text={k} tone="added" />
                ))}
                {addedRequired.length === 0 && (
                  <div className="text-sm text-slate-500">No required-skill additions detected.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
              <div className="font-semibold text-slate-900">Tools added</div>
              <div className="text-xs text-slate-600">
                {addedTools.length} item(s) integrated.
              </div>
              <div className="flex flex-wrap gap-2">
                {addedTools.slice(0, 24).map((k) => (
                  <Chip key={"tool-" + k} text={k} tone="added" />
                ))}
                {addedTools.length === 0 && (
                  <div className="text-sm text-slate-500">No tool additions detected.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
              <div className="font-semibold text-slate-900">Metrics language added</div>
              <div className="text-xs text-slate-600">
                {addedMetrics.length} item(s) integrated.
              </div>
              <div className="flex flex-wrap gap-2">
                {addedMetrics.slice(0, 24).map((k) => (
                  <Chip key={"met-" + k} text={k} tone="added" />
                ))}
                {addedMetrics.length === 0 && (
                  <div className="text-sm text-slate-500">No metrics additions detected.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
              <div className="font-semibold text-slate-900">Soft skills added</div>
              <div className="text-xs text-slate-600">
                {addedSoft.length} item(s) integrated.
              </div>
              <div className="flex flex-wrap gap-2">
                {addedSoft.slice(0, 24).map((k) => (
                  <Chip key={"soft-" + k} text={k} tone="added" />
                ))}
                {addedSoft.length === 0 && (
                  <div className="text-sm text-slate-500">No soft-skill additions detected.</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="font-semibold text-slate-900">Recommended improvements</div>
            <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2 text-sm">
              <li>
                Add 2–3 measurable metrics (%, $, time saved, users) to match <b>{seniorityLabel}</b> expectations.
              </li>
              <li>
                Keep bullets concise and impact-first (better scannability for ATS + recruiters).
              </li>
              <li>
                Mirror key JD phrases naturally for <b>{trackLabel}</b> roles (avoid keyword stuffing).
              </li>
            </ul>
          </div>
        </section>

        {/* Rewritten resume */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-2xl font-semibold">Rewritten resume</div>
              <div className="mt-1 text-slate-600">Copy/paste into your resume template.</div>
            </div>
            <ClientActions
              textToCopy={rewritten}
              filename={downloadName}
              sid={sid}
              track={String(ctx.track || "")}
              seniority={String(ctx.seniority || "")}
            />
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
