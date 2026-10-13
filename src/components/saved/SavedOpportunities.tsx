'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Lightbulb } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { GET_SAVED_OPPORTUNITIES } from '@/services/gql/opportunities';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';

const PAGE_SIZE = 20;
const SILENT = { context: { silentErrors: true } } as const;

interface SavedOpp {
  id: string;
  opportunityId: string;
  savedAt: string;
  opportunity?: {
    id: string;
    title: string;
    category?: string | null;
    type?: string | null;
    ownerType?: string | null;
    status?: string | null;
    deadline?: string | null;
    owner?: { id: string; name: string; avatarUrl?: string | null; type: string } | null;
  } | null;
}

interface GetSavedOppsData {
  getSavedOpportunities: {
    total: number;
    savedOpportunities: SavedOpp[];
  };
}

function OppRow({ item }: { item: SavedOpp }) {
  const t = useTranslations('savedPage');
  const opp = item.opportunity;
  if (!opp) return null;

  const deadline = opp.deadline
    ? new Date(opp.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <li>
      <Link
        href={`/opportunities/${encodeURIComponent(opp.id)}`}
        prefetch={false}
        className="flex min-w-0 items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-subtle">
          <Lightbulb className="size-5 text-text-brand" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{opp.title}</p>
          {opp.owner?.name && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{opp.owner.name}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
            {opp.type && <span className="capitalize">{opp.type.toLowerCase().replace(/_/g, ' ')}</span>}
            {deadline && (
              <>
                <span aria-hidden>·</span>
                <span>{t('deadline', { date: deadline })}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function SavedOpportunities() {
  const t = useTranslations('savedPage');
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, fetchMore } = useQuery<GetSavedOppsData>(GET_SAVED_OPPORTUNITIES, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    ...SILENT,
  });

  const items = data?.getSavedOpportunities?.savedOpportunities ?? [];
  const total = data?.getSavedOpportunities?.total ?? 0;
  const hasMore = items.length < total;

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: { offset: items.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.getSavedOpportunities) return prev;
          return {
            getSavedOpportunities: {
              ...fetchMoreResult.getSavedOpportunities,
              savedOpportunities: [
                ...(prev.getSavedOpportunities?.savedOpportunities ?? []),
                ...(fetchMoreResult.getSavedOpportunities.savedOpportunities ?? []),
              ],
            },
          };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6 text-text-brand" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-8">
        <EmptyState size="sm" icon={Lightbulb} title={t('empty.opportunities')} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-default">
      <ul className="divide-y divide-border-subtle px-2">
        {items.map((item) => (
          <OppRow key={item.id} item={item} />
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center p-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-border-subtle bg-surface-default px-5 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60"
          >
            {loadingMore ? <Spinner className="size-4" /> : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
