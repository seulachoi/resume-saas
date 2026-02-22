"use client";

import { useEffect, useMemo, useState } from "react";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_SID_KEY = "resumeup_sid";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ScoreRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      className="h-16 w-16 rounded-full"
      style={{
        background: `conic-gradient(#0f172a ${v * 3.6}deg, #e2e8f0 0deg)`,
      }}
    >
      <div className="h-full w-full p-2">
        <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
          <div className="text-sm font-semibold text-slate-900">{v}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<any>(null); // preview result only
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // restore input
  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_RESUME_KEY) || "";
      const j = localStorage.getItem(LS_JD_KEY) || "";
      if (r) setResumeText(r);
      if (j) setJdText(j);
    } catch {}
  }, []);

  // persist input
  useEffect(() => {
    try {
      localStorage.setItem(LS_RESUME_KEY, resumeText);
      localStorage.setItem(LS_JD_KEY, jdText);
    } catch {}
  }, [resumeText, jdText]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText,
          mode: "preview",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const unlock = async () => {
    setError(null);

    if (!result) {
      setError("Run preview first.");
      return;
    }

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText,
          atsBefore: result.atsScore ?? result.overallBefore ?? 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout creation failed");

      localStorage.setItem(LS_SID_KEY, data.sid);
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message);
    }
  };

  const missingSummary = useMemo(() => {
    const gaps = result?.gaps || {};
    const c =
      (gaps.required_skills?.length || 0) +
      (gaps.tools?.length || 0) +
      (gaps.metrics_keywords?.length || 0) +
      (gaps.soft_skills?.length || 0);
    return c;
  }, [result]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="font-semibold">ResumeUp</div>
          </div>
          <div className="flex items-center gap-2">
            <a className="text-sm text-slate-600 hover:text-slate-900" href="#pricing">
              Pricing
            </a>
            <a className="text-sm text-slate-600 hover:text-slate-900" href="/terms">
              Terms
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Secure checkout</Badge>
              <Badge>English-first</Badge>
              <Badge>No keyword stuffing</Badge>
              <Badge>No invented metrics</Badge>
            </div>

            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight">
              Turn your resume into an <span className="text-slate-600">ATS-friendly</span> version — fast.
            </h1>
            <p className="text-slate-600 text-lg">
              Paste your resume + job description. Get a keyword gap report and an ATS-style score preview.
              Unlock to generate the full rewrite and improvement report.
            </p>

            <div className="flex items-center gap-3">
              <PrimaryButton
                onClick={() => document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" })}
              >
                Improve My Resume
              </PrimaryButton>
              <SecondaryButton onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                See pricing
              </SecondaryButton>
            </div>

            <div className="text-xs text-slate-500">
              Tip: Best results when you include measurable metrics (%, $, time saved). If unknown, we’ll keep TODO placeholders.
            </div>
          </div>

          {/* Preview mock card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="text-sm text-slate-500">Sample report preview</div>
            <div className="mt-4 flex items-center gap-4">
              <ScoreRing value={78} />
              <div>
                <div className="text-xl font-semibold">Overall score</div>
                <div className="text-sm text-slate-600">Skills • Impact • Brevity</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Skills</div>
                <div className="text-lg font-semibold">82</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Impact</div>
                <div className="text-lg font-semibold">74</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Brevity</div>
                <div className="text-lg font-semibold">88</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analyzer */}
      <section id="analyzer" className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Analyzer</h2>
            <p className="text-slate-600">Preview is free. Unlock generates the full rewrite + after-score report.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-sm font-medium text-slate-700">Resume</div>
            <textarea
              className="w-full h-64 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text..."
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-sm font-medium text-slate-700">Job description</div>
            <textarea
              className="w-full h-64 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={runPreview} disabled={loading || resumeText.length < 200 || jdText.length < 200}>
            {loading ? "Analyzing..." : "Run preview"}
          </PrimaryButton>

          <SecondaryButton onClick={unlock} disabled={!result}>
            Unlock full report (₩1,000 / ~$2)
          </SecondaryButton>

          <span className="text-xs text-slate-500">Minimum 200 characters each</span>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <ScoreRing value={Number(result.overallBefore ?? result.atsScore ?? 0)} />
                <div>
                  <div className="text-lg font-semibold">Preview score</div>
                  <div className="text-sm text-slate-600">
                    Missing keywords: <span className="font-semibold">{missingSummary}</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                After payment, your full report will open on a dedicated results page.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <p className="mt-2 text-slate-600">Simple one-time payment.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-lg font-semibold">Full report</div>
              <div className="mt-1 text-3xl font-semibold">₩1,000</div>
              <div className="text-sm text-slate-600">(~$2) one-time</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 list-disc pl-5">
                <li>Overall score + 3 sub-scores (Skills/Impact/Brevity)</li>
                <li>Matched vs Missing keywords by category</li>
                <li>After-score improvement report</li>
                <li>Full rewritten resume (max 2 pages)</li>
              </ul>
              <div className="mt-6">
                <PrimaryButton
                  onClick={() => document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Start with preview
                </PrimaryButton>
              </div>
            </div>

            <div className="text-sm text-slate-600 space-y-3">
              <div className="font-semibold text-slate-900">FAQ</div>
              <div>
                <div className="font-medium text-slate-800">Does this guarantee interviews?</div>
                <div>No. It improves clarity and keyword alignment, but outcomes depend on many factors.</div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Do you store my data?</div>
                <div>
                  We store the minimum needed to deliver your paid report. We do not sell your data.
                </div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Refund policy</div>
                <div>Digital product. If you experience technical issues, contact support within 7 days.</div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500 space-x-4">
            <a href="/terms" className="hover:text-slate-900">Terms</a>
            <a href="/privacy" className="hover:text-slate-900">Privacy</a>
            <a href="/refund" className="hover:text-slate-900">Refund</a>
            <a href="/contact" className="hover:text-slate-900">Contact</a>
          </div>
        </div>
      </section>
    </main>
  );
}