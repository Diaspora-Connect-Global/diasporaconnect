/**
 * @fileoverview Recommendation service type definitions for GraphQL operations.
 * Mirrors the recommendation-service schema exposed by the api-gateway.
 * @module services/gql/types/recommendation
 */

// ============================================================================
// ENUM / UNION TYPES
// ============================================================================

/**
 * Item type a recommendation maps to. Phase 1 is `POST` only.
 */
export type RecommendationItemType = 'POST' | 'EVENT' | 'OPPORTUNITY' | 'PRODUCT';

/**
 * Source retriever / pipeline arm that produced a ranked item.
 */
export type RecommendationSource =
  | 'follow-graph'
  | 'community'
  | 'trending'
  | 'geo'
  | 'vector-similar'
  | 'recency'
  | 'exploration'
  | string; // forward-compatible: server may add more

/**
 * Interaction kinds accepted by `recordInteraction`. Mirrors the proto3 enum on the server.
 */
export type InteractionKind =
  | 'VIEW'
  | 'DWELL'
  | 'WATCH'
  | 'LIKE'
  | 'UNLIKE'
  | 'COMMENT'
  | 'SHARE'
  | 'SAVE'
  | 'UNSAVE'
  | 'CLICK_THROUGH'
  | 'FOLLOW'
  | 'UNFOLLOW'
  | 'JOIN_COMMUNITY'
  | 'LEAVE_COMMUNITY'
  | 'HIDE'
  | 'REPORT'
  | 'BLOCK_AUTHOR';

// ============================================================================
// QUERY: recommendedPosts
// ============================================================================

/**
 * Input for `recommendedPosts(input)`.
 */
export interface RecommendedPostsInput {
  limit?: number | null;
  cursor?: string | null;
}

/**
 * A single ranked item — IDs only; hydration happens client-side via post-feed-service.
 */
export interface RankedItemGQL {
  itemId: string;
  itemType: RecommendationItemType | string;
  score: number;
  authorId?: string | null;
  topics?: string[] | null;
  source: RecommendationSource;
  createdAt?: string | null;
}

/**
 * Response page from `recommendedPosts`.
 */
export interface RankedFeedPage {
  items: RankedItemGQL[];
  nextCursor?: string | null;
  rankingStrategy?: string | null;
  explorationRatio?: number | null;
}

export interface RecommendedPostsData {
  recommendedPosts: RankedFeedPage;
}

// ============================================================================
// QUERY: similarPosts
// ============================================================================

/**
 * Response from `similarPosts(postId, limit)`.
 *
 * The recommendation-service returns an empty list (NOT_FOUND mapped to []) when the
 * source post isn't indexed yet. Callers should treat empty as "no similar posts".
 */
export interface SimilarPostsData {
  similarPosts: RankedFeedPage;
}

// ============================================================================
// MUTATION: recordInteraction
// ============================================================================

/**
 * Input for `recordInteraction(input)`.
 *
 * `sourceSurface` carries the surface context (e.g. `home:for_you:trending`) and is used
 * by the server to attribute the signal back to the originating retriever.
 */
export interface RecordInteractionInput {
  itemId: string;
  itemType?: RecommendationItemType | string;
  kind: InteractionKind;
  /** Required for DWELL / WATCH; ignored otherwise. */
  durationMs?: number | null;
  /** % of media consumed for WATCH; 0..1. */
  completionPct?: number | null;
  /** Free-form provenance tag (e.g. "home:for_you:trending", "not_interested:spam"). */
  sourceSurface?: string | null;
}

/**
 * Generic operation result returned by recommendation mutations.
 */
export interface RecommendationOperationResult {
  success: boolean;
  message?: string | null;
}

export interface RecordInteractionData {
  recordInteraction: RecommendationOperationResult;
}

// ============================================================================
// MUTATION: setOnboardingInterests
// ============================================================================

/**
 * Variables for the `setOnboardingInterests` mutation.
 *
 * Topics are lowercase slug strings (e.g. `technology`, `sports`). The server
 * rejects subsequent calls once a warm profile has been established, so this
 * mutation is first-time-only safe.
 */
export interface SetOnboardingInterestsVars {
  topics: string[];
}

export interface SetOnboardingInterestsData {
  setOnboardingInterests: RecommendationOperationResult;
}

// ============================================================================
// MUTATION: eraseMyAccountData (GDPR right-to-erase, recommendation footprint)
// ============================================================================

/**
 * Per-table row counts returned by `eraseMyAccountData`. All counts are zero
 * when the user has nothing left to erase (idempotent re-run).
 */
export interface EraseUserDataRowCounts {
  interest_profile: number;
  interaction_log: number;
  feed_impression: number;
  user_block: number;
  user_membership: number;
}

/**
 * Result payload for `eraseMyAccountData`. `success` stays `true` on idempotent
 * re-runs; in that case every count in `rowsDeleted` will be 0.
 */
export interface EraseUserDataResult {
  success: boolean;
  message?: string | null;
  rowsDeleted: EraseUserDataRowCounts;
}

export interface EraseMyAccountDataData {
  eraseMyAccountData: EraseUserDataResult;
}
