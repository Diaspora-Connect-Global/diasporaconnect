'use client';

import { useMemo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { CalendarCheck, ChevronRight, ClipboardList, ShieldCheck, Store, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { RailCard } from '@/components/redesign/RailCard';
import { useUpcomingRegistrations } from '@/hooks/redesign/useUpcomingRegistrations';
import { MY_SERVICE_REQUESTS, type MyServiceRequestsResponse } from '@/services/gql/embassyServices';
import { GET_MY_KYC_STATUS } from '@/services/gql/kyc';
import { GET_MY_VENDOR } from '@/services/gql/vendor';
import type { GetMyKycStatusResponse } from '@/services/gql/types/kyc';
import { statusBucket } from '@/components/community/embassy/tabs/requestStatus';
import { getEventCoverImage, getEventLocationDisplay } from '@/services/gql/events';
import type { MoreTone } from '@/components/more/moreLinks';

const SILENT = { context: { silentErrors: true } } as const;
const MAX_CARDS = 3;

export type ActivityItem = { key: string; testId: string; href?: string; icon: LucideIcon; name: string; detail?: string; status: string; tone: MoreTone };

function kycBucket(status?: string | null): 'verified' | 'review' | 'rejected' | 'expired' | null {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'VERIFIED':
      return 'verified';
    case 'SUBMITTED':
    case 'PENDING':
    case 'UNDER_REVIEW':
      return 'review';
    case 'REJECTED':
      return 'rejected';
    case 'EXPIRED':
      return 'expired';
    default:
      return null; // NOT_STARTED / unknown: nothing has happened, so there is no activity to show.
  }
}

const VENDOR_TONE: Record<string, MoreTone> = { VERIFIED: 'success', ACTIVE: 'success', SUSPENDED: 'danger', BANNED: 'danger' };

/**
 * "Your activity": what is really going on for this person — the next event they
 * registered for, their latest service request, KYC state and vendor state. Every
 * card comes from a live query; with nothing to show the section is not rendered.
 */
export function useActivityItems(): ActivityItem[] {
  const t = useTranslations('homePage.activity');
  const format = useFormatter();
  const { events } = useUpcomingRegistrations(1);
  const { data: requestsData } = useQuery<MyServiceRequestsResponse>(MY_SERVICE_REQUESTS, { fetchPolicy: 'cache-and-network', ...SILENT });
  const { data: kycData } = useQuery<GetMyKycStatusResponse>(GET_MY_KYC_STATUS, { fetchPolicy: 'cache-first', ...SILENT });
  const { data: vendorData } = useQuery<{ getMyVendor?: { displayName?: string | null; status?: string | null } | null }>(GET_MY_VENDOR, { fetchPolicy: 'cache-first', ...SILENT });

  const items = useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];
    const event = events[0];
    if (event) {
      out.push({
        key: 'event',
        testId: 'activity-event',
        href: `/events/${encodeURIComponent(event.id)}`,
        icon: CalendarCheck,
        name: event.title,
        detail: format.dateTime(new Date(event.startAt), { dateStyle: 'medium', timeStyle: 'short' }),
        status: t('registered'),
        tone: 'danger',
      });
    }
    const latest = [...(requestsData?.myServiceRequests ?? [])]
      .filter((r) => r && r.id)
      .sort((a, b) => new Date(b.updatedAt ?? b.submittedAt ?? 0).getTime() - new Date(a.updatedAt ?? a.submittedAt ?? 0).getTime())[0];
    if (latest) {
      const bucket = statusBucket(latest.status);
      const owner = latest.ownerType?.toUpperCase();
      const base = owner === 'COMMUNITY' ? '/community' : owner === 'ASSOCIATION' ? '/association' : null;
      out.push({
        key: 'request',
        testId: 'activity-request',
        href: base && latest.ownerEntityId ? `${base}/${encodeURIComponent(latest.ownerEntityId)}?tab=track-requests&request=${encodeURIComponent(latest.id)}` : undefined,
        icon: ClipboardList,
        // The request's own category ("Passport", ...); the generic label only when it has none. Never the number.
        name: latest.category?.trim() || t('request'),
        status: t(`requestStatus.${bucket}`),
        tone: bucket === 'rejected' ? 'danger' : bucket === 'completed' || bucket === 'approved' ? 'success' : 'warning',
      });
    }
    const kyc = kycBucket(kycData?.getMyKYCStatus?.status);
    if (kyc) {
      out.push({
        key: 'kyc',
        testId: 'activity-kyc',
        href: '/verifykyc',
        icon: ShieldCheck,
        name: t('kyc'),
        status: t(`kycStatus.${kyc}`),
        tone: kyc === 'verified' ? 'success' : kyc === 'review' ? 'warning' : 'danger',
      });
    }
    const vendor = vendorData?.getMyVendor;
    const vStatus = vendor?.status?.toUpperCase();
    if (vendor && vStatus && ['REGISTERED', 'AWAITING_KYC', 'KYC_UNDER_REVIEW', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'BANNED'].includes(vStatus)) {
      out.push({
        key: 'vendor',
        testId: 'activity-vendor',
        href: '/vendors',
        icon: Store,
        name: vendor.displayName?.trim() || t('vendor'),
        status: t(`vendorStatus.${vStatus}`),
        tone: VENDOR_TONE[vStatus] ?? 'warning',
      });
    }
    return out.slice(0, MAX_CARDS);
  }, [events, requestsData, kycData, vendorData, t, format]);

  return items;
}

export function YourActivity({ idPrefix }: { idPrefix: string }) {
  const t = useTranslations('homePage.activity');
  const items = useActivityItems();
  if (items.length === 0) return null;
  return (
    <RailCard id={`${idPrefix}-activity-title`} title={t('title')} testId={`home-activity-${idPrefix}`}>
      <ul className="divide-y divide-border-subtle">
        {items.map((i) => {
          const row = (
            <>
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${TONE_CLASS[i.tone]}`}>
                <i.icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary">{i.name}</span>
                {i.detail && <span className="block truncate text-sm text-muted-foreground">{i.detail}</span>}
              </span>
              <span data-testid={`${i.testId}-status`} className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[i.tone]}`}>{i.status}</span>
              {i.href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
            </>
          );
          const cls = 'flex items-center gap-3 py-2.5';
          return (
            <li key={i.key}>
              {i.href ? (
                <Link href={i.href} prefetch={false} data-testid={i.testId} className={`${cls} rounded-md hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand`}>{row}</Link>
              ) : (
                <div data-testid={i.testId} className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}
