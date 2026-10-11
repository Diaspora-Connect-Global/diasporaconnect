import { gql } from '@apollo/client';

/**
 * Event networking documents.
 *
 * LIVE (deployed gateway, M3): status, taxonomy, prefill, myParticipation,
 * saveDraft, join, updateMyProfile, setVisibility, setAvailability, pause,
 * resume, withdraw, recordAiConsent, suggestProfile.
 * M4 deck (gateway branch `feat/en-m4-gateway`, PENDING deploy): deck,
 * decide, reviewLater, reconsiderPassed, directory, person.
 * Interests / matches / connect / block / report (gateway M4-A2) are gated by
 * `networkingFeatures.ts`. PLANNED (no backend yet): circles.
 *
 * Networking data is personal and per-event: every networking QUERY is
 * `no-cache` (never written to the Apollo cache, so never persisted), and
 * every mutation is `no-cache` too. See `lib/networkingCache.ts`.
 * People are only ever identified by their opaque `handle`.
 */

export type NetworkingTaxonomyKind = 'ROLE' | 'INTEREST' | 'CAPABILITY' | 'INDUSTRY' | 'MARKET' | 'LANGUAGE';
export type NetworkingVisibility = 'RECOMMENDED' | 'OPEN' | 'LIMITED' | 'HIDDEN';
export type NetworkingAttendanceFormat = 'IN_PERSON' | 'ONLINE' | 'EITHER';
export type NetworkingParticipationStatus = 'NOT_JOINED' | 'ACTIVE' | 'PAUSED' | 'WITHDRAWN' | 'REVOKED';
export type NetworkingEligibility = 'NOT_REGISTERED' | 'PENDING' | 'CONFIRMED' | 'INELIGIBLE';
export type NetworkingWindowState = 'DISABLED' | 'BEFORE_OPEN' | 'OPEN' | 'CLOSED';
export type NetworkingTier = 'DIRECT_OPPORTUNITY' | 'STRONG_FIT' | 'SHARED_INTERESTS' | 'BROADER_COMPATIBILITY';
export type NetworkingDecision = 'PASS' | 'SKIP';
export type NetworkingAiKind = 'INTERESTS' | 'NEEDS' | 'OFFERS' | 'ROLES' | 'MARKETS' | 'GOAL_REWRITE';

export interface NetworkingStatus {
  networkingEnabled: boolean;
  featureAvailable: boolean;
  eligibility: NetworkingEligibility;
  participationStatus: NetworkingParticipationStatus;
}

export interface TaxonomyItem {
  code: string;
  kind?: NetworkingTaxonomyKind | null;
  labelKey: string;
  needLabelKey?: string | null;
  offerLabelKey?: string | null;
  relatedCodes: string[];
  sortOrder: number;
}

export interface ProfileFields {
  headline?: string | null;
  organization?: string | null;
  locationLabel?: string | null;
  intro?: string | null;
  roles: string[];
  interests: string[];
  needs: string[];
  offers: string[];
  industries: string[];
  markets: string[];
  languages: string[];
  needsNote?: string | null;
  offersNote?: string | null;
  attendanceFormat?: NetworkingAttendanceFormat | null;
}

