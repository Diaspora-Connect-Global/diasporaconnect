'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { GateState } from '@/lib/networkingGate';
import { focusRing } from './primitives';

/** The screen for every state in which the networking area itself cannot be used. */
export default function GateMessage({ state, eventId, onRetry, onRejoin }: { state: Exclude<GateState, 'loading' | 'ready' | 'paused'>; eventId: string; onRetry?: () => void; onRejoin?: () => void }) {
  const t = useTranslations('networking.gate');
  const cta = `inline-flex min-h-11 items-center rounded-full border border-border-brand px-6 text-sm font-medium text-text-brand ${focusRing}`;
  return (
    <section data-testid="gate" data-state={state} className="mx-auto max-w-xl rounded-2xl border border-border-subtle bg-surface-default p-8 text-center">
      <Lock className="mx-auto size-8 text-text-brand" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-text-primary">{t(`${state}.title`)}</h1>
      <p className="mt-2 text-sm text-text-secondary">{t(`${state}.body`)}</p>
      <div className="mt-5 flex justify-center gap-3">
        {state === 'error' && onRetry && <button type="button" onClick={onRetry} className={cta}>{t('retry')}</button>}
        {state === 'withdrawn' && onRejoin && <button type="button" onClick={onRejoin} className={cta}>{t('withdrawn.cta')}</button>}
        {state === 'needsSetup' && <Link href={`/events/${eventId}/networking/setup`} className={cta}>{t('needsSetup.cta')}</Link>}
        <Link href={`/events/${eventId}`} className={`inline-flex min-h-11 items-center px-3 text-sm text-text-secondary underline ${focusRing}`}>{t('backToEvent')}</Link>
      </div>
    </section>
  );
}
