import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, ogImages } from '@/lib/seo';

const LAST_UPDATED = '2026-03-27';
const LAST_UPDATED_DISPLAY = 'March 27, 2026';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the DiaspoPlug Terms of Service. These terms govern your use of the platform, your account responsibilities, acceptable use, marketplace activity, and your rights.',
  robots: publicRobots,
  alternates: buildAlternates('/terms'),
  openGraph: {
    title: `Terms of Service | ${SITE_NAME}`,
    description: 'The terms that govern your use of the DiaspoPlug platform.',
    url: `${BASE}/en/terms`,
    siteName: SITE_NAME,
    type: 'website',
    ...ogImages(null, 'Terms of Service'),
  },
};

const termsPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${BASE}/en/terms`,
  url: `${BASE}/en/terms`,
  name: `Terms of Service | ${SITE_NAME}`,
  description: 'The terms of service governing use of the DiaspoPlug platform.',
  inLanguage: 'en',
  dateModified: LAST_UPDATED,
  isPartOf: { '@id': `${BASE}/#website` },
  about: { '@id': `${BASE}/#organization` },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Terms of Service', item: `${BASE}/en/terms` },
    ],
  },
};

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of terms',
    body: 'By accessing or using DiaspoPlug, you agree to these Terms of Service and any applicable policies referenced in them. If you do not agree, please do not use the platform.',
  },
  {
    id: 'account',
    title: 'Account responsibilities',
    body: "You are responsible for safeguarding your account credentials and for all activity under your account. You must provide accurate information and keep it up to date. You may not share your account with others or use another member's account.",
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: 'You agree not to use the platform for unlawful conduct, fraud, harassment, hate speech, impersonation, spam, or any activity that harms users, communities, or vendors. Violations may result in immediate account suspension.',
  },
  {
    id: 'marketplace',
    title: 'Marketplace and vendor activity',
    body: 'Vendors are responsible for the accuracy of listings, fulfillment, and compliance with local laws. DiaspoPlug may suspend or remove listings that violate policy or law. Disputes between buyers and vendors must first be attempted through our resolution process.',
  },
  {
    id: 'ip',
    title: 'Content and intellectual property',
    body: 'You retain ownership of content you submit. By posting, you grant DiaspoPlug a non-exclusive, royalty-free license to host, display, and distribute it in connection with operating the platform. You must not post content that infringes third-party intellectual property.',
  },
  {
    id: 'suspension',
    title: 'Suspension and termination',
    body: 'We may suspend or terminate accounts that violate these terms, threaten platform integrity, or create legal or security risk. You may delete your account at any time from your settings.',
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: 'To the maximum extent permitted by law, DiaspoPlug is not liable for indirect, incidental, or consequential damages resulting from use of the platform. Our total liability for any claim shall not exceed the amount you paid us in the twelve months preceding the claim.',
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: 'We may update these terms from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: null,
    email: 'support@diaspoplug.com',
    emailLabel: 'Questions about these terms can be sent to',
  },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd schema={termsPageSchema} />
      <main className="min-h-screen bg-surface-default">

        <section className="border-b border-border-subtle">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-text-brand/10">
                <FileText className="h-5 w-5 text-text-brand" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-brand">Legal</p>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-3 text-sm text-text-secondary">
              Last updated: <time dateTime={LAST_UPDATED} className="font-medium text-text-primary">{LAST_UPDATED_DISPLAY}</time>
            </p>
            <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-text-secondary">
              Please read these terms carefully. They govern your use of DiaspoPlug and form a
              binding agreement between you and DiaspoPlug.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex gap-10">
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary">Contents</p>
                <nav className="space-y-1" aria-label="Terms sections">
                  {sections.map((s, i) => (
                    <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors">
                      <span className="text-xs font-bold text-text-brand w-4">{i + 1}</span>
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="py-8 border-b border-border-subtle last:border-0">
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex-shrink-0 text-2xl font-black text-text-brand/20 leading-none w-7">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-text-primary mb-3">{s.title}</h2>
                      {s.body && <p className="text-sm font-light leading-relaxed text-text-secondary">{s.body}</p>}
                      {s.email && (
                        <p className="text-sm font-light leading-relaxed text-text-secondary">
                          {s.emailLabel}{' '}
                          <a href={`mailto:${s.email}`} className="font-medium text-text-brand hover:underline">{s.email}</a>.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
