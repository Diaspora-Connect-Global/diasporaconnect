const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@diaspoplug.com";
const businessEmail = "partners@diaspoplug.com";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-surface-brand-default/60 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border-subtle bg-surface-default p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Contact Us</h1>
        <p className="mt-4 text-text-secondary">
          We are here to help. Reach out for support, partnership inquiries, or product feedback.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <section className="rounded-xl border border-border-subtle p-5">
            <h2 className="text-lg font-semibold text-text-primary">Support</h2>
            <p className="mt-2 text-text-secondary">
              For account, technical, or billing questions.
            </p>
            <a className="mt-4 inline-block text-text-brand hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </section>

          <section className="rounded-xl border border-border-subtle p-5">
            <h2 className="text-lg font-semibold text-text-primary">Partnerships</h2>
            <p className="mt-2 text-text-secondary">
              For community collaborations and strategic partnerships.
            </p>
            <a className="mt-4 inline-block text-text-brand hover:underline" href={`mailto:${businessEmail}`}>
              {businessEmail}
            </a>
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-border-subtle p-5">
          <h2 className="text-lg font-semibold text-text-primary">Response time</h2>
          <p className="mt-2 text-text-secondary">
            We usually respond within 24-48 hours on business days.
          </p>
        </section>
      </div>
    </main>
  );
}
