'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (newLocale !== locale) {
      router.replace(pathname, { locale: newLocale });
      router.refresh();
    }
  };

  return (
    <select
      className="text-foreground rounded"
      value={locale}
      onChange={e => switchLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="de">Deutch</option>
      <option value="it">Italy</option>
    </select>
  );
}