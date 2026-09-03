'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { ButtonType2 } from '@/components/custom/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import { SUPPORT_CASE_TYPES } from '@/services/gql/embassyServices';
import type {
  SupportCaseType,
  SupportCaseTypesResponse,
} from '@/services/gql/embassyServices';
import { MY_CIRCLE_MEMBERSHIP } from '@/services/gql/circles';
import type { CircleMembershipCheck } from '@/services/gql/types/circles';

import {
  REPORT_CIRCLE_TO_SUPPORT,
  type ReportCircleToSupportData,
  type ReportCircleToSupportVariables,
} from './reportGql';

/**
 * @fileoverview Report a circle to the platform.
 * @module components/circles/report/ReportCircleForm
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  WHY THIS SCREEN EXISTS, AND WHY ITS INTRO COPY IS LOAD-BEARING
 * ═══════════════════════════════════════════════════════════════════════════
 * A circle governs itself. The platform supplies the voting machinery and
 * never adjudicates: there is no rpc by which DiaspoPlug settles an argument
 * inside a circle, and that absence is the product, not a gap.
 *
 * So this form is the ONE route out — for illegal activity and violations of
 * the platform's own rules, and nothing else. The intro paragraph is doing
 * real work: a member who arrives here expecting DiaspoPlug to referee a
 * disagreement about who runs a project must leave understanding that it will
 * not. Softening that copy would turn Trust & Safety into an appeals court for
 * every circle on the platform, which is exactly what self-governance is meant
 * to avoid.
 *
 * ── WHERE THE REPORT GOES ───────────────────────────────────────────────────
 * `reportCircleToSupport` files a SYSTEM-owned support case, with the circle
 * carried as a generic linked entity rather than as the case's OWNER. Owners
 * triage their own cases; a circle-owned case about a circle would land in the
 * inbox of the very LEADs it may be about. See `reportGql.ts`.
 *
 * ── CONFIDENTIALITY IS A SCHEMA PROPERTY, NOT A PROMISE THIS FILE KEEPS ─────
 * The footer tells the reporter their identity stays confidential. The
 * `CircleReportLink` type this mutation returns has no reporter field at all,
 * so there is nothing here that could be rendered back to the circle. Nothing
 * on this screen writes to any circle-visible feed, and the success state
 * names no one. Keep it that way: any future "reported by" affordance breaks a
 * promise the copy has already made.
 *
 * ── THE REASONS ARE THE SERVER'S, NOT OURS ─────────────────────────────────
 * There is no report-reason enum anywhere in the API. The reason a case is
 * filed under is a support-service `caseType`, and the ones a circle report
 * may use are the SYSTEM-owned rows — admin-managed, so a hardcoded list here
 * would drift silently the day someone adds one. The picker therefore renders
 * `caseTypes(ownerType: SYSTEM)` verbatim.
 *
 * A consequence worth stating: if that list comes back EMPTY — support-service
 * unreachable, or no SYSTEM case types configured — the form refuses to submit
 * and says so. `caseTypeId` is required by circle-service (`requireId`), so a
 * submit without one is a guaranteed refusal; letting the button through would
 * be a form that pretends.
 */

type CaseTypesData = SupportCaseTypesResponse;
interface MembershipData {
  myCircleMembership?: CircleMembershipCheck | null;
}

const TEXTAREA_CLASS =
  'w-full rounded-md border-2 border-border-subtle bg-surface-subtle px-3 py-2 ' +
  'text-text-primary placeholder:text-text-secondary focus:outline-none ' +
  'focus-visible:border-border-brand';

/** Long enough that "he was rude" cannot pass as a platform-rule violation. */
const MIN_DETAIL_LENGTH = 20;
/** Guards the VARCHAR the case description lands in and keeps the queue readable. */
const MAX_DETAIL_LENGTH = 4000;

export interface ReportCircleFormProps {
  circleId: string;
}

