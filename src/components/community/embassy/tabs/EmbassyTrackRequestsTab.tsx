'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  Search,
  SlidersHorizontal,
  Check,
  X,
  CalendarDays,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  BookUser,
  CreditCard,
  FileBadge,
  ScrollText,
  UserPlus,
  ClipboardList,
  Briefcase,
  Plane,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Headphones,
  FilePlus2,
  LayoutGrid,
  Download,
  UserCog,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  MY_SERVICE_REQUESTS,
  SERVICE_REQUEST_TYPES,
  type MyServiceRequestsResponse,
  type ServiceRequestSummary,
  type ServiceRequestTypesResponse,
} from '@/services/gql/embassyServices';

/* ── status model ─────────────────────────────────────────────────────────
   The backend returns a free-form status string; we normalize it into one of
   five buckets that drive the filter chips, the status pill, and the 4-step
   progress stepper (Submitted → Review → Approved → Completed). */
type Bucket = 'pending' | 'review' | 'approved' | 'completed' | 'rejected';

const STEP_KEYS = ['submitted', 'review', 'approved', 'completed'] as const;

function statusBucket(status: string): Bucket {
  const s = (status || '').toUpperCase();
  if (s.includes('REJECT') || s.includes('CANCEL') || s.includes('DENIED') || s.includes('DECLINE'))
    return 'rejected';
  if (s.includes('COMPLETE') || s.includes('CLOSED') || s.includes('FULFILLED') || s.includes('DELIVERED'))
    return 'completed';
  if (s.includes('APPROVE') || s.includes('DECIDED') || s.includes('GRANTED')) return 'approved';
  if (s.includes('REVIEW') || s.includes('PROCESS') || s.includes('PROGRESS') || s.includes('INFO'))
    return 'review';
  return 'pending'; // SUBMITTED / PENDING / DRAFT / AWAITING
}

/** Index of the current step (0-3) for the stepper. */
function bucketStep(bucket: Bucket): number {
  switch (bucket) {
    case 'pending':
      return 0;
    case 'review':
    case 'rejected':
      return 1;
    case 'approved':
      return 2;
    case 'completed':
      return 3;
  }
}

/** Pill colour per bucket (light surface + matching text). */
const BUCKET_PILL: Record<Bucket, string> = {
  pending: 'bg-amber-50 text-amber-600',
  review: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600',
  completed: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
};

/* ── per-request visual (icon + tone), keyed by service name ─────────────── */
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

function visualForName(name: string): { icon: LucideIcon; tone: string } {
  const n = name.toLowerCase();
  if (n.includes('passport')) return { icon: BookUser, tone: 'green' };
  if (n.includes('visa')) return { icon: CreditCard, tone: 'blue' };
  if (n.includes('document') || n.includes('authentic')) return { icon: FileBadge, tone: 'orange' };
  if (n.includes('birth') || n.includes('certificate')) return { icon: ScrollText, tone: 'purple' };
  if (n.includes('regist') || n.includes('diaspora')) return { icon: UserPlus, tone: 'rose' };
  if (n.includes('notar')) return { icon: ClipboardList, tone: 'teal' };
  if (n.includes('attorney') || n.includes('power')) return { icon: Briefcase, tone: 'blue' };
  if (n.includes('travel') || n.includes('emergency') || n.includes('assist')) return { icon: Plane, tone: 'green' };
  return { icon: FileText, tone: 'brand' };
}

