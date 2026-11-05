'use client';

import { useQuery } from '@apollo/client/react';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CircleAvatar } from '@/components/circles/index';
import { Link, usePathname } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { CIRCLE, CIRCLE_CHAT } from '@/services/gql/circles';
import type { Circle, CircleChat } from '@/services/gql/types/circles';

import { CircleSectionNav } from './CircleSectionNav';
import { CircleStartMenu } from './CircleStartMenu';
import { isCircleHomePath } from './circleSections';

/**
 * The header every circle screen except its home shares: who this circle is, a
 * way back to its home, the start menu and the section navigation.
 *
 * It reads `circle` and `circleChat`, the same two queries the home screen runs,
 * with `cache-first`: arriving from the home (the normal way in) costs no
 * request. A deep link runs each once. The circle's name is NOT a heading here;
 * each screen owns its single `h1`.
 *
 * Renders nothing on the home path (the hero is drawn there from the data the
 * home already holds) and nothing while the circle is unknown to the viewer
 * (a stranger, an archived circle): the screens carry their own landing or
 * error state, and a header naming a circle the viewer cannot open would be
 * wrong.
 */
export function CircleCompactHeader({ circleId }: { circleId: string }) {
  const t = useTranslations('circles');
  const pathname = usePathname();
  const home = isCircleHomePath(pathname, circleId);

  const { data } = useQuery<{ circle?: Circle | null }>(CIRCLE, {
    variables: { circleId },
    skip: home,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const { data: chatData } = useQuery<{ circleChat?: CircleChat | null }>(CIRCLE_CHAT, {
    variables: { circleId },
    skip: home,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const circle = data?.circle ?? null;
  if (home || !circle) return null;
  const chatOn = Boolean(chatData?.circleChat?.available);

  return (
    <header className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link
          href={`/circles/${circleId}`}
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <CircleAvatar name={circle.name} src={toCdnUrl(circle.avatarUrl)} className="size-11 text-base font-bold" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-text-primary">{circle.name}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Users aria-hidden="true" className="size-3.5" />
              {t('common.memberCount', { count: circle.memberCount })}
            </span>
          </span>
        </Link>
        <CircleStartMenu circleId={circleId} />
      </div>
      <CircleSectionNav circleId={circleId} chatOn={chatOn} />
    </header>
  );
}
