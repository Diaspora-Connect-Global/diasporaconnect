'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import {
  DELETE_EVENT_SPEAKER,
  DELETE_EVENT_UPDATE,
  DELETE_PROGRAMME_SESSION,
  EVENT_PROGRAMME,
  EVENT_SPEAKERS,
  EVENT_UPDATES,
  PUBLISH_EVENT_UPDATE,
  UPSERT_EVENT_SPEAKER,
  UPSERT_PROGRAMME_SESSION,
  type EventProgrammeData,
  type EventSpeaker,
  type EventSpeakersData,
  type EventUpdatesData,
  type ProgrammeSession,
  type SessionType,
  type SpeakerRole,
} from '@/services/gql/eventsM2';
import { formatInZone } from '@/lib/eventCalendar';
import { hasErrors } from '@/lib/eventRefusal';
import { isoToLocalInput, localInputToIso } from '@/lib/zonedTime';
import { EmptyNote, Field, inputClass, reportRefusal } from './ManageUi';

const SESSION_TYPES: SessionType[] = ['KEYNOTE', 'TALK', 'PANEL', 'WORKSHOP', 'BREAK', 'NETWORKING', 'MEAL', 'PERFORMANCE', 'OTHER'];
const SPEAKER_ROLES: SpeakerRole[] = ['KEYNOTE', 'PANELIST', 'MODERATOR', 'SPEAKER', 'HOST'];

interface Props {
  eventId: string;
  timezone?: string | null;
}

// ─── Programme ───────────────────────────────────────────────────────────────

interface SessionForm {
  id?: string;
  title: string;
  description: string;
  start: string;
  end: string;
  room: string;
  sessionType: SessionType;
  speakerIds: string[];
}
const blankSession: SessionForm = { title: '', description: '', start: '', end: '', room: '', sessionType: 'TALK', speakerIds: [] };

