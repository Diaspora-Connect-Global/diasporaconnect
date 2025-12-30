import { gql } from '@apollo/client';

export const GET_MY_PENDING_REQUESTS = gql`
  query GetMyPendingRequests {
    getMyPendingRequests {
      id
      entityId
      entityType
      entityName
      status
      requestedAt
    }
  }
`;
