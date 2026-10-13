'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ClipboardList } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { MY_SERVICE_REQUESTS, MyServiceRequestsResponse } from '@/services/gql/embassyServices';
import { EmptyState } from '@/components/feedback';
import { Spinner } from '@/components/ui/spinner';

const SILENT = { context: { silentErrors: true } } as const;

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-surface-info text-text-brand',
  APPROVED: 'bg-surface-success text-text-success',
  REJECTED: 'bg-surface-danger text-text-danger',
  IN_PROGRESS: 'bg-surface-warning-subtle text-text-warning',
  PENDING: 'bg-surface-info text-text-brand',
};

export function ServiceRequestsList() {
  const t = useTranslations('requestsPage');

  const { data, loading } = useQuery<MyServiceRequestsResponse>(MY_SERVICE_REQUESTS, {
    fetchPolicy: 'cache-and-network',
    ...SILENT,
  });

  const requests = data?.myServiceRequests ?? [];

  if (loading && !data) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="size-6 text-text-brand" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-8">
        <EmptyState size="sm" icon={ClipboardList} title={t('emptyServices')} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-default">
      <ul className="divide-y divide-border-subtle">
        {requests.map((req) => {
          const statusStyle = STATUS_STYLES[req.status] ?? 'bg-surface-subtle text-text-secondary';
          const submitted = req.submittedAt
            ? new Date(req.submittedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : null;

          return (
            <li key={req.id}>
              <div className="flex items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {req.requestNumber}
                  </p>
                  {req.category && (
                    <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
                      {req.category.toLowerCase().replace(/_/g, ' ')}
                    </p>
                  )}
                  {submitted && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('submitted', { date: submitted })}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle}`}
                >
                  {t(`status.${req.status}`, { fallback: req.status })}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border-subtle px-4 py-3">
        <Link
          href="/embassy"
          prefetch={false}
          className="text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          {t('viewAllServices')}
        </Link>
      </div>
    </div>
  );
}
