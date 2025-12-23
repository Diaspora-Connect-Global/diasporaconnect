import { gql } from '@apollo/client';

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export interface UserBasic {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  sector?: string;
  occupation?: string;
  connectionStatus: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";
}

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

export interface SendConnectionRequestInput {
  receiverId: string;
  message?: string;
}

export interface AcceptConnectionInput {
  connectionId: string;
}

export interface RejectConnectionInput {
  connectionId: string;
}

export interface GetConnectionsResponse {
  getConnections: {
    success: boolean;
    message?: string;
    connections: Connection[];
    total: number;
  };
}

export interface SendConnectionRequestResponse {
  sendConnectionRequest: {
    success: boolean;
    message?: string;
    connection: Connection;
  };
}

export interface AcceptConnectionResponse {
  acceptConnection: {
    success: boolean;
    message?: string;
    connection: Connection;
  };
}
export interface CancelConnectionResponse {
  cancelConnection: {
    success: boolean;
    message?: string;
    connection: Connection;
  };
}

export interface RejectConnectionResponse {
  rejectConnection: {
    success: boolean;
    message?: string;
  };
}

export interface GetPendingConnectionsResponse {
  getPendingConnections: {
    success: boolean;
    message?: string;
    connections: Connection[];
    total: number;
  };
}

export interface GetMutualFriendsResponse {
  getMutualFriends: {
    success: boolean;
    message?: string;
    mutualFriends: UserBasic[];
    total: number;
  };
}

// ============================================================================
// CONNECTION QUERIES
// ============================================================================

/**
 * Get the current user's connections.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetConnectionsResponse>(GET_MY_CONNECTIONS, {
 *   variables: { limit: 20, offset: 0 }
 * });
 * ```
 */
export const GET_MY_CONNECTIONS = gql`
  query GetMyConnections($limit: Float, $offset: Float) {
    getConnections(limit: $limit, offset: $offset) {
      success
      message
      connections {
        id
        requesterId
        receiverId
        status
        createdAt
        acceptedAt
        requester {
          userId
          firstName
          lastName
          email
          avatarUrl
          sector
        }
        receiver {
          userId
          firstName
          lastName
          email
          avatarUrl
          sector
        }
      }
      total
    }
  }
`;

/**
 * Get another user's connections.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetConnectionsResponse>(GET_USER_CONNECTIONS, {
 *   variables: { 
 *     userId: "b75c6675-e78b-4c6a-82f4-18d4d9a84796",
 *     limit: 20,
 *     offset: 0
 *   }
 * });
 * ```
 */
export const GET_USER_CONNECTIONS = gql`
  query GetUserConnections($userId: ID!, $limit: Float, $offset: Float) {
    getConnections(userId: $userId, limit: $limit, offset: $offset) {
      success
      message
      connections {
        id
        requesterId
        receiverId
        status
        createdAt
        acceptedAt
        requester {
          userId
          firstName
          lastName
          email
          avatarUrl
          sector
        }
        receiver {
          userId
          firstName
          lastName
          email
          avatarUrl
          sector
        }
      }
      total
    }
  }
`;

/**
 * Get pending connection requests.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetPendingConnectionsResponse>(GET_PENDING_CONNECTIONS, {
 *   variables: { limit: 10 }
 * });
 * ```
 */
export const GET_PENDING_CONNECTIONS = gql`
  query GetPendingConnections($limit: Float) {
    getPendingConnections(limit: $limit) {
      success
      message
      connections {
        id
        requesterId
        receiverId
        status
        message
        createdAt
        requester {
          userId
          firstName
          lastName
          email
          avatarUrl
          sector
          occupation
        }
      }
      total
    }
  }
`;

/**
 * Get mutual friends with another user.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetMutualFriendsResponse>(GET_MUTUAL_FRIENDS, {
 *   variables: { 
 *     otherUserId: "0538ea6e-42a7-47d6-af92-8a3c34a88498",
 *     limit: 20,
 *     offset: 0
 *   }
 * });
 * ```
 */
export const GET_MUTUAL_FRIENDS = gql`
  query GetMutualFriends($otherUserId: ID!, $limit: Int, $offset: Int) {
    getMutualFriends(otherUserId: $otherUserId, limit: $limit, offset: $offset) {
      success
      message
      mutualFriends {
        userId
        firstName
        lastName
        email
        avatarUrl
        sector
        occupation
      }
      total
    }
  }
`;

// ============================================================================
// CONNECTION MUTATIONS
// ============================================================================

/**
 * Send a connection request to another user.
 * 
 * @example
 * ```typescript
 * const [sendRequest] = useMutation<SendConnectionRequestResponse>(SEND_CONNECTION_REQUEST);
 * 
 * await sendRequest({
 *   variables: {
 *     input: {
 *       receiverId: "0538ea6e-42a7-47d6-af92-8a3c34a88498",
 *       message: "Hi! I'd like to connect with you."
 *     }
 *   }
 * });
 * ```
 */
export const SEND_CONNECTION_REQUEST = gql`
  mutation SendConnectionRequest($input: SendConnectionRequestInput!) {
    sendConnectionRequest(input: $input) {
      success
      message
      connection {
        id
        requesterId
        receiverId
        status
        message
        createdAt
        requester {
          userId
          firstName
          lastName
          email
          avatarUrl
        }
        receiver {
          userId
          firstName
          lastName
          email
          avatarUrl
        }
      }
    }
  }
`;

