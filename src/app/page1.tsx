import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function App({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  // Set the locale for next-intl on the server
  setRequestLocale(locale);
  await delay(6500);
  // Redirect to the signup page for this locale on initial load
  redirect(`/${locale}/signin`);

  // The redirect will short-circuit rendering; return null for type-safety
  return null;
}
