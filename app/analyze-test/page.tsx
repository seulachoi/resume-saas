"use client";

import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Paddle?: any;
  }
}

export default function AnalyzeTestPage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Read NEXT_PUBLIC envs in a safe way
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

  // ✅ Load Paddle script + Initialize once
  useEffect(() => {
    // If already loaded, just initialize
    const init = () => {
      if (!window.Paddle) return;

      if (!paddleToken) {
        // Token missing: we don't block the page, but checkout won't work
        return;
      }

      try {
        window.Paddle.Initialize({ token: paddleToken });
      } catch {
        // ignore
      }
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
      setError("Paddle token is missing. Set NEXT_PUBLIC_PADDLE_TOKEN in env.");
      return;
    }
    if (!paddlePriceId) {
      setError(
        "Paddle price id is missing. Set NEXT_PUBLIC_PADDLE_PRICE_ID in env."
      );
      return;
    }
    if (!baseUrl) {
      setError("Base URL missing. Set NEXT_PUBLIC_BASE_URL in env.");
      return;
    }
    if (!window.Paddle?.Checkout?.open) {
      setError("Paddle is not ready yet. Please try again in a moment.");
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId: paddlePriceId }],
      settings: {
        successUrl: `${baseUrl}/analyze-test?unlocked=1`,
      },
    });
  };

  // ✅ If redirected back with ?unlocked=1, automatically run FULL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlocked = params.get("unlocked");

    if (unlocked === "1") {
      // Only run if user already entered inputs (or keep last ones)
      // If empty, we simply show a message.
      if (resumeText.length >= 200 && jdText.length >= 200) {
        callAnalyze("full");
      } else {
        setError(
          "Payment success detected. Please paste your resume & job description again, then click Run Analyze."
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analyze Test</h1>

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
        <section className="space-y-4">
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
        </section>
      )}
    </main>
  );
}
