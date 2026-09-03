import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';
import SignInForm from "@/components/signin/SignInForm";

export const metadata: Metadata = {
  title: 'Sign In',
  robots: privateRobots,
};

export default function SignInPage() {
  return (
        <SignInForm/>
  )
}