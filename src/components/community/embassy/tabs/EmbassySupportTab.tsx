'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  LifeBuoy,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Plus,
  ChevronRight,
  CalendarDays,
  Inbox,
  Loader2,
  Send,
  UploadCloud,
  CheckCircle2,
  Headset,
  Bug,
  HelpCircle,
  ClipboardList,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonType2 } from '@/components/custom/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  SUPPORT_CASE_TYPES,
  MY_CASES,
  SUBMIT_CASE,
  REQUEST_CASE_EVIDENCE_UPLOAD_URL,
  ADD_CASE_EVIDENCE,
  type SupportCaseType,
  type SupportCaseTypesResponse,
  type MyCasesResponse,
  type SupportCaseSummary,
  type SubmitCaseResponse,
  type SupportPriority,
  type RequestCaseEvidenceUploadUrlResponse,
  type AddCaseEvidenceResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyProfile } from '../embassyData';
import type { EmbassyViewProps } from '../types';
import { EmbassySupportCaseDetail } from './EmbassySupportCaseDetail';
import { supportStatusBucket, SUPPORT_PILL } from './requestStatus';
import { useIsEmbassy, useOwnerEnum } from '@/components/community/embassy/communityVariant';

interface EmbassySupportTabProps {
  profile: EmbassyProfile;
  community: EmbassyViewProps['community'];
  communityId: string;
}

const PRIORITIES: SupportPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/** ISO alpha-2 code ("FR") → country name ("France"); full names pass through. */
function countryLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^[A-Za-z]{2}$/.test(v)) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(v.toUpperCase()) ?? v;
    } catch {
      return v;
    }
  }
  return v;
}

/** Humanize a backend category code, e.g. "consular_assist" → "Consular Assist". */
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

/** Per-case-type visual (icon), keyed by the type's name/code. */
function visualForType(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes('consular') || n.includes('assist')) return LifeBuoy;
  if (n.includes('issue') || n.includes('report')) return Bug;
  if (n.includes('technical') || n.includes('tech')) return Headset;
  if (n.includes('service')) return ClipboardList;
  if (n.includes('enquir') || n.includes('inquir') || n.includes('general')) return HelpCircle;
  return MessageSquare;
}

type Section = 'topics' | 'cases';

/** Support = a help center: submit + track support cases, plus the embassy's
 *  contact / emergency rail. */
