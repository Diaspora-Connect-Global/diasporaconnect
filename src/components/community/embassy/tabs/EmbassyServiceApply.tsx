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
  Clock,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Coins,
  Mail,
  Phone,
  CalendarDays,
  MessageSquare,
  FileText,
  Files,
  HelpCircle,
  Plane,
  UploadCloud,
  Pencil,
  Loader2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SERVICE_REQUEST_TYPES_DETAIL,
  SUBMIT_SERVICE_REQUEST,
  REQUEST_SERVICE_REQUEST_DOC_UPLOAD_URL,
  ADD_SERVICE_REQUEST_DOCUMENT,
  type ServiceRequestTypeDetail,
  type ServiceRequestFormField,
  type ServiceRequestTypesDetailResponse,
  type SubmitServiceRequestResponse,
  type SubmitServiceRequestResult,
  type RequestDocUploadUrlResponse,
  type AddServiceRequestDocumentResponse,
} from '@/services/gql/embassyServices';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyViewProps } from '../types';
import { ServiceFee } from '../ServiceFee';

/** Zero-amount label in the service's currency (e.g. "€0.00"). */
function formatZero(currency?: string | null): string {
  const code = (currency || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(0);
  } catch {
    return `0.00 ${code}`;
  }
}

const TOTAL_STEPS = 6;

/** Static eligibility questions (visa-style; not backed by the schema). */
const ELIGIBILITY_KEYS = ['validPassport', 'residingAbroad', 'overEighteen'] as const;
type EligibilityKey = (typeof ELIGIBILITY_KEYS)[number];

/** Stable keys for the static Application fallback (when formFields is empty). */
const FALLBACK_KEYS = ['fullName', 'email', 'phone', 'dateOfBirth', 'purpose', 'intendedDate'] as const;

/** Static documents fallback when the service declares no FILE_UPLOAD fields. */
const FALLBACK_DOC_KEYS = ['passportCopy', 'passportPhoto', 'proofOfResidence'] as const;

type PaymentMethod = 'card' | 'mobile' | 'bank' | 'wallet' | 'usdt';

