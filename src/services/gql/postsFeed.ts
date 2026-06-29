// services/gql/postsFeed.ts
import { gql } from '@apollo/client';

// Re-export types from the types folder for backward compatibility
export type {
  EngagementCounts,
  UserEngagement,
  PostUserProfile,
  OrganizationProfile,
  AuthorProfile,
  Post,
  Attachment,
  AttachmentInput,
  Comment,
  GetFeedInput,
  CreatePostInput,
  EditPostInput,
  AddEngagementInput,
  RemoveEngagementInput,
  CreateCommentInput,
  LikeCommentInput,
  DeleteCommentInput,
  GetFeedData,
  GetPostsByHashtagData,
  GetPostsByHashtagInput,
  GetPostsByCategoryData,
  GetPostsByCategoryInput,
  FeedModeType,
  FeedViewMode,
  GetPostData,
  GetPostsByIdsData,
  GetPostCommentsData,
  CreatePostData,
  EditPostData,
  AddEngagementData,
  RemoveEngagementData,
  CreateCommentData,
  LikeCommentData,
  RemoveCommentLikeData,
  EditCommentData,
  DeleteCommentData,
  DeletePostData,
  EditCommentInput,
  RequestUploadUrlData,
  EngagedPostsType,
  GetEngagedPostsInput,
  GetEngagedPostsData,
  GetUserPostsData,
  GetSavedPostsData,
  GetLikedPostsData,
  GetCommentedPostsData,
  SharePostData,
} from './types';

// ============================================================================
// QUERIES
// ============================================================================

export const FULL_POST_FRAGMENT = gql`
  fragment FullPost on Post {
    id
    text
    content
    visibility
    status
    authorType
    authorId
    author {
      id
      authorType
      displayName
      avatarUrl
      trustScore
    }
    authorProfile {
      authorType
      userProfile {
        id
        name
        displayName
        avatarUrl
        bio
        isVip
        verificationTier
        trustScore
      }
      organizationProfile {
        id
        name
        logoUrl
        description
        isVip
        verificationTier
      }
    }
    attachments {
      id
      type
      objectKey
      mimeType
      url
      width
      height
      blurDataUrl
    }
    mentions {
      entityId
      entityType
      handle
      displayName
      avatarUrl
      startPosition
      endPosition
    }
    hashtags {
      id
      tag
      usageCount
    }
    engagementCounts {
      likes
      comments
      shares
      saves
    }
    userEngagement {
      hasLiked
      hasShared
      hasSaved
    }
    recentComments {
      id
      text
      authorDisplayName
      authorAvatarUrl
      createdAt
    }
    score
    reason
    isSponsored
    postUrl
    # AI categorization (Phase 1 of ai-service). categories is the
    # canonical 1-3 item list from the taxonomy (Politics, Tech, Jobs, ...).
    # aiTopics is the looser set-merged tag list. Empty arrays for posts
    # that have not been classified yet (legacy + in-flight) — the badge
    # component hides itself in that case.
    categories
    aiTopics
    createdAt
    updatedAt
  }
`;

export const GET_FEED = gql`
  query GetFeed($input: GetFeedInput!) {
    feed(input: $input) {
      posts {
        ...FullPost
      }
      total
      limit
      offset
      hasMore
      nextCursor
      isExhausted
      isSeenFallback
      hasSeenFallbackOption
    }
  }
  ${FULL_POST_FRAGMENT}
`;

/** Dedicated social-graph feed (no discovery). Optional; use `feed` with type NETWORK if unavailable. */
export const GET_NETWORK_FEED = gql`
  query GetNetworkFeed($limit: Int, $cursor: String, $refreshSeed: String) {
    networkFeed(limit: $limit, cursor: $cursor, refreshSeed: $refreshSeed) {
      posts {
        ...FullPost
      }
      hasMore
      nextCursor
      isExhausted
      isSeenFallback
    }
  }
  ${FULL_POST_FRAGMENT}
`;

/**
 * Trending hashtags (post-feed-service via gateway `trendingHashtags`).
 *
 * Backend type `TrendingHashtag` exposes `id`, `tag`, `usageCount`,
 * `recentUsageCount`, `trend`. Input `GetTrendingHashtagsInput` carries
 * `{ limit, timeRange }`. Returns `[]` (never null) and fails soft on the
 * gateway, so consumers can fall back to placeholder copy if empty.
 */
