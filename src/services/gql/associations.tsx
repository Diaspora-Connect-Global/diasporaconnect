import { gql } from '@apollo/client';

/* ============================================================================
   SHARED TYPES (align with Association Management — User App Integration Guide)
   ============================================================================ */

/**
 * Backend join policy values. 'REQUEST' is the legacy alias for 'APPROVAL'
 * and may still be emitted by the gateway — consumers should normalize via
 * `toJoinPolicy` from `@/types/membership`.
 */
export type AssociationJoinPolicy = 'OPEN' | 'APPROVAL' | 'INVITE_ONLY' | 'PAID' | 'REQUEST';
export type AssociationVisibility = 'PUBLIC' | 'PRIVATE';
export type AssociationPaymentType = 'NONE' | 'ONE_TIME' | 'SUBSCRIPTION';
export type MembershipStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
export type MembershipRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';

export interface AssociationSummary {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
  joinPolicy?: AssociationJoinPolicy;
  avatarUrl?: string | null;
  visibility?: AssociationVisibility;
  paymentType?: AssociationPaymentType | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  defaultGroupId?: string | null;
  associationType?: { id: string; name: string } | null;
  /** Current user's membership status when available (ACTIVE | PENDING | SUSPENDED). Backend may also return "MEMBER" for ACTIVE. */
  membershipStatus?: MembershipStatus | 'MEMBER' | null;
}

export interface AssociationDetail extends AssociationSummary {
  createdAt?: string | null;
}

export interface AssociationTypeItem {
  id: string;
  name: string;
}

export interface MyMembership {
  entityId: string;
  status: MembershipStatus;
  role: MembershipRole;
  joinedAt?: string | null;
}

export interface AssociationMember {
  userId: string;
  role: string;
  status: string;
  joinedAt?: string | null;
}

/* ============================================================================
   1. DISCOVER — searchAssociations
   ============================================================================ */

export const SEARCH_ASSOCIATIONS = gql`
  query SearchAssociations($input: SearchAssociationsInput!) {
    searchAssociations(input: $input) {
      associations {
        id
        name
        description
        memberCount
        joinPolicy
        avatarUrl
        visibility
        paymentType
        priceAmount
        priceCurrency
        defaultGroupId
        associationType {
          id
          name
        }
      }
      total
      page
      limit
    }
  }
`;

/* ============================================================================
   2. VIEW SINGLE — getAssociation (includes defaultGroupId for group feed)
   ============================================================================ */

export const GET_ASSOCIATION = gql`
  query GetAssociation($id: ID!) {
    getAssociation(id: $id) {
      id
      name
      description
      joinPolicy
      visibility
      paymentType
      priceAmount
      priceCurrency
      memberCount
      avatarUrl
      defaultGroupId
      createdAt
      membershipStatus
      associationType {
        id
        name
      }
    }
  }
`;

/** @deprecated Use GET_ASSOCIATION with variable name `id`. Kept for backward compat. */
export const GET_ASSOCIATION_DETAILS = gql`
  query GetAssociationDetails($associationId: ID!) {
    getAssociation(id: $associationId) {
      id
      name
      description
      joinPolicy
      visibility
      paymentType
      priceAmount
      priceCurrency
      memberCount
      avatarUrl
      defaultGroupId
      createdAt
      membershipStatus
      associationType {
        id
        name
      }
    }
  }
`;

/* ============================================================================
   3. LIST ASSOCIATION TYPES (for filter UI)
   ============================================================================ */

export const LIST_ASSOCIATION_TYPES = gql`
  query ListAssociationTypes {
    listAssociationTypes {
      id
      name
    }
  }
`;

/* ============================================================================
   4. JOIN — requestMembership (OPEN → ACTIVE, REQUEST → PENDING, INVITE_ONLY → error)
   ============================================================================ */

// NOTE: BE RequestMembership is entity-generic and returns
// { status, message, requiresPayment, clientSecret, id } per the parity audit
// (/tmp/backend-association-parity.md). `provider`, `paymentIntentId`, and
// `subscriptionId` are a v1.1 BE-TODO.
// `REQUEST_MEMBERSHIP_ASSOCIATION` is exported as a symmetric alias to mirror
// the community export name.
export const REQUEST_MEMBERSHIP = gql`
  mutation RequestMembership($input: RequestMembershipInput!) {
    requestMembership(input: $input) {
      id
      status
      message
      requiresPayment
      clientSecret
    }
  }
`;

export const REQUEST_MEMBERSHIP_ASSOCIATION = REQUEST_MEMBERSHIP;

