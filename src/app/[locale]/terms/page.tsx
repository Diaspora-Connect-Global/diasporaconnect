const LAST_UPDATED = "March 27, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-surface-brand-default/60 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border-subtle bg-surface-default p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-text-secondary">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-text-secondary">
          <section>
            <h2 className="text-xl font-semibold text-text-primary">1. Acceptance of terms</h2>
            <p className="mt-2">
              By accessing or using DiaspoPlug, you agree to these Terms of Service and any
              applicable policies referenced in them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">2. Account responsibilities</h2>
            <p className="mt-2">
              You are responsible for safeguarding your account credentials and for activity under
              your account. You must provide accurate information and keep it up to date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">3. Acceptable use</h2>
            <p className="mt-2">
              You agree not to use the platform for unlawful conduct, fraud, harassment, hate
              speech, impersonation, or any activity that harms users, communities, or vendors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">4. Marketplace and vendor activity</h2>
            <p className="mt-2">
              Vendors are responsible for the accuracy of listings, fulfillment, and compliance with
              local laws. DiaspoPlug may suspend or remove listings that violate policy or law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">5. Content and intellectual property</h2>
            <p className="mt-2">
              You retain ownership of content you submit. By posting content, you grant DiaspoPlug a
              non-exclusive license to host, display, and distribute it in connection with operating
              the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">6. Suspension and termination</h2>
            <p className="mt-2">
              We may suspend or terminate accounts that violate these terms, threaten platform
              integrity, or create legal or security risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">7. Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, DiaspoPlug is not liable for indirect,
              incidental, or consequential damages resulting from use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary">8. Contact</h2>
            <p className="mt-2">
              Questions about these terms can be sent to{" "}
              <a className="text-text-brand hover:underline" href="mailto:support@diaspoplug.com">
                support@diaspoplug.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
