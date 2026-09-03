/**
 * @fileoverview User blocking-related type definitions for GraphQL operations.
 * Contains interfaces for blocking/unblocking users and querying blocked users.
 * @module services/gql/types/users
 */

// ============================================================================
// USER BASIC TYPES
// ============================================================================

/**
 * Basic user information for blocking operations.
 *
 * @interface BlockUserBasic
 * @property {string} userId - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} [avatarUrl] - URL to user's profile picture
 */
export interface BlockUserBasic {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

/**
 * Represents a block relationship between two users.
 *
 * @interface Block
 * @property {string} id - Unique block identifier
 * @property {string} blockerId - ID of the user who blocked
 * @property {string} blockedId - ID of the blocked user
 * @property {string} [reason] - Optional reason for blocking
 * @property {string} blockedAt - ISO timestamp when block was created
 * @property {BlockUserBasic} blocker - Profile of the user who blocked
 * @property {BlockUserBasic} blocked - Profile of the blocked user
 *
 * @example
 * ```typescript
 * const block: Block = {
 *   id: "block-uuid",
 *   blockerId: "user-uuid-1",
 *   blockedId: "user-uuid-2",
 *   reason: "Inappropriate behavior",
 *   blockedAt: "2024-01-15T10:00:00Z",
 *   blocker: { userId: "user-uuid-1", email: "user1@example.com", firstName: "John", lastName: "Doe" },
 *   blocked: { userId: "user-uuid-2", email: "user2@example.com", firstName: "Jane", lastName: "Smith" }
 * };
 * ```
 */
export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  blockedAt: string;
  blocker: BlockUserBasic;
  blocked: BlockUserBasic;
}

// ============================================================================
// BLOCK INPUT TYPES
// ============================================================================

/**
 * Input for blocking a user.
 *
 * @interface BlockUserInput
 * @property {string} blockedId - ID of the user to block
 * @property {string} [reason] - Optional reason for blocking
 *
 * @example
 * ```typescript
 * const input: BlockUserInput = {
 *   blockedId: "user-uuid",
 *   reason: "Spam or inappropriate content"
 * };
 * ```
 */
export interface BlockUserInput {
  blockedId: string;
  reason?: string;
}

/**
 * Input for unblocking a user.
 *
 * @interface UnblockUserInput
 * @property {string} blockedId - ID of the user to unblock
 */
export interface UnblockUserInput {
  blockedId: string;
}

// ============================================================================
// BLOCK RESPONSE TYPES
// ============================================================================

/**
 * Response from blocking a user.
 *
 * @interface BlockUserResponse
 * @property {Object} blockUser - Mutation result
 * @property {boolean} blockUser.success - Whether blocking was successful
 * @property {string} [blockUser.message] - Optional message
 * @property {Block} blockUser.block - Created block record
 */
export interface BlockUserResponse {
  blockUser: {
    success: boolean;
    message?: string;
    block: Block;
  };
}

/**
 * Response from unblocking a user.
 *
 * @interface UnblockUserResponse
 * @property {Object} unblockUser - Mutation result
 * @property {boolean} unblockUser.success - Whether unblocking was successful
 * @property {string} [unblockUser.message] - Optional message
 */
export interface UnblockUserResponse {
  unblockUser: {
    success: boolean;
    message?: string;
  };
}

/**
 * Response from getting blocked users list.
 *
 * @interface GetBlockedUsersResponse
 * @property {Object} getBlockedUsers - Query result
 * @property {Block[]} getBlockedUsers.users - Array of blocked user records
 * @property {number} getBlockedUsers.total - Total number of blocked users
 * @property {boolean} getBlockedUsers.hasMore - Whether more results are available
 * @property {string} [getBlockedUsers.nextCursor] - Cursor for pagination
 */
export interface GetBlockedUsersResponse {
  getBlockedUsers: {
    users: Block[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * Response from checking if a user is blocked.
 *
 * @interface IsUserBlockedResponse
 * @property {Object} isUserBlocked - Query result
 * @property {boolean} isUserBlocked.isBlocked - Whether the user is blocked
 */
export interface IsUserBlockedResponse {
  isUserBlocked: {
    isBlocked: boolean;
  };
}
