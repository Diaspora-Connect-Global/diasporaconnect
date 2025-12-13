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
  query GetMyConnections($limit: Int, $offset: Int) {
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
  query GetUserConnections($userId: ID!, $limit: Int, $offset: Int) {
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
  query GetPendingConnections($limit: Int) {
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