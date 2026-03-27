# Events API: Backend Team Instructions

This document is the single reference for the backend team to implement or align the Events GraphQL API so the frontend Events section works end-to-end. It summarizes what the frontend has already implemented, what is still mock, and the exact schema and behavior the backend must provide.

**Source of truth for queries, mutations, and TypeScript types:** [`src/services/gql/events.ts`](../src/services/gql/events.ts). Use that file to mirror operation names and field shapes in your schema.

---

## 1. Current frontend behavior (what is done vs mock)

### 1.1 In use today (backend must support)

| Area | Behavior |
|------|----------|
| **Events list page** | Fetches `GetEvents(limit: 20, offset: 0)` and `GetUserEvents`. Renders tabs **Attending** and **Saved**, and sections **Paid Events** and **More Events** (free). Attend and Save call `registerForEvent` and `saveEvent`; refetches `GetUserEvents` after success. |
| **Event detail page** | Loads single event with `GetEvent(id)`. Free events: "Attend" calls `registerForEvent({ eventId })`. Paid events: "Attend" opens payment modal only (see below). Save calls `saveEvent(eventId)`. |
| **Queries** | `GetEvent(id)`, `GetEvents(limit, offset)`, `GetUserEvents` (returns `{ attending, saved }`). |
| **Mutations** | `registerForEvent(input)`, `saveEvent(eventId)`. |

### 1.2 Defined but not used in the app yet

- **createEvent(input)** – No "create event" UI yet. Input shape is in `events.ts`; backend can implement for future use.
- **checkIn(input)** – No check-in UI yet. Input: `eventId`, `registrationId`, `checkInMethod`; return: `id`, `checkedInAt`, `checkInMethod`.

### 1.3 Mock only (not backend-integrated)

- **Paid events flow** (modal with Step1 → Step2 → Step3): Hardcoded event title, date, and price. Step2 collects billing and payment method (card / mobile). `processPayment` is a mock (no `registerForEvent`, no Stripe/MoMo). Backend must support paid registration and `paymentIntentClientSecret` so the frontend can wire this flow later.

---

## 2. Schema and types (align with frontend)

### 2.1 Event type (minimal for list/detail)

| Field | Type | Notes |
|-------|------|--------|
| `id` | `ID!` | |
| `title` | `String!` | |
| `description` | `String!` | |
| `status` | Enum | At least `draft`, `published`, `cancelled`, `completed` |
| `startAt` | `DateTime!` | ISO 8601 |
| `endAt` | `DateTime!` | ISO 8601 |
| `eventCategory` | `String!` | |
| `locationType` | Enum | `physical`, `virtual`, `hybrid` |
| `locationDetails` | Object (nullable) | See below |
| `isPaid` | `Boolean!` | |
| `registrationCount` | `Int!` | |
| `availableSpots` | `Int` | Optional; for capacity |
| `isRegistered` | `Boolean!` | Current user has a registration for this event |
| `canRegister` | `Boolean!` | Current user is allowed to register (not past deadline, not full, not already registered) |
| `tickets` | `[Ticket!]` | When `isPaid`; optional for free events |

**locationDetails:**

- `physical`: `{ venue, address?, city, country }` (all optional as needed)
- `virtual`: `{ platform, joinUrl? }`

**Ticket type (when isPaid):**

- `id: ID!`
- `name: String!`
- `priceInCents: Int!`

### 2.2 Queries

| Query | Arguments | Return | Notes |
|-------|-----------|--------|--------|
| `getEvent(id: ID!)` | `id` | `Event` (nullable) | Single event; return `null` if not found or not allowed. |
| `events(limit: Int, offset: Int)` | `limit`, `offset` | `[Event!]!` | Paginated list. Frontend currently sends `limit: 20, offset: 0` only; no filters. Return only **published** events (or product rule). |
| `userEvents` | — | `UserEvents!` | `UserEvents = { attending: [Event!]!, saved: [Event!]! }` for the current user. |

### 2.3 Mutations

