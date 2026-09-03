'use client';

import { useState, type ReactNode } from 'react';
import { Flag, Gavel, Hammer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Countdown } from '@/components/circles/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import type { CircleChallenge } from '@/services/gql/types/circles';

import { SidePanel } from './SidePanel';
import { useCircleLive } from './useCircleLive';
import { useDaysUntil } from './useDaysUntil';

/** Rows shown before "View all" is pressed. A rail is a summary, not an index. */
const COLLAPSED_ROWS = 3;

interface LiveRow {
  key: string;
  href: string;
  icon: ReactNode;
  title: string;
  meta: ReactNode;
}

export interface CircleLivePanelProps {
  circleId: string;
}

/**
 * "What's live" — the open votes, running projects and running challenges.
 *
 * ── WHY THIS IS NOT A SECOND COPY OF THE CONVERSATION ───────────────────────
 * The chat beside it shows every artefact in the order it was proposed,
 * including everything already decided. This rail answers the other question —
 * "is anything waiting on me right now?" — so it is filtered to live state and
 * ordered by urgency, and it never restates a closed motion.
 *
 * ── NO "VIEW ALL" DESTINATION EXISTS, SO IT DOES NOT NAVIGATE ───────────────
 * There is no combined artefacts index route: `/motions/[id]`,
 * `/projects/[id]` and `/challenges/[id]` are all per-artefact. "View all"
 * therefore expands this list in place, which is a real behaviour, rather than
 * linking somewhere that would have to be invented. It only appears when there
 * is genuinely more to show.
 */
export function CircleLivePanel({ circleId }: CircleLivePanelProps) {
  const t = useTranslations('circles');
  const tActions = useTranslations('actions');
  const [expanded, setExpanded] = useState(false);

  const live = useCircleLive(circleId);

  const rows: LiveRow[] = [];

  /*
   * Open votes collapse into ONE row carrying the count, because the thing a
   * member needs from a rail is "two votes are waiting", not two rows they must
   * count themselves. The link goes to whichever closes soonest — the one with
   * the least time left to act on.
   */
  if (live.openMotions.length > 0) {
    const target = live.nextClosingMotion ?? live.openMotions[0];
    rows.push({
      key: 'motions',
      href: `/circles/${circleId}/motions/${target.id}`,
      icon: <Gavel aria-hidden="true" />,
      title: t('home.live.openVotes', { count: live.openMotions.length }),
      meta: live.nextClosingMotion?.closesAt ? (
        /*
          `Countdown` interpolates its own `{days}` / `{hours}` / `{minutes}` as
          the clock ticks, but next-intl insists every placeholder in a message
          has a value — so each template is passed through `t()` with its own
          placeholders as their own values. Same pass-through as `MotionCard`.
        */
        <Countdown
          deadline={live.nextClosingMotion.closesAt}
          variant="relative"
          precision="compact"
          labels={{
            closesAt: t('home.cards.closes', { time: '{datetime}' }),
            daysHours: t('time.daysHoursLeft', { days: '{days}', hours: '{hours}' }),
            hoursMinutes: t('time.hoursMinutesLeft', {
              hours: '{hours}',
              minutes: '{minutes}',
            }),
            minutes: t('time.minutesLeft', { minutes: '{minutes}' }),
            ended: t('time.closed'),
          }}
        />
      ) : (
        // Open, but carrying no deadline to count down to. "Open" is the only
        // thing still true about it.
        t('motion.status.open')
      ),
    });
  }

  for (const project of live.activeProjects) {
    const percent =
      project.id === live.headlineProjectId ? live.headlineProjectPercent : null;
    rows.push({
      key: `project:${project.id}`,
      href: `/circles/${circleId}/projects/${project.id}`,
      icon: <Hammer aria-hidden="true" />,
      title: project.title,
      // A project whose progress has not resolved says "Project", never
      // "Project · 0% complete" — those are different claims.
      meta:
        percent === null
          ? t('home.live.projectMetaPlain')
          : t('home.live.projectMeta', { percent }),
    });
  }

  for (const challenge of live.activeChallenges) {
    rows.push({
      key: `challenge:${challenge.id}`,
      href: `/circles/${circleId}/challenges/${challenge.id}`,
      icon: <Flag aria-hidden="true" />,
      title: challenge.title,
      meta: <ChallengeMeta challenge={challenge} />,
    });
  }

  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const hasMore = rows.length > COLLAPSED_ROWS;

  return (
    <SidePanel title={t('home.live.title')}>
      {live.pending && rows.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        /*
         * A factual claim, so it waits for the queries above to answer. A
         * circle with nothing running is a normal, healthy state — not an
         * error, and not an empty illustration.
         */
        <p className="caption-small text-text-secondary">{t('home.live.empty')}</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {visible.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
                >
                  <span className="mt-0.5 shrink-0 text-text-secondary [&_svg]:size-4 [&_svg]:shrink-0">
                    {row.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="label-small block truncate text-text-primary">
                      {row.title}
                    </span>
                    <span className="caption-small block text-text-secondary">
                      {row.meta}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className="label-small mt-3 w-full cursor-pointer rounded-full border border-border-subtle py-1.5 text-text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
            >
              {expanded ? tActions('showLess') : t('home.live.viewAll')}
            </button>
          )}
        </>
      )}
    </SidePanel>
  );
}

/**
 * "Challenge · 6 days left".
 *
 * Its own component because the day count is read from the clock after mount
 * (see `useDaysUntil`) and a hook cannot be called inside the row loop.
 */
function ChallengeMeta({ challenge }: { challenge: CircleChallenge }) {
  const t = useTranslations('circles');
  const daysLeft = useDaysUntil(challenge.endsAt);

  if (daysLeft === null) return <>{t('home.live.challengeMetaPlain')}</>;
  if (daysLeft <= 0) return <>{t('home.live.challengeMetaEnded')}</>;
  return <>{t('home.live.challengeMeta', { days: daysLeft })}</>;
}
