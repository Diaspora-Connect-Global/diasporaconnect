import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Signing In',
  robots: privateRobots,
};

export default function CallbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
