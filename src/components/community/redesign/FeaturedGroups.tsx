'use client';

import { useTranslations } from 'next-intl';
import { UsersRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { useGroupsToJoin } from './useGroupsToJoin';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';

const SHOWN = 4;

function GroupAvatar({ src }: { src?: string | null }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, '/GLOBE.png');
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || '/GLOBE.png'} alt="" width={96} height={96} loading="lazy" onError={onError} className="size-16 rounded-full border border-border-subtle object-cover" />;
}

/**
 * Groups the viewer has not joined yet (everything the group search returns,
 * minus their own groups). Public groups join in one tap; private ones send a
 * request. Hidden when there is nothing to join.
 */
export function FeaturedGroups() {
  const t = useTranslations('communityPage.groups');
  const tAll = useTranslations('redesign');
  const { groups, busy, done, requested, act } = useGroupsToJoin(SHOWN);

  if (groups.length === 0) return null;

  return (
    <Section labelledBy="community-groups-title" testId="community-groups">
      <SectionHeader id="community-groups-title" title={t('title')} subtitle={t('subtitle')} href="/groups" viewAllLabel={tAll('viewAll')} />
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {groups.map((g) => (
          <li key={g.id} className="min-w-0">
            <div className="flex h-full flex-col items-center gap-2 rounded-xl border border-border-subtle p-3 text-center">
              <Link href={`/groups/${encodeURIComponent(g.id)}`} prefetch={false} className="flex min-w-0 flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                <GroupAvatar src={g.avatarUrl} />
                <span className="line-clamp-2 text-sm font-semibold text-text-primary">{g.name}</span>
              </Link>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <UsersRound className="size-3.5" aria-hidden />
                {t('members', { count: g.memberCount ?? 0 })}
              </span>
              {g.description && <p className="line-clamp-2 text-xs text-muted-foreground">{g.description}</p>}
              <button
                type="button"
                disabled={busy === g.id || done.has(g.id) || requested.has(g.id)}
                onClick={() => act(g)}
                className="mt-auto w-full rounded-full bg-surface-brand px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
              >
                {requested.has(g.id) ? t('requested') : g.privacy === 'PRIVATE' ? t('request') : t('join')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
