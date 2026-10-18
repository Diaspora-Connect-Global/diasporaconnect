'use client';

import { useCountryName } from '@/lib/countryName';
import { useCallback, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Search, Users, X } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { FriendActionButtons, type FriendButtonType } from '@/components/friends/FriendActionButtons';
import { useUserStore } from '@/store/useUserStore';
import { GET_ALL_PENDING_CONNECTIONS, GET_MY_CONNECTIONS, SEARCH_USERS } from '@/services/gql/connection';
import { RECOMMENDED_PEOPLE } from '@/services/gql/postsFeed';
import { displayName } from '@/lib/displayName';
import { profileUrl } from '@/lib/profileUrl';
import { toCdnUrl } from '@/lib/cdn';

const SILENT = { context: { silentErrors: true } } as const;
const SUGGESTIONS = 24;
const SEARCH_PAGE = 20;
const FRIENDS_PAGE = 50;
const PENDING_LIMIT = 100;
const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-|^[0-9a-f]{16,}$/i;

export const FRIENDS_TABS = ['discover', 'requests', 'sent', 'friends'] as const;
export type FriendsTab = (typeof FRIENDS_TABS)[number];
/** Old `?t=` numbers of the retired modal, so bookmarked links still land on the right tab. */
export const LEGACY_TAB_NUMBERS: Record<string, FriendsTab> = { '1': 'friends', '2': 'discover', '3': 'requests', '4': 'sent' };

type Status = 'none' | 'pending_sent' | 'pending_received' | 'connected';
type Person = {
  userId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  occupation?: string | null;
  sector?: string | null;
  location?: string | null;
  country?: string | null;
  residenceCountry?: string | null;
  countryOfOrigin?: string | null;
  connectionStatus?: string | null;
  connectionId?: string | null;
  isVerified?: boolean | null;
};
type Connection = { id: string; requesterId: string; receiverId: string; requester?: Person | null; receiver?: Person | null };
type Suggestion = { profile?: Person | null; sharedCommunityCount?: number | null; sharedCommunityNames?: string[] | null; mutualConnectionCount?: number | null };
type FriendsData = { getConnections?: { total?: number | null; connections?: Connection[] | null } | null };
type PendingData = { getPendingConnections?: { connections?: Connection[] | null } | null };
type SuggestionsData = { recommendedPeople?: { items?: Suggestion[] | null } | null };
type SearchData = { searchUsers?: { hasMore?: boolean | null; profiles?: Person[] | null } | null };
type Row = { person: Person; connectionId: string; status: Status; reason?: string };

function normaliseStatus(raw?: string | null): Status {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'connected' || s === 'accepted') return 'connected';
  if (s === 'pending_sent' || s === 'pending') return 'pending_sent';
  if (s === 'pending_received') return 'pending_received';
  return 'none';
}

export function parseTab(tab: string | null, legacy: string | null): FriendsTab {
  if (tab && (FRIENDS_TABS as readonly string[]).includes(tab)) return tab as FriendsTab;
  if (!tab && legacy && LEGACY_TAB_NUMBERS[legacy]) return LEGACY_TAB_NUMBERS[legacy];
  return 'discover';
}

function Avatar({ src }: { src?: string | null }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, '/PROFILE.png');
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || '/PROFILE.png'} alt="" width={48} height={48} loading="lazy" onError={onError} className="size-12 shrink-0 rounded-full border border-border-subtle object-cover" />;
}

/**
 * `/friends`: Discover, Requests, Sent and Friends as one page. Each tab is a plain divided list
 * of people. Every list comes from the existing queries (recommended people / people search,
 * pending connections, my connections); the actions are the existing connection actions. The
 * friends and requests lists are always the signed-in user's own (the gateway scopes them to
 * the token), so nobody else's friends can appear here.
 */
