"use client";

import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Paddle?: any;
  }
}

export default function HomePage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paddleToken = useMemo(
    () => process.env.NEXT_PUBLIC_PADDLE_TOKEN || "",
    []
  );
  const paddlePriceId = useMemo(
    () => process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || "",
    []
  );
  const baseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BASE_URL || "",
    []
  );

  // Load Paddle script (for Unlock)
  useEffect(() => {
    const init = () => {
      if (!window.Paddle) return;
      if (!paddleToken) return;
      try {
        window.Paddle.Initialize({ token: paddleToken });
      } catch {}
    };

    const existing = document.querySelector(
      'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [paddleToken]);

  const callAnalyze = async (mode: "preview" | "full") => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, mode }),
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

  const unlock = () => {
    if (!paddleToken) {
      setError("Paddle token is missing (NEXT_PUBLIC_PADDLE_TOKEN).");
      return;
    }
    if (!paddlePriceId) {
      setError("Paddle price id is missing (NEXT_PUBLIC_PADDLE_PRICE_ID).");
      return;
    }
    if (!baseUrl) {
      setError("Base URL missing (NEXT_PUBLIC_BASE_URL).");
      return;
    }
    if (!window.Paddle?.Checkout?.open) {
      setError("Paddle is not ready yet. Please try again in a moment.");
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId: paddlePriceId }],
      settings: {
        successUrl: `${baseUrl}/?unlocked=1`,
      },
    });
  };

  // If redirected back with ?unlocked=1, run FULL (user must have inputs)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlocked = params.get("unlocked");
    if (unlocked === "1") {
      if (resumeText.length >= 200 && jdText.length >= 200) {
        callAnalyze("full");
      } else {
        setError(
          "Payment success detected. Paste resume & job description, then run preview again."
        );
      }
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
          ResumeUp analyzes your resume against a job description and provides
          keyword alignment insights and a fully rewritten ATS-optimized version.
        </p>
        <a href="#analyzer" className="inline-block px-6 py-3 bg-black text-white rounded">
          Try Resume Analyzer
        </a>
      </section>

      {/* Analyzer (Input form on landing) */}
      <section id="analyzer" className="space-y-4">
        <h2 className="text-2xl font-semibold">Resume Analyzer</h2>
        <p className="text-sm text-gray-600">
          Paste your resume and job description to get a preview ATS score and keyword gaps.
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
            <div className="p-4 border rounded">
              <div className="text-lg font-medium">ATS Score</div>
              <div className="text-3xl">{result.atsScore}</div>
              <div className="text-sm text-gray-500">mode: {result.mode}</div>
            </div>

            <div className="p-4 border rounded">
              <div className="text-lg font-medium mb-2">Keyword Gaps</div>
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(result.gaps, null, 2)}
              </pre>
            </div>

            {result.mode === "preview" ? (
              <div className="p-4 border rounded space-y-3">
                <div className="text-lg font-medium">Full Rewrite (Locked)</div>
                <p className="text-sm text-gray-600">
                  Unlock to generate and view the full ATS-aligned rewritten resume.
                </p>

                <button
                  className="px-4 py-2 rounded border bg-black text-white w-fit"
                  onClick={unlock}
                >
                  Unlock Full Resume ($2)
                </button>
              </div>
            ) : (
              <div className="p-4 border rounded">
                <div className="text-lg font-medium mb-2">Rewritten Resume</div>
                <pre className="whitespace-pre-wrap text-sm">
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
          <p>$2.00 one-time payment</p>
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
          ResumeUp is an independent AI-driven resume optimization service designed
          for global professionals applying to international roles.
        </p>
        <p>
          We leverage advanced language models to help candidates improve keyword
          alignment, clarity, and impact.
        </p>
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
