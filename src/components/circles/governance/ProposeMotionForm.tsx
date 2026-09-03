'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import {
  Select as SelectA,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { Link, useRouter } from '@/i18n/navigation';
import {
  CIRCLE,
  CIRCLE_GOVERNANCE_RULES,
  CIRCLE_MEMBERS,
  MY_CIRCLE_MEMBERSHIP,
  OPEN_CIRCLE_MOTION,
} from '@/services/gql/circles-actions';
import { CIRCLE_PROJECTS } from '@/services/gql/circles';
import type {
  Circle,
  CircleGovernanceRulesData,
  CircleMember,
  CircleMembershipCheck,
  CircleMotionKind,
  CircleProject,
  OpenCircleMotionData,
  OpenCircleMotionVariables,
} from '@/services/gql/types/circles';
import type { CircleMotionDraft } from '@/services/gql/types/circles-actions';

import { circleCanOpenMotions, rulePermitsProposal, ruleForKind } from './actionPolicy';
import { majorityKey, quorumKey, windowParts } from './governanceCopy';
import { MOTION_KIND_ORDER } from './motionKinds';
import {
  emptyMotionPayload,
  motionKindNeedsStructuredPayload,
  motionKindRequiresSubject,
  motionSubjectKind,
  motionSubjectType,
} from './motionPayload';
import { readCircleWrite, refusalMessageKey } from './mutationOutcome';

/**
 * @fileoverview Propose anything — the general governance entry point.
 * @module components/circles/governance/ProposeMotionForm
 *
 * ── WHY THIS SCREEN IS THE ONLY WAY TO EXPRESS MOST DECISIONS ───────────────
 * There is no mutation for removing a member, appointing a lead, or overriding
 * a vote — not in the gateway and not in the proto. Every such change is the
 * ENACTMENT of a passed motion, so `openCircleMotion` with the matching `kind`
 * is the whole vocabulary. The absence of a direct rpc is the design.
 *
 * ── WHY SOME KINDS ARE NOT OPENED FROM HERE ─────────────────────────────────
 * A motion's `payloadJson` is validated by NOTHING until the dispatcher reads
 * it — after the motion has opened, run its window and PASSED. A
 * CHANGE_JOIN_MODE motion proposed without a `joinMode` key therefore costs the
 * circle a real vote and then lands in `ENACTMENT_FAILED`.
 *
 * So the kinds that need structured arguments are listed here as LINKS to the
 * screen that collects them, rather than being offered as a title-and-rationale
 * form that produces an unenactable motion. That is a deliberate refusal to
 * implement the shortest version of this screen; the shortest version is the
 * one that quietly wastes votes.
 *
 * ── `proposerRole` IS READ, NOT ASSUMED ─────────────────────────────────────
 * Who may open which kind is a per-kind rule on the circle's own constitution.
 * The picker disables a kind this member cannot propose and says why, rather
 * than hiding it — a member who cannot propose a REMOVE_MEMBER motion should
 * learn that their circle reserves it to leads.
 *
 * `myCircleMembership.canPropose` is circle-service's own advisory verdict and
 * is a SINGLE boolean for the whole circle, so it cannot answer a per-kind
 * question by itself; it is ANDed with the rule rather than trusted alone.
 */

interface CircleData {
  circle?: Circle | null;
}
interface MembershipData {
  myCircleMembership?: CircleMembershipCheck | null;
}
interface MembersData {
  circleMembers?: CircleMember[] | null;
}
interface ProjectsData {
  circleProjects?: CircleProject[] | null;
}

/**
 * Where a kind that needs structured arguments is proposed from instead.
 *
 * Keyed by kind so a missing entry is impossible to miss: the form falls back
 * to the governance screen, which at least explains the rules.
 */
const KIND_ROUTE: Partial<Record<CircleMotionKind, string>> = {
  CREATE_PROJECT: 'projects/new',
  CREATE_CHALLENGE: 'challenges/new',
  CHANGE_JOIN_MODE: 'settings',
  SET_DISCOVERABLE: 'settings',
  CHANGE_PLAN: 'plan',
  AMEND_RULES: 'governance',
  VERIFY_CHALLENGE_ENTRY: 'challenges',
};

const EMPTY_DRAFT: CircleMotionDraft = {
  kind: 'CUSTOM',
  title: '',
  rationale: '',
};

export interface ProposeMotionFormProps {
  circleId: string;
  /** Preselects a kind, e.g. when arriving from a member's overflow menu. */
  initialKind?: CircleMotionKind;
  onDone?: () => void;
}

