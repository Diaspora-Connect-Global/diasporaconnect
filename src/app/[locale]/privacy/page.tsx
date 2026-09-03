import type { Metadata } from 'next';
import { Lock } from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, ogImages } from '@/lib/seo';

const LAST_UPDATED = '2026-03-27';
const LAST_UPDATED_DISPLAY = 'March 27, 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how DiaspoPlug collects, uses, and protects your personal data. We do not sell your data. Read our full privacy policy including your rights and how to contact us.',
  robots: publicRobots,
  alternates: buildAlternates('/privacy'),
  openGraph: {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: 'How DiaspoPlug collects, uses, and protects your personal data.',
    url: `${BASE}/en/privacy`,
    siteName: SITE_NAME,
    type: 'website',
    ...ogImages(null, 'Privacy Policy'),
  },
};

const privacyPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${BASE}/en/privacy`,
  url: `${BASE}/en/privacy`,
  name: `Privacy Policy | ${SITE_NAME}`,
  description: 'The privacy policy describing how DiaspoPlug collects, uses, and protects personal data.',
  inLanguage: 'en',
  dateModified: LAST_UPDATED,
  isPartOf: { '@id': `${BASE}/#website` },
  about: { '@id': `${BASE}/#organization` },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: `${BASE}/en/privacy` },
    ],
  },
};

const sections = [
  {
    id: 'collection',
    title: 'Information we collect',
    body: 'We collect account details, profile information, content you submit, transaction data, and technical data needed to operate and secure the platform. This includes device information, IP addresses, and usage patterns to ensure a safe and reliable experience.',
  },
  {
    id: 'use',
    title: 'How we use information',
    body: 'We use your information to provide services, personalise experiences, process transactions, improve safety, communicate important updates, and comply with legal obligations. We do not use your data to build advertising profiles or sell it to third parties.',
  },
  {
    id: 'sharing',
    title: 'Sharing of information',
    body: 'We do not sell personal data. We may share data with service providers, payment processors, and legal authorities where required to deliver services or meet legal requirements. All third-party providers are bound by data processing agreements.',
  },
  {
    id: 'retention',
    title: 'Data retention',
    body: 'We retain personal data for as long as needed to provide services, resolve disputes, and comply with legal and operational requirements. When you delete your account, we remove your personal data within 30 days except where required by law.',
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: 'Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of your personal data. You may also have the right to data portability and to withdraw consent at any time. Submit requests via your account settings or by contacting us.',
  },
  {
    id: 'security',
    title: 'Security',
    body: 'We use administrative, technical, and organisational controls to protect your data, including encryption in transit and at rest. No system is fully immune to risk, but we continuously improve our safeguards and respond promptly to any incidents.',
  },
  {
    id: 'cookies',
    title: 'Cookies and tracking',
    body: 'We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the platform is used. You can control non-essential cookies through your browser settings or our cookie preferences panel.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: null,
    email: 'privacy@diaspoplug.com',
    emailLabel: 'For privacy requests or questions, contact',
  },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd schema={privacyPageSchema} />
      <main className="min-h-screen bg-surface-default">

        <section className="border-b border-border-subtle">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-text-brand/10">
                <Lock className="h-5 w-5 text-text-brand" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-brand">Legal</p>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-text-secondary">
              Last updated: <time dateTime={LAST_UPDATED} className="font-medium text-text-primary">{LAST_UPDATED_DISPLAY}</time>
            </p>
            <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-text-secondary">
              Your privacy matters to us. This policy explains what data we collect, how we use it,
              and the controls you have over it.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex gap-10">
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary">Contents</p>
                <nav className="space-y-1" aria-label="Privacy policy sections">
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
