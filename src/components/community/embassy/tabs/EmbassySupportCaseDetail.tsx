'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  XCircle,
  Ban,
  Download,
  FileText,
  Image as ImageIcon,
  FileBadge,
  Info,
  ShieldCheck,
  Loader2,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SUPPORT_CASE,
  CASE_STATUS_HISTORY,
  CASE_EVIDENCE,
  CANCEL_CASE,
  type SupportCaseResponse,
  type CaseStatusHistoryResponse,
  type CaseStatusHistoryEntry,
  type CaseEvidenceResponse,
  type CaseEvidenceItem,
  type CancelCaseResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyViewProps } from '../types';
import { supportStatusBucket, SUPPORT_PILL } from './requestStatus';
import { formatDateProximity } from '@/macros/time';
import { useIsEmbassy } from '@/components/community/embassy/communityVariant';

/** Statuses for which the reporter may still withdraw the case. */
const CANCELLABLE = new Set(['SUBMITTED', 'ASSIGNED', 'INVESTIGATING', 'REOPENED']);

/** Evidence kind → icon (kind ∈ PDF | IMAGE | OTHER). */
function evidenceIcon(kind?: string | null): LucideIcon {
  switch ((kind || '').toUpperCase()) {
    case 'PDF':
      return FileText;
    case 'IMAGE':
      return ImageIcon;
    default:
      return FileBadge;
  }
}

