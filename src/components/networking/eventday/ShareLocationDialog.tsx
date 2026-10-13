'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { btnPrimary, btnQuiet } from '../meetings/parts';
import { SHARE_MINUTES } from '@/lib/eventDay';

/**
 * Asked EVERY time, before the browser is asked for a position. Says what is shared, with whom
 * and for how long; "Not now" is the focused default so a stray Enter never shares.
 */
export default function ShareLocationDialog({ open, name, onConfirm, onCancel }: { open: boolean; name: string; onConfirm: () => void; onCancel: () => void }) {
  const t = useTranslations('networkingEventDay.consent');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent data-testid="share-consent" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title', { minutes: SHARE_MINUTES })}</DialogTitle>
          <DialogDescription>{t('lead')}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-text-primary">
          <li><strong className="font-semibold">{t('whatLabel')}</strong> {t('what')}</li>
          <li><strong className="font-semibold">{t('whoLabel')}</strong> {t('who', { name })}</li>
          <li><strong className="font-semibold">{t('howLongLabel')}</strong> {t('howLong', { minutes: SHARE_MINUTES })}</li>
          <li>{t('stopAnytime')}</li>
        </ul>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" autoFocus onClick={onCancel} className={btnQuiet} data-testid="share-consent-cancel">{t('cancel')}</button>
          <button type="button" onClick={onConfirm} className={btnPrimary} data-testid="share-consent-confirm">{t('confirm', { minutes: SHARE_MINUTES })}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
