export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8 text-slate-800">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last updated: February 27, 2026</p>
      </header>

      <section className="space-y-3">
        <p>
          This Privacy Policy explains how ResumeUp collects, uses, and protects your
          information when you use our website and services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>account information (such as email address via authentication provider)</li>
          <li>resume text and job description text you submit</li>
          <li>usage and transaction data (credits, checkout/session status, logs)</li>
          <li>technical data (browser/device metadata, basic analytics events)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. How We Use Information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>to provide ATS analysis and rewrite features</li>
          <li>to process purchases and credits</li>
          <li>to detect abuse, prevent fraud, and secure the service</li>
          <li>to improve product quality and support users</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. Payments</h2>
        <p>
          Payments are processed by third-party processors, including Lemon Squeezy
          (and underlying card/payment networks such as Stripe, where applicable).
          We do not store full payment card details on our own servers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. Data Sharing</h2>
        <p>
          We do not sell your personal data. We may share limited data with trusted
          processors required to operate the Service (authentication, hosting, payments,
          analytics), subject to contractual and legal safeguards.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Data Retention</h2>
        <p>
          We retain data only as long as needed for service delivery, legal compliance,
          dispute resolution, and security. Retention periods may vary by data type.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational safeguards.
          No system is perfectly secure; you use the Service at your own risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, or delete
          your personal data. Contact us to request support.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. Contact</h2>
        <p>
          For privacy questions, contact{" "}
          <a className="underline" href="mailto:resumeup_support@gmail.com">
            resumeup_support@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
