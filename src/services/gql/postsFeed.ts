// services/gql/postsFeed.ts
import { gql } from '@apollo/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EngagementCounts {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface UserEngagement {
  hasLiked: boolean;
  hasSaved: boolean;
  hasShared: boolean;
}

export interface UserProfile {
  name: string;
  avatar: string;
  isVip: boolean;
  verificationTier: string;
}

export interface OrganizationProfile {
  name: string;
  logo: string;
  isVerified: boolean;
}

export interface AuthorProfile {
  organizationProfile?: OrganizationProfile;
  userProfile?: UserProfile;
}

export interface Post {
  id: string;
  text: string;
  authorId: string;
  authorType: string;
  authorProfile?: AuthorProfile;
  createdAt: string;
  engagementCounts: EngagementCounts;
  userEngagement: UserEngagement;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorType: 'USER' | 'ORG';
  authorProfile?: AuthorProfile;
  createdAt: string;
  postId: string;
  parentId?: string | null;
}

export interface GetFeedInput {
  limit?: number;
  offset?: number;
  communityId?: string;
  authorId?: string;
  type: 'all' | 'following' | 'community';
}

export interface CreatePostInput {
  text: string;
  communityId?: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'CONNECTIONS';
}

export interface EditPostInput {
  id: string;
  text: string;
}

export interface AddEngagementInput {
  postId: string;
  engagementType: 'LIKE' | 'SAVE' | 'SHARE';
}

export interface CreateCommentInput {
  postId: string;
  text: string;
  parentId?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface GetFeedData {
  feed: {
    total: number;
    posts: Post[];
  };
}

export interface GetPostData {
  post: Post;
}

export interface GetPostCommentsData {
  postComments: Comment[];
}

export interface CreatePostData {
  createPost: {
    id: string;
    text: string;
  };
}

export interface EditPostData {
  editPost: {
    id: string;
    text: string;
  };
}

export interface AddEngagementData {
  addEngagement: {
    success: boolean;
  };
}

export interface CreateCommentData {
  createComment: {
    id: string;
    text: string;
    postId: string;
    parentId?: string | null;
    authorId: string;
    authorType: 'USER' | 'ORG';
    createdAt: string;
  };
}

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