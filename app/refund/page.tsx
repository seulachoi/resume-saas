export default function RefundPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8 text-slate-800">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Refund Policy</h1>
        <p className="text-sm text-slate-500">Last updated: February 27, 2026</p>
      </header>

      <section className="space-y-3">
        <p>
          ResumeUp provides digital services. By default, purchases are non-refundable
          after delivery of digital value, except where required by law or where a verified
          technical failure occurred.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Eligible Refund Cases</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>duplicate charge for the same order</li>
          <li>payment succeeded but credits/report were not delivered due to system error</li>
          <li>technical failure that prevented use of purchased credits</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. Non-Refundable Cases</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>change of mind after digital value has been delivered</li>
          <li>dissatisfaction based solely on subjective writing preference</li>
          <li>failure to secure interviews or job offers</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. Request Window</h2>
        <p>
          Please submit refund requests within 7 days of purchase, with your order ID or
          checkout session ID and a short issue description.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. How to Request a Refund</h2>
        <p>
          Email{" "}
          <a className="underline" href="mailto:peach43054@gmail.com">
            peach43054@gmail.com
          </a>{" "}
          with the subject &quot;Refund Request&quot; and include:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>account email used for purchase</li>
          <li>order ID / sid</li>
          <li>what happened and when</li>
          <li>screenshots or error messages (if available)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Refund Processing</h2>
        <p>
          Approved refunds are issued via the original payment channel (through Lemon Squeezy
          and relevant payment processors). Processing time may vary by payment provider.
        </p>
        <p>
          If a refund is approved for a credited purchase, related credits may be revoked.
        </p>
      </section>
    </main>
  );
}
