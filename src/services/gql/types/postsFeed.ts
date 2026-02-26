/**
 * @fileoverview Posts and feed-related type definitions for GraphQL operations.
 * Contains interfaces for posts, comments, engagement, and feed queries.
 * @module services/gql/types/postsFeed
 */

// ============================================================================
// ENGAGEMENT TYPES
// ============================================================================

/**
 * Counts for different engagement types on a post.
 *
 * @interface EngagementCounts
 * @property {number} likes - Number of likes on the post
 * @property {number} comments - Number of comments on the post
 * @property {number} shares - Number of times the post was shared
 * @property {number} saves - Number of times the post was saved
 */
export interface EngagementCounts {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/**
 * Current user's engagement status with a post.
 *
 * @interface UserEngagement
 * @property {boolean} hasLiked - Whether the current user has liked the post
 * @property {boolean} hasSaved - Whether the current user has saved the post
 * @property {boolean} hasShared - Whether the current user has shared the post
 */
export interface UserEngagement {
  hasLiked: boolean;
  hasSaved: boolean;
  hasShared: boolean;
}

// ============================================================================
// AUTHOR PROFILE TYPES
// ============================================================================

/**
 * User profile information for post authors.
 *
 * @interface PostUserProfile
 * @property {string} name - User's display name
 * @property {string} avatar - URL to user's avatar image
 * @property {boolean} isVip - Whether the user has VIP status
 * @property {string} verificationTier - User's verification tier level
 */
export interface PostUserProfile {
  name: string;
  avatar: string;
  isVip: boolean;
  verificationTier: string;
}

/**
 * Organization profile information for post authors.
 *
 * @interface OrganizationProfile
 * @property {string} name - Organization's name
 * @property {string} logo - URL to organization's logo
 * @property {boolean} isVerified - Whether the organization is verified
 */
export interface OrganizationProfile {
  name: string;
  logo: string;
  isVerified: boolean;
}

/**
 * Combined author profile that can be either a user or organization.
 *
 * @interface AuthorProfile
 * @property {OrganizationProfile} [organizationProfile] - Organization profile if author is an org
 * @property {PostUserProfile} [userProfile] - User profile if author is a user
 */
export interface AuthorProfile {
  organizationProfile?: OrganizationProfile;
  userProfile?: PostUserProfile;
}

// ============================================================================
// POST TYPES
// ============================================================================

/**
 * Post visibility options.
 *
 * @type PostVisibility
 */
export type PostVisibility = 'PUBLIC' | 'PRIVATE' | 'CONNECTIONS';

/**
 * Author type for posts and comments.
 *
 * @type AuthorType
 */
export type AuthorType = 'USER' | 'ORG';

/**
 * Represents a post in the feed.
 *
 * @interface Post
 * @property {string} id - Unique post identifier
 * @property {string} text - Post content/text
 * @property {string} authorId - ID of the author
 * @property {string} authorType - Type of author ('USER' or 'ORG')
 * @property {AuthorProfile} [authorProfile] - Author's profile information
 * @property {string} createdAt - ISO timestamp when post was created
 * @property {EngagementCounts} engagementCounts - Engagement statistics
 * @property {UserEngagement} userEngagement - Current user's engagement status
 *
 * @example
 * ```typescript
 * const post: Post = {
 *   id: "post-uuid",
 *   text: "Hello, world!",
 *   authorId: "user-uuid",
 *   authorType: "USER",
 *   authorProfile: {
 *     userProfile: {
 *       name: "John Doe",
 *       avatar: "https://example.com/avatar.jpg",
 *       isVip: false,
 *       verificationTier: "basic"
 *     }
 *   },
 *   createdAt: "2024-01-15T10:00:00Z",
 *   engagementCounts: { likes: 10, comments: 5, shares: 2, saves: 3 },
 *   userEngagement: { hasLiked: false, hasSaved: false, hasShared: false }
 * };
 * ```
 */
/**
 * Attachment on a post (image, video, file, etc.).
 *
 * @interface Attachment
 */
export interface Attachment {
  id: string;
  objectKey: string;
  url?: string;
  type: string;
  mimeType: string;
  size: number;
  duration?: number;
}

/**
 * Input for creating a post attachment.
 *
 * @interface AttachmentInput
 */
export interface AttachmentInput {
  objectKey: string;
  type: string;
  mimeType: string;
  size: number;
  duration?: number;
}

export interface Post {
  id: string;
  text: string;
  authorId: string;
  authorType: string;
  authorProfile?: AuthorProfile;
  createdAt: string;
  attachments?: Attachment[];
  engagementCounts: EngagementCounts;
  userEngagement: UserEngagement;
}

/**
 * Info about a mentioned entity in a post or comment.
 */
export interface MentionInfo {
  entityId: string;
  entityType: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  startPosition: number;
  endPosition: number;
}

/**
 * Info about a hashtag used in a post or comment.
 */
export interface HashtagInfo {
  id: string;
  tag: string;
  usageCount: number;
}

/**
 * Attachment metadata on a post or comment.
 */
export interface CommentAttachmentInfo {
  id: string;
  objectKey: string;
  url: string;
  type: string;
  mimeType: string;
}

/**
 * Represents a comment on a post.
 *
 * @interface Comment
 */
export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorType: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  replyCount?: number;
  createdAt: string;
  updatedAt?: string;
  postId: string;
  parentId?: string | null;
  mentions?: MentionInfo[];
  hashtags?: HashtagInfo[];
  attachments?: CommentAttachmentInfo[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Feed type options for filtering posts.
 *
 * @type FeedType
 */
export type FeedType = 'all' | 'following' | 'community';

/**
 * Input for fetching the feed.
 *
 * @interface GetFeedInput
 * @property {number} [limit] - Maximum number of posts to return
 * @property {number} [offset] - Offset for pagination
 * @property {string} [communityId] - Filter by community ID
 * @property {string} [authorId] - Filter by author ID
 * @property {FeedType} type - Type of feed to fetch
 *
 * @example
 * ```typescript
 * const input: GetFeedInput = {
 *   limit: 20,
 *   offset: 0,
 *   type: 'all'
 * };
 * ```
 */
export interface GetFeedInput {
  limit?: number;
  offset?: number;
  communityId?: string;
  authorId?: string;
  type: FeedType;
}

/**
 * Input for creating a new post.
 *
 * @interface CreatePostInput
 * @property {string} text - Post content
 * @property {string} [communityId] - Optional community to post in
 * @property {PostVisibility} [visibility] - Post visibility setting
 */
export interface CreatePostInput {
  text: string;
  communityId?: string;
  visibility?: PostVisibility;
  publishImmediately?: boolean;
  attachments?: AttachmentInput[];
}

/**
 * Input for editing an existing post.
 *
 * @interface EditPostInput
 * @property {string} id - ID of the post to edit
 * @property {string} text - Updated post content
 */
export interface EditPostInput {
  id: string;
  text: string;
}

/**
 * Engagement types for posts.
 *
 * @type EngagementType
 */
export type EngagementType = 'LIKE' | 'SAVE' | 'SHARE';

/**
 * Input for adding engagement to a post.
 *
 * @interface AddEngagementInput
 * @property {string} postId - ID of the post
 * @property {EngagementType} engagementType - Type of engagement
 */
export interface AddEngagementInput {
  postId: string;
  engagementType: EngagementType;
}

/**
 * Input for creating a comment.
 *
 * @interface CreateCommentInput
 * @property {string} postId - ID of the post to comment on
 * @property {string} text - Comment content
 * @property {string} [parentId] - Optional parent comment ID for replies
 */
export interface CreateCommentInput {
  postId: string;
  text: string;
  parentId?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Response from getting the feed.
 *
 * @interface GetFeedData
 * @property {Object} feed - Feed result
 * @property {number} feed.total - Total number of posts available
 * @property {Post[]} feed.posts - Array of posts
 */
export interface GetFeedData {
  feed: {
    total: number;
    posts: Post[];
  };
}

/**
 * Response from getting a single post.
 *
 * @interface GetPostData
 * @property {Post} post - The requested post
 */
export interface GetPostData {
  post: Post;
}

/**
 * Response from getting post comments.
 *
 * @interface GetPostCommentsData
 * @property {Comment[]} postComments - Array of comments
 */
export interface GetPostCommentsData {
  postComments: Comment[];
}

/**
 * Response from creating a post.
 *
 * @interface CreatePostData
 * @property {Object} createPost - Created post data
 * @property {string} createPost.id - New post's ID
 * @property {string} createPost.text - Post content
 */
/**
 * Response from requesting a pre-signed upload URL.
 *
 * @interface RequestUploadUrlData
 */
export interface RequestUploadUrlData {
  requestUploadUrl: {
    uploadUrl: string;
    objectKey: string;
  };
}

export interface CreatePostData {
  createPost: {
    id: string;
    text: string;
    authorType: string;
  };
}

/**
 * Response from editing a post.
 *
 * @interface EditPostData
 * @property {Object} editPost - Updated post data
 * @property {string} editPost.id - Post ID
 * @property {string} editPost.text - Updated content
 */
export interface EditPostData {
  editPost: {
    id: string;
    text: string;
  };
}

/**
 * Response from adding engagement.
 *
 * @interface AddEngagementData
 * @property {Object} addEngagement - Engagement result
 * @property {boolean} addEngagement.success - Whether engagement was added
 */
export interface AddEngagementData {
  addEngagement: {
    success: boolean;
  };
}

/**
 * Response from creating a comment.
 *
 * @interface CreateCommentData
 * @property {Object} createComment - Created comment data
 * @property {string} createComment.id - Comment ID
 * @property {string} createComment.text - Comment content
 * @property {string} createComment.postId - Parent post ID
 * @property {string | null} [createComment.parentId] - Parent comment ID
 * @property {string} createComment.authorId - Author ID
 * @property {AuthorType} createComment.authorType - Author type
 * @property {string} createComment.createdAt - Creation timestamp
 */
export interface CreateCommentData {
  createComment: {
    id: string;
    text: string;
    postId: string;
    parentId?: string | null;
    authorId: string;
    authorType: AuthorType;
    createdAt: string;
  };
}

// ============================================================================
// ENGAGED POSTS TYPES
// ============================================================================

/**
 * Engagement filter type for fetching posts the user interacted with.
 */
export type EngagedPostsType = 'liked' | 'saved' | 'commented';

/**
 * Input for fetching posts a user has engaged with (liked, saved, or commented).
 */
export interface GetEngagedPostsInput {
  type: EngagedPostsType;
  userId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Response from fetching engaged posts.
 */
export interface GetEngagedPostsData {
  engagedPosts: {
    total: number;
    posts: Post[];
  };
}

/**
 * Response from fetching user posts.
 */
export interface GetUserPostsData {
  userPosts: Post[];
}

/**
 * Response from fetching saved posts.
 */
export interface GetSavedPostsData {
  savedPosts: {
    limit: number;
    offset: number;
    total: number;
    posts: Post[];
  };
}

/**
 * Response from fetching liked posts.
 */
export interface GetLikedPostsData {
  likedPosts: {
    limit: number;
    offset: number;
    total: number;
    posts: Post[];
  };
}

/**
 * Response from fetching commented posts.
 */
export interface GetCommentedPostsData {
  commentedPosts: {
    limit: number;
    offset: number;
    total: number;
    posts: Post[];
  };
}

/**
 * Response from sharing a post.
 */
export interface SharePostData {
  sharePost: {
    success: boolean;
    shareLink: string;
  };
}
