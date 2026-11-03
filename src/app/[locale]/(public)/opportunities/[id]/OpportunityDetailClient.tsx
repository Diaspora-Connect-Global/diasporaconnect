'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { moreOpportunitiesIDList } from './data';
import { useTranslations } from 'next-intl';
import { GET_OPPORTUNITY } from '@/services/gql/opportunities';
import type { GetOpportunityData } from '@/services/gql/types/opportunities';
import PageLoader from '@/components/custom/PageLoader';
import OpportunityDetailView from '@/components/opportunities/page/OpportunityDetailView';
import { OpportunityCategoryView } from '@/components/opportunities/category/OpportunityCategoryView';
import { Link } from '@/i18n/navigation';

export default function OpportunityId() {
    const t = useTranslations('home.opportunities.notFound');
    const tOpportunities = useTranslations('home.opportunities');
    const params = useParams();
    const router = useRouter();
    const opportunityId = params.id as string;
    const listConfig = moreOpportunitiesIDList.find(config => config.id === opportunityId);
    // Only a real id is looked up: anything else (a mistyped slug) is "not found" without a request,
    // since every failed lookup counts toward the gateway's circuit breaker for all users.
    const isOpportunityId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityId);

    const { data: singleData, loading: singleLoading } = useQuery<GetOpportunityData>(GET_OPPORTUNITY, {
        variables: { id: opportunityId },
        skip: !!listConfig || !isOpportunityId,
    });

    const singleOpportunity = singleData?.getOpportunity ?? null;

    if (listConfig) {
        return <OpportunityCategoryView config={listConfig} />;
    }

    if (!listConfig) {
        if (singleLoading) {
            return <PageLoader />;
        }
        if (!singleOpportunity) {
            return (
                <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
                    <div className="mx-auto w-full px-4 pt-4 lg:w-[80vw] lg:px-0">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="mb-4 inline-flex min-h-11 items-center gap-2 text-text-secondary hover:text-text-primary"
                        >
                            <ArrowLeft size={18} aria-hidden />
                            <span className="text-sm font-medium">{tOpportunities("backToOpportunities")}</span>
                        </button>
                        <section className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border-subtle bg-surface-default p-8 text-center shadow-sm" data-testid="opportunity-not-found">
                            <span className="grid size-12 place-items-center rounded-full bg-surface-subtle text-text-secondary">
                                <SearchX className="size-6" aria-hidden />
                            </span>
                            <h1 className="mt-4 text-xl font-bold text-text-primary">{t('title')}</h1>
                            <p className="mt-2 text-sm text-text-secondary">{t('description')}</p>
                            <Link href="/opportunities" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-surface-brand px-5 py-2.5 text-sm font-semibold text-text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
                                {tOpportunities("backToOpportunities")}
                            </Link>
                        </section>
                    </div>
                </div>
            );
        }
        return <OpportunityDetailView item={singleOpportunity} />;
    }
}
