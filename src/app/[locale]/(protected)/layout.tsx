import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';

export const metadata: Metadata = {
  robots: privateRobots,
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
