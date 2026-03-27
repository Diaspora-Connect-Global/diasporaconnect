export default function AboutPage() {
  return (
    <main className="min-h-screen bg-surface-brand-default/60 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border-subtle bg-surface-default p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">About DiaspoPlug</h1>
        <p className="mt-4 text-text-secondary">
          DiaspoPlug helps diaspora communities stay connected, build trust, and create opportunities
          across borders. We bring people, organizations, and vendors together in one platform built
          for meaningful collaboration.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">What we do</h2>
          <p className="text-text-secondary">
            We provide community spaces, events, marketplace services, and professional networking
            tools so members can discover opportunities, support local and diaspora businesses, and
            stay engaged with what matters to them.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Our mission</h2>
          <p className="text-text-secondary">
            Our mission is to make diaspora engagement structured, transparent, and impactful by
            giving members the tools to collaborate, grow, and contribute to their communities.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Who we serve</h2>
          <p className="text-text-secondary">
            DiaspoPlug is designed for diaspora members, local community leaders, associations, and
            trusted vendors who want to connect and create value together.
          </p>
        </section>
      </div>
    </main>
  );
}
