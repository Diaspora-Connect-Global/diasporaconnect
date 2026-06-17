'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Check, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  MY_SERVICE_REQUESTS,
  SERVICE_REQUEST_TYPES,
  type MyServiceRequestsResponse,
  type ServiceRequestTypesResponse,
} from '@/services/gql/embassyServices';

const STEP_KEYS = ['submitted', 'review', 'approved', 'completed'] as const;

/** Normalize backend status → { stepIndex (0-3), rejected }. */
function statusToStep(status: string): { step: number; rejected: boolean } {
  const s = status.toUpperCase();
  if (s.includes('REJECT') || s.includes('CANCEL') || s.includes('DENIED')) {
    return { step: 1, rejected: true };
  }
  if (s.includes('COMPLETE') || s.includes('CLOSED') || s.includes('FULFILLED')) {
    return { step: 3, rejected: false };
  }
  if (s.includes('APPROVE') || s.includes('DECIDED')) return { step: 2, rejected: false };
  if (s.includes('REVIEW') || s.includes('PROCESS')) return { step: 1, rejected: false };
  return { step: 0, rejected: false }; // SUBMITTED / PENDING / DRAFT
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function EmbassyTrackRequestsTab({ communityId }: { communityId: string }) {
  const t = useTranslations('community.embassy');

  const { data, loading } = useQuery<MyServiceRequestsResponse>(MY_SERVICE_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: typesData } = useQuery<ServiceRequestTypesResponse>(SERVICE_REQUEST_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: communityId },
    fetchPolicy: 'cache-and-network',
  });

  const typeName = new Map(
    (typesData?.serviceRequestTypes ?? []).map((tp) => [tp.id, tp.displayName]),
  );
  const requests = data?.myServiceRequests ?? [];

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 lg:px-6">
      <div className="mb-4">
        <h2 className="heading-xsmall text-text-primary">{t('track.title')}</h2>
        <p className="body-small text-text-secondary">{t('track.subtitle')}</p>
      </div>

      {loading && requests.length === 0 ? (
        <p className="body-small py-4 text-text-secondary">{t('track.loading')}</p>
      ) : requests.length === 0 ? (
        <p className="body-small py-4 text-text-secondary">{t('track.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((req) => {
            const { step, rejected } = statusToStep(req.status);
            return (
              <li key={req.id}>
                <Card className="border-border-subtle">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-brand">
                          <FileText className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="label-medium text-text-primary">
                            {typeName.get(req.requestTypeId) ?? req.category ?? t('track.request')}
                          </p>
                          <p className="caption-small text-text-secondary">{req.requestNumber}</p>
                          <p className="caption-small text-text-secondary">
                            {t('track.submitted')}: {formatDate(req.submittedAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'caption-medium whitespace-nowrap rounded-full px-2.5 py-0.5',
                          rejected
                            ? 'bg-surface-danger text-text-danger'
                            : step === 3
                              ? 'bg-surface-success text-text-success'
                              : 'bg-surface-info text-text-info',
                        )}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Stepper */}
                    <div className="mt-4 flex items-center">
                      {STEP_KEYS.map((key, i) => {
                        const done = !rejected && i <= step;
                        return (
                          <div key={key} className="flex flex-1 items-center last:flex-none">
                            <div className="flex flex-col items-center">
                              <span
                                className={cn(
                                  'flex size-6 items-center justify-center rounded-full border',
                                  done
                                    ? 'border-border-brand bg-surface-brand text-text-white'
                                    : 'border-border-subtle bg-surface-default text-text-secondary',
                                )}
                              >
                                {done ? <Check className="size-3.5" aria-hidden /> : null}
                              </span>
                              <span className="caption-small mt-1 text-text-secondary">
                                {t(`track.steps.${key}`)}
                              </span>
                            </div>
                            {i < STEP_KEYS.length - 1 && (
                              <span
                                className={cn(
                                  'mx-1 h-0.5 flex-1',
                                  !rejected && i < step ? 'bg-surface-brand' : 'bg-border-subtle',
                                )}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default EmbassyTrackRequestsTab;
