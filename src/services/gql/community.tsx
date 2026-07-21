import { gql } from '@apollo/client';

/* ============================================================================
   SHARED TYPES (align with Community — User App Integration Guide)
   ============================================================================ */

/**
 * Backend join policy values. 'REQUEST' is the legacy alias for 'APPROVAL'
 * and may still be emitted by the gateway — consumers should normalize via
 * `toJoinPolicy` from `@/types/membership`.
 */
export type CommunityJoinPolicy = 'OPEN' | 'APPROVAL' | 'INVITE_ONLY' | 'PAID' | 'REQUEST';
export type CommunityVisibility = 'PUBLIC' | 'PRIVATE';
export type CommunityPaymentType = 'NONE' | 'ONE_TIME' | 'SUBSCRIPTION';
export type MembershipStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
export type CommunityMemberRole = 'MEMBER' | 'MODERATOR';

export interface CommunitySummary {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
  joinPolicy?: CommunityJoinPolicy;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  visibility?: CommunityVisibility;
  paymentType?: CommunityPaymentType | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  defaultGroupId?: string | null;
  membershipStatus?: MembershipStatus | 'MEMBER' | null;
  /**
   * Enabled member-facing service module keys (e.g. 'posts', 'events').
   * `null`/absent → treat as all enabled (legacy/non-loaded); `[]` → none enabled.
   */
  enabledServices?: string[] | null;
}

export interface CommunityDetail extends CommunitySummary {
  createdAt?: string | null;
}

export interface MyCommunityMembership {
  status: MembershipStatus;
  role: CommunityMemberRole;
  joinedAt?: string | null;
}

export interface CommunityMember {
  userId: string;
  role: string;
  status: string;
  joinedAt?: string | null;
}

/* ============================================================================
   1. DISCOVER — searchCommunities
   ============================================================================ */

export const SEARCH_COMMUNITIES = gql`
  query SearchCommunities($input: SearchCommunitiesInput!) {
    searchCommunities(input: $input) {
      communities {
        id
        name
        description
        memberCount
        joinPolicy
        avatarUrl
        bannerUrl
        visibility
        paymentType
        priceAmount
        priceCurrency
        communityType {
          name
          isEmbassy
        }
      }
      total
    }
  }
`;

/* ============================================================================
   2. VIEW SINGLE — getCommunity (includes defaultGroupId for group feed)
   ============================================================================ */

export const GET_COMMUNITY = gql`
  query GetCommunity($id: ID!) {
    getCommunity(id: $id) {
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
      bannerUrl
      defaultGroupId
      createdAt
      membershipStatus
      enabledServices
      communityType {
        name
        isEmbassy
      }
    }
  }
`;

export const GET_COMMUNITY_DETAILS = gql`
  query GetCommunityDetails($communityId: ID!) {
    getCommunity(id: $communityId) {
      id
      name
      description
      communityRules
      joinPolicy
      visibility
      paymentType
      priceAmount
      priceCurrency
      memberCount
      avatarUrl
      bannerUrl
      defaultGroupId
      createdAt
      membershipStatus
      enabledServices
      contactEmail
      contactPhone
      address
      locationCountry
      communityType {
        name
        isEmbassy
      }
      embassyProfile {
        country
        countryCode
        flagUrl
        isOfficial
        tagline
        city
        addressLine
        phone
        email
        mapUrl
        officeHours
        emergencyLine
      }
    }
  }
`;

/* ============================================================================
   3. JOIN — requestMembership (entityType: "COMMUNITY")
   ============================================================================ */

// NOTE: BE currently returns { status, message, requiresPayment, clientSecret, id } only.
// `provider`, `paymentIntentId`, and `subscriptionId` are filed as a v1.1 BE-TODO
// (see /tmp/payments-coder-notes.md). The selection set requests `id` to give the FE
// a stable membershipId handle returned in the envelope.
export const REQUEST_MEMBERSHIP_COMMUNITY = gql`
  mutation RequestMembershipCommunity($input: RequestMembershipInput!) {
    requestMembership(input: $input) {
      id
      status
      message
      requiresPayment
      clientSecret
    }
  }
`;

export const REQUEST_JOIN_COMMUNITY = gql`
  mutation RequestJoinCommunity($communityId: ID!) {
    requestMembership(
      input: {
        entityId: $communityId
        entityType: "COMMUNITY"
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
   4. CANCEL PENDING REQUEST
   ============================================================================ */

// Cancels a pending join request by withdrawing the membership. There is no
// dedicated cancel mutation for communities (cancelJoinRequest is group-only and
// takes a groupId); leaveCommunity self-removes the caller's membership row —
// which for a PENDING request is exactly a cancel. Input {entityId, entityType}
// already matches LeaveCommunityInput.
export const CANCEL_JOIN_REQUEST_COMMUNITY = gql`
  mutation CancelJoinRequestCommunity($input: LeaveCommunityInput!) {
    leaveCommunity(input: $input) {
      success
      message
    }
  }
`;

/* ============================================================================
   5. LEAVE COMMUNITY (auto-removes from default group)
   ============================================================================ */

export const LEAVE_COMMUNITY = gql`
  mutation LeaveCommunity($communityId: ID!) {
    leaveCommunity(communityId: $communityId) {
      success
      message
    }
  }