| Mutation | Input | Return | Notes |
|----------|--------|--------|--------|
| `registerForEvent(input: RegisterForEventInput!)` | `eventId: ID!`, `ticketId: ID` (optional for free; required when event is paid) | `{ registrationId: ID!, paymentIntentClientSecret: String }` | For paid events, return `paymentIntentClientSecret` (e.g. Stripe) so frontend can complete payment on client. |
| `saveEvent(eventId: ID!)` | `eventId: ID!` | `{ id: ID!, savedAt: DateTime! }` | |
| `createEvent(input: CreateEventInput!)` | See `CreateEventInput` in `events.ts` | `ID!` (new event id) | Not used by frontend yet; implement for future use. |
| `checkIn(input: CheckInInput!)` | `eventId: ID!`, `registrationId: ID!`, `checkInMethod: String!` | `{ id, checkedInAt, checkInMethod }` | Not used by frontend yet; implement for future use. |

**CreateEventInput** (from frontend): `ownerType`, `ownerId`, `title`, `description`, `eventCategory`, `locationType`, `locationDetails`, `startAt`, `endAt`, `isPaid`.

---

## 3. Auth and context

- All operations above (except possibly a public `events` list) should run in an **authenticated** context.
- `getEvent(id)`, `userEvents`, `registerForEvent`, `saveEvent` must use the **current user** to compute `isRegistered`, `canRegister`, and to resolve attending/saved lists.

---

## 4. Pagination and listing

- `events(limit, offset)` should return only **published** events (or whatever the product rule is). Frontend does not send filters yet.
- Define a default sort (e.g. `startAt` ascending) and document it; frontend does not pass sort.

---

## 5. Paid events and payments

- For **paid events**, `registerForEvent` must accept `ticketId` and return `paymentIntentClientSecret` (or equivalent) so the frontend can later:
  - Call `registerForEvent` with `eventId` + `ticketId` (and optionally quantity if you add it).
  - Use the returned client secret to complete Stripe (or other) payment on the client.
- Backend should create the registration and link it to the payment; after successful payment confirmation, mark registration as confirmed.

---

## 6. Error handling

Return clear GraphQL errors (or codes) for:

- Event not found
- Not allowed to register
- Event full
- Past deadline
- Invalid `ticketId`
- Payment required for paid events (e.g. missing `ticketId`)

Frontend shows generic toasts today but can be improved once errors are stable.

---

## 7. Optional future alignment

- **Create event:** When a "create event" flow is added, the frontend will use `createEvent` with the existing `CreateEventInput` shape.
- **Check-in:** When check-in UI is added, the frontend will call `checkIn` with `eventId`, `registrationId`, and `checkInMethod`.
- **Event images:** Frontend currently uses a placeholder (`/EVENT.png`). If you add an `imageUrl` or `coverImage` field to `Event`, the frontend can be updated to use it.

---

## 8. Summary checklist for backend

- [ ] **Queries:** Implement `getEvent(id)`, `events(limit, offset)`, `userEvents` with field shapes and auth as above.
- [ ] **Mutations:** Implement `registerForEvent` (with `eventId`, optional `ticketId`; return `registrationId` and `paymentIntentClientSecret` for paid) and `saveEvent(eventId)`.
- [ ] **Auth:** Use current user for `isRegistered`, `canRegister`, and for `userEvents.attending` / `userEvents.saved`.
- [ ] **Listing:** `events` returns published-only (or product rule); document default sort.
- [ ] **Paid events:** Support `ticketId` and `paymentIntentClientSecret` in `registerForEvent` so the frontend can wire PaidEventsModal to the backend and Stripe.
- [ ] **Errors:** Return clear errors for not found, not allowed, full, past deadline, invalid ticket, payment required.
- [ ] **(Optional)** Implement `createEvent` and `checkIn` for future use; no frontend changes required for them to be available.

---

## 9. Reference: frontend source of truth

- **Queries, mutations, and TypeScript types:** [`src/services/gql/events.ts`](../src/services/gql/events.ts)
- **Events list page:** `src/app/[locale]/(protected)/(main)/(home)/events/page.tsx`
- **Event detail page:** `src/app/[locale]/(protected)/(main)/(home)/events/[id]/page.tsx`
- **Paid events modal (mock):** `src/components/events/modals/paidEventsModal.tsx`
