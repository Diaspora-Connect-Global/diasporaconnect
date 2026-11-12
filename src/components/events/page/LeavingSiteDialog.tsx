'use client';

import { useTranslations } from 'next-intl';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { domainOf } from '@/lib/eventRegistrationForm';

/** Opens the organiser's site in a new tab with no opener and no referrer leak of this page's window. */
export function openRegistrationSite(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * "You're leaving DiaspoPlug": shown before anyone is sent to an organiser's own
 * registration website. `url` is already a checked http(s) link; the dialog is open
 * while it is set.
 */
export default function LeavingSiteDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  const t = useTranslations('eventForm.leaving');
  const domain = url ? domainOf(url) : '';
  return (
    <ConfirmationModal
      open={!!url}
      onCancel={onClose}
      onConfirm={() => {
        if (url) openRegistrationSite(url);
        onClose();
      }}
      title={t('title')}
      description={t('body', { domain })}
      confirmText={t('continue')}
      cancelText={t('cancel')}
    />
  );
}