export const GET_TRENDING_HASHTAGS = gql`
  query GetTrendingHashtags($input: GetTrendingHashtagsInput) {
    trendingHashtags(input: $input) {
      id
      tag
      usageCount
    }
  }
`;

export const GET_POSTS_BY_HASHTAG = gql`
  query GetPostsByHashtag($input: GetPostsByHashtagInput!) {
    postsByHashtag(input: $input) {
      posts {
        ...FullPost
      }
      total
      hasMore
    }
  }
  ${FULL_POST_FRAGMENT}
`;

export const GET_POSTS_BY_CATEGORY = gql`
  query GetPostsByCategory($input: GetPostsByCategoryInput!) {
    postsByCategory(input: $input) {
      posts {
        ...FullPost
      }
      total
      hasMore
    }
  }
  ${FULL_POST_FRAGMENT}
`;

export const GET_POST = gql`
  query GetPost($id: String!) {
    post(id: $id) {
      ...FullPost
    }
  }
  ${FULL_POST_FRAGMENT}
`;

/**
 * Batch hydration for ranked feeds — resolves a list of post ids to full posts
 * in a single round-trip (replaces the per-id `GET_POST` fan-out). Returns the
 * same `FullPost` shape; the backend may omit ids it can't resolve, so callers
 * must re-join by id rather than rely on positional order.
 */
export const GET_POSTS_BY_IDS = gql`
  query GetPostsByIds($ids: [ID!]!) {
    postsByIds(ids: $ids) {
      ...FullPost
    }
  }
  ${FULL_POST_FRAGMENT}
`;

/** When parentId is not sent, backend returns a flat list of all comments + replies; build tree client-side.
 *
 * `sortBy` is 'TOP' (default — most-liked first) | 'NEWEST' | 'OLDEST'. Only
 * affects top-level comments — replies under a parent always come back
 * oldest-first to preserve conversation flow.
 */