/** Humanize a backend code, e.g. "consular_assist" → "Consular Assist". */
function humanize(code?: string | null): string {
  if (!code) return '';
  return code
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

interface EmbassySupportCaseDetailProps {
  caseId: string;
  community: EmbassyViewProps['community'];
}

/**
 * Detail view for a single support case, reached from the Support tab via
 * `?tab=support&case=<id>`. Mirrors EmbassyTrackRequestDetail's early-return +
 * back-link conventions.
 *
 * Three live queries feed it: `supportCase` (the case body), `caseStatusHistory`
 * (the reporter-visible timeline — `supportCase.statusHistory` is empty for
 * reporters), and `caseEvidence` (the attachments).
 */
export function EmbassySupportCaseDetail({ caseId }: EmbassySupportCaseDetailProps) {
  const t = useTranslations('community.embassy.support.detail');
  const isEmbassy = useIsEmbassy();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, loading, refetch } = useQuery<SupportCaseResponse>(SUPPORT_CASE, {
    variables: { id: caseId },
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: historyData,
    refetch: refetchHistory,
  } = useQuery<CaseStatusHistoryResponse>(CASE_STATUS_HISTORY, {
    variables: { caseId },
    fetchPolicy: 'cache-and-network',
  });
  const { data: evidenceData } = useQuery<CaseEvidenceResponse>(CASE_EVIDENCE, {
    variables: { caseId },
    fetchPolicy: 'cache-and-network',
  });

  const supportCase = data?.supportCase ?? null;
  const history = useMemo(() => historyData?.caseStatusHistory ?? [], [historyData]);
  // Confirmed evidence only (unconfirmed = abandoned uploads).
  const evidence = useMemo(
    () => (evidenceData?.caseEvidence ?? []).filter((e) => e.confirmed !== false),
    [evidenceData],
  );

  /** Back link clears the `case` param, keeps `tab=support`. */
  const backHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'support');
    params.delete('case');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams]);

  if (loading && !supportCase) {
    return <DetailSkeleton backHref={backHref} backLabel={t('back')} />;
  }

  if (!supportCase) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-6 lg:px-6">
        <Link
          href={backHref}
          scroll={false}
          className="label-medium inline-flex items-center gap-1 text-text-brand"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t('back')}
        </Link>
        <p className="body-small mt-6 text-text-secondary">{t('notFound')}</p>
      </div>
    );
  }

  const status = (supportCase.status || '').toUpperCase();
  const bucket = supportStatusBucket(status);
  const canCancel = CANCELLABLE.has(status);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 lg:px-6">
      {/* Breadcrumb / back */}
      <div className="mb-4 flex items-center gap-1 caption-medium text-text-secondary">
        <Link
          href={backHref}
          scroll={false}
          className="label-medium inline-flex items-center gap-1 text-text-brand hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t('back')}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-text-primary">{supportCase.caseNumber}</span>
      </div>

      {/* Header card */}
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="heading-xsmall text-text-primary">{supportCase.title}</h1>
                <span
                  className={`caption-medium inline-block rounded-full px-2.5 py-0.5 font-medium ${SUPPORT_PILL[bucket]}`}
                >
                  {t(`status.${bucket}`)}
                </span>
              </div>
              <p className="caption-small mt-1 text-text-secondary">
                {t('caseNumber')}: {supportCase.caseNumber}
              </p>
              {supportCase.priority && (
                <p className="caption-small mt-0.5 text-text-secondary">
                  {t('priority')}: {humanize(supportCase.priority)}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="caption-large inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
                >
                  <Ban className="size-4" aria-hidden />
                  {t('actions.cancel')}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body grid */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        {/* LEFT */}
        <div className="min-w-0 space-y-6">
          {/* Status timeline */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h2 className="label-large mb-4 text-text-primary">{t('timeline.title')}</h2>
              <StatusTimeline history={history} />
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h2 className="label-large mb-3 text-text-primary">{t('description.title')}</h2>
              {supportCase.description ? (
                <p className="body-small whitespace-pre-wrap text-text-secondary">
                  {supportCase.description}
                </p>
              ) : (
                <p className="body-small text-text-secondary">{t('description.empty')}</p>
              )}
            </CardContent>
          </Card>

          {/* Resolution */}
          {supportCase.resolutionSummary && (
            <Card className="border-green-200 bg-green-50/40">
              <CardContent className="p-5">
                <h2 className="label-large mb-2 flex items-center gap-2 text-text-primary">
                  <CheckCircle2 className="size-4 text-green-600" aria-hidden />
                  {t('resolution.title')}
                </h2>
                <p className="body-small whitespace-pre-wrap text-text-secondary">
                  {supportCase.resolutionSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Evidence */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h2 className="label-large mb-4 text-text-primary">{t('evidence.title')}</h2>
              <EvidenceList evidence={evidence} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT rail */}
        <aside className="space-y-6">
          {/* Need help */}
          <div className="rounded-xl border border-border-subtle bg-surface-brand-subtle p-5">
            <p className="label-medium flex items-center gap-2 text-text-primary">
              <Info className="size-4 text-text-brand" aria-hidden />
              {t('help.title')}
            </p>
            <p className="body-small mt-1 text-text-secondary">
              {isEmbassy ? t('help.body') : t('help.bodyGeneral')}
            </p>
          </div>

          {/* Secure note */}
          <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-brand-subtle p-4">
            <ShieldCheck className="mt-0.5 size-5 flex-shrink-0 text-text-brand" aria-hidden />
            <div>
              <p className="label-medium text-text-brand">{t('secure.title')}</p>
              <p className="caption-medium text-text-secondary">
                {isEmbassy ? t('secure.body') : t('secure.bodyGeneral')}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Cancel / withdraw confirm */}
      <CancelCaseDialog
        caseId={cancelOpen ? supportCase.id : null}
        caseNumber={supportCase.caseNumber}
        onOpenChange={setCancelOpen}
        onCancelled={() => {
          refetch();
          refetchHistory();
        }}
      />
    </div>
  );
}

/* ============================================================================
 * Status timeline (driven by caseStatusHistory)
 * ========================================================================== */

function StatusTimeline({ history }: { history: CaseStatusHistoryEntry[] }) {
  const t = useTranslations('community.embassy.support.detail');

  const nodes = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return sorted.map((entry, i) => ({
      key: entry.id,
      status: (entry.toStatus || '').toUpperCase(),
      label: t(`status.${supportStatusBucket(entry.toStatus)}`),
      when: entry.createdAt,
      reason: entry.reason,
      current: i === sorted.length - 1,
    }));
  }, [history, t]);

  if (nodes.length === 0) {
    return <p className="body-small text-text-secondary">{t('timeline.empty')}</p>;
  }

  return (
    <ol className="relative space-y-0">
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1;
        const rejected = node.status === 'REJECTED' || node.status === 'CANCELLED';

        const NodeIcon: LucideIcon = rejected
          ? node.status === 'CANCELLED'
            ? Ban
            : XCircle
          : node.current
            ? CircleDot
            : CheckCircle2;
        const nodeColor = rejected
          ? 'text-red-500'
          : node.current
            ? 'text-text-brand'
            : 'text-green-600';

        return (
          <li key={node.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[0.6875rem] top-6 h-[calc(100%-1rem)] w-px bg-border-subtle"
                aria-hidden
              />
            )}
            <span className="relative z-10 flex-shrink-0">
              <NodeIcon className={`size-5 ${nodeColor}`} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={`label-medium ${node.current ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                {node.label}
              </p>
              {node.when && (
                <p className="caption-small mt-0.5 text-text-secondary">
                  {formatDateProximity(node.when)}
                </p>
              )}
              {node.reason && (
                <p className="caption-medium mt-1.5 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-text-secondary">
                  {node.reason}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ============================================================================
 * Evidence list
 * ========================================================================== */

function EvidenceList({ evidence }: { evidence: CaseEvidenceItem[] }) {
  const t = useTranslations('community.embassy.support.detail');

  if (evidence.length === 0) {
    return <p className="body-small text-text-secondary">{t('evidence.empty')}</p>;
  }

  return (
    <ul className="space-y-3">
      {evidence.map((item) => {
        const Icon = evidenceIcon(item.kind);
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border-subtle p-3"
          >
            <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
              <Icon className="size-4 text-text-brand" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="caption-large block truncate text-text-primary">
                {item.fileName}
              </span>
              {item.kind && (
                <span className="caption-small block text-text-secondary">
                  {humanize(item.kind)}
                </span>
              )}
            </span>
            {item.readUrl ? (
              <a
                href={item.readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="caption-large inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border-brand px-3 py-1.5 text-text-brand transition-colors hover:bg-surface-subtle"
              >
                <Download className="size-4" aria-hidden />
                {t('evidence.download')}
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================================
 * Cancel / withdraw dialog
 * ========================================================================== */

interface CancelCaseDialogProps {
  caseId: string | null;
  caseNumber?: string;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}
function CancelCaseDialog({
  caseId,
  caseNumber,
  onOpenChange,
  onCancelled,
}: CancelCaseDialogProps) {
  const t = useTranslations('community.embassy.support.detail.cancelDialog');
  const [reason, setReason] = useState('');
  const [cancelCase, { loading }] = useMutation<CancelCaseResponse>(CANCEL_CASE);

  async function onConfirm() {
    if (loading || !caseId) return;
    if (reason.trim() === '') {
      toast.error(t('reasonRequired'));
      return;
    }
    try {
      const result = await cancelCase({ variables: { caseId, reason: reason.trim() } });
      const outcome = readMutationOutcome(result, (d) => d.cancelCase);
      if (!outcome.ok) {
        const errorKey = refusalMessageKey(outcome.message, 'support.errors');
        toast.error(t(errorKey));
        return;
      }
      toast.success(t('success'));
      setReason('');
      onOpenChange(false);
      onCancelled?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : t('error');
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={caseId !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReason('');
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="label-large text-text-primary">{t('title')}</DialogTitle>
          <DialogDescription className="body-small text-text-secondary">
            {caseNumber ? t('subtitleWithNumber', { number: caseNumber }) : t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="caption-large block text-text-primary">{t('reasonLabel')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t('reasonPlaceholder')}
            className="w-full resize-none rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand"
          />
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              setReason('');
              onOpenChange(false);
            }}
            disabled={loading}
            className="label-medium inline-flex items-center justify-center gap-1 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
          >
            {t('keep')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="label-medium inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {t('confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * Loading skeleton
 * ========================================================================== */

function DetailSkeleton({
  backHref,
  backLabel,
}: {
  backHref: { pathname: string; query: Record<string, string> };
  backLabel: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 lg:px-6">
      <Link
        href={backHref}
        scroll={false}
        className="label-medium inline-flex items-center gap-1 text-text-brand"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>
      <div className="mt-5 space-y-6" aria-hidden>
        <Card className="border-border-subtle">
          <CardContent className="space-y-3 p-5">
            <span className="block h-6 w-1/2 animate-pulse rounded bg-surface-subtle" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-surface-subtle" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="border-border-subtle">
                <CardContent className="space-y-3 p-5">
                  <span className="block h-4 w-1/3 animate-pulse rounded bg-surface-subtle" />
                  <span className="block h-3 w-full animate-pulse rounded bg-surface-subtle" />
                  <span className="block h-3 w-3/4 animate-pulse rounded bg-surface-subtle" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-border-subtle">
            <CardContent className="space-y-3 p-5">
              <span className="block h-4 w-1/2 animate-pulse rounded bg-surface-subtle" />
              <span className="block h-3 w-full animate-pulse rounded bg-surface-subtle" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EmbassySupportCaseDetail;
