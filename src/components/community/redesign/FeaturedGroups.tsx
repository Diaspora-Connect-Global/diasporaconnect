'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { JOIN_GROUP, REQUEST_TO_JOIN_GROUP, GET_MY_GROUPS } from '@/services/gql/groups';
import { REDESIGN_GROUPS_TO_JOIN, REDESIGN_MY_GROUP_IDS } from '@/services/gql/redesign';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';

type GroupRow = { id: string; name: string; description?: string | null; privacy?: string | null; memberCount?: number | null; avatarUrl?: string | null };
const SILENT = { context: { silentErrors: true } } as const;
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
  const { data: all } = useQuery<{ searchGroups?: { groups?: GroupRow[] | null } | null }>(REDESIGN_GROUPS_TO_JOIN, { variables: { query: '', limit: 24, offset: 0 }, fetchPolicy: 'cache-and-network', ...SILENT });
  const { data: mine } = useQuery<{ getMyGroups?: { groups?: { id: string }[] | null } | null }>(REDESIGN_MY_GROUP_IDS, { variables: { limit: 100, offset: 0 }, fetchPolicy: 'cache-and-network', ...SILENT });
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [joinGroup] = useMutation<{ joinGroup?: { success?: boolean; message?: string } | null }>(JOIN_GROUP, { refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 50, offset: 0 } }, { query: REDESIGN_MY_GROUP_IDS, variables: { limit: 100, offset: 0 } }] });
  const [requestToJoin] = useMutation<{ requestToJoinGroup?: { success?: boolean; message?: string } | null }>(REQUEST_TO_JOIN_GROUP);

  const groups = useMemo(() => {
    // Until we know what the viewer already belongs to, show nothing rather than groups they may be in.
    if (!mine?.getMyGroups) return [];
    const joined = new Set((mine.getMyGroups.groups ?? []).filter(Boolean).map((g) => g.id));
    return (all?.searchGroups?.groups ?? []).filter((g) => g && g.id && g.name && !joined.has(g.id)).slice(0, SHOWN);
  }, [all, mine]);

  if (groups.length === 0) return null;

  const act = async (g: GroupRow) => {
    const isPrivate = g.privacy === 'PRIVATE';
    setBusy(g.id);
    try {
      const res = isPrivate ? await requestToJoin({ variables: { requestInput: { groupId: g.id } } }) : await joinGroup({ variables: { joinGroupId: g.id } });
      const payload = isPrivate ? (res.data as { requestToJoinGroup?: { success?: boolean } } | null | undefined)?.requestToJoinGroup : (res.data as { joinGroup?: { success?: boolean } } | null | undefined)?.joinGroup;
      if (payload?.success) {
        setDone((p) => new Set(p).add(g.id));
        toast.success(isPrivate ? t('requestedToast') : t('joinedToast'));
      } else {
        toast.error(t('failedToast'));
      }
    } catch {
      toast.error(t('failedToast'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section labelledBy="community-groups-title" testId="community-groups">
      <SectionHeader id="community-groups-title" title={t('title')} subtitle={t('subtitle')} href="/search" viewAllLabel={tAll('viewAll')} />
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
                disabled={busy === g.id || done.has(g.id)}
                onClick={() => act(g)}
                className="mt-auto w-full rounded-full bg-surface-brand px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
              >
                {g.privacy === 'PRIVATE' ? t('request') : t('join')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
