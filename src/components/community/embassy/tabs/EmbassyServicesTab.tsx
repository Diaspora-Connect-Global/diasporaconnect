'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ChevronRight, FileText } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  SERVICE_REQUEST_TYPES,
  type ServiceRequestTypesResponse,
} from '@/services/gql/embassyServices';

/** Services = catalog of consular service/request types from service-request-service. */
export function EmbassyServicesTab({ communityId }: { communityId: string }) {
  const t = useTranslations('community.embassy');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, loading } = useQuery<ServiceRequestTypesResponse>(SERVICE_REQUEST_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: communityId },
    fetchPolicy: 'cache-and-network',
  });

  const services = (data?.serviceRequestTypes ?? []).filter((s) => s.isActive !== false);

  function trackHref() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'track-requests');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 lg:px-6">
      <div className="mb-4">
        <h2 className="heading-xsmall text-text-primary">{t('services.title')}</h2>
        <p className="body-small text-text-secondary">{t('services.subtitle')}</p>
      </div>

      {loading && services.length === 0 ? (
        <p className="body-small py-4 text-text-secondary">{t('services.loading')}</p>
      ) : services.length === 0 ? (
        <p className="body-small py-4 text-text-secondary">{t('services.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="border-border-subtle">
              <CardContent className="flex h-full flex-col p-4">
                <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface-brand-light text-text-brand">
                  <FileText className="size-5" aria-hidden />
                </span>
                <p className="label-medium text-text-primary">{service.displayName}</p>
                {service.description && (
                  <p className="body-small mt-1 line-clamp-2 flex-1 text-text-secondary">
                    {service.description}
                  </p>
                )}
                <Link
                  href={trackHref()}
                  scroll={false}
                  className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand"
                >
                  {t('services.viewDetails')}
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmbassyServicesTab;
