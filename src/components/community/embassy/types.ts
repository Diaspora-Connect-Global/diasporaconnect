import type { Attachment } from '@/services/gql/types/postsFeed';
import type { MentionInputItem } from '@/components/custom/richTextRenderer';
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
  engagementCounts: { likes: number; comments: number; shares: number; saves: number };
  userEngagement: { hasLiked: boolean; hasSaved: boolean; hasShared?: boolean };
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
  onLike: (postId: string, liked: boolean) => void;
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