interface EmbassyServiceApplyProps {
  serviceId: string;
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

/**
 * 6-step "Apply for Service" wizard for an embassy community.
 *
 * Reached via `?tab=services&service=<id>&apply=1`. The schema has no
 * single-type query, so we re-fetch the owner-scoped list (same as the detail
 * page) and pick the matching id. Steps: Eligibility → Documents → Application
 * (dynamic from `service.formFields`) → Review → Payment → Success. The submit
 * sequence runs from the Payment step's action button: create the request,
 * upload any held files, then advance to the success screen.
 */
export function EmbassyServiceApply({ serviceId, community, profile }: EmbassyServiceApplyProps) {
  const t = useTranslations('community.embassy.services.apply');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [eligibility, setEligibility] = useState<Record<string, 'yes' | 'no'>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitServiceRequestResult | null>(null);
  const [openResource, setOpenResource] = useState<ResourceKey | null>(null);

  const { data, loading } = useQuery<ServiceRequestTypesDetailResponse>(
    SERVICE_REQUEST_TYPES_DETAIL,
    {
      variables: { ownerType: 'COMMUNITY', ownerEntityId: community.id },
      fetchPolicy: 'cache-and-network',
    },
  );

  const [submitServiceRequest] = useMutation<SubmitServiceRequestResponse>(SUBMIT_SERVICE_REQUEST);
  const [requestDocUploadUrl] = useMutation<RequestDocUploadUrlResponse>(
    REQUEST_SERVICE_REQUEST_DOC_UPLOAD_URL,
  );
  const [addServiceRequestDocument] = useMutation<AddServiceRequestDocumentResponse>(
    ADD_SERVICE_REQUEST_DOCUMENT,
  );

  const all = data?.serviceRequestTypes ?? [];
  const service = useMemo(() => all.find((s) => s.id === serviceId), [all, serviceId]);

  /** Form fields split into the dynamic application fields and the file fields. */
  const formFields = service?.formFields ?? [];
  const fileFields = useMemo(
    () => formFields.filter((f) => (f.type ?? '').toUpperCase() === 'FILE_UPLOAD'),
    [formFields],
  );
  const applicationFields = useMemo(
    () => formFields.filter((f) => (f.type ?? '').toUpperCase() !== 'FILE_UPLOAD'),
    [formFields],
  );
  const usesFallbackApplication = applicationFields.length === 0;
  const usesFallbackDocs = fileFields.length === 0;

  /** Back link to the service detail (drops `apply`, keeps tab + service). */
  const backHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'services');
    params.set('service', serviceId);
    params.delete('apply');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams, serviceId]);

  /** Success-screen link to another tab (drops `service` + `apply`). */
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

  if (loading && all.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
        <p className="body-small text-text-secondary">{t('loading')}</p>
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
          {t('back')}
        </Link>
        <p className="body-small mt-6 text-text-secondary">{t('notFound')}</p>
      </div>
    );
  }

  const totalMinor = service.feeAmountMinor ?? 0;
  const isFree = totalMinor <= 0;

  const STEP_TITLES = [
    t('steps.eligibility'),
    t('steps.documents'),
    t('steps.application'),
    t('steps.review'),
    t('steps.payment'),
    t('steps.submit'),
  ];

  const contactEmail = community.contactEmail || profile.email;
  const contactPhone = community.contactPhone || profile.phone;

  /* ── Validation gates ──────────────────────────────────────────────── */

  const eligibilityComplete = ELIGIBILITY_KEYS.every((k) => eligibility[k] === 'yes' || eligibility[k] === 'no');

  const applicationComplete = usesFallbackApplication
    ? true
    : applicationFields.every((f) => {
        if (!f.required) return true;
        const v = answers[f.key];
        if (typeof v === 'boolean') return v === true;
        return v !== undefined && v !== null && String(v).trim() !== '';
      });

  /* ── Submit sequence (runs from the Payment step) ──────────────────── */

  async function runSubmit() {
    if (submitting || !service) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Create the request. For a free service this returns SUBMITTED with a
      //    null paymentIntentId immediately.
      const submit = await submitServiceRequest({
        variables: {
          input: {
            requestTypeId: service.id,
            ownerType: 'COMMUNITY',
            ownerEntityId: community.id,
            formResponsesJson: JSON.stringify(answers),
          },
        },
      });
      const res = submit.data?.submitServiceRequest;
      if (!res) throw new Error(t('errors.submitFailed'));

      // 2. Upload any held files, now that we have a requestId.
      for (const [fieldKey, file] of Object.entries(files)) {
        const u = await requestDocUploadUrl({
          variables: {
            requestId: res.id,
            contentType: file.type,
            fileName: file.name,
            formFieldKey: fieldKey,
          },
        });
        const upload = u.data?.requestServiceRequestDocumentUploadUrl;
        if (!upload) continue;
        await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        await addServiceRequestDocument({
          variables: { requestId: res.id, documentId: upload.documentId },
        });
      }

      // 3. PAID PATH (defensive — no seeded service currently has a fee, so this
      //    is untested). The backend creates the payment intent inside submit
      //    (res.paymentIntentId). The submit return exposes only paymentIntentId
      //    (no Stripe clientSecret), so we cannot mount Elements here yet.
      if (res.feeAmountMinor && res.feeAmountMinor > 0) {
        // TODO: wire Stripe Elements once service-request clientSecret source is
        // confirmed. For now, after the user has chosen Card we proceed and show
        // the returned status / paymentStatus on the success screen.
      }

      // 4. Done.
      setResult(res);
      setStep(6);
    } catch (e) {
      const message = e instanceof Error ? e.message : t('errors.submitFailed');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

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
          {service.displayName}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-text-primary">{t('breadcrumb')}</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="heading-xsmall text-text-primary">
          {t('title', { name: service.displayName })}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 caption-medium text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <CreditCard className="size-4 text-text-secondary" aria-hidden />
            <ServiceFee minor={service.feeAmountMinor} currency={service.feeCurrency} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-text-secondary" aria-hidden />
            {t('processingTime')}
          </span>
        </div>
      </div>

      {/* Progress indicator */}
      <StepProgress step={step} titles={STEP_TITLES} />

      {/* Body grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        {/* LEFT — active step */}
        <div className="min-w-0">
          {step === 1 && (
            <StepEligibility
              eligibility={eligibility}
              setEligibility={setEligibility}
              complete={eligibilityComplete}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepDocuments
              fileFields={fileFields}
              usesFallback={usesFallbackDocs}
              files={files}
              setFiles={setFiles}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepApplication
              applicationFields={applicationFields}
              usesFallback={usesFallbackApplication}
              answers={answers}
              setAnswers={setAnswers}
              complete={applicationComplete}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepReview
              service={service}
              eligibility={eligibility}
              answers={answers}
              applicationFields={applicationFields}
              usesFallbackApplication={usesFallbackApplication}
              fileFields={fileFields}
              usesFallbackDocs={usesFallbackDocs}
              files={files}
              onEdit={setStep}
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <StepPayment
              service={service}
              isFree={isFree}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              submitting={submitting}
              error={error}
              onBack={() => setStep(4)}
              onSubmit={runSubmit}
            />
          )}
          {step === 6 && (
            <StepSuccess
              result={result}
              tabHref={tabHref}
            />
          )}
        </div>

        {/* RIGHT — persistent sidebar */}
        <aside className="space-y-6">
          {/* Service Summary */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">{t('summary.title')}</h3>
              <dl className="space-y-2.5">
                <SummaryRow label={t('summary.service')} value={service.displayName} />
                <SummaryRow
                  label={t('summary.fee')}
                  value={
                    <ServiceFee minor={service.feeAmountMinor} currency={service.feeCurrency} />
                  }
                />
                <SummaryRow label={t('summary.processing')} value={t('processingTime')} />
                <SummaryRow
                  label={t('summary.providedBy')}
                  value={t('summary.providedByValue', { name: community.name })}
                />
              </dl>
            </CardContent>
          </Card>

          {/* Need Help? */}
          <div className="rounded-xl border border-border-subtle bg-surface-brand-subtle p-5">
            <p className="label-medium flex items-center gap-2 text-text-primary">
              <HelpCircle className="size-4 text-text-brand" aria-hidden />
              {t('help.title')}
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
                {profile.officeHours}
              </li>
            </ul>
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                t('help.messageSubject', { name: service.displayName }),
              )}`}
              className="label-medium mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-brand bg-surface-default py-2 text-text-brand transition-colors hover:bg-surface-subtle"
            >
              <MessageSquare className="size-4" aria-hidden />
              {t('help.sendMessage')}
            </a>
          </div>

          {/* Resources */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">{t('resources.title')}</h3>
              <ul className="space-y-1">
                <ResourceRow
                  icon={FileText}
                  label={t('resources.applicationGuide')}
                  onClick={() => setOpenResource('applicationGuide')}
                />
                <ResourceRow
                  icon={Files}
                  label={t('resources.requiredDocuments')}
                  onClick={() => setOpenResource('requiredDocuments')}
                />
                <ResourceRow
                  icon={HelpCircle}
                  label={t('resources.faq')}
                  onClick={() => setOpenResource('faq')}
                />
                <ResourceRow
                  icon={Plane}
                  label={t('resources.travelAdvisory')}
                  onClick={() => setOpenResource('travelAdvisory')}
                />
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Resource detail dialog (driven by which sidebar row was clicked) */}
      <ResourceDialog
        resource={openResource}
        onOpenChange={(open) => setOpenResource(open ? openResource : null)}
        service={service}
        stepTitles={STEP_TITLES}
        fileFields={fileFields}
        usesFallbackDocs={usesFallbackDocs}
        contactEmail={contactEmail}
      />
    </div>
  );
}

/* ============================================================================
 * Resources dialog (sidebar)
 * ========================================================================== */

const RESOURCE_KEYS = ['applicationGuide', 'requiredDocuments', 'faq', 'travelAdvisory'] as const;
type ResourceKey = (typeof RESOURCE_KEYS)[number];

/** Stable keys for the static FAQ entries shown in the FAQ dialog. */
const FAQ_KEYS = ['processingTime', 'editAfter', 'paymentMethods', 'tracking'] as const;
type FaqKey = (typeof FAQ_KEYS)[number];

interface ResourceDialogProps {
  resource: ResourceKey | null;
  onOpenChange: (open: boolean) => void;
  service: ServiceRequestTypeDetail;
  stepTitles: string[];
  fileFields: ServiceRequestFormField[];
  usesFallbackDocs: boolean;
  contactEmail?: string;
}
function ResourceDialog({
  resource,
  onOpenChange,
  service,
  stepTitles,
  fileFields,
  usesFallbackDocs,
  contactEmail,
}: ResourceDialogProps) {
  const t = useTranslations('community.embassy.services.apply');
  if (!resource) return null;

  // Documents the applicant must provide: declared FILE_UPLOAD fields, or the
  // static fallback list when the service declares none.
  const docs: string[] = usesFallbackDocs
    ? FALLBACK_DOC_KEYS.map((k) => t(`documents.fallback.${k}` as DocFallbackKey))
    : fileFields.map((f) => f.label || f.key);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="label-large text-text-primary">
            {t(`resources.${resource}` as ResourceTitleKey)}
          </DialogTitle>
          <DialogDescription className="body-small text-text-secondary">
            {t(`resources.dialog.${resource}.intro` as ResourceIntroKey)}
          </DialogDescription>
        </DialogHeader>

        {resource === 'applicationGuide' && (
          <ol className="space-y-3">
            {stepTitles.map((title, i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle caption-small font-semibold text-text-brand">
                  {i + 1}
                </span>
                <span className="caption-large text-text-primary">{title}</span>
              </li>
            ))}
          </ol>
        )}

        {resource === 'requiredDocuments' && (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc} className="flex items-start gap-2 caption-large text-text-primary">
                <Files className="mt-0.5 size-4 flex-shrink-0 text-text-brand" aria-hidden />
                <span className="min-w-0">{doc}</span>
              </li>
            ))}
            <li className="caption-small mt-1 text-text-secondary">{t('resources.dialog.requiredDocuments.note')}</li>
          </ul>
        )}

        {resource === 'faq' && (
          <dl className="space-y-4">
            {FAQ_KEYS.map((k) => (
              <div key={k}>
                <dt className="caption-large font-medium text-text-primary">
                  {t(`resources.dialog.faq.items.${k}.q` as FaqQKey)}
                </dt>
                <dd className="caption-medium mt-1 text-text-secondary">
                  {t(`resources.dialog.faq.items.${k}.a` as FaqAKey)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {resource === 'travelAdvisory' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-brand-subtle p-3">
              <ShieldCheck className="mt-0.5 size-4 flex-shrink-0 text-text-brand" aria-hidden />
              <p className="caption-medium text-text-secondary">{t('resources.dialog.travelAdvisory.note')}</p>
            </div>
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                  t('resources.dialog.travelAdvisory.contactSubject', { name: service.displayName }),
                )}`}
                className="caption-large inline-flex items-center gap-1.5 text-text-brand hover:underline"
              >
                <Mail className="size-4" aria-hidden />
                {t('resources.dialog.travelAdvisory.contact')}
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ResourceTitleKey = `resources.${ResourceKey}`;
type ResourceIntroKey = `resources.dialog.${ResourceKey}.intro`;
type FaqQKey = `resources.dialog.faq.items.${FaqKey}.q`;
type FaqAKey = `resources.dialog.faq.items.${FaqKey}.a`;

