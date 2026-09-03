'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { embassyIcon } from '../icons';

interface ComingSoonTabProps {
  /** lucide icon name for the section. */
  icon: string;
  /** i18n key under `community.embassy.tabs` for the section title. */
  titleKey: string;
}

/** Placeholder for embassy tabs not yet built in Phase 1. */
export function ComingSoonTab({ icon, titleKey }: ComingSoonTabProps) {
  const t = useTranslations('community.embassy');
  const tTabs = useTranslations('community.embassy.tabs');
  const Icon = embassyIcon(icon);

  return (
    <Card className="mx-auto my-8 max-w-xl border-border-subtle">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
          <Icon className="size-6" aria-hidden />
        </span>
        <h2 className="heading-xsmall text-text-primary">{tTabs(titleKey)}</h2>
        <p className="body-small max-w-sm text-text-secondary">{t('comingSoon')}</p>
      </CardContent>
    </Card>
  );
}

export default ComingSoonTab;
