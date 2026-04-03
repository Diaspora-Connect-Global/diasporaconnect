'use client';
import { FilterableList } from '@/components/custom/filterableList';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { moreOpportunitiesIDList } from './data';
import { useTranslations } from 'next-intl';
import { LIST_OPPORTUNITIES, GET_OPPORTUNITY } from '@/services/gql/opportunities';
import type { ListOpportunitiesResponse, GetOpportunityData } from '@/services/gql/types/opportunities';
import type { Opportunity } from '@/services/gql/types/opportunities';
import { CustomEmploymentComponent } from '@/components/cards/opportunities/CustomEmploymentComponent';

const CATEGORY_SLUG_TO_API: Record<string, string> = {
    'employment-career': 'EMPLOYMENT_CAREER',
    'education-training': 'EDUCATION_TRAINING',
    'funding-grants': 'FUNDING_GRANTS',
    'fellowships-leadership': 'FELLOWSHIPS_LEADERSHIP',
    'business-investment': 'BUSINESS_INVESTMENT',
    'volunteering-social-impact': 'VOLUNTEERING_SOCIAL_IMPACT',
    'event-creative-industry': 'EVENT_CREATIVE_INDUSTRY',
    'agriculture-sustainability': 'AGRICULTURE_SUSTAINABILITY',
    'real-estate-infrastructure': 'REAL_ESTATE_INFRASTRUCTURE',
    'government-embassy-initiatives': 'GOVERNMENT_EMBASSY_INITIATIVES',
    'innovation-research': 'INNOVATION_RESEARCH',
    'finance-economics': 'FINANCE_ECONOMICS',
    'return-reintegration': 'RETURN_REINTEGRATION',
};

export default function OpportunityId() {
    const t = useTranslations('home.opportunities.notFound');
    const params = useParams();
    const router = useRouter();
    const opportunityId = params.id as string;
    const listConfig = moreOpportunitiesIDList.find(config => config.id === opportunityId);
    const apiCategory = listConfig ? CATEGORY_SLUG_TO_API[opportunityId] ?? undefined : undefined;

    const [filteredItems, setFilteredItems] = useState<Opportunity[]>([]);

    const { data: listData } = useQuery<ListOpportunitiesResponse>(LIST_OPPORTUNITIES, {
        variables: {
            input: apiCategory
                ? { category: apiCategory, limit: 50, offset: 0 }
                : undefined,
        },
        skip: !apiCategory,
    });

    const { data: singleData, loading: singleLoading } = useQuery<GetOpportunityData>(GET_OPPORTUNITY, {
        variables: { id: opportunityId },
        skip: !!listConfig,
    });

    const items = useMemo<Opportunity[]>(
        () => listData?.listOpportunities?.opportunities ?? [],
        [listData?.listOpportunities?.opportunities]
    );
    const singleOpportunity = singleData?.getOpportunity ?? null;

    useEffect(() => {
        setFilteredItems(items);
    }, [items]);

    if (!listConfig) {
        if (singleLoading) {
            return (
                <div className="lg:max-w-[60vw] mx-2 py-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            );
        }
        if (!singleOpportunity) {
            return (
                <div className="lg:max-w-[60vw] mx-2 py-4 flex items-center justify-center">
                    <div className="text-text-secondary font-medium text-center">
                        <p className="text-2xl mb-2">{t('title')}</p>
                        <p>{t('description', { id: opportunityId })}</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="h-app-inner overflow-y-auto scrollbar-hide p-4">
                <div className="max-w-2xl mx-auto">
                    <button 
                        onClick={() => router.back()} 
                        className="flex items-center gap-2 mb-6 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium text-sm">Back to Opportunities</span>
                    </button>
                    <CustomEmploymentComponent item={singleOpportunity} displayMode="details" />
                </div>
            </div>
        );
    }

    return (
        <div className=' h-app-inner  overflow-y-auto scrollbar-hide '>
            <FilterableList
                items={items}
                filteredItems={filteredItems}
                setFilteredItems={setFilteredItems}
                listConfig={listConfig}
                title={listConfig.title}
            />
        </div>
    );
}