export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: String!, $limit: Int, $offset: Int, $parentId: String, $sortBy: String) {
    postComments(postId: $postId, limit: $limit, offset: $offset, parentId: $parentId, sortBy: $sortBy) {
      id
      text
      authorId
      authorType
      authorDisplayName
      authorAvatarUrl
      authorHandle
      authorTrustScore
      authorTrustTier
      replyCount
      likeCount
      hasLiked
      createdAt
      updatedAt
      postId
      parentId
      mentions {
        entityId
        entityType
        handle
        displayName
        avatarUrl
        startPosition
        endPosition
      }
      hashtags {
        id
        tag
        usageCount
      }
      attachments {
        id
        objectKey
        url
        type
        mimeType
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      text
      authorType
    }
  }
`;

export const REQUEST_UPLOAD_URL = gql`
  mutation RequestUploadUrl($fileName: String!, $fileType: String!, $contentType: String!, $vendorId: String!) {
    requestUploadUrl(fileName: $fileName, fileType: $fileType, contentType: $contentType, vendorId: $vendorId) {
      uploadUrl
      objectKey
    }
  }
`;

export const EDIT_POST = gql`
  mutation EditPost($input: EditPostInput!) {
    editPost(input: $input) {
      id
      text
    }
  }
`;

/**
 * UPDATE_POST_VISIBILITY — author-only mutation, no time limit.
 * Visibility values match the canonical PostVisibility union:
 *   'EVERYONE' | 'FRIENDS' | 'ONLY_ME' | 'COMMUNITY' | 'ASSOCIATION'
 */
export const UPDATE_POST_VISIBILITY = gql`
  mutation UpdatePostVisibility($postId: ID!, $visibility: String!) {
    updatePostVisibility(postId: $postId, visibility: $visibility) {
      id
      visibility
    }
  }
`;

export const ADD_ENGAGEMENT = gql`
  mutation AddEngagement($input: AddEngagementInput!) {
    addEngagement(input: $input) {
      success
    }
  }
`;

export const REMOVE_ENGAGEMENT = gql`
  mutation RemoveEngagement($input: RemoveEngagementInput!) {
    removeEngagement(input: $input) {
      success
    }
  }
`;

export const SHARE_POST = gql`
  mutation SharePost($postId: String!) {
    sharePost(postId: $postId) {
      success
      shareLink
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      postId
      authorId
      text
      parentId
      createdAt
      authorDisplayName
      authorAvatarUrl
      authorHandle
      authorTrustScore
      authorTrustTier
      replyCount
      likeCount
      hasLiked
      mentions {
        entityId
        entityType
        handle
        displayName
        avatarUrl
        startPosition
        endPosition
      }
    }
  }
`;

export const LIKE_COMMENT = gql`
  mutation LikeComment($input: LikeCommentInput!) {
    likeComment(input: $input) {
      success
      likeCount
    }
  }
`;

export const REMOVE_COMMENT_LIKE = gql`
  mutation RemoveCommentLike($input: LikeCommentInput!) {
    removeCommentLike(input: $input) {
      success
      likeCount
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($id: String!) {
    deletePost(id: $id) {
      success
    }
  }
`;

export const EDIT_COMMENT = gql`
  mutation EditComment($input: EditCommentInput!) {
    editComment(input: $input) {
      id
      postId
      text
      authorId
      parentId
      createdAt
      authorDisplayName
      authorAvatarUrl
      authorHandle
      authorTrustScore
      authorTrustTier
      replyCount
      likeCount
      hasLiked
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      success
    }
  }
`;

// ============================================================================
// PROFILE POST QUERIES
// ============================================================================

/**
 * Get posts filtered by engagement type for the current user's profile.
 * type: 'liked' | 'saved' | 'commented'
 */
export const GET_USER_ENGAGED_POSTS = gql`
  query GetUserEngagedPosts($input: GetEngagedPostsInput!) {
    engagedPosts(input: $input) {
      total
      posts {
        id
        text
        authorId
        authorType
        authorProfile {
          organizationProfile {
            name
          }
          userProfile {
            name
            avatar
            isVip
            verificationTier
            trustScore
          }
        }
        createdAt
        attachments {
          id
          objectKey
          url
          type
          mimeType
        }
        engagementCounts {
          likes
          comments
          shares
          saves
        }
        userEngagement {
          hasLiked
          hasSaved
          hasShared
        }
        categories
        aiTopics
      }
    }
  }
`;

export const GET_USER_POSTS = gql`
  query GetUserPosts($authorId: String, $authorType: String = "USER", $limit: Int = 20, $offset: Int = 0) {
    userPosts(authorId: $authorId, authorType: $authorType, limit: $limit, offset: $offset) {
      id
      text
      authorId
      authorType
      authorProfile {
        organizationProfile {
          name
        }
        userProfile {
          name
          avatar
          isVip
          verificationTier
          trustScore
        }
      }
      createdAt
      attachments {
        id
        objectKey
        url
        type
        mimeType
      }
      mentions {
        entityId
        entityType
        handle
        displayName
        avatarUrl
        startPosition
        endPosition
      }
      engagementCounts {
        likes
        comments
        shares
        saves
      }
      userEngagement {
        hasLiked
        hasSaved
        hasShared
      }
      categories
      aiTopics
    }
  }
`;

export const GET_SAVED_POSTS = gql`
  query GetSavedPosts($limit: Int = 20, $offset: Int = 0, $userId: String) {
    savedPosts(limit: $limit, offset: $offset, userId: $userId) {
      limit
      offset
      total
      posts {
        id
        text
        authorId
        authorType
        authorProfile {
          organizationProfile {
            name
          }
          userProfile {
            name
            avatar
            isVip
            verificationTier
            trustScore
          }
        }
        createdAt
        attachments {
          id
          objectKey
          url
          type
          mimeType
        }
        mentions {
          entityId
          entityType
          handle
          displayName
          avatarUrl
          startPosition
          endPosition
        }
        engagementCounts {
          likes
          comments
          shares
          saves
        }
        userEngagement {
          hasLiked
          hasSaved
          hasShared
        }
        categories
        aiTopics
      }
    }
  }
`;

export const GET_LIKED_POSTS = gql`
  query GetLikedPosts($limit: Int = 20, $offset: Int = 0, $userId: String) {
    likedPosts(limit: $limit, offset: $offset, userId: $userId) {
      limit
      offset
      total
      posts {
        id
        text
        authorId
        authorType
        authorProfile {
          organizationProfile {
            name
          }
          userProfile {
            name
            avatar
            isVip
            verificationTier
            trustScore
          }
        }
        createdAt
        attachments {
          id
          objectKey
          url
          type
          mimeType
        }
        mentions {
          entityId
          entityType
          handle
          displayName
          avatarUrl
          startPosition
          endPosition
        }
        engagementCounts {
          likes
          comments
          shares
          saves
        }
        userEngagement {
          hasLiked
          hasSaved
          hasShared
        }
        categories
        aiTopics
      }
    }
  }
`;

export const GET_COMMENTED_POSTS = gql`
  query GetCommentedPosts($limit: Int = 20, $offset: Int = 0, $userId: String) {
    commentedPosts(limit: $limit, offset: $offset, userId: $userId) {
      limit
      offset
      total
      posts {
        id
        text
        authorId
        authorType
        authorProfile {
          organizationProfile {
            name
          }
          userProfile {
            name
            avatar
            isVip
            verificationTier
            trustScore
          }
        }
        createdAt
        attachments {
          id
          objectKey
          url
          type
          mimeType
        }
        mentions {
          entityId
          entityType
          handle
          displayName
          avatarUrl
          startPosition
          endPosition
        }
        engagementCounts {
          likes
          comments
          shares
          saves
        }
        userEngagement {
          hasLiked
          hasSaved
          hasShared
        }
        categories
        aiTopics
      }
    }
  }
`;

// ============================================================================
// RECOMMENDATION MUTATIONS
// ============================================================================

/**
 * Best-effort interaction signal sent to recommendation-service.
 * Caller should fire-and-forget — the canonical engagement source of truth
 * remains post-feed-service (`addEngagement` / `removeEngagement`).
 */
export const RECORD_INTERACTION = gql`
  mutation RecordInteraction($input: RecordInteractionInput!) {
    recordInteraction(input: $input) {
      success
      message
    }
  }
`;

/**
 * Persists the user's onboarding interest topics into the recommendation
 * service so cold-start ranking has a non-empty interest profile.
 *
 * Server-side guard: rejects calls once a warm profile has been established,
 * so this is safe to call only during the first-time onboarding flow.
 */
export const SET_ONBOARDING_INTERESTS = gql`
  mutation SetOnboardingInterests($topics: [String!]!) {
    setOnboardingInterests(topics: $topics) {
      success
      message
    }
  }
`;

// ============================================================================
// RECOMMENDATION QUERIES
// ============================================================================

/**
 * Personalized ranked feed produced by recommendation-service.
 *
 * Returns IDs only — clients hydrate full posts via post-feed-service (`GET_POST`)
 * and preserve the recommender's order. The `source` / `score` fields are carried
 * through to instrumentation (impression tracker `sourceSurface`) but never shown
 * in the UI.
 */
export const RECOMMENDED_POSTS = gql`
  query RecommendedPosts($limit: Int, $cursor: String, $refresh: Boolean) {
    recommendedPosts(limit: $limit, cursor: $cursor, refresh: $refresh) {
      items {
        itemId
        itemType
        score
        authorId
        topics
        source
        createdAt
      }
      nextCursor
      rankingStrategy
      explorationRatio
    }
  }
`;

/**
 * The viewer's interest profile (recommendation-service). Used to gate the
 * cold-start "Set your interests" prompt card: `coldStart === true` means the
 * recommender hasn't yet collected enough meaningful signal to personalise the
 * feed, so an interests prompt is worth showing. Fail-soft on the backend →
 * `{ coldStart: true }` on any downstream error.
 */
export const MY_INTEREST_PROFILE = gql`
  query MyInterestProfile {
    myInterestProfile {
      userId
      topics {
        topic
        weight
      }
      lastUpdatedAt
      interactionCount
      coldStart
    }
  }
`;

/**
 * "X new posts available" pill — polled every 60s while the home tab
 * is visible. Returns count (capped at 99) of items visible to the
 * viewer that have been published since their last impression on the
 * given surface. Fail-soft on the backend → 0 on any downstream error.
 */
export const UNSEEN_FEED_COUNT = gql`
  query UnseenFeedCount($surface: String) {
    unseenFeedCount(surface: $surface) {
      count
      lastSeenAt
    }
  }
`;

/**
 * Joined-community feed — backs the "Following" tab.
 *
 * Returns posts scoped to communities + associations the viewer has joined,
 * ordered by `published_at DESC`. Returns IDs only (same shape as
 * `recommendedPosts`); the client hydrates full posts via `GET_POST`.
 *
 * Server-side guarantees:
 *   - Empty memberships → empty page (never falls back to "all communities").
 *   - Privacy WHERE clause enforces visibility (everyone OR
 *     community/association ∧ membership match).
 *   - Author exclusion: the viewer never sees their own posts here.
 */
export const JOINED_COMMUNITY_FEED = gql`
  query JoinedCommunityFeed($limit: Int, $cursor: String) {
    joinedCommunityFeed(limit: $limit, cursor: $cursor) {
      items {
        itemId
        itemType
        score
        authorId
        topics
        source
        createdAt
      }
      nextCursor
      rankingStrategy
      explorationRatio
    }
  }
`;

/**
 * Recommended communities for the home discover rail — Phase 2.
 *
 * Returns ranked community ids; the consumer can either reuse the existing
 * community card with the id (hydrating individually) or pre-batch via
 * `getCommunityDetails`. Same shape as `recommendedPosts`.
 */
export const RECOMMENDED_COMMUNITIES = gql`
  query RecommendedCommunities($limit: Int, $cursor: String) {
    recommendedCommunities(limit: $limit, cursor: $cursor) {
      items {
        itemId
        itemType
        score
        authorId
        topics
        source
        createdAt
      }
      nextCursor
      rankingStrategy
      explorationRatio
    }
  }
`;

/**
 * Recommended associations — Phase 2 sibling of `recommendedCommunities`.
 */
export const RECOMMENDED_ASSOCIATIONS = gql`
  query RecommendedAssociations($limit: Int, $cursor: String) {
    recommendedAssociations(limit: $limit, cursor: $cursor) {
      items {
        itemId
        itemType
        score
        authorId
        topics
        source
        createdAt
      }
      nextCursor
      rankingStrategy
      explorationRatio
    }
  }
`;

/**
 * People-you-may-know — Phase 2.
 *
 * Server pre-hydrates the `Profile` and resolves `sharedCommunityNames`
 * so the home sidebar can render "Also in Ghana Embassy, Diaspora Tech"
 * in a single round-trip.
 */
export const RECOMMENDED_PEOPLE = gql`
  query RecommendedPeople($limit: Int) {
    recommendedPeople(limit: $limit) {
      items {
        profile {
          userId
          firstName
          lastName
          avatarUrl
          headline
          bio
          sector
          countryOfOrigin
          residenceCountry
          connectionStatus
          connectionId
          isVerified
          verificationBadge
          trustScore
          trustTier
        }
        score
        sharedCommunityCount
        sharedCommunityNames
        mutualConnectionCount
        mutualConnectionNames
        matchReason
      }
      rankingStrategy
    }
  }
`;

/**
 * Posts similar to the given post (vector kNN over content embeddings).
 *
 * Returns IDs + ranking metadata only — clients hydrate full posts via `GET_POST`.
 * Backed by recommendation-service `GetSimilarItems`. Callable anonymously; safe to
 * fail silently (best-effort) — the post detail page must still work if this errors.
 */
export const SIMILAR_POSTS = gql`
  query SimilarPosts($postId: ID!, $limit: Int) {
    similarPosts(postId: $postId, limit: $limit) {
      items {
        itemId
        itemType
        score
        authorId
        topics
        source
        createdAt
      }
      nextCursor
      rankingStrategy
      explorationRatio
    }
  }
`;

// ============================================================================
// GDPR — RIGHT-TO-ERASE MUTATION
// ============================================================================

/**
 * Wipes the caller's recommendation-service footprint (interest profile,
 * interaction log, feed impressions, blocks, memberships).
 *
 * Idempotent — re-running on an already-erased user returns
 * `success: true` with every count in `rowsDeleted` equal to 0.
 *
 * NOTE: this does NOT delete the user's account itself (auth-service /
 * user-service deletion is a separate, not-yet-built flow). The user must
 * sign out separately to complete account removal.
 */
export const ERASE_MY_ACCOUNT_DATA = gql`
  mutation EraseMyAccountData {
    eraseMyAccountData {
      success
      message
      rowsDeleted {
        interest_profile
        interaction_log
        feed_impression
        user_block
        user_membership
      }
    }
  }
`;
