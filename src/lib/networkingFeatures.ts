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

export interface NetworkingFeatureFlags {
  interests: boolean;
  circles: boolean;
}

export const NETWORKING_FEATURES: NetworkingFeatureFlags = {
  interests: INTERESTS_UI_ENABLED,
  circles: CIRCLES_UI_ENABLED,
};
