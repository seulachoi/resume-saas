import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ATS Resume Checker – Instant Score & Keyword Gap Tool",
  description:
    "Check your ATS resume score instantly and find exact keyword gaps. Get a free ATS preview before generating a full recruiter-grade report.",
};

export default function AtsResumeCheckerPage() {
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
        <h1 className="text-4xl font-semibold tracking-tight">Check Your ATS Resume Score Instantly</h1>
        <p className="mt-6 text-lg text-slate-700">
          Most resumes fail ATS because of missing keywords. Our free preview shows your ATS score and exact keyword gaps.
          ATS systems scan for role-relevant language, measurable outcomes, and clear alignment with the job description.
          Even strong candidates get filtered out when resumes skip required tools, domain terms, or impact wording. ResumeUp
          highlights why your score is low, what keywords are missing, and where to fix weak bullet points first.
        </p>
        <p className="mt-4 text-lg text-slate-700">
          You get an instant score preview and a keyword gap report before paying. Then, if you choose, you can unlock a full
          rewrite with after-score improvements tailored to your target role and seniority.
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
