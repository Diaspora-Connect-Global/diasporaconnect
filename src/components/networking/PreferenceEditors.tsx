'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarClock, Eye, Handshake, MapPin } from 'lucide-react';
import { InlineNotice, focusRing } from './primitives';
import { DAY_PARTS, selectedFromSlots, slotKey, slotsFromSelected, type DayPart } from '@/lib/networkingAvailability';
import type { AvailabilitySlot, FieldFlags, NetworkingAttendanceFormat, NetworkingVisibility } from '@/services/gql/networking';
import type { NetworkingDraft } from './draft';

const inputClass = 'w-full min-h-11 rounded-md border-2 border-border-subtle bg-surface-subtle px-3 text-sm text-text-primary focus:outline-none focus:border-border-brand';

function RadioCard({ name, value, checked, onChange, title, hint, disabled }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${checked ? 'border-border-brand bg-surface-brand-subtle' : 'border-border-subtle bg-surface-default'} ${disabled ? 'opacity-50' : ''} focus-within:ring-2 focus-within:ring-text-brand`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="mt-1 size-4 accent-[var(--text-brand)]" />
      <span>
        <span className="block text-sm font-semibold text-text-primary">{title}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function SwitchRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block text-sm text-text-primary">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--text-brand)]" />
    </label>
  );
}

/** How do you want to meet? */
export function HowToMeetEditor({ draft, onChange }: { draft: NetworkingDraft; onChange: (d: NetworkingDraft) => void }) {
  const t = useTranslations('networking.meet');
  const formats: NetworkingAttendanceFormat[] = ['IN_PERSON', 'ONLINE', 'EITHER'];
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text-primary">{t('formatLegend')}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {formats.map((f) => (
          <RadioCard key={f} name="attendanceFormat" value={f} checked={draft.attendanceFormat === f} onChange={() => onChange({ ...draft, attendanceFormat: f })} title={t(`format.${f}`)} />
        ))}
      </div>
      <SwitchRow id="open-to-meetings" label={t('openToMeetings')} hint={t('openToMeetingsHint')} checked={draft.openToMeetings} onChange={(v) => onChange({ ...draft, openToMeetings: v })} />
    </fieldset>
  );
}

/** When are you available? Parts of each event day, in the event's own time zone. */
export function AvailabilityEditor({
  days,
  timeZone,
  slots,
  onChange,
}: {
  days: string[];
  timeZone: string;
  slots: AvailabilitySlot[];
  onChange: (next: AvailabilitySlot[]) => void;
}) {
  const t = useTranslations('networking.availability');
  const locale = useLocale();
  const selected = useMemo(() => selectedFromSlots(slots, days, timeZone), [slots, days, timeZone]);
  const parts = Object.keys(DAY_PARTS) as DayPart[];
  const toggle = (day: string, part: DayPart) => {
    const next = new Set(selected);
    const k = slotKey(day, part);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(slotsFromSelected(next, timeZone));
  };
  const dayLabel = (day: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
    } catch {
      return day;
    }
  };
  if (days.length === 0) return <p className="text-sm text-muted-foreground">{t('noDays')}</p>;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text-primary">{t('legend')}</legend>
      <p className="text-xs text-muted-foreground">{t('zoneNote', { zone: timeZone })}</p>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day} className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-sm text-text-primary">{dayLabel(day)}</span>
            {parts.map((part) => {
              const on = selected.has(slotKey(day, part));
              return (
                <button
                  key={part}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(day, part)}
                  className={`min-h-9 rounded-full border px-3 text-sm ${on ? 'border-border-brand bg-surface-brand text-text-white' : 'border-border-subtle bg-surface-default text-text-primary'} ${focusRing}`}
                >
                  {t(`part.${part}`)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Headline, organisation, location and the intro the other person reads. */
export function AboutEditor({ draft, onChange }: { draft: NetworkingDraft; onChange: (d: NetworkingDraft) => void }) {
  const t = useTranslations('networking.about');
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="nw-headline" className="text-sm font-semibold text-text-primary">{t('headline')}</label>
        <input id="nw-headline" className={inputClass} maxLength={120} value={draft.headline} onChange={(e) => onChange({ ...draft, headline: e.target.value })} placeholder={t('headlinePlaceholder')} />
      </div>
      <div className="space-y-1">
        <label htmlFor="nw-org" className="text-sm font-semibold text-text-primary">{t('organization')}</label>
        <input id="nw-org" className={inputClass} maxLength={120} value={draft.organization} onChange={(e) => onChange({ ...draft, organization: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label htmlFor="nw-location" className="text-sm font-semibold text-text-primary">{t('location')}</label>
        <input id="nw-location" className={inputClass} maxLength={120} value={draft.locationLabel} onChange={(e) => onChange({ ...draft, locationLabel: e.target.value })} placeholder={t('locationPlaceholder')} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label htmlFor="nw-intro" className="text-sm font-semibold text-text-primary">{t('intro')}</label>
        <textarea id="nw-intro" rows={3} maxLength={500} className={`${inputClass} py-2`} value={draft.intro} onChange={(e) => onChange({ ...draft, intro: e.target.value })} placeholder={t('introPlaceholder')} />
        <p className="text-xs text-muted-foreground">{t('introHint')}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="nw-needs-note" className="text-sm font-semibold text-text-primary">{t('needsNote')}</label>
        <textarea id="nw-needs-note" rows={2} maxLength={280} className={`${inputClass} py-2`} value={draft.needsNote} onChange={(e) => onChange({ ...draft, needsNote: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label htmlFor="nw-offers-note" className="text-sm font-semibold text-text-primary">{t('offersNote')}</label>
        <textarea id="nw-offers-note" rows={2} maxLength={280} className={`${inputClass} py-2`} value={draft.offersNote} onChange={(e) => onChange({ ...draft, offersNote: e.target.value })} />
      </div>
    </div>
  );
}

const FLAG_KEYS: Array<keyof FieldFlags> = ['organization', 'location', 'availability', 'needsNote', 'offersNote'];

/** Who can find you, and which optional fields they see. */
export function VisibilityEditor({
  draft,
  onChange,
  allowed,
}: {
  draft: NetworkingDraft;
  onChange: (d: NetworkingDraft) => void;
  allowed: NetworkingVisibility[];
}) {
  const t = useTranslations('networking.visibility');
  const modes: NetworkingVisibility[] = (['RECOMMENDED', 'OPEN', 'LIMITED', 'HIDDEN'] as const).filter((m) => allowed.length === 0 || allowed.includes(m));
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text-primary">{t('legend')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {modes.map((m) => (
            <RadioCard key={m} name="visibility" value={m} checked={draft.visibility === m} onChange={() => onChange({ ...draft, visibility: m })} title={t(`mode.${m}.title`)} hint={t(`mode.${m}.hint`)} />
          ))}
        </div>
        {draft.visibility === 'HIDDEN' && <InlineNotice tone="warning" testId="hidden-warning">{t('hiddenWarning')}</InlineNotice>}
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold text-text-primary">{t('fieldsLegend')}</legend>
        <p className="text-xs text-muted-foreground">{t('fieldsHint')}</p>
        {FLAG_KEYS.map((k) => (
          <SwitchRow key={k} id={`flag-${k}`} label={t(`flag.${k}`)} checked={draft.fieldFlags[k]} onChange={(v) => onChange({ ...draft, fieldFlags: { ...draft.fieldFlags, [k]: v } })} />
        ))}
      </fieldset>
      <div>
        <SwitchRow id="accepts-interests" label={t('acceptsInterests')} hint={t('acceptsInterestsHint')} checked={draft.acceptsInterests} onChange={(v) => onChange({ ...draft, acceptsInterests: v })} />
        <SwitchRow id="in-circle-discovery" label={t('inCircleDiscovery')} checked={draft.inCircleDiscovery} onChange={(v) => onChange({ ...draft, inCircleDiscovery: v })} />
      </div>
    </div>
  );
}

export type PreferencePanel = 'meet' | 'availability' | 'location' | 'visibility';

/** The four summary cards under the goals (mockup: How / When / Location / Visibility). */
export function PreferenceSummaryCards({ draft, active, onOpen }: { draft: NetworkingDraft; active: PreferencePanel | null; onOpen: (p: PreferencePanel) => void }) {
  const t = useTranslations('networking.cards');
  const items: Array<{ id: PreferencePanel; icon: React.ReactNode; title: string; summary: string }> = [
    { id: 'meet', icon: <Handshake className="size-5" aria-hidden />, title: t('meetTitle'), summary: `${t(`format.${draft.attendanceFormat}`)}${draft.openToMeetings ? '' : ` · ${t('meetingsOff')}`}` },
    { id: 'availability', icon: <CalendarClock className="size-5" aria-hidden />, title: t('availabilityTitle'), summary: draft.availability.length > 0 ? t('slots', { count: draft.availability.length }) : t('noneSet') },
    { id: 'location', icon: <MapPin className="size-5" aria-hidden />, title: t('locationTitle'), summary: draft.locationLabel || t('noneSet') },
    { id: 'visibility', icon: <Eye className="size-5" aria-hidden />, title: t('visibilityTitle'), summary: t(`visibility.${draft.visibility}`) },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            aria-expanded={active === it.id}
            aria-controls="preference-panel"
            onClick={() => onOpen(it.id)}
            className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left ${active === it.id ? 'border-border-brand bg-surface-brand-subtle' : 'border-border-subtle bg-surface-default hover:bg-surface-subtle'} ${focusRing}`}
          >
            <span className="text-text-brand">{it.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text-primary">{it.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{it.summary}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
