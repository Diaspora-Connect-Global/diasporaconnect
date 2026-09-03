export { AuditEntry, type AuditEntryProps } from './AuditEntry';
export { ChainVerdictBanner, type ChainVerdictBannerProps } from './ChainVerdictBanner';
export { DecisionLog, type DecisionLogProps } from './DecisionLog';
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
// each was decided under. `DecisionLog` / `AuditEntry` above render the raw
// hash-chained event stream and are kept for the chain-integrity view; they are
// a different question ("what is recorded?") from the one this table answers
// ("what did we decide, and on what terms?").
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
