import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seoLandingPages } from "@/lib/seoLandingPages";

type Props = {
  params: Promise<{ slug: string }>;
};

const bySlug = new Map(seoLandingPages.map((x) => [x.slug, x]));

export async function generateStaticParams() {
  return seoLandingPages.map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = bySlug.get(slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `/${page.slug}`,
      type: "website",
    },
  };
}

export default async function GenericSeoLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = bySlug.get(slug);
  if (!page) notFound();

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
            Check ATS score now →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{page.h1}</h1>
          <p className="mt-6 text-lg text-slate-700 leading-relaxed">{page.lead}</p>
          <p className="mt-4 text-slate-700 leading-relaxed">
            Most resumes fail ATS because of missing keywords. ResumeUp shows your free ATS score preview and exact keyword
            gaps so you can fix the highest-impact issues first.
          </p>
          <div className="mt-8">
            <a
              href="/#analyzer"
              className="rounded-2xl px-8 py-4 text-base font-semibold text-slate-950
                         bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200
                         shadow-xl shadow-emerald-500/25 transition inline-flex"
            >
              Get free score preview →
            </a>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">What this checker focuses on</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>• Missing keywords and role terms</li>
              <li>• Weak impact signals and missing metrics</li>
              <li>• Bullet clarity and ATS scannability</li>
              <li>• Track and seniority fit</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">Common keyword gaps</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              {page.keywordExamples.map((k) => (
                <li key={k}>• {k}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 max-w-4xl">
          <h2 className="text-2xl font-semibold">How ResumeUp helps</h2>
          <p className="mt-4 text-slate-700 leading-relaxed">
            You start with a free preview: ATS score + checklist + keyword gaps. Then you can unlock a full recruiter-grade
            rewrite and after-score improvement report. Every full report is saved in My Reports for reuse.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">FAQ</h2>
          <div className="mt-4 space-y-4">
            {[
              {
                q: "Is the preview free?",
                a: "Yes. ATS score preview and keyword gaps are free. Full rewrite generation uses credits.",
              },
              {
                q: "Do you invent facts or metrics?",
                a: "No. ResumeUp does not fabricate data. If a metric is unknown, it remains as TODO placeholder guidance.",
              },
              {
                q: "Can I check another role?",
                a: "Yes. You can reuse your saved inputs and run additional role-specific checks.",
              },
            ].map((x) => (
              <div key={x.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="font-semibold">{x.q}</div>
                <div className="mt-2 text-sm text-slate-700 leading-relaxed">{x.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Free ATS score preview. No credit required.</div>
          <a
            href="/#analyzer"
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Score my resume →
          </a>
        </div>
      </div>
    </main>
  );
}

