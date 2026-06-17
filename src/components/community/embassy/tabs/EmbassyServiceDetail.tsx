'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  Heart,
  Share2,
  Info,
  Star,
  Mail,
  Phone,
  CalendarDays,
  MessageSquare,
  AlertTriangle,
  BookUser,
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
  SERVICE_REQUEST_TYPES_DETAIL,
  type ServiceRequestTypeDetail,
  type ServiceRequestTypesDetailResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';

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

function visualFor(svc: ServiceRequestTypeDetail): { icon: LucideIcon; tone: string } {
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

/** Format an integer minor-unit fee (e.g. 9000 + EUR → "€90.00"). */
function formatFee(minor?: number | null, currency?: string | null): string | null {
  if (minor === undefined || minor === null) return null;
  if (minor === 0) return 'Free';
  const code = (currency || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${code}`;
  }
}

const SUB_TABS = ['Overview', 'Requirements', 'Process', 'Fees', 'FAQ', 'Contact'] as const;
type SubTab = (typeof SUB_TABS)[number];

const MOCK_WHO_CAN_APPLY: ReadonlyArray<string> = [
  'Citizens residing abroad with valid identification',
  'Registered members of this community',
  'Applicants over 18 (or with a legal guardian)',
];

const MOCK_PROCESS_STEPS: ReadonlyArray<{ title: string; body: string }> = [
  { title: 'Submit your application', body: 'Complete the online form and attach the required documents.' },
  { title: 'Initial review', body: 'Our team verifies your submission and documents.' },
  { title: 'Pay the service fee', body: 'Settle any applicable fee securely online.' },
  { title: 'Processing', body: 'Your request is processed by the consular team.' },
  { title: 'Notification', body: 'You are notified once a decision is made.' },
  { title: 'Collection / delivery', body: 'Collect your document or receive it by post.' },
];

const MOCK_IMPORTANT_NOTES: ReadonlyArray<string> = [
  'Ensure all documents are valid and up to date.',
  'Processing times are estimates and may vary.',
  'Fees are non-refundable once processing has started.',
];

interface EmbassyServiceDetailProps {
  serviceId: string;
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

/**
 * Rich detail screen for a single consular service (request-type). Lives inside
 * the Services tab and is reached via `?tab=services&service=<id>`.
 *
 * The live gateway has no single-type query, so we fetch the owner-scoped list
 * (`serviceRequestTypes`) and pick the matching id client-side. Real data:
 * displayName, description, isActive, fee (feeAmountMinor / feeCurrency),
 * formFields, the community as provider, and the other types as related
 * services. Everything else (process steps, ratings, processing time, FAQ,
 * who-can-apply, notes) is graceful mock content.
 */
export function EmbassyServiceDetail({ serviceId, community, profile }: EmbassyServiceDetailProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [subTab, setSubTab] = useState<SubTab>('Overview');

  const { data, loading } = useQuery<ServiceRequestTypesDetailResponse>(
    SERVICE_REQUEST_TYPES_DETAIL,
    {
      variables: { ownerType: 'COMMUNITY', ownerEntityId: community.id },
      fetchPolicy: 'cache-and-network',
    },
  );

  const all = data?.serviceRequestTypes ?? [];
  const service = useMemo(() => all.find((s) => s.id === serviceId), [all, serviceId]);
  const related = useMemo(
    () => all.filter((s) => s.id !== serviceId && s.isActive !== false).slice(0, 4),
    [all, serviceId],
  );

  /** Back link to the services grid (drops the `service` param, keeps the rest). */
  const backHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'services');
    params.delete('service');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams]);

  /** Href to the apply wizard for this service (`service=<id>&apply=1`). */
  const applyHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'services');
    params.set('service', serviceId);
    params.set('apply', '1');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams, serviceId]);

  /** Href to another service's detail view. */
  function serviceHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'services');
    params.set('service', id);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  if (loading && all.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
        <p className="body-small text-text-secondary">Loading service…</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
        <Link
          href={backHref}
          scroll={false}
          className="label-medium inline-flex items-center gap-1 text-text-brand"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Services
        </Link>
        <p className="body-small mt-6 text-text-secondary">
          This service could not be found. It may have been removed.
        </p>
      </div>
    );
  }

  const { icon: Icon, tone } = visualFor(service);
  const c = TONES[tone] ?? TONES.brand;
  const isActive = service.isActive !== false;
  const feeLabel = formatFee(service.feeAmountMinor, service.feeCurrency) ?? '—';
  const providerName = community.name;
  const providerAvatar = community.avatarUrl || profile.flagUrl || '/GLOBE.png';
  const contactEmail = community.contactEmail || profile.email;
  const contactPhone = community.contactPhone || profile.phone;
  const officeHours = profile.officeHours;

  const keyRequirements: string[] =
    service.formFields && service.formFields.length > 0
      ? service.formFields.map((f) => f.label || f.key)
      : [
          'Valid passport or national ID',
          'Recent passport-size photograph',
          'Proof of residence abroad',
          'Completed application form',
        ];
  const shownRequirements = keyRequirements.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
      {/* Breadcrumb / back */}
      <div className="mb-4 flex items-center gap-1 caption-medium text-text-secondary">
        <Link
          href={backHref}
          scroll={false}
          className="label-medium inline-flex items-center gap-1 text-text-brand hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Services
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-text-primary">{service.displayName}</span>
      </div>

      {/* Header card */}
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-4">
                <span
                  className={`flex size-14 flex-shrink-0 items-center justify-center rounded-xl ${c.ring}`}
                >
                  <Icon className={`size-7 ${c.fg}`} aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="heading-xsmall text-text-primary">{service.displayName}</h1>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 caption-small font-medium text-green-600">
                        <CheckCircle2 className="size-3" aria-hidden />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 caption-small font-medium text-text-secondary">
                        Inactive
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="body-small mt-1 text-text-secondary">{service.description}</p>
                  )}
                </div>
              </div>

              {/* Stat row */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat
                  icon={Clock}
                  tone="blue"
                  label="Estimated Processing Time"
                  value="10–15 working days"
                />
                <Stat icon={CreditCard} tone="green" label="Service Fee" value={feeLabel} />
                <Stat icon={Building2} tone="purple" label="Provided By" value={providerName} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full flex-shrink-0 flex-col gap-2 lg:w-56">
              <Link
                href={applyHref}
                scroll={false}
                className="label-medium w-full rounded-lg bg-surface-brand px-4 py-2.5 text-center text-text-white transition-colors hover:opacity-90"
              >
                Apply for this Service
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="caption-large inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2 text-text-secondary transition-colors hover:bg-surface-subtle"
                >
                  <Heart className="size-4" aria-hidden />
                  Favorite
                </button>
                <button
                  type="button"
                  className="caption-large inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2 text-text-secondary transition-colors hover:bg-surface-subtle"
                >
                  <Share2 className="size-4" aria-hidden />
                  Share
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs */}
      <div className="mt-5 border-b border-border-subtle">
        <ul className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {SUB_TABS.map((tab) => {
            const active = tab === subTab;
            return (
              <li key={tab} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSubTab(tab)}
                  aria-current={active ? 'true' : undefined}
                  className={`whitespace-nowrap border-b-2 px-3 py-3 label-medium transition-colors ${
                    active
                      ? 'border-border-brand text-text-brand'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sub-tab content */}
      <div className="mt-5">
        {subTab === 'Overview' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
            {/* LEFT */}
            <div className="min-w-0 space-y-6">
              <Card className="border-border-subtle">
                <CardContent className="space-y-5 p-5">
                  <section>
                    <h2 className="label-large text-text-primary">About this Service</h2>
                    <p className="body-small mt-2 text-text-secondary">
                      {service.description ||
                        `Apply for ${service.displayName} provided by ${providerName}.`}
                    </p>
                  </section>

                  <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-brand-subtle p-3">
                    <Info className="mt-0.5 size-4 flex-shrink-0 text-text-brand" aria-hidden />
                    <p className="caption-medium text-text-secondary">
                      Please review all requirements carefully before applying. Incomplete
                      applications may delay processing.
                    </p>
                  </div>

                  <section>
                    <h3 className="label-medium text-text-primary">Who Can Apply</h3>
                    <ul className="mt-2 space-y-2">
                      {MOCK_WHO_CAN_APPLY.map((item) => (
                        <li key={item} className="flex items-start gap-2 caption-large text-text-secondary">
                          <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0 text-green-600" aria-hidden />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="label-medium text-text-primary">Key Requirements</h3>
                    <ul className="mt-2 space-y-2">
                      {shownRequirements.map((req) => (
                        <li key={req} className="flex items-start gap-2 caption-large text-text-secondary">
                          <FileText className="mt-0.5 size-4 flex-shrink-0 text-text-brand" aria-hidden />
                          {req}
                        </li>
                      ))}
                    </ul>
                    {keyRequirements.length > shownRequirements.length && (
                      <button
                        type="button"
                        onClick={() => setSubTab('Requirements')}
                        className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand"
                      >
                        View all requirements ({keyRequirements.length})
                        <ChevronRight className="size-4" aria-hidden />
                      </button>
                    )}
                  </section>

                  <section>
                    <h3 className="label-medium text-text-primary">Process Overview</h3>
                    <ol className="mt-3 space-y-3">
                      {MOCK_PROCESS_STEPS.map((step, i) => (
                        <li key={step.title} className="flex gap-3">
                          <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle caption-small font-semibold text-text-brand">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="caption-large text-text-primary">{step.title}</p>
                            <p className="caption-medium text-text-secondary">{step.body}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT rail */}
            <aside className="space-y-6">
              {/* Provider */}
              <Card className="border-border-subtle">
                <CardContent className="p-5">
                  <h3 className="label-large mb-3 text-text-primary">Service Provider</h3>
                  <div className="flex items-center gap-3">
                    <span className="relative size-12 flex-shrink-0 overflow-hidden rounded-full bg-surface-subtle">
                      <Image src={providerAvatar} alt={providerName} fill className="object-cover" />
                    </span>
                    <div className="min-w-0">
                      <p className="label-medium truncate text-text-primary">{providerName}</p>
                      <p className="caption-small flex items-center gap-1 text-text-secondary">
                        <Star className="size-3.5 text-yellow-500" aria-hidden />
                        4.8 · 128 reviews
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Important notes */}
              <Card className="border-border-subtle">
                <CardContent className="p-5">
                  <h3 className="label-large mb-3 flex items-center gap-2 text-text-primary">
                    <AlertTriangle className="size-4 text-orange-500" aria-hidden />
                    Important Notes
                  </h3>
                  <ul className="space-y-2">
                    {MOCK_IMPORTANT_NOTES.map((note) => (
                      <li key={note} className="caption-medium text-text-secondary">
                        • {note}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Need help */}
              <div className="rounded-xl border border-border-subtle bg-surface-brand-subtle p-5">
                <p className="label-medium flex items-center gap-2 text-text-primary">
                  <Info className="size-4 text-text-brand" aria-hidden />
                  Need Help?
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="caption-medium flex items-center gap-2 text-text-secondary">
                    <Mail className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                    <a href={`mailto:${contactEmail}`} className="truncate hover:underline">
                      {contactEmail}
                    </a>
                  </li>
                  <li className="caption-medium flex items-center gap-2 text-text-secondary">
                    <Phone className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                    <a href={`tel:${contactPhone}`} className="hover:underline">
                      {contactPhone}
                    </a>
                  </li>
                  <li className="caption-medium flex items-center gap-2 text-text-secondary">
                    <CalendarDays className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                    {officeHours}
                  </li>
                </ul>
                <button
                  type="button"
                  className="label-medium mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-brand bg-surface-default py-2 text-text-brand"
                >
                  <MessageSquare className="size-4" aria-hidden />
                  Send a Message
                </button>
              </div>

              {/* Related services */}
              {related.length > 0 && (
                <Card className="border-border-subtle">
                  <CardContent className="p-5">
                    <h3 className="label-large mb-3 text-text-primary">Related Services</h3>
                    <ul className="space-y-3">
                      {related.map((rel) => {
                        const rv = visualFor(rel);
                        const rc = TONES[rv.tone] ?? TONES.brand;
                        const RIcon = rv.icon;
                        return (
                          <li key={rel.id}>
                            <Link
                              href={serviceHref(rel.id)}
                              scroll={false}
                              className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-surface-subtle"
                            >
                              <span className={`flex size-8 flex-shrink-0 items-center justify-center rounded-md ${rc.ring}`}>
                                <RIcon className={`size-4 ${rc.fg}`} aria-hidden />
                              </span>
                              <span className="caption-large min-w-0 flex-1 truncate text-text-primary">
                                {rel.displayName}
                              </span>
                              <ChevronRight className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        ) : (
          <Card className="border-border-subtle">
            <CardContent className="p-8 text-center">
              <p className="label-medium text-text-primary">{subTab}</p>
              <p className="body-small mt-1 text-text-secondary">
                {subTab} details are coming soon.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface StatProps {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
}
function Stat({ icon: Icon, tone, label, value }: StatProps) {
  const c = TONES[tone] ?? TONES.brand;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle p-3">
      <span className={`flex size-9 flex-shrink-0 items-center justify-center rounded-lg ${c.ring}`}>
        <Icon className={`size-4 ${c.fg}`} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="caption-small text-text-secondary">{label}</p>
        <p className="caption-large truncate font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export default EmbassyServiceDetail;
