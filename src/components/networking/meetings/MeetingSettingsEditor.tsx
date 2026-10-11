'use client';

import { cloneElement, isValidElement, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { btnPrimary, btnQuiet, fieldClass } from './parts';
import type { MeetingFailure } from './useMeetings';
import type { MeetingPolicy, MeetingSettings, MeetingSettingsInput } from '@/services/gql/networkingMeetings';

const POLICIES: MeetingPolicy[] = ['MUTUAL_ONLY', 'ANY_PARTICIPANT', 'DISABLED'];
const DURATION_CHOICES = [10, 15, 20, 30, 45, 60, 90];
const POINT_CAPACITY_MAX = 500;

interface PointRow { key: string; id?: string; name: string; directions: string; capacity: string }
interface WindowRow { key: string; date: string; startTime: string; endTime: string }

let seq = 0;
const nextKey = () => `r${(seq += 1)}`;

/**
 * Organiser meeting settings: who may request, the meeting lengths, the windows (event-local wall
 * clock), the places with their capacity per time, and the per-person caps. Saves with the
 * settings version it was loaded with, so a concurrent edit is refused rather than overwritten.
 */
export default function MeetingSettingsEditor({
  settings,
  onSave,
}: {
  settings: MeetingSettings;
  onSave: (input: Omit<MeetingSettingsInput, 'eventId'>) => Promise<{ ok: true } | MeetingFailure>;
}) {
  const t = useTranslations('networking.meetings.settings');
  const te = useTranslations('networking.errors');
  const tp = useTranslations('networking.meetings.settings.policy');
  const uid = useId();
  const [policy, setPolicy] = useState<MeetingPolicy>(settings.meetingPolicy);
  const [durations, setDurations] = useState<number[]>(settings.meetingDurations);
  const [windows, setWindows] = useState<WindowRow[]>(settings.meetingWindows.map((w) => ({ key: nextKey(), date: w.date, startTime: w.startTime, endTime: w.endTime })));
  const [points, setPoints] = useState<PointRow[]>(
    settings.meetingPoints.filter((p) => p.active).map((p) => ({ key: nextKey(), id: p.id, name: p.name, directions: p.directions ?? '', capacity: String(p.capacityPerSlot) })),
  );
  const [maxMeetings, setMaxMeetings] = useState(String(settings.maxMeetingsPerPerson));
  const [maxPending, setMaxPending] = useState(String(settings.maxPendingRequests));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tried, setTried] = useState(false);

  const choices = Array.from(new Set([...DURATION_CHOICES, ...settings.meetingDurations])).sort((a, b) => a - b);
  const intIn = (v: string, min: number, max: number) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;
  const winBad = (w: WindowRow) => !w.date || !w.startTime || !w.endTime || w.endTime <= w.startTime;
  const problems = {
    durations: durations.length === 0,
    windows: windows.some(winBad),
    points: points.some((p) => !p.name.trim() || !intIn(p.capacity, 1, POINT_CAPACITY_MAX)),
    maxMeetings: !intIn(maxMeetings, 1, 1000),
    maxPending: !intIn(maxPending, 1, 1000),
  };
  const invalid = Object.values(problems).some(Boolean);

  const save = async () => {
    setTried(true);
    setSaved(false);
    setError(null);
    if (invalid) return;
    setBusy(true);
    const out = await onSave({
      meetingPolicy: policy,
      meetingDurations: [...durations].sort((a, b) => a - b),
      meetingWindows: windows.map(({ date, startTime, endTime }) => ({ date, startTime, endTime })),
      maxMeetingsPerPerson: Number(maxMeetings),
      maxPendingRequests: Number(maxPending),
      meetingPoints: points.map((p, i) => ({ id: p.id, name: p.name.trim(), directions: p.directions.trim() || null, capacityPerSlot: Number(p.capacity), sortOrder: i })),
      expectedVersion: settings.version,
    });
    setBusy(false);
    if (out.ok) setSaved(true);
    else setError(out.key);
  };

  const tz = settings.timezone;
  return (
    <section aria-labelledby={`${uid}-h`} data-testid="meeting-settings" className="space-y-6 rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-6">
      <div>
        <h2 id={`${uid}-h`} className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('intro')}</p>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-text-primary">{t('policyLegend')}</legend>
        <div className="grid gap-2">
          {POLICIES.map((p) => (
            <label key={p} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border-subtle px-3 py-2 text-sm has-[:checked]:border-border-brand has-[:checked]:bg-surface-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
              <input type="radio" name={`${uid}-policy`} checked={policy === p} onChange={() => setPolicy(p)} className="mt-0.5 size-4" data-testid={`policy-${p}`} />
              <span><span className="block font-medium text-text-primary">{tp(`${p}.label`)}</span><span className="block text-xs text-muted-foreground">{tp(`${p}.hint`)}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-text-primary">{t('durationsLegend')}</legend>
        <div className="flex flex-wrap gap-2">
          {choices.map((d) => (
            <label key={d} className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-subtle px-4 text-sm has-[:checked]:border-border-brand has-[:checked]:bg-surface-brand-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
              <input type="checkbox" className="absolute inset-0 size-full cursor-pointer opacity-0" checked={durations.includes(d)} onChange={(e) => setDurations(e.target.checked ? [...durations, d] : durations.filter((x) => x !== d))} data-testid="duration-check" />
              {t('minutes', { count: d })}
            </label>
          ))}
        </div>
        {tried && problems.durations && <p role="alert" className="mt-1 text-xs text-text-danger">{t('durationsNeeded')}</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-text-primary">{t('windowsLegend')}</legend>
        <p className="text-xs text-muted-foreground">{t('windowsHint', { zone: tz.replace(/_/g, ' ') })}</p>
        {windows.length === 0 && <p className="text-sm text-muted-foreground" data-testid="windows-whole-event">{t('windowsWholeEvent')}</p>}
        {windows.map((w, i) => (
          <div key={w.key} className="flex flex-wrap items-end gap-3" data-testid="window-row">
            <Field label={t('date')}><input type="date" value={w.date} onChange={(e) => setWindows(windows.map((x) => (x.key === w.key ? { ...x, date: e.target.value } : x)))} className={`${fieldClass} min-h-11`} aria-invalid={tried && winBad(w)} /></Field>
            <Field label={t('from')}><input type="time" value={w.startTime} onChange={(e) => setWindows(windows.map((x) => (x.key === w.key ? { ...x, startTime: e.target.value } : x)))} className={`${fieldClass} min-h-11`} aria-invalid={tried && winBad(w)} /></Field>
            <Field label={t('to')}><input type="time" value={w.endTime} onChange={(e) => setWindows(windows.map((x) => (x.key === w.key ? { ...x, endTime: e.target.value } : x)))} className={`${fieldClass} min-h-11`} aria-invalid={tried && winBad(w)} /></Field>
            <button type="button" onClick={() => setWindows(windows.filter((x) => x.key !== w.key))} className={btnQuiet} aria-label={t('removeWindow', { n: i + 1 })}><Trash2 className="size-4" aria-hidden />{t('remove')}</button>
          </div>
        ))}
        {tried && problems.windows && <p role="alert" className="text-xs text-text-danger">{t('windowInvalid')}</p>}
        <button type="button" onClick={() => setWindows([...windows, { key: nextKey(), date: '', startTime: '09:00', endTime: '12:00' }])} className={btnQuiet} data-testid="add-window"><Plus className="size-4" aria-hidden />{t('addWindow')}</button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-text-primary">{t('pointsLegend')}</legend>
        <p className="text-xs text-muted-foreground">{t('pointsHint')}</p>
        {points.map((p, i) => (
          <div key={p.key} className="grid gap-3 rounded-xl border border-border-subtle p-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end" data-testid="point-row">
            <Field label={t('pointName')}><input type="text" value={p.name} maxLength={80} onChange={(e) => setPoints(points.map((x) => (x.key === p.key ? { ...x, name: e.target.value } : x)))} className={`${fieldClass} min-h-11`} aria-invalid={tried && !p.name.trim()} data-testid="point-name" /></Field>
            <Field label={t('pointDirections')}><input type="text" value={p.directions} maxLength={200} onChange={(e) => setPoints(points.map((x) => (x.key === p.key ? { ...x, directions: e.target.value } : x)))} className={`${fieldClass} min-h-11`} /></Field>
            <Field label={t('pointCapacity')}><input type="number" inputMode="numeric" min={1} max={POINT_CAPACITY_MAX} value={p.capacity} onChange={(e) => setPoints(points.map((x) => (x.key === p.key ? { ...x, capacity: e.target.value } : x)))} className={`${fieldClass} min-h-11`} aria-invalid={tried && !intIn(p.capacity, 1, POINT_CAPACITY_MAX)} data-testid="point-capacity" /></Field>
            <button type="button" onClick={() => setPoints(points.filter((x) => x.key !== p.key))} className={btnQuiet} aria-label={t('removePoint', { name: p.name || String(i + 1) })}><Trash2 className="size-4" aria-hidden />{t('remove')}</button>
          </div>
        ))}
        {tried && problems.points && <p role="alert" className="text-xs text-text-danger">{t('pointInvalid', { max: POINT_CAPACITY_MAX })}</p>}
        <button type="button" onClick={() => setPoints([...points, { key: nextKey(), name: '', directions: '', capacity: '2' }])} className={btnQuiet} data-testid="add-point"><Plus className="size-4" aria-hidden />{t('addPoint')}</button>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-text-primary">{t('capsLegend')}</legend>
        <Field label={t('maxMeetings')}><input type="number" inputMode="numeric" min={1} value={maxMeetings} onChange={(e) => setMaxMeetings(e.target.value)} className={`${fieldClass} min-h-11`} aria-invalid={tried && problems.maxMeetings} data-testid="max-meetings" /></Field>
        <Field label={t('maxPending')}><input type="number" inputMode="numeric" min={1} value={maxPending} onChange={(e) => setMaxPending(e.target.value)} className={`${fieldClass} min-h-11`} aria-invalid={tried && problems.maxPending} data-testid="max-pending" /></Field>
        {tried && (problems.maxMeetings || problems.maxPending) && <p role="alert" className="text-xs text-text-danger sm:col-span-2">{t('capsInvalid')}</p>}
      </fieldset>

      <div aria-live="polite" className="space-y-2">
        {error && <p role="alert" data-testid="settings-error" data-error={error} className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-text-primary">{te(error)}</p>}
        {saved && <p role="status" data-testid="settings-saved" className="rounded-xl border border-border-success bg-surface-success px-4 py-3 text-sm text-text-primary">{t('saved')}</p>}
      </div>
      <button type="button" disabled={busy} onClick={() => void save()} className={btnPrimary} data-testid="settings-save">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}{t('save')}
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-text-primary">{label}</label>
      <FieldChild id={id}>{children}</FieldChild>
    </div>
  );
}

function FieldChild({ id, children }: { id: string; children: React.ReactNode }) {
  return isValidElement(children) ? cloneElement(children as React.ReactElement<{ id?: string }>, { id }) : <>{children}</>;
}
