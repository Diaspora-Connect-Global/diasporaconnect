import { gql } from '@apollo/client';
import type { Event } from './events';
import type { OpportunityItem, ProductItem, ServiceItem } from '@/hooks/redesign/useFreshListings';

/**
 * Personalised "for you" rails. Each query ranks for the signed-in viewer on
 * the server (the viewer is the JWT, never a variable) and answers with fixed
 * reason codes. Only the fields the listing cards read are selected.
 */

export const RECOMMENDED_EVENTS = gql`
  query RecommendedEvents($limit: Int) {
    recommendedEvents(limit: $limit) {
      reasons
      event {
        id
        title
        status
        startAt
        endAt
        eventCategory
        coverImageUrl
        locationType
        locationDetails {
          type
          venueName
          city
          country
          virtualLink
        }
      }
    }
  }
`;

export const RECOMMENDED_OPPORTUNITIES = gql`
  query RecommendedOpportunities($limit: Int!) {
    recommendedOpportunities(limit: $limit) {
      opportunities {
        id
        title
        type
        category
        location
        deliveryMode
        commitmentType
        compensationMin
        compensationMax
        compensationCurrency
        deadline
        createdAt
        isSavedByCurrentUser
        owner { id name }
        reasons
      }
    }
  }
`;

export const RECOMMENDED_PRODUCTS = gql`
  query RecommendedProducts($limit: Float!) {
    getRecommendedProducts(limit: $limit) {
      products {
        id
        title
        price
        currency
        images
        reasons
      }
    }
  }
`;

export const RECOMMENDED_SERVICES = gql`
  query RecommendedMarketplaceServices($limit: Int) {
    recommendedMarketplaceServices(limit: $limit) {
      services {
        id
        title
        base_price
        currency
        reasons
      }
    }
  }
`;

type WithReasons<T> = T & { reasons?: string[] | null };

export type RecommendedEventsData = { recommendedEvents?: Array<{ reasons?: string[] | null; event?: Event | null } | null> | null };
export type RecommendedOpportunitiesData = { recommendedOpportunities?: { opportunities?: Array<WithReasons<OpportunityItem> | null> | null } | null };
export type RecommendedProductsData = { getRecommendedProducts?: { products?: Array<WithReasons<ProductItem> | null> | null } | null };
export type RecommendedServicesData = { recommendedMarketplaceServices?: { services?: Array<WithReasons<ServiceItem> | null> | null } | null };

/**
 * Every reason code the four recommenders can send (each service and the
 * gateway re-filter to their own subset). Anything else is not rendered.
 */
export const RECOMMENDATION_REASON_CODES = [
  'IN_YOUR_COMMUNITY',
  'NEAR_YOU',
  'MATCHES_INTERESTS',
  'MATCHES_SKILLS',
  'SIMILAR_TO_VIEWED',
  'STARTING_SOON',
  'CLOSING_SOON',
  'ONLINE',
  'REMOTE',
  'TOP_RATED',
  'POPULAR',
  'NEW',
] as const;
export type RecommendationReasonCode = (typeof RECOMMENDATION_REASON_CODES)[number];

const KNOWN = new Set<string>(RECOMMENDATION_REASON_CODES);
export const knownReasons = (codes: readonly string[] | null | undefined): RecommendationReasonCode[] =>
  (codes ?? []).filter((c): c is RecommendationReasonCode => KNOWN.has(c));
