import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  Users,
  CalendarDays,
  Briefcase,
  Store,
  Building2,
  Globe,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';
import AuthedRedirect from '@/components/landing/AuthedRedirect';
import {
  BASE,
  SITE_NAME,
  buildAlternates,
  publicRobots,
  organisationSchema,
  websiteSchema,
} from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const description = t('description');

  return {
    title: {
      absolute: 'DiaspoPlug — Connecting diaspora communities worldwide',
    },
    description,
    robots: publicRobots,
    alternates: buildAlternates('', locale),
    // OG/Twitter images are supplied by the colocated opengraph-image.tsx
    // (generated branded card) — no explicit `images` so the file convention wins.
    openGraph: {
      title: 'DiaspoPlug — Connecting diaspora communities worldwide',
      description,
      url: `${BASE}/${locale}`,
      siteName: SITE_NAME,
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'DiaspoPlug — Connecting diaspora communities worldwide',
      description,
      site: '@diaspoplug',
      creator: '@diaspoplug',
    },
  };
}

const features = [
  {
    icon: Users,
    title: 'Communities',
    body: 'Join diaspora communities organised by country, city, and shared heritage — and stay connected wherever you are.',
    href: '/community',
  },
  {
    icon: Building2,
    title: 'Associations',
    body: 'Discover and engage with diaspora associations running real initiatives, with transparent membership and events.',
    href: '/association',
  },
  {
    icon: CalendarDays,
    title: 'Events',
    body: 'Find and register for diaspora events — meetups, conferences, cultural celebrations, and online gatherings.',
    href: '/events',
  },
  {
    icon: Briefcase,
    title: 'Opportunities',
    body: 'Browse jobs, grants, and collaboration opportunities created by and for the diaspora community.',
    href: '/opportunities',
  },
  {
    icon: Store,
    title: 'Marketplace',
    body: 'Support trusted diaspora vendors and discover products and services from across the community.',
    href: '/signup',
  },
];

const stats = [
  { value: '50+', label: 'Countries represented' },
  { value: '10K+', label: 'Community members' },
  { value: '200+', label: 'Associations' },
  { value: '500+', label: 'Vendors & partners' },
];

const websiteHomeSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${BASE}/#webpage`,
  url: BASE,
  name: 'DiaspoPlug — Connecting diaspora communities worldwide',
  isPartOf: { '@id': `${BASE}/#website` },
  about: { '@id': `${BASE}/#organization` },
  description:
    'DiaspoPlug is the platform connecting diaspora communities worldwide — communities, associations, events, opportunities, and a trusted marketplace, all in one place.',
};

export default function LandingPage() {
  return (
    <>
      <AuthedRedirect />
      <JsonLd schema={[organisationSchema, websiteSchema, websiteHomeSchema]} />
      <main className="min-h-screen bg-surface-default">
        {/* Hero */}
        <section className="border-b border-border-subtle">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-brand">
              The diaspora platform
            </p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Connecting diaspora communities{' '}
              <span className="text-text-brand">worldwide.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-text-secondary">
              DiaspoPlug brings communities, associations, events, opportunities, and a trusted
              marketplace together in one place — so members can connect, collaborate, and create
              value across borders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-text-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Join DiaspoPlug <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
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

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-10 text-2xl font-bold tracking-tight text-text-primary">
            Everything the diaspora needs, in one place
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body, href }) => (
              <Link
                key={title}
                href={href}
                prefetch={false}
                className="group rounded-xl border border-border-subtle bg-surface-default p-6 transition-colors hover:border-text-brand/40"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-text-brand/10">
                  <Icon className="h-5 w-5 text-text-brand" />
                </div>
                <h3 className="mb-2 flex items-center gap-1 text-base font-bold text-text-primary">
                  {title}
                  <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </h3>
                <p className="text-sm font-light leading-relaxed text-text-secondary">{body}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="border-t border-border-subtle bg-surface-subtle">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-text-brand/10">
                <ShieldCheck className="h-6 w-6 text-text-brand" />
              </div>
              <div className="max-w-2xl">
                <h2 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">
                  Built on trust and transparency
                </h2>
                <p className="text-base font-light leading-relaxed text-text-secondary">
                  Verified members, transparent associations, and trusted vendors. DiaspoPlug is
                  built so every interaction — from joining a community to supporting a business —
                  happens with confidence.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/community"
                    prefetch={false}
                    className="inline-flex items-center gap-2 rounded-full bg-text-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Explore communities <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-default"
                  >
                    Get in touch
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border-subtle">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-12 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-text-brand" />
              <div>
                <p className="text-base font-semibold text-text-primary">Ready to connect?</p>
                <p className="text-sm text-text-secondary">
                  Join thousands of diaspora members already on the platform.
                </p>
              </div>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-text-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Join DiaspoPlug <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
