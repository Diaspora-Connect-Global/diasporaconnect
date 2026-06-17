'use client';

import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GET_EVENTS_BY_OWNER } from '@/services/gql/events';
import type { EmbassyViewProps } from '../types';

interface OwnerEvent {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt?: string | null;
  registrationCount?: number | null;
  availableSpots?: number | null;
  isPaid?: boolean;
  coverImageUrl?: string | null;
}

interface GetEventsByOwnerResponse {
  getEventsByOwner: { total: number; events: OwnerEvent[] };
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dateParts(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: '', day: '' };
  return {
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    day: d.toLocaleString(undefined, { day: '2-digit' }),
  };
}

export function EmbassyEventsTab({ props }: { props: EmbassyViewProps }) {
  const t = useTranslations('community.embassy');
  const { community } = props;

  const { data, loading } = useQuery<GetEventsByOwnerResponse>(GET_EVENTS_BY_OWNER, {
    variables: { ownerId: community.id, ownerType: 'community', limit: 20, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const events = data?.getEventsByOwner?.events ?? [];

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 lg:px-6">
      <div className="mb-4">
        <h2 className="heading-xsmall text-text-primary">{t('events.title')}</h2>
        <p className="body-small text-text-secondary">{t('events.subtitle')}</p>
      </div>

      {loading && events.length === 0 ? (
        <p className="body-small py-4 text-text-secondary">{t('events.loading')}</p>
      ) : events.length === 0 ? (
        <p className="body-small py-4 text-text-secondary">{t('events.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {events.map((evt) => {
            const { month, day } = dateParts(evt.startAt);
            return (
              <li key={evt.id}>
                <Card className="border-border-subtle">
                  <CardContent className="flex gap-4 p-4">
                    <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-md bg-surface-subtle">
                      {evt.coverImageUrl ? (
                        <Image
                          src={evt.coverImageUrl}
                          alt={evt.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center">
                          <span className="caption-small text-text-danger">{month}</span>
                          <span className="label-medium text-text-primary">{day}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="label-medium truncate text-text-primary">{evt.title}</p>
                      <p className="caption-medium mt-1 flex items-center gap-1 text-text-secondary">
                        <CalendarDays className="size-4" aria-hidden />
                        {formatEventDate(evt.startAt)}
                      </p>
                      <div className="caption-medium mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-text-secondary">
                        {typeof evt.registrationCount === 'number' && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-4" aria-hidden />
                            {t('events.going', { count: evt.registrationCount })}
                          </span>
                        )}
                        {evt.isPaid && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-4" aria-hidden />
                            {t('events.paid')}
                          </span>
                        )}
                      </div>
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

export default EmbassyEventsTab;
