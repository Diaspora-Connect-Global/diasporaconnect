import type { Attachment } from '@/services/gql/types/postsFeed';
import type { MentionInputItem } from '@/components/custom/richTextRenderer';
import type { ReactionKind } from '@/components/reactions/reactionAdapter';
import type { CommunityVariant, OwnerKind } from './communityVariant';
import type { EmbassyProfileSource } from './embassyData';

/** Mirrors the FeedPost shape produced by GET_FEED in CommunityDetailClient. */
export interface EmbassyFeedPost {
  id: string;
  text: string;
  authorId: string;
  authorType: string;
  createdAt: string;
  visibility?: string;
  mentions?: { handle: string; displayName?: string; entityId: string }[];
  engagementCounts: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    /**
     * Per-reaction counts, returned by the `FullPost` fragment both detail
     * pages select.
     *
     * OPTIONAL, and `undefined` means NOT MEASURED — which is not the same as
     * zero. A gateway that does not return the breakdown must leave the
     * cluster withholding its numbers rather than asserting a measured
     * `{HAPPY:0, HOPEFUL:0, SAD:0}`. `happy + hopeful + sad` is legitimately
     * <= `likes`: the remainder is pre-migration untyped likes, which belong
     * to no bucket.
     */
    happy?: number;
    hopeful?: number;
    sad?: number;
  };
  userEngagement: {
    hasLiked: boolean;
    hasSaved: boolean;
    hasShared?: boolean;
    /**
     * WHICH reaction the server recorded for this viewer.
     *
     * `null` alongside `hasLiked: true` is meaningful and NOT "no reaction":
     * it is a pre-migration like, stored before reaction types existed. It
     * displays as Happy but must never be written back as HAPPY.
     */
    myReaction?: ReactionKind | null;
  };
  categories?: string[];
  attachments?: Attachment[];
}

/** Community fields the embassy view needs (subset of CommunityDetails). */
export interface EmbassyCommunity {
  id: string;
  name: string;
  description?: string;
  communityRules?: string | null;
  avatarUrl?: string;
  bannerUrl?: string | null;
  memberCount?: number;
  createdAt?: string;
  membershipStatus?: string | null;
  /** The community's single built-in group feed; used as a fallback list. */
  defaultGroupId?: string | null;
  /**
   * Enabled member-facing service module keys. `null`/absent → treat as all
   * enabled (legacy/non-loaded); `[]` → none enabled. Drives tab/widget gating.
   */
  enabledServices?: string[] | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  locationCountry?: string | null;
  communityType?: { name: string; isEmbassy: boolean } | null;
  /** Real backend embassy metadata; null for non-embassy communities. */
  embassyProfile?: EmbassyProfileSource | null;
}

/**
 * Everything the embassy view needs from the CommunityDetailClient container.
 * All data + handlers are computed once in the container and passed down — the
 * embassy view fetches nothing itself for Phase 1 (Home uses the live feed).
 */
export interface EmbassyViewProps {
  /**
   * Rich-view variant. 'embassy' uses embassy-specific copy/branding; 'general'
   * uses neutral community copy. Exposed to all tabs/components via
   * CommunityVariantProvider → useIsEmbassy()/useCommunityNoun().
   */
  variant: CommunityVariant;
  /**
   * Which owner entity backs this view. Defaults to 'community'. When
   * 'association', every tab sends ASSOCIATION as its ownerType (never COMMUNITY)
   * — threaded to the tabs via CommunityVariantProvider → useOwnerKind()/useOwnerEnum().
   */
  ownerKind?: OwnerKind;
  community: EmbassyCommunity;
  posts: EmbassyFeedPost[];
  feedLoading: boolean;
  displayMemberCount: number;

  // Membership state
  isActive: boolean;
  isPending: boolean;
  isSuspended: boolean;
  isInviteOnly: boolean;
  canShowJoin: boolean;
  canShowRequestToJoin: boolean;
  canLeave: boolean;
  canCancelRequest: boolean;
  actionLoading: boolean;
  joinLoading: boolean;

  // Membership handlers
  onJoinClick: () => void;
  onLeaveClick: () => void;
  onCancelRequest: () => void;

  // Feed handlers
  /**
   * The BINARY like callback. Still the fallback the card keeps for a surface
   * that genuinely only has a like — a boolean cannot carry WHICH reaction, so
   * routing a Sad through it would store it as a Happy.
   */
  onLike: (postId: string, liked: boolean) => void;
  /**
   * Fired when the viewer's reaction changes. `op` is 'add' (write or switch)
   * or 'remove'; `reaction` is the kind to store on an add.
   *
   * Signature is `FeedCardWithReply`'s verbatim so the card's prop can be
   * forwarded straight through EmbassyFeedList without an adapter.
   *
   * PASSING THIS IS WHAT TURNS THE REACTION UI ON — the card treats its
   * presence as the capability test, because it is the only route by which a
   * Hopeful or a Sad can actually be persisted. Optional for the same reason:
   * a caller that cannot persist one must not be able to offer it.
   *
   * `totalDelta` is 0 for a SWITCH: the server updates the existing LIKE row in
   * place, so the total must not move — only the per-kind breakdown shifts.
   * `previousReaction` is the RAW prior `myReaction` (null for a pre-migration
   * untyped like), which the parent cannot re-derive from `hasLiked` and needs
   * in order to roll a refused mutation back to the right kind.
   */
  onReact?: (
    postId: string,
    op: 'add' | 'remove',
    reaction: ReactionKind | null,
    totalDelta: number,
    previousReaction: ReactionKind | null,
  ) => void;
  onSave: (postId: string, saved: boolean) => void;
  onShare: (postId: string) => void;
  onSendComment: (
    postId: string,
    content: string,
    parentId?: string,
    mentions?: MentionInputItem[],
  ) => Promise<void>;
  onDeletePost: (postId: string) => void;

  showSidebar: boolean;
}
