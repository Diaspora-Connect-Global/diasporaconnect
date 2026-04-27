'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useLazyQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchStore, type SearchTab } from '@/store/useSearchStore';
import { SEARCH_USERS } from '@/services/gql/connection';
import { SEARCH_GROUPS } from '@/services/gql/groups';
import { SEARCH_COMMUNITIES } from '@/services/gql/community';
import { SEARCH_ASSOCIATIONS } from '@/services/gql/associations';
import { SEARCH_PRODUCTS } from '@/services/gql/marketplace';
import { SEARCH_EVENTS } from '@/services/gql/events';
import { SEARCH_OPPORTUNITIES } from '@/services/gql/opportunities';
import {
  Users, Briefcase, UsersRound, CalendarDays, ShoppingBag,
  Building2, Network, SearchX, Clock, ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  userId: string; firstName: string; lastName: string;
  headline?: string; sector?: string; residenceCountry?: string;
  avatarUrl?: string; connectionStatus?: string;
}
interface Group {
  id: string; name: string; description?: string;
  privacy?: string; memberCount?: number;
}
interface Community {
  id: string; name: string; memberCount?: number;
  joinPolicy?: string; avatarUrl?: string;
}
interface Association {
  id: string; name: string; memberCount?: number;
  joinPolicy?: string; avatarUrl?: string;
  associationType?: { id: string; name: string };
}
interface Product {
  id: string; title: string; price?: number; currency?: string; images?: string[];
}
interface Event {
  id: string; title: string; startAt?: string;
  eventCategory?: string; visibility?: string;
}
interface Opportunity {
  id: string; title: string; category?: string; location?: string;
  deadline?: string; compensationMin?: number; compensationMax?: number;
  compensationCurrency?: string; type?: string;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-subtle animate-pulse">
      <div className="w-10 h-10 rounded-full bg-surface-default shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-default rounded w-2/5" />
        <div className="h-2 bg-surface-default rounded w-3/5" />
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
    </div>
  );
}

// ─── Card Components ──────────────────────────────────────────────────────────

function Avatar({ src, name, size = 10 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-surface-hover flex items-center justify-center text-text-secondary text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'brand' | 'success' }) {
  const cls = {
    default: 'bg-surface-hover text-text-secondary',
    brand: 'bg-text-brand/10 text-text-brand',
    success: 'bg-green-100 text-green-700',
  }[variant];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{label}</span>;
}

