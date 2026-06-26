'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  XCircle,
  AlertCircle,
  CreditCard,
  FileText,
  FileBadge,
  Image as ImageIcon,
  Award,
  Download,
  Loader2,
  Ban,
  Send,
  UploadCloud,
  Info,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  SERVICE_REQUEST,
  SERVICE_REQUEST_DOCUMENTS,
  SERVICE_REQUEST_TYPES_DETAIL,
  SUPPLY_SERVICE_REQUEST_INFO,
  RETRY_SERVICE_REQUEST_PAYMENT,
  REQUEST_SERVICE_REQUEST_DOC_UPLOAD_URL,
  ADD_SERVICE_REQUEST_DOCUMENT,
  type ServiceRequestResponse,
  type ServiceRequestDetail,
  type ServiceRequestStatusHistoryEntry,
  type ServiceRequestDocumentsResponse,
  type ServiceRequestDocument,
  type ServiceRequestTypesDetailResponse,
  type ServiceRequestFormField,
  type SupplyServiceRequestInfoResponse,
  type RetryServiceRequestPaymentResponse,
  type RequestDocUploadUrlResponse,
  type AddServiceRequestDocumentResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';
import { ServiceFee } from '../ServiceFee';
import { CancelRequestDialog } from './CancelRequestDialog';
import { statusBucket, BUCKET_PILL } from './requestStatus';
import { formatDateProximity } from '@/macros/time';

/* ── status enum ───────────────────────────────────────────────────────────
   The live status enum (verified). We key the pill, the timeline highlight, and
   the action gating off these exact values. */
const CANCELLABLE = new Set(['SUBMITTED', 'UNDER_REVIEW', 'PENDING_INFO']);

/** Document kind → icon (kind ∈ PDF | IMAGE | CERTIFICATE | OTHER). */
function docIcon(kind?: string | null): LucideIcon {
  switch ((kind || '').toUpperCase()) {
    case 'PDF':
      return FileText;
    case 'IMAGE':
      return ImageIcon;
    case 'CERTIFICATE':
      return Award;
    default:
      return FileBadge;
  }
}

