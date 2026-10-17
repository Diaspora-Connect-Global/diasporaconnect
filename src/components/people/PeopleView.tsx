'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { BadgeCheck, ChevronRight, MessageCircle, Search, UserPlus, Users, UsersRound, X, type LucideIcon } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { PageHero } from '@/components/redesign/PageHero';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { useUserStore } from '@/store/useUserStore';
import { RECOMMENDED_PEOPLE } from '@/services/gql/postsFeed';
import { SEARCH_USERS } from '@/services/gql/connection';
import { displayName } from '@/lib/displayName';
import { profileUrl } from '@/lib/profileUrl';
import { toCdnUrl } from '@/lib/cdn';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';

const SILENT = { context: { silentErrors: true } } as const;
const SUGGESTIONS = 24;
const PAGE_SIZE = 20;
const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-|^[0-9a-f]{16,}$/i;

type Person = {
  userId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  sector?: string | null;
  residenceCountry?: string | null;
  countryOfOrigin?: string | null;
  connectionStatus?: string | null;
  connectionId?: string | null;
  isVerified?: boolean | null;
};
type Suggestion = { profile?: Person | null; sharedCommunityCount?: number | null; sharedCommunityNames?: string[] | null; mutualConnectionCount?: number | null };
type SuggestionsData = { recommendedPeople?: { items?: Suggestion[] | null } | null };
type SearchData = { searchUsers?: { total?: number | null; hasMore?: boolean | null; profiles?: Person[] | null } | null };
type Status = 'none' | 'pending_sent' | 'pending_received' | 'connected';

function normaliseStatus(raw?: string | null): Status {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'connected' || s === 'accepted') return 'connected';
  if (s === 'pending_sent' || s === 'pending') return 'pending_sent';
  if (s === 'pending_received') return 'pending_received';
  return 'none';
}

function PersonAvatar({ src }: { src?: string | null }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, '/PROFILE.png');
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || '/PROFILE.png'} alt="" width={48} height={48} loading="lazy" onError={onError} className="size-12 shrink-0 rounded-full border border-border-subtle object-cover" />;
}

/** A country code shown as its name in the viewer's language; anything else is shown as given. */
function useCountryName() {
  const locale = useLocale();
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      return null;
    }
  }, [locale]);
  return (code?: string | null) => {
    const c = (code ?? '').trim();
    if (!c) return '';
    if (/^[A-Za-z]{2}$/.test(c) && names) return names.of(c.toUpperCase()) ?? c;
    return c;
  };
}

/**
 * `/people`: people to connect with. Without a search it lists suggestions
 * (from the recommender, with the real reason: mutual connections or shared
 * communities); with `?q=` it lists matches from the people search. People are
 * a plain divided list, not cards. Connect / Accept / Message use the existing
 * connection actions, and every user-service rule (blocks, limits) still applies.
 */
