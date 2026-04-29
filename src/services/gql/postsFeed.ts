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
  FeedModeType,
  FeedViewMode,
  GetPostData,
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

export const GET_POST = gql`
  query GetPost($id: String!) {
    post(id: $id) {
      ...FullPost
    }
  }
  ${FULL_POST_FRAGMENT}
`;

/** When parentId is not sent, backend returns a flat list of all comments + replies; build tree client-side. */
export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: String!, $limit: Int, $offset: Int, $parentId: String) {
    postComments(postId: $postId, limit: $limit, offset: $offset, parentId: $parentId) {
      id
      text
      authorId
      authorType
      authorDisplayName
      authorAvatarUrl
      authorHandle
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
      }
    }
  }
`;
