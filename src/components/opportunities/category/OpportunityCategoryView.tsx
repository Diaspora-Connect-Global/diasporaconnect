'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, RefreshCw, SearchX } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LIST_OPPORTUNITIES } from '@/services/gql/opportunities';
import type { OpportunityItem } from '@/hooks/redesign/useFreshListings';
import { PageHero } from '@/components/redesign/PageHero';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { JobCard, OpportunityCard } from '@/components/redesign/ListingCards';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';
import { Skeleton } from '@/components/ui/skeleton';
import { moreOpportunitiesIDList, type OpportunityCategoryConfig } from '@/app/[locale]/(public)/opportunities/[id]/data';
import { CategoryRefinePanel } from './CategoryRefinePanel';
import { MAX_LIMIT, PAGE_SIZE, SORT_INPUT, parseSort, parseType, type CategorySort, type CategoryType } from './categoryFilters';

type ListData = { listOpportunities?: { total?: number | null; opportunities?: OpportunityItem[] | null } | null };

const SHELL = 'h-app-inner overflow-y-auto scrollbar-hide bg-background';
const INNER = 'mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6';
const isJob = (o: OpportunityItem) => o.type === 'EMPLOYMENT' || o.type === 'CONTRACT';

function ResultsSkeleton() {
    return (
        <ul aria-hidden className="grid grid-cols-1 gap-3 @[26rem]:grid-cols-2 @[38rem]:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </li>
            ))}
        </ul>
    );
}

/**
 * `/opportunities/<category>`: back link, hero (category name as the h1), then the
 * results beside a refine rail (type, place, sort — in the URL, so a view can be
 * shared) and a row of the other categories. One list request per filter state.
 */
export function OpportunityCategoryView({ config }: { config: OpportunityCategoryConfig }) {
    return (
        <Suspense
            fallback={
                <div className={SHELL}>
                    <div className={INNER}>
                        <Skeleton className="h-44 w-full rounded-2xl" />
                        <div className="@container">
                            <ResultsSkeleton />
                        </div>
                    </div>
                </div>
            }
        >
            <CategoryPage config={config} />
        </Suspense>
    );
}

