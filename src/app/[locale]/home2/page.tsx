import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';
import Home2Gate from '@/components/landing/Home2Gate';

/**
 * `/[locale]/home2` — an independent clone of the root feed (`/[locale]`).
 *
 * Same gating as the root: authenticated users get the feed in place, logged-out
 * visitors are bounced to sign-in. It carries `privateRobots` for the same
 * reason the root does, and doubly so — this is a working duplicate, and two
 * indexable URLs serving the same feed would be duplicate content.
 */
export const metadata: Metadata = {
  robots: privateRobots,
};

export default function Home2Page() {
  return <Home2Gate />;
}