`;

/* ============================================================================
   6. ACCEPT / DECLINE INVITATION
   ============================================================================ */

export const ACCEPT_MEMBERSHIP_INVITATION_COMMUNITY = gql`
  mutation AcceptMembershipInvitationCommunity($input: AcceptMembershipInvitationInput!) {
    acceptMembershipInvitation(input: $input) {
      success
      message
    }
  }
`;

export const REJECT_MEMBERSHIP_COMMUNITY = gql`
  mutation RejectMembershipCommunity($input: RejectMembershipInput!) {
    rejectMembership(input: $input) {
      success
      message
    }
  }
`;

/* ============================================================================
   7. CHECK MEMBERSHIP STATUS — getMyMemberships
   ============================================================================ */

export const GET_MY_MEMBERSHIPS_COMMUNITY = gql`
  query GetMyMembershipsCommunity($entityType: String!) {
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
   8. MY COMMUNITIES (with myMembership)
   ============================================================================ */

export const GET_MY_COMMUNITIES = gql`
  query GetMyCommunities($page: Int, $limit: Int) {
    getMyCommunities(page: $page, limit: $limit) {
      communities {
        id
        name
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
   9. COMMUNITY MEMBERS
   ============================================================================ */

export const GET_COMMUNITY_MEMBERS = gql`
  query GetCommunityMembers($communityId: ID!, $limit: Int, $offset: Int) {
    listCommunityMembers(communityId: $communityId, limit: $limit, offset: $offset) {
      members {
        userId
        role
        status
        joinedAt
        displayName
        avatarUrl
      }
      total
    }
  }
`;

/* ============================================================================
   10. REPORT MEMBER
   ============================================================================ */

export const REPORT_MEMBER_COMMUNITY = gql`
  mutation ReportMemberCommunity($input: ReportMemberInput!) {
    reportMember(input: $input) {
      success
      message
    }
  }
`;

/* ============================================================================
   11. OWNER/ADMIN — update community profile + access settings
   ============================================================================ */

// Backend exposes both a coarse updateCommunity (visibility + joinPolicy among
// other profile fields) and a focused updateCommunityJoinPolicy (joinPolicy +
// paymentType + priceAmount + priceCurrency). The frontend uses the focused
// mutation for paid-membership configuration since updateCommunity does not
// carry the payment fields.

export const UPDATE_COMMUNITY = gql`
  mutation UpdateCommunity($id: ID!, $input: UpdateCommunityInput!) {
    updateCommunity(id: $id, input: $input) {
      success
      errors
      community {
        id
        name
        visibility
        joinPolicy
        paymentType
        priceAmount
        priceCurrency
      }
    }
  }
`;

export const UPDATE_COMMUNITY_JOIN_POLICY = gql`
  mutation UpdateCommunityJoinPolicy($input: UpdateCommunityJoinPolicyInput!) {
    updateCommunityJoinPolicy(input: $input) {
      id
      name
      joinPolicy
      paymentType
      priceAmount
      priceCurrency
    }
  }
`;

/* ============================================================================
   LEGACY (keep for backward compatibility)
   ============================================================================ */

export const DISCOVER_COMMUNITIES = gql`
  query DiscoverCommunities(
    $communityTypeId: String
    $country: String
    $includeNearby: Boolean! = false
    $includeRecommended: Boolean! = true
    $includeTrending: Boolean! = false
    $limit: Int = 20
    $offset: Int = 0
    $searchTerm: String
  ) {
    discoverCommunities(
      communityTypeId: $communityTypeId
      country: $country
      includeNearby: $includeNearby
      includeRecommended: $includeRecommended
      includeTrending: $includeTrending
      limit: $limit
      offset: $offset
      searchTerm: $searchTerm
    ) {
      communities {
        id
        name
        description
        visibility
        avatarUrl
        memberCount
        membershipStatus
        communityType {
          name
          isEmbassy
        }
      }
      total
    }
  }
`;

export const LIST_AVAILABLE_COMMUNITIES = gql`
  query ListAvailableCommunities($limit: Int!, $offset: Int!) {
    listCommunities(limit: $limit, offset: $offset) {
      communities {
        id
        name
        description
        visibility
        avatarUrl
        memberCount
        membershipStatus
        communityType {
          name
          isEmbassy
        }
      }
      total
    }
  }
`;

export const CHECK_COMMUNITY_MEMBERSHIP = gql`
  query CheckCommunityMembership($communityId: ID!) {
    checkCommunityMembership(communityId: $communityId) {
      isMember
      role
      status
    }
  }
`;

export const LIST_MY_JOINED_COMMUNITIES = gql`
  query ListMyJoinedCommunities {
    listUserCommunities {
      id
      name
      avatarUrl
      communityType {
        name
        isEmbassy
      }
    }
  }
`;

export const LIST_USER_COMMUNITIES_BY_ID = gql`
  query ListUserCommunitiesById($userId: ID!) {
    listUserCommunities(userId: $userId) {
      id
      name
      avatarUrl
      description
    }
  }
`;

export const VIEW_COMMUNITY_STATS = gql`
  query ViewCommunityStats($communityId: ID!) {
    getCommunityStats(communityId: $communityId) {
      memberCount
      pendingRequestCount
      postCount
    }
  }
`;
