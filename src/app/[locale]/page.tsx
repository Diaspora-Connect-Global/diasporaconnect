import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';
import RootGate from '@/components/landing/RootGate';

/**
 * The root URL is an app-gated entry point, not an indexable page: authenticated
 * users get the feed in place, logged-out visitors are redirected to sign-in
 * (see RootGate). The public marketing landing lives at `/welcome`.
 */
export const metadata: Metadata = {
  robots: privateRobots,
};

export default function RootPage() {
  return <RootGate />;
}