/* ============================================================================
 * Progress indicator
 * ========================================================================== */

interface StepProgressProps {
  step: number;
  titles: string[];
}
function StepProgress({ step, titles }: StepProgressProps) {
  const t = useTranslations('community.embassy.services.apply');
  return (
    <div>
      {/* Desktop: numbered dots + titles */}
      <ol className="hidden items-center lg:flex">
        {titles.map((title, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={title} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-9 items-center justify-center rounded-full border caption-large font-semibold transition-colors ${
                    done
                      ? 'border-border-brand bg-surface-brand text-text-white'
                      : active
                        ? 'border-border-brand bg-surface-brand-subtle text-text-brand'
                        : 'border-border-subtle bg-surface-default text-text-secondary'
                  }`}
                >
                  {done ? <CheckCircle2 className="size-5" aria-hidden /> : n}
                </span>
                <span
                  className={`caption-small mt-1.5 max-w-24 text-center ${
                    active ? 'font-medium text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {title}
                </span>
              </div>
              {n < titles.length && (
                <span
                  className={`mx-2 h-0.5 flex-1 self-start ${done ? 'bg-surface-brand' : 'bg-border-subtle'}`}
                  style={{ marginTop: '1.0625rem' }}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between">
          <p className="caption-medium text-text-secondary">
            {t('stepOf', { current: step, total: TOTAL_STEPS })}
          </p>
          <span className="caption-small text-text-secondary">
            {Math.round((step / TOTAL_STEPS) * 100)}%
          </span>
        </div>
        <p className="label-medium mt-0.5 text-text-primary">{titles[step - 1]}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
          <div
            className="h-full rounded-full bg-surface-brand transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Step 1 — Eligibility
 * ========================================================================== */

interface StepEligibilityProps {
  eligibility: Record<string, 'yes' | 'no'>;
  setEligibility: React.Dispatch<React.SetStateAction<Record<string, 'yes' | 'no'>>>;
  complete: boolean;
  onNext: () => void;
}
function StepEligibility({ eligibility, setEligibility, complete, onNext }: StepEligibilityProps) {
  const t = useTranslations('community.embassy.services.apply');
  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <h2 className="label-large text-text-primary">{t('eligibility.title')}</h2>
        <p className="body-small mt-1 text-text-secondary">{t('eligibility.subtitle')}</p>

        <div className="mt-5 space-y-4">
          {ELIGIBILITY_KEYS.map((key) => (
            <fieldset
              key={key}
              className="rounded-lg border border-border-subtle bg-surface-subtle p-4"
            >
              <legend className="caption-large text-text-primary">
                {t(`eligibility.questions.${key}` as EligibilityQKey)}
              </legend>
              <div className="mt-3 flex gap-2">
                {(['yes', 'no'] as const).map((opt) => {
                  const selected = eligibility[key] === opt;
                  return (
                    <label
                      key={opt}
                      className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center label-medium transition-colors ${
                        selected
                          ? 'border-border-brand bg-surface-brand-subtle text-text-brand'
                          : 'border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-subtle'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`eligibility-${key}`}
                        value={opt}
                        checked={selected}
                        onChange={() =>
                          setEligibility((prev) => ({ ...prev, [key]: opt }))
                        }
                        className="sr-only"
                      />
                      {opt === 'yes' ? t('eligibility.yes') : t('eligibility.no')}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <StepNav nextDisabled={!complete} onNext={onNext} />
      </CardContent>
    </Card>
  );
}

// Helper alias so the dynamic `t()` key type-checks against the questions map.
type EligibilityQKey = `eligibility.questions.${EligibilityKey}`;

/* ============================================================================
 * Step 2 — Documents
 * ========================================================================== */

interface StepDocumentsProps {
  fileFields: ServiceRequestFormField[];
  usesFallback: boolean;
  files: Record<string, File>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File>>>;
  onBack: () => void;
  onNext: () => void;
}
function StepDocuments({
  fileFields,
  usesFallback,
  files,
  setFiles,
  onBack,
  onNext,
}: StepDocumentsProps) {
  const t = useTranslations('community.embassy.services.apply');

  // Build the list of upload slots from formFields or the static fallback.
  const slots: { key: string; label: string }[] = usesFallback
    ? FALLBACK_DOC_KEYS.map((k) => ({ key: k, label: t(`documents.fallback.${k}` as DocFallbackKey) }))
    : fileFields.map((f) => ({ key: f.key, label: f.label || f.key }));

  function onPick(key: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
  }

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <h2 className="label-large text-text-primary">{t('documents.title')}</h2>
        <p className="body-small mt-1 text-text-secondary">{t('documents.subtitle')}</p>
        <p className="caption-medium mt-2 text-text-secondary">{t('documents.accepted')}</p>

        <div className="mt-5 space-y-3">
          {slots.map((slot) => {
            const chosen = files[slot.key];
            return (
              <div
                key={slot.key}
                className="rounded-lg border border-border-subtle bg-surface-subtle p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="caption-large text-text-primary">{slot.label}</p>
                    {chosen ? (
                      <p className="caption-small mt-0.5 inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {chosen.name}
                      </p>
                    ) : (
                      <p className="caption-small mt-0.5 text-text-secondary">
                        {t('documents.notUploaded')}
                      </p>
                    )}
                  </div>
                  <label className="caption-large inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-text-brand transition-colors hover:bg-surface-subtle">
                    <UploadCloud className="size-4" aria-hidden />
                    {chosen ? t('documents.replace') : t('documents.choose')}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="sr-only"
                      onChange={(e) => onPick(slot.key, e)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <StepNav onBack={onBack} onNext={onNext} />
      </CardContent>
    </Card>
  );
}

type DocFallbackKey = `documents.fallback.${(typeof FALLBACK_DOC_KEYS)[number]}`;

/* ============================================================================
 * Step 3 — Application (dynamic engine)
 * ========================================================================== */

interface StepApplicationProps {
  applicationFields: ServiceRequestFormField[];
  usesFallback: boolean;
  answers: Record<string, unknown>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  complete: boolean;
  onBack: () => void;
  onNext: () => void;
}
function StepApplication({
  applicationFields,
  usesFallback,
  answers,
  setAnswers,
  complete,
  onBack,
  onNext,
}: StepApplicationProps) {
  const t = useTranslations('community.embassy.services.apply');

  function setValue(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <h2 className="label-large text-text-primary">{t('application.title')}</h2>
        <p className="body-small mt-1 text-text-secondary">{t('application.subtitle')}</p>

        {usesFallback ? (
          <div className="mt-5 space-y-6">
            {/* Personal Information */}
            <section>
              <h3 className="label-medium text-text-primary">
                {t('application.personalInfo')}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PlainField
                  label={t('application.fallback.fullName')}
                  type="text"
                  value={(answers.fullName as string) ?? ''}
                  onChange={(v) => setValue('fullName', v)}
                />
                <PlainField
                  label={t('application.fallback.email')}
                  type="email"
                  value={(answers.email as string) ?? ''}
                  onChange={(v) => setValue('email', v)}
                />
                <PlainField
                  label={t('application.fallback.phone')}
                  type="tel"
                  value={(answers.phone as string) ?? ''}
                  onChange={(v) => setValue('phone', v)}
                />
                <PlainField
                  label={t('application.fallback.dateOfBirth')}
                  type="date"
                  value={(answers.dateOfBirth as string) ?? ''}
                  onChange={(v) => setValue('dateOfBirth', v)}
                />
              </div>
            </section>

            {/* Travel Details */}
            <section>
              <h3 className="label-medium text-text-primary">
                {t('application.travelDetails')}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="caption-large block text-text-primary">
                    {t('application.fallback.purpose')}
                  </label>
                  <select
                    value={(answers.purpose as string) ?? ''}
                    onChange={(e) => setValue('purpose', e.target.value)}
                    className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand"
                  >
                    <option value="">{t('application.selectPlaceholder')}</option>
                    {(['tourism', 'business', 'study', 'family'] as const).map((p) => (
                      <option key={p} value={p}>
                        {t(`application.purposes.${p}` as PurposeKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <PlainField
                  label={t('application.fallback.intendedDate')}
                  type="date"
                  value={(answers.intendedDate as string) ?? ''}
                  onChange={(v) => setValue('intendedDate', v)}
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {applicationFields.map((field) => (
              <DynamicField
                key={field.key}
                field={field}
                value={answers[field.key]}
                onChange={(v) => setValue(field.key, v)}
              />
            ))}
          </div>
        )}

        <StepNav nextDisabled={!complete} onBack={onBack} onNext={onNext} />
      </CardContent>
    </Card>
  );
}

type PurposeKey = `application.purposes.${'tourism' | 'business' | 'study' | 'family'}`;

/** Renders a single dynamic form field based on its `type`. */
interface DynamicFieldProps {
  field: ServiceRequestFormField;
  value: unknown;
  onChange: (value: unknown) => void;
}
function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const type = (field.type ?? 'TEXT').toUpperCase();
  const label = field.label || field.key;
  const options = field.options ?? [];
  const reqMark = field.required ? <span className="ml-0.5 text-text-danger">*</span> : null;

  const inputClass =
    'w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand';

  // CHECKBOX and TEXTAREA can span the full grid; others fit one column.
  const wide = type === 'TEXTAREA';

  if (type === 'TEXTAREA') {
    return (
      <div className={`space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
        <label className="caption-large block text-text-primary">
          {label}
          {reqMark}
        </label>
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>
    );
  }

  if (type === 'CHECKBOX') {
    return (
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border-subtle bg-surface-default p-3 sm:col-span-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 rounded border-border-subtle text-text-brand"
        />
        <span className="caption-large text-text-primary">
          {label}
          {reqMark}
        </span>
      </label>
    );
  }

  if (type === 'SELECT') {
    return (
      <div className="space-y-1.5">
        <label className="caption-large block text-text-primary">
          {label}
          {reqMark}
        </label>
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'RADIO') {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <p className="caption-large text-text-primary">
          {label}
          {reqMark}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={`cursor-pointer rounded-lg border px-3 py-2 caption-large transition-colors ${
                  selected
                    ? 'border-border-brand bg-surface-brand-subtle text-text-brand'
                    : 'border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-subtle'
                }`}
              >
                <input
                  type="radio"
                  name={`field-${field.key}`}
                  value={opt}
                  checked={selected}
                  onChange={() => onChange(opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // TEXT / EMAIL / NUMBER / DATE → a plain input.
  const htmlType =
    type === 'EMAIL' ? 'email' : type === 'NUMBER' ? 'number' : type === 'DATE' ? 'date' : 'text';

  return (
    <div className="space-y-1.5">
      <label className="caption-large block text-text-primary">
        {label}
        {reqMark}
      </label>
      <input
        type={htmlType}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

/** A plain labelled input used by the static Application fallback. */
interface PlainFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}
function PlainField({ label, type, value, onChange }: PlainFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="caption-large block text-text-primary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand"
      />
    </div>
  );
}

/* ============================================================================
 * Step 4 — Review
 * ========================================================================== */

interface StepReviewProps {
  service: ServiceRequestTypeDetail;
  eligibility: Record<string, 'yes' | 'no'>;
  answers: Record<string, unknown>;
  applicationFields: ServiceRequestFormField[];
  usesFallbackApplication: boolean;
  fileFields: ServiceRequestFormField[];
  usesFallbackDocs: boolean;
  files: Record<string, File>;
  onEdit: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
}
function StepReview({
  eligibility,
  answers,
  applicationFields,
  usesFallbackApplication,
  fileFields,
  usesFallbackDocs,
  files,
  onEdit,
  onBack,
  onNext,
}: StepReviewProps) {
  const t = useTranslations('community.embassy.services.apply');

  // Application answers as label/value rows.
  const appRows: { label: string; value: string }[] = usesFallbackApplication
    ? FALLBACK_KEYS.map((k) => ({
        label:
          k === 'purpose'
            ? t('application.fallback.purpose')
            : t(`application.fallback.${k}` as FallbackLabelKey),
        value: formatAnswer(k, answers[k], t),
      }))
    : applicationFields.map((f) => ({
        label: f.label || f.key,
        value: formatAnswer(f.key, answers[f.key], t),
      }));

  const docSlots: { key: string; label: string }[] = usesFallbackDocs
    ? FALLBACK_DOC_KEYS.map((k) => ({ key: k, label: t(`documents.fallback.${k}` as DocFallbackKey) }))
    : fileFields.map((f) => ({ key: f.key, label: f.label || f.key }));

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <h2 className="label-large text-text-primary">{t('review.title')}</h2>
        <p className="body-small mt-1 text-text-secondary">{t('review.subtitle')}</p>

        <div className="mt-5 space-y-5">
          {/* Eligibility */}
          <ReviewSection title={t('steps.eligibility')} onEdit={() => onEdit(1)} editLabel={t('review.edit')}>
            <dl className="space-y-2">
              {ELIGIBILITY_KEYS.map((k) => (
                <ReviewRow
                  key={k}
                  label={t(`eligibility.questions.${k}` as EligibilityQKey)}
                  value={
                    eligibility[k] === 'yes'
                      ? t('eligibility.yes')
                      : eligibility[k] === 'no'
                        ? t('eligibility.no')
                        : '—'
                  }
                />
              ))}
            </dl>
          </ReviewSection>

          {/* Application */}
          <ReviewSection title={t('steps.application')} onEdit={() => onEdit(3)} editLabel={t('review.edit')}>
            <dl className="space-y-2">
              {appRows.map((row) => (
                <ReviewRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          </ReviewSection>

          {/* Documents */}
          <ReviewSection title={t('steps.documents')} onEdit={() => onEdit(2)} editLabel={t('review.edit')}>
            <ul className="space-y-2">
              {docSlots.map((slot) => {
                const chosen = files[slot.key];
                return (
                  <li key={slot.key} className="flex items-center gap-2 caption-large">
                    <CheckCircle2
                      className={`size-4 flex-shrink-0 ${chosen ? 'text-green-600' : 'text-text-secondary'}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-text-primary">{slot.label}</span>
                    <span className="caption-small flex-shrink-0 text-text-secondary">
                      {chosen ? chosen.name : t('review.missing')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ReviewSection>
        </div>

        <StepNav onBack={onBack} onNext={onNext} nextLabel={t('review.proceed')} />
      </CardContent>
    </Card>
  );
}

type FallbackLabelKey = `application.fallback.${(typeof FALLBACK_KEYS)[number]}`;

/** Stringify a stored answer for the read-only review. */
function formatAnswer(
  key: string,
  value: unknown,
  t: ReturnType<typeof useTranslations>,
): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? t('eligibility.yes') : t('eligibility.no');
  if (key === 'purpose' && typeof value === 'string') {
    const known = ['tourism', 'business', 'study', 'family'];
    if (known.includes(value)) return t(`application.purposes.${value}` as PurposeKey);
  }
  return String(value);
}

interface ReviewSectionProps {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}
function ReviewSection({ title, editLabel, onEdit, children }: ReviewSectionProps) {
  return (
    <section className="rounded-lg border border-border-subtle p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="label-medium text-text-primary">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="caption-large inline-flex items-center gap-1 text-text-brand hover:underline"
        >
          <Pencil className="size-3.5" aria-hidden />
          {editLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
}
function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="caption-medium text-text-secondary">{label}</dt>
      <dd className="caption-large min-w-0 max-w-[60%] truncate text-right text-text-primary">
        {value}
      </dd>
    </div>
  );
}

/* ============================================================================
 * Step 5 — Payment
 * ========================================================================== */

interface StepPaymentProps {
  service: ServiceRequestTypeDetail;
  isFree: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}
function StepPayment({
  service,
  isFree,
  paymentMethod,
  setPaymentMethod,
  submitting,
  error,
  onBack,
  onSubmit,
}: StepPaymentProps) {
  const t = useTranslations('community.embassy.services.apply');
  const tFee = useTranslations('community.embassy.services.fee');

  const zero = formatZero(service.feeCurrency);
  const feeCurrency = (service.feeCurrency || 'EUR').toUpperCase();

  // Big icon method buttons mirroring MembershipPaymentModal's PayStep. Card +
  // Mobile Money are selectable; the rest are shown but disabled (coming soon).
  const methods: {
    key: PaymentMethod;
    icon: LucideIcon;
    label: string;
    subtitle: string;
    enabled: boolean;
  }[] = [
    { key: 'card', icon: CreditCard, label: t('payment.methods.card'), subtitle: t('payment.methods.cardSub'), enabled: true },
    { key: 'mobile', icon: Smartphone, label: t('payment.methods.mobile'), subtitle: t('payment.methods.mobileSub'), enabled: true },
    { key: 'bank', icon: Building2, label: t('payment.methods.bank'), subtitle: t('payment.comingSoon'), enabled: false },
    { key: 'wallet', icon: Wallet, label: t('payment.methods.wallet'), subtitle: t('payment.comingSoon'), enabled: false },
    { key: 'usdt', icon: Coins, label: t('payment.methods.usdt'), subtitle: t('payment.comingSoon'), enabled: false },
  ];

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-5">
        <h2 className="label-large text-text-primary">{t('payment.title')}</h2>
        <p className="body-small mt-1 text-text-secondary">{t('payment.subtitle')}</p>

        {/* Fee breakdown */}
        <div className="mt-5 rounded-lg border border-border-subtle bg-surface-subtle p-4">
          <dl className="space-y-2">
            <div className="flex items-start justify-between caption-large">
              <dt className="text-text-secondary">{t('payment.serviceFee')}</dt>
              <dd className="text-right text-text-primary">
                <ServiceFee minor={service.feeAmountMinor} currency={service.feeCurrency} />
              </dd>
            </div>
            <div className="flex items-center justify-between caption-large">
              <dt className="text-text-secondary">{t('payment.processingFee')}</dt>
              <dd className="text-text-primary">{`${t('payment.free')} · ${zero}`}</dd>
            </div>
            <div className="mt-1 flex items-start justify-between border-t border-border-subtle pt-2 label-medium">
              <dt className="text-text-primary">{t('payment.total')}</dt>
              <dd className="text-right text-text-brand">
                {isFree ? (
                  t('payment.free')
                ) : (
                  <ServiceFee
                    minor={service.feeAmountMinor}
                    currency={service.feeCurrency}
                    size="lg"
                  />
                )}
              </dd>
            </div>
          </dl>
          {!isFree && (
            <p className="caption-small mt-2 text-text-secondary">
              {tFee('chargedIn', { currency: feeCurrency })}
            </p>
          )}
        </div>

        {/* Method selector */}
        {!isFree && (
          <div className="mt-5 space-y-3">
            <h3 className="label-medium text-text-primary">{t('payment.chooseMethod')}</h3>
            {methods.map((m) => {
              const Icon = m.icon;
              const selected = paymentMethod === m.key && m.enabled;
              return (
                <button
                  key={m.key}
                  type="button"
                  disabled={!m.enabled}
                  onClick={() => m.enabled && setPaymentMethod(m.key)}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                    selected
                      ? 'border-border-brand bg-surface-brand-subtle'
                      : 'border-border-subtle bg-surface-subtle hover:bg-surface-default'
                  } ${!m.enabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span
                    className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full ${
                      selected ? 'bg-surface-brand text-text-white' : 'bg-surface-default text-text-primary'
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="label-medium block text-text-primary">{m.label}</span>
                    <span className="caption-small block text-text-secondary">{m.subtitle}</span>
                  </span>
                  {selected && (
                    <CheckCircle2 className="size-5 flex-shrink-0 text-text-brand" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isFree && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-brand-subtle p-3">
            <ShieldCheck className="mt-0.5 size-4 flex-shrink-0 text-text-brand" aria-hidden />
            <p className="caption-medium text-text-secondary">{t('payment.freeNote')}</p>
          </div>
        )}

        {error && (
          <p role="alert" className="caption-medium mt-4 text-text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t('back')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="label-medium inline-flex items-center justify-center gap-2 rounded-lg bg-surface-brand px-5 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isFree ? t('payment.submitCta') : t('payment.payCta')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Step 6 — Success
 * ========================================================================== */

interface StepSuccessProps {
  result: SubmitServiceRequestResult | null;
  tabHref: (tab: string) => { pathname: string; query: Record<string, string> };
}
function StepSuccess({ result, tabHref }: StepSuccessProps) {
  const t = useTranslations('community.embassy.services.apply');
  const nextItems = ['review', 'notify', 'track'] as const;

  return (
    <Card className="border-border-subtle">
      <CardContent className="p-6 text-center sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="size-9 text-green-600" aria-hidden />
        </span>
        <h2 className="heading-xsmall mt-4 text-text-primary">{t('success.title')}</h2>
        <p className="body-small mt-1 text-text-secondary">{t('success.subtitle')}</p>

        {/* Request reference */}
        <div className="mx-auto mt-5 max-w-sm rounded-lg border border-border-subtle bg-surface-subtle p-4 text-left">
          <div className="flex items-center justify-between caption-large">
            <span className="text-text-secondary">{t('success.requestNumber')}</span>
            <span className="font-medium text-text-primary">{result?.requestNumber ?? '—'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between caption-large">
            <span className="text-text-secondary">{t('success.status')}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 caption-small font-medium text-green-600">
              {result?.status ?? '—'}
            </span>
          </div>
          {result?.paymentStatus && (
            <div className="mt-2 flex items-center justify-between caption-large">
              <span className="text-text-secondary">{t('success.paymentStatus')}</span>
              <span className="font-medium text-text-primary">{result.paymentStatus}</span>
            </div>
          )}
        </div>

        {/* What's next */}
        <div className="mx-auto mt-5 max-w-sm rounded-lg border border-border-subtle p-4 text-left">
          <h3 className="label-medium text-text-primary">{t('success.whatsNext')}</h3>
          <ol className="mt-3 space-y-3">
            {nextItems.map((item, i) => (
              <li key={item} className="flex gap-3">
                <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle caption-small font-semibold text-text-brand">
                  {i + 1}
                </span>
                <p className="caption-large text-text-secondary">
                  {t(`success.next.${item}` as NextKey)}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
          <Link
            href={tabHref('track-requests')}
            scroll={false}
            className="label-medium flex-1 rounded-lg bg-surface-brand px-4 py-2.5 text-center text-text-white transition-colors hover:opacity-90"
          >
            {t('success.trackCta')}
          </Link>
          <Link
            href={tabHref('services')}
            scroll={false}
            className="label-medium flex-1 rounded-lg border border-border-subtle px-4 py-2.5 text-center text-text-brand transition-colors hover:bg-surface-subtle"
          >
            {t('success.returnCta')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

type NextKey = `success.next.${'review' | 'notify' | 'track'}`;

/* ============================================================================
 * Shared bits
 * ========================================================================== */

/** Footer nav shared by the editable steps. */
interface StepNavProps {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}
function StepNav({ onBack, onNext, nextDisabled, nextLabel }: StepNavProps) {
  const t = useTranslations('community.embassy.services.apply');
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="label-medium inline-flex items-center gap-1 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t('back')}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="label-medium inline-flex items-center gap-1 rounded-lg bg-surface-brand px-5 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {nextLabel ?? t('continue')}
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: React.ReactNode;
}
function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="caption-medium text-text-secondary">{label}</dt>
      <dd className="caption-large min-w-0 max-w-[60%] text-right font-medium text-text-primary">
        {value}
      </dd>
    </div>
  );
}

interface ResourceRowProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}
function ResourceRow({ icon: Icon, label, onClick }: ResourceRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-subtle"
      >
        <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-subtle">
          <Icon className="size-4 text-text-brand" aria-hidden />
        </span>
        <span className="caption-large min-w-0 flex-1 truncate text-text-primary">{label}</span>
        <ChevronRight className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
      </button>
    </li>
  );
}

export default EmbassyServiceApply;
