// ── The raw record ─────────────────────────────────────────────────────────
// `DecisionLog` / `AuditEntry` render the hash-chained event stream itself, and
// they are the ONLY surface for a whole class of entries: what the platform did
// to the circle, invite links minted and redeemed, rules amended, plan limits
// hit. None of those is a motion, so none of them appears in the decision table
// below. Do not retire these without moving those entries somewhere first.
export { AuditEntry, type AuditEntryProps } from './AuditEntry';
export { ChainVerdictBanner, type ChainVerdictBannerProps } from './ChainVerdictBanner';
export { DecisionLog, type DecisionLogProps } from './DecisionLog';
export { HistoryTabs, type HistoryTabOption, type HistoryTabsProps } from './HistoryTabs';
export {
  AUDIT_EVENT_SPEC,
  chainVerdict,
  motionIdFor,
  nextCursor,
  readAuditPayload,
  specFor,
  type AuditEventSpec,
  type AuditPayloadFacts,
  type ChainVerdict,
} from './auditEventCopy';

// ── The decision table ─────────────────────────────────────────────────────
// The screen's primary surface: settled motions, their outcome, and the rule
// each was decided under. It answers "what did we decide, and on what terms?",
// which is a different question from the one the log above answers ("what is
// recorded?") — and it is a strictly narrower one, since only motions have an
// outcome and a pinned rule to show.
export { DecisionsTable, type DecisionsTableProps } from './DecisionsTable';
export { DecisionRow, type DecisionRowProps } from './DecisionRow';
export { OutcomePill, type OutcomePillProps } from './OutcomePill';
export { RulesAtTheTime, type RulesAtTheTimeProps } from './RulesAtTheTime';
export {
  MEMBERSHIP_MOTION_KINDS,
  isDecided,
  isMembershipMotion,
  outcomeSpecFor,
  pinnedRuleParts,
  type DecisionOutcomeKey,
  type DecisionOutcomeSpec,
  type PinnedMajorityKey,
  type PinnedRuleParts,
} from './decisionCopy';
