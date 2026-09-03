'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

import { StatusPill, type StatusPillVariant } from '@/components/circles/primitives';
import { EmptyState } from '@/components/feedback';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';
import type {
  CircleChallengeEntry,
  CircleEntryVerificationState,
} from '@/services/gql/types/circles';

/**
 * States worth a badge, and how each reads.
 *
 * ACCEPTED is deliberately absent. Under HONOUR every entry is born ACCEPTED,
 * so badging it would put a green chip on every row in the list and mean
 * nothing; under LEAD or CIRCLE the interesting fact is which entries are still
 * WAITING on someone. A row with no badge counted — that is the quiet default.
 */
const ENTRY_STATE_PILL: Readonly<
  Partial<Record<CircleEntryVerificationState, { variant: StatusPillVariant; label: string }>>
> = {
  PENDING: { variant: 'warning', label: 'entryState.pending' },
  REJECTED: { variant: 'neutral', label: 'entryState.rejected' },
  DISPUTED: { variant: 'danger', label: 'entryState.disputed' },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface ChallengeActivityProps {
  entries: readonly CircleChallengeEntry[];
  /** Resolved identities from `useCircleUsers` — rows render regardless. */
  usersById: Record<string, CircleUser>;
  /** Id of the signed-in viewer, so their own rows read "You". */
  currentUserId?: string | null;
  loading?: boolean;
  /** Rows shown before the list stops. */
  max?: number;
}

/**
 * What people have actually been doing — the newest entries, in their own words.
 *
 * Rows are ENTRIES, not people: on a weekly challenge the same member appears
 * once a week, and collapsing them to one row per person would hide the very
 * thing this section exists to show. That is also why the participant count
 * above it counts DISTINCT users instead of reusing this list's length.
 *
 * Sorted here rather than trusting the query: `circleChallengeEntries` states
 * no ordering contract, and "recent activity" that is not newest-first is worse
 * than no section at all.
 */
export function ChallengeActivity({
  entries,
  usersById,
  currentUserId,
  loading = false,
  max = 8,
}: ChallengeActivityProps) {
  const t = useTranslations('circles.challenge');
  const tCommon = useTranslations('circles.common');
  const locale = useLocale();

  const recent = useMemo(() => {
    const time = (entry: CircleChallengeEntry) => {
      const iso = entry.submittedAt;
      if (!iso) return 0;
      const parsed = new Date(iso).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    return [...entries].sort((a, b) => time(b) - time(a)).slice(0, max);
  }, [entries, max]);

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [locale],
  );

  const body = () => {
    if (loading && recent.length === 0) {
      return (
        <ul className="divide-y divide-border-subtle">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      );
    }

    if (recent.length === 0) {
      return (
        <EmptyState
          size="sm"
          title={t('activityEmpty.title')}
          description={t('activityEmpty.description')}
        />
      );
    }

    return (
      <ul className="divide-y divide-border-subtle">
        {recent.map((entry) => {
          const isMe = Boolean(currentUserId) && entry.userId === currentUserId;
          const user = usersById[entry.userId];
          // An unresolved profile still gets a row: dropping the person would
          // silently shorten a feed that is supposed to account for everything.
          const name = isMe
            ? tCommon('you')
            : circleUserDisplayName(user, tCommon('loading'));

          /*
           * The member's own words come first. Failing that, whatever number
           * they claimed; failing that, the bare fact that they logged
           * something — an entry with neither a note nor a value is still real
           * activity, and dropping it would make the feed lie about the count
           * above it.
           */
          const note = entry.note?.trim() ?? '';
          const claim = entry.claimValue?.trim() ?? '';
          const update = note
            ? note
            : claim
              ? t('activityLoggedValue', { value: claim })
              : t('activityLogged');

          const submitted = entry.submittedAt ? new Date(entry.submittedAt) : null;
          const when =
            submitted && !Number.isNaN(submitted.getTime())
              ? dateFormat.format(submitted)
              : '';

          const pill = ENTRY_STATE_PILL[entry.verificationState];

          return (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <Avatar className="size-9 shrink-0 border border-border-subtle">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="caption-small bg-surface-subtle text-text-primary">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="label-small truncate text-text-primary">{name}</p>
                <p className="body-small mt-0.5 whitespace-pre-line text-text-secondary">
                  {update}
                </p>

                {entry.evidenceUrl && (
                  <a
                    href={entry.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="caption-small mt-1 inline-flex items-center gap-1 text-text-brand underline-offset-2 hover:underline"
                  >
                    <ExternalLink aria-hidden="true" className="size-3" />
                    {t('activityEvidence')}
                  </a>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {when && <span className="caption-small text-text-secondary">{when}</span>}
                {pill && <StatusPill variant={pill.variant} label={t(pill.label)} />}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="mt-8">
      <h2 className="label-medium text-text-primary">{t('activityTitle')}</h2>
      <div className="mt-1">{body()}</div>
    </section>
  );
}
