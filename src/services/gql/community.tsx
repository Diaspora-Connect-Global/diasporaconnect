import { gql } from '@apollo/client';

/* ============================================================================
   SHARED TYPES (align with Community — User App Integration Guide)
   ============================================================================ */

export type CommunityJoinPolicy = 'OPEN' | 'REQUEST' | 'INVITE_ONLY';
export type CommunityVisibility = 'PUBLIC' | 'PRIVATE';
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
  defaultGroupId?: string | null;
  membershipStatus?: MembershipStatus | 'MEMBER' | null;
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
      }
      total
      page
      limit
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
      memberCount
      avatarUrl
      bannerUrl
      defaultGroupId
      createdAt
      membershipStatus
    }
  }
`;

export const GET_COMMUNITY_DETAILS = gql`
  query GetCommunityDetails($communityId: ID!) {
    getCommunity(id: $communityId) {
      id
      name
      description
      joinPolicy
      visibility
      memberCount
      avatarUrl
      bannerUrl
      defaultGroupId
      createdAt
      membershipStatus
    }
  }
`;

/* ============================================================================
   3. JOIN — requestMembership (entityType: "COMMUNITY")
   ============================================================================ */

export const REQUEST_MEMBERSHIP_COMMUNITY = gql`
  mutation RequestMembershipCommunity($input: RequestMembershipInput!) {
    requestMembership(input: $input) {
      status
      message
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
      status
      message
    }
  }
`;

/* ============================================================================
   4. CANCEL PENDING REQUEST
   ============================================================================ */

export const CANCEL_JOIN_REQUEST_COMMUNITY = gql`
  mutation CancelJoinRequestCommunity($input: CancelJoinRequestInput!) {
    cancelJoinRequest(input: $input) {
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
  query GetCommunityMembers($communityId: ID!, $page: Int, $limit: Int) {
    getCommunityMembers(communityId: $communityId, page: $page, limit: $limit) {
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
