// services/gql/feed.ts
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
  hasShared: boolean;  // ✅ Added missing field
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
  createdAt: string;
}

export interface GetFeedInput {
  limit?: number;
  offset?: number;
  communityId?: string;
  authorId?: string;
  type: 'all';
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
    message: string;
  };
}

export interface CreateCommentData {
  createComment: {
    id: string;
    text: string;
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get Feed
 * 
 * @description
 * Retrieves a paginated feed of posts based on the provided filters.
 * Can be filtered by community, author, or retrieved as a general feed.
 * 
 * @example
 * ```typescript
 * const { data, loading, error } = useQuery<GetFeedData>(GET_FEED, {
 *   variables: {
 *     input: {
 *       limit: 10,
 *       offset: 0,
 *       communityId: 'community-123'
 *     }
 *   }
 * });
 * ```
 */
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
            isVip
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

/**
 * Get Post
 * 
 * @description
 * Retrieves detailed information about a specific post by ID.
 * 
 * @example
 * ```typescript
 * const { data, loading, error } = useQuery<GetPostData>(GET_POST, {
 *   variables: {
 *     id: 'post-123'
 *   }
 * });
 * ```
 */
export const GET_POST = gql`
  query GetPost($id: String!) {
    post(id: $id) {
      id
      text
      authorId
      authorType
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

/**
 * Get Post Comments
 * 
 * @description
 * Retrieves paginated comments for a specific post.
 * 
 * @example
 * ```typescript
 * const { data, loading, error } = useQuery<GetPostCommentsData>(GET_POST_COMMENTS, {
 *   variables: {
 *     postId: 'post-123',
 *     limit: 20,
 *     offset: 0
 *   }
 * });
 * ```
 */
export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: String!, $limit: Int, $offset: Int) {
    postComments(postId: $postId, limit: $limit, offset: $offset) {
      id
      text
      authorId
      createdAt
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create Post
 * 
 * @description
 * Creates a new post with the provided content and optional community assignment.
 * 
 * @example
 * ```typescript
 * const [createPost, { loading }] = useMutation<CreatePostData>(CREATE_POST);
 * 
 * const handleCreatePost = async () => {
 *   try {
 *     const { data } = await createPost({
 *       variables: {
 *         input: {
 *           text: 'Hello world!',
 *           communityId: 'community-123',
 *           visibility: 'PUBLIC'
 *         }
 *       }
 *     });
 *     toast.success('Post created successfully!');
 *   } catch (error) {
 *     toast.error('Failed to create post');
 *   }
 * };
 * ```
 */
export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      text
    }
  }
`;

/**
 * Edit Post
 * 
 * @description
 * Updates the text content of an existing post.
 * 
 * @example
 * ```typescript
 * const [editPost, { loading }] = useMutation<EditPostData>(EDIT_POST);
 * 
 * const handleEditPost = async (postId: string, newText: string) => {
 *   try {
 *     const { data } = await editPost({
 *       variables: {
 *         input: {
 *           id: postId,
 *           text: newText
 *         }
 *       }
 *     });
 *     toast.success('Post updated successfully!');
 *   } catch (error) {
 *     toast.error('Failed to update post');
 *   }
 * };
 * ```
 */
export const EDIT_POST = gql`
  mutation EditPost($input: EditPostInput!) {
    editPost(input: $input) {
      id
      text
    }
  }
`;

/**
 * Add Engagement
 * 
 * @description
 * Adds or removes an engagement (like, save, or share) on a post.
 * If the engagement already exists, it will be removed (toggle behavior).
 * 
 * @example
 * ```typescript
 * const [addEngagement, { loading }] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
 * 
 * const handleLike = async (postId: string) => {
 *   try {
 *     const { data } = await addEngagement({
 *       variables: {
 *         input: {
 *           postId,
 *           engagementType: 'LIKE'
 *         }
 *       },
 *       // Optimistically update the UI
 *       optimisticResponse: {
 *         addEngagement: {
 *           success: true,
 *           message: 'Post liked'
 *         }
 *       }
 *     });
 *     
 *     if (data?.addEngagement.success) {
 *       toast.success(data.addEngagement.message);
 *     }
 *   } catch (error) {
 *     toast.error('Failed to like post');
 *   }
 * };
 * ```
 */
export const ADD_ENGAGEMENT = gql`
  mutation AddEngagement($input: AddEngagementInput!) {
    addEngagement(input: $input) {
      success
      message
    }
  }
`;

/**
 * Create Comment
 * 
 * @description
 * Creates a new comment on a post.
 * 
 * @example
 * ```typescript
 * const [createComment, { loading }] = useMutation<CreateCommentData>(CREATE_COMMENT);
 * 
 * const handleComment = async (postId: string, text: string) => {
 *   try {
 *     const { data } = await createComment({
 *       variables: {
 *         input: {
 *           postId,
 *           text
 *         }
 *       },
 *       // Refetch comments after creating
 *       refetchQueries: [
 *         {
 *           query: GET_POST_COMMENTS,
 *           variables: { postId, limit: 20, offset: 0 }
 *         }
 *       ]
 *     });
 *     
 *     toast.success('Comment posted!');
 *   } catch (error) {
 *     toast.error('Failed to post comment');
 *   }
 * };
 * ```
 */
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      text
    }
  }
`;