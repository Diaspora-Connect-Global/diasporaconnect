'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LIST_MY_JOINED_COMMUNITIES } from '@/services/gql/community';
import { GET_USER_ASSOCIATIONS } from '@/services/gql/associations';
import { GET_MY_PENDING_REQUESTS, type MyPendingRequestsData } from '@/services/gql/requests';
import { useUserStore } from '@/store/useUserStore';
import { useGroupsToJoin, type GroupRow } from '@/components/community/redesign/useGroupsToJoin';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';

const WIDE = '(min-width: 1280px)';
const SHOWN_COMMUNITIES = 5;
const SHOWN_GROUPS = 4;
const SILENT = { context: { silentErrors: true } } as const;

type Joined = { id: string; name: string; avatarUrl?: string | null; href: string; memberCount?: number | null };

/** True from 1280 px up. The column renders nothing below that, so it also costs no queries on narrower screens. */
function useIsWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

function Avatar({ src, fallback }: { src?: string | null; fallback: string }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, fallback);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || fallback} alt="" width={40} height={40} loading="lazy" onError={onError} className="size-10 shrink-0 rounded-full border border-border-subtle object-cover" />;
}

const cardCls = 'rounded-2xl border border-border-subtle bg-surface-default p-3 shadow-sm';
const linkFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

function Members({ count, label }: { count?: number | null; label: string }) {
  return typeof count === 'number' ? <span className="block truncate text-xs text-muted-foreground">{label}</span> : null;
}

function CommunitiesCard() {
  const t = useTranslations('homeLeft');
  const tGroups = useTranslations('communityPage.groups');
  const userId = useUserStore((s) => s.user?.userId);
  const { data: communitiesData } = useQuery<{ listUserCommunities?: { id: string; name: string; avatarUrl?: string | null }[] | null }>(LIST_MY_JOINED_COMMUNITIES, { fetchPolicy: 'cache-and-network', ...SILENT });
  const { data: associationsData } = useQuery<{ getUserAssociations?: { id: string; name: string; avatarUrl?: string | null; memberCount?: number | null }[] | null }>(GET_USER_ASSOCIATIONS, { variables: { userId: userId! }, skip: !userId, fetchPolicy: 'cache-and-network', ...SILENT });
  const { data: pendingData } = useQuery<MyPendingRequestsData>(GET_MY_PENDING_REQUESTS, { fetchPolicy: 'cache-and-network', ...SILENT });

  const rows = useMemo<Joined[]>(() => {
    // A request that is still pending is not a membership.
    const pending = new Set((pendingData?.getMyPendingRequests ?? []).map((r) => r.entityId));
    const communities = (communitiesData?.listUserCommunities ?? []).filter((c) => c && c.id && c.name && !pending.has(c.id)).map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl, href: `/community/${encodeURIComponent(c.id)}` }));
    const associations = (associationsData?.getUserAssociations ?? []).filter((a) => a && a.id && a.name && !pending.has(a.id)).map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl, memberCount: a.memberCount, href: `/association/${encodeURIComponent(a.id)}` }));
    return [...communities, ...associations].slice(0, SHOWN_COMMUNITIES);
  }, [communitiesData, associationsData, pendingData]);

  return (
    <section aria-labelledby="home-left-communities" data-testid="home-left-communities" className={cardCls}>
      <div className="flex items-center justify-between px-1 pb-1">
        <h2 id="home-left-communities" className="text-sm font-bold text-text-primary">{t('yourCommunities')}</h2>
        {rows.length > 0 && (
          <Link href="/community" prefetch={false} className={`text-xs font-medium text-text-brand hover:underline ${linkFocus}`}>{t('viewAll')}</Link>
        )}
      </div>
      {rows.length > 0 && (
        <ul>
          {rows.map((r) => (
            <li key={`${r.href}`}>
              <Link href={r.href} prefetch={false} className={`flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-surface-subtle ${linkFocus}`}>
                <Avatar src={r.avatarUrl} fallback="/GLOBE.png" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{r.name}</span>
                  <Members count={r.memberCount} label={tGroups('members', { count: r.memberCount ?? 0 })} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/community" prefetch={false} className={`mt-1 flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-medium text-text-brand hover:bg-surface-subtle ${linkFocus}`}>
        <Plus className="size-4" aria-hidden />
        {t('joinMore')}
      </Link>
    </section>
  );
}

function GroupRowItem({ g, busy, done, onAct }: { g: GroupRow; busy: boolean; done: boolean; onAct: (g: GroupRow) => void }) {
  const t = useTranslations('communityPage.groups');
  return (
    <li className="flex items-center gap-3 rounded-lg px-1 py-2">
      <Link href={`/groups/${encodeURIComponent(g.id)}`} prefetch={false} className={`flex min-w-0 flex-1 items-center gap-3 ${linkFocus}`}>
        <Avatar src={g.avatarUrl} fallback="/GLOBE.png" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-text-primary">{g.name}</span>
          <Members count={g.memberCount} label={t('members', { count: g.memberCount ?? 0 })} />
        </span>
      </Link>
      <button
        type="button"
        disabled={busy || done}
        onClick={() => onAct(g)}
        className="shrink-0 rounded-full border border-border-brand px-3 py-1 text-xs font-semibold text-text-brand transition-colors hover:bg-surface-subtle disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        {g.privacy === 'PRIVATE' ? t('requestShort') : t('join')}
      </button>
    </li>
  );
}

function GroupsCard() {
  const t = useTranslations('homeLeft');
  const { groups, busy, done, act } = useGroupsToJoin(SHOWN_GROUPS);
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby="home-left-groups" data-testid="home-left-groups" className={cardCls}>
      <div className="flex items-center justify-between px-1 pb-1">
        <h2 id="home-left-groups" className="text-sm font-bold text-text-primary">{t('featuredGroups')}</h2>
        <Link href="/groups" prefetch={false} className={`text-xs font-medium text-text-brand hover:underline ${linkFocus}`}>{t('viewAll')}</Link>
      </div>
      <ul>
        {groups.map((g) => (
          <GroupRowItem key={g.id} g={g} busy={busy === g.id} done={done.has(g.id)} onAct={act} />
        ))}
      </ul>
    </section>
  );
}

function ConnectCard() {
  const t = useTranslations('homeLeft');
  const img = REDESIGN_IMAGES.connectCard;
  return (
    <section aria-labelledby="home-left-connect" data-testid="home-left-connect" className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt="" width={img.width} height={img.height} loading="lazy" className="h-32 w-full object-cover" />
      <div className="p-4">
        <h2 id="home-left-connect" className="text-lg font-bold leading-snug text-text-primary">{t('connectTitle')}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{t('connectBody')}</p>
        <Link href="/community" prefetch={false} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
          {t('connectCta')}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/**
 * Home's left column (>= 1280 px only): the viewer's communities and
 * associations, groups they could join, and an invitation to explore. It
 * renders nothing on narrower screens — those reach the same places through the
 * top navigation and the Community page.
 */
export function HomeLeftColumn() {
  const t = useTranslations('homeLeft');
  const wide = useIsWide();
  if (!wide) return null;
  return (
    <aside aria-label={t('label')} data-testid="home-left-column" className="w-[16rem] shrink-0 space-y-4 overflow-y-auto scrollbar-hide py-4 pr-5">
      <CommunitiesCard />
      <GroupsCard />
      <ConnectCard />
    </aside>
  );
}
