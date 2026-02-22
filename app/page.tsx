"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportView, type ReportData } from "@/components/ReportView";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_SID_KEY = "resumeup_sid";

function asList(x: any): string[] {
  return Array.isArray(x) ? x.map(String) : [];
}

function ShareResultLink() {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    try {
      const sid = localStorage.getItem(LS_SID_KEY) || "";
      setUrl(sid ? `${window.location.origin}/results/${sid}` : "");
    } catch {
      setUrl("");
    }
  }, []);
  if (!url) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-2 flex-wrap">
      <span className="text-sm text-gray-400">
        Save or share this link to revisit your result:
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-emerald-400 hover:underline truncate max-w-xs"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url);
        }}
        className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5"
      >
        Copy
      </button>
    </div>
  );
}

function computeMatched(extracted: string[], gaps: string[]): string[] {
  const gapSet = new Set((gaps || []).map((s) => String(s).toLowerCase()));
  return (extracted || []).filter((k) => !gapSet.has(String(k).toLowerCase()));
}

export default function HomePage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore inputs on first load
  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_RESUME_KEY) || "";
      const j = localStorage.getItem(LS_JD_KEY) || "";
      if (r) setResumeText(r);
      if (j) setJdText(j);
    } catch {
      // ignore
    }
  }, []);

  // Persist inputs whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LS_RESUME_KEY, resumeText);
      localStorage.setItem(LS_JD_KEY, jdText);
    } catch {
      // ignore
    }
  }, [resumeText, jdText]);

  const callAnalyze = async (
    mode: "preview" | "full",
    override?: { r: string; j: string }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const r = override?.r ?? resumeText;
      const j = override?.j ?? jdText;
      const sid = mode === "full" ? localStorage.getItem(LS_SID_KEY) : null;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: r,
          jdText: j,
          mode,
          sid,
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

  const runPreview = async () => {
    setResult(null);
    await callAnalyze("preview");
  };

  const unlockWithLemon = async () => {
    setError(null);

    if (!result || result.mode !== "preview") {
      setError("Run preview first.");
      return;
    }

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, atsBefore: result.atsScore }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout creation failed");

      localStorage.setItem(LS_SID_KEY, data.sid);
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message);
    }
  };

  // After returning from checkout (?unlocked=1), auto-run FULL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlocked = params.get("unlocked");

    if (unlocked === "1") {
      setTimeout(async () => {
        let r = "";
        let j = "";

        try {
          r = localStorage.getItem(LS_RESUME_KEY) || "";
          j = localStorage.getItem(LS_JD_KEY) || "";
        } catch {
          // ignore
        }

        if (r.length >= 200 && j.length >= 200) {
          setResumeText(r);
          setJdText(j);
          await callAnalyze("full", { r, j });
        } else {
          setError(
            "Payment success detected. Please paste your resume & job description again, then click Run Analyze (Preview)."
          );
        }

        window.history.replaceState({}, "", window.location.pathname + "#analyzer");
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = useMemo((): ReportData | null => {
    if (!result) return null;

    const extracted = result.extractedKeywords || {};
    const gaps = result.gaps || {};

    const requiredExtracted = asList(extracted.required_skills);
    const toolsExtracted = asList(extracted.tools);
    const metricsExtracted = asList(extracted.metrics_keywords);
    const softExtracted = asList(extracted.soft_skills);

    const requiredMissing = asList(gaps.required_skills);
    const toolsMissing = asList(gaps.tools);
    const metricsMissing = asList(gaps.metrics_keywords);
    const softMissing = asList(gaps.soft_skills);

    const subscoresBefore = result.subscoresBefore || {};
    const subscoresAfter = result.subscoresAfter || {};
    const overallBefore = Number(result.overallBefore ?? result.atsScore ?? 0);
    const overallAfter = Number(result.overallAfter ?? result.atsAfter ?? result.atsScore ?? 0);

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
      improvements: result.improvements || null,
      rewritten: String(result.rewrittenResume || ""),
      mode: (result.mode === "full" ? "full" : "preview") as "preview" | "full",
    };
  }, [result]);

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-12">
      {/* HERO */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8 md:p-10 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">ResumeUp</h1>
            <p className="mt-2 text-gray-300 text-lg">
              ATS keyword alignment + AI rewrite for global job seekers.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
              Secure checkout
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
              English-first
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200">
              No keyword stuffing
            </span>
          </div>
        </div>

        <p className="text-gray-300 max-w-3xl">
          Paste your resume + job description. Get an immediate keyword report and an ATS score preview.
          Unlock to generate a full rewritten resume (max 2 pages) and an after-score improvement report.
        </p>

        <a
          href="#analyzer"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black w-fit"
        >
          Analyze my resume
        </a>
      </section>

      {/* ANALYZER */}
      <section id="analyzer" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Resume Analyzer</h2>
            <p className="text-sm text-gray-400">
              Preview: score + keyword report. Full: rewrite + after-score + improvements.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <label className="text-sm text-gray-300">Resume Text</label>
            <textarea
              className="w-full h-64 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-gray-100 outline-none"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text here..."
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <label className="text-sm text-gray-300">Job Description Text</label>
            <textarea
              className="w-full h-64 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-gray-100 outline-none"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description here..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runPreview}
            disabled={loading || resumeText.length < 200 || jdText.length < 200}
            className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-semibold disabled:opacity-40"
          >
            {loading ? "Running..." : "Run Analyze (Preview)"}
          </button>

          <span className="text-xs text-gray-500">
            Minimum 200 characters each.
          </span>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
            Error: {error}
          </div>
        )}

        {/* REPORT */}
        {report && (
          <div className="space-y-6">
            <ReportView report={report} onUnlock={unlockWithLemon} />
            {report.mode === "full" && (
              <ShareResultLink />
            )}
          </div>
        )}
      </section>

      {/* PRICING */}
      <section id="pricing" className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Pricing</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-2">
          <h3 className="text-xl font-semibold text-white">Full Resume Rewrite</h3>
          <p className="text-gray-300">₩1,000 (~$2) one-time payment</p>
          <ul className="list-disc pl-6 text-sm text-gray-400 space-y-1">
            <li>ATS keyword analysis</li>
            <li>Matched vs Missing keyword report</li>
            <li>After-score improvement report</li>
            <li>Full rewritten resume (max 2 pages)</li>
          </ul>
        </div>
      </section>

      {/* ABOUT */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">About ResumeUp</h2>
        <p className="text-gray-300">
          ResumeUp is an independent AI-driven resume optimization service designed for global professionals applying
          to international roles.
        </p>
        <p className="text-gray-300">
          We optimize keyword alignment, clarity, and impact — while avoiding keyword stuffing and hallucinated metrics.
        </p>
      </section>

      <footer className="pt-12 border-t border-white/10 text-sm text-gray-400 space-x-4">
        <a href="/terms" className="hover:text-white">Terms</a>
        <a href="/privacy" className="hover:text-white">Privacy</a>
        <a href="/refund" className="hover:text-white">Refund</a>
        <a href="/contact" className="hover:text-white">Contact</a>
      </footer>
    </main>
  );
}