import { gql } from '@apollo/client';

/* =========================
   DISCOVERY & DETAILS
========================= */

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
        entityType: COMMUNITY
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
