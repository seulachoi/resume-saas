"use client";

import { useEffect, useState } from "react";

const LS_RESUME_KEY = "resumeup_resumeText";
const LS_JD_KEY = "resumeup_jdText";
const LS_SID_KEY = "resumeup_sid";

function ScoreRing({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-16 w-16 rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${v * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
        }}
      >
        <div className="h-full w-full p-2">
          <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
            <div className="text-sm font-semibold">{v}</div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-lg font-semibold">{v}/100</div>
      </div>
    </div>
  );
}

function BarCompare({
  before,
  after,
  label,
}: {
  before: number;
  after: number;
  label: string;
}) {
  const b = Math.max(0, Math.min(100, before));
  const a = Math.max(0, Math.min(100, after));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{label}</span>
        <span>
          {b} → <span className="text-white font-semibold">{a}</span>
        </span>
      </div>
      <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
        <div className="h-2 bg-white/25" style={{ width: `${b}%` }} />
      </div>
      <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
        <div className="h-2 bg-emerald-500" style={{ width: `${a}%` }} />
      </div>
      <div className="text-xs text-gray-500">Top: before / Bottom: after</div>
    </div>
  );
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

  const callAnalyze = async (mode: "preview" | "full", override?: { r: string; j: string }) => {
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
          sid, // ✅ full일 때만 필요
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

  // ✅ Create checkout session on server (sid + checkoutUrl)
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
        body: JSON.stringify({
          resumeText,
          jdText,
          atsBefore: result.atsScore,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout creation failed");

      // Save sid for full verification
      localStorage.setItem(LS_SID_KEY, data.sid);

      // Redirect to Lemon checkout
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
          // ✅ full 호출 시 sid는 callAnalyze 내부에서 localStorage에서 읽어서 포함됨
          await callAnalyze("full", { r, j });
        } else {
          setError(
            "Payment success detected. Please paste your resume & job description again, then click Run Analyze (Preview)."
          );
        }

        // Clean URL and jump to analyzer
        window.history.replaceState({}, "", window.location.pathname + "#analyzer");
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-12">
      {/* Landing */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold">ResumeUp</h1>
        <p className="text-lg text-gray-600">
          AI-powered ATS resume optimization for global job seekers.
        </p>
        <p>
          ResumeUp analyzes your resume against a job description and provides keyword alignment insights and a fully
          rewritten ATS-optimized version.
        </p>
        <a href="#analyzer" className="inline-block px-6 py-3 bg-black text-white rounded">
          Try Resume Analyzer
        </a>
      </section>

      {/* Analyzer */}
      <section id="analyzer" className="space-y-4">
        <h2 className="text-2xl font-semibold">Resume Analyzer</h2>
        <p className="text-sm text-gray-600">
          Paste your resume and job description to get a preview ATS score and keyword gaps. Unlock to generate the full
          rewritten resume.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-medium">Resume Text</label>
            <textarea
              className="w-full h-64 border rounded p-2"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text here..."
            />
          </div>

          <div className="space-y-2">
            <label className="font-medium">Job Description Text</label>
            <textarea
              className="w-full h-64 border rounded p-2"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description here..."
            />
          </div>
        </div>

        <button
          onClick={runPreview}
          disabled={loading || resumeText.length < 200 || jdText.length < 200}
          className="px-4 py-2 rounded border"
        >
          {loading ? "Running..." : "Run Analyze (Preview)"}
        </button>

        {error && <p className="text-red-600">Error: {error}</p>}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <ScoreRing value={result.atsScore} label="ATS Score (Before)" />
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/5 md:col-span-2">
                {result.mode === "full" ? (
                  <ScoreRing value={result.atsAfter} label="ATS Score (After)" />
                ) : (
                  <div className="text-sm text-gray-400">
                    Unlock to generate the full rewrite and after-score report.
                  </div>
                )}
              </div>
            </div>

            {result.mode === "full" && (
              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <BarCompare
                  before={result.atsScore}
                  after={result.atsAfter}
                  label="Overall ATS improvement"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <div className="text-sm text-gray-400 mb-2">Keyword Gaps</div>
                <pre className="whitespace-pre-wrap text-xs text-gray-200">
                  {JSON.stringify(result.gaps, null, 2)}
                </pre>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <div className="text-sm text-gray-400 mb-2">Improvements (Added)</div>
                {result.mode !== "full" ? (
                  <div className="text-sm text-gray-500">
                    Unlock to see what changed and which keywords were added.
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs text-gray-200">
                    {JSON.stringify(result.improvements, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {result.mode === "preview" ? (
              <div className="p-5 rounded-xl border border-white/10 bg-white/5 space-y-3">
                <div className="text-lg font-semibold">Full Rewrite (Locked)</div>
                <p className="text-sm text-gray-400">
                  Unlock to generate and view the full ATS-aligned rewritten resume and improvement report.
                </p>

                <button
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold w-fit"
                  onClick={unlockWithLemon}
                >
                  Unlock Full Report (₩1,000 / ~$2)
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                <div className="text-lg font-semibold mb-2">Rewritten Resume</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-100">
                  {result.rewrittenResume}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Pricing */}
      <section id="pricing" className="space-y-4">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="border p-6 rounded space-y-2">
          <h3 className="text-xl font-medium">Full Resume Rewrite</h3>
          <p>₩1,000 (~$2) one-time payment</p>
          <ul className="list-disc pl-6 text-sm text-gray-600">
            <li>ATS keyword analysis</li>
            <li>Keyword gap report</li>
            <li>Full rewritten resume (max 2 pages)</li>
            <li>Global English optimization</li>
          </ul>
        </div>
      </section>

      {/* About */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">About ResumeUp</h2>
        <p>
          ResumeUp is an independent AI-driven resume optimization service designed for global professionals applying to
          international roles.
        </p>
        <p>We leverage advanced language models to help candidates improve keyword alignment, clarity, and impact.</p>
      </section>

      <footer className="pt-12 border-t text-sm text-gray-500 space-x-4">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/refund">Refund</a>
        <a href="/contact">Contact</a>
      </footer>
    </main>
  );
}