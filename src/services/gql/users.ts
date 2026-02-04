import { gql } from '@apollo/client';

// Re-export types from the types folder for backward compatibility
export type {
  BlockUserBasic,
  Block,
  BlockUserInput,
  UnblockUserInput,
  BlockUserResponse,
  UnblockUserResponse,
  GetBlockedUsersResponse,
  IsUserBlockedResponse,
} from './types';

// ============================================================================
// BLOCKING QUERIES
// ============================================================================

/**
 * Get list of users blocked by the current user.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetBlockedUsersResponse>(GET_BLOCKED_USERS, {
 *   variables: { limit: 20 }
 * });
 * ```
 */
export const GET_BLOCKED_USERS = gql`
  query GetBlockedUsers($limit: Int) {
    getBlockedUsers(limit: $limit) {
      users {
        id
        blockerId
        blockedId
        reason
        blockedAt
        blocked {
          userId
          email
          firstName
          lastName
          avatarUrl
        }
      }
      total
      hasMore
      nextCursor
    }
  }
`;

/**
 * Check if a specific user is blocked.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<IsUserBlockedResponse>(IS_USER_BLOCKED, {
 *   variables: { userId: "0538ea6e-42a7-47d6-af92-8a3c34a88498" }
 * });
 * 
 * if (data?.isUserBlocked.isBlocked) {
 *   console.log("User is blocked");
 * }
 * ```
 */
export const IS_USER_BLOCKED = gql`
  query IsUserBlocked($userId: ID!) {
    isUserBlocked(userId: $userId) {
      isBlocked
    }
  }
`;

// ============================================================================
// BLOCKING MUTATIONS
// ============================================================================

/**
 * Block a user.
 * 
 * @example
 * ```typescript
 * const [blockUser] = useMutation<BlockUserResponse>(BLOCK_USER);
 * 
 * await blockUser({
 *   variables: {
 *     input: {
 *       blockedId: "0538ea6e-42a7-47d6-af92-8a3c34a88498",
 *       reason: "Inappropriate behavior"
 *     }
 *   }
 * });
 * ```
 */
export const BLOCK_USER = gql`
  mutation BlockUser($input: BlockUserInput!) {
    blockUser(input: $input) {
      success
      message
      block {
        id
        blockerId
        blockedId
        reason
        blockedAt
        blocker {
          userId
          email
          firstName
          lastName
          avatarUrl
        }
        blocked {
          userId
          email
          firstName
          lastName
          avatarUrl
        }
      }
    }
  }
`;

/**
 * Unblock a user.
 * 
 * @example
 * ```typescript
 * const [unblockUser] = useMutation<UnblockUserResponse>(UNBLOCK_USER);
 * 
 * await unblockUser({
 *   variables: {
 *     input: { blockedId: "0538ea6e-42a7-47d6-af92-8a3c34a88498" }
 *   }
 * });
 * ```
 */
export const UNBLOCK_USER = gql`
  mutation UnblockUser($input: UnblockUserInput!) {
    unblockUser(input: $input) {
      success
      message
    }
  }
`;