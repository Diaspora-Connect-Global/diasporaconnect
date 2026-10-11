'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CalendarClock, Image as ImageIcon, MapPin, Send, Sparkles, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Chip, PersonAvatar, SectionCard, focusRing } from './primitives';
import { formatTimeInZone } from '@/lib/eventCalendar';
import type { CircleDetail, CircleMessage, CircleSummary } from '@/services/gql/networking';

/* Circles: discovery and room. Presentational only; the real routes feed them
   data once the circles backend exists (see networkingFeatures.ts). */

function CircleCard({ eventId, circle, onJoin, busy }: { eventId: string; circle: CircleSummary; onJoin?: (id: string) => void; busy?: boolean }) {
  const t = useTranslations('networking.circles');
  const full = circle.capacity != null && circle.memberCount >= circle.capacity;
  const joined = circle.myStatus === 'ACTIVE';
  const cta = joined ? t('open') : circle.myStatus === 'REQUESTED' ? t('requested') : circle.myStatus === 'WAITLISTED' ? t('waitlisted') : full ? t('waitlist') : circle.joinPolicy === 'APPROVAL' ? t('request') : t('join');
  return (
    <article data-testid="circle-card" className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-default">
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-surface-info to-surface-brand-light">
        {circle.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={circle.coverImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Users className="size-10 text-text-brand" aria-hidden />
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface-default/95 px-2.5 py-1 text-xs font-medium text-text-primary">
          <Users className="size-3" aria-hidden />
          {circle.capacity != null ? t('seats', { count: circle.memberCount, max: circle.capacity }) : t('members', { count: circle.memberCount })}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {circle.category && <Chip tone="brand" className="w-fit">{circle.category}</Chip>}
        <h3 className="text-base font-semibold text-text-primary">{circle.title}</h3>
        {circle.purpose && <p className="line-clamp-2 text-sm text-muted-foreground">{circle.purpose}</p>}
        {circle.hostName && (
          <p className="text-xs text-muted-foreground">{t('hostedBy')} <span className="font-medium text-text-primary">{circle.hostName}</span>{circle.hostHeadline ? ` · ${circle.hostHeadline}` : ''}</p>
        )}
        <ul className="space-y-1 text-xs text-muted-foreground">
          {circle.startsAt && <li className="flex items-center gap-1.5"><CalendarClock className="size-3.5" aria-hidden />{circle.startsAt}</li>}
          {(circle.format || circle.venue) && <li className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden />{[circle.format, circle.venue].filter(Boolean).join(' · ')}</li>}
        </ul>
        {circle.whyRecommended && (
          <div className="rounded-xl bg-surface-brand-subtle p-3 text-xs">
            <p className="flex items-center gap-1 font-semibold text-text-brand"><Sparkles className="size-3" aria-hidden />{t('whyThis')}</p>
            <p className="mt-1 text-muted-foreground">{circle.whyRecommended}</p>
          </div>
        )}
        <div className="mt-auto flex gap-2 pt-1">
          {joined ? (
            <Link href={`/events/${eventId}/networking/circles/${circle.id}`} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border-brand bg-surface-brand px-4 text-sm font-medium text-text-white ${focusRing}`}>{cta}</Link>
          ) : (
            <button type="button" disabled={busy || circle.joinPolicy === 'INVITE_ONLY' || circle.myStatus === 'REQUESTED' || circle.myStatus === 'WAITLISTED'} onClick={() => onJoin?.(circle.id)} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border-brand bg-surface-brand px-4 text-sm font-medium text-text-white disabled:opacity-50 ${focusRing}`}>{circle.joinPolicy === 'INVITE_ONLY' ? t('inviteOnly') : cta}</button>
          )}
          <Link href={`/events/${eventId}/networking/circles/${circle.id}`} className={`inline-flex min-h-11 items-center justify-center rounded-full border border-border-subtle px-4 text-sm font-medium text-text-primary ${focusRing}`}>{t('details')}</Link>
        </div>
      </div>
    </article>
  );
}

export function CirclesDiscovery({ eventId, circles, onJoin, busy, interestsLabels }: { eventId: string; circles: CircleSummary[]; onJoin?: (id: string) => void; busy?: boolean; interestsLabels?: string[] }) {
  const t = useTranslations('networking.circles');
  const [view, setView] = useState<'recommended' | 'mine' | 'all'>('recommended');
  const mine = circles.filter((c) => c.myStatus === 'ACTIVE');
  const recommended = circles.filter((c) => c.whyRecommended && c.myStatus !== 'ACTIVE');
  const shown = view === 'mine' ? mine : view === 'recommended' ? recommended : circles;
  return (
    <div data-testid="circles-discovery" className="space-y-5">
      <div role="tablist" aria-label={t('viewsLabel')} className="flex gap-1 border-b border-border-subtle">
        {(['recommended', 'mine', 'all'] as const).map((v) => (
          <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-11 border-b-2 px-4 text-sm font-medium ${view === v ? 'border-border-brand text-text-brand' : 'border-transparent text-muted-foreground'} ${focusRing}`}>{t(`view.${v}`)}</button>
        ))}
      </div>
      {view === 'recommended' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-brand-subtle p-4">
          <Sparkles className="size-5 text-text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary">{t('whyTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('whyBody')}</p>
          </div>
          {interestsLabels && interestsLabels.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">{interestsLabels.slice(0, 3).map((l) => <li key={l}><Chip tone="brand">{l}</Chip></li>)}</ul>
          )}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <li key={c.id}><CircleCard eventId={eventId} circle={c} onJoin={onJoin} busy={busy} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CircleRoom({
  eventId,
  circle,
  messages,
  onSend,
  onLeave,
  timeZone,
}: {
  eventId: string;
  circle: CircleDetail;
  messages: CircleMessage[];
  onSend?: (body: string) => Promise<void> | void;
  onLeave?: () => void;
  timeZone?: string | null;
}) {
  const t = useTranslations('networking.circles');
  const locale = useLocale();
  const [tab, setTab] = useState<'conversation' | 'members' | 'resources' | 'details'>('conversation');
  const [body, setBody] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBody('');
    await onSend?.(text);
  };
  const time = (iso: string) => {
    try { return formatTimeInZone(iso, locale, timeZone); } catch { return ''; }
  };
  return (
    <div data-testid="circle-room" className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-5 text-white sm:p-7">
        <Link href={`/events/${eventId}/networking?tab=circles`} className={`inline-flex min-h-6 items-center gap-2 text-sm font-medium text-white/90 hover:text-white ${focusRing}`}><ArrowLeft className="size-4" aria-hidden />{t('backToCircles')}</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            {circle.myStatus === 'ACTIVE' && <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold">{t('joined')}</span>}
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{circle.title}</h1>
            {circle.purpose && <p className="mt-1 text-sm text-white/85">{circle.purpose}</p>}
            <ul className="mt-3 flex flex-wrap gap-2">{circle.tags.map((tag) => <li key={tag} className="rounded-full bg-white/15 px-3 py-0.5 text-xs">{tag}</li>)}</ul>
          </div>
          <dl className="space-y-1 text-sm text-white/90">
            {circle.startsAt && <div className="flex items-center gap-2"><CalendarClock className="size-4" aria-hidden /><dd>{circle.startsAt}</dd></div>}
            {(circle.format || circle.venue) && <div className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /><dd>{[circle.format, circle.venue].filter(Boolean).join(' · ')}</dd></div>}
            <div className="flex items-center gap-2"><Users className="size-4" aria-hidden /><dd>{circle.capacity != null ? t('seats', { count: circle.memberCount, max: circle.capacity }) : t('members', { count: circle.memberCount })}</dd></div>
          </dl>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-2xl border border-border-subtle bg-surface-default">
          <div role="tablist" aria-label={t('roomTabs')} className="flex gap-1 overflow-x-auto border-b border-border-subtle px-2">
            {(['conversation', 'members', 'resources', 'details'] as const).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium ${tab === k ? 'border-border-brand text-text-brand' : 'border-transparent text-muted-foreground'} ${focusRing}`}>
                {k === 'members' ? t('tab.membersCount', { count: circle.members.length }) : t(`tab.${k}`)}
              </button>
            ))}
          </div>
          <div className="p-4" role="tabpanel">
            {tab === 'conversation' && (
              <div className="space-y-4">
                <p className="rounded-xl bg-surface-info p-3 text-sm text-muted-foreground">{t('welcome')}</p>
                <ol className="space-y-4" aria-live="polite" aria-label={t('conversation')}>
                  {messages.map((m) => (
                    <li key={m.id} className="flex gap-3">
                      <PersonAvatar name={m.authorName} url={m.authorAvatarUrl} className="size-10" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-text-primary">{m.authorName}</span>{m.isHost && <Chip tone="brand">{t('host')}</Chip>}<span className="text-xs text-muted-foreground">{time(m.sentAt)}</span></p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-primary">{m.body}</p>
                      </div>
                    </li>
                  ))}
                  {messages.length === 0 && <li className="text-sm text-muted-foreground">{t('noMessages')}</li>}
                </ol>
                <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 border-t border-border-subtle pt-3">
                  <label htmlFor="circle-msg" className="sr-only">{t('messageLabel')}</label>
                  <input id="circle-msg" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder={t('messagePlaceholder')} className="min-h-11 flex-1 rounded-full border-2 border-border-subtle bg-surface-subtle px-4 text-sm outline-none focus:border-border-brand" />
                  <button type="submit" disabled={!body.trim()} aria-label={t('send')} className={`inline-flex size-11 items-center justify-center rounded-full bg-surface-brand text-text-white disabled:opacity-50 ${focusRing}`}><Send className="size-4" aria-hidden /></button>
                </form>
                <p className="text-xs text-muted-foreground"><ImageIcon className="mr-1 inline size-3" aria-hidden />{t('noAttachments')}</p>
              </div>
            )}
            {tab === 'members' && (
              <ul className="divide-y divide-border-subtle">
                {circle.members.map((m) => (
                  <li key={m.handle} className="flex items-center gap-3 py-3">
                    <PersonAvatar name={m.displayName} url={m.avatarUrl} className="size-10" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-text-primary">{m.displayName}</p>{m.headline && <p className="text-xs text-muted-foreground">{m.headline}</p>}</div>
                    {m.isHost && <Chip tone="brand">{t('host')}</Chip>}{m.isMe && <Chip>{t('you')}</Chip>}
                  </li>
                ))}
              </ul>
            )}
            {tab === 'resources' && (
              circle.resources.length === 0 ? <p className="text-sm text-muted-foreground">{t('noResources')}</p> : (
                <ul className="divide-y divide-border-subtle">
                  {circle.resources.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-text-primary">{r.title}</span><span className="text-xs text-muted-foreground">{[r.kind, r.sizeLabel].filter(Boolean).join(' · ')}</span></li>
                  ))}
                </ul>
              )
            )}
            {tab === 'details' && (
              <div className="space-y-4 text-sm">
                {circle.agenda && <div><h3 className="font-semibold text-text-primary">{t('agenda')}</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{circle.agenda}</p></div>}
                {circle.focusAreas.length > 0 && <div><h3 className="font-semibold text-text-primary">{t('focusAreas')}</h3><ul className="mt-1 flex flex-wrap gap-2">{circle.focusAreas.map((f) => <li key={f}><Chip>{f}</Chip></li>)}</ul></div>}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <SectionCard title={t('inThisCircle')} id="in-circle">
            <p className="text-sm text-muted-foreground">{t('inThisCircleBody', { title: circle.title })}</p>
            {onLeave && (
              confirmLeave ? (
                <div className="mt-3 space-y-2" role="alertdialog" aria-label={t('leaveConfirmTitle')}>
                  <p className="text-sm font-medium text-text-primary">{t('leaveConfirmTitle')}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={onLeave} className={`min-h-9 rounded-full bg-surface-danger px-4 text-sm font-medium text-text-danger ${focusRing}`}>{t('leave')}</button>
                    <button type="button" onClick={() => setConfirmLeave(false)} className={`min-h-9 rounded-full border border-border-subtle px-4 text-sm ${focusRing}`}>{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmLeave(true)} className={`mt-3 min-h-9 rounded-full border border-border-brand px-4 text-sm font-medium text-text-brand ${focusRing}`}>{t('leave')}</button>
              )
            )}
          </SectionCard>
          <SectionCard title={t('tab.membersCount', { count: circle.members.length })} id="room-members">
            <ul className="space-y-2">
              {circle.members.slice(0, 8).map((m) => (
                <li key={m.handle} className="flex items-center gap-2"><PersonAvatar name={m.displayName} url={m.avatarUrl} className="size-8" /><span className="text-sm text-text-primary">{m.displayName}</span>{m.isHost && <Chip tone="brand">{t('host')}</Chip>}</li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