function PeopleCard({ profile }: { profile: UserProfile }) {
  const name = `${profile.firstName} ${profile.lastName}`;
  return (
    <Link href={`/profile/${profile.userId}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <Avatar src={profile.avatarUrl} name={name} />
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{name}</p>
        <p className="text-text-secondary text-xs truncate">{profile.headline || profile.sector}</p>
        {profile.residenceCountry && (
          <p className="text-text-secondary text-xs truncate">{profile.residenceCountry}</p>
        )}
      </div>
      {profile.connectionStatus && profile.connectionStatus !== 'NONE' && (
        <Badge label={profile.connectionStatus.replace('_', ' ')} variant="brand" />
      )}
    </Link>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <Link href={`/groups/${group.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
        <UsersRound className="w-5 h-5 text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{group.name}</p>
        {group.memberCount !== undefined && (
          <p className="text-text-secondary text-xs">{group.memberCount.toLocaleString()} members</p>
        )}
      </div>
      {group.privacy && <Badge label={group.privacy} />}
    </Link>
  );
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link href={`/community/${community.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <Avatar src={community.avatarUrl} name={community.name} />
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{community.name}</p>
        {community.memberCount !== undefined && (
          <p className="text-text-secondary text-xs">{community.memberCount.toLocaleString()} members</p>
        )}
      </div>
      {community.joinPolicy && <Badge label={community.joinPolicy} />}
    </Link>
  );
}

function AssociationCard({ association }: { association: Association }) {
  return (
    <Link href={`/association/${association.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <Avatar src={association.avatarUrl} name={association.name} />
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{association.name}</p>
        <p className="text-text-secondary text-xs">
          {association.memberCount !== undefined && `${association.memberCount.toLocaleString()} members`}
          {association.associationType && ` · ${association.associationType.name}`}
        </p>
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0];
  return (
    <Link href={`/marketplace/${product.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={product.title} className="w-10 h-10 rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-surface-hover flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-text-secondary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{product.title}</p>
        {product.price !== undefined && (
          <p className="text-text-brand text-xs font-semibold">
            {product.currency} {product.price.toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: Event }) {
  const date = event.startAt ? new Date(event.startAt).toLocaleDateString() : null;
  return (
    <Link href={`/events/${event.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
        <CalendarDays className="w-5 h-5 text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{event.title}</p>
        <p className="text-text-secondary text-xs">
          {date && `${date}`}{event.eventCategory && ` · ${event.eventCategory}`}
        </p>
      </div>
      {event.visibility && <Badge label={event.visibility} />}
    </Link>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const comp = opportunity.compensationMin && opportunity.compensationMax
    ? `${opportunity.compensationCurrency ?? ''} ${opportunity.compensationMin.toLocaleString()}–${opportunity.compensationMax.toLocaleString()}`
    : null;
  return (
    <Link href={`/opportunities/${opportunity.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
        <Briefcase className="w-5 h-5 text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{opportunity.title}</p>
        <p className="text-text-secondary text-xs truncate">
          {[opportunity.category, opportunity.location].filter(Boolean).join(' · ')}
        </p>
        {comp && <p className="text-text-brand text-xs font-medium">{comp.trim()}</p>}
      </div>
      {opportunity.deadline && (
        <span className="text-[10px] text-text-secondary shrink-0">
          {new Date(opportunity.deadline).toLocaleDateString()}
        </span>
      )}
    </Link>
  );
}

// ─── Empty / No-query States ──────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <SearchX className="w-12 h-12 text-text-secondary mb-3" />
      <p className="text-text-primary font-medium">No results for &ldquo;{query}&rdquo;</p>
      <p className="text-text-secondary text-sm mt-1">Try different keywords or check spelling</p>
    </div>
  );
}

const SUGGESTED_CATEGORIES = ['Networking', 'Jobs', 'Events near me', 'Diaspora groups', 'Marketplace'];

function EmptyQuery({ recentSearches, onSearch }: { recentSearches: string[]; onSearch: (q: string) => void }) {
  return (
    <div className="py-6 space-y-6">
      {recentSearches.length > 0 && (
        <div>
          <p className="text-text-secondary text-xs font-semibold uppercase tracking-wide mb-2 px-1">Recent</p>
          <div className="space-y-1">
            {recentSearches.slice(0, 6).map((r) => (
              <button key={r} onClick={() => onSearch(r)}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-surface-hover text-left transition-colors">
                <Clock className="w-4 h-4 text-text-secondary shrink-0" />
                <span className="text-text-primary text-sm">{r}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-wide mb-2 px-1">Explore</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => onSearch(cat)}
              className="px-3 py-1.5 rounded-full border border-border-subtle text-text-secondary text-sm hover:bg-surface-hover transition-colors">
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: SearchTab; label: string; icon: React.ReactNode }[] = [
  { id: 'all',           label: 'All',          icon: <Network className="w-4 h-4" /> },
  { id: 'people',        label: 'People',        icon: <Users className="w-4 h-4" /> },
  { id: 'opportunities', label: 'Opportunities', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'groups',        label: 'Groups',        icon: <UsersRound className="w-4 h-4" /> },
  { id: 'events',        label: 'Events',        icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'marketplace',   label: 'Marketplace',   icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'communities',   label: 'Communities',   icon: <Building2 className="w-4 h-4" /> },
  { id: 'associations',  label: 'Associations',  icon: <Network className="w-4 h-4" /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const t = useTranslations('search');
  const searchParams = useSearchParams();
  useParams(); // locale available via useParams if needed
  const urlQuery = searchParams.get('q') ?? '';

  const { query, activeTab, setQuery, setActiveTab, recentSearches, addRecentSearch } = useSearchStore();
  const [pages, setPages] = useState<Record<SearchTab, number>>({
    all: 1, people: 1, opportunities: 1, groups: 1,
    events: 1, marketplace: 1, communities: 1, associations: 1,
  });

  const PAGE_SIZE = 20;
  const ALL_LIMIT = 3;

  // Sync URL query → store on mount
  useEffect(() => {
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      addRecentSearch(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // ── Lazy queries ────────────────────────────────────────────────────────────
  const [searchUsers,         usersResult]    = useLazyQuery(SEARCH_USERS);
  const [searchGroups,        groupsResult]   = useLazyQuery(SEARCH_GROUPS);
  const [searchCommunities,   commsResult]    = useLazyQuery(SEARCH_COMMUNITIES);
  const [searchAssociations,  assocsResult]   = useLazyQuery(SEARCH_ASSOCIATIONS);
  const [searchProducts,      productsResult] = useLazyQuery(SEARCH_PRODUCTS);
  const [searchEvents,        eventsResult]   = useLazyQuery(SEARCH_EVENTS);
  const [searchOpportunities, oppsResult]     = useLazyQuery(SEARCH_OPPORTUNITIES);

  const runAll = (q: string, tab: SearchTab, pg: typeof pages) => {
    if (!q.trim()) return;
    const isAll = tab === 'all';
    const limit = isAll ? ALL_LIMIT : PAGE_SIZE;
    const offset = isAll ? 0 : (pg[tab] - 1) * PAGE_SIZE;
    const page   = isAll ? 1 : pg[tab];

    if (isAll || tab === 'people') {
      searchUsers({ variables: { searchUsersInput: { query: q, limit, offset } } });
    }
    if (isAll || tab === 'groups') {
      searchGroups({ variables: { query: q, searchLimit: limit, searchOffset: offset } });
    }
    if (isAll || tab === 'communities') {
      searchCommunities({ variables: { input: { query: q, page, limit } } });
    }
    if (isAll || tab === 'associations') {
      searchAssociations({ variables: { input: { query: q, page, limit } } });
    }
    if (isAll || tab === 'marketplace') {
      searchProducts({ variables: { input: { query: q, page, limit } } });
    }
    if (isAll || tab === 'events') {
      searchEvents({ variables: { query: q, limit, offset } });
    }
    if (isAll || tab === 'opportunities') {
      searchOpportunities({ variables: { query: q, limit, offset } });
    }
  };

  useEffect(() => {
    runAll(query, activeTab, pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTab]);

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setPages((p) => ({ ...p, [tab]: 1 }));
  };

  const handleLoadMore = () => {
    const nextPage = pages[activeTab] + 1;
    setPages((p) => ({ ...p, [activeTab]: nextPage }));
    const q = query;
    const limit = PAGE_SIZE;
    const offset = (nextPage - 1) * PAGE_SIZE;
    const page = nextPage;
    switch (activeTab) {
      case 'people':        searchUsers({ variables: { searchUsersInput: { query: q, limit, offset } } }); break;
      case 'groups':        searchGroups({ variables: { query: q, searchLimit: limit, searchOffset: offset } }); break;
      case 'communities':   searchCommunities({ variables: { input: { query: q, page, limit } } }); break;
      case 'associations':  searchAssociations({ variables: { input: { query: q, page, limit } } }); break;
      case 'marketplace':   searchProducts({ variables: { input: { query: q, page, limit } } }); break;
      case 'events':        searchEvents({ variables: { query: q, limit, offset } }); break;
      case 'opportunities': searchOpportunities({ variables: { query: q, limit, offset } }); break;
    }
  };

  // ── Data extraction ─────────────────────────────────────────────────────────
  const users:   UserProfile[] = usersResult.data?.searchUsers?.profiles ?? [];
  const groups:  Group[]       = groupsResult.data?.searchGroups?.groups ?? [];
  const comms:   Community[]   = commsResult.data?.searchCommunities?.communities ?? [];
  const assocs:  Association[]  = assocsResult.data?.searchAssociations?.associations ?? [];
  const products: Product[]    = productsResult.data?.searchProducts?.products ?? [];
  const events:  Event[]       = eventsResult.data?.searchEvents?.events ?? [];
  const opps:    Opportunity[]  = oppsResult.data?.searchOpportunities?.opportunities ?? [];

  const totals: Record<SearchTab, number> = {
    all:           0,
    people:        usersResult.data?.searchUsers?.total ?? 0,
    groups:        groupsResult.data?.searchGroups?.total ?? 0,
    communities:   commsResult.data?.searchCommunities?.total ?? 0,
    associations:  assocsResult.data?.searchAssociations?.total ?? 0,
    marketplace:   productsResult.data?.searchProducts?.total ?? 0,
    events:        eventsResult.data?.searchEvents?.total ?? 0,
    opportunities: oppsResult.data?.searchOpportunities?.total ?? 0,
  };

  const isLoading = (tab: SearchTab): boolean => {
    if (tab === 'all' || tab === 'people')        if (usersResult.loading)    return true;
    if (tab === 'all' || tab === 'groups')        if (groupsResult.loading)   return true;
    if (tab === 'all' || tab === 'communities')   if (commsResult.loading)    return true;
    if (tab === 'all' || tab === 'associations')  if (assocsResult.loading)   return true;
    if (tab === 'all' || tab === 'marketplace')   if (productsResult.loading) return true;
    if (tab === 'all' || tab === 'events')        if (eventsResult.loading)   return true;
    if (tab === 'all' || tab === 'opportunities') if (oppsResult.loading)     return true;
    return false;
  };

  const hasMore = (): boolean => {
    const total = totals[activeTab];
    return total > pages[activeTab] * PAGE_SIZE;
  };

  // ── Section renderer for "All" tab ─────────────────────────────────────────
  function AllSection<T>({
    tab, title, items, loading, renderItem,
  }: {
    tab: SearchTab; title: string; items: T[]; loading: boolean;
    renderItem: (item: T) => React.ReactNode;
  }) {
    if (loading) return <div className="mb-6"><p className="text-text-primary text-sm font-semibold mb-2">{title}</p><SectionSkeleton /></div>;
    if (!items.length) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-text-primary text-sm font-semibold">{title}</p>
          <button onClick={() => handleTabChange(tab)}
            className="flex items-center gap-1 text-text-brand text-xs hover:underline">
            {t('seeAll')} {totals[tab] > 0 ? totals[tab] : ''} <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">{items.slice(0, ALL_LIMIT).map(renderItem)}</div>
      </div>
    );
  }

  const loading = isLoading(activeTab);

  // ── Tab sidebar / pill ──────────────────────────────────────────────────────
  function TabItem({ tab }: { tab: typeof TABS[number] }) {
    const active = activeTab === tab.id;
    const count = tab.id !== 'all' && totals[tab.id] > 0 ? totals[tab.id] : null;
    return (
      <button onClick={() => handleTabChange(tab.id)}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
          ${active ? 'bg-surface-hover text-text-brand' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}>
        {tab.icon}
        <span className="flex-1">{tab.label}</span>
        {count !== null && (
          <span className="text-[10px] font-semibold bg-text-brand/10 text-text-brand px-1.5 py-0.5 rounded-full">{count > 999 ? '999+' : count}</span>
        )}
      </button>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-surface-default">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col gap-1 w-52 shrink-0 border-r border-border-subtle p-3 overflow-y-auto">
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-wide px-1 mb-1">{t('filterBy')}</p>
        {TABS.map((tab) => <TabItem key={tab.id} tab={tab} />)}
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile tab pills */}
        <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide px-4 pt-3 pb-2 border-b border-border-subtle">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const count = tab.id !== 'all' && totals[tab.id] > 0 ? totals[tab.id] : null;
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                  ${active ? 'bg-text-brand text-white border-text-brand' : 'border-border-subtle text-text-secondary hover:bg-surface-hover'}`}>
                {tab.icon}
                {tab.label}
                {count !== null && <span className="ml-0.5">({count > 999 ? '999+' : count})</span>}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-4 max-w-2xl">
          {/* Empty query */}
          {!query.trim() && (
            <EmptyQuery recentSearches={recentSearches} onSearch={(q) => { setQuery(q); addRecentSearch(q); }} />
          )}

          {/* Results */}
          {query.trim() && (
            <>
              {/* ALL tab */}
              {activeTab === 'all' && (
                <div>
                  {!loading && !users.length && !groups.length && !comms.length && !assocs.length && !products.length && !events.length && !opps.length ? (
                    <EmptyState query={query} />
                  ) : (
                    <>
                      <AllSection tab="people"        title={t('people')}        items={users}    loading={usersResult.loading}    renderItem={(u) => <PeopleCard      key={u.userId}  profile={u} />} />
                      <AllSection tab="opportunities" title={t('opportunities')} items={opps}     loading={oppsResult.loading}     renderItem={(o) => <OpportunityCard key={o.id}       opportunity={o} />} />
                      <AllSection tab="groups"        title={t('groups')}        items={groups}   loading={groupsResult.loading}   renderItem={(g) => <GroupCard       key={g.id}       group={g} />} />
                      <AllSection tab="events"        title={t('events')}        items={events}   loading={eventsResult.loading}   renderItem={(e) => <EventCard       key={e.id}       event={e} />} />
                      <AllSection tab="marketplace"   title={t('marketplace')}   items={products} loading={productsResult.loading} renderItem={(p) => <ProductCard     key={p.id}       product={p} />} />
                      <AllSection tab="communities"   title={t('communities')}   items={comms}    loading={commsResult.loading}    renderItem={(c) => <CommunityCard   key={c.id}       community={c} />} />
                      <AllSection tab="associations"  title={t('associations')}  items={assocs}   loading={assocsResult.loading}   renderItem={(a) => <AssociationCard key={a.id}       association={a} />} />
                    </>
                  )}
                </div>
              )}

              {/* Individual tabs */}
              {activeTab === 'people' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !users.length && <EmptyState query={query} />}
                  {users.map((u) => <PeopleCard key={u.userId} profile={u} />)}
                </div>
              )}
              {activeTab === 'groups' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !groups.length && <EmptyState query={query} />}
                  {groups.map((g) => <GroupCard key={g.id} group={g} />)}
                </div>
              )}
              {activeTab === 'communities' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !comms.length && <EmptyState query={query} />}
                  {comms.map((c) => <CommunityCard key={c.id} community={c} />)}
                </div>
              )}
              {activeTab === 'associations' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !assocs.length && <EmptyState query={query} />}
                  {assocs.map((a) => <AssociationCard key={a.id} association={a} />)}
                </div>
              )}
              {activeTab === 'marketplace' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !products.length && <EmptyState query={query} />}
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
              {activeTab === 'events' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !events.length && <EmptyState query={query} />}
                  {events.map((e) => <EventCard key={e.id} event={e} />)}
                </div>
              )}
              {activeTab === 'opportunities' && (
                <div className="space-y-1">
                  {loading && <SectionSkeleton />}
                  {!loading && !opps.length && <EmptyState query={query} />}
                  {opps.map((o) => <OpportunityCard key={o.id} opportunity={o} />)}
                </div>
              )}

              {/* Load more */}
              {activeTab !== 'all' && !loading && hasMore() && (
                <div className="flex justify-center mt-6">
                  <button onClick={handleLoadMore}
                    className="px-6 py-2 rounded-full border border-border-subtle text-text-secondary text-sm hover:bg-surface-hover transition-colors">
                    {t('loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
