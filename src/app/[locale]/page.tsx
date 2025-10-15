import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

export default async function Home({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  // Set the locale for next-intl on the server
  setRequestLocale(locale);

  // Redirect to the signup page for this locale on initial load
  redirect(`/${locale}/signup`);

  // The redirect will short-circuit rendering; return null for type-safety
  return null;
}
