import { gql } from '@apollo/client';

/* =========================
   DISCOVERY & DETAILS
========================= */

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

export const GET_COMMUNITY_DETAILS = gql`
  query GetCommunityDetails($communityId: ID!) {
    getCommunity(id: $communityId) {
      id
      name
      description
      visibility
      joinPolicy
      avatarUrl
    }
  }
`;

/* =========================
   MEMBERSHIP
========================= */

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

/**
 * List communities for a specific user by their userId.
 * Used on another user's profile page to show their communities.
 */
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

export const LEAVE_COMMUNITY = gql`
  mutation LeaveCommunity($communityId: ID!) {
    leaveCommunity(communityId: $communityId) {
      success
      message
    }
  }
`;

/* =========================
   STATS (READ ONLY)
========================= */

export const VIEW_COMMUNITY_STATS = gql`
  query ViewCommunityStats($communityId: ID!) {
    getCommunityStats(communityId: $communityId) {
      memberCount
      pendingRequestCount
      postCount
    }
  }
`;
