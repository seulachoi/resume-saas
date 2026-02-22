"use client";

function ScoreCard({
  title,
  score,
  subtitle,
}: {
  title: string;
  score: number;
  subtitle?: string;
}) {
  const v = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-gray-300">{title}</div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-5xl font-semibold text-white">{v}</div>
        <div className="pb-2 text-gray-400">/100</div>
      </div>
      {subtitle && <div className="mt-1 text-sm text-gray-400">{subtitle}</div>}
      <div className="mt-4 h-2 w-full rounded bg-white/10 overflow-hidden">
        <div className="h-2 bg-emerald-500" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function DeltaPill({ before, after }: { before: number; after: number }) {
  const b = Number.isFinite(before) ? before : 0;
  const a = Number.isFinite(after) ? after : 0;
  const d = a - b;
  const good = d >= 0;
  const sign = d >= 0 ? "+" : "";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold " +
        (good ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")
      }
    >
      {sign}
      {d} pts
    </span>
  );
}

function SubscoreCard({
  label,
  before,
  after,
  isFull,
}: {
  label: string;
  before: number;
  after: number;
  isFull: boolean;
}) {
  const b = Math.max(0, Math.min(100, Number.isFinite(before) ? before : 0));
  const a = Math.max(0, Math.min(100, Number.isFinite(after) ? after : 0));
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-gray-400 mb-2">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-white">{b}</span>
        {isFull ? (
          <>
            <span className="text-gray-500">→</span>
            <span className="text-lg font-semibold text-emerald-300">{a}</span>
            <DeltaPill before={b} after={a} />
          </>
        ) : (
          <span className="text-sm text-gray-500">/100</span>
        )}
      </div>
    </div>
  );
}