export function FriendsView() {
  const t = useTranslations('friendsPage');
  const tIdentity = useTranslations('common.identity');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get('tab'), searchParams.get('t'));
  const query = tab === 'discover' ? (searchParams.get('q') ?? '').trim().slice(0, 100) : '';
  const me = useUserStore((s) => s.user?.userId);
  const countryName = useCountryName();

  const [draft, setDraft] = useState(query);
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [requested, setRequested] = useState<ReadonlySet<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const tabRefs = useRef<Partial<Record<FriendsTab, HTMLButtonElement | null>>>({});

  // Friends and pending are always loaded: the tab labels carry their counts.
  const friends = useQuery<FriendsData>(GET_MY_CONNECTIONS, { variables: { limit: FRIENDS_PAGE, offset: 0 }, fetchPolicy: 'cache-and-network', ...SILENT });
  const pending = useQuery<PendingData>(GET_ALL_PENDING_CONNECTIONS, { variables: { limit: PENDING_LIMIT, offset: 0 }, fetchPolicy: 'cache-and-network', ...SILENT });
  const suggestions = useQuery<SuggestionsData>(RECOMMENDED_PEOPLE, { variables: { limit: SUGGESTIONS }, skip: tab !== 'discover' || !!query, fetchPolicy: 'cache-and-network', ...SILENT });
  const search = useQuery<SearchData>(SEARCH_USERS, { variables: { searchUsersInput: { query, limit: SEARCH_PAGE, offset: 0 } }, skip: tab !== 'discover' || !query, fetchPolicy: 'cache-and-network', ...SILENT });

  const reason = useCallback(
    (s: Suggestion): string | undefined => {
      const mutual = s.mutualConnectionCount ?? 0;
      if (mutual > 0) return t('mutual', { count: mutual });
      const shared = (s.sharedCommunityNames ?? []).filter((n) => n && !LOOKS_LIKE_ID.test(n));
      if (shared.length === 0) return undefined;
      return shared.length === 1 ? t('sharedOne', { name: shared[0] }) : t('sharedMore', { name: shared[0], count: (s.sharedCommunityCount ?? shared.length) - 1 });
    },
    [t],
  );

  const lists = useMemo(() => {
    const keep = (p?: Person | null): p is Person => !!p && !!p.userId && p.userId !== me;
    const other = (c: Connection) => (c.requesterId === me ? c.receiver : c.requester);
    const connected: Row[] = (friends.data?.getConnections?.connections ?? [])
      .map((c) => ({ person: other(c), connectionId: c.id }))
      .filter((r): r is { person: Person; connectionId: string } => keep(r.person))
      .map((r) => ({ ...r, status: 'connected' as const }));
    const pend = pending.data?.getPendingConnections?.connections ?? [];
    const received: Row[] = pend
      .filter((c) => c.receiverId === me)
      .map((c) => ({ person: c.requester, connectionId: c.id }))
      .filter((r): r is { person: Person; connectionId: string } => keep(r.person))
      .map((r) => ({ ...r, status: 'pending_received' as const }));
    const sent: Row[] = pend
      .filter((c) => c.requesterId === me)
      .map((c) => ({ person: c.receiver, connectionId: c.id }))
      .filter((r): r is { person: Person; connectionId: string } => keep(r.person))
      .map((r) => ({ ...r, status: 'pending_sent' as const }));
    const discover: Row[] = query
      ? (search.data?.searchUsers?.profiles ?? []).filter(keep).map((person) => ({ person, connectionId: person.connectionId ?? '', status: normaliseStatus(person.connectionStatus) }))
      : (suggestions.data?.recommendedPeople?.items ?? [])
          .filter((s) => keep(s.profile))
          .map((s) => ({ person: s.profile as Person, connectionId: s.profile?.connectionId ?? '', status: normaliseStatus(s.profile?.connectionStatus), reason: reason(s) }));
    return { friends: connected, requests: received, sent, discover };
  }, [friends.data, pending.data, suggestions.data, search.data, me, query, reason]);

  const counts = {
    requests: lists.requests.filter((r) => !gone.has(r.person.userId)).length,
    sent: lists.sent.filter((r) => !gone.has(r.person.userId)).length,
    friends: Math.max((friends.data?.getConnections?.total ?? 0) - lists.friends.filter((r) => gone.has(r.person.userId)).length, 0),
  };
  const countFor = (k: FriendsTab): number | null => {
    if (k === 'discover') return null;
    if (k === 'friends' && !friends.data) return null;
    if (k !== 'friends' && !pending.data) return null;
    return counts[k];
  };

  const filter = tab === 'discover' ? '' : draft.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = lists[tab].filter((r) => !gone.has(r.person.userId));
    if (!filter) return list;
    return list.filter((r) => displayName(r.person, '').toLowerCase().includes(filter));
  }, [lists, tab, gone, filter]);

  const active = tab === 'discover' ? (query ? search : suggestions) : tab === 'friends' ? friends : pending;
  const loading = active.loading && !active.data;
  const failed = !!active.error && !active.data;
  const loadedFriends = friends.data?.getConnections?.connections?.length ?? 0;
  const hasMore = tab === 'friends' ? loadedFriends < (friends.data?.getConnections?.total ?? 0) : tab === 'discover' && !!query && !!search.data?.searchUsers?.hasMore;

  const goTab = (next: FriendsTab) => {
    setDraft('');
    router.replace(next === 'discover' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };
  const setQuery = (next: string) => {
    const q = next.trim().slice(0, 100);
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tab === 'discover') setQuery(draft);
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? FRIENDS_TABS.length - 1 : (i + step + FRIENDS_TABS.length) % FRIENDS_TABS.length;
    tabRefs.current[FRIENDS_TABS[next]]?.focus();
    goTab(FRIENDS_TABS[next]);
  };

  /** After an action succeeds: hide/flag the row at once, then re-read the server lists. */
  const afterAction = (row: Row, kind: 'hide' | 'requested') => {
    const id = row.person.userId;
    if (kind === 'requested') {
      setRequested((s) => new Set(s).add(id));
    } else {
      setGone((s) => new Set(s).add(id));
    }
    void Promise.allSettled([friends.refetch(), pending.refetch(), tab === 'discover' ? active.refetch() : Promise.resolve()]).then(() => {
      if (kind === 'hide') setGone((s) => { const n = new Set(s); n.delete(id); return n; });
    });
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      if (tab === 'friends') {
        await friends.fetchMore({
          variables: { limit: FRIENDS_PAGE, offset: loadedFriends },
          updateQuery: (prev, { fetchMoreResult }) => {
            const next = fetchMoreResult?.getConnections;
            if (!next) return prev;
            const seen = new Set((prev.getConnections?.connections ?? []).map((c) => c.id));
            return { getConnections: { ...next, connections: [...(prev.getConnections?.connections ?? []), ...(next.connections ?? []).filter((c) => !seen.has(c.id))] } };
          },
        });
      } else {
        const loaded = search.data?.searchUsers?.profiles?.length ?? 0;
        await search.fetchMore({
          variables: { searchUsersInput: { query, limit: SEARCH_PAGE, offset: loaded } },
          updateQuery: (prev, { fetchMoreResult }) => {
            const next = fetchMoreResult?.searchUsers;
            if (!next) return prev;
            const seen = new Set((prev.searchUsers?.profiles ?? []).map((p) => p.userId));
            return { searchUsers: { ...next, profiles: [...(prev.searchUsers?.profiles ?? []), ...(next.profiles ?? []).filter((p) => !seen.has(p.userId))] } };
          },
        });
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const buttonsFor = (row: Row): { buttons: FriendButtonType[]; hide: boolean } => {
    if (tab === 'requests') return { buttons: ['accept', 'ignore'], hide: true };
    if (tab === 'sent') return { buttons: ['cancelRequest'], hide: true };
    if (tab === 'friends') return { buttons: ['message', 'dropdown'], hide: true };
    if (row.status === 'connected') return { buttons: ['message'], hide: false };
    if (row.status === 'pending_received') return { buttons: row.connectionId ? ['accept', 'ignore'] : [], hide: true };
    if (row.status === 'pending_sent') return { buttons: row.connectionId ? ['cancelRequest'] : [], hide: true };
    return { buttons: ['addFriend'], hide: false };
  };

  const labelFor: Record<FriendsTab, string> = { discover: t('tabs.discover'), requests: t('tabs.requests'), sent: t('tabs.sent'), friends: t('tabs.friends') };
  const emptyText = query ? t('noMatch', { query }) : filter ? t('noMatch', { query: draft.trim() }) : t(`empty.${tab}`);
  const inputLabel = tab === 'discover' ? t('discoverSearchLabel') : t('filterLabel');
  const btnPill = 'inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2';

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full min-w-0 space-y-4 px-4 py-4 pb-10 lg:w-[60vw] lg:max-w-4xl lg:px-0 lg:py-6">
        <header className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-text-primary lg:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-text-secondary lg:text-base">{t('subtitle')}</p>
        </header>

        <div role="tablist" aria-label={t('tabsLabel')} className="-mx-4 flex overflow-x-auto border-b border-border-subtle px-4 scrollbar-hide lg:mx-0 lg:px-0">
          {FRIENDS_TABS.map((k, i) => {
            const n = countFor(k);
            const selected = tab === k;
            return (
              <button
                key={k}
                ref={(el) => {
                  tabRefs.current[k] = el;
                }}
                type="button"
                role="tab"
                id={`friends-tab-${k}`}
                aria-selected={selected}
                aria-controls="friends-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => goTab(k)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand sm:px-4 ${selected ? 'border-text-brand text-text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                <span>{labelFor[k]}</span>
                {n !== null && n > 0 && (
                  <span data-testid={`friends-count-${k}`} className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${selected ? 'bg-surface-brand-subtle text-text-brand' : 'bg-surface-subtle text-text-secondary'}`}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <section id="friends-panel" role="tabpanel" aria-labelledby={`friends-tab-${tab}`} data-testid="friends-list" className="min-w-0">
          <form role="search" onSubmit={onSubmit} className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 focus-within:border-border-brand">
            <label htmlFor="friends-search" className="sr-only">
              {inputLabel}
            </label>
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
            <input
              id="friends-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={tab === 'discover' ? t('discoverSearchPlaceholder') : t('filterPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={100}
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
            />
            {tab === 'discover' && (
              <button type="submit" className={`${btnPill} bg-surface-brand text-white hover:opacity-90`}>
                {t('searchButton')}
              </button>
            )}
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {tab === 'discover' && (
              <h2 className="min-w-0 text-base font-bold text-text-primary">{query ? t('resultsTitle', { query }) : t('suggestedTitle')}</h2>
            )}
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

          {loading ? (
            <div role="status" className="flex flex-col items-center gap-2 py-10">
              <Spinner className="size-6 text-text-brand" />
              <span className="text-sm text-text-secondary">{t('loading')}</span>
            </div>
          ) : failed ? (
            <div role="alert" className="py-8 text-center">
              <p className="text-sm text-text-secondary">{t('loadFailed')}</p>
              <button type="button" onClick={() => active.refetch()} className="mt-2 text-sm font-medium text-text-brand hover:underline">
                {t('retry')}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6">
              <EmptyState size="sm" icon={Users} title={emptyText} />
            </div>
          ) : (
            <ul className="mt-1 divide-y divide-border-subtle">
              {rows.map((row) => {
                const p = row.person;
                const name = displayName(p, tIdentity('unknownUser'));
                const where = p.location?.trim() || countryName(p.country) || countryName(p.residenceCountry) || countryName(p.countryOfOrigin);
                const about = [p.occupation?.trim() || p.headline?.trim() || p.sector?.trim(), where].filter(Boolean).join(' · ');
                const wasRequested = requested.has(p.userId) && row.status === 'none';
                const { buttons, hide } = buttonsFor(row);
                return (
                  <li key={p.userId} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <Link href={profileUrl({ username: p.username, userId: p.userId })} prefetch={false} className="flex min-w-0 flex-1 basis-48 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                      <Avatar src={p.avatarUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="truncate text-base font-semibold text-text-primary hover:underline">{name}</span>
                          {p.isVerified && (
                            <>
                              <BadgeCheck className="size-4 shrink-0 text-text-brand" aria-hidden />
                              <span className="sr-only">{t('verified')}</span>
                            </>
                          )}
                        </span>
                        {about && <span className="block truncate text-sm text-text-secondary">{about}</span>}
                        {row.reason && <span className="block truncate text-sm font-medium text-text-brand">{row.reason}</span>}
                      </span>
                    </Link>
                    {/* ButtonType2 is 12px on phones; keep the row actions at 14px or more. */}
                    <div className="ml-auto flex min-w-0 shrink-0 items-center [&_button]:text-sm">
                      {wasRequested || (buttons.length === 0 && row.status === 'pending_sent') ? (
                        <span className={`${btnPill} border border-border-subtle text-text-secondary`}>{t('requested')}</span>
                      ) : (
                        <FriendActionButtons
                          userId={p.userId}
                          connectionId={row.connectionId}
                          buttonsToShow={buttons}
                          dropdownOptions={buttons.includes('dropdown') ? [{ type: 'removeFriend', separator: true }, { type: 'blockFriend' }] : []}
                          className="flex flex-wrap items-center justify-end gap-2"
                          onConnectionAction={() => afterAction(row, hide ? 'hide' : 'requested')}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && rows.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={loadMore} disabled={loadingMore} className={`${btnPill} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle disabled:opacity-60`}>
                {loadingMore ? <Spinner className="size-4" /> : t('loadMore')}
              </button>
            </div>
          )}

          {tab === 'discover' && !query && (
            <p className="mt-4 text-center text-sm">
              <Link href="/people" prefetch={false} className="font-medium text-text-brand hover:underline">
                {t('browseAll')}
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
