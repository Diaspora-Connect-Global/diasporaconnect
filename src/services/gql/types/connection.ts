/**
 * @fileoverview Connection-related type definitions for GraphQL operations.
 * Contains interfaces for user connections, friend requests, friend suggestions,
 * and user search functionality.
 * @module services/gql/types/connection
 */

// ============================================================================
// BASE USER TYPES
// ============================================================================

/**
 * Possible connection statuses between users.
 *
 * @type ConnectionStatus
 * - "connected" - Users are already connected
 * - "none" - No connection exists
 * - "pending_received" - Current user received a connection request
 * - "pending_sent" - Current user sent a connection request
 * - "blocked" - One user has blocked the other
 */
export type ConnectionStatus = "connected" | "none" | "pending_received" | "pending_sent" | "blocked";

/**
 * Basic user information returned in connection-related queries.
 *
 * @interface UserBasic
 * @property {string} userId - Unique user identifier
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} email - User's email address
 * @property {string} [avatarUrl] - URL to user's profile picture
 * @property {string} [sector] - User's professional sector
 * @property {string} [occupation] - User's occupation/job title
 * @property {ConnectionStatus} connectionStatus - Current connection status with the user
 */
export interface UserBasic {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  sector?: string;
  occupation?: string;
  connectionStatus: ConnectionStatus;
}

// ============================================================================
// CONNECTION TYPES
// ============================================================================

/**
 * Represents a connection between two users.
 *
 * @interface Connection
 * @property {string} id - Unique connection identifier
 * @property {string} requesterId - ID of user who sent the request
 * @property {string} receiverId - ID of user who received the request
 * @property {string} status - Current status of the connection
 * @property {string} [message] - Optional message sent with the request
 * @property {string} createdAt - ISO timestamp when connection was created
 * @property {string} [acceptedAt] - ISO timestamp when connection was accepted
 * @property {UserBasic} requester - Profile of the user who sent the request
 * @property {UserBasic} receiver - Profile of the user who received the request
 */
export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: string;
  message?: string;
  createdAt: string;
  acceptedAt?: string;
  requester: UserBasic;
  receiver: UserBasic;
}

// ============================================================================
// CONNECTION INPUT TYPES
// ============================================================================

/**
 * Input for sending a connection request.
 *
 * @interface SendConnectionRequestInput
 * @property {string} receiverId - ID of the user to send request to
 * @property {string} [message] - Optional personalized message
 *
 * @example
 * ```typescript
 * const input: SendConnectionRequestInput = {
 *   receiverId: "user-uuid",
 *   message: "Hi! I'd like to connect with you."
 * };
 * ```
 */
export interface SendConnectionRequestInput {
  receiverId: string;
  message?: string;
}

/**
 * Input for accepting a connection request.
 *
 * @interface AcceptConnectionInput
 * @property {string} connectionId - ID of the connection to accept
 */
export interface AcceptConnectionInput {
  connectionId: string;
}

/**
 * Input for rejecting a connection request.
 *
 * @interface RejectConnectionInput
 * @property {string} connectionId - ID of the connection to reject
 */
export interface RejectConnectionInput {
  connectionId: string;
}

/**
 * Input for canceling a sent connection request.
 *
 * @interface CancelConnectionInput
 * @property {string} connectionId - ID of the connection to cancel
 */
export interface CancelConnectionInput {
  connectionId: string;
}

/**
 * Input for removing an existing friend connection.
 *
 * @interface RemoveFriendInput
 * @property {string} connectionId - ID of the accepted connection to remove
 */
export interface RemoveFriendInput {
  connectionId: string;
}

// ============================================================================
// CONNECTION RESPONSE TYPES
// ============================================================================

/**
 * Response from getting user's connections.
 *
 * @interface GetConnectionsResponse
 * @property {Object} getConnections - Query result
 * @property {boolean} getConnections.success - Whether query was successful
 * @property {string} [getConnections.message] - Optional message
 * @property {Connection[]} getConnections.connections - Array of connections
 * @property {number} getConnections.total - Total number of connections
 */
export interface GetConnectionsResponse {
  getConnections: {
    success: boolean;
    message?: string;
    connections: Connection[];
    total: number;
  };
}

/**
 * Response from sending a connection request.
 *
 * @interface SendConnectionRequestResponse
 * @property {Object} sendConnectionRequest - Mutation result
 * @property {boolean} sendConnectionRequest.success - Whether request was sent
 * @property {string} [sendConnectionRequest.message] - Optional message
 * @property {Connection} sendConnectionRequest.connection - Created connection
 */
export interface SendConnectionRequestResponse {
  sendConnectionRequest: {
    success: boolean;
    message?: string;
    connection: Connection;
  };
}

/**
 * Response from accepting a connection.
 *
 * @interface AcceptConnectionResponse
 * @property {Object} acceptConnection - Mutation result
 * @property {boolean} acceptConnection.success - Whether connection was accepted
 * @property {string} [acceptConnection.message] - Optional message
 * @property {Connection} acceptConnection.connection - Updated connection
 */
export interface AcceptConnectionResponse {
  acceptConnection: {
    success: boolean;
    message?: string;
    connection: Connection;
  };
}

