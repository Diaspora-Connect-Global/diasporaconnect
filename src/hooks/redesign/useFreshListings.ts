'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { LIST_OPPORTUNITIES } from '@/services/gql/opportunities';
import { REDESIGN_FEATURED_PRODUCTS, REDESIGN_FEATURED_SERVICES } from '@/services/gql/redesign';

const SILENT = { context: { silentErrors: true } } as const;

export type OpportunityItem = {
  id: string;
  title: string;
  type?: string | null;
  category?: string | null;
  location?: string | null;
  deliveryMode?: string | null;
  commitmentType?: string | null;
  deadline?: string | null;
  createdAt?: string | null;
  owner?: { name?: string | null } | null;
};
export type ProductItem = { id: string; title: string; price: number; currency?: string | null; images?: string[] | null };
export type ServiceItem = { id: string; title: string; base_price: number; currency?: string | null };

type OppsData = { listOpportunities?: { total?: number; opportunities?: OpportunityItem[] | null } | null };
type ProductsData = { getFeaturedProducts?: { products?: ProductItem[] | null } | null };
type ServicesData = { getFeaturedMarketplaceServices?: { services?: ServiceItem[] | null } | null };

/** Newest opportunities, optionally of one `type` / `category`. Every field read is null-guarded. */
export function useOpportunities(input: { type?: string; category?: string; location?: string; searchTerm?: string; sortBy?: 'createdAt' | 'deadline' | 'applicationCount'; sortOrder?: 'ASC' | 'DESC'; limit: number }, skip = false) {
  const { data, loading } = useQuery<OppsData>(LIST_OPPORTUNITIES, {
    variables: { input: { offset: 0, sortBy: 'createdAt', sortOrder: 'DESC', ...input } },
    fetchPolicy: 'cache-first',
    skip,
    ...SILENT,
  });
  const items = useMemo(() => (data?.listOpportunities?.opportunities ?? []).filter((o) => o && o.id && o.title), [data]);
  return { items, total: data?.listOpportunities?.total ?? 0, loading: loading && !data };
}

/** Marketplace products the platform features. */
export function useFeaturedProducts(limit: number, skip = false) {
  const { data, loading } = useQuery<ProductsData>(REDESIGN_FEATURED_PRODUCTS, { variables: { page: 1, limit }, fetchPolicy: 'cache-first', skip, ...SILENT });
  const items = useMemo(() => (data?.getFeaturedProducts?.products ?? []).filter((p) => p && p.id && p.title), [data]);
  return { items, loading: loading && !data };
}

/** Marketplace services the platform features. */
export function useFeaturedServices(limit: number, skip = false) {
  const { data, loading } = useQuery<ServicesData>(REDESIGN_FEATURED_SERVICES, { variables: { page: 1, limit }, fetchPolicy: 'cache-first', skip, ...SILENT });
  const items = useMemo(() => (data?.getFeaturedMarketplaceServices?.services ?? []).filter((s) => s && s.id && s.title), [data]);
  return { items, loading: loading && !data };
}
