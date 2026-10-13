'use client';

import { useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Globe, Lock, Plus, Search, UsersRound, X } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { PageHero } from '@/components/redesign/PageHero';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';
import { cn } from '@/lib/utils';
import { GET_MY_GROUPS, GROUPS_DIRECTORY, JOIN_GROUP, REQUEST_TO_JOIN_GROUP, type GetMyGroupsResponse } from '@/services/gql/groups';

// The create dialog lives with the chat; load it only when someone opens it.
const StartConversationModal = dynamic(() => import('@/components/chats/modals/StartConversationModal').then((m) => m.StartConversationModal), { ssr: false });

const PAGE_SIZE = 20;
const MY_GROUPS_SHOWN = 6;
/** Same variables as the create dialog's refetch, so a new group appears here by itself. */
const MY_GROUPS_VARS = { limit: 50, offset: 0 };
const SILENT = { context: { silentErrors: true } } as const;

type DirectoryGroup = { id: string; name: string; description?: string | null; privacy?: string | null; memberCount?: number | null; avatarUrl?: string | null };
type DirectoryData = { searchGroups?: { total?: number | null; groups?: DirectoryGroup[] | null } | null };
type Outcome = 'joined' | 'requested';

function GroupAvatar({ src, size = 'md' }: { src?: string | null; size?: 'sm' | 'md' }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, '/GLOBE.png');
  const px = size === 'sm' ? 36 : 48;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || '/GLOBE.png'} alt="" width={px} height={px} loading="lazy" onError={onError} className={cn('shrink-0 rounded-xl border border-border-subtle bg-surface-subtle object-cover', size === 'sm' ? 'size-9' : 'size-12')} />;
}

/**
 * `/groups`: your groups and group discovery. The search term lives in the URL
 * (`?q=`) so a search can be shared and the back button works. Browsing (no
 * search) lists only groups you are not in yet; a search lists every match and
 * marks the ones you already belong to.
 */
