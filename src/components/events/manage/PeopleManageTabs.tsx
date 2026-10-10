'use client';

import { useEffect, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Trash2, X } from 'lucide-react';
import { ButtonType1, ButtonType2, ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { SEARCH_USERS } from '@/services/gql/connection';
import {
  ADD_EVENT_STAFF,
  APPROVE_EVENT_REGISTRATION,
  EVENT_STAFF,
  GET_EVENT_PAGE,
  PENDING_APPROVAL_REGISTRATIONS,
  REJECT_EVENT_REGISTRATION,
  REMOVE_EVENT_STAFF,
  UPDATE_REGISTRATION_SETTINGS,
  type EventStaffMember,
  type EventStaffRole,
  type GetEventPageData,
  type PendingApprovalData,
} from '@/services/gql/eventsM2';
import { hasErrors } from '@/lib/eventRefusal';
import { EmptyNote, Field, inputClass, reportRefusal } from './ManageUi';

const REASON_MAX = 500;
const PAGE = 20;

// ─── Approvals ───────────────────────────────────────────────────────────────

export function ApprovalsManageTab({ eventId }: { eventId: string }) {
  const t = useTranslations('eventPage.manage.approvals');
  const tc = useTranslations('eventPage.manage.common');
  const tErr = useTranslations('eventPage.errors');
  const tIdentity = useTranslations('common.identity');
  const locale = useLocale();

  const eventQ = useQuery<GetEventPageData>(GET_EVENT_PAGE, { variables: { id: eventId } });
  const requiresApproval = eventQ.data?.getEvent?.requiresApproval === true;
  const pending = useQuery<PendingApprovalData>(PENDING_APPROVAL_REGISTRATIONS, {
    variables: { eventId, limit: PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const rows = pending.data?.getEventRegistrations?.registrations ?? [];
  const total = pending.data?.getEventRegistrations?.total ?? 0;
  // Names, never ids. One page (<= 20) keeps the per-person profile lookups bounded.
  const { usersById } = useCircleUsers(rows.map((r) => r.userId));

  const [approve] = useMutation<{ approveEventRegistration?: { registrationStatus?: string | null } | null }>(APPROVE_EVENT_REGISTRATION);
  const [reject, { loading: rejecting }] = useMutation<{ rejectEventRegistration?: { id: string } | null }>(REJECT_EVENT_REGISTRATION);
  const [settings, { loading: savingSettings }] = useMutation<{ updateEventRegistrationSettings?: { id: string } | null }>(UPDATE_REGISTRATION_SETTINGS);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');

  const nameOf = (userId: string) => circleUserDisplayName(usersById[userId], tIdentity('unknownUser'));

  const toggle = async (next: boolean) => {
    try {
      const res = await settings({ variables: { input: { eventId, requiresApproval: next } } });
      if (!res.data?.updateEventRegistrationSettings || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(next ? t('approvalOn') : t('approvalOff'));
      await eventQ.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  const doApprove = async (id: string) => {
    setBusy(id);
    try {
      const res = await approve({ variables: { registrationId: id } });
      const reg = res.data?.approveEventRegistration;
      if (!reg || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(String(reg.registrationStatus ?? '').toUpperCase() === 'WAITLISTED' ? t('approvedWaitlisted') : t('approved'));
      await pending.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    } finally {
      setBusy(null);
    }
  };

  const doReject = async () => {
    if (!rejectFor) return;
    try {
      const res = await reject({ variables: { registrationId: rejectFor.id, reason: reason.trim() || undefined } });
      if (!res.data?.rejectEventRegistration || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(t('rejected'));
      setRejectFor(null);
      setReason('');
      await pending.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  return (
    <div className="space-y-4" data-testid="manage-approvals">
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border-subtle p-4 text-sm text-text-primary">
        <span>
          {t('requireApproval')}
          <span className="block text-xs text-text-secondary">{t('requireApprovalHint')}</span>
        </span>
        <input type="checkbox" role="switch" className="size-5 accent-surface-brand" checked={requiresApproval} disabled={savingSettings} onChange={(e) => toggle(e.target.checked)} data-testid="require-approval-switch" />
      </label>

      <p className="text-sm text-text-secondary">{t('waiting', { count: total })}</p>
      {rows.length === 0 ? (
        <EmptyNote>{t('empty')}</EmptyNote>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle" data-testid="approval-list">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary break-words">{nameOf(r.userId)}</p>
                <p className="text-xs text-text-secondary">
                  {r.registeredAt ? t('requestedOn', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(r.registeredAt)) }) : ''}
                  {r.quantity > 1 ? ` · ${t('tickets', { count: r.quantity })}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <ButtonType2 onClick={() => doApprove(r.id)} disabled={busy === r.id} className="flex items-center gap-1"><Check className="size-4" aria-hidden />{t('approve')}</ButtonType2>
                <ButtonType1 onClick={() => { setRejectFor({ id: r.id, name: nameOf(r.userId) }); setReason(''); }} disabled={busy === r.id} className="flex items-center gap-1"><X className="size-4" aria-hidden />{t('reject')}</ButtonType1>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        open={!!rejectFor}
        onCancel={() => setRejectFor(null)}
        onConfirm={doReject}
        title={t('rejectTitle', { name: rejectFor?.name ?? '' })}
        description={t('rejectBody')}
        confirmText={t('reject')}
        cancelText={tc('cancel')}
        confirmVariant="destructive"
        isLoading={rejecting}
      >
        <Field id="reject-reason" label={t('reason')} hint={t('reasonHint', { count: reason.length, max: REASON_MAX })}>
          <textarea id="reject-reason" rows={3} maxLength={REASON_MAX} className={`${inputClass} py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </ConfirmationModal>
    </div>
  );
}

// ─── Staff ───────────────────────────────────────────────────────────────────

interface Candidate {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  avatarUrl?: string | null;
}

const ROLES: EventStaffRole[] = ['EVENT_MANAGER', 'NETWORKING_MANAGER'];

export function StaffManageTab({ eventId }: { eventId: string }) {
  const t = useTranslations('eventPage.manage.staff');
  const tc = useTranslations('eventPage.manage.common');
  const tErr = useTranslations('eventPage.errors');
  const staffQ = useQuery<{ eventStaff?: EventStaffMember[] | null }>(EVENT_STAFF, { variables: { eventId }, fetchPolicy: 'cache-and-network' });
  const staff = staffQ.data?.eventStaff ?? [];
  const [add, { loading: adding }] = useMutation<{ addEventStaff?: { userId: string } | null }>(ADD_EVENT_STAFF);
  const [remove, { loading: removing }] = useMutation<{ removeEventStaff?: boolean }>(REMOVE_EVENT_STAFF);
  const [search, { data: found, loading: searching }] = useLazyQuery<{ searchUsers?: { profiles?: Candidate[] } | null }>(SEARCH_USERS, { fetchPolicy: 'no-cache' });

  const [q, setQ] = useState('');
  const [role, setRole] = useState<EventStaffRole>('EVENT_MANAGER');
  const [toRemove, setToRemove] = useState<EventStaffMember | null>(null);

  // Debounced person search by name or username.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const h = setTimeout(() => void search({ variables: { searchUsersInput: { query: term, limit: 8, offset: 0 } } }), 300);
    return () => clearTimeout(h);
  }, [q, search]);

  const staffIds = new Set(staff.map((s) => s.userId));
  const results = q.trim().length >= 2 ? (found?.searchUsers?.profiles ?? []).filter((p) => !staffIds.has(p.userId)) : [];

  const doAdd = async (c: Candidate) => {
    try {
      const res = await add({ variables: { eventId, userId: c.userId, role } });
      if (!res.data?.addEventStaff || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(t('added'));
      setQ('');
      await staffQ.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  const doRemove = async () => {
    if (!toRemove) return;
    try {
      const res = await remove({ variables: { eventId, userId: toRemove.userId } });
      if (!res.data?.removeEventStaff || hasErrors(res)) return reportRefusal(res, tErr);
      toast.success(t('removed'));
      setToRemove(null);
      await staffQ.refetch();
    } catch (e) {
      reportRefusal(e, tErr);
    }
  };

  const personName = (s: EventStaffMember) => s.displayName || (s.username ? `@${s.username}` : t('unknownPerson'));

  return (
    <div className="space-y-4" data-testid="manage-staff">
      <p className="text-sm text-text-secondary">{t('intro')}</p>
      <ul className="space-y-1 text-xs text-text-secondary">
        {ROLES.map((r) => <li key={r}><span className="font-medium text-text-primary">{t(`roles.${r}`)}</span> — {t(`roleHelp.${r}`)}</li>)}
      </ul>

      <section className="space-y-3 rounded-2xl border border-border-subtle p-4" aria-labelledby="staff-add">
        <h2 id="staff-add" className="font-semibold text-text-primary">{t('addTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Field id="staff-search" label={t('search')}>
            <input id="staff-search" type="search" className={inputClass} placeholder={t('searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          </Field>
          <Field id="staff-role" label={t('role')}>
            <select id="staff-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value as EventStaffRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </Field>
        </div>
        {q.trim().length >= 2 && (
          results.length === 0 ? (
            <p className="text-sm text-text-secondary">{searching ? t('searching') : t('noResults')}</p>
          ) : (
            <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle" data-testid="staff-results">
              {results.map((c) => (
                <li key={c.userId} className="flex items-center justify-between gap-3 p-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ImageWithFallback src={c.avatarUrl} alt="" className="size-9 shrink-0 rounded-full bg-surface-subtle object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{[c.firstName, c.lastName].filter(Boolean).join(' ') || t('unknownPerson')}</p>
                      {c.headline && <p className="truncate text-xs text-text-secondary">{c.headline}</p>}
                    </div>
                  </div>
                  <ButtonType2 onClick={() => doAdd(c)} disabled={adding}>{t('add')}</ButtonType2>
                </li>
              ))}
            </ul>
          )
        )}
      </section>

      {staff.length === 0 ? (
        <EmptyNote>{t('empty')}</EmptyNote>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle" data-testid="staff-list">
          {staff.map((s) => (
            <li key={s.userId} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <ImageWithFallback src={s.avatarUrl} alt="" className="size-9 shrink-0 rounded-full bg-surface-subtle object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{personName(s)}</p>
                  <p className="text-xs text-text-secondary">{t(`roles.${s.role}`)}</p>
                </div>
              </div>
              <ButtonType3 onClick={() => setToRemove(s)} className="flex items-center gap-1 text-text-danger"><Trash2 className="size-4" aria-hidden />{tc('remove')}</ButtonType3>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal open={!!toRemove} onCancel={() => setToRemove(null)} onConfirm={doRemove} title={t('removeTitle')} description={t('removeBody', { name: toRemove ? personName(toRemove) : '' })} confirmText={tc('remove')} cancelText={tc('cancel')} confirmVariant="destructive" isLoading={removing} />
    </div>
  );
}
