'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

interface LocaleSwitcherProps {
  className?: string;
  selectClassName?: string;
  optionClassName?: string;
}

export default function LocaleSwitcher({
  className = '',
  selectClassName = '',
  optionClassName = ''
}: LocaleSwitcherProps) {
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
    <div className={className}>
      <select
        className={`text-foreground rounded ${selectClassName}`}
        value={locale}
        onChange={e => switchLocale(e.target.value)}
      >
        <option value="en" className={optionClassName}>English</option>
        <option value="de" className={optionClassName}>Deutsch</option>
        <option value="it" className={optionClassName}>Italiano</option>
      </select>
    </div>
  );
}