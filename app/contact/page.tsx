export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8 text-slate-800">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="text-slate-600">
          Have a question about billing, credits, refunds, or your report? We can help.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Support Email</h2>
        <p>
          Email:{" "}
          <a className="underline font-medium" href="mailto:peach43054@gmail.com">
            peach43054@gmail.com
          </a>
        </p>
        <p className="text-sm text-slate-500">Typical response time: within 1-2 business days.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">For Faster Support, Include</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>the email used for your ResumeUp account</li>
          <li>your order ID or checkout session ID (if billing-related)</li>
          <li>a short description of the issue and any error message</li>
          <li>screenshots if available</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Billing and Refund Requests</h2>
        <p>
          For billing and refund matters, contact us via email with your order details.
          Refunds are reviewed under our{" "}
          <a className="underline" href="/refund">
            Refund Policy
          </a>
          .
        </p>
      </section>

      <section className="border-t border-slate-200 pt-6 space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Business Information</h2>
        <p>Operator: Seula Choi (sole proprietor)</p>
        <p>Location: Republic of Korea</p>
      </section>
    </main>
  );
}
