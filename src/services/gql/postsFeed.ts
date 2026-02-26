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
  CreateCommentInput,
  GetFeedData,
  GetPostData,
  GetPostCommentsData,
  CreatePostData,
  EditPostData,
  AddEngagementData,
  CreateCommentData,
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

export const GET_FEED = gql`
  query GetFeed($input: GetFeedInput!) {
    feed(input: $input) {
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

export const GET_POST = gql`
  query GetPost($id: String!) {
    post(id: $id) {
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
`;

export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: String!, $limit: Int, $offset: Int, $parentId: String) {
    postComments(postId: $postId, limit: $limit, offset: $offset, parentId: $parentId) {
      id
      text
      authorId
      authorType
      authorDisplayName
      authorAvatarUrl
      replyCount
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
      text
      postId
      parentId
      authorId
      authorType
      createdAt
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
