import { gql } from '@apollo/client';

/* =========================
   DISCOVERY & DETAILS
========================= */

export const LIST_AVAILABLE_ASSOCIATIONS = gql`
  query ListAvailableAssociations($limit: Int!, $offset: Int!) {
    listAssociations(limit: $limit, offset: $offset) {
      associations {
        id
        name
      }
      total
    }
  }
`;

export const GET_ASSOCIATION_DETAILS = gql`
  query GetAssociationDetails($associationId: ID!) {
    getAssociation(id: $associationId) {
      id
      name
    }
  }
`;

/* =========================
   MEMBERSHIP
========================= */

export const REQUEST_JOIN_ASSOCIATION = gql`
  mutation RequestJoinAssociation($associationId: ID!) {
    requestMembership(
      input: {
        entityId: $associationId
        entityType: ASSOCIATION
      }
    ) {
      status
      message
    }
  }
`;