export function GroupsView() {
  const t = useTranslations('groupsPage');
  const tDetail = useTranslations('community.groups.detail');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const [draft, setDraft] = useState(query);
  const [showAllMine, setShowAllMine] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Record<string, Outcome>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: mineData, loading: mineLoading } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, { variables: MY_GROUPS_VARS, fetchPolicy: 'cache-and-network', ...SILENT });
  const { data, loading, error, fetchMore, refetch } = useQuery<DirectoryData>(GROUPS_DIRECTORY, {
    variables: { query, limit: PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: false,
    ...SILENT,
  });
  const [joinGroup] = useMutation<{ joinGroup?: { success?: boolean; message?: string } | null }>(JOIN_GROUP, { refetchQueries: [{ query: GET_MY_GROUPS, variables: MY_GROUPS_VARS }] });
  const [requestToJoin] = useMutation<{ requestToJoinGroup?: { success?: boolean; message?: string } | null }>(REQUEST_TO_JOIN_GROUP);

  const myGroups = useMemo(() => (mineData?.getMyGroups?.groups ?? []).filter((g) => g && g.id && g.name), [mineData]);
  const myIds = useMemo(() => new Set(myGroups.map((g) => g.id)), [myGroups]);
  const fetched = useMemo(() => (data?.searchGroups?.groups ?? []).filter((g): g is DirectoryGroup => !!g && !!g.id && !!g.name), [data]);
  const total = data?.searchGroups?.total ?? fetched.length;
  const hasMore = fetched.length < total;
  // Browsing hides groups you are already in (they are on the right); a search shows every match. A group joined on
  // this visit stays in place, marked, so the list does not jump under the pointer.
  const listed = useMemo(() => (query ? fetched : fetched.filter((g) => !myIds.has(g.id) || outcome[g.id])), [fetched, myIds, query, outcome]);
  // Until we know which groups are yours, don't offer to join any of them.
  const ready = !!mineData?.getMyGroups || !mineLoading;

  const setQuery = (next: string) => {
    const q = next.trim().slice(0, 100);
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuery(draft);
  };

  const act = async (g: DirectoryGroup) => {
    const isPrivate = g.privacy === 'PRIVATE';
    setBusy(g.id);
    try {
      const res = isPrivate ? await requestToJoin({ variables: { requestInput: { groupId: g.id } } }) : await joinGroup({ variables: { joinGroupId: g.id } });
      const payload = isPrivate
        ? (res.data as { requestToJoinGroup?: { success?: boolean } } | null | undefined)?.requestToJoinGroup
        : (res.data as { joinGroup?: { success?: boolean } } | null | undefined)?.joinGroup;
      if (payload?.success) {
        setOutcome((o) => ({ ...o, [g.id]: isPrivate ? 'requested' : 'joined' }));
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

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: { offset: fetched.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          const next = fetchMoreResult?.searchGroups;
          if (!next) return prev;
          const seen = new Set((prev.searchGroups?.groups ?? []).map((g) => g.id));
          return { searchGroups: { ...next, groups: [...(prev.searchGroups?.groups ?? []), ...(next.groups ?? []).filter((g) => !seen.has(g.id))] } };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const mineShown = showAllMine ? myGroups : myGroups.slice(0, MY_GROUPS_SHOWN);
  const button = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const renderAction = (g: DirectoryGroup) => {
    const state = outcome[g.id] ?? (myIds.has(g.id) ? 'joined' : null);
    if (state === 'joined') {
      return (
        <Link href={`/groups/${encodeURIComponent(g.id)}`} prefetch={false} className={`${button} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`}>
          {t('open')}
        </Link>
      );
    }
    if (state === 'requested') {
      return (
        <button type="button" disabled className={`${button} border border-border-subtle bg-surface-default text-text-secondary`}>
          {t('requested')}
        </button>
      );
    }
    const isPrivate = g.privacy === 'PRIVATE';
    return (
      <button type="button" onClick={() => act(g)} disabled={busy === g.id || !ready} aria-label={`${isPrivate ? t('requestToJoin') : t('join')}: ${g.name}`} className={`${button} ${isPrivate ? 'border border-text-brand text-text-brand hover:bg-surface-brand-light/40' : 'bg-surface-brand text-white hover:opacity-90'}`}>
        {busy === g.id ? <Spinner className="size-4" /> : isPrivate ? t('requestToJoin') : t('join')}
      </button>
    );
  };

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <PageHero id="groups-title" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} image={REDESIGN_IMAGES.connectCard} priority>
          <form role="search" onSubmit={onSubmit} className="flex max-w-xl items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
            <label htmlFor="groups-search" className="sr-only">
              {t('searchLabel')}
            </label>
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
            <input
              id="groups-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={100}
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
            />
            <button type="submit" className="shrink-0 rounded-full bg-surface-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
              {t('searchButton')}
            </button>
          </form>
        </PageHero>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Your groups: first on phones, the right rail on desktop. */}
          <aside aria-labelledby="groups-mine-title" data-testid="groups-mine" className="h-fit rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="groups-mine-title" className="text-base font-bold text-text-primary">
                {t('yourGroups')}
              </h2>
              {myGroups.length > 0 && <span className="text-xs text-text-secondary">{myGroups.length}</span>}
            </div>
            {mineLoading && !mineData ? (
              <div className="flex justify-center py-6">
                <Spinner className="size-5 text-text-brand" />
              </div>
            ) : myGroups.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">{t('yourGroupsEmpty')}</p>
            ) : (
              <ul className="-mx-2 mt-2 divide-y divide-border-subtle">
                {mineShown.map((g) => (
                  <li key={g.id}>
                    <Link href={`/groups/${encodeURIComponent(g.id)}`} prefetch={false} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand">
                      <GroupAvatar src={g.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{g.name}</span>
                        <span className="block truncate text-xs text-text-secondary">{t('members', { count: g.memberCount ?? 0 })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {myGroups.length > MY_GROUPS_SHOWN && (
              <button type="button" onClick={() => setShowAllMine((v) => !v)} className="mt-2 text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                {showAllMine ? t('showLess') : t('showAll', { count: myGroups.length })}
              </button>
            )}
            <div className="mt-4 border-t border-border-subtle pt-4">
              <button type="button" onClick={() => setCreateOpen(true)} className={`${button} w-full bg-surface-brand text-white hover:opacity-90`}>
                <Plus className="size-4" aria-hidden />
                {t('create')}
              </button>
              <p className="mt-2 text-xs text-text-secondary">{t('createHint')}</p>
            </div>
          </aside>

          {/* Discover: browse (groups you are not in yet) or search results. */}
          <section aria-labelledby="groups-discover-title" data-testid="groups-discover" className="min-w-0 rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:col-start-1 lg:row-start-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="groups-discover-title" className="text-lg font-bold text-text-primary">
                  {query ? t('resultsTitle', { query }) : t('discoverTitle')}
                </h2>
                {!query && <p className="mt-0.5 text-sm text-text-secondary">{t('discoverSubtitle')}</p>}
              </div>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    setQuery('');
                  }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                >
                  <X className="size-4" aria-hidden />
                  {t('clearSearch')}
                </button>
              )}
            </div>

            {loading && !data ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-6 text-text-brand" />
              </div>
            ) : error && !data ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-secondary">{t('loadFailed')}</p>
                <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium text-text-brand hover:underline">
                  {t('retry')}
                </button>
              </div>
            ) : listed.length === 0 ? (
              <div className="py-6">
                <EmptyState size="sm" icon={UsersRound} title={query ? t('noResults', { query }) : t('empty')} />
              </div>
            ) : (
              <ul className="-mx-2 mt-3 divide-y divide-border-subtle" aria-live="polite">
                {listed.map((g) => {
                  const isPrivate = g.privacy === 'PRIVATE';
                  return (
                    <li key={g.id} className="flex min-w-0 items-center gap-3 px-2 py-3">
                      <Link href={`/groups/${encodeURIComponent(g.id)}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                        <GroupAvatar src={g.avatarUrl} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-text-primary hover:underline">{g.name}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                            <span className="inline-flex items-center gap-1">
                              {isPrivate ? <Lock className="size-3" aria-hidden /> : <Globe className="size-3" aria-hidden />}
                              {isPrivate ? tDetail('private') : tDetail('public')}
                            </span>
                            <span aria-hidden>·</span>
                            <span>{t('members', { count: g.memberCount ?? 0 })}</span>
                          </span>
                          {g.description?.trim() && <span className="mt-1 line-clamp-1 block text-xs text-text-secondary">{g.description}</span>}
                        </span>
                      </Link>
                      {renderAction(g)}
                    </li>
                  );
                })}
              </ul>
            )}

            {hasMore && listed.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={loadMore} disabled={loadingMore} className={`${button} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`}>
                  {loadingMore ? <Spinner className="size-4" /> : t('loadMore')}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {createOpen && <StartConversationModal isOpen={createOpen} onOpenChange={setCreateOpen} type="group" />}
    </div>
  );
}
