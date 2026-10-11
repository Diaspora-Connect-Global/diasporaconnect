'use client';

import { useTranslations } from 'next-intl';
import type { RegistrationFormField } from '@/services/gql/events';

const INPUT =
  'h-11 w-full rounded-lg border border-border-subtle bg-surface-default px-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

/**
 * The organiser's own registration questions (text / select / multiselect /
 * checkbox), rendered as extra fields of the attendee section. Nothing is
 * invented: no questions configured means nothing is rendered.
 */
export default function RegistrationFields({
  fields,
  responses,
  onChange,
}: {
  fields: RegistrationFormField[];
  responses: Record<string, string | string[]>;
  onChange: (id: string, value: string | string[]) => void;
}) {
  const t = useTranslations('eventRegister');
  if (fields.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="registration-fields">
      {fields.map((f) => {
        const id = `regfield-${f.id}`;
        const value = responses[f.id] ?? (f.type === 'multiselect' ? [] : '');
        const label = (
          <span className="mb-1 block text-xs font-medium text-text-secondary">
            {f.label}
            {f.required && <span className="ml-1 text-text-danger" aria-hidden>*</span>}
          </span>
        );
        if (f.type === 'checkbox') {
          return (
            <label key={f.id} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary sm:col-span-2">
              <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(f.id, e.target.checked ? 'true' : 'false')} className="size-4 accent-surface-brand" />
              {f.label}
              {f.required && <span className="text-text-danger" aria-hidden>*</span>}
            </label>
          );
        }
        if (f.type === 'multiselect') {
          const selected = (value as string[]) || [];
          return (
            <fieldset key={f.id} className="min-w-0 sm:col-span-2">
              <legend className="mb-1 text-xs font-medium text-text-secondary">
                {f.label}
                {f.required && <span className="ml-1 text-text-danger" aria-hidden>*</span>}
              </legend>
              <div className="flex flex-wrap gap-3">
                {f.options?.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={() => onChange(f.id, selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])}
                      className="size-4 accent-surface-brand"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }
        if (f.type === 'select') {
          return (
            <div key={f.id} className="min-w-0">
              <label htmlFor={id}>{label}</label>
              <select id={id} value={(value as string) || ''} onChange={(e) => onChange(f.id, e.target.value)} className={INPUT} required={f.required}>
                <option value="" disabled>{t('selectOption')}</option>
                {f.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          );
        }
        return (
          <div key={f.id} className="min-w-0">
            <label htmlFor={id}>{label}</label>
            <input id={id} type="text" value={(value as string) || ''} onChange={(e) => onChange(f.id, e.target.value)} className={INPUT} required={f.required} />
          </div>
        );
      })}
    </div>
  );
}