/** @deprecated Use REQUEST_MEMBERSHIP with input { entityId, entityType: "ASSOCIATION" }. */
export const REQUEST_JOIN_ASSOCIATION = gql`
  mutation RequestJoinAssociation($associationId: ID!) {
    requestMembership(
      input: {
        entityId: $associationId
        entityType: "ASSOCIATION"
      }
    ) {
      id
      status
      message
      requiresPayment
      clientSecret
    }
  }
`;

/* ============================================================================
   5. CANCEL PENDING REQUEST
   ============================================================================ */

export const CANCEL_JOIN_REQUEST = gql`
  mutation CancelJoinRequest($input: CancelJoinRequestInput!) {
    cancelJoinRequest(input: $input) {
      success
      message
    }
  }
`;

/* ============================================================================
   6. LEAVE ASSOCIATION (auto-removes from default group)
   ============================================================================ */

export const LEAVE_ASSOCIATION = gql`
  mutation LeaveAssociation($associationId: ID!) {
    leaveAssociation(associationId: $associationId) {
      success
      message
    }
  }
`;

/* ============================================================================
   7. ACCEPT / DECLINE INVITATION
   ============================================================================ */

export const ACCEPT_MEMBERSHIP_INVITATION = gql`
  mutation AcceptMembershipInvitation($input: AcceptMembershipInvitationInput!) {
    acceptMembershipInvitation(input: $input) {
      success
      message
    }
  }
`;

export const REJECT_MEMBERSHIP = gql`
  mutation RejectMembership($input: RejectMembershipInput!) {
    rejectMembership(input: $input) {
      success
      message
    }
  }
`;

/* ============================================================================
   8. CHECK MEMBERSHIP STATUS — getMyMemberships
   ============================================================================ */

export const GET_MY_MEMBERSHIPS = gql`
  query GetMyMemberships($entityType: String!) {
    getMyMemberships(entityType: $entityType) {
      memberships {
        entityId
        status
        role
        joinedAt
      }
    }
  }
`;

/* ============================================================================
   9. ASSOCIATION MEMBERS
   ============================================================================ */

export const GET_ASSOCIATION_MEMBERS = gql`
  query GetAssociationMembers($associationId: ID!, $page: Int, $limit: Int) {
    getAssociationMembers(associationId: $associationId, page: $page, limit: $limit) {
      members {
        userId
        role
        status
        joinedAt
      }
      total
    }
  }
`;

/* ============================================================================
   10. MY ASSOCIATIONS (with myMembership)
   ============================================================================ */

export const GET_MY_ASSOCIATIONS = gql`
  query GetMyAssociations($page: Int, $limit: Int) {
    getMyAssociations(page: $page, limit: $limit) {
      associations {
        id
        name
        description
        avatarUrl
        memberCount
        defaultGroupId
        myMembership {
          status
          role
          joinedAt
        }
      }
      total
    }
  }
`;

/* ============================================================================
   11. REPORT MEMBER
   ============================================================================ */

export const REPORT_MEMBER = gql`
  mutation ReportMember($input: ReportMemberInput!) {
    reportMember(input: $input) {
      success
      message
    }
  }
`;

/* ============================================================================
   12. OWNER/ADMIN — update association profile + access settings
   ============================================================================ */

// NOTE: Association does not currently expose a dedicated
// updateAssociationJoinPolicy mutation parallel to community's. The
// `updateAssociation` mutation accepts visibility + joinPolicy, but the
// paymentType / priceAmount / priceCurrency knobs for paid-membership
// configuration are a BE-TODO on the association side. Until that mutation
// lands, the owner form will only persist visibility + joinPolicy on
// associations and surface a notice that pricing edits are coming.

export const UPDATE_ASSOCIATION = gql`
  mutation UpdateAssociation($input: UpdateAssociationInput!) {
    updateAssociation(input: $input) {
      id
      name
      visibility
      joinPolicy
      paymentType
      priceAmount
      priceCurrency
    }
  }
`;

/* ============================================================================
   LEGACY (keep for backward compatibility until consumers migrate)
   ============================================================================ */

export const LIST_AVAILABLE_ASSOCIATIONS = gql`
  query ListAvailableAssociations($limit: Int!, $offset: Int!) {
    listAssociations(limit: $limit, offset: $offset) {
      associations {
        id
        name
        description
        avatarUrl
        memberCount
        membershipStatus
        associationType {
          id
          name
        }
      }
      total
    }
  }
`;

export const GET_USER_ASSOCIATIONS = gql`
  query GetUserAssociations($userId: ID!) {
    getUserAssociations(userId: $userId) {
      id
      name
      avatarUrl
      memberCount
      defaultGroupId
    }
  }
`;
