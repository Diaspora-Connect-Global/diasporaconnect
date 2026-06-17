# Embassy Community — Backend Contract

The Embassy community UI (frontend) is being built ahead of the backend. Phase 1
ships the embassy **shell** (flag banner header + tab navigation) and a fully
working **Home** tab. Everything embassy-specific is currently rendered from
**mock data** in `src/components/community/embassy/embassyMock.ts`. This document
lists the GraphQL fields the backend needs to add so the frontend can swap the
mock for real data.

## How the frontend detects an embassy

The detail page branches in `src/lib/communityView.ts → resolveCommunityView()`:

- `communityType.name` normalizes to `embassy & consulate` or `embassy`, **or**
- `communityType.isEmbassy === true`

Both are already returned by `getCommunity { communityType { name, isEmbassy } }`,
so **no backend change is required to activate the embassy layout** — only to make
a given community an embassy (set its community type) and to populate the content
below.

> Backend note (from schema exploration): the `communities` table already has a
> `community_type_id` FK, the `community_types` table has an `is_embassy` boolean
> with a seeded `Embassy & Consulate` row, and there is already an
> `embassy_country` column on `communities`. The banner column is
> `cover_image_url` (exposed as `coverImageUrl`); the frontend currently queries
> `bannerUrl`, so confirm the GraphQL mapping.

## Phase 1 — needed to replace the header mock

Add an `embassyProfile` object to `getCommunity` (null for non-embassy communities):

```graphql
type EmbassyProfile {
  country: String!          # display name, e.g. "Ghana"
  countryCode: String!      # ISO-3166 alpha-2, e.g. "GH" (for flag)
  flagUrl: String           # optional explicit flag asset; else derive from countryCode
  isOfficial: Boolean!      # drives the verified badge
  tagline: String           # "Official community of the Embassy of Ghana in France"
  city: String              # "Paris, France"
  addressLine: String       # "1 Avenue Foch, 75116 Paris, France"
  phone: String
  email: String
  mapUrl: String
  officeHours: String       # human-readable, e.g. "Mon – Fri, 9:00 AM – 5:00 PM"
  emergencyLine: String
}

extend type Community {
  embassyProfile: EmbassyProfile
}
```

Frontend swap point: `getEmbassyProfile()` in `embassyMock.ts` → read
`community.embassyProfile`.

## Phase 2+ — per-tab feeds (mock until built)

These back the remaining tabs (currently "coming soon" placeholders). Shapes are
indicative; align names with existing services where possible (events already
exist globally and should be made community-scopeable).

- **Services** (`embassyServices`): `id, title, description, icon, category, detailUrl`
- **Track Requests** (`embassyRequests`, per-user): `id, refNumber, type, status (SUBMITTED|REVIEW|APPROVED|COMPLETED|REJECTED), submittedAt, lastUpdatedAt, note`
- **Events** (`events(communityId)`): reuse the existing events feature, scoped to the community.
- **Verified Services** (`verifiedServices`): vendor directory — reuse marketplace/vendor trust fields (`sellerTrustTier`, rating, reviewCount, verified).
- **Support** (`supportArticles`, `supportCategories`): help-center content + contact/emergency info (overlaps `embassyProfile`).
- **Updates / Community**: already backed by the existing community feed (`GET_FEED` with `type: COMMUNITY`). No new backend work.

## Seeding a community as an embassy (for testing)

Point a community at the seeded embassy type. Verified SQL against
`diaspoplug_communities`:

```sql
UPDATE communities
SET community_type_id = (SELECT id FROM community_types WHERE name = 'Embassy & Consulate'),
    name        = 'Ghana Embassy in France',
    description = 'Official community of the Embassy of Ghana in France',
    avatar_url      = 'https://flagcdn.com/w320/gh.png',
    cover_image_url = 'https://images.unsplash.com/photo-1431274172761-fca41d930114',
    embassy_country = 'GH',
    updated_at = now()
WHERE id = '61ce108b-b247-4907-8403-86a3972c3ea2';
```
