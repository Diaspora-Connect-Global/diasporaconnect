'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { RailCard } from '@/components/redesign/RailCard';
import { useImageFallback } from '@/components/ui/ImageWithFallback';

export interface JoinableCommunity {
  id: string;
  name: string;
  avatarUrl?: string | null;
  memberCount?: number | null;
}

const MAX_SHOWN = 5;

function CommunityAvatar({ src }: { src?: string | null }) {
  const { src: resolved, onError } = useImageFallback(src ?? undefined, '/GLOBE.png');
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || '/GLOBE.png'} alt="" width={40} height={40} loading="lazy" onError={onError} className="size-10 shrink-0 rounded-full border border-border-subtle object-cover" />;
}

/**
 * Right-rail list of communities the viewer can join (it used to be a grid in
 * the middle column). Joining goes through the page's own handler, so the
 * confirmation, approval and payment flows are unchanged. Renders nothing when
 * there is nothing to join.
 */
export function CommunitiesToJoin({
  communities,
  onJoin,
}: {
  communities: JoinableCommunity[];
  onJoin: (community: JoinableCommunity) => void;
}) {
  const t = useTranslations('communityPage');
  const tActions = useTranslations('actions');
  const tJoinModal = useTranslations('home.joinModal');
  const shown = communities.slice(0, MAX_SHOWN);
  if (shown.length === 0) return null;
  return (
    <RailCard id="community-join-title" title={t('more.title')} testId="community-join">
      <ul className="mt-2 space-y-2">
        {shown.map((c) => {
          const members = c.memberCount ?? 0;
          return (
            <li key={c.id} className="flex items-center gap-3">
              <Link href={`/community/${encodeURIComponent(c.id)}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                <CommunityAvatar src={c.avatarUrl} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-primary">{c.name}</span>
                  {members > 0 && (
                    <span className="block truncate text-xs text-text-secondary">
                      {members === 1 ? tJoinModal('membersOne') : tJoinModal('membersOther', { count: members })}
                    </span>
                  )}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => onJoin(c)}
                aria-label={`${tActions('join')}: ${c.name}`}
                className="min-h-8 shrink-0 rounded-full border border-text-brand px-3 py-1 text-xs font-semibold text-text-brand hover:bg-surface-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
              >
                {tActions('join')}
              </button>
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}
