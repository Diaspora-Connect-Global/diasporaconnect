import { gql } from '@apollo/client';

/**
 * Documents the Home / Discover redesign adds. The gateway declares `page` and
 * `limit` on the featured marketplace queries as `Float!`, which the older
 * `GET_FEATURED_*` documents (declared `Int`) do not satisfy: they fail
 * validation. These match the real schema.
 */
export const REDESIGN_FEATURED_PRODUCTS = gql`
  query RedesignFeaturedProducts($page: Float!, $limit: Float!) {
    getFeaturedProducts(page: $page, limit: $limit) {
      products {
        id
        title
        price
        currency
        images
      }
    }
  }
`;

export const REDESIGN_FEATURED_SERVICES = gql`
  query RedesignFeaturedServices($page: Float!, $limit: Float!) {
    getFeaturedMarketplaceServices(page: $page, limit: $limit) {
      services {
        id
        title
        base_price
        currency
      }
    }
  }
`;

/** Public groups the viewer can find (an empty query matches every group). */
export const REDESIGN_GROUPS_TO_JOIN = gql`
  query RedesignGroupsToJoin($query: String!, $limit: Int, $offset: Int) {
    searchGroups(query: $query, limit: $limit, offset: $offset) {
      groups {
        id
        name
        description
        privacy
        memberCount
        avatarUrl
      }
    }
  }
`;

/** Ids of the groups the viewer already belongs to (to leave them out of "Groups to join"). */
export const REDESIGN_MY_GROUP_IDS = gql`
  query RedesignMyGroupIds($limit: Int, $offset: Int) {
    getMyGroups(limit: $limit, offset: $offset) {
      groups {
        id
      }
    }
  }
`;