/** Humanize a backend code/key, e.g. "date_of_birth" → "Date Of Birth". */
function humanize(code?: string | null): string {
  if (!code) return '';
  return code
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Human-readable file size from a byte count. */
function humanizeSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

interface EmbassyTrackRequestDetailProps {
  requestId: string;
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

/**
 * Detail view for a single service request, reached from the Track Requests tab
 * via `?tab=track-requests&request=<id>`. Mirrors EmbassyServiceDetail's
 * early-return + back-link conventions.
 *
 * Three live queries feed it: `serviceRequest` (the request + its
 * requester-visible `statusHistory` timeline), `serviceRequestDocuments`
 * (filtered to `confirmed === true`), and `serviceRequestTypes` (to resolve the
 * type displayName + map formField keys → labels for the submitted-info rows).
 */
export function EmbassyTrackRequestDetail({
  requestId,
  community,
  profile,
}: EmbassyTrackRequestDetailProps) {
  const t = useTranslations('community.embassy.track.detail');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, loading, refetch } = useQuery<ServiceRequestResponse>(SERVICE_REQUEST, {
    variables: { id: requestId },
    fetchPolicy: 'cache-and-network',
  });
  const { data: docsData } = useQuery<ServiceRequestDocumentsResponse>(SERVICE_REQUEST_DOCUMENTS, {
    variables: { requestId },
    fetchPolicy: 'cache-and-network',
  });
  const { data: typesData } = useQuery<ServiceRequestTypesDetailResponse>(
    SERVICE_REQUEST_TYPES_DETAIL,
    {
      variables: { ownerType: 'COMMUNITY', ownerEntityId: community.id },
      fetchPolicy: 'cache-and-network',
    },
  );

  const request = data?.serviceRequest ?? null;
  const requestType = useMemo(
    () => (typesData?.serviceRequestTypes ?? []).find((tp) => tp.id === request?.requestTypeId),
    [typesData, request?.requestTypeId],
  );

  // Confirmed documents only (unconfirmed = abandoned uploads).
  const documents = useMemo(
    () => (docsData?.serviceRequestDocuments ?? []).filter((d) => d.confirmed === true),
    [docsData],
  );

  /** Back link clears the `request` param, keeps `tab=track-requests`. */
  const backHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'track-requests');
    params.delete('request');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams]);

  if (loading && !request) {
    return <DetailSkeleton backHref={backHref} backLabel={t('back')} />;
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
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

  const status = (request.status || '').toUpperCase();
  const bucket = statusBucket(status);
  const typeName = requestType?.displayName || humanize(request.category) || t('request');
  const canCancel = CANCELLABLE.has(status);
  const pendingInfo = status === 'PENDING_INFO';

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
          {t('back')}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-text-primary">{request.requestNumber}</span>
      </div>

      {/* Header card */}
      <Card className="border-border-subtle">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="heading-xsmall text-text-primary">{typeName}</h1>
                <span
                  className={`caption-medium inline-block rounded-full px-2.5 py-0.5 font-medium ${BUCKET_PILL[bucket]}`}
                >
                  {t(`status.${bucket}`)}
                </span>
              </div>
              <p className="caption-small mt-1 text-text-secondary">
                {t('requestNumber')}: {request.requestNumber}
              </p>
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
          {/* Pending-info notice + supply form */}
          {pendingInfo && (
            <SupplyInfoSection
              request={request}
              formFields={requestType?.formFields ?? []}
              onSupplied={() => refetch()}
            />
          )}

          {/* Status timeline */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h2 className="label-large mb-4 text-text-primary">{t('timeline.title')}</h2>
              <StatusTimeline request={request} />
            </CardContent>
          </Card>

          {/* Submitted information */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h2 className="label-large mb-4 text-text-primary">{t('info.title')}</h2>
              <SubmittedInfo
                formResponsesJson={request.formResponsesJson}
                formFields={requestType?.formFields ?? []}
              />
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h2 className="label-large mb-4 text-text-primary">{t('documents.title')}</h2>
              <DocumentsList documents={documents} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT rail */}
        <aside className="space-y-6">
          {/* Payment */}
          {(request.feeAmountMinor ?? 0) > 0 && (
            <PaymentSection request={request} onRetried={() => refetch()} />
          )}

          {/* Need help */}
          <div className="rounded-xl border border-border-subtle bg-surface-brand-subtle p-5">
            <p className="label-medium flex items-center gap-2 text-text-primary">
              <Info className="size-4 text-text-brand" aria-hidden />
              {t('help.title')}
            </p>
            <p className="body-small mt-1 text-text-secondary">{t('help.body')}</p>
            <a href={`tel:${community.contactPhone || profile.phone}`} className="mt-3 block">
              <span className="block w-full rounded-lg border border-border-brand bg-surface-default py-2 text-center label-medium text-text-brand">
                {t('help.contact')}
              </span>
            </a>
          </div>

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

      {/* Cancel confirm */}
      <CancelRequestDialog
        requestId={cancelOpen ? request.id : null}
        requestNumber={request.requestNumber}
        onOpenChange={setCancelOpen}
        onCancelled={() => refetch()}
      />
    </div>
  );
}

/* ============================================================================
 * Status timeline
 * ========================================================================== */

/** The fallback milestone steps when statusHistory is empty. */
const MILESTONES: { key: string; field: keyof ServiceRequestDetail; status: string }[] = [
  { key: 'submitted', field: 'submittedAt', status: 'SUBMITTED' },
  { key: 'reviewStarted', field: 'reviewStartedAt', status: 'UNDER_REVIEW' },
  { key: 'decided', field: 'decidedAt', status: 'APPROVED' },
  { key: 'completed', field: 'completedAt', status: 'COMPLETED' },
];

interface TimelineNode {
  key: string;
  status: string;
  label: string;
  when?: string | null;
  reason?: string | null;
  /** True for the latest/current node (highlighted). */
  current: boolean;
}

