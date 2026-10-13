'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList } from 'lucide-react';
import { ServiceRequestsList } from './ServiceRequestsList';
import { ConnectionRequestsList } from './ConnectionRequestsList';
import { Link } from '@/i18n/navigation';
import { Users, Building2 } from 'lucide-react';

/**
 * `/requests` — service requests, connection requests sent/received,
 * and quick links to membership request flows which live in Community / Association.
 * No fabricated membership aggregation query exists yet; that is a backend follow-up.
 */
export function RequestsView() {
  const t = useTranslations('requestsPage');

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        {/* Header */}
        <section
          aria-labelledby="requests-title"
          className="rounded-2xl border border-border-subtle bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default p-5 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface-brand/10">
              <ClipboardList className="size-5 text-text-brand" aria-hidden />
            </div>
            <div>
              <h1 id="requests-title" className="text-2xl font-bold text-text-primary sm:text-3xl">
                {t('title')}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          {/* Connection requests */}
          <section aria-labelledby="req-connections-heading">
            <h2 id="req-connections-heading" className="mb-3 text-lg font-bold text-text-primary">
              {t('sections.connections')}
            </h2>
            <ConnectionRequestsList />
          </section>

          {/* Service requests */}
          <section aria-labelledby="req-services-heading">
            <h2 id="req-services-heading" className="mb-3 text-lg font-bold text-text-primary">
              {t('sections.services')}
            </h2>
            <ServiceRequestsList />
          </section>

          {/* Membership — no aggregated query; link to the pages where pending memberships appear */}
          <section aria-labelledby="req-membership-heading">
            <h2 id="req-membership-heading" className="mb-3 text-lg font-bold text-text-primary">
              {t('sections.membership')}
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">{t('membershipHint')}</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <li>
                <Link
                  href="/community"
                  prefetch={false}
                  className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-info">
                    <Users className="size-5 text-text-brand" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t('communityLabel')}</p>
                    <p className="text-xs text-muted-foreground">{t('communityHint')}</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  href="/association"
                  prefetch={false}
                  className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-info">
                    <Building2 className="size-5 text-text-brand" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t('associationLabel')}</p>
                    <p className="text-xs text-muted-foreground">{t('associationHint')}</p>
                  </div>
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
