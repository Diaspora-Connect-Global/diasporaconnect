import type { Metadata } from 'next';
import { Globe, Users, Target, Zap, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, organisationSchema, websiteSchema, ogImages, twitterImages } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About DiaspoPlug — Connecting the diaspora across borders',
  description:
    'DiaspoPlug is the platform built for diaspora communities worldwide. Discover how we help members, associations, and vendors connect, collaborate, and create opportunities across borders.',
  keywords: [
    'about DiaspoPlug',
    'diaspora platform',
    'diaspora community',
    'diaspora network',
    'cross-border collaboration',
    'diaspora associations',
    'immigrant network',
    'expat community platform',
  ],
  robots: publicRobots,
  alternates: buildAlternates('/about'),
  openGraph: {
    title: 'About DiaspoPlug — Connecting the diaspora across borders',
    description:
      'DiaspoPlug helps diaspora communities stay connected, build trust, and create opportunities across borders — one meaningful connection at a time.',
    url: `${BASE}/en/about`,
    siteName: SITE_NAME,
    type: 'website',
    ...ogImages(null, 'About DiaspoPlug'),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About DiaspoPlug',
    description: 'The platform connecting diaspora communities worldwide.',
    ...twitterImages(null),
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is DiaspoPlug?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'DiaspoPlug is a platform designed for diaspora communities worldwide. It connects members, associations, and vendors to enable collaboration, discovery of opportunities, and community engagement across borders.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who is DiaspoPlug for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'DiaspoPlug is for diaspora members living abroad, local community leaders, diaspora associations, and trusted vendors who want to connect and create value together.',
      },
    },
    {
      '@type': 'Question',
      name: 'What can I do on DiaspoPlug?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'On DiaspoPlug you can join diaspora communities, discover events, find job opportunities, access a marketplace of diaspora-focused vendors, connect with associations, and network with other diaspora members.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many countries is DiaspoPlug available in?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'DiaspoPlug has members from over 50 countries and supports four languages: English, French, German, and Italian.',
      },
    },
  ],
};

const aboutPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${BASE}/en/about`,
  url: `${BASE}/en/about`,
  name: `About ${SITE_NAME}`,
  description:
    'DiaspoPlug is a platform connecting diaspora communities worldwide, providing community spaces, events, marketplace services, and professional networking tools.',
  inLanguage: 'en',
  isPartOf: { '@id': `${BASE}/#website` },
  about: { '@id': `${BASE}/#organization` },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'About', item: `${BASE}/en/about` },
    ],
  },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', 'h2', '.speakable'],
  },
};

const stats = [
  { value: '50+', label: 'Countries represented' },
  { value: '10K+', label: 'Community members' },
  { value: '200+', label: 'Associations' },
  { value: '500+', label: 'Vendors & partners' },
];

const pillars = [
  {
    icon: Globe,
    title: 'What we do',
    body: 'We provide community spaces, events, marketplace services, and professional networking tools so members can discover opportunities, support local and diaspora businesses, and stay engaged with what matters to them.',
  },
  {
    icon: Target,
    title: 'Our mission',
    body: 'Our mission is to make diaspora engagement structured, transparent, and impactful by giving members the tools to collaborate, grow, and contribute to their communities.',
  },
  {
    icon: Users,
    title: 'Who we serve',
    body: 'DiaspoPlug is designed for diaspora members, local community leaders, associations, and trusted vendors who want to connect and create value together.',
  },
];

const values = [
  { icon: Zap, title: 'Transparency', body: 'Every interaction on DiaspoPlug is built on clear, honest communication between members, associations, and vendors.' },
  { icon: Building2, title: 'Community-first', body: 'Decisions are guided by what strengthens communities — not engagement metrics or advertising revenue.' },
  { icon: Globe, title: 'Cross-border by design', body: 'Distance is not a barrier. Our platform is built to work across languages, time zones, and borders.' },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd schema={[organisationSchema, websiteSchema, aboutPageSchema, faqSchema]} />
      <main className="min-h-screen bg-surface-default">

        {/* Hero */}
        <section className="border-b border-border-subtle">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-brand">
              About DiaspoPlug
            </p>
            <h1 className="max-w-2xl text-4xl font-black tracking-tight text-text-primary sm:text-5xl lg:text-6xl speakable">
              Built for the diaspora,<br />
              <span className="text-text-brand">by the diaspora.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-light leading-relaxed text-text-secondary speakable">
              DiaspoPlug helps diaspora communities stay connected, build trust, and create
              opportunities across borders — one meaningful connection at a time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/community"
                className="inline-flex items-center gap-2 rounded-full bg-text-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Explore communities <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition-colors"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-b border-border-subtle bg-surface-subtle">
          <div className="mx-auto max-w-5xl px-6 py-8">
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-3xl font-black text-text-brand">{s.value}</dt>
                  <dd className="mt-1 text-sm font-medium text-text-secondary">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Three pillars */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-10 text-2xl font-bold tracking-tight text-text-primary">
            What makes DiaspoPlug different
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border-subtle bg-surface-default p-6 hover:border-text-brand/40 transition-colors">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-text-brand/10">
                  <Icon className="h-5 w-5 text-text-brand" />
                </div>
                <h3 className="mb-2 text-base font-bold text-text-primary">{title}</h3>
                <p className="text-sm font-light leading-relaxed text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="border-t border-border-subtle bg-surface-subtle">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="mb-10 text-2xl font-bold tracking-tight text-text-primary">Our values</h2>
            <div className="space-y-6">
              {values.map(({ icon: Icon, title, body }, i) => (
                <div key={title} className="flex gap-5">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-text-brand text-white text-xs font-bold">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-text-brand" />
                      <h3 className="text-base font-bold text-text-primary">{title}</h3>
                    </div>
                    <p className="text-sm font-light leading-relaxed text-text-secondary">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA footer */}
        <section className="border-t border-border-subtle">
          <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-text-primary">Ready to connect?</p>
              <p className="text-sm text-text-secondary">Join thousands of diaspora members already on the platform.</p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-text-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Join DiaspoPlug <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}