export function ProgrammeManageTab({ eventId, timezone }: Props) {
  const t = useTranslations('eventPage.manage.programme');
  const tc = useTranslations('eventPage.manage.common');
  const tErr = useTranslations('eventPage.errors');
  const tTypes = useTranslations('eventPage.programme.types');
  const locale = useLocale();
  const programme = useQuery<EventProgrammeData>(EVENT_PROGRAMME, { variables: { eventId }, fetchPolicy: 'cache-and-network' });
  const speakers = useQuery<EventSpeakersData>(EVENT_SPEAKERS, { variables: { eventId } });
  const [upsert, { loading: saving }] = useMutation(UPSERT_PROGRAMME_SESSION);
  const [remove, { loading: removing }] = useMutation<{ deleteEventProgrammeSession?: boolean }>(DELETE_PROGRAMME_SESSION);
  const [form, setForm] = useState<SessionForm | null>(null);
  const [toDelete, setToDelete] = useState<ProgrammeSession | null>(null);

  const sessions = [...(programme.data?.eventProgramme ?? [])].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const people = speakers.data?.eventSpeakers ?? [];
  const valid = form && form.title.trim() && form.start && form.end && localInputToIso(form.end, timezone) > localInputToIso(form.start, timezone);

  const save = async () => {
    if (!form || !valid) return;
    try {
      const res = await upsert({
        variables: {
          input: {
            eventId,
            id: form.id,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            startAt: localInputToIso(form.start, timezone),
            endAt: localInputToIso(form.end, timezone),
            timezone: timezone || undefined,
            room: form.room.trim() || undefined,
            sessionType: form.sessionType,
            speakerIds: form.speakerIds,
          },
        },
      });
      if (!res.data || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(tc('saved'));
      setForm(null);
      await programme.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await remove({ variables: { eventId, sessionId: toDelete.id } });
      if (!res.data?.deleteEventProgrammeSession || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(tc('deleted'));
      setToDelete(null);
      await programme.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  return (
    <div className="space-y-4" data-testid="manage-programme">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">{t('intro', { zone: timezone ?? '' })}</p>
        {!form && <ButtonType2 onClick={() => setForm({ ...blankSession })} className="flex items-center gap-1"><Plus className="size-4" aria-hidden />{t('add')}</ButtonType2>}
      </div>

      {form && (
        <form className="space-y-3 rounded-2xl border border-border-subtle p-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <Field id="ps-title" label={t('title')}><input id="ps-title" className={inputClass} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ps-start" label={t('start')}><input id="ps-start" type="datetime-local" className={inputClass} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field id="ps-end" label={t('end')}><input id="ps-end" type="datetime-local" className={inputClass} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
            <Field id="ps-room" label={t('room')}><input id="ps-room" className={inputClass} maxLength={120} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
            <Field id="ps-type" label={t('type')}>
              <select id="ps-type" className={inputClass} value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value as SessionType })}>
                {SESSION_TYPES.map((s) => <option key={s} value={s}>{tTypes(s)}</option>)}
              </select>
            </Field>
          </div>
          <Field id="ps-desc" label={t('description')}><textarea id="ps-desc" rows={3} maxLength={4000} className={`${inputClass} py-2`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          {people.length > 0 && (
            <fieldset className="space-y-1">
              <legend className="text-sm text-text-secondary">{t('speakers')}</legend>
              {people.map((p) => (
                <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm text-text-primary">
                  <input type="checkbox" className="size-4 accent-surface-brand" checked={form.speakerIds.includes(p.id)} onChange={(e) => setForm({ ...form, speakerIds: e.target.checked ? [...form.speakerIds, p.id] : form.speakerIds.filter((x) => x !== p.id) })} />
                  {p.name}
                </label>
              ))}
            </fieldset>
          )}
          <div className="flex gap-2">
            <ButtonType2 type="submit" disabled={!valid || saving}>{saving ? tc('saving') : tc('save')}</ButtonType2>
            <ButtonType3 onClick={() => setForm(null)}>{tc('cancel')}</ButtonType3>
          </div>
        </form>
      )}

      {sessions.length === 0 && !form ? (
        <EmptyNote>{t('empty')}</EmptyNote>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary break-words">{s.title}</p>
                <p className="text-xs text-text-secondary">{formatInZone(s.startAt, locale, s.timezone || timezone)} · {tTypes(s.sessionType)}{s.room ? ` · ${s.room}` : ''}</p>
              </div>
              <div className="flex shrink-0">
                <button type="button" aria-label={tc('edit')} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover" onClick={() => setForm({ id: s.id, title: s.title, description: s.description ?? '', start: isoToLocalInput(s.startAt, s.timezone || timezone), end: isoToLocalInput(s.endAt, s.timezone || timezone), room: s.room ?? '', sessionType: s.sessionType, speakerIds: s.speakerIds })}><Pencil className="size-4" aria-hidden /></button>
                <button type="button" aria-label={tc('delete')} className="inline-flex size-11 items-center justify-center rounded-full text-text-danger hover:bg-surface-hover" onClick={() => setToDelete(s)}><Trash2 className="size-4" aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmationModal open={!!toDelete} onCancel={() => setToDelete(null)} onConfirm={doDelete} title={t('deleteTitle')} description={t('deleteBody', { title: toDelete?.title ?? '' })} confirmText={tc('delete')} cancelText={tc('cancel')} confirmVariant="destructive" isLoading={removing} />
    </div>
  );
}

// ─── Speakers ────────────────────────────────────────────────────────────────

interface SpeakerForm {
  id?: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  photoUrl: string;
  roleLabel: SpeakerRole;
}
const blankSpeaker: SpeakerForm = { name: '', title: '', organization: '', bio: '', photoUrl: '', roleLabel: 'SPEAKER' };

export function SpeakersManageTab({ eventId }: Props) {
  const t = useTranslations('eventPage.manage.speakers');
  const tc = useTranslations('eventPage.manage.common');
  const tErr = useTranslations('eventPage.errors');
  const tRoles = useTranslations('eventPage.speakers.roles');
  const speakers = useQuery<EventSpeakersData>(EVENT_SPEAKERS, { variables: { eventId }, fetchPolicy: 'cache-and-network' });
  const [upsert, { loading: saving }] = useMutation(UPSERT_EVENT_SPEAKER);
  const [remove, { loading: removing }] = useMutation<{ deleteEventSpeaker?: boolean }>(DELETE_EVENT_SPEAKER);
  const [form, setForm] = useState<SpeakerForm | null>(null);
  const [toDelete, setToDelete] = useState<EventSpeaker | null>(null);

  const list = [...(speakers.data?.eventSpeakers ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const photoOk = !form?.photoUrl.trim() || /^https:\/\//i.test(form.photoUrl.trim());
  const valid = !!form?.name.trim() && photoOk;

  const save = async () => {
    if (!form || !valid) return;
    try {
      const res = await upsert({
        variables: {
          input: {
            eventId,
            id: form.id,
            name: form.name.trim(),
            title: form.title.trim() || undefined,
            organization: form.organization.trim() || undefined,
            bio: form.bio.trim() || undefined,
            photoUrl: form.photoUrl.trim() || undefined,
            roleLabel: form.roleLabel,
          },
        },
      });
      if (!res.data || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(tc('saved'));
      setForm(null);
      await speakers.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await remove({ variables: { eventId, speakerId: toDelete.id } });
      if (!res.data?.deleteEventSpeaker || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(tc('deleted'));
      setToDelete(null);
      await speakers.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  return (
    <div className="space-y-4" data-testid="manage-speakers">
      <div className="flex justify-end">
        {!form && <ButtonType2 onClick={() => setForm({ ...blankSpeaker })} className="flex items-center gap-1"><Plus className="size-4" aria-hidden />{t('add')}</ButtonType2>}
      </div>
      {form && (
        <form className="space-y-3 rounded-2xl border border-border-subtle p-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="sp-name" label={t('name')}><input id="sp-name" className={inputClass} maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field id="sp-role" label={t('role')}>
              <select id="sp-role" className={inputClass} value={form.roleLabel} onChange={(e) => setForm({ ...form, roleLabel: e.target.value as SpeakerRole })}>
                {SPEAKER_ROLES.map((r) => <option key={r} value={r}>{tRoles(r)}</option>)}
              </select>
            </Field>
            <Field id="sp-title" label={t('jobTitle')}><input id="sp-title" className={inputClass} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field id="sp-org" label={t('organization')}><input id="sp-org" className={inputClass} maxLength={200} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></Field>
          </div>
          <Field id="sp-photo" label={t('photoUrl')} hint={photoOk ? t('photoHint') : t('photoInvalid')}><input id="sp-photo" inputMode="url" className={inputClass} maxLength={2048} value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} /></Field>
          <Field id="sp-bio" label={t('bio')}><textarea id="sp-bio" rows={3} maxLength={4000} className={`${inputClass} py-2`} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
          <div className="flex gap-2">
            <ButtonType2 type="submit" disabled={!valid || saving}>{saving ? tc('saving') : tc('save')}</ButtonType2>
            <ButtonType3 onClick={() => setForm(null)}>{tc('cancel')}</ButtonType3>
          </div>
        </form>
      )}
      {list.length === 0 && !form ? (
        <EmptyNote>{t('empty')}</EmptyNote>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle">
          {list.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary break-words">{s.name}</p>
                <p className="text-xs text-text-secondary">{tRoles(s.roleLabel)}{s.title || s.organization ? ` · ${[s.title, s.organization].filter(Boolean).join(', ')}` : ''}</p>
              </div>
              <div className="flex shrink-0">
                <button type="button" aria-label={tc('edit')} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover" onClick={() => setForm({ id: s.id, name: s.name, title: s.title ?? '', organization: s.organization ?? '', bio: s.bio ?? '', photoUrl: s.photoUrl ?? '', roleLabel: s.roleLabel })}><Pencil className="size-4" aria-hidden /></button>
                <button type="button" aria-label={tc('delete')} className="inline-flex size-11 items-center justify-center rounded-full text-text-danger hover:bg-surface-hover" onClick={() => setToDelete(s)}><Trash2 className="size-4" aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmationModal open={!!toDelete} onCancel={() => setToDelete(null)} onConfirm={doDelete} title={t('deleteTitle')} description={t('deleteBody', { name: toDelete?.name ?? '' })} confirmText={tc('delete')} cancelText={tc('cancel')} confirmVariant="destructive" isLoading={removing} />
    </div>
  );
}

// ─── Updates ─────────────────────────────────────────────────────────────────

export function UpdatesManageTab({ eventId }: Props) {
  const t = useTranslations('eventPage.manage.updates');
  const tc = useTranslations('eventPage.manage.common');
  const tErr = useTranslations('eventPage.errors');
  const locale = useLocale();
  const updates = useQuery<EventUpdatesData>(EVENT_UPDATES, { variables: { eventId, pageSize: 20 }, fetchPolicy: 'cache-and-network' });
  const [publish, { loading: publishing }] = useMutation(PUBLISH_EVENT_UPDATE);
  const [remove, { loading: removing }] = useMutation<{ deleteEventUpdate?: boolean }>(DELETE_EVENT_UPDATE);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);
  const list = updates.data?.eventUpdates?.updates ?? [];
  const valid = title.trim().length > 0 && title.length <= 200 && body.trim().length > 0 && body.length <= 5000;

  const send = async () => {
    if (!valid) return;
    try {
      const res = await publish({ variables: { eventId, title: title.trim(), body: body.trim() } });
      if (!res.data || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(t('published'));
      setTitle('');
      setBody('');
      await updates.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await remove({ variables: { eventId, updateId: toDelete.id } });
      if (!res.data?.deleteEventUpdate || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(tc('deleted'));
      setToDelete(null);
      await updates.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  return (
    <div className="space-y-4" data-testid="manage-updates">
      <form className="space-y-3 rounded-2xl border border-border-subtle p-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Field id="up-title" label={t('title')}><input id="up-title" className={inputClass} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field id="up-body" label={t('message')} hint={t('notifyNote')}><textarea id="up-body" rows={4} maxLength={5000} className={`${inputClass} py-2`} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <ButtonType2 type="submit" disabled={!valid || publishing}>{publishing ? t('publishing') : t('publish')}</ButtonType2>
      </form>
      {list.length === 0 ? (
        <EmptyNote>{t('empty')}</EmptyNote>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle">
          {list.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary break-words">{u.title}</p>
                <p className="text-xs text-text-secondary">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(u.publishedAt))}</p>
              </div>
              <button type="button" aria-label={tc('delete')} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text-danger hover:bg-surface-hover" onClick={() => setToDelete({ id: u.id, title: u.title })}><Trash2 className="size-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmationModal open={!!toDelete} onCancel={() => setToDelete(null)} onConfirm={doDelete} title={t('deleteTitle')} description={t('deleteBody', { title: toDelete?.title ?? '' })} confirmText={tc('delete')} cancelText={tc('cancel')} confirmVariant="destructive" isLoading={removing} />
    </div>
  );
}

