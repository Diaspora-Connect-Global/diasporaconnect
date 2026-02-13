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
  query GetPostComments($postId: String!, $limit: Int, $offset: Int) {
    postComments(postId: $postId, limit: $limit, offset: $offset) {
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
      postId
      parentId
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
  mutation RequestUploadUrl($fileName: String!, $contentType: String!, $fileSize: Int!) {
    requestUploadUrl(fileName: $fileName, contentType: $contentType, fileSize: $fileSize) {
      uploadUrl
      readUrl
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