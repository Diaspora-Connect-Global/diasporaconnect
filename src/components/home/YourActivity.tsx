'use client';

import { useMemo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { CalendarCheck, ClipboardList, ShieldCheck, Store } from 'lucide-react';
import { ActivityCard } from '@/components/redesign/ActivityCard';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { useUpcomingRegistrations } from '@/hooks/redesign/useUpcomingRegistrations';
import { MY_SERVICE_REQUESTS, type MyServiceRequestsResponse } from '@/services/gql/embassyServices';
import { GET_MY_KYC_STATUS } from '@/services/gql/kyc';
import { GET_MY_VENDOR } from '@/services/gql/vendor';
import type { GetMyKycStatusResponse } from '@/services/gql/types/kyc';
import { statusBucket } from '@/components/community/embassy/tabs/requestStatus';
import { getEventLocationDisplay } from '@/services/gql/events';
import type { MoreTone } from '@/components/more/moreLinks';

const SILENT = { context: { silentErrors: true } } as const;
const MAX_CARDS = 3;

type Item = { key: string; node: React.ReactNode };

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
export function YourActivity() {
  const t = useTranslations('homePage.activity');
  const format = useFormatter();
  const { events } = useUpcomingRegistrations(1);
  const { data: requestsData } = useQuery<MyServiceRequestsResponse>(MY_SERVICE_REQUESTS, { fetchPolicy: 'cache-and-network', ...SILENT });
  const { data: kycData } = useQuery<GetMyKycStatusResponse>(GET_MY_KYC_STATUS, { fetchPolicy: 'cache-first', ...SILENT });
  const { data: vendorData } = useQuery<{ getMyVendor?: { displayName?: string | null; status?: string | null } | null }>(GET_MY_VENDOR, { fetchPolicy: 'cache-first', ...SILENT });

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const event = events[0];
    if (event) {
      out.push({
        key: 'event',
        node: (
          <ActivityCard
            testId="activity-event"
            href={`/events/${encodeURIComponent(event.id)}`}
            icon={CalendarCheck}
            tone="danger"
            title={event.title}
            subtitle={getEventLocationDisplay(event)}
            status={t('registered', { date: format.dateTime(new Date(event.startAt), { dateStyle: 'medium', timeStyle: 'short' }) })}
            statusTone="danger"
          />
        ),
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
        node: (
          <ActivityCard
            testId="activity-request"
            href={base && latest.ownerEntityId ? `${base}/${encodeURIComponent(latest.ownerEntityId)}?tab=track-requests&request=${encodeURIComponent(latest.id)}` : undefined}
            icon={ClipboardList}
            tone="info"
            title={t('request')}
            subtitle={latest.requestNumber ? t('requestSubtitle', { number: latest.requestNumber }) : undefined}
            status={t(`requestStatus.${bucket}`)}
            statusTone={bucket === 'rejected' ? 'danger' : bucket === 'completed' || bucket === 'approved' ? 'success' : 'warning'}
          />
        ),
      });
    }
    const kyc = kycBucket(kycData?.getMyKYCStatus?.status);
    if (kyc) {
      out.push({
        key: 'kyc',
        node: (
          <ActivityCard
            testId="activity-kyc"
            href="/verifykyc"
            icon={ShieldCheck}
            tone="success"
            title={t('kyc')}
            subtitle={t('kycSubtitle')}
            status={t(`kycStatus.${kyc}`)}
            statusTone={kyc === 'verified' ? 'success' : kyc === 'review' ? 'warning' : 'danger'}
          />
        ),
      });
    }
    const vendor = vendorData?.getMyVendor;
    const vStatus = vendor?.status?.toUpperCase();
    if (vendor && vStatus && ['REGISTERED', 'AWAITING_KYC', 'KYC_UNDER_REVIEW', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'BANNED'].includes(vStatus)) {
      out.push({
        key: 'vendor',
        node: (
          <ActivityCard
            testId="activity-vendor"
            href="/vendors"
            icon={Store}
            tone="warning"
            title={t('vendor')}
            subtitle={vendor.displayName ?? undefined}
            status={t(`vendorStatus.${vStatus}`)}
            statusTone={VENDOR_TONE[vStatus] ?? 'warning'}
          />
        ),
      });
    }
    return out.slice(0, MAX_CARDS);
  }, [events, requestsData, kycData, vendorData, t, format]);

  if (items.length === 0) return null;
  return (
    <Section labelledBy="home-activity-title" testId="home-activity">
      <SectionHeader id="home-activity-title" title={t('title')} />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <li key={i.key} className="min-w-0">
            {i.node}
          </li>
        ))}
      </ul>
    </Section>
  );
}