function CategoryPage({ config }: { config: OpportunityCategoryConfig }) {
    const t = useTranslations('opportunityCategory');
    const tCats = useTranslations('opportunityPage.categories');
    const tOpp = useTranslations('home.opportunities');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const type = parseType(searchParams.get('type'));
    const location = (searchParams.get('loc') ?? '').slice(0, 80);
    const sort = parseSort(searchParams.get('sort'));
    const filtered = !!type || !!location || sort !== 'newest';

    const update = useCallback(
        (next: { type?: CategoryType | null; loc?: string; sort?: CategorySort }) => {
            const params = new URLSearchParams();
            const ty = next.type === undefined ? type : next.type;
            const loc = next.loc ?? location;
            const so = next.sort ?? sort;
            if (ty) params.set('type', ty);
            if (loc) params.set('loc', loc);
            if (so !== 'newest') params.set('sort', so);
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [type, location, sort, router, pathname],
    );

    // "Show more" raises the page size for the current filters; changing a filter starts again at one page.
    const filterKey = `${type ?? ''}|${location}|${sort}`;
    const [grown, setGrown] = useState({ key: filterKey, limit: PAGE_SIZE });
    const limit = grown.key === filterKey ? grown.limit : PAGE_SIZE;

    const { data, previousData, loading, error, refetch } = useQuery<ListData>(LIST_OPPORTUNITIES, {
        variables: {
            input: { category: config.apiCategory, offset: 0, limit, ...SORT_INPUT[sort], ...(type ? { type } : {}), ...(location ? { location } : {}) },
        },
        fetchPolicy: 'cache-first',
        context: { silentErrors: true },
    });
    // While a bigger page loads, keep the rows already shown instead of flashing skeletons.
    const shownData = data ?? (limit > PAGE_SIZE ? previousData : undefined);
    const items = useMemo(() => {
        const seen = new Set<string>();
        return (shownData?.listOpportunities?.opportunities ?? []).filter((o) => o && o.id && o.title && !seen.has(o.id) && !!seen.add(o.id));
    }, [shownData]);
    const total = shownData?.listOpportunities?.total ?? 0;
    const initialLoading = loading && !shownData;
    const canMore = !loading && items.length < total && limit < MAX_LIMIT;
    const countText = !initialLoading && !error && total > 0 ? t('results.count', { count: total }) : undefined;

    const others = moreOpportunitiesIDList.filter((c) => c.id !== config.id);
    const name = tCats(config.apiCategory);
    const rowsAsList = items.some(isJob);

    return (
        <div className={SHELL}>
            <div className={INNER}>
                <Link href="/opportunities" className="inline-flex min-h-11 items-center gap-2 rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                    <ArrowLeft size={18} aria-hidden />
                    <span className="text-sm font-medium">{tOpp('backToOpportunities')}</span>
                </Link>

                <PageHero id="opp-category-title" eyebrow={t('eyebrow')} title={name} subtitle={t(`descriptions.${config.apiCategory}`)} image={config.photo} priority />

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="lg:col-start-2 lg:row-start-1">
                        <div className="lg:sticky lg:top-0">
                            <CategoryRefinePanel
                                type={type}
                                location={location}
                                sort={sort}
                                onType={(v) => update({ type: v })}
                                onLocation={(v) => update({ loc: v })}
                                onSort={(v) => update({ sort: v })}
                                onClear={() => update({ type: null, loc: '', sort: 'newest' })}
                            />
                        </div>
                    </div>

                    <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
                        <Section labelledBy="opp-category-results" testId="opp-category-results">
                            <SectionHeader id="opp-category-results" title={t('results.title')} subtitle={countText} />
                            <p role="status" className="sr-only">
                                {initialLoading ? t('results.loading') : countText ?? ''}
                            </p>
                            <div className="@container" aria-busy={loading}>
                                {error && !shownData ? (
                                    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center" data-testid="opp-category-error">
                                        <p className="text-base font-semibold text-text-primary">{t('error.title')}</p>
                                        <p className="max-w-sm text-sm text-muted-foreground">{t('error.description')}</p>
                                        <button
                                            type="button"
                                            onClick={() => void refetch()}
                                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-brand px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
                                        >
                                            <RefreshCw className="size-4" aria-hidden />
                                            {t('error.retry')}
                                        </button>
                                    </div>
                                ) : initialLoading ? (
                                    <ResultsSkeleton />
                                ) : items.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-8 text-center" data-testid="opp-category-empty">
                                        <span className={`grid size-12 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
                                            <SearchX className="size-6" aria-hidden />
                                        </span>
                                        <p className="text-base font-semibold text-text-primary">{filtered ? t('empty.filteredTitle') : t('empty.title', { category: name })}</p>
                                        <p className="max-w-sm text-sm text-muted-foreground">{filtered ? t('empty.filteredDescription') : t('empty.description')}</p>
                                        {filtered && (
                                            <button
                                                type="button"
                                                onClick={() => update({ type: null, loc: '', sort: 'newest' })}
                                                className="inline-flex min-h-11 items-center rounded-full bg-surface-brand px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
                                            >
                                                {t('empty.clear')}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <ul className={`grid gap-3 ${rowsAsList ? 'grid-cols-1 @[26rem]:grid-cols-2' : 'grid-cols-2'} @[38rem]:grid-cols-3`}>
                                            {items.map((o) => (
                                                <li key={o.id} className="min-w-0">
                                                    {isJob(o) ? <JobCard item={o} testId="opp-category-card" /> : <OpportunityCard item={o} testId="opp-category-card" />}
                                                </li>
                                            ))}
                                        </ul>
                                        {loading && <div className="mt-3"><ResultsSkeleton /></div>}
                                        {canMore && (
                                            <div className="mt-4 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setGrown({ key: filterKey, limit: Math.min(limit + PAGE_SIZE, MAX_LIMIT) })}
                                                    className="inline-flex min-h-11 items-center rounded-full border border-border-subtle bg-surface-default px-6 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                                                >
                                                    {t('results.showMore')}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Section>

                        <nav aria-labelledby="opp-category-others" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5">
                            <h2 id="opp-category-others" className="mb-3 text-lg font-bold text-text-primary">
                                {t('others')}
                            </h2>
                            <ul className="flex flex-wrap gap-2">
                                {others.map((c) => {
                                    const Icon = c.icon;
                                    return (
                                        <li key={c.id}>
                                            <Link
                                                href={`/opportunities/${c.id}`}
                                                prefetch={false}
                                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-default px-3.5 text-sm font-medium text-text-primary transition-colors hover:border-border-brand hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                                            >
                                                <span className={`grid size-6 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
                                                    <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                                                </span>
                                                {tCats(c.apiCategory)}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
}