function Chip({ text, tone }: { text: string; tone: "good" | "bad" | "neutral" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : tone === "bad"
      ? "bg-rose-500/15 text-rose-200 border-rose-500/20"
      : "bg-white/5 text-gray-200 border-white/10";

  return (
    <span className={"inline-flex items-center rounded-full border px-3 py-1 text-xs " + cls}>
      {text}
    </span>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="text-lg font-semibold text-white">{title}</div>
      {hint && <div className="text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

function KeywordBlock({
  label,
  matched,
  missing,
}: {
  label: string;
  matched: string[];
  missing: string[];
}) {
  const m1 = (matched || []).filter(Boolean);
  const m2 = (missing || []).filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <SectionTitle title={label} hint={`Matched ${m1.length} • Missing ${m2.length}`} />

      <div className="space-y-2">
        <div className="text-sm text-gray-300">Matched</div>
        {m1.length === 0 ? (
          <div className="text-sm text-gray-500">No matched keywords detected.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {m1.slice(0, 30).map((k) => (
              <Chip key={"m-" + k} text={k} tone="good" />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-300">Missing</div>
        {m2.length === 0 ? (
          <div className="text-sm text-gray-500">No missing keywords. Nice.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {m2.slice(0, 30).map((k) => (
              <Chip key={"x-" + k} text={k} tone="bad" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function asList(x: any): string[] {
  return Array.isArray(x) ? x.map(String) : [];
}

function computeMatched(extracted: string[], gaps: string[]): string[] {
  const gapSet = new Set((gaps || []).map((s) => String(s).toLowerCase()));
  return (extracted || []).filter((k) => !gapSet.has(String(k).toLowerCase()));
}

export type ReportData = {
  overallBefore: number;
  overallAfter: number;
  subscoresBefore: { skills: number; impact: number; brevity: number };
  subscoresAfter: { skills: number; impact: number; brevity: number };
  required: { matched: string[]; missing: string[] };
  tools: { matched: string[]; missing: string[] };
  metrics: { matched: string[]; missing: string[] };
  soft: { matched: string[]; missing: string[] };
  improvements: {
    required_skills_added?: string[];
    tools_added?: string[];
    metrics_added?: string[];
    soft_skills_added?: string[];
  } | null;
  rewritten: string;
  mode: "preview" | "full";
};

export function ReportView({
  report,
  onUnlock,
}: {
  report: ReportData;
  onUnlock?: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* OVERALL SCORE */}
      <div className="space-y-4">
        <SectionTitle title="Overall Score" hint="Skills + Impact + Brevity" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScoreCard
            title="Overall (Before)"
            score={report.overallBefore}
            subtitle="Based on original resume"
          />
          {report.mode === "full" ? (
            <ScoreCard
              title="Overall (After)"
              score={report.overallAfter}
              subtitle="Re-scored after rewrite"
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-center">
              <div className="text-sm text-gray-300">Unlock to see</div>
              <div className="mt-2 text-white font-semibold">
                Overall (After) + improvement report
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Includes full rewritten resume (max 2 pages).
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between">
            <div>
              <div className="text-sm text-gray-300">Δ Improvement</div>
              {report.mode === "full" ? (
                <div className="mt-2">
                  <DeltaPill before={report.overallBefore} after={report.overallAfter} />
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-400">
                  Unlock to calculate improvement.
                </div>
              )}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Tip: add measurable metrics (%, $, time saved) to increase score.
            </div>
          </div>
        </div>
      </div>

      {/* SUBSCORES */}
      <div className="space-y-4">
        <SectionTitle title="Subscores" hint="Skills / Impact / Brevity" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SubscoreCard
            label="Skills"
            before={report.subscoresBefore.skills}
            after={report.subscoresAfter.skills}
            isFull={report.mode === "full"}
          />
          <SubscoreCard
            label="Impact"
            before={report.subscoresBefore.impact}
            after={report.subscoresAfter.impact}
            isFull={report.mode === "full"}
          />
          <SubscoreCard
            label="Brevity"
            before={report.subscoresBefore.brevity}
            after={report.subscoresAfter.brevity}
            isFull={report.mode === "full"}
          />
        </div>
      </div>

      {/* KEYWORDS */}
      <div className="space-y-4">
        <SectionTitle title="Keyword Report" hint="Matched vs Missing" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KeywordBlock
            label="Required Skills"
            matched={report.required.matched}
            missing={report.required.missing}
          />
          <KeywordBlock
            label="Tools"
            matched={report.tools.matched}
            missing={report.tools.missing}
          />
          <KeywordBlock
            label="Metrics Keywords"
            matched={report.metrics.matched}
            missing={report.metrics.missing}
          />
          <KeywordBlock
            label="Soft Skills"
            matched={report.soft.matched}
            missing={report.soft.missing}
          />
        </div>
      </div>

      {/* IMPROVEMENTS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <SectionTitle title="What changed" hint="After unlock" />
        {report.mode !== "full" ? (
          <div className="mt-2 text-sm text-gray-400">
            Unlock to see which keywords were added in the rewritten resume.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-300 mb-2">Keywords added</div>
              <div className="flex flex-wrap gap-2">
                {(report.improvements?.required_skills_added ?? [])
                  .concat(report.improvements?.tools_added ?? [])
                  .concat(report.improvements?.metrics_added ?? [])
                  .slice(0, 24)
                  .map((k: string) => (
                    <Chip key={"a-" + k} text={k} tone="good" />
                  ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-2">Next actions</div>
              <ul className="text-sm text-gray-400 list-disc pl-5 space-y-1">
                <li>Add 2–3 concrete metrics (%, $, time saved). If unknown, mark TODO.</li>
                <li>Move the most relevant skills into "Core Skills" near the top.</li>
                <li>Mirror the JD wording naturally (no keyword stuffing).</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* LOCK / FULL RESUME */}
      {report.mode === "preview" ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="text-xl font-semibold text-white">Full Rewrite (Locked)</div>
          <p className="text-sm text-gray-400">
            Unlock to generate the full ATS-aligned rewritten resume and after-score report.
          </p>
          {onUnlock && (
            <button
              className="px-5 py-3 rounded-xl bg-emerald-500 text-black font-semibold w-fit"
              onClick={onUnlock}
            >
              Unlock Full Report (₩1,000 / ~$2)
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xl font-semibold text-white mb-2">Rewritten Resume</div>
          <pre className="whitespace-pre-wrap text-sm text-gray-100">
            {report.rewritten}
          </pre>
        </div>
      )}
    </div>
  );
}

export function resultJsonToReport(data: any): ReportData {
  const extracted = data?.extractedKeywords || {};
  const gaps = data?.gaps || {};
  const subscoresBefore = data?.subscores_before || data?.subscoresBefore || {};
  const subscoresAfter = data?.subscores_after || data?.subscoresAfter || {};

  const requiredExtracted = asList(extracted.required_skills);
  const toolsExtracted = asList(extracted.tools);
  const metricsExtracted = asList(extracted.metrics_keywords);
  const softExtracted = asList(extracted.soft_skills);

  const requiredMissing = asList(gaps.required_skills);
  const toolsMissing = asList(gaps.tools);
  const metricsMissing = asList(gaps.metrics_keywords);
  const softMissing = asList(gaps.soft_skills);

  const overallBefore = Number(data?.overall_before ?? data?.overallBefore ?? 0);
  const overallAfter = Number(data?.overall_after ?? data?.overallAfter ?? 0);

  return {
    overallBefore,
    overallAfter,
    subscoresBefore: {
      skills: Number(subscoresBefore.skills ?? 0),
      impact: Number(subscoresBefore.impact ?? 0),
      brevity: Number(subscoresBefore.brevity ?? 0),
    },
    subscoresAfter: {
      skills: Number(subscoresAfter.skills ?? 0),
      impact: Number(subscoresAfter.impact ?? 0),
      brevity: Number(subscoresAfter.brevity ?? 0),
    },
    required: { matched: computeMatched(requiredExtracted, requiredMissing), missing: requiredMissing },
    tools: { matched: computeMatched(toolsExtracted, toolsMissing), missing: toolsMissing },
    metrics: { matched: computeMatched(metricsExtracted, metricsMissing), missing: metricsMissing },
    soft: { matched: computeMatched(softExtracted, softMissing), missing: softMissing },
    improvements: data?.improvements || null,
    rewritten: String(data?.rewrittenResume ?? ""),
    mode: "full", // Results page always has full data
  };
}
