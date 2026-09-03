import { gql } from '@apollo/client';

/** Entity kinds a membership request can target. */
export type PendingRequestEntityType = 'COMMUNITY' | 'ASSOCIATION';

export interface MyPendingRequest {
  id: string;
  entityId: string;
  entityType: PendingRequestEntityType | string;
  entityName: string;
  status: string;
  requestedAt?: string | null;
}

export interface MyPendingRequestsData {
  getMyPendingRequests: MyPendingRequest[];
}

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
