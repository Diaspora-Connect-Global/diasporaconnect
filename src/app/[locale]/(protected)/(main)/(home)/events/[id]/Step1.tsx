'use client';

import TicketTypeCard from "@/components/cards/events/TicketTypeCard";
import { RegistrationFormField } from "@/services/gql/events";
import Image from "next/image";
import { useTranslations } from 'next-intl';

interface Step1Props {
  quantity: number;
  onQuantityChange: (n: number) => void;
  eventTitle: string;
  eventDate: string;
  ticketTitle: string;
  ticketPrice: string;
  ticketDescription?: string;
  registrationFormFields?: RegistrationFormField[];
  formResponses: Record<string, string | string[]>;
  onFormResponseChange: (fieldId: string, value: string | string[]) => void;
}

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: RegistrationFormField;
  value: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  const inputBase =
    "w-full bg-surface-subtle border-2 border-border-subtle rounded-md px-3 h-11 focus:outline-none text-text-primary placeholder:text-text-secondary";

  if (field.type === 'text') {
    return (
      <input
        type="text"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
        required={field.required}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} appearance-none cursor-pointer`}
        required={field.required}
      >
        <option value="" disabled>Select an option</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'multiselect') {
    const selected = (value as string[]) || [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next);
    };
    return (
      <div className="space-y-2">
        {field.options?.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-text-primary">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="w-4 h-4 accent-surface-brand"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer text-text-primary">
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="w-4 h-4 accent-surface-brand"
        />
        {field.label}
      </label>
    );
  }

  return null;
}

export default function Step1({
  quantity,
  onQuantityChange,
  eventTitle,
  eventDate,
  ticketTitle,
  ticketPrice,
  ticketDescription,
  registrationFormFields,
  formResponses,
  onFormResponseChange,
}: Step1Props) {
  const t = useTranslations('home.events.payment');
  const hasFormFields = registrationFormFields && registrationFormFields.length > 0;

  return (
    <div className="bg-surface-default overflow-y-auto scrollbar-hide space-y-6">
      <section className="pb-4">
        <p className="heading-small text-primary">{eventTitle}</p>
        <div className="flex gap-2 label-large items-center text-text-secondary">
          <Image src="/CALENDAR.svg" alt="Calendar" width={16} height={16} />
          <span>{eventDate}</span>
        </div>
      </section>

      <section>
        <TicketTypeCard
          title={ticketTitle || t('ticketTypeRegular')}
          price={ticketPrice}
          description={ticketDescription || t('ticketDescription')}
          quantity={quantity}
          onQuantityChange={onQuantityChange}
        />
      </section>

      {hasFormFields && (
        <section className="space-y-4">
          <p className="font-label-large text-text-primary">Registration Details</p>
          {registrationFormFields.map((field) => (
            <div key={field.id} className="space-y-1">
              {field.type !== 'checkbox' && (
                <label className="text-sm text-text-secondary">
                  {field.label}
                  {field.required && <span className="text-text-danger ml-1">*</span>}
                </label>
              )}
              <FormFieldInput
                field={field}
                value={formResponses[field.id] ?? (field.type === 'multiselect' ? [] : '')}
                onChange={(v) => onFormResponseChange(field.id, v)}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
