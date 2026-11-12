'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { ButtonType2 } from '@/components/custom/button';
import { domainOf } from '@/lib/eventRegistrationForm';
import LeavingSiteDialog from './LeavingSiteDialog';

/** "Register on {domain}": asks first, then opens the organiser's website in a new tab. */
export default function ExternalRegisterButton({ url, className = 'w-full' }: { url: string; className?: string }) {
  const t = useTranslations('eventForm.leaving');
  const [ask, setAsk] = useState<string | null>(null);
  return (
    <>
      <ButtonType2 onClick={() => setAsk(url)} className={`${className} flex items-center justify-center gap-2 whitespace-normal break-all`} size="lg" data-testid="external-register-cta">
        <span className="min-w-0 break-all">{t('cta', { domain: domainOf(url) })}</span>
        <ExternalLink className="size-4 shrink-0" aria-hidden />
      </ButtonType2>
      <LeavingSiteDialog url={ask} onClose={() => setAsk(null)} />
    </>
  );
}
