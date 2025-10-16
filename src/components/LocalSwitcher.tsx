'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
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
      router.replace(pathname, { locale: newLocale });
      router.refresh();
    }
  };

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <div className={className}>
      <Select  value={locale} onValueChange={switchLocale}>
        <SelectTrigger className={`w-fit border-none shadow-none focus-visible:ring-transparent ${selectClassName}`}>
          <SelectValue>{currentLanguage?.nativeName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem 
              key={language.code} 
              value={language.code}
              className={optionClassName}
            >
              {language.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}