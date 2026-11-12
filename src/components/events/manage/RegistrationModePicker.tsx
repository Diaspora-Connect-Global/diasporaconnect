'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { EventRegistrationMode } from '@/services/gql/events';

const INPUT =
  'min-h-11 w-full rounded-md border-2 border-border-subtle bg-surface-subtle px-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:border-border-brand';

/** "Where do people register?": on DiaspoPlug, or on another website (with its link). Controlled. */
export default function RegistrationModePicker({
  mode,
  onMode,
  link,
  onLink,
  linkError,
  registeredCount = 0,
}: {
  mode: EventRegistrationMode;
  onMode: (m: EventRegistrationMode) => void;
  link: string;
  onLink: (v: string) => void;
  linkError: boolean;
  /** People already registered in-app: they keep their registration if the event moves to another website. */
  registeredCount?: number;
}) {
  const tw = useTranslations('eventForm.where');
  const name = useId();
  const external = mode === 'EXTERNAL';
  return (
    <fieldset className="space-y-3 rounded-lg border border-border-subtle p-4" data-testid="where-register">
      <legend className="px-1 text-sm font-semibold text-text-primary">{tw('title')}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['IN_APP', 'EXTERNAL'] as const).map((m) => (
          <label
            key={m}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${mode === m ? 'border-border-brand bg-surface-info' : 'border-border-subtle'}`}
          >
            <input type="radio" name={name} value={m} checked={mode === m} onChange={() => onMode(m)} className="mt-0.5 size-4 accent-surface-brand" />
            <span className="min-w-0">
              <span className="block font-medium text-text-primary">{m === 'IN_APP' ? tw('inApp') : tw('external')}</span>
              <span className="block text-xs text-text-secondary">{m === 'IN_APP' ? tw('inAppSub') : tw('externalSub')}</span>
            </span>
          </label>
        ))}
      </div>
      {external && (
        <div className="space-y-1">
          <label htmlFor={`${name}-link`} className="text-sm font-medium text-text-primary">{tw('linkLabel')}</label>
          <input
            id={`${name}-link`}
            type="text"
            inputMode="url"
            autoComplete="off"
            value={link}
            onChange={(e) => onLink(e.target.value)}
            placeholder={tw('linkPlaceholder')}
            aria-invalid={linkError}
            aria-describedby={`${name}-help`}
            className={INPUT}
          />
          <p id={`${name}-help`} className={`text-xs ${linkError ? 'text-text-danger' : 'text-text-secondary'}`} role={linkError ? 'alert' : undefined}>
            {linkError ? tw('linkInvalid') : tw('linkHelp')}
          </p>
        </div>
      )}
      {external && registeredCount > 0 && (
        <p className="text-sm text-text-warning" data-testid="where-already-registered">{tw('alreadyRegistered', { count: registeredCount })}</p>
      )}
    </fieldset>
  );
}
