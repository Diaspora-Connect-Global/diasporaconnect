'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, Bookmark, Star, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Chip, PersonAvatar, SectionCard, TierBadge, focusRing } from './primitives';
import { ChipRow, ReasonLines } from './PersonParts';
import { NetworkingHeader, NetworkingTabs, type NetworkingEventContext } from './NetworkingShell';
import { sharedCodes } from '@/lib/networkingReasons';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingPerson, ProfileFields } from '@/services/gql/networking';

/** One identical screen for every "you cannot see this person" case: missing, hidden, blocked, ineligible. */
export function PersonNotFound({ eventId }: { eventId: string }) {
  const t = useTranslations('networking.person');
  return (
    <section data-testid="person-not-found" className="mx-auto max-w-xl rounded-2xl border border-border-subtle bg-surface-default p-8 text-center">
      <h1 className="text-xl font-semibold text-text-primary">{t('notFoundTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('notFoundBody')}</p>
      <Link href={`/events/${eventId}/networking?tab=people`} className={`mt-5 inline-flex min-h-11 items-center rounded-full border border-border-brand px-6 text-sm font-medium text-text-brand ${focusRing}`}>{t('backToPeople')}</Link>
    </section>
  );
}

export default function PersonView({
  event,
  features,
  person,
  me,
  labelOf,
  busy,
  onPass,
  onSkip,
  onInterested,
}: {
  event: NetworkingEventContext;
  features: { interests: boolean; circles: boolean };
  person: NetworkingPerson;
  me: ProfileFields | null;
  labelOf: LabelFn;
  busy?: boolean;
  onPass: () => void;
  onSkip: () => void;
  onInterested?: () => void;
}) {
  const t = useTranslations('networking.person');
  const ta = useTranslations('networking.actions');
  const big = `inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 text-base font-semibold disabled:opacity-50 ${focusRing}`;
  const groups: Array<[string, string[]]> = [
    ['roles', person.roles],
    ['interests', person.interests],
    ['industries', person.industries],
    ['markets', person.markets],
    ['languages', person.languages],
  ];
  return (
    <>
      <NetworkingHeader event={event} />
      <NetworkingTabs eventId={event.id} active="people" interests={features.interests} circles={features.circles} />
      <Link href={`/events/${event.id}/networking?tab=people`} className={`inline-flex min-h-6 items-center gap-2 text-sm font-medium text-text-primary hover:text-text-brand ${focusRing}`}><ArrowLeft className="size-4" aria-hidden />{t('backToPeople')}</Link>
      <article data-testid="person-view" className="rounded-2xl border border-border-subtle bg-surface-default p-5 sm:p-7">
        <div className="flex flex-wrap items-start gap-5">
          <PersonAvatar name={person.displayName} url={person.avatarUrl} className="size-24 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-text-primary">{person.displayName}</h1>
            <p className="text-sm text-muted-foreground">{[person.headline, person.organization].filter(Boolean).join(' · ')}</p>
            {person.locationLabel && <p className="mt-1 text-xs text-muted-foreground">{person.locationLabel}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <TierBadge tier={person.tier} mutualFit={person.mutualFit} />
              {person.connectionStatus === 'CONNECTED' && <Chip tone="success">{t('previouslyConnected')}</Chip>}
              {person.attendanceFormat && <Chip>{ta(`format.${person.attendanceFormat}`)}</Chip>}
            </div>
          </div>
        </div>

        {person.intro && <p className="mt-5 whitespace-pre-wrap text-sm text-text-primary">{person.intro}</p>}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div><h2 className="mb-1 text-sm font-semibold text-text-primary">{ta('lookingFor')}</h2><ChipRow codes={person.needs} labelOf={labelOf} max={12} tone="brand" />{person.needsNote && <p className="mt-2 text-sm text-muted-foreground">{person.needsNote}</p>}</div>
          <div><h2 className="mb-1 text-sm font-semibold text-text-primary">{ta('canOffer')}</h2><ChipRow codes={person.offers} labelOf={labelOf} max={12} tone="brand" />{person.offersNote && <p className="mt-2 text-sm text-muted-foreground">{person.offersNote}</p>}</div>
        </div>

        {(person.reasons?.length ?? 0) > 0 && (
          <div className="mt-5"><h2 className="mb-1 text-sm font-semibold text-text-primary">{t('whyYouMatch')}</h2><ReasonLines card={person} me={me} labelOf={labelOf} limit={5} /></div>
        )}
        {sharedCodes(person, me).length > 0 && (
          <div className="mt-5"><h2 className="mb-1 text-sm font-semibold text-text-primary">{t('shared')}</h2><ChipRow codes={sharedCodes(person, me)} labelOf={labelOf} max={10} /></div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {groups.filter(([, l]) => l.length > 0).map(([k, l]) => (
            <SectionCard key={k} title={t(`group.${k}`)} id={`group-${k}`} className="!p-3 sm:!p-4"><ChipRow codes={l} labelOf={labelOf} max={12} /></SectionCard>
          ))}
        </div>

        {!person.isSelf && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row" data-testid="person-actions">
            <button type="button" disabled={busy} onClick={onPass} className={`${big} border-border-danger text-text-danger hover:bg-surface-danger`}><X className="size-5" aria-hidden />{ta('pass')}</button>
            <button type="button" disabled={busy} onClick={onSkip} className={`${big} border-border-subtle text-text-primary hover:bg-surface-subtle`}><Bookmark className="size-5" aria-hidden />{ta('skipLong')}</button>
            {onInterested && <button type="button" disabled={busy} onClick={onInterested} className={`${big} border-border-brand bg-surface-brand text-text-white`}><Star className="size-5" aria-hidden />{ta('interested')}</button>}
          </div>
        )}
      </article>
    </>
  );
}
