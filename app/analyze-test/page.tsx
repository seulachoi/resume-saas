export default function HomePage() {
    return (
      <main className="max-w-4xl mx-auto p-8 space-y-12">
        <section className="space-y-4">
          <h1 className="text-4xl font-bold">ResumeUp</h1>
          <p className="text-lg text-gray-600">
            AI-powered ATS resume optimization for global job seekers.
          </p>
          <p>
            ResumeUp analyzes your resume against a job description and provides
            keyword alignment insights and a fully rewritten ATS-optimized version.
          </p>
          <a
            href="/analyze-test"
            className="inline-block px-6 py-3 bg-black text-white rounded"
          >
            Try Resume Analyzer
          </a>
        </section>
  
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
  
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">About ResumeUp</h2>
          <p>
            ResumeUp is an independent AI-driven resume optimization service
            designed for global professionals applying to international roles.
          </p>
          <p>
            We leverage advanced language models to help candidates improve
            keyword alignment, clarity, and impact.
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
  