export function PeopleView() {
  const t = useTranslations('peoplePage');
  const tIdentity = useTranslations('common.identity');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const [draft, setDraft] = useState(query);
  const me = useUserStore((s) => s.user?.userId);
  const countryName = useCountryName();
  const { addFriend, acceptRequest, sendMessage } = useFriendActions();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  const suggestions = useQuery<SuggestionsData>(RECOMMENDED_PEOPLE, { variables: { limit: SUGGESTIONS }, skip: !!query, fetchPolicy: 'cache-and-network', ...SILENT });
  const search = useQuery<SearchData>(SEARCH_USERS, { variables: { searchUsersInput: { query, limit: PAGE_SIZE, offset: 0 } }, skip: !query, fetchPolicy: 'cache-and-network', ...SILENT });

  type Row = { person: Person; reason?: string };
  const rows: Row[] = useMemo(() => {
    const keep = (p?: Person | null): p is Person => !!p && !!p.userId && p.userId !== me;
    if (query) return (search.data?.searchUsers?.profiles ?? []).filter(keep).map((person) => ({ person }));
    return (suggestions.data?.recommendedPeople?.items ?? [])
      .filter((s) => keep(s?.profile))
      .map((s) => {
        const mutual = s.mutualConnectionCount ?? 0;
        const shared = (s.sharedCommunityNames ?? []).filter((n) => n && !LOOKS_LIKE_ID.test(n));
        const reason =
          mutual > 0
            ? t('mutual', { count: mutual })
            : shared.length > 0
              ? shared.length === 1
                ? t('sharedOne', { name: shared[0] })
                : t('sharedMore', { name: shared[0], count: (s.sharedCommunityCount ?? shared.length) - 1 })
              : undefined;
        return { person: s.profile as Person, reason };
      });
  }, [query, search.data, suggestions.data, me, t]);

  const active = query ? search : suggestions;
  const loading = active.loading && !active.data;
  const failed = !!active.error && !active.data;
  const hasMore = !!query && !!search.data?.searchUsers?.hasMore;

  const setQuery = (next: string) => {
    const q = next.trim().slice(0, 100);
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuery(draft);
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const loaded = search.data?.searchUsers?.profiles?.length ?? 0;
      await search.fetchMore({
        variables: { searchUsersInput: { query, limit: PAGE_SIZE, offset: loaded } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const next = fetchMoreResult?.searchUsers;
          if (!next) return prev;
          const seen = new Set((prev.searchUsers?.profiles ?? []).map((p) => p.userId));
          return { searchUsers: { ...next, profiles: [...(prev.searchUsers?.profiles ?? []), ...(next.profiles ?? []).filter((p) => !seen.has(p.userId))] } };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const connect = async (p: Person) => {
    setBusy(p.userId);
    try {
      if (await addFriend(p.userId)) setStatus((s) => ({ ...s, [p.userId]: 'pending_sent' }));
    } finally {
      setBusy(null);
    }
  };
  const accept = async (p: Person) => {
    if (!p.connectionId) return;
    setBusy(p.userId);
    try {
      await acceptRequest(p.connectionId);
      setStatus((s) => ({ ...s, [p.userId]: 'connected' }));
    } finally {
      setBusy(null);
    }
  };

  const btn = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  const action = (p: Person, name: string) => {
    const st = status[p.userId] ?? normaliseStatus(p.connectionStatus);
    if (st === 'connected') {
      return (
        <button type="button" onClick={() => sendMessage(p.userId)} aria-label={`${t('message')}: ${name}`} className={`${btn} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`}>
          <MessageCircle className="size-4" aria-hidden />
          {t('message')}
        </button>
      );
    }
    if (st === 'pending_sent') {
      return (
        <button type="button" disabled className={`${btn} border border-border-subtle bg-surface-default text-text-secondary`}>
          {t('requested')}
        </button>
      );
    }
    if (st === 'pending_received' && p.connectionId) {
      return (
        <button type="button" onClick={() => accept(p)} disabled={busy === p.userId} aria-label={`${t('accept')}: ${name}`} className={`${btn} bg-surface-brand text-white hover:opacity-90`}>
          {busy === p.userId ? <Spinner className="size-4" /> : t('accept')}
        </button>
      );
    }
    return (
      <button type="button" onClick={() => connect(p)} disabled={busy === p.userId} aria-label={`${t('connect')}: ${name}`} className={`${btn} border border-text-brand text-text-brand hover:bg-surface-brand-light/40`}>
        {busy === p.userId ? <Spinner className="size-4" /> : <UserPlus className="size-4" aria-hidden />}
        {t('connect')}
      </button>
    );
  };

  const links: { href: string; icon: LucideIcon; tone: keyof typeof TONE_CLASS; title: string; hint: string }[] = [
    { href: '/requests', icon: UserPlus, tone: 'brand', title: t('links.requests'), hint: t('links.requestsHint') },
    { href: '/groups', icon: UsersRound, tone: 'info', title: t('links.groups'), hint: t('links.groupsHint') },
    { href: '/community', icon: Users, tone: 'success', title: t('links.communities'), hint: t('links.communitiesHint') },
  ];

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <PageHero id="people-title" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} image={REDESIGN_IMAGES.connectCard} priority>
          <form role="search" onSubmit={onSubmit} className="flex max-w-xl items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
            <label htmlFor="people-search" className="sr-only">
              {t('searchLabel')}
            </label>
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
            <input
              id="people-search"
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
          <section aria-labelledby="people-list-title" data-testid="people-list" className="min-w-0 rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="people-list-title" className="text-lg font-bold text-text-primary">
                  {query ? t('resultsTitle', { query }) : t('suggestedTitle')}
                </h2>
                {!query && <p className="mt-0.5 text-sm text-text-secondary">{t('suggestedSubtitle')}</p>}
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

            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-6 text-text-brand" />
              </div>
            ) : failed ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-secondary">{t('loadFailed')}</p>
                <button type="button" onClick={() => active.refetch()} className="mt-2 text-sm font-medium text-text-brand hover:underline">
                  {t('retry')}
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-6">
                <EmptyState size="sm" icon={Users} title={query ? t('noResults', { query }) : t('noSuggestions')} />
              </div>
            ) : (
              <ul className="-mx-2 mt-3 divide-y divide-border-subtle">
                {rows.map(({ person: p, reason }) => {
                  const name = displayName(p, tIdentity('unknownUser'));
                  const where = countryName(p.residenceCountry) || countryName(p.countryOfOrigin);
                  const about = [p.headline?.trim() || p.sector?.trim(), where].filter(Boolean).join(' · ');
                  return (
                    <li key={p.userId} className="flex min-w-0 items-center gap-3 px-2 py-3">
                      <Link href={profileUrl({ username: p.username, userId: p.userId })} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                        <PersonAvatar src={p.avatarUrl} />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-1">
                            <span className="truncate text-sm font-semibold text-text-primary hover:underline">{name}</span>
                            {p.isVerified && (
                              <>
                                <BadgeCheck className="size-4 shrink-0 text-text-brand" aria-hidden />
                                <span className="sr-only">{t('verified')}</span>
                              </>
                            )}
                          </span>
                          {about && <span className="block truncate text-xs text-text-secondary">{about}</span>}
                          {reason && <span className="mt-0.5 block truncate text-xs font-medium text-text-brand">{reason}</span>}
                        </span>
                      </Link>
                      {action(p, name)}
                    </li>
                  );
                })}
              </ul>
            )}

            {hasMore && rows.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={loadMore} disabled={loadingMore} className={`${btn} border border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle`}>
                  {loadingMore ? <Spinner className="size-4" /> : t('loadMore')}
                </button>
              </div>
            )}
          </section>

          <aside aria-labelledby="people-more-title" data-testid="people-more" className="h-fit rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:sticky lg:top-0">
            <h2 id="people-more-title" className="text-base font-bold text-text-primary">
              {t('links.title')}
            </h2>
            <ul className="-mx-2 mt-2 divide-y divide-border-subtle">
              {links.map(({ href, icon: Icon, tone, title, hint }) => (
                <li key={href}>
                  <Link href={href} prefetch={false} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${TONE_CLASS[tone]}`}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
                      <span className="block truncate text-xs text-text-secondary">{hint}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