export interface FieldFlags {
  organization: boolean;
  location: boolean;
  availability: boolean;
  needsNote: boolean;
  offersNote: boolean;
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

export interface MyParticipation {
  participation?: {
    status: NetworkingParticipationStatus;
    visibility?: NetworkingVisibility | null;
    fieldFlags: FieldFlags;
    acceptsInterests: boolean;
    openToMeetings: boolean;
    inCircleDiscovery: boolean;
    notificationLevel?: string | null;
    consentAt?: string | null;
    aiAssistConsent: boolean;
    handle?: string | null;
    snapshot?: { displayName?: string | null; avatarUrl?: string | null; username?: string | null } | null;
    profile?: { fields: ProfileFields; isDraft: boolean; completeness: number; updatedAt?: string | null } | null;
    availability: AvailabilitySlot[];
    version: number;
    hasProfile: boolean;
  } | null;
  networkingEnabled: boolean;
  windowState: NetworkingWindowState;
  effectiveClosesAt?: string | null;
  allowedVisibilityModes: NetworkingVisibility[];
  eligibility: NetworkingEligibility;
  featureAvailable: boolean;
}

export interface PrefillData {
  headline?: string | null;
  organization?: string | null;
  locationLabel?: string | null;
  intro?: string | null;
  matchedCodes: Array<{ code: string; kind?: NetworkingTaxonomyKind | null; source?: string | null }>;
  skills: string[];
  unavailableFields: string[];
}

export interface AiSuggestion {
  suggestedCodes: string[];
  rewrittenText?: string | null;
  available: boolean;
}

export type ConnectionStatus = 'CONNECTED' | 'PENDING_SENT' | 'PENDING_RECEIVED';

export interface NetworkingCard {
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
  headline?: string | null;
  organization?: string | null;
  locationLabel?: string | null;
  tier?: NetworkingTier | null;
  mutualFit: boolean;
  reasons: string[];
  roles: string[];
  interests: string[];
  needs: string[];
  offers: string[];
  industries: string[];
  markets: string[];
  languages: string[];
  attendanceFormat?: NetworkingAttendanceFormat | null;
  connectionStatus?: ConnectionStatus | null;
  decision?: NetworkingDecision | null;
  isSelf: boolean;
}

export interface NetworkingPerson extends NetworkingCard {
  intro?: string | null;
  needsNote?: string | null;
  offersNote?: string | null;
}

export interface DeckPage {
  cards: NetworkingCard[];
  nextCursor?: string | null;
  reviewingSkipped: boolean;
  refreshing: boolean;
}

export interface DirectoryFilter {
  roles?: string[];
  interests?: string[];
  needs?: string[];
  offers?: string[];
  industries?: string[];
  markets?: string[];
  languages?: string[];
}

/** Always sent with every networking operation. */
export const NETWORKING_CONTEXT = {
  fetchPolicy: 'no-cache' as const,
  errorPolicy: 'all' as const,
  // The pages show their own, translated refusal copy; the generic toast would contradict it.
  context: { silentErrors: true },
};

/** Same, for mutations (no `fetchPolicy` difference: nothing is ever written to the cache). */
export const NETWORKING_MUTATION = NETWORKING_CONTEXT;

const PROFILE_FIELDS = `
  headline organization locationLabel intro roles interests needs offers industries markets languages
  needsNote offersNote attendanceFormat`;

const PARTICIPATION = `
  participation {
    status visibility acceptsInterests openToMeetings inCircleDiscovery notificationLevel consentAt aiAssistConsent
    handle version hasProfile
    fieldFlags { organization location availability needsNote offersNote }
    snapshot { displayName avatarUrl username }
    profile { isDraft completeness updatedAt fields { ${PROFILE_FIELDS} } }
    availability { startAt endAt }
  }
  networkingEnabled windowState effectiveClosesAt allowedVisibilityModes eligibility featureAvailable`;

const CARD = `
  handle displayName avatarUrl username headline organization locationLabel tier mutualFit reasons
  roles interests needs offers industries markets languages attendanceFormat connectionStatus decision isSelf`;

/* ------------------------------ LIVE (M3) ------------------------------ */

export const NETWORKING_STATUS = gql`
  query NetworkingStatus($eventId: ID!) {
    eventNetworkingStatus(eventId: $eventId) {
      networkingEnabled featureAvailable eligibility participationStatus
    }
  }
`;

export const NETWORKING_TAXONOMY = gql`
  query NetworkingTaxonomy($eventId: ID) {
    eventNetworkingTaxonomy(eventId: $eventId) {
      code kind labelKey needLabelKey offerLabelKey relatedCodes sortOrder
    }
  }
`;

export const NETWORKING_PREFILL = gql`
  query NetworkingPrefill($eventId: ID!) {
    eventNetworkingPrefill(eventId: $eventId) {
      headline organization locationLabel intro skills unavailableFields
      matchedCodes { code kind source }
    }
  }
`;

export const NETWORKING_MY_PARTICIPATION = gql`
  query NetworkingMyParticipation($eventId: ID!) {
    eventNetworkingMyParticipation(eventId: $eventId) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_SAVE_DRAFT = gql`
  mutation NetworkingSaveDraft($eventId: ID!, $profile: EventNetworkingProfileInput, $preferences: EventNetworkingPreferencesInput) {
    eventNetworkingSaveDraft(eventId: $eventId, profile: $profile, preferences: $preferences) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_JOIN = gql`
  mutation NetworkingJoin($eventId: ID!, $consent: Boolean!, $consentVersion: String!, $profile: EventNetworkingProfileInput, $preferences: EventNetworkingPreferencesInput) {
    eventNetworkingJoin(eventId: $eventId, consent: $consent, consentVersion: $consentVersion, profile: $profile, preferences: $preferences) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_UPDATE_PROFILE = gql`
  mutation NetworkingUpdateMyProfile($eventId: ID!, $profile: EventNetworkingProfileInput!) {
    eventNetworkingUpdateMyProfile(eventId: $eventId, profile: $profile) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_SET_VISIBILITY = gql`
  mutation NetworkingSetVisibility($eventId: ID!, $preferences: EventNetworkingPreferencesInput!) {
    eventNetworkingSetVisibility(eventId: $eventId, preferences: $preferences) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_SET_AVAILABILITY = gql`
  mutation NetworkingSetAvailability($eventId: ID!, $slots: [EventNetworkingAvailabilitySlotInput!]!) {
    eventNetworkingSetAvailability(eventId: $eventId, slots: $slots) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_PAUSE = gql`
  mutation NetworkingPause($eventId: ID!) {
    eventNetworkingPause(eventId: $eventId) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_RESUME = gql`
  mutation NetworkingResume($eventId: ID!) {
    eventNetworkingResume(eventId: $eventId) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_WITHDRAW = gql`
  mutation NetworkingWithdraw($eventId: ID!) {
    eventNetworkingWithdraw(eventId: $eventId) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_RECORD_AI_CONSENT = gql`
  mutation NetworkingRecordAiConsent($eventId: ID!, $consent: Boolean!) {
    eventNetworkingRecordAiConsent(eventId: $eventId, consent: $consent) { ${PARTICIPATION} }
  }
`;

export const NETWORKING_SUGGEST_PROFILE = gql`
  mutation NetworkingSuggestProfile($eventId: ID!, $text: String!, $kind: EventNetworkingAiAssistKind!, $locale: String) {
    eventNetworkingSuggestProfile(eventId: $eventId, text: $text, kind: $kind, locale: $locale) {
      suggestedCodes rewrittenText available
    }
  }
`;

/* ------------------------- M4 deck (PENDING deploy) ------------------------- */

export const NETWORKING_DECK = gql`
  query NetworkingDeck($eventId: ID!, $cursor: String, $limit: Int) {
    eventNetworkingDeck(eventId: $eventId, cursor: $cursor, limit: $limit) {
      nextCursor reviewingSkipped refreshing
      cards { ${CARD} }
    }
  }
`;

export const NETWORKING_REVIEW_LATER = gql`
  query NetworkingReviewLater($eventId: ID!, $cursor: String, $limit: Int) {
    eventNetworkingReviewLater(eventId: $eventId, cursor: $cursor, limit: $limit) {
      nextCursor reviewingSkipped refreshing
      cards { ${CARD} }
    }
  }
`;

export const NETWORKING_DIRECTORY = gql`
  query NetworkingDirectory($eventId: ID!, $filters: EventNetworkingDirectoryFilter, $cursor: String, $limit: Int) {
    eventNetworkingDirectory(eventId: $eventId, filters: $filters, cursor: $cursor, limit: $limit) {
      nextCursor reviewingSkipped refreshing
      cards { ${CARD} }
    }
  }
`;

export const NETWORKING_PERSON = gql`
  query NetworkingPerson($eventId: ID!, $handle: String!) {
    eventNetworkingPerson(eventId: $eventId, handle: $handle) {
      ${CARD}
      intro needsNote offersNote
    }
  }
`;

export const NETWORKING_DECIDE = gql`
  mutation NetworkingDecide($eventId: ID!, $handle: String!, $decision: EventNetworkingDecision!) {
    eventNetworkingDecide(eventId: $eventId, handle: $handle, decision: $decision) {
      decision decidedAt
    }
  }
`;

export const NETWORKING_RECONSIDER_PASSED = gql`
  mutation NetworkingReconsiderPassed($eventId: ID!) {
    eventNetworkingReconsiderPassed(eventId: $eventId) { success count }
  }
`;

/* ------------------- Interests, matches, Connect, block, report ------------------- */
/* Gateway: api-gateway `event-networking` (M4-A2). The sender can only ever read
 * PENDING / MUTUAL / EXPIRED: there is deliberately no "declined" state. */

export type SentInterestStatus = 'PENDING' | 'MUTUAL' | 'EXPIRED';
export type InterestSource = 'DECK' | 'DIRECTORY' | 'PERSON' | 'INBOX' | 'REVIEW_LATER' | 'MATCHES' | 'OTHER';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'FAKE_PROFILE' | 'SAFETY' | 'OTHER';
export const REPORT_REASONS: ReportReason[] = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'FAKE_PROFILE', 'SAFETY', 'OTHER'];
export const REPORT_DETAILS_MAX = 1000;

/** An interest the viewer sent. `card` is null when the person can no longer be shown. */
export interface InterestEntry {
  handle: string;
  card?: NetworkingCard | null;
  status: SentInterestStatus;
  note?: string | null;
  sentAt?: string | null;
  expiresAt?: string | null;
  personAvailable: boolean;
}

export interface MatchEntry {
  card: NetworkingCard;
  matchedAt?: string | null;
}

export interface ExpressInterestResult { success: boolean; matched: boolean; profileRevealed: boolean }
export interface RespondResult { success: boolean; matched: boolean }
export interface ConnectResult { success: boolean; connectionStatus?: ConnectionStatus | null; preExisting: boolean }
export interface ReportResult { success: boolean; caseNumber?: string | null }

export const NETWORKING_EXPRESS_INTEREST = gql`
  mutation NetworkingExpressInterest($eventId: ID!, $handle: String!, $note: String, $source: EventNetworkingInterestSource, $acknowledgeProfileReveal: Boolean) {
    eventNetworkingExpressInterest(eventId: $eventId, handle: $handle, note: $note, source: $source, acknowledgeProfileReveal: $acknowledgeProfileReveal) { success matched profileRevealed }
  }
`;

export const NETWORKING_RESPOND_TO_INTEREST = gql`
  mutation NetworkingRespondToInterest($eventId: ID!, $handle: String!, $accept: Boolean!) {
    eventNetworkingRespondToInterest(eventId: $eventId, handle: $handle, accept: $accept) { success matched }
  }
`;

export const NETWORKING_WITHDRAW_INTEREST = gql`
  mutation NetworkingWithdrawInterest($eventId: ID!, $handle: String!) {
    eventNetworkingWithdrawInterest(eventId: $eventId, handle: $handle) { success }
  }
`;

export const NETWORKING_INTERESTED_IN_ME = gql`
  query NetworkingInterestedInMe($eventId: ID!, $cursor: String, $limit: Int) {
    eventNetworkingInterestedInMe(eventId: $eventId, cursor: $cursor, limit: $limit) {
      nextCursor total
      cards { ${CARD} }
    }
  }
`;

export const NETWORKING_MY_INTERESTS = gql`
  query NetworkingMyInterests($eventId: ID!, $cursor: String, $limit: Int) {
    eventNetworkingMyInterests(eventId: $eventId, cursor: $cursor, limit: $limit) {
      nextCursor pendingCount
      interests { handle status note sentAt expiresAt personAvailable card { ${CARD} } }
    }
  }
`;

export const NETWORKING_MY_MATCHES = gql`
  query NetworkingMyMatches($eventId: ID!, $cursor: String, $limit: Int) {
    eventNetworkingMyMatches(eventId: $eventId, cursor: $cursor, limit: $limit) {
      nextCursor total
      matches { matchedAt card { ${CARD} } }
    }
  }
`;

export const NETWORKING_CONNECT = gql`
  mutation NetworkingConnect($eventId: ID!, $handle: String!) {
    eventNetworkingConnect(eventId: $eventId, handle: $handle) { success connectionStatus preExisting }
  }
`;

export const NETWORKING_BLOCK = gql`
  mutation NetworkingBlock($eventId: ID!, $handle: String!) {
    eventNetworkingBlock(eventId: $eventId, handle: $handle) { success }
  }
`;

export const NETWORKING_REPORT = gql`
  mutation NetworkingReport($eventId: ID!, $handle: String!, $reason: EventNetworkingReportReason!, $details: String) {
    eventNetworkingReport(eventId: $eventId, handle: $handle, reason: $reason, details: $details) { success caseNumber }
  }
`;

/* ------------------------ PLANNED: circles (PENDING) ------------------------ */

export interface CircleSummary {
  id: string;
  title: string;
  purpose?: string | null;
  category?: string | null;
  coverImageUrl?: string | null;
  hostName?: string | null;
  hostHeadline?: string | null;
  startsAt?: string | null;
  format?: string | null;
  venue?: string | null;
  capacity?: number | null;
  memberCount: number;
  joinPolicy: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  myStatus?: 'NONE' | 'ACTIVE' | 'REQUESTED' | 'WAITLISTED' | null;
  whyRecommended?: string | null;
  tags: string[];
}

export interface CircleMessage {
  id: string;
  authorName: string;
  authorHeadline?: string | null;
  authorAvatarUrl?: string | null;
  isHost?: boolean;
  isMe?: boolean;
  body: string;
  sentAt: string;
}

export interface CircleResource {
  id: string;
  title: string;
  kind: string;
  sizeLabel?: string | null;
}

export interface CircleMember {
  handle: string;
  displayName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  isHost?: boolean;
  isMe?: boolean;
}

export interface CircleDetail extends CircleSummary {
  focusAreas: string[];
  agenda?: string | null;
  members: CircleMember[];
  resources: CircleResource[];
}

const CIRCLE_SUMMARY = `
  id title purpose category coverImageUrl hostName hostHeadline startsAt format venue capacity memberCount
  joinPolicy myStatus whyRecommended tags`;

export const NETWORKING_CIRCLES = gql`
  query NetworkingCircles($eventId: ID!) {
    networkingCircles(eventId: $eventId) { ${CIRCLE_SUMMARY} }
  }
`;

export const NETWORKING_CIRCLE = gql`
  query NetworkingCircle($eventId: ID!, $circleId: ID!) {
    networkingCircle(eventId: $eventId, circleId: $circleId) {
      ${CIRCLE_SUMMARY} focusAreas agenda
      members { handle displayName headline avatarUrl isHost isMe }
      resources { id title kind sizeLabel }
    }
  }
`;

export const NETWORKING_CIRCLE_MESSAGES = gql`
  query NetworkingCircleMessages($eventId: ID!, $circleId: ID!, $cursor: String) {
    networkingCircleMessages(eventId: $eventId, circleId: $circleId, cursor: $cursor) {
      nextCursor
      messages { id authorName authorHeadline authorAvatarUrl isHost isMe body sentAt }
    }
  }
`;

export const NETWORKING_CIRCLE_SEND = gql`
  mutation NetworkingCircleSend($eventId: ID!, $circleId: ID!, $body: String!) {
    networkingCircleSendMessage(eventId: $eventId, circleId: $circleId, body: $body) { id }
  }
`;

export const NETWORKING_CIRCLE_JOIN = gql`
  mutation NetworkingCircleJoin($eventId: ID!, $circleId: ID!) {
    networkingCircleJoin(eventId: $eventId, circleId: $circleId) { success status }
  }
`;

export const NETWORKING_CIRCLE_LEAVE = gql`
  mutation NetworkingCircleLeave($eventId: ID!, $circleId: ID!) {
    networkingCircleLeave(eventId: $eventId, circleId: $circleId) { success }
  }
`;
