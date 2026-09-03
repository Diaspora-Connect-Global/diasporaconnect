import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Verify Identity',
  robots: privateRobots,
};

export default function VerifyKycLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
