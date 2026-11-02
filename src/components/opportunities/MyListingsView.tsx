'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Briefcase, Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CLOSE_OPPORTUNITY, MY_OPPORTUNITIES } from '@/services/gql/opportunities';

const PAGE = 20;
const MAX_LIMIT = 200;
const STATUSES = ['', 'PUBLISHED', 'CLOSED', 'DRAFT', 'ARCHIVED'] as const;

interface Listing {
  id: string;
  title: string;
  type?: string | null;
  status: string;
  location?: string | null;
  deadline?: string | null;
  applicationCount?: number | null;
  createdAt?: string | null;
}
interface MyOpportunitiesData {
  myOpportunities: { total: number; opportunities: Listing[] };
}

const PILL: Record<string, string> = {
  PUBLISHED: 'bg-surface-success text-text-success',
  CLOSED: 'border border-border-subtle bg-surface-default text-text-secondary',
  DRAFT: 'bg-surface-warning text-text-warning',
  ARCHIVED: 'border border-border-subtle bg-surface-default text-text-secondary',
};

/** `/opportunities/mine` — the listings you posted, with applicant counts, Close and a way in to the applicants. */
export function MyListingsView() {
  const t = useTranslations('opportunities.mine');
  const tTypes = useTranslations('redesign.opportunityTypes');
  const format = useFormatter();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('');
  const [limit, setLimit] = useState(PAGE);
  const [closing, setClosing] = useState<Listing | null>(null);

  const { data, loading, error, refetch } = useQuery<MyOpportunitiesData>(MY_OPPORTUNITIES, {
    variables: { status: status || undefined, limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const [closeOpportunity, { loading: closingBusy }] = useMutation<{ closeOpportunity: boolean }>(CLOSE_OPPORTUNITY);

  const list = data?.myOpportunities.opportunities ?? [];
  const total = data?.myOpportunities.total ?? 0;

  const confirmClose = async () => {
    if (!closing || closingBusy) return;
    try {
      const res = await closeOpportunity({ variables: { id: closing.id } });
      // errorPolicy 'all': a refusal resolves with data null / false, so success is only ever what the server returned.
      if (res.data?.closeOpportunity !== true) {
        toast.error(t('closeFailed'));
        return;
      }
      toast.success(t('closed'));
      setClosing(null);
      await refetch();
    } catch {
      toast.error(t('closeFailed'));
    }
  };

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full px-4 py-4 pb-10 lg:w-[70vw] lg:px-0 lg:py-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-text-primary sm:text-3xl">{t('title')}</h1>
            <p className="mt-0.5 text-sm text-text-secondary">{t('subtitle')}</p>
          </div>
          <div>
            <label htmlFor="mine-status" className="mb-1 block text-xs font-medium text-text-secondary">{t('filter')}</label>
            <select
              id="mine-status"
              value={status}
              onChange={(e) => { setStatus(e.target.value as (typeof STATUSES)[number]); setLimit(PAGE); }}
              className="min-h-11 rounded-lg border border-border-subtle bg-surface-default px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
            >
              {STATUSES.map((s) => (
                <option key={s || 'all'} value={s}>{s ? t(`status.${s}`) : t('all')}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="mt-5" aria-busy={loading}>
          {error && !data ? (
            <div role="alert" className="rounded-xl border border-border-subtle bg-surface-danger p-4 text-sm text-text-danger">
              {t('loadFailed')}{' '}
              <button type="button" onClick={() => refetch()} className="font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">{t('retry')}</button>
            </div>
          ) : loading && !data ? (
            <p className="text-sm text-text-secondary">{t('loading')}</p>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center">
              <Briefcase className="mx-auto mb-2 size-8 text-text-secondary" aria-hidden />
              <p className="font-semibold text-text-primary">{t('emptyTitle')}</p>
              <p className="mt-1 text-sm text-text-secondary">{t('emptyBody')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((item) => {
                const deadline = item.deadline && !Number.isNaN(new Date(item.deadline).getTime()) ? new Date(item.deadline) : null;
                const count = item.applicationCount ?? 0;
                const id = encodeURIComponent(item.id);
                return (
                  <li key={item.id} data-testid="my-listing" className="min-w-0 rounded-2xl border border-border-subtle bg-surface-default p-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${PILL[item.status] ?? PILL.CLOSED}`}>
                        {t.has(`status.${item.status}`) ? t(`status.${item.status}`) : item.status}
                      </span>
                      {item.type && tTypes.has(item.type) && <span className="text-xs text-text-secondary">{tTypes(item.type)}</span>}
                    </div>
                    <h2 className="mt-1 break-words text-base font-semibold text-text-primary">
                      <Link href={`/opportunities/${id}`} prefetch={false} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">{item.title}</Link>
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{t('applicants', { count })}</span>
                      {deadline && <span>{t('deadline', { date: format.dateTime(deadline, { dateStyle: 'medium' }) })}</span>}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/opportunities/${id}/applicants`}
                        prefetch={false}
                        className="inline-flex min-h-11 items-center rounded-full bg-surface-brand px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
                      >
                        {t('viewApplicants')}
                      </Link>
                      {item.status === 'PUBLISHED' && (
                        <button
                          type="button"
                          onClick={() => setClosing(item)}
                          className="min-h-11 rounded-full border border-border-subtle px-4 text-sm font-semibold text-text-danger hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                        >
                          {t('close')}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {list.length > 0 && list.length < total && limit < MAX_LIMIT && (
            <button
              type="button"
              onClick={() => setLimit((l) => Math.min(l + PAGE, MAX_LIMIT))}
              className="mt-4 min-h-11 w-full rounded-full border border-border-subtle px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand sm:w-auto"
            >
              {t('loadMore')}
            </button>
          )}
        </div>
      </div>

      <Dialog open={!!closing} onOpenChange={(o) => { if (!o && !closingBusy) setClosing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('confirmTitle')}</DialogTitle>
            <DialogDescription>{t('confirmBody', { title: closing?.title ?? '' })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setClosing(null)} disabled={closingBusy} className="min-h-11 rounded-full border border-border-subtle px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
              {t('keepOpen')}
            </button>
            <button type="button" onClick={confirmClose} disabled={closingBusy} className="min-h-11 rounded-full bg-text-danger px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:opacity-60">
              {t('confirmClose')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
