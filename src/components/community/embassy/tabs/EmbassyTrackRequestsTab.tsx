'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  Search,
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
  UserCog,
  ShieldCheck,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  MY_SERVICE_REQUESTS,
  SERVICE_REQUEST_TYPES,
  type MyServiceRequestsResponse,
  type ServiceRequestSummary,
  type ServiceRequestTypesResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';
import { useIsEmbassy } from '../communityVariant';
import { EmbassyTrackRequestDetail } from './EmbassyTrackRequestDetail';
import { CancelRequestDialog } from './CancelRequestDialog';
import { type Bucket, STEP_KEYS, statusBucket, bucketStep, BUCKET_PILL } from './requestStatus';

/** Statuses for which the requester may still cancel the request. */
const CANCELLABLE = new Set(['SUBMITTED', 'UNDER_REVIEW', 'PENDING_INFO']);
function canCancel(status: string): boolean {
  return CANCELLABLE.has((status || '').toUpperCase());
}

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

interface EmbassyTrackRequestsTabProps {
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

export function EmbassyTrackRequestsTab({ community, profile }: EmbassyTrackRequestsTabProps) {
  const t = useTranslations('community.embassy.track');
  const isEmbassy = useIsEmbassy();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedRequestId = searchParams.get('request');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Bucket>('all');
  const [page, setPage] = useState(1);
  // The request the "…" menu is asking to cancel (null = dialog closed).
  const [cancelTarget, setCancelTarget] = useState<ServiceRequestSummary | null>(null);

  /**
   * Share the community: prefer the native share sheet, else copy the link to
   * the clipboard. Guarded for SSR (no `window`/`navigator`).
   */
  async function handleInvite() {
    if (typeof window === 'undefined') return;
    const url = window.location.href || `/community/${community.id}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t('actions.inviteCopied'));
    } catch {
      // user cancelled the share sheet — no error needed
    }
  }

  const { data, loading } = useQuery<MyServiceRequestsResponse>(MY_SERVICE_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: typesData } = useQuery<ServiceRequestTypesResponse>(SERVICE_REQUEST_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: community.id },
    fetchPolicy: 'cache-and-network',
  });

  const typeName = useMemo(
    () => new Map((typesData?.serviceRequestTypes ?? []).map((tp) => [tp.id, tp.displayName])),
    [typesData],
  );

  // Scope to THIS community only: the backend returns the viewer's requests
  // across all owners, so filter to COMMUNITY requests for this community id.
  const requests = useMemo(
    () =>
      (data?.myServiceRequests ?? []).filter(
        (r) => r.ownerType === 'COMMUNITY' && r.ownerEntityId === community.id,
      ),
    [data, community.id],
  );

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

  /** "View Details" opens the request detail view (`?request=<id>`). */
  function requestHref(requestId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'track-requests');
    params.set('request', requestId);
    params.delete('service');
    params.delete('apply');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  // Detail view — when `?request=<id>` is present, replace the list entirely
  // (mirrors the Services tab's `?service=` early-return).
  if (selectedRequestId) {
    return (
      <EmbassyTrackRequestDetail
        requestId={selectedRequestId}
        community={community}
        profile={profile}
      />
    );
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
          <ListSkeleton />
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
                  detailHref={requestHref(req.id)}
                  onCancel={canCancel(req.status) ? () => setCancelTarget(req) : undefined}
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

      {/* ── Right rail ──
          On mobile the rail sits ABOVE the list (`order-first`) so the summary
          tiles lead; on desktop it returns to the right column (`lg:order-none`). */}
      <aside className="order-first space-y-6 lg:order-none">
        {/* Request summary */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large mb-3 flex items-center gap-2 text-text-primary">
              <ClipboardList className="size-4 text-text-brand" aria-hidden />
              {t('summary.title')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
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
                subtitle={isEmbassy ? t('actions.createSub') : 'Request a new service from the community'}
                href={tabHref('services')}
              />
              <QuickAction
                icon={LayoutGrid}
                tone="blue"
                title={t('actions.services')}
                subtitle={isEmbassy ? t('actions.servicesSub') : 'Explore all available community services'}
                href={tabHref('services')}
              />
              <QuickAction
                icon={UserCog}
                tone="purple"
                title={t('actions.profile')}
                subtitle={t('actions.profileSub')}
                href="/settings"
              />
              <QuickAction
                icon={Share2}
                tone="teal"
                title={t('actions.invite')}
                subtitle={isEmbassy ? t('actions.inviteSub') : 'Share this community with others'}
                onClick={handleInvite}
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

      {/* Cancel confirm — driven by the row "…" menu. */}
      <CancelRequestDialog
        requestId={cancelTarget?.id ?? null}
        requestNumber={cancelTarget?.requestNumber}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      />
    </div>
  );
}

/* ── inline list skeleton ────────────────────────────────────────────────── */
function ListSkeleton() {
  return (
    <ul className="space-y-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="border-border-subtle">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                <div className="flex items-start gap-3 lg:w-56 lg:flex-shrink-0">
                  <span className="size-11 flex-shrink-0 animate-pulse rounded-lg bg-surface-subtle" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="block h-3.5 w-3/4 animate-pulse rounded bg-surface-subtle" />
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-subtle" />
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-surface-subtle" />
                  </div>
                </div>
                <div className="space-y-2 lg:w-52 lg:flex-shrink-0">
                  <span className="block h-5 w-24 animate-pulse rounded-full bg-surface-subtle" />
                  <span className="block h-3 w-32 animate-pulse rounded bg-surface-subtle" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block h-2 w-full animate-pulse rounded bg-surface-subtle" />
                </div>
                <div className="lg:w-28 lg:flex-shrink-0">
                  <span className="block h-9 w-full animate-pulse rounded-lg bg-surface-subtle" />
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/* ── request card ─────────────────────────────────────────────────────────── */
interface RequestCardProps {
  req: ServiceRequestSummary;
  name: string;
  category: string;
  detailHref: { pathname: string; query: Record<string, string> };
  /** Present only when the request may still be cancelled. */
  onCancel?: () => void;
  t: ReturnType<typeof useTranslations>;
}

function RequestCard({ req, name, category, detailHref, onCancel, t }: RequestCardProps) {
  const bucket = statusBucket(req.status);
  const { icon: Icon, tone } = visualForName(name);
  const c = TONES[tone] ?? TONES.brand;

  return (
    <Card className="border-border-subtle transition-shadow hover:shadow-sm">
      <CardContent className="relative p-4 sm:p-5">
        {/* "…" menu: View details + (when allowed) Cancel request. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-subtle"
              aria-label={t('menu.label')}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-default">
            <DropdownMenuItem asChild>
              <Link href={detailHref} scroll={false}>
                {t('viewDetails')}
              </Link>
            </DropdownMenuItem>
            {onCancel && (
              <DropdownMenuItem variant="destructive" onSelect={onCancel}>
                {t('menu.cancel')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
  onClick,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  subtitle: string;
  href?: string | { pathname: string; query: Record<string, string> };
  onClick?: () => void;
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
        <button
          type="button"
          onClick={onClick}
          className="block w-full transition-colors hover:opacity-80"
        >
          {inner}
        </button>
      )}
    </li>
  );
}

export default EmbassyTrackRequestsTab;