function StatusTimeline({ request }: { request: ServiceRequestDetail }) {
  const t = useTranslations('community.embassy.track.detail');
  const history = request.statusHistory ?? [];

  // Primary source: the requester-visible statusHistory. Fallback: milestones.
  const nodes: TimelineNode[] = useMemo(() => {
    if (history.length > 0) {
      const sorted = [...history].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return sorted.map((entry: ServiceRequestStatusHistoryEntry, i) => ({
        key: entry.id,
        status: (entry.toStatus || '').toUpperCase(),
        label: t(`status.${statusBucket(entry.toStatus)}`),
        when: entry.createdAt,
        reason: entry.reason,
        current: i === sorted.length - 1,
      }));
    }
    // Fallback to the milestone timestamps that are populated.
    const present = MILESTONES.filter((m) => Boolean(request[m.field]));
    return present.map((m, i) => ({
      key: m.key,
      status: m.status,
      label: t(`status.${statusBucket(m.status)}`),
      when: request[m.field] as string | null,
      reason: null,
      current: i === present.length - 1,
    }));
  }, [history, request, t]);

  if (nodes.length === 0) {
    return <p className="body-small text-text-secondary">{t('timeline.empty')}</p>;
  }

  return (
    <ol className="relative space-y-0">
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1;
        const rejected = node.status === 'REJECTED' || node.status === 'CANCELLED';
        const decisionReason =
          node.reason ||
          (node.current &&
          (node.status === 'APPROVED' || node.status === 'REJECTED')
            ? request.decisionReason
            : null);

        // Node visual: red for reject/cancel, brand for the current node, green otherwise.
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
            {/* Connector line */}
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
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`label-medium ${node.current ? 'text-text-primary' : 'text-text-secondary'}`}
                >
                  {node.label}
                </p>
                {node.status === 'PENDING_INFO' && (
                  <span className="caption-small inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                    <AlertCircle className="size-3" aria-hidden />
                    {t('timeline.infoRequested')}
                  </span>
                )}
                {node.status === 'CANCELLED' && (
                  <span className="caption-small inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                    {t('status.cancelled')}
                  </span>
                )}
              </div>
              {node.when && (
                <p className="caption-small mt-0.5 text-text-secondary">
                  {formatDateProximity(node.when)}
                </p>
              )}
              {decisionReason && (
                <p className="caption-medium mt-1.5 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-text-secondary">
                  {decisionReason}
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
 * Submitted information
 * ========================================================================== */

interface SubmittedInfoProps {
  formResponsesJson?: string | null;
  formFields: ServiceRequestFormField[];
}
function SubmittedInfo({ formResponsesJson, formFields }: SubmittedInfoProps) {
  const t = useTranslations('community.embassy.track.detail');

  // Parse the responses (a JSON string, possibly "{}") and map keys → labels.
  const rows = useMemo(() => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(formResponsesJson || '{}') as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    const labelFor = new Map(formFields.map((f) => [f.key, f.label || f.key]));
    return Object.entries(parsed)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => ({
        label: labelFor.get(key) ?? humanize(key),
        value:
          typeof value === 'boolean'
            ? value
              ? t('info.yes')
              : t('info.no')
            : String(value),
      }));
  }, [formResponsesJson, formFields, t]);

  if (rows.length === 0) {
    return <p className="body-small text-text-secondary">{t('info.empty')}</p>;
  }

  return (
    <dl className="divide-y divide-border-subtle">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="caption-medium text-text-secondary">{row.label}</dt>
          <dd className="caption-large min-w-0 max-w-[60%] text-right text-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ============================================================================
 * Documents
 * ========================================================================== */

function DocumentsList({ documents }: { documents: ServiceRequestDocument[] }) {
  const t = useTranslations('community.embassy.track.detail');

  if (documents.length === 0) {
    return <p className="body-small text-text-secondary">{t('documents.empty')}</p>;
  }

  return (
    <ul className="space-y-3">
      {documents.map((doc) => {
        const Icon = docIcon(doc.kind);
        const size = humanizeSize(doc.sizeBytes);
        return (
          <li
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border border-border-subtle p-3"
          >
            <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
              <Icon className="size-4 text-text-brand" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="caption-large block truncate text-text-primary">{doc.fileName}</span>
              <span className="caption-small block text-text-secondary">
                {[humanize(doc.kind), size].filter(Boolean).join(' · ')}
              </span>
            </span>
            {doc.readUrl ? (
              <a
                href={doc.readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="caption-large inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border-brand px-3 py-1.5 text-text-brand transition-colors hover:bg-surface-subtle"
              >
                <Download className="size-4" aria-hidden />
                {t('documents.download')}
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================================
 * Payment
 * ========================================================================== */

interface PaymentSectionProps {
  request: ServiceRequestDetail;
  onRetried: () => void;
}
function PaymentSection({ request, onRetried }: PaymentSectionProps) {
  const t = useTranslations('community.embassy.track.detail');
  const [retryPayment, { loading }] = useMutation<RetryServiceRequestPaymentResponse>(
    RETRY_SERVICE_REQUEST_PAYMENT,
  );

  const paymentStatus = (request.paymentStatus || '').toUpperCase();
  // "Unpaid/failed" → offer a retry CTA. Seeded services are free so this path
  // is defensive (no real Stripe/Paystack mount yet — see TODO below).
  const needsPayment =
    paymentStatus === '' ||
    paymentStatus === 'UNPAID' ||
    paymentStatus === 'PENDING' ||
    paymentStatus === 'FAILED' ||
    paymentStatus === 'REQUIRES_PAYMENT_METHOD';

  async function onComplete() {
    if (loading) return;
    try {
      await retryPayment({ variables: { requestId: request.id } });
      // TODO: mirror MembershipPaymentModal's Stripe/Paystack mount once the
      // service-request clientSecret source is confirmed. Seeded services are
      // free, so we only refresh the request for now.
      toast.success(t('payment.retried'));
      onRetried();
    } catch (e) {
      const message = e instanceof Error ? e.message : t('payment.error');
      toast.error(message);
    }
  }

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <h3 className="label-large mb-3 flex items-center gap-2 text-text-primary">
          <CreditCard className="size-4 text-text-brand" aria-hidden />
          {t('payment.title')}
        </h3>
        <dl className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <dt className="caption-medium text-text-secondary">{t('payment.fee')}</dt>
            <dd className="caption-large text-right font-medium text-text-primary">
              <ServiceFee minor={request.feeAmountMinor} currency={request.feeCurrency} />
            </dd>
          </div>
          {request.paymentStatus && (
            <div className="flex items-center justify-between gap-3">
              <dt className="caption-medium text-text-secondary">{t('payment.status')}</dt>
              <dd className="caption-large font-medium text-text-primary">
                {humanize(request.paymentStatus)}
              </dd>
            </div>
          )}
        </dl>
        {needsPayment && (
          <button
            type="button"
            onClick={onComplete}
            disabled={loading}
            className="label-medium mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-surface-brand py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t('payment.complete')}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Supply information (PENDING_INFO)
 * ========================================================================== */

interface SupplyInfoSectionProps {
  request: ServiceRequestDetail;
  formFields: ServiceRequestFormField[];
  onSupplied: () => void;
}
function SupplyInfoSection({ request, formFields, onSupplied }: SupplyInfoSectionProps) {
  const t = useTranslations('community.embassy.track.detail');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [supplyInfo] = useMutation<SupplyServiceRequestInfoResponse>(SUPPLY_SERVICE_REQUEST_INFO);
  const [requestDocUploadUrl] = useMutation<RequestDocUploadUrlResponse>(
    REQUEST_SERVICE_REQUEST_DOC_UPLOAD_URL,
  );
  const [addServiceRequestDocument] = useMutation<AddServiceRequestDocumentResponse>(
    ADD_SERVICE_REQUEST_DOCUMENT,
  );

  // The file fields the type declares (used as the upload's formFieldKey hint).
  const fileField = useMemo(
    () => formFields.find((f) => (f.type ?? '').toUpperCase() === 'FILE_UPLOAD'),
    [formFields],
  );

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
  }

  async function onSubmit() {
    if (submitting) return;
    if (message.trim() === '' && !file) {
      toast.error(t('supply.required'));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Send the supplied answers (kept under a single `additionalInfo` key
      //    alongside any existing responses).
      const responses = message.trim() === '' ? undefined : JSON.stringify({ additionalInfo: message.trim() });
      await supplyInfo({ variables: { requestId: request.id, formResponsesJson: responses } });

      // 2. Optionally upload one supporting document (reuse the apply flow:
      //    requestDocUploadUrl → PUT → addServiceRequestDocument).
      if (file) {
        const u = await requestDocUploadUrl({
          variables: {
            requestId: request.id,
            contentType: file.type,
            fileName: file.name,
            formFieldKey: fileField?.key ?? null,
          },
        });
        const upload = u.data?.requestServiceRequestDocumentUploadUrl;
        if (upload) {
          await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          await addServiceRequestDocument({
            variables: { requestId: request.id, documentId: upload.documentId },
          });
        }
      }

      toast.success(t('supply.success'));
      setMessage('');
      setFile(null);
      onSupplied();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t('supply.error');
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="p-5">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0">
            <h2 className="label-large text-text-primary">{t('supply.title')}</h2>
            <p className="body-small mt-0.5 text-text-secondary">{t('supply.subtitle')}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label className="caption-large block text-text-primary">{t('supply.messageLabel')}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t('supply.messagePlaceholder')}
              className="w-full resize-none rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-default p-3">
            <div className="min-w-0">
              <p className="caption-large text-text-primary">{t('supply.documentLabel')}</p>
              {file ? (
                <p className="caption-small mt-0.5 inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {file.name}
                </p>
              ) : (
                <p className="caption-small mt-0.5 text-text-secondary">{t('supply.optional')}</p>
              )}
            </div>
            <label className="caption-large inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-text-brand transition-colors hover:bg-surface-subtle">
              <UploadCloud className="size-4" aria-hidden />
              {file ? t('supply.replace') : t('supply.choose')}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={onPick}
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="label-medium mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-surface-brand px-5 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          {t('supply.submit')}
        </button>
      </CardContent>
    </Card>
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
    <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
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

export default EmbassyTrackRequestDetail;
