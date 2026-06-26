'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  Search,
  Info,
  Clock,
  CalendarDays,
  Lock,
  ShieldCheck,
  BookUser,
  CreditCard,
  FileBadge,
  ScrollText,
  UserPlus,
  ClipboardList,
  Briefcase,
  Plane,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  SERVICE_REQUEST_TYPES,
  type ServiceRequestType,
  type ServiceRequestTypesResponse,
} from '@/services/gql/embassyServices';
import { EMBASSY_POPULAR_SERVICES, type EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';
import { ServiceGridSkeleton } from '../EmbassySkeletons';
import { EmbassyServiceDetail } from './EmbassyServiceDetail';
import { EmbassyServiceApply } from './EmbassyServiceApply';

interface Tone {
  ring: string;
  fg: string;
}
const TONES: Record<string, Tone> = {
  green: { ring: 'bg-green-50', fg: 'text-green-600' },
  blue: { ring: 'bg-blue-50', fg: 'text-blue-600' },
  orange: { ring: 'bg-orange-50', fg: 'text-orange-600' },
  purple: { ring: 'bg-purple-50', fg: 'text-purple-600' },
  rose: { ring: 'bg-rose-50', fg: 'text-rose-500' },
  teal: { ring: 'bg-teal-50', fg: 'text-teal-600' },
  brand: { ring: 'bg-surface-subtle', fg: 'text-text-brand' },
};

/** Visual (icon + colour tone) per seeded service code, keyword fallback otherwise. */
const SERVICE_VISUALS: Record<string, { icon: LucideIcon; tone: string }> = {
  PASSPORT: { icon: BookUser, tone: 'green' },
  VISA_INFO: { icon: CreditCard, tone: 'blue' },
  DOC_AUTH: { icon: FileBadge, tone: 'orange' },
  BIRTH_CERT: { icon: ScrollText, tone: 'purple' },
  DIASPORA_REG: { icon: UserPlus, tone: 'rose' },
  NOTARIAL: { icon: ClipboardList, tone: 'teal' },
  POWER_ATTORNEY: { icon: Briefcase, tone: 'blue' },
  EMERGENCY_TRAVEL: { icon: Plane, tone: 'green' },
};
const POPULAR_ICONS: Record<string, LucideIcon> = {
  BookUser,
  CreditCard,
  FileBadge,
  ScrollText,
  Briefcase,
};

function visualFor(svc: ServiceRequestType): { icon: LucideIcon; tone: string } {
  if (svc.code && SERVICE_VISUALS[svc.code]) return SERVICE_VISUALS[svc.code];
  const n = svc.displayName.toLowerCase();
  if (n.includes('passport')) return { icon: BookUser, tone: 'green' };
  if (n.includes('visa')) return { icon: CreditCard, tone: 'blue' };
  if (n.includes('document') || n.includes('authentic')) return { icon: FileBadge, tone: 'orange' };
  if (n.includes('birth') || n.includes('certificate')) return { icon: ScrollText, tone: 'purple' };
  if (n.includes('regist') || n.includes('diaspora')) return { icon: UserPlus, tone: 'rose' };
  if (n.includes('notar')) return { icon: ClipboardList, tone: 'teal' };
  if (n.includes('attorney') || n.includes('power')) return { icon: Briefcase, tone: 'blue' };
  if (n.includes('travel') || n.includes('emergency')) return { icon: Plane, tone: 'green' };
  return { icon: FileText, tone: 'brand' };
}

interface EmbassyServicesTabProps {
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

/** Services = catalog of consular service/request types from service-request-service. */
export function EmbassyServicesTab({ community, profile }: EmbassyServicesTabProps) {
  const t = useTranslations('community.embassy.services');
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedServiceId = searchParams.get('service');
  const applyMode = searchParams.get('apply') === '1';

  const { data, loading } = useQuery<ServiceRequestTypesResponse>(SERVICE_REQUEST_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: community.id },
    fetchPolicy: 'cache-and-network',
  });

  /** `?tab=services&service=<id>` link for a service card's "View Details". */
  function detailHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'services');
    params.set('service', id);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  const services = useMemo(() => {
    const all = (data?.serviceRequestTypes ?? []).filter((s) => s.isActive !== false);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  // Apply wizard — `?service=<id>&apply=1` replaces the grid with the 6-step
  // application flow. Checked before the detail view so apply mode wins.
  if (selectedServiceId && applyMode) {
    return (
      <EmbassyServiceApply
        serviceId={selectedServiceId}
        community={community}
        profile={profile}
      />
    );
  }

  // Detail view — when `?service=<id>` is present, replace the grid entirely.
  if (selectedServiceId) {
    return (
      <EmbassyServiceDetail
        serviceId={selectedServiceId}
        community={community}
        profile={profile}
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_20rem] lg:px-6">
      {/* Main column */}
      <div className="min-w-0 space-y-6">
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            {/* Header + search */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="heading-xsmall text-text-primary">{t('title')}</h2>
                <p className="body-small text-text-secondary">{t('subtitle')}</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full rounded-lg border border-border-subtle bg-surface-default py-2 pl-9 pr-3 body-small text-text-primary outline-none focus:border-border-brand"
                />
              </div>
            </div>

            {/* Grid */}
            {loading && services.length === 0 ? (
              <ServiceGridSkeleton />
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
                  {search ? (
                    <Search className="size-6 text-text-secondary" aria-hidden />
                  ) : (
                    <Briefcase className="size-6 text-text-secondary" aria-hidden />
                  )}
                </span>
                <p className="body-small text-text-primary">
                  {search ? t('noResults') : t('empty')}
                </p>
                {!search && (
                  <p className="caption-medium mt-1 text-text-secondary">{t('emptyHelp')}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {services.map((svc) => {
                  const { icon: Icon, tone } = visualFor(svc);
                  const c = TONES[tone] ?? TONES.brand;
                  return (
                    <div
                      key={svc.id}
                      className="flex flex-col items-center rounded-xl border border-border-subtle p-4 text-center transition-shadow hover:shadow-sm"
                    >
                      <span
                        className={`mb-3 flex size-14 items-center justify-center rounded-full ${c.ring}`}
                      >
                        <Icon className={`size-6 ${c.fg}`} aria-hidden />
                      </span>
                      <p className="label-medium text-text-primary">{svc.displayName}</p>
                      {svc.description && (
                        <p className="caption-small mt-1 line-clamp-2 flex-1 text-text-secondary">
                          {svc.description}
                        </p>
                      )}
                      <Link
                        href={detailHref(svc.id)}
                        scroll={false}
                        className="label-medium mt-3 block w-full rounded-lg border border-border-subtle py-1.5 text-center text-text-brand transition-colors hover:bg-surface-subtle"
                      >
                        {t('viewDetails')}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust banner */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-success p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 flex-shrink-0 text-text-success" aria-hidden />
            <div>
              <p className="label-medium text-text-primary">{t('secureTitle')}</p>
              <p className="caption-medium text-text-secondary">
                {t('secureBody', { name: community.name })}
              </p>
            </div>
          </div>
          <Lock className="size-5 flex-shrink-0 text-text-success" aria-hidden />
        </div>
      </div>

      {/* Right rail */}
      <aside className="space-y-6">
        {/* Need help */}
        <div className="rounded-xl border border-border-subtle bg-surface-brand-subtle p-5">
          <p className="label-medium flex items-center gap-2 text-text-primary">
            <Info className="size-4 text-text-brand" aria-hidden />
            {t('needHelpTitle')}
          </p>
          <p className="body-small mt-1 text-text-secondary">{t('needHelpBody')}</p>
          <a href={`tel:${community.contactPhone || profile.phone}`} className="mt-3 block">
            <span className="block w-full rounded-lg border border-border-brand bg-surface-default py-2 text-center label-medium text-text-brand">
              {t('contactEmbassy')}
            </span>
          </a>
        </div>

        {/* Popular services */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large mb-3 text-text-primary">{t('popularServices')}</h3>
            <ul className="space-y-3">
              {EMBASSY_POPULAR_SERVICES.map((p) => {
                const Icon = POPULAR_ICONS[p.icon] ?? FileText;
                const c = TONES[p.tone] ?? TONES.brand;
                return (
                  <li key={p.rank} className="flex items-center gap-3">
                    <span className={`flex size-8 flex-shrink-0 items-center justify-center rounded-md ${c.ring}`}>
                      <Icon className={`size-4 ${c.fg}`} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="caption-large block truncate text-text-primary">{p.name}</span>
                      <span className="caption-small block truncate text-text-secondary">
                        {p.subtitle}
                      </span>
                    </span>
                    <span className={`caption-small rounded-md px-1.5 py-0.5 ${c.ring} ${c.fg}`}>
                      {p.rank}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Service hours */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <p className="label-large flex items-center gap-2 text-text-primary">
              <Clock className="size-4 text-text-success" aria-hidden />
              {t('serviceHours')}
            </p>
            <p className="caption-medium mt-1 text-text-secondary">{t('serviceHoursAvail')}</p>
            <p className="caption-medium mt-3 flex items-center gap-2 text-text-primary">
              <CalendarDays className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
              {profile.officeHours}
            </p>
            <p className="caption-medium mt-2 flex items-center gap-2 text-text-secondary">
              <CalendarDays className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
              {t('closedDays')}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default EmbassyServicesTab;