export function EmbassySupportTab({ community, communityId }: EmbassySupportTabProps) {
  const t = useTranslations('community.embassy.support');
  const isEmbassy = useIsEmbassy();
  const ownerEnum = useOwnerEnum();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCaseId = searchParams.get('case');

  const [section, setSection] = useState<Section>('topics');
  const [submitOpen, setSubmitOpen] = useState(false);
  // The case type to prefill the submit dialog with (null = no prefill).
  const [prefillTypeId, setPrefillTypeId] = useState<string | null>(null);

  const { data: typesData, loading: typesLoading } = useQuery<SupportCaseTypesResponse>(
    SUPPORT_CASE_TYPES,
    {
      variables: { ownerType: ownerEnum, ownerEntityId: communityId },
      fetchPolicy: 'cache-and-network',
    },
  );

  const {
    data: casesData,
    loading: casesLoading,
    refetch: refetchCases,
  } = useQuery<MyCasesResponse>(MY_CASES, {
    fetchPolicy: 'cache-and-network',
  });

  const topics = useMemo(
    () => (typesData?.caseTypes ?? []).filter((c) => c.isActive !== false),
    [typesData],
  );
  const cases = useMemo(() => casesData?.myCases ?? [], [casesData]);

  // Backend contact fields only — no mock fallback (blank when empty).
  const phone = community.contactPhone ?? '';
  const email = community.contactEmail ?? '';
  const street = community.address ?? '';
  const countryName = countryLabel(community.locationCountry);
  const fullAddress =
    countryName && street && !street.toLowerCase().includes(countryName.toLowerCase())
      ? `${street}, ${countryName}`
      : street || countryName || '';

  /** Detail view link (`?tab=support&case=<id>`). */
  function caseHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'support');
    params.set('case', id);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  /** Open the submit dialog, optionally prefilled with a case type. */
  function openSubmit(typeId?: string) {
    setPrefillTypeId(typeId ?? null);
    setSubmitOpen(true);
  }

  // Detail view — early-return when `?case=<id>` is present (mirrors `?request=`).
  if (selectedCaseId) {
    return <EmbassySupportCaseDetail caseId={selectedCaseId} community={community} />;
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_20rem] lg:px-6">
      {/* Main column */}
      <div className="min-w-0 space-y-5">
        {/* Header + primary CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="heading-xsmall text-text-primary">{t('title')}</h2>
            <p className="body-small text-text-secondary">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => openSubmit()}
            className="label-medium inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-surface-brand px-4 py-2.5 text-text-white transition-colors hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden />
            {t('getHelp')}
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex items-center gap-2">
          {(['topics', 'cases'] as const).map((key) => {
            const active = section === key;
            const count = key === 'cases' ? cases.length : topics.length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 label-medium transition-colors',
                  active
                    ? 'bg-surface-brand text-text-white'
                    : 'border border-border-subtle text-text-secondary hover:text-text-primary',
                )}
              >
                {t(`sections.${key}`)}
                <span
                  className={cn(
                    'caption-small rounded-full px-1.5',
                    active ? 'bg-white/20 text-text-white' : 'bg-surface-subtle text-text-secondary',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Help Topics */}
        {section === 'topics' && (
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large text-text-primary">{t('topics.title')}</h3>
              <p className="body-small mb-4 text-text-secondary">{t('topics.subtitle')}</p>

              {typesLoading && topics.length === 0 ? (
                <p className="body-small py-4 text-text-secondary">{t('topics.loading')}</p>
              ) : topics.length === 0 ? (
                <p className="body-small py-4 text-text-secondary">{t('topics.empty')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {topics.map((topic) => {
                    const Icon = visualForType(topic.code || topic.displayName);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => openSubmit(topic.id)}
                        className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 text-left transition-shadow hover:shadow-sm"
                      >
                        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-brand">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="label-medium block text-text-primary">
                            {topic.displayName}
                          </span>
                          {topic.description && (
                            <span className="caption-small line-clamp-2 block text-text-secondary">
                              {topic.description}
                            </span>
                          )}
                        </span>
                        <ChevronRight
                          className="mt-1 size-4 flex-shrink-0 text-text-secondary"
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* My Cases */}
        {section === 'cases' && (
          <>
            {casesLoading && cases.length === 0 ? (
              <ListSkeleton />
            ) : cases.length === 0 ? (
              <Card className="border-border-subtle">
                <CardContent className="p-10 text-center">
                  <Inbox className="mx-auto size-8 text-text-secondary" aria-hidden />
                  <p className="label-medium mt-3 text-text-primary">{t('cases.empty')}</p>
                  <p className="body-small mt-1 text-text-secondary">{t('cases.emptySub')}</p>
                  <button
                    type="button"
                    onClick={() => openSubmit()}
                    className="label-medium mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border-brand px-4 py-2 text-text-brand transition-colors hover:bg-surface-subtle"
                  >
                    <Plus className="size-4" aria-hidden />
                    {t('getHelp')}
                  </button>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-4">
                {cases.map((c) => (
                  <li key={c.id}>
                    <CaseCard kase={c} detailHref={caseHref(c.id)} t={t} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Contact / emergency rail (kept as-is — real backend data). */}
      <aside className="space-y-6">
        <div className="rounded-lg border border-border-danger bg-surface-danger p-4">
          <p className="label-medium flex items-center gap-2 text-text-danger">
            <AlertTriangle className="size-4" aria-hidden />
            {t('emergencyTitle')}
          </p>
          <p className="body-small mt-1 text-text-secondary">{t('emergencyBody')}</p>
          <a href={`tel:${phone}`} className="mt-3 block">
            <ButtonType2 className="w-full justify-center py-2">{phone}</ButtonType2>
          </a>
        </div>

        <Card className="border-border-subtle">
          <CardContent className="space-y-3 p-5">
            <h3 className="label-large text-text-primary">
              {isEmbassy ? t('contactTitle') : t('contactTitleGeneral')}
            </h3>
            <p className="caption-medium flex items-center gap-2 text-text-secondary">
              <Phone className="size-4 flex-shrink-0" aria-hidden />
              {phone}
            </p>
            <p className="caption-medium flex items-center gap-2 break-all text-text-secondary">
              <Mail className="size-4 flex-shrink-0" aria-hidden />
              {email}
            </p>
            <p className="caption-medium flex items-start gap-2 text-text-secondary">
              <MapPin className="size-4 flex-shrink-0" aria-hidden />
              {fullAddress}
            </p>
          </CardContent>
        </Card>
      </aside>

      {/* Submit dialog */}
      <SubmitCaseDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        topics={topics}
        communityId={communityId}
        prefillTypeId={prefillTypeId}
        onSubmitted={() => {
          refetchCases();
          setSection('cases');
        }}
      />
    </div>
  );
}

/* ============================================================================
 * Case card (My Cases list)
 * ========================================================================== */

interface CaseCardProps {
  kase: SupportCaseSummary;
  detailHref: { pathname: string; query: Record<string, string> };
  t: ReturnType<typeof useTranslations>;
}
function CaseCard({ kase, detailHref, t }: CaseCardProps) {
  const bucket = supportStatusBucket(kase.status);
  const Icon = visualForType(kase.category || kase.title);
  const category = humanizeCategory(kase.category);

  return (
    <Card className="border-border-subtle transition-shadow hover:shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
          {/* Identity */}
          <div className="flex items-start gap-3 lg:flex-1">
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
              <Icon className="size-5 text-text-brand" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="label-medium text-text-primary">{kase.title}</p>
              <p className="caption-small text-text-secondary">
                {t('cases.caseId')}: {kase.caseNumber}
              </p>
              <p className="caption-small mt-0.5 flex items-center gap-1 text-text-secondary">
                <CalendarDays className="size-3.5 flex-shrink-0" aria-hidden />
                {t('cases.submitted')}: {formatDate(kase.submittedAt)}
              </p>
              {category && (
                <span className="caption-small mt-2 inline-block rounded-md bg-surface-subtle px-2 py-0.5 text-text-secondary">
                  {category}
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="lg:w-44 lg:flex-shrink-0">
            <p className="caption-small text-text-secondary">{t('cases.statusLabel')}</p>
            <span
              className={cn(
                'caption-medium mt-1 inline-block rounded-full px-2.5 py-0.5 font-medium',
                SUPPORT_PILL[bucket],
              )}
            >
              {t(`cases.status.${bucket}`)}
            </span>
            <p className="caption-small mt-2 text-text-secondary">
              {t('cases.lastUpdate')}: {formatDate(kase.updatedAt) || formatDate(kase.submittedAt)}
            </p>
          </div>

          {/* Action */}
          <div className="lg:w-28 lg:flex-shrink-0">
            <Link
              href={detailHref}
              scroll={false}
              className="label-medium block w-full rounded-lg border border-border-brand py-2 text-center text-text-brand transition-colors hover:bg-surface-subtle"
            >
              {t('cases.view')}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Submit case dialog
 * ========================================================================== */

interface SubmitCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: SupportCaseType[];
  communityId: string;
  prefillTypeId: string | null;
  onSubmitted: () => void;
}
function SubmitCaseDialog({
  open,
  onOpenChange,
  topics,
  communityId,
  prefillTypeId,
  onSubmitted,
}: SubmitCaseDialogProps) {
  const t = useTranslations('community.embassy.support.submit');
  const ownerEnum = useOwnerEnum();

  const [caseTypeId, setCaseTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SupportPriority>('MEDIUM');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Tracks the prefill we last applied so re-opening with a new topic re-syncs.
  const [appliedPrefill, setAppliedPrefill] = useState<string | null>(null);

  const [submitCase] = useMutation<SubmitCaseResponse>(SUBMIT_CASE);
  const [requestEvidenceUploadUrl] = useMutation<RequestCaseEvidenceUploadUrlResponse>(
    REQUEST_CASE_EVIDENCE_UPLOAD_URL,
  );
  const [addCaseEvidence] = useMutation<AddCaseEvidenceResponse>(ADD_CASE_EVIDENCE);

  // Sync the case-type select with the launching topic each time the dialog
  // opens (render-phase sync avoids an effect; cheap + idempotent).
  if (open && prefillTypeId !== appliedPrefill) {
    setAppliedPrefill(prefillTypeId);
    setCaseTypeId(prefillTypeId ?? '');
  }
  if (!open && appliedPrefill !== null) {
    setAppliedPrefill(null);
  }

  function reset() {
    setCaseTypeId('');
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setFile(null);
    setAppliedPrefill(null);
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
  }

  async function onSubmit() {
    if (submitting) return;
    if (caseTypeId === '') {
      toast.error(t('errors.typeRequired'));
      return;
    }
    if (title.trim() === '') {
      toast.error(t('errors.titleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create the case.
      const res = await submitCase({
        variables: {
          input: {
            ownerType: ownerEnum,
            ownerEntityId: communityId,
            caseTypeId,
            title: title.trim(),
            description: description.trim() === '' ? null : description.trim(),
            priority,
          },
        },
      });
      const created = res.data?.submitCase;
      if (!created) throw new Error(t('errors.failed'));

      // 2. Optionally upload one evidence file (request URL → PUT → add).
      if (file) {
        const u = await requestEvidenceUploadUrl({
          variables: {
            caseId: created.id,
            contentType: file.type,
            fileName: file.name,
          },
        });
        const upload = u.data?.requestCaseEvidenceUploadUrl;
        if (upload) {
          await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          await addCaseEvidence({
            variables: {
              caseId: created.id,
              evidenceId: upload.evidenceId,
              sizeBytes: file.size,
            },
          });
        }
      }

      toast.success(t('success', { number: created.caseNumber }));
      reset();
      onOpenChange(false);
      onSubmitted();
    } catch (e) {
      const message = e instanceof Error ? e.message : t('errors.failed');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="label-large text-text-primary">{t('title')}</DialogTitle>
          <DialogDescription className="body-small text-text-secondary">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Case type */}
          <div className="space-y-1.5">
            <label className="caption-large block text-text-primary">
              {t('typeLabel')}
              <span className="ml-0.5 text-text-danger">*</span>
            </label>
            <select
              value={caseTypeId}
              onChange={(e) => setCaseTypeId(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('typePlaceholder')}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="caption-large block text-text-primary">
              {t('titleLabel')}
              <span className="ml-0.5 text-text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="caption-large block text-text-primary">{t('descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t('descriptionPlaceholder')}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="caption-large block text-text-primary">{t('priorityLabel')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as SupportPriority)}
              className={inputClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priorities.${p}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Evidence (optional single file) */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-subtle p-3">
            <div className="min-w-0">
              <p className="caption-large text-text-primary">{t('evidenceLabel')}</p>
              {file ? (
                <p className="caption-small mt-0.5 inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {file.name}
                </p>
              ) : (
                <p className="caption-small mt-0.5 text-text-secondary">{t('evidenceOptional')}</p>
              )}
            </div>
            <label className="caption-large inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-text-brand transition-colors hover:bg-surface-subtle">
              <UploadCloud className="size-4" aria-hidden />
              {file ? t('evidenceReplace') : t('evidenceChoose')}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={onPick}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={submitting}
            className="label-medium inline-flex items-center justify-center gap-1 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="label-medium inline-flex items-center justify-center gap-2 rounded-lg bg-surface-brand px-5 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {t('submit')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================================
 * List skeleton
 * ========================================================================== */

function ListSkeleton() {
  return (
    <ul className="space-y-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="border-border-subtle">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                <div className="flex items-start gap-3 lg:flex-1">
                  <span className="size-11 flex-shrink-0 animate-pulse rounded-lg bg-surface-subtle" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="block h-3.5 w-3/4 animate-pulse rounded bg-surface-subtle" />
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-subtle" />
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-surface-subtle" />
                  </div>
                </div>
                <div className="space-y-2 lg:w-44 lg:flex-shrink-0">
                  <span className="block h-5 w-24 animate-pulse rounded-full bg-surface-subtle" />
                  <span className="block h-3 w-32 animate-pulse rounded bg-surface-subtle" />
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

export default EmbassySupportTab;
