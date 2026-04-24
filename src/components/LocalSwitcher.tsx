'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LocaleSwitcherProps {
  className?: string;
  selectClassName?: string;
  optionClassName?: string;
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
];

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
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredLocale', newLocale);
        document.cookie = `preferredLocale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      }
      router.replace(pathname, { locale: newLocale });
      router.refresh();
    }
  };

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <div className={className}>
      <Select  value={locale} onValueChange={switchLocale}>
        <SelectTrigger className={`w-fit border-none shadow-none focus-visible:ring-transparent  ${selectClassName}`}>
          <SelectValue >{currentLanguage?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem
              key={language.code}
              value={language.code}
              className={optionClassName}
            >
              {language.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}