import type { Metadata } from 'next';
import { privateRobots } from '@/lib/seo';
import SignupForm from '@/components/signup/SignupForm';

export const metadata: Metadata = {
  title: 'Create Account',
  robots: privateRobots,
};

export default function SignUpPage() {
  return (
      <SignupForm />
  )
}