'use client';

import { useTranslations } from 'next-intl';
import type { RegistrationFormField } from '@/services/gql/events';
import { MAX_TEXT, builtinOf, type Answer } from '@/lib/eventRegistrationForm';

const INPUT =
  'h-11 w-full rounded-lg border border-border-subtle bg-surface-default px-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand aria-[invalid=true]:border-text-danger';

const AUTOCOMPLETE: Record<string, string> = { full_name: 'name', email: 'email', phone: 'tel', job_title: 'organization-title' };

/**
 * The organiser's registration form: all nine question types, labelled, with a required
 * marker and an error line that is both linked (aria-describedby) and announced
 * (aria-live). Default fields (name, email, phone, job title) show translated labels.
 * Nothing is invented: no questions means nothing is rendered.
 */
export default function RegistrationFields({
  fields,
  responses,
  errors,
  onChange,
  onBlur,
}: {
  fields: RegistrationFormField[];
  responses: Record<string, Answer>;
  /** Already-translated error text per question id (only the ones to show). */
  errors: Record<string, string>;
  onChange: (id: string, value: Answer) => void;
  onBlur?: (id: string) => void;
}) {
  const t = useTranslations('eventForm.form');
  const td = useTranslations('eventForm.defaults');
  if (fields.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="registration-fields">
      {fields.map((f) => {
        const id = `regfield-${f.id}`;
        const errId = `${id}-error`;
        const builtin = builtinOf(f);
        const text = builtin ? td(builtin) : f.label;
        const error = errors[f.id];
        const value = responses[f.id] ?? (f.type === 'multiselect' ? [] : '');
        const common = {
          'aria-invalid': error ? (true as const) : undefined,
          'aria-describedby': error ? errId : undefined,
          'aria-required': f.required || undefined,
        };
        const label = (
          <>
            {text}
            {f.required && (
              <>
                <span className="ml-1 text-text-danger" aria-hidden>*</span>
                <span className="sr-only"> ({t('requiredWord')})</span>
              </>
            )}
          </>
        );
        const errorLine = (
          <p id={errId} aria-live="polite" className={error ? 'mt-1 text-xs text-text-danger' : 'sr-only'} data-testid={error ? `error-${f.id}` : undefined}>
            {error ?? ''}
          </p>
        );
        const labelClass = 'mb-1 block text-xs font-medium text-text-secondary';

        if (f.type === 'checkbox') {
          return (
            <div key={f.id} className="min-w-0 sm:col-span-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-primary">
                <input
                  id={id}
                  type="checkbox"
                  checked={value === 'true'}
                  onChange={(e) => onChange(f.id, e.target.checked ? 'true' : 'false')}
                  onBlur={() => onBlur?.(f.id)}
                  className="size-4 shrink-0 accent-surface-brand"
                  {...common}
                />
                <span className="min-w-0 break-words">{label}</span>
              </label>
              {errorLine}
            </div>
          );
        }
        if (f.type === 'multiselect') {
          const selected = Array.isArray(value) ? value : [];
          return (
            <fieldset key={f.id} className="min-w-0 sm:col-span-2" aria-describedby={error ? errId : undefined} aria-invalid={error ? true : undefined}>
              <legend className="mb-1 text-xs font-medium text-text-secondary">{label}</legend>
              <div className="flex flex-wrap gap-x-4">
                {f.options?.map((opt) => (
                  <label key={opt} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={() => {
                        onChange(f.id, selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
                        onBlur?.(f.id);
                      }}
                      className="size-4 accent-surface-brand"
                    />
                    <span className="break-words">{opt}</span>
                  </label>
                ))}
              </div>
              {errorLine}
            </fieldset>
          );
        }
        if (f.type === 'select') {
          return (
            <div key={f.id} className="min-w-0">
              <label htmlFor={id} className={labelClass}>{label}</label>
              <select id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(f.id, e.target.value)} onBlur={() => onBlur?.(f.id)} className={INPUT} {...common}>
                <option value="">{t('selectOption')}</option>
                {f.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errorLine}
            </div>
          );
        }
        if (f.type === 'textarea') {
          return (
            <div key={f.id} className="min-w-0 sm:col-span-2">
              <label htmlFor={id} className={labelClass}>{label}</label>
              <textarea
                id={id}
                rows={4}
                maxLength={MAX_TEXT}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(f.id, e.target.value)}
                onBlur={() => onBlur?.(f.id)}
                className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand aria-[invalid=true]:border-text-danger"
                {...common}
              />
              {errorLine}
            </div>
          );
        }
        const inputType = f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
        return (
          <div key={f.id} className="min-w-0">
            <label htmlFor={id} className={labelClass}>{label}</label>
            <input
              id={id}
              type={inputType}
              step={f.type === 'number' ? 'any' : undefined}
              inputMode={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'number' ? 'decimal' : undefined}
              autoComplete={builtin ? AUTOCOMPLETE[builtin] : undefined}
              maxLength={f.type === 'text' ? MAX_TEXT : undefined}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(f.id, e.target.value)}
              onBlur={() => onBlur?.(f.id)}
              className={INPUT}
              {...common}
            />
            {errorLine}
          </div>
        );
      })}
    </div>
  );
}