/**
 * Accept a connection request.
 * 
 * @example
 * ```typescript
 * const [acceptConnection] = useMutation<AcceptConnectionResponse>(ACCEPT_CONNECTION);
 * 
 * await acceptConnection({
 *   variables: {
 *     input: { connectionId: "48b8eeef-d24a-4831-9802-e3e13c47754d" }
 *   }
 * });
 * ```
 */
export const ACCEPT_CONNECTION = gql`
  mutation AcceptConnection($input: AcceptConnectionInput!) {
    acceptConnection(input: $input) {
      success
      message
      connection {
        id
        requesterId
        receiverId
        status
        acceptedAt
        requester {
          userId
          firstName
          lastName
        }
        receiver {
          userId
          firstName
          lastName
        }
      }
    }
  }
`;

/**
 * Reject a connection request.
 * 
 * @example
 * ```typescript
 * const [rejectConnection] = useMutation<RejectConnectionResponse>(REJECT_CONNECTION);
 * 
 * await rejectConnection({
 *   variables: {
 *     input: { connectionId: "c5190b8e-6ef9-49f6-91db-454d0e21ea08" }
 *   }
 * });
 * ```
 */
export const REJECT_CONNECTION = gql`
  mutation RejectConnection($input: RejectConnectionInput!) {
    rejectConnection(input: $input) {
      success
      message
    }
  }
`;
export const CANCEL_CONNECTION = gql`
  mutation CancelConnection($input: CancelConnectionInput!) {
    cancelConnection(input: $input) {
      success
      message
    }
  }
`;

export interface FriendSuggestionProfile {
  userId: string;
  firstName: string;
  lastName: string;
  connectionId:string
  sector?: string;
  countryOfOrigin?: string;
  residenceCountry?: string;
  bio?: string;
  connectionCount: number;
  profilePicture:string
  avatarUrl:string
  connectionStatus: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";
}

export interface FriendSuggestion {
  profile: FriendSuggestionProfile;
  score: number;
  matchReasons: string[];
  mutualConnectionsCount: number;
}

export interface GetFriendSuggestionsResponse {
  getFriendSuggestions: {
    success: boolean;
    message?: string;
    total: number;
    suggestions: FriendSuggestion[];
  };
}

/**
 * Get suggested friends for the current user.
 *
 * @example
 * ```ts
 * const { data } = useQuery<GetFriendSuggestionsResponse>(
 *   GET_FRIEND_SUGGESTIONS,
 *   { variables: { limit: 10 } }
 * );
 * ```
 */
export const GET_FRIEND_SUGGESTIONS = gql`
  query GetFriendSuggestions($limit: Int) {
    getFriendSuggestions(limit: $limit) {
      success
      message
      total
      suggestions {
        profile {
          userId
          firstName
          lastName
          sector
          countryOfOrigin
          residenceCountry
          bio
          connectionCount
          avatarUrl
        }
        score
        matchReasons
        mutualConnectionsCount
      }
    }
  }
`;


// Get pending requests SENT (where current user is requester)
export const GET_PENDING_REQUESTS_SENT = gql`
  query GetPendingRequestsSent($limit: Float, $offset: Float) {
    getPendingConnections(limit: $limit, offset: $offset) {
      success
      message
      total
      connections {
        id
        status
        requesterId
        receiverId
        message
        createdAt
        receiver {
          userId
          firstName
          lastName
          email
          avatarUrl
          bio
          occupation
          sector
          location
          country
        }
      }
    }
  }
`;

// Get pending requests RECEIVED (where current user is receiver)
export const GET_PENDING_REQUESTS_RECEIVED = gql`
  query GetPendingRequestsReceived($limit: Float, $offset: Float) {
    getPendingConnections(limit: $limit, offset: $offset) {
      success
      message
      total
      connections {
        id
        status
        requesterId
        receiverId
        message
        createdAt
        requester {
          userId
          firstName
          lastName
          email
          avatarUrl
          bio
          occupation
          sector
          location
          country
        }
      }
    }
  }
`;

// Type for both pending request responses
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

export interface SearchUsersInput {
  query: string;
  limit?: number;
  offset?: number;
}

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
  connectionStatus: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";
}

export interface SearchUsersResponse {
  searchUsers: {
    success: boolean;
    message?: string;
    total: number;
    hasMore: boolean;
    profiles: UserProfile[];
  };
}

// ============================================================================
// SEARCH QUERY
// ============================================================================

/**
 * Search for users by name, sector, or other criteria
 * 
 * @example
 * ```typescript
 * const [searchUsers, { data, loading }] = useLazyQuery<SearchUsersResponse>(SEARCH_USERS);
 * 
 * searchUsers({
 *   variables: {
 *     searchUsersInput: {
 *       query: "john",
 *       limit: 20,
 *       offset: 0
 *     }
 *   }
 * });
 * ```
 */
export const SEARCH_USERS = gql`
  query SearchUsers($searchUsersInput: SearchUsersInput!) {
    searchUsers(input: $searchUsersInput) {
      success
      message
      total
      hasMore
      profiles {
        userId
        firstName
        lastName
        sector
        countryOfOrigin
        residenceCountry
        bio
        headline
        connectionCount
        avatarUrl
        connectionStatus
        connectionId
      }
    }
  }
`;