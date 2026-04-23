import type { Metadata } from 'next';
import { BASE, SITE_NAME, buildAlternates, publicRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Help & Support',
  description:
    'Find answers to common questions about DiaspoPlug. Browse our FAQ or contact our support team — we reply within 24 hours.',
  robots: publicRobots,
  alternates: buildAlternates('/help'),
  openGraph: {
    title: `Help & Support | ${SITE_NAME}`,
    description: 'Browse FAQ and contact the DiaspoPlug support team.',
    url: `${BASE}/en/help`,
    siteName: SITE_NAME,
    type: 'website',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
