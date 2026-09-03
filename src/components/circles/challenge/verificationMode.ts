import type { ComponentType } from 'react';
import { HeartHandshake, UserCheck, Vote } from 'lucide-react';

import type { CircleVerificationMode } from '@/services/gql/types/circles';

/**
 * @fileoverview Reading a challenge's verification mode, in either vocabulary.
 * @module components/circles/challenge/verificationMode
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE NAMING TRAP THIS FILE EXISTS TO CLOSE
 * ═══════════════════════════════════════════════════════════════════════════
 * The same enum travels under two spellings, and the pair is documented at
 * length in `services/gql/types/circles-actions.ts`:
 *
 *   READ  back from a challenge   HONOUR | LEAD          | CIRCLE
 *   SEND  as a GraphQL argument   HONOUR | LEAD_CONFIRMS | CIRCLE_CONFIRMS
 *
 * The bare words are circle-service's own domain enum (and its
 * `CHECK (verification_mode IN ('HONOUR','LEAD','CIRCLE'))`); the prefixed ones
 * are the registered GraphQL enum the gateway built from `circle.proto`, where
 * prefixes exist only to keep members unique across enums in one proto file.
 *
 * Today the read path returns the BARE value, so a `Record<'HONOUR'|'LEAD'|
 * 'CIRCLE', …>` lookup happens to work. It is one gateway change away from not
 * working, and the failure mode is the worst kind: an unmapped key yields
 * `undefined`, the component falls through to its "no mode" branch, and the
 * screen silently stops saying who confirms a completion — on the one screen
 * whose entire point is to say exactly that. Nothing throws, nothing logs, and
 * `tsc` sees only strings.
 *
 * So every read of `challenge.verificationMode` goes through
 * `normalizeVerificationMode`, which accepts BOTH spellings and answers with
 * the bare one. Only the five real spellings are accepted — an unrecognised
 * value returns `null` rather than being guessed at, because naming the wrong
 * adjudication rule is worse than naming none.
 */

/**
 * Every spelling the wire may carry, mapped to the domain value.
 *
 * Deliberately an explicit table rather than a "strip the `_CONFIRMS` suffix"
 * heuristic, for the same reason the gateway's `dto/enum-wire.ts` rejected
 * prefix-stripping: a heuristic silently mangles a legitimate future value that
 * happens to share the shape, and does so without any signal.
 */
const WIRE_SPELLINGS: Readonly<Record<string, CircleVerificationMode>> = {
  HONOUR: 'HONOUR',
  LEAD: 'LEAD',
  LEAD_CONFIRMS: 'LEAD',
  CIRCLE: 'CIRCLE',
  CIRCLE_CONFIRMS: 'CIRCLE',
};

/**
 * The domain verification mode behind whatever the wire actually sent.
 *
 * @param raw Anything the API put on `challenge.verificationMode` — bare or
 *            prefixed, absent, or a value this client has never heard of.
 * @returns The bare mode, or `null` when there is nothing trustworthy to say.
 */
export function normalizeVerificationMode(
  raw: string | null | undefined,
): CircleVerificationMode | null {
  if (!raw) return null;
  return WIRE_SPELLINGS[raw.trim().toUpperCase()] ?? null;
}

/**
 * Each mode's glyph and the message keys that put it in the members' own words.
 *
 * The copy matters as much as the mechanism: these three modes ARE the
 * platform-never-adjudicates rule made concrete. The product does not decide
 * whether someone really read the twenty books — the circle does, in one of
 * three ways it chose for itself — so every string names the PEOPLE who decide
 * ("we trust each other", "the lead confirms", "we vote on it") rather than
 * describing a system that verifies anything.
 *
 * `label` + `description` are the compact form used beside the padlock;
 * `about` is the longer plain-language explanation on the side panel.
 */
export interface VerificationModePresentation {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  about: string;
}

export const VERIFICATION_MODE_PRESENTATION: Readonly<
  Record<CircleVerificationMode, VerificationModePresentation>
> = {
  HONOUR: {
    icon: HeartHandshake,
    label: 'verification.trustLabel',
    description: 'verification.trustDescription',
    about: 'about.trust',
  },
  LEAD: {
    icon: UserCheck,
    label: 'verification.leadLabel',
    description: 'verification.leadDescription',
    about: 'about.lead',
  },
  CIRCLE: {
    icon: Vote,
    label: 'verification.voteLabel',
    description: 'verification.voteDescription',
    about: 'about.vote',
  },
};

/**
 * Presentation for whatever the wire sent, or `null` when it named no mode this
 * client can honestly render.
 */
export function verificationModePresentation(
  raw: string | null | undefined,
): (VerificationModePresentation & { mode: CircleVerificationMode }) | null {
  const mode = normalizeVerificationMode(raw);
  if (!mode) return null;
  return { mode, ...VERIFICATION_MODE_PRESENTATION[mode] };
}
