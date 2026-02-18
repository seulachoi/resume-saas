"use client";

import { useState } from "react";

export default function AnalyzeTestPage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
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
        onClick={run}
        disabled={loading || resumeText.length < 200 || jdText.length < 200}
        className="px-4 py-2 rounded border"
      >
        {loading ? "Running..." : "Run Analyze"}
      </button>

      {error && <p className="text-red-600">Error: {error}</p>}

      {result && (
        <section className="space-y-4">
          <div className="p-4 border rounded">
            <div className="text-lg font-medium">ATS Score</div>
            <div className="text-3xl">{result.atsScore}</div>
          </div>

          <div className="p-4 border rounded">
            <div className="text-lg font-medium mb-2">Keyword Gaps</div>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(result.gaps, null, 2)}
            </pre>
          </div>

          <div className="p-4 border rounded">
            <div className="text-lg font-medium mb-2">Rewritten Resume</div>
            <pre className="whitespace-pre-wrap text-sm">
              {result.rewrittenResume}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}
