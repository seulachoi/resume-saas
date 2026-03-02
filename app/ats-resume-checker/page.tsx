import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ATS Resume Checker (Free) | ATS Score + Keyword Gaps – ResumeUp",
  description:
    "Check your ATS resume score instantly. Find missing keywords, tools, and measurable impact gaps. Get a free ATS preview, then unlock a recruiter-grade rewrite with after-score improvements.",
  alternates: { canonical: "/ats-resume-checker" },
  openGraph: {
    title: "ATS Resume Checker (Free) | ResumeUp",
    description:
      "Free ATS score preview + missing keyword gaps. Unlock a recruiter-grade rewrite with after-score improvements.",
    url: "/ats-resume-checker",
    type: "website",
  },
};

export default function AtsResumeCheckerPage() {
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
            Get free ATS preview →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            ATS Resume Checker
            <span className="text-emerald-600"> (Free ATS Score + Keyword Gaps)</span>
          </h1>

          <p className="mt-6 text-lg text-slate-700 leading-relaxed">
            Most resumes fail ATS screening because of <b>missing role-relevant keywords</b>, weak impact language, or
            formatting that is hard to scan. ResumeUp gives you an instant, score-first ATS preview so you can see
            <b> what recruiters and ATS software look for</b>, what&apos;s missing, and what to fix first.
          </p>

          <p className="mt-4 text-slate-700 leading-relaxed">
            You&apos;ll get a <b>free ATS score preview</b> + a clear <b>keyword gap report</b>. If you want, you can then
            unlock a <b>recruiter-grade rewrite</b> that&apos;s tailored to your selected role track and seniority, with an
            after-score improvement report.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/#analyzer"
              className="rounded-2xl px-8 py-4 text-base font-semibold text-slate-950
                         bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
                         shadow-xl shadow-emerald-500/25 transition"
            >
              Check my ATS score (free) →
            </a>
            <a
              href="/#pricing"
              className="rounded-2xl px-8 py-4 text-base font-semibold border border-slate-200 bg-white hover:bg-slate-50"
            >
              View credit bundles
            </a>
          </div>

          <div className="mt-6 text-sm text-slate-500">
            No keyword stuffing · No invented metrics · If a metric is unknown, we keep a <b>TODO</b> placeholder.
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "ATS score preview",
              desc: "Get a quick score snapshot and see where your resume is weak (skills, impact, brevity).",
            },
            {
              title: "Keyword gap report",
              desc: "See missing required skills, tools, metric keywords, and soft skills from the job description.",
            },
            {
              title: "Role-tailored rewrite (optional)",
              desc: "Unlock a recruiter-grade rewrite tailored to your role track + seniority, plus after-score improvements.",
            },
          ].map((x) => (
            <div key={x.title} className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-lg font-semibold">{x.title}</div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">{x.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-14 max-w-4xl">
          <h2 className="text-2xl font-semibold">How an ATS resume score works</h2>
          <p className="mt-4 text-slate-700 leading-relaxed">
            An ATS (Applicant Tracking System) scans your resume to decide if it matches a job description. It typically
            rewards <b>keyword alignment</b>, <b>relevant tools</b>, and <b>measurable outcomes</b> (%, $, time, users).
            If your resume lacks those signals, you may be filtered out even if you&apos;re qualified.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">What ResumeUp checks</h2>
          <ul className="mt-4 space-y-2 text-slate-700">
            <li>• Missing keywords vs the job description (skills, tools, metrics, soft skills)</li>
            <li>• Impact signals: numbers, outcomes, scale (and TODO placeholders if missing)</li>
            <li>• Brevity & scannability: bullets vs paragraphs, length, readability</li>
            <li>• Role context: track + seniority adjusts expectations (ex: PM vs Eng, Mid vs Senior)</li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold">Free ATS resume checker: what you get</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="font-semibold">Free preview (no credit)</div>
              <div className="mt-2 text-sm text-slate-700">
                ATS preview score + checklist + keyword gaps. Helps you prioritize fixes fast.
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="font-semibold">Full report (credits)</div>
              <div className="mt-2 text-sm text-slate-700">
                Recruiter-grade rewrite + after-score report + "what changed" details. Saved to My Reports.
              </div>
            </div>
          </div>

          <h2 className="mt-12 text-2xl font-semibold">FAQ</h2>
          <div className="mt-4 space-y-4">
            {[
              {
                q: "Is this ATS resume checker really free?",
                a: "Yes. The ATS preview (score + checklist + keyword gaps) is free. Full rewrite generation uses credits.",
              },
              {
                q: "Will you invent metrics or rewrite facts that aren't in my resume?",
                a: "No. We do not fabricate employers, dates, titles, responsibilities, or numbers. If a metric is missing, we keep a TODO placeholder.",
              },
              {
                q: "Do you do keyword stuffing?",
                a: "No. Keywords are integrated naturally and only when consistent with your actual experience.",
              },
              {
                q: "How do role track and seniority affect the report?",
                a: "Your selection adjusts keyword weighting and impact expectations (e.g., engineering emphasizes tools/metrics more; senior expects clearer scale).",
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
              Get my free ATS preview →
            </a>
            <div className="text-xs text-slate-500">
              Tip: Paste at least <b>200 characters</b> for both resume and job description for best results.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
