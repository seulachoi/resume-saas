import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Keyword Checker – Find Missing ATS Keywords",
  description:
    "Find missing ATS keywords in your resume. See keyword gaps instantly and get a free score preview before unlocking a full rewrite.",
};

export default function ResumeKeywordCheckerPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <span className="font-semibold">ResumeUp</span>
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Resume Keyword Checker – Find Missing ATS Keywords</h1>
        <p className="mt-6 text-lg text-slate-700">
          Keyword gaps are one of the biggest reasons resumes underperform in ATS. Recruiters and screening systems compare your
          resume against the job description language, so missing core terms can reduce visibility fast. ResumeUp shows the exact
          missing keywords and gives a score-first preview so you can prioritize what to fix first without stuffing.
        </p>
        <div className="mt-4 text-lg text-slate-700">
          Example missing keywords we often find:
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li>Cross-functional collaboration</li>
            <li>SaaS go-to-market</li>
            <li>Revenue operations tooling</li>
            <li>Stakeholder management</li>
            <li>Experimentation / A/B testing</li>
          </ul>
        </div>
        <p className="mt-4 text-lg text-slate-700">
          Most resumes fail ATS because of missing keywords. Our free preview shows your ATS score and exact keyword gaps.
        </p>

        <div className="mt-10">
          <a
            href="/#analyzer"
            className="inline-flex items-center justify-center rounded-2xl px-8 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-500/25"
          >
            Get your free ATS preview →
          </a>
        </div>
      </section>
    </main>
  );
}