/** Humanize a backend category code, e.g. "visa_info" → "Visa Info". */
function humanizeCategory(code?: string | null): string | null {
  if (!code) return null;
  return code
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 5;
const CHIPS: Array<'all' | Bucket> = ['all', 'pending', 'review', 'approved', 'completed', 'rejected'];

export function EmbassyTrackRequestsTab({ communityId }: { communityId: string }) {
  const t = useTranslations('community.embassy.track');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Bucket>('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useQuery<MyServiceRequestsResponse>(MY_SERVICE_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: typesData } = useQuery<ServiceRequestTypesResponse>(SERVICE_REQUEST_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: communityId },
    fetchPolicy: 'cache-and-network',
  });

  const typeName = useMemo(
    () => new Map((typesData?.serviceRequestTypes ?? []).map((tp) => [tp.id, tp.displayName])),
    [typesData],
  );

  const requests = data?.myServiceRequests ?? [];

  /** Bucket counts for the filter chips + the right-rail summary tiles. */
  const counts = useMemo(() => {
    const acc: Record<string, number> = { all: requests.length, pending: 0, review: 0, approved: 0, completed: 0, rejected: 0 };
    for (const r of requests) acc[statusBucket(r.status)] += 1;
    return acc;
  }, [requests]);

  /** Apply chip filter + text search. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== 'all' && statusBucket(r.status) !== filter) return false;
      if (!q) return true;
      const name = (typeName.get(r.requestTypeId) ?? r.category ?? '').toLowerCase();
      return name.includes(q) || r.requestNumber.toLowerCase().includes(q);
    });
  }, [requests, filter, search, typeName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** Build a `{pathname, query}` href to another tab (drops detail params). */
  function tabHref(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.delete('service');
    params.delete('apply');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  /** "View Details" goes to the underlying service in the Services tab. */
  function serviceHref(requestTypeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'services');
    params.set('service', requestTypeId);
    params.delete('apply');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  return (
    <div className="mx-auto grid max-w-8xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_20rem] lg:px-6">
      {/* ── Main column ── */}
      <div className="min-w-0 space-y-5">
        {/* Header + search/filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="heading-xsmall text-text-primary">{t('title')}</h2>
            <p className="body-small text-text-secondary">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-lg border border-border-subtle bg-surface-default py-2 pl-9 pr-3 body-small text-text-primary outline-none focus:border-border-brand"
              />
            </div>
            <button
              type="button"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 label-medium text-text-secondary transition-colors hover:bg-surface-subtle"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              {t('filter')}
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {CHIPS.map((key) => {
            const active = filter === key;
            const label = key === 'all' ? t('filters.all') : t(`filters.${key}`);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 label-medium transition-colors',
                  active
                    ? 'bg-surface-brand text-text-white'
                    : 'border border-border-subtle text-text-secondary hover:text-text-primary',
                )}
              >
                {label}
                <span
                  className={cn(
                    'caption-small rounded-full px-1.5',
                    active ? 'bg-white/20 text-text-white' : 'bg-surface-subtle text-text-secondary',
                  )}
                >
                  {counts[key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading && requests.length === 0 ? (
          <p className="body-small py-6 text-text-secondary">{t('loading')}</p>
        ) : requests.length === 0 ? (
          <Card className="border-border-subtle">
            <CardContent className="p-10 text-center">
              <ClipboardList className="mx-auto size-8 text-text-secondary" aria-hidden />
              <p className="label-medium mt-3 text-text-primary">{t('empty')}</p>
            </CardContent>
          </Card>
        ) : paged.length === 0 ? (
          <p className="body-small py-6 text-text-secondary">{t('noResults')}</p>
        ) : (
          <ul className="space-y-4">
            {paged.map((req) => (
              <li key={req.id}>
                <RequestCard
                  req={req}
                  name={typeName.get(req.requestTypeId) ?? req.category ?? t('request')}
                  category={humanizeCategory(req.category) ?? t('category')}
                  detailHref={serviceHref(req.requestTypeId)}
                  t={t}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex size-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === safePage ? 'page' : undefined}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg label-medium transition-colors',
                  p === safePage
                    ? 'bg-surface-brand text-text-white'
                    : 'border border-border-subtle text-text-secondary hover:bg-surface-subtle',
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex size-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* ── Right rail ── */}
      <aside className="space-y-6">
        {/* Request summary */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large mb-3 flex items-center gap-2 text-text-primary">
              <ClipboardList className="size-4 text-text-brand" aria-hidden />
              {t('summary.title')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile icon={ClipboardList} tone="brand" value={counts.all} label={t('summary.total')} />
              <SummaryTile icon={Clock} tone="orange" value={counts.pending} label={t('summary.pending')} />
              <SummaryTile icon={Loader2} tone="blue" value={counts.review} label={t('summary.review')} />
              <SummaryTile icon={CheckCircle2} tone="green" value={counts.completed} label={t('summary.completed')} />
            </div>
          </CardContent>
        </Card>

        {/* Need more help */}
        <div className="rounded-xl border border-border-subtle bg-surface-brand-subtle p-5">
          <p className="label-medium flex items-center gap-2 text-text-primary">
            <HelpCircle className="size-4 text-text-brand" aria-hidden />
            {t('help.title')}
          </p>
          <p className="body-small mt-1 text-text-secondary">{t('help.body')}</p>
          <Link href={tabHref('support')} scroll={false} className="mt-3 block">
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-brand bg-surface-default py-2 label-medium text-text-brand">
              <Headphones className="size-4" aria-hidden />
              {t('help.contact')}
            </span>
          </Link>
        </div>

        {/* Quick actions */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large mb-2 text-text-primary">{t('actions.title')}</h3>
            <ul className="divide-y divide-border-subtle">
              <QuickAction
                icon={FilePlus2}
                tone="rose"
                title={t('actions.create')}
                subtitle={t('actions.createSub')}
                href={tabHref('services')}
              />
              <QuickAction
                icon={LayoutGrid}
                tone="blue"
                title={t('actions.services')}
                subtitle={t('actions.servicesSub')}
                href={tabHref('services')}
              />
              <QuickAction
                icon={Download}
                tone="green"
                title={t('actions.documents')}
                subtitle={t('actions.documentsSub')}
              />
              <QuickAction
                icon={UserCog}
                tone="purple"
                title={t('actions.profile')}
                subtitle={t('actions.profileSub')}
              />
            </ul>
          </CardContent>
        </Card>

        {/* Secure note */}
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-brand-subtle p-4">
          <ShieldCheck className="mt-0.5 size-5 flex-shrink-0 text-text-brand" aria-hidden />
          <div>
            <p className="label-medium text-text-brand">{t('secure.title')}</p>
            <p className="caption-medium text-text-secondary">{t('secure.body')}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── request card ─────────────────────────────────────────────────────────── */
interface RequestCardProps {
  req: ServiceRequestSummary;
  name: string;
  category: string;
  detailHref: { pathname: string; query: Record<string, string> };
  t: ReturnType<typeof useTranslations>;
}

function RequestCard({ req, name, category, detailHref, t }: RequestCardProps) {
  const bucket = statusBucket(req.status);
  const { icon: Icon, tone } = visualForName(name);
  const c = TONES[tone] ?? TONES.brand;

  return (
    <Card className="border-border-subtle transition-shadow hover:shadow-sm">
      <CardContent className="relative p-4 sm:p-5">
        <button
          type="button"
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-subtle"
          aria-label="More options"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
          {/* Identity */}
          <div className="flex items-start gap-3 lg:w-56 lg:flex-shrink-0">
            <span className={cn('flex size-11 flex-shrink-0 items-center justify-center rounded-lg', c.ring)}>
              <Icon className={cn('size-5', c.fg)} aria-hidden />
            </span>
            <div className="min-w-0 pr-6 lg:pr-0">
              <p className="label-medium text-text-primary">{name}</p>
              <p className="caption-small text-text-secondary">
                {t('requestId')}: {req.requestNumber}
              </p>
              <p className="caption-small mt-0.5 flex items-center gap-1 text-text-secondary">
                <CalendarDays className="size-3.5 flex-shrink-0" aria-hidden />
                {t('submitted')}: {formatDate(req.submittedAt)}
              </p>
              <span className="caption-small mt-2 inline-block rounded-md bg-surface-subtle px-2 py-0.5 text-text-secondary">
                {category}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="lg:w-52 lg:flex-shrink-0">
            <p className="caption-small text-text-secondary">{t('statusLabel')}</p>
            <span className={cn('caption-medium mt-1 inline-block rounded-full px-2.5 py-0.5 font-medium', BUCKET_PILL[bucket])}>
              {t(`filters.${bucket}`)}
            </span>
            <p className="caption-small mt-2 text-text-secondary">
              {t('lastUpdate')}: {formatDate(req.updatedAt) || formatDate(req.submittedAt)}
            </p>
            <p className="caption-small mt-0.5 text-text-secondary">{t(`messages.${bucket}`)}</p>
          </div>

          {/* Stepper */}
          <div className="min-w-0 flex-1">
            <Stepper bucket={bucket} t={t} />
          </div>

          {/* Action */}
          <div className="lg:w-28 lg:flex-shrink-0">
            <Link
              href={detailHref}
              scroll={false}
              className="label-medium block w-full rounded-lg border border-border-brand py-2 text-center text-text-brand transition-colors hover:bg-surface-subtle"
            >
              {t('viewDetails')}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 4-step progress stepper ─────────────────────────────────────────────── */
function Stepper({ bucket, t }: { bucket: Bucket; t: ReturnType<typeof useTranslations> }) {
  const step = bucketStep(bucket);
  const rejected = bucket === 'rejected';
  const completed = bucket === 'completed';

  return (
    <div className="flex items-center">
      {STEP_KEYS.map((key, i) => {
        const done = i < step || (completed && i === step);
        const active = i === step && !completed;
        const isRejectNode = rejected && i === step;

        return (
          <div key={key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border transition-colors',
                  isRejectNode
                    ? 'border-red-500 bg-red-500 text-white'
                    : done
                      ? 'border-green-500 bg-green-500 text-white'
                      : active
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-border-subtle bg-surface-default text-text-secondary',
                )}
              >
                {isRejectNode ? (
                  <X className="size-3.5" aria-hidden />
                ) : done ? (
                  <Check className="size-3.5" aria-hidden />
                ) : active ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : null}
              </span>
              <span
                className={cn(
                  'caption-small mt-1 whitespace-nowrap',
                  done || active ? 'text-text-primary' : 'text-text-secondary',
                )}
              >
                {t(`steps.${key}`)}
              </span>
            </div>
            {i < STEP_KEYS.length - 1 && (
              <span className={cn('mx-1.5 h-0.5 flex-1', i < step && !rejected ? 'bg-green-500' : 'bg-border-subtle')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── right-rail summary tile ─────────────────────────────────────────────── */
function SummaryTile({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: LucideIcon;
  tone: string;
  value: number;
  label: string;
}) {
  const c = TONES[tone] ?? TONES.brand;
  return (
    <div className="rounded-lg border border-border-subtle p-3">
      <span className={cn('flex size-8 items-center justify-center rounded-lg', c.ring)}>
        <Icon className={cn('size-4', c.fg)} aria-hidden />
      </span>
      <p className="heading-xsmall mt-2 text-text-primary">{value}</p>
      <p className="caption-small text-text-secondary">{label}</p>
    </div>
  );
}

/* ── right-rail quick-action row ─────────────────────────────────────────── */
function QuickAction({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  subtitle: string;
  href?: { pathname: string; query: Record<string, string> };
}) {
  const c = TONES[tone] ?? TONES.brand;
  const inner = (
    <span className="flex w-full items-center gap-3 py-3 text-left">
      <span className={cn('flex size-9 flex-shrink-0 items-center justify-center rounded-lg', c.ring)}>
        <Icon className={cn('size-4', c.fg)} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="caption-large block text-text-primary">{title}</span>
        <span className="caption-small block truncate text-text-secondary">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
    </span>
  );

  return (
    <li>
      {href ? (
        <Link href={href} scroll={false} className="block transition-colors hover:opacity-80">
          {inner}
        </Link>
      ) : (
        <button type="button" className="block w-full transition-colors hover:opacity-80">
          {inner}
        </button>
      )}
    </li>
  );
}

export default EmbassyTrackRequestsTab;