/**
 * Response from canceling a connection request.
 *
 * @interface CancelConnectionResponse
 * @property {Object} cancelConnection - Mutation result
 * @property {boolean} cancelConnection.success - Whether cancellation was successful
 * @property {string} [cancelConnection.message] - Optional message
 * @property {Connection} cancelConnection.connection - Canceled connection
 */
export interface CancelConnectionResponse {
  cancelConnection: {
    success: boolean;
    message?: string;
    connection: Connection;
  };
}

/**
 * Response from rejecting a connection.
 *
 * @interface RejectConnectionResponse
 * @property {Object} rejectConnection - Mutation result
 * @property {boolean} rejectConnection.success - Whether rejection was successful
 * @property {string} [rejectConnection.message] - Optional message
 */
export interface RejectConnectionResponse {
  rejectConnection: {
    success: boolean;
    message?: string;
  };
}

/**
 * Response from removing an existing friend connection.
 *
 * @interface RemoveFriendResponse
 * @property {Object} removeFriend - Mutation result
 * @property {boolean} removeFriend.success - Whether friend removal was successful
 * @property {string} [removeFriend.message] - Optional message
 */
export interface RemoveFriendResponse {
  removeFriend: {
    success: boolean;
    message?: string;
  };
}

/**
 * Response from getting pending connections.
 *
 * @interface GetPendingConnectionsResponse
 * @property {Object} getPendingConnections - Query result
 * @property {boolean} getPendingConnections.success - Whether query was successful
 * @property {string} [getPendingConnections.message] - Optional message
 * @property {Connection[]} getPendingConnections.connections - Pending connections
 * @property {number} getPendingConnections.total - Total pending connections
 */
export interface GetPendingConnectionsResponse {
  getPendingConnections: {
    success: boolean;
    message?: string;
    connections: Connection[];
    total: number;
  };
}

/**
 * Response from getting mutual friends.
 *
 * @interface GetMutualFriendsResponse
 * @property {Object} getMutualFriends - Query result
 * @property {boolean} getMutualFriends.success - Whether query was successful
 * @property {string} [getMutualFriends.message] - Optional message
 * @property {UserBasic[]} getMutualFriends.mutualFriends - Array of mutual friends
 * @property {number} getMutualFriends.total - Total mutual friends count
 */
export interface GetMutualFriendsResponse {
  getMutualFriends: {
    success: boolean;
    message?: string;
    mutualFriends: UserBasic[];
    total: number;
  };
}

// ============================================================================
// FRIEND SUGGESTION TYPES — REMOVED (Phase 3 PYMK unification)
// ============================================================================
// `FriendSuggestionProfile`, `FriendSuggestion`, and
// `GetFriendSuggestionsResponse` were the Apollo response shape for the
// retired `getFriendSuggestions` query. PYMK is now served by
// `PersonRecommendation` / `RecommendedPeopleData` in
// `./recommendation.ts` — import from there.

/**
 * Response type for pending requests (sent or received).
 *
 * @interface GetPendingRequestsResponse
 * @property {Object} getPendingConnections - Query result
 * @property {boolean} getPendingConnections.success - Whether query was successful
 * @property {string} [getPendingConnections.message] - Optional message
 * @property {number} getPendingConnections.total - Total pending requests
 * @property {Connection[]} getPendingConnections.connections - Array of pending connections
 */
export interface GetPendingRequestsResponse {
  getPendingConnections: {
    success: boolean;
    message?: string;
    total: number;
    connections: Connection[];
  };
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Input for searching users.
 *
 * @interface SearchUsersInput
 * @property {string} query - Search query string
 * @property {number} [limit] - Maximum results to return
 * @property {number} [offset] - Results offset for pagination
 */
export interface SearchUsersInput {
  query: string;
  limit?: number;
  offset?: number;
}

/**
 * User profile returned in search results.
 *
 * @interface UserProfile
 * @property {string} userId - User's unique identifier
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} [sector] - User's professional sector
 * @property {string} [countryOfOrigin] - User's country of origin
 * @property {string} [residenceCountry] - User's country of residence
 * @property {string} [bio] - User's biography
 * @property {string} [headline] - User's professional headline
 * @property {number} connectionCount - Number of connections
 * @property {string} [avatarUrl] - URL to avatar image
 * @property {string} connectionId - Connection ID if exists
 * @property {ConnectionStatus} connectionStatus - Current connection status
 */
export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  sector?: string;
  countryOfOrigin?: string;
  residenceCountry?: string;
  bio?: string;
  headline?: string;
  connectionCount: number;
  avatarUrl?: string;
  connectionId: string;
  connectionStatus: ConnectionStatus;
}

/**
 * Response from user search query.
 *
 * @interface SearchUsersResponse
 * @property {Object} searchUsers - Search result
 * @property {boolean} searchUsers.success - Whether search was successful
 * @property {string} [searchUsers.message] - Optional message
 * @property {number} searchUsers.total - Total matching results
 * @property {boolean} searchUsers.hasMore - Whether more results are available
 * @property {UserProfile[]} searchUsers.profiles - Array of matching profiles
 */
export interface SearchUsersResponse {
  searchUsers: {
    success: boolean;
    message?: string;
    total: number;
    hasMore: boolean;
    profiles: UserProfile[];
  };
}