export function ReportCircleForm({ circleId }: ReportCircleFormProps) {
  const t = useTranslations('circles.report');
  const tCommon = useTranslations('circles.common');

  const [caseTypeId, setCaseTypeId] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: typesData, loading: typesLoading } = useQuery<CaseTypesData>(
    SUPPORT_CASE_TYPES,
    { variables: { ownerType: 'SYSTEM' }, errorPolicy: 'all' },
  );

  // The gateway gates this mutation at MEMBER (`assertCircleMember`), so a
  // non-member's submit is refused server-side. Reading standing up front
  // turns that into an explanation instead of a failed submit. Note the
  // asymmetry: circle-service itself deliberately does NOT require membership
  // — the people with most cause to report a circle are the ones it already
  // ejected — but the gateway does, and the gateway is what this screen talks
  // to. Advisory only; the server remains the authority either way.
  const { data: membershipData } = useQuery<MembershipData>(MY_CIRCLE_MEMBERSHIP, {
    variables: { circleId },
    errorPolicy: 'all',
  });

  const reasons: SupportCaseType[] = useMemo(
    () => (typesData?.caseTypes ?? []).filter((row) => row.isActive !== false),
    [typesData],
  );

  const isMember = membershipData?.myCircleMembership?.isMember ?? true;
  const noReasons = !typesLoading && reasons.length === 0;

  const [reportCircle] = useMutation<
    ReportCircleToSupportData,
    ReportCircleToSupportVariables
  >(REPORT_CIRCLE_TO_SUPPORT);

  const trimmedDetails = details.trim();
  const selectedReason = reasons.find((row) => row.id === caseTypeId) ?? null;
  const canSubmit =
    isMember &&
    !noReasons &&
    selectedReason !== null &&
    trimmedDetails.length >= MIN_DETAIL_LENGTH &&
    !submitting;

  async function submit() {
    if (!canSubmit || selectedReason === null) return;
    setSubmitting(true);

    try {
      const result = await reportCircle({
        variables: {
          input: {
            circleId,
            caseTypeId: selectedReason.id,
            // No title field in the design, and circle-service requires one.
            // The reason's display name is the honest derivation: it is what
            // the reporter chose, in the platform's own vocabulary.
            title: selectedReason.displayName,
            description: trimmedDetails.slice(0, MAX_DETAIL_LENGTH),
            // The circle as a whole. `subjectId` is left unset on purpose: it
            // is a UUID column, and circle-service refuses a malformed value
            // BEFORE filing precisely so a bad id cannot strand an open case.
            subjectType: 'CIRCLE',
          },
        },
      });

      // `data`, not the absence of a throw. The app sets `errorPolicy: 'all'`
      // globally, so a REFUSED mutation resolves with `data: null` and sails
      // straight past the await — the usual try/catch shape would toast
      // "report sent" at someone whose abuse report was rejected.
      const outcome = readMutationOutcome(result, (d) => d.reportCircleToSupport);
      if (!outcome.ok) {
        toast.error(t(errorKey(outcome.message)));
        return;
      }

      toast.success(t('success'));
      setSent(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast.error(t(errorKey(message)));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle p-4">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-text-brand" />
          <div className="space-y-1">
            <p className="label-medium text-text-primary">{t('sentTitle')}</p>
            {/* Names no one — see the module doc on confidentiality. */}
            <p className="body-small text-text-secondary">{t('sentBody')}</p>
          </div>
        </div>
        <Link
          href={`/circles/${circleId}`}
          className="label-medium flex w-full items-center justify-center rounded-full border border-text-brand bg-surface-default px-6 py-3 text-text-brand transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          {t('backToCircle')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="body-small text-text-secondary">{t('intro')}</p>

      {!isMember && (
        <p className="body-small rounded-lg border border-border-subtle p-4 text-text-danger" role="status">
          {t('notMember')}
        </p>
      )}

      {noReasons && (
        <p className="body-small rounded-lg border border-border-subtle p-4 text-text-danger" role="status">
          {t('reasonsUnavailable')}
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="report-reason" className="label-medium text-text-primary">
          {t('reasonLabel')}
          <span className="ml-1 text-text-danger">*</span>
        </label>
        <Select
          value={caseTypeId || undefined}
          onValueChange={setCaseTypeId}
          disabled={submitting || typesLoading || noReasons || !isMember}
        >
          <SelectTrigger id="report-reason" className="w-full">
            <SelectValue placeholder={t('reasonPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {reasons.map((reason) => (
              <SelectItem key={reason.id} value={reason.id}>
                {reason.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="report-details" className="label-medium text-text-primary">
          {t('detailsLabel')}
          <span className="ml-1 text-text-danger">*</span>
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t('detailsPlaceholder')}
          rows={6}
          maxLength={MAX_DETAIL_LENGTH}
          required
          aria-describedby="report-details-hint"
          disabled={submitting || !isMember}
          className={TEXTAREA_CLASS}
        />
        <p id="report-details-hint" className="caption-small text-text-secondary">
          {t('detailsHint', { count: MIN_DETAIL_LENGTH })}
        </p>
      </div>

      {/*
        The confidentiality promise sits with the button that acts on it, not
        buried at the top — it is the last thing read before submitting, which
        is when it matters.
      */}
      <p className="caption-small text-text-secondary">{t('confidentialityNote')}</p>

      <ButtonType2 size="lg" className="w-full" onClick={submit} disabled={!canSubmit}>
        {submitting ? t('submitting') : t('submit')}
      </ButtonType2>

      <p className="caption-small text-center text-text-secondary">
        <Link
          href={`/circles/${circleId}`}
          className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          {tCommon('cancel')}
        </Link>
      </p>
    </div>
  );
}

/**
 * Server refusal → a key inside THIS screen's namespace.
 *
 * `refusalMessageKey` builds `${namespace}.${suffix}`, and `useTranslations`
 * is already scoped to `circles.report` — so the namespace passed here is the
 * REMAINDER of the path, not the whole of it. Passing the full path would
 * produce `circles.report.circles.report.errors.failed` and render a raw key
 * at the exact moment the user is being told their report failed.
 */
function errorKey(message: string | undefined): string {
  return refusalMessageKey(message, 'errors');
}
