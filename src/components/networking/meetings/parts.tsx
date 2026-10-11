'use client';

import { useId, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Chip, focusRing } from '../primitives';
import { formatDayHeading, formatInZone, timezoneLabel, zoneDiffersFromViewer } from '@/lib/eventCalendar';
import { groupSlotsByDay, slotRange } from '@/lib/meetingTime';
import type { MeetingSlot, MeetingStatus } from '@/services/gql/networkingMeetings';

export const btnPrimary = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border-brand bg-surface-brand px-5 text-sm font-semibold text-text-white hover:opacity-90 disabled:opacity-50 ${focusRing}`;
export const btnQuiet = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border-subtle px-5 text-sm font-medium text-text-primary hover:bg-surface-subtle disabled:opacity-50 ${focusRing}`;
export const btnDanger = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border-danger px-5 text-sm font-medium text-text-danger hover:bg-surface-danger disabled:opacity-50 ${focusRing}`;
export const fieldClass = `w-full rounded-xl border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary ${focusRing}`;

const noopSubscribe = () => () => {};
/** False on the server and during hydration, true afterwards: for anything that depends on the viewer's own zone. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const STATUS_TONE: Record<MeetingStatus, 'default' | 'brand' | 'success'> = {
  REQUESTED: 'brand',
  ALT_PROPOSED: 'brand',
  CONFIRMED: 'success',
  RESCHEDULE_PROPOSED: 'brand',
  DECLINED: 'default',
  CANCELLED: 'default',
  EXPIRED: 'default',
  COMPLETED: 'default',
};

export function StatusChip({ status, awaitingMe }: { status: MeetingStatus; awaitingMe?: boolean }) {
  const t = useTranslations('networking.meetings.status');
  return (
    <span data-testid="meeting-status" data-status={status} className="inline-flex flex-wrap items-center gap-1">
      <Chip tone={STATUS_TONE[status] ?? 'default'}>{t(status)}</Chip>
      {awaitingMe && <Chip tone="brand">{t('awaitingMe')}</Chip>}
    </span>
  );
}

/** "Times are in event time (Africa/Accra, GMT)". Said once per screen, wherever times are chosen or read. */
export function ZoneNote({ timezone, atIso, testId = 'zone-note' }: { timezone: string; atIso?: string | null; testId?: string }) {
  const t = useTranslations('networking.meetings');
  const locale = useLocale();
  const short = atIso ? timezoneLabel(atIso, locale, timezone) : '';
  return (
    <p data-testid={testId} className="text-xs text-muted-foreground">
      {t('zoneNote', { zone: timezone.replace(/_/g, ' '), short: short || timezone })}
    </p>
  );
}

/** A slot as words: date and range in the EVENT clock, plus the viewer's own time when their zone differs. */
export function SlotText({ slot, timezone, withDate = true }: { slot: MeetingSlot; timezone: string; withDate?: boolean }) {
  const t = useTranslations('networking.meetings');
  const locale = useLocale();
  const client = useIsClient();
  const date = formatDayHeading(slot.startAt, locale, timezone);
  const differs = client && zoneDiffersFromViewer(timezone, new Date(slot.startAt));
  return (
    <>
      <span data-testid="slot-event-time">{withDate ? `${date}, ` : ''}{slotRange(slot)} <span className="text-muted-foreground">({timezoneLabel(slot.startAt, locale, timezone) || slot.utcOffset})</span></span>
      {differs && <span data-testid="slot-local-time" className="block text-xs text-muted-foreground">{t('yourTime', { time: formatInZone(slot.startAt, locale, undefined) })}</span>}
    </>
  );
}

/**
 * Choose one time (radio) or up to `max` times (checkbox), grouped by event-local day.
 * Native inputs: Tab enters the group, arrow keys move inside a radio group, Space selects.
 */
export function SlotPicker({
  slots,
  timezone,
  mode,
  value,
  onChange,
  max = 3,
  legend,
  name,
}: {
  slots: MeetingSlot[];
  timezone: string;
  mode: 'single' | 'multi';
  value: string[];
  onChange: (starts: string[]) => void;
  max?: number;
  legend: string;
  name: string;
}) {
  const t = useTranslations('networking.meetings');
  const locale = useLocale();
  const uid = useId();
  const days = groupSlotsByDay(slots);
  const full = mode === 'multi' && value.length >= max;
  const toggle = (start: string, on: boolean) => {
    if (mode === 'single') return onChange([start]);
    onChange(on ? [...value, start] : value.filter((v) => v !== start));
  };
  return (
    <fieldset data-testid="slot-picker" className="min-w-0 space-y-3">
      <legend className="mb-1 text-sm font-semibold text-text-primary">{legend}</legend>
      {mode === 'multi' && (
        <p aria-live="polite" data-testid="slot-count" className="text-xs text-muted-foreground">{t('propose.count', { count: value.length, max })}</p>
      )}
      {days.map((day) => {
        const hid = `${uid}-${day.date}`;
        return (
          <div key={day.date} role="group" aria-labelledby={hid} data-testid="slot-day" data-date={day.date}>
            <h4 id={hid} className="mb-1.5 text-sm font-medium text-text-primary">{formatDayHeading(day.slots[0].startAt, locale, timezone)}</h4>
            <ul className="flex flex-wrap gap-2">
              {day.slots.map((s) => {
                const checked = value.includes(s.startAt);
                const disabled = mode === 'multi' && full && !checked;
                return (
                  <li key={s.startAt}>
                    <label className={`relative inline-flex min-h-11 min-w-28 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium ${checked ? 'border-border-brand bg-surface-brand-subtle text-text-brand' : 'border-border-subtle text-text-primary hover:bg-surface-subtle'} ${disabled ? 'cursor-not-allowed opacity-50' : ''} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand has-[:focus-visible]:ring-offset-1`}>
                      <input
                        type={mode === 'single' ? 'radio' : 'checkbox'}
                        name={`${name}-${uid}`}
                        value={s.startAt}
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => toggle(s.startAt, e.target.checked)}
                        data-testid="slot-option"
                        data-start={s.startAt}
                        className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        aria-label={`${formatDayHeading(s.startAt, locale, timezone)}, ${slotRange(s)}`}
                      />
                      {checked && <Check className="mr-1.5 size-4" aria-hidden />}
                      <span aria-hidden>{slotRange(s)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </fieldset>
  );
}
