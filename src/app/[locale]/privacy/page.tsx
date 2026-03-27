const LAST_UPDATED = "March 27, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface-brand-default/60 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border-subtle bg-surface-default p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-text-secondary">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-text-secondary">
          <section>
            <h2 className="text-xl font-semibold text-text-primary">1. Information we collect</h2>
            <p className="mt-2">
              We collect account details, profile information, content you submit, transaction data,
              and technical data needed to operate and secure the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">2. How we use information</h2>
            <p className="mt-2">
              We use your information to provide services, personalize experiences, process
              transactions, improve safety, communicate updates, and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">3. Sharing of information</h2>
            <p className="mt-2">
              We do not sell personal data. We may share data with service providers, payment
              processors, and legal authorities where required to deliver services or meet legal
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">4. Data retention</h2>
            <p className="mt-2">
              We retain personal data for as long as needed to provide services, resolve disputes,
              and comply with legal and operational requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">5. Your rights</h2>
            <p className="mt-2">
              Depending on your jurisdiction, you may have rights to access, correct, delete, or
              restrict processing of your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">6. Security</h2>
            <p className="mt-2">
              We use administrative, technical, and organizational controls to protect your data.
              No system is fully immune to risk, but we continuously improve our safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">7. Contact</h2>
            <p className="mt-2">
              For privacy requests or questions, contact{" "}
              <a className="text-text-brand hover:underline" href="mailto:privacy@diaspoplug.com">
                privacy@diaspoplug.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
