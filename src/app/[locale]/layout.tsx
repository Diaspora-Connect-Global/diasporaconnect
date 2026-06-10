import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, getMessages } from 'next-intl/server';
import GraphQLProvider from "@/components/provider/apollo-provider";
import { Toaster } from 'sonner';
import { BASE, SITE_NAME, LOCALES, publicRobots } from '@/lib/seo';
import { seoGraphQL } from '@/lib/seoFetch';

const metadataBase = new URL(BASE);

/**
 * Search-engine site-verification tokens are managed in the admin hub
 * (System Settings → keys `seo_google_site_verification` / `seo_bing_site_verification`)
 * and read via the PUBLIC `getPublicSeoSettings` gateway query. Falls back to env
 * vars, and degrades to no tag if neither is set. Cached for 1h (revalidate).
 */
async function fetchVerificationTokens(): Promise<{ google?: string; bing?: string }> {
  const data = await seoGraphQL<{ getPublicSeoSettings: Array<{ key: string; value: string }> }>(
    'query GetPublicSeo { getPublicSeoSettings { key value } }',
    {},
    3600,
  );
  const map = Object.fromEntries((data?.getPublicSeoSettings ?? []).map((s) => [s.key, s.value]));
  return {
    google:
      map['seo_google_site_verification'] ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      undefined,
    bing:
      map['seo_bing_site_verification'] ||
      process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
      undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const verificationTokens = await fetchVerificationTokens();

  const description = t('description');
  const ogImage = '/og-default.png';

  const hreflangLanguages: Record<string, string> = {};
  for (const l of LOCALES) hreflangLanguages[l] = `${BASE}/${l}`;
  hreflangLanguages['x-default'] = `${BASE}/en`;

  return {
    metadataBase,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords: [
      'diaspora community',
      'diaspora network',
      'diaspora platform',
      'diaspora connect',
      'diaspora association',
      'diaspora events',
      'diaspora marketplace',
      'diaspora jobs',
      'immigrant community',
      'expat network',
      'cross-border community',
      'diaspoplug',
    ],
    authors: [{ name: SITE_NAME, url: BASE }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: publicRobots,
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
      apple: '/favicon.svg',
    },
    openGraph: {
      title: SITE_NAME,
      description,
      url: `${BASE}/${locale}`,
      siteName: SITE_NAME,
      locale: locale,
      alternateLocale: LOCALES.filter((l) => l !== locale),
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${SITE_NAME} — Connecting diaspora communities worldwide` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description,
      site: '@diaspoplug',
      creator: '@diaspoplug',
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE}/en`,
      languages: hreflangLanguages,
    },
    verification: {
      // Tokens are managed in the admin hub (System Settings) and read via the
      // public getPublicSeoSettings query; see fetchVerificationTokens above.
      ...(verificationTokens.google ? { google: verificationTokens.google } : {}),
      ...(verificationTokens.bing ? { other: { 'msvalidate.01': verificationTokens.bing } } : {}),
    },
    category: 'social network',
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages =
    (await getMessages().catch(() => null)) ??
    (await import(`../../../messages/${locale}.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme. Default: light (matches ThemeProvider defaultTheme). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var a=t==='system'?s:t;if(a==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            storageKey="theme"
          >
            <GraphQLProvider>
              {children}
              <Toaster position="top-center" richColors />
            </GraphQLProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
