import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Reset Password',
  robots: privateRobots,
};

export default function ResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div  className="h-screen w-screen ">
    <div className="lg:w-[calc(800/1512*100vw)] lg:px-[calc(40/1512*100vw)] lg:pt-[calc(40/1512*100vh)]  lg:pb-[calc(32/1512*100vh)] lg:mx-auto ">
        {children}
    </div>
    </div>
  );
}