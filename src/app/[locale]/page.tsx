import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';


export default function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
    const t = useTranslations('home');

  return (
   <div>
   </div>
  );
}