export function ProposeMotionForm({
  circleId,
  initialKind,
  onDone,
}: ProposeMotionFormProps) {
  const t = useTranslations('circles.newMotion');
  const tGov = useTranslations('circles.governance');
  const tActions = useTranslations('circles.actions');
  const tCommon = useTranslations('circles.common');
  const tMembers = useTranslations('circles.members');
  const router = useRouter();

  const [draft, setDraft] = useState<CircleMotionDraft>({
    ...EMPTY_DRAFT,
    ...(initialKind ? { kind: initialKind } : {}),
  });
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const { data: circleData } = useQuery<CircleData>(CIRCLE, {
    variables: { circleId },
    errorPolicy: 'all',
  });
  const { data: membershipData } = useQuery<MembershipData>(MY_CIRCLE_MEMBERSHIP, {
    variables: { circleId },
    errorPolicy: 'all',
  });
  const { data: rulesData } = useQuery<CircleGovernanceRulesData>(
    CIRCLE_GOVERNANCE_RULES,
    { variables: { circleId }, errorPolicy: 'all' },
  );

  const subjectKind = motionSubjectKind(draft.kind);

  const { data: membersData } = useQuery<MembersData>(CIRCLE_MEMBERS, {
    // Prefixed spelling — the gateway's `$status` arg is a registered GraphQL
    // enum and rejects the bare `ACTIVE` the domain uses.
    variables: { circleId, status: 'MEMBERSHIP_ACTIVE', limit: 100 },
    skip: subjectKind !== 'MEMBER',
    errorPolicy: 'all',
  });

  const { data: projectsData } = useQuery<ProjectsData>(CIRCLE_PROJECTS, {
    variables: { circleId, status: 'PROJECT_ACTIVE', limit: 100 },
    skip: subjectKind !== 'PROJECT',
    errorPolicy: 'all',
  });

  const circle = circleData?.circle ?? null;
  const membership = membershipData?.myCircleMembership ?? null;
  const rules = rulesData?.circleGovernanceRules;

  const members = useMemo(() => membersData?.circleMembers ?? [], [membersData]);
  const projects = useMemo(() => projectsData?.circleProjects ?? [], [projectsData]);
  const { usersById } = useCircleUsers(
    useMemo(() => members.map((m) => m.userId), [members]),
  );

  const isLead = membership?.isLead ?? false;
  const canProposeAtAll =
    (membership?.isMember ?? false) &&
    (membership?.canPropose ?? false) &&
    circleCanOpenMotions(circle?.status);

  /** Kinds this member may actually open, with the reason when they may not. */
  const kindOptions = useMemo(
    () =>
      MOTION_KIND_ORDER.map((kind) => {
        const rule = ruleForKind(rules, kind);
        return {
          kind,
          rule,
          needsRedirect: motionKindNeedsStructuredPayload(kind),
          permitted: rulePermitsProposal(rule, isLead),
        };
      }),
    [rules, isLead],
  );

  const selected = kindOptions.find((option) => option.kind === draft.kind) ?? null;
  const rule = selected?.rule ?? null;
  const redirect = selected?.needsRedirect ? KIND_ROUTE[draft.kind] ?? 'governance' : null;

  const [openMotion] = useMutation<OpenCircleMotionData, OpenCircleMotionVariables>(
    OPEN_CIRCLE_MOTION,
    { refetchQueries: ['CircleMotions'], awaitRefetchQueries: true },
  );

  const title = draft.title.trim();
  const subjectSatisfied = !motionKindRequiresSubject(draft.kind) || subjectId !== '';
  const canSubmit =
    !redirect &&
    canProposeAtAll &&
    (selected?.permitted ?? false) &&
    title.length > 0 &&
    subjectSatisfied &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const key = idempotencyKey ?? crypto.randomUUID();
    if (idempotencyKey === null) setIdempotencyKey(key);

    try {
      const result = await openMotion({
        variables: {
          input: {
            circleId,
            kind: draft.kind,
            title,
            rationale: draft.rationale.trim() || undefined,
            // `subjectType` is never read by the enactment dispatcher — only
            // `subjectId` is load-bearing — but it is what the motion list and
            // the audit trail render, and a motion whose subject shows as a
            // bare UUID is unreadable months later.
            subjectType: subjectId ? motionSubjectType(draft.kind) ?? undefined : undefined,
            subjectId: subjectId || undefined,
            // Every kind reachable from this form is one the dispatcher can
            // apply from its subject alone; the rest are redirected above.
            payloadJson: emptyMotionPayload(),
            idempotencyKey: key,
          },
        },
      });

      // `data`, not the absence of a throw — the app's global
      // `errorPolicy: 'all'` resolves refusals. See `./mutationOutcome.ts`.
      const outcome = readCircleWrite(result, (d) => d.openCircleMotion);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      toast.success(t('opened'));
      setIdempotencyKey(null);
      if (onDone) onDone();
      else router.push(`/circles/${circleId}/motions/${outcome.data.id}`);
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    } finally {
      setSubmitting(false);
    }
  }

  /** What a vote on the selected kind would require, in the circle's own numbers. */
  const ruleSummary = rule
    ? t('ruleSummary', {
        majority: tGov(
          `majority.${majorityKey(rule.majorityNumerator, rule.majorityDenominator)}`,
          { n: rule.majorityNumerator, d: rule.majorityDenominator },
        ),
        quorum: tGov(
          `quorum.${quorumKey(rule.quorumNumerator, rule.quorumDenominator)}`,
          { n: rule.quorumNumerator, d: rule.quorumDenominator },
        ),
        window: tGov(`window.${windowParts(rule.votingWindowHours).unit}`, {
          count: windowParts(rule.votingWindowHours).count,
        }),
      })
    : null;

  return (
    <div className="space-y-6">
      {!canProposeAtAll && (
        <p
          className="body-small rounded-lg border border-border-subtle p-4 text-text-danger"
          role="status"
        >
          {circleCanOpenMotions(circle?.status)
            ? t('cannotPropose')
            : // DORMANT withholds exactly one thing: opening motions. Everything
              // else about the circle still works, so the copy says that rather
              // than implying the circle is broken.
              t('circleCannotVote')}
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="motion-kind" className="label-medium text-text-primary">
          {t('kindLabel')}
        </label>
        <SelectA
          value={draft.kind}
          onValueChange={(v) => {
            setDraft((prev) => ({ ...prev, kind: v as CircleMotionKind }));
            // The subject belongs to the kind that asked for it. Carrying a
            // member id across to CLOSE_PROJECT would send a user id as a
            // project id — accepted by the schema, refused at enactment.
            setSubjectId('');
          }}
          disabled={submitting}
        >
          <SelectTrigger id="motion-kind" className="w-full">
            <SelectValue placeholder={t('kindPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {kindOptions.map((option) => (
              <SelectItem
                key={option.kind}
                value={option.kind}
                // Disabled, not hidden: a member should learn that their circle
                // reserves this kind to leads.
                disabled={!option.permitted}
              >
                {tGov(`motionKind.${option.kind}`)}
                {!option.permitted ? ` — ${tGov('proposer.lead')}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectA>
        {ruleSummary && !redirect && (
          <p className="caption-small text-text-secondary">{ruleSummary}</p>
        )}
      </div>

      {/*
        A kind whose arguments this form cannot collect. Opening it here would
        produce a motion that passes and then cannot be enacted, so the screen
        hands over instead of pretending.
      */}
      {redirect ? (
        <div className="space-y-3 rounded-lg bg-surface-brand-light p-4">
          <p className="body-small text-text-brand">{t('proposedElsewhere')}</p>
          <Link
            href={`/circles/${circleId}/${redirect}`}
            className="label-medium inline-flex items-center gap-1.5 text-text-brand underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
          >
            {t('goToScreen')}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          {subjectKind === 'MEMBER' && (
            <div className="space-y-2">
              <label htmlFor="motion-subject-member" className="label-medium text-text-primary">
                {t('subjectMemberLabel')}
                <span className="ml-1 text-text-danger">*</span>
              </label>
              <SelectA
                value={subjectId || undefined}
                onValueChange={setSubjectId}
                disabled={submitting}
              >
                <SelectTrigger id="motion-subject-member" className="w-full">
                  <SelectValue placeholder={t('subjectMemberPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {circleUserDisplayName(usersById[member.userId], tMembers('lead'))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectA>
            </div>
          )}

          {subjectKind === 'PROJECT' && (
            <div className="space-y-2">
              <label htmlFor="motion-subject-project" className="label-medium text-text-primary">
                {t('subjectProjectLabel')}
                <span className="ml-1 text-text-danger">*</span>
              </label>
              <SelectA
                value={subjectId || undefined}
                onValueChange={setSubjectId}
                disabled={submitting}
              >
                <SelectTrigger id="motion-subject-project" className="w-full">
                  <SelectValue placeholder={t('subjectProjectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectA>
            </div>
          )}

          <TextInput
            id="motion-title"
            type="text"
            value={draft.title}
            onChange={(v: string) => setDraft((prev) => ({ ...prev, title: v }))}
            label={t('titleLabel')}
            placeholder={t('titlePlaceholder')}
            required
            disabled={submitting}
          />

          <div className="space-y-2">
            <label htmlFor="motion-rationale" className="label-medium text-text-primary">
              {t('rationaleLabel')}
            </label>
            <textarea
              id="motion-rationale"
              value={draft.rationale}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, rationale: e.target.value }))
              }
              placeholder={t('rationalePlaceholder')}
              rows={4}
              disabled={submitting}
              className="w-full rounded-md border-2 border-border-subtle bg-surface-subtle px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:border-border-brand"
            />
            <p className="caption-small text-text-secondary">{t('rationaleHint')}</p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonType2
              size="lg"
              className="flex-1"
              onClick={submit}
              disabled={!canSubmit}
            >
              {submitting ? t('opening') : t('open')}
            </ButtonType2>
            <ButtonType1 size="lg" onClick={() => router.back()} disabled={submitting}>
              {tCommon('cancel')}
            </ButtonType1>
          </div>
        </>
      )}
    </div>
  );
}
