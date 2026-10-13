/**
 * Release switches for the parts of event networking whose backend is not
 * built yet. While a flag is `false` the matching tabs, buttons and routes are
 * hidden and the queries behind them NEVER run: production must not show
 * fixture data or call an operation the gateway does not have.
 *
 * Flip a flag only after its gateway operations are deployed (see
 * `services/gql/networking.ts`, the PENDING section). The dev-harness pages
 * (`/dev-harness/networking/*`) render every screen with fixtures regardless of
 * these flags, so the designs can be reviewed before the backend exists.
 */

/** Interested / Interested in you / My matches / My interests (gateway: `eventNetworkingExpressInterest` …). */
export const INTERESTS_UI_ENABLED = true;

/** Networking Circles discovery and rooms (gateway: `networkingCircles` …). */
export const CIRCLES_UI_ENABLED = false;

/**
 * Meetings: request sheet, meeting detail, the Meetings tab, My schedule
 * (`/events/[id]/schedule`) and the organiser meeting settings (gateway:
 * `eventNetworkingRequestMeeting` … M5, NOT deployed). While false no meeting
 * operation is ever sent and every meeting entry point is absent.
 */
export const MEETINGS_UI_ENABLED = false;

/**
 * Organiser networking analytics (M8): the Analytics tab on the event manage page
 * (gateway: `eventNetworkingAnalytics`, NOT built). Contract:
 * `docs/event-networking/m8-contract.graphql`. While false the tab is absent and no
 * analytics operation is ever sent.
 */
export const ANALYTICS_UI_ENABLED = false;

export interface NetworkingFeatureFlags {
  interests: boolean;
  circles: boolean;
  meetings: boolean;
  analytics: boolean;
}

export const NETWORKING_FEATURES: NetworkingFeatureFlags = {
  interests: INTERESTS_UI_ENABLED,
  circles: CIRCLES_UI_ENABLED,
  meetings: MEETINGS_UI_ENABLED,
  analytics: ANALYTICS_UI_ENABLED,
};
