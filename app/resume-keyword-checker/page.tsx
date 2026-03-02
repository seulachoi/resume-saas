import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Keyword Checker | Find Missing ATS Keywords (Free) – ResumeUp",
  description:
    "Find missing ATS keywords in your resume vs a job description. Get a free keyword gap report (skills, tools, metrics) and unlock a recruiter-grade rewrite with after-score improvements.",
  alternates: { canonical: "/resume-keyword-checker" },
  openGraph: {
    title: "Resume Keyword Checker | ResumeUp",
    description:
      "Free keyword gap report vs job description. Find missing skills, tools, and metrics terms for ATS screening.",
    url: "/resume-keyword-checker",
    type: "website",
  },
};

export default function ResumeKeywordCheckerPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold text-slate-900">ResumeUp</div>
          </a>
          <a
            href="/#analyzer"
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Find missing keywords →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Resume Keyword Checker
            <span className="text-emerald-600"> – Find Missing ATS Keywords</span>
          </h1>

          <p className="mt-6 text-lg text-slate-700 leading-relaxed">
            Keyword gaps are one of the biggest reasons resumes underperform in ATS screening. Recruiters and screening
            systems compare your resume against the job description language. If you miss key terms, your resume can be
            filtered out even when you&apos;re qualified.
          </p>

          <p className="mt-4 text-slate-700 leading-relaxed">
            ResumeUp shows <b>exact missing keywords</b> (required skills, tools, metric language, soft skills) and gives
            a score-first preview so you can prioritize what to fix first without stuffing.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/#analyzer"
              className="rounded-2xl px-8 py-4 text-base font-semibold text-slate-950
                         bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
                         shadow-xl shadow-emerald-500/25 transition"
            >
              Run keyword gap check (free) →
            </a>
            <a
              href="/#pricing"
              className="rounded-2xl px-8 py-4 text-base font-semibold border border-slate-200 bg-white hover:bg-slate-50"
            >
              Unlock full rewrite
            </a>
          </div>

          <div className="mt-6 text-sm text-slate-500">
            Free preview first · No keyword stuffing · No invented metrics
          </div>
        </div>

        <div className="mt-14 max-w-4xl">
          <h2 className="text-2xl font-semibold">What keywords does ATS look for?</h2>
          <p className="mt-4 text-slate-700 leading-relaxed">
            ATS keyword matching isn&apos;t only about "skills." Most job descriptions include:
            <b> required skills</b>, <b>tools</b>, and <b>metrics language</b> (like "A/B testing", "LTV", "SQL", "revenue
            growth"). Missing these reduces visibility quickly.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">Example missing keywords we often find</h2>
          <ul className="mt-4 space-y-2 text-slate-700">
            <li>• Cross-functional collaboration</li>
            <li>• Stakeholder management</li>
            <li>• Experimentation / A/B testing</li>
            <li>• Revenue tooling / funnel analytics</li>
            <li>• SQL / dashboards / reporting</li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold">How ResumeUp&apos;s keyword gap report works</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "1) Extract keywords from JD",
                desc: "We extract structured keywords (skills/tools/metrics/soft skills) from the job description.",
              },
              {
                title: "2) Compare vs your resume",
                desc: "We check what is missing and what is already matched (no guesswork).",
              },
              {
                title: "3) Show gaps + priorities",
                desc: "We show category-level missing counts and highlight the fastest fixes.",
              },
            ].map((x) => (
              <div key={x.title} className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="font-semibold">{x.title}</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">{x.desc}</div>
              </div>
            ))}
          </div>

          <h2 className="mt-12 text-2xl font-semibold">FAQ</h2>
          <div className="mt-4 space-y-4">
            {[
              {
                q: "Is a resume keyword checker enough to pass ATS?",
                a: "It helps a lot, but you also need clear impact (numbers) and scannable formatting. ResumeUp shows both keyword gaps and impact checklist items.",
              },
              {
                q: "Will this force keywords even if they don't match my experience?",
                a: "No. We only recommend integrating keywords when consistent with your resume facts. Otherwise, it stays in the gap list.",
              },
              {
                q: "Do you support different job tracks?",
                a: "Yes. You can choose role track and seniority to tailor keyword expectations and rewrite style.",
              },
              {
                q: "What do I do after I see missing keywords?",
                a: "Use the report to update your Skills section and rewrite 2–3 bullets per role with keyword-aligned language plus measurable outcomes.",
              },
            ].map((x) => (
              <div key={x.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="font-semibold">{x.q}</div>
                <div className="mt-2 text-sm text-slate-700 leading-relaxed">{x.a}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-start gap-3">
            <a
              href="/#analyzer"
              className="rounded-2xl px-8 py-4 text-base font-semibold text-white
                         bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                         shadow-lg transition"
            >
              Check missing ATS keywords →
            </a>
            <div className="text-xs text-slate-500">
              Paste both resume + job description to get accurate keyword gaps.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
