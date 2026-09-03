# Membership E2E Verification Matrix — Communities & Associations

**Rollout:** Public/Private/Paid/Free for Communities & Associations
**Plan:** `/Users/natty/.claude/plans/have-you-considered-communities-transient-clock.md`
**Contracts:** `/tmp/membership-contracts.md`
**FE-lead notes:** `/tmp/frontend-lead-notes.md`
**Payments notes:** `/tmp/payments-coder-notes.md`
**QA owner:** _(fill in)_
**Build under test:** _(commit SHA)_

---

## 0. Testing-framework status

No unit/render testing framework is configured in `package.json` at the time of writing (no `vitest`, `jest`, or `@testing-library/*` dependencies, and no `vitest.config.*` / `jest.config.*` files at the repo root). Per the QA brief constraint "do not install one", Deliverables A and B (unit tests for `AccessBadges` and `AccessSettingsForm`) are **skipped**. All verification below is manual E2E.

Recommendation for a follow-up: add `vitest` + `@testing-library/react` + `jsdom` (dev-only) so the truth-table render tests in Deliverable A and the validation tests in Deliverable B can land. Until then, the `AccessBadges` truth table is verified manually via the visual smoke section.

---

## 1. Core verification matrix (from plan §Verification)

| # | Entity | Visibility | Payment | Billing | Provider | Precondition | Steps | Expected | Actual | Pass |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Community | PUBLIC | FREE | — | — | Seed community `c_pub_free` with `visibility=PUBLIC, joinPolicy=OPEN, paymentType=NONE`. Logged-in non-member user. | Visit `/community/c_pub_free` → click Join | Direct join, no modal opens. Card status flips to "Member". Badges show "Public" + "Free". | | ☐ |
| 2 | Community | PRIVATE | FREE | — | — | Seed `c_priv_free` with `visibility=PRIVATE, joinPolicy=APPROVAL, paymentType=NONE`. Non-member user. | Visit detail page → click Request to Join | Modal opens, calls `REQUEST_MEMBERSHIP_COMMUNITY`, response `status='PENDING', requiresPayment=false`. Step 3 shows pending-approval copy. Badge: "Private" + "Free". | | ☐ |
| 3 | Community | PUBLIC | PAID | ONE_TIME | Stripe | Seed `c_pub_pot` with `joinPolicy=PAID, paymentType=ONE_TIME, priceAmount=1000, priceCurrency=USD`. | Click Join → modal Step 1 shows price → Continue → envelope returns `clientSecret`, no `subscriptionId` → Step 2 method=Card → enter test card `4242…` → confirm | Stripe `confirmPayment` succeeds → `CONFIRM_PAYMENT_INTENT` fires with `provider='STRIPE'` → Step 3 success. Membership status ACTIVE on refresh. | | ☐ |
| 4 | Community | PUBLIC | PAID | SUBSCRIPTION (monthly) | Stripe | Seed `c_pub_sub` with `paymentType=SUBSCRIPTION, priceAmount=500, priceCurrency=USD, subscriptionPeriods=['monthly','yearly']`. | Open modal → Step 1 shows period radios (monthly/yearly) + recurring disclosure copy → pick monthly → Continue → Stripe Elements card flow | Subscription created. Envelope returns `subscriptionId` once BE lands (v1: parsed from clientSecret). Recurring renewal scheduled BE-side. Step 3 success. | | ☐ |
| 5 | Community | PUBLIC | PAID | ONE_TIME | Paystack | Seed `c_pub_paystack` with `priceAmount=2500, priceCurrency=GHS`. User must have email in profile. | Open modal → Continue → Step 2 → switch to "Mobile Money" → click Pay | `openPaystackMobileMoney` popup opens → enter MTN test number → success → `CONFIRM_PAYMENT_INTENT` with `provider='PAYSTACK'`, `payment_method_id=<reference>` → Step 3 success → ACTIVE. | | ☐ |
| 6 | Association | PUBLIC | PAID | SUBSCRIPTION (yearly) | Stripe | Seed association `a_pub_yearly_sub` with paid yearly plan (BE-TODO: until persistable, monkey-patch via direct gateway call). | Visit `/association/a_pub_yearly_sub` → open modal → Step 1 → pick yearly → Continue → Stripe card flow | Same as #4 but yearly cadence. Recurring disclosure says "every yearly". | | ☐ |
| 7 | Association | PRIVATE | PAID | ONE_TIME | Paystack | Seed `a_priv_pot`. | Click Request → REQUEST_MEMBERSHIP fires → modal opens | **Open question:** does APPROVAL gate run before payment, or payment then approval? Confirm BE rule. Document outcome in Actual. | | ☐ |

---

## 2. Filter chips — community discovery page

Page: `/community` (search/discover). Chips: `visibility` ∈ {ALL, PUBLIC, PRIVATE} × `pricing` ∈ {ALL, FREE, PAID} = 9 combos.

| # | Visibility chip | Pricing chip | Precondition | Expected | Actual | Pass |
|---|---|---|---|---|---|---|
| C1 | ALL | ALL | At least one of each variant seeded | All seeded communities visible | | ☐ |
| C2 | PUBLIC | ALL | seed mix | Only `visibility==='PUBLIC'` rows | | ☐ |
| C3 | PRIVATE | ALL | seed mix | Only `visibility==='PRIVATE'` rows | | ☐ |
| C4 | ALL | FREE | seed mix | Only `paymentType==='NONE'` rows (or rows where field is undefined per FE-lead note: default to NONE) | | ☐ |
| C5 | ALL | PAID | seed mix | Only `paymentType ∈ {ONE_TIME, SUBSCRIPTION}` rows | | ☐ |
| C6 | PUBLIC | FREE | seed mix | PUBLIC ∩ NONE | | ☐ |
| C7 | PUBLIC | PAID | seed mix | PUBLIC ∩ paid | | ☐ |
| C8 | PRIVATE | FREE | seed mix | PRIVATE ∩ NONE | | ☐ |
| C9 | PRIVATE | PAID | seed mix | PRIVATE ∩ paid | | ☐ |

**URL round-trip:** for each non-default chip, verify `?visibility=…&pricing=…&search=…` appears in URL. Then click browser Back → previous state restored. Forward → state restored again. Hard-refresh on a deep URL → chips reflect URL state on mount.

---

## 3. Filter chips — association discovery page

Same 9 combos as above, on `/association` page.

| # | Visibility chip | Pricing chip | Expected | Actual | Pass |
|---|---|---|---|---|---|
| A1 | ALL | ALL | All visible | | ☐ |
| A2 | PUBLIC | ALL | only PUBLIC | | ☐ |
| A3 | PRIVATE | ALL | only PRIVATE | | ☐ |
| A4 | ALL | FREE | only FREE | | ☐ |
| A5 | ALL | PAID | only PAID | | ☐ |
| A6 | PUBLIC | FREE | intersection | | ☐ |
| A7 | PUBLIC | PAID | intersection | | ☐ |
| A8 | PRIVATE | FREE | intersection | | ☐ |
| A9 | PRIVATE | PAID | intersection | | ☐ |

**URL round-trip:** same procedure as §2.

**Known v1 limitation (from contracts §5.2):** filtering is client-side only — pagination boundaries may hide matches that exist on later pages. QA: confirm seed set fits in one page (default limit 20) before judging "missing" rows.

---

## 4. AccessBadges visual smoke — every card variant

Render check that `AccessBadges` displays correctly across all 8 card files per contracts §2.

### Community (5 variants)

| # | Card file | Seed entity access | Expected badges | Actual | Pass |
|---|---|---|---|---|---|
| B1 | `JoinCommunityCard.tsx` | PUBLIC × NONE | "Public" + "Free" | | ☐ |
| B2 | `MyCommunityCard.tsx` | PRIVATE × ONE_TIME, price 10 USD | "Private" + "Paid · $10.00" | | ☐ |
| B3 | `MyCommunityCard2.tsx` | PUBLIC × SUBSCRIPTION, 5 USD monthly only | "Public" + "Paid · $5.00/monthly" (see FE-lead note: badges only render when caller enriches the dropdown entity) | | ☐ |
| B4 | `cards/community/AboutCommunity.tsx` (size=detail) | PRIVATE × SUBSCRIPTION, 5 USD with both periods | "Private" + "Paid · from $5.00" + tooltip lists monthly+yearly. Larger pill size. | | ☐ |
| B5 | `cards/community/CommunityCardVariant2.tsx` | PUBLIC × ONE_TIME, 10 GHS | "Public" + "Paid · GH₵10.00" (or `GHS 10.00` if Intl falls back) | | ☐ |

### Association (3 variants)

| # | Card file | Seed entity access | Expected badges | Actual | Pass |
|---|---|---|---|---|---|
| B6 | `JoinAssociationCard.tsx` | PUBLIC × NONE | "Public" + "Free" | | ☐ |
| B7 | `MyAssociationCard.tsx` | PRIVATE × NONE | "Private" + "Free" | | ☐ |
| B8 | `cards/association/AboutAssociation.tsx` (size=detail) | PUBLIC × SUBSCRIPTION yearly | "Public" + "Paid · {price}/yearly" larger pill | | ☐ |

### AccessBadges truth-table (manual surrogate for the missing render test)

Until a testing framework is added, this table is the manual surrogate for Deliverable A. Use Storybook or a scratch page that renders each access shape once.

| # | visibility | paymentType | price | periods | Expected badge 1 | Expected badge 2 | Pass |
|---|---|---|---|---|---|---|---|
| T1 | PUBLIC | NONE | — | — | "Public" | "Free" | ☐ |
| T2 | PUBLIC | ONE_TIME | 10 USD | — | "Public" | "Paid · $10.00" | ☐ |
| T3 | PUBLIC | SUBSCRIPTION | 5 USD | `['monthly']` | "Public" | "Paid · $5.00/monthly" | ☐ |
| T4 | PRIVATE | NONE | — | — | "Private" | "Free" | ☐ |
| T5 | PRIVATE | ONE_TIME | 10 USD | — | "Private" | "Paid · $10.00" | ☐ |
| T6 | PRIVATE | SUBSCRIPTION | 5 USD | `['monthly']` | "Private" | "Paid · $5.00/monthly" | ☐ |
| T7 | PUBLIC | NONE | **stray price `10 USD`** | — | "Public" | "Free" (price MUST NOT render — see code: `isPaid` gate at AccessBadges.tsx line 61) | ☐ |
| T8 | PUBLIC | ONE_TIME | **undefined** | — | "Public" | "Paid" (no NaN, no "undefined" — code falls through `!access.price` branch line 74) | ☐ |
| T9 | PUBLIC | SUBSCRIPTION | 5 USD | `['monthly','yearly']` | "Public" | "Paid · from $5.00" with tooltip listing both | ☐ |

**Accessibility check (all rows):** outer wrapper has `role="group"` with `aria-label` from `accessBadges.groupLabel`. Each `<Badge>` has its own `aria-label` (verify via DevTools accessibility tree). Icons (if any) have `aria-hidden="true"`.

---

## 5. AccessSettingsForm — owner config

Open the community detail page in owner mode (`?settings=1` per FE-lead note) on a community you own.

### 5a. Happy-path submit
| # | Step | Expected | Actual | Pass |
|---|---|---|---|---|
| S1 | Set `visibility=PRIVATE, joinPolicy=PAID, paymentType=SUBSCRIPTION, priceAmount=10, currency=GHS` and submit | Two mutations fire in order: `UPDATE_COMMUNITY` then `UPDATE_COMMUNITY_JOIN_POLICY` with `priceAmount=1000` (cents) and `priceCurrency='GHS'`. Toast "Saved". Badges on the card reflect the new state. | | ☐ |
| S2 | Reload page after S1 | Form initial values match what was just saved. `priceAmount` shows `10.00` (not `1000`). | | ☐ |

### 5b. Validation (manual surrogate for Deliverable B)

Until tests land, manually exercise these:

| # | Condition | Expected | Pass |
|---|---|---|---|
| V1 | `joinPolicy=PAID, paymentType=NONE` and submit | Validation error toast `community.settings.validation.paidRequiresPaymentType`. No mutation fires. (NOTE: also gated by UI auto-flipping `paymentType` to `ONE_TIME` on `PAID` selection — see code line 207. To force this state, change radios in dev tools.) | ☐ |
| V2 | `paymentType=ONE_TIME, priceAmount=''` | HTML5 `required` blocks submit. | ☐ |
| V3 | `paymentType=ONE_TIME, priceAmount='0'` | Validation toast `priceMustBePositive`. | ☐ |
| V4 | `paymentType=ONE_TIME, priceAmount='-5'` | Same as V3. | ☐ |
| V5 | `paymentType=ONE_TIME, priceAmount='abc'` | `Number('abc')→NaN`, `Number.isFinite(NaN)===false`, so `priceMustBePositive` triggers. | ☐ |
| V6 | Switching `joinPolicy` away from `PAID` after a paid plan was set | UI hides paymentType+price fields, internally resets `paymentType='NONE'` (see line 205) — verify next submit does NOT include stale price. | ☐ |

### 5c. Association mode
| # | Step | Expected | Actual | Pass |
|---|---|---|---|---|
| S3 | Open `AccessSettingsForm` with `kind='association'`, set `joinPolicy=PAID, paymentType=SUBSCRIPTION` | Form renders the "pricing coming soon" notice (line 288–291). Submit fires `UPDATE_ASSOCIATION` with `visibility, joinPolicy` only — **no** `paymentType`/`price`. | | ☐ |
| S4 | Try to set a price anyway | Price field still renders, but value is NOT sent. Confirm via network tab. | | ☐ |

---

## 6. Paid join flows — end-to-end provider checks

### 6a. Stripe ONE_TIME (community, public)
Pre: §1 row 3 seed. Steps: §1 row 3. Detailed asserts:

| # | Check | Pass |
|---|---|---|
| P1 | `REQUEST_MEMBERSHIP_COMMUNITY` mutation request payload includes `entityId, entityType: 'community'`. No `period` field (one-time). | ☐ |
| P2 | Response envelope: `requiresPayment=true`, `clientSecret` matches `pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+`. | ☐ |
| P3 | Modal Step 2 renders `<PaymentElement />` inside `<Elements>` with `options.clientSecret`. | ☐ |
| P4 | After `stripe.confirmPayment` returns `paymentIntent.status='succeeded'`, `CONFIRM_PAYMENT_INTENT` is called with `{ payment_intent_id, payment_method_id: <same id>, provider: 'STRIPE' }` (see payments-coder note: `payment_method_id` is repurposed). | ☐ |
| P5 | Step 3 success copy + "Go to community" CTA → `/community/{id}`. | ☐ |
| P6 | Refresh page → membership status ACTIVE. | ☐ |

### 6b. Paystack mobile money (community, public, one-time, GHS)
Pre: §1 row 5 seed. User has `email` populated in profile (modal blocks otherwise via `disabled={!userEmail}`).

| # | Check | Pass |
|---|---|---|
| P7 | Modal Step 2 → click "Mobile Money" radio → Pay button | ☐ |
| P8 | `openPaystackMobileMoney` is called with `{ email, amountInPesewas=priceAmountInCents, currency: 'GHS' }`. | ☐ |
| P9 | Paystack popup opens → enter MTN test number (Paystack docs) → success returns `{ reference }`. | ☐ |
| P10 | `CONFIRM_PAYMENT_INTENT` called with `provider='PAYSTACK'`, `payment_intent_id=<parsed from clientSecret>`, `payment_method_id=<reference>`. | ☐ |
| P11 | Paystack cancel button → `onCancel` rejects with "Payment cancelled." → toast.info shows, modal returns to Step 1 (not closed). | ☐ |
| P12 | Retrying after cancel → BE returns same `membershipId` (idempotent), no duplicate `PaymentIntent`. | ☐ |

### 6c. Association SUBSCRIPTION yearly (Stripe)
Pre: §1 row 6 seed.

| # | Check | Pass |
|---|---|---|
| P13 | Step 1 shows period radios with BOTH `monthly` and `yearly` (modal defaults to `['monthly','yearly']` when BE returns no `subscriptionPeriods` — see modal line 89). | ☐ |
| P14 | Recurring-charge disclosure copy renders below the radios: `"You will be charged {price} every {period} until you cancel."` (key `membership.payment.step1.subscriptionDisclosure`). | ☐ |
| P15 | Picking `yearly` updates the price label suffix to `/yearly`. | ☐ |
| P16 | Continue → REQUEST_MEMBERSHIP fires with `subscriptionPeriod: 'YEARLY'` (per payments-coder note guess — see Risk register §R2). | ☐ |
| P17 | Same Stripe path as P3–P5. | ☐ |
| P18 | Subscription persists across page reload — owner sees recurring member. | ☐ |

### 6d. Approval flow (community PRIVATE FREE)
Pre: §1 row 2 seed.

| # | Check | Pass |
|---|---|---|
| P19 | Click Request to Join → REQUEST_MEMBERSHIP_COMMUNITY fires (no payment fields). | ☐ |
| P20 | Envelope: `status='PENDING', requiresPayment=false, clientSecret=undefined`. | ☐ |
| P21 | Modal jumps directly to Step 3 (`done`) with `status='PENDING'`. | ☐ |
| P22 | Step 3 copy is the pending-approval variant (`membership.payment.step3.pendingApproval`), not the success copy. | ☐ |
| P23 | "Go to community" CTA still works. | ☐ |
| P24 | Owner sees pending request in members list — accept → status ACTIVE for requester. | ☐ |

---

## 7. Cross-cutting checks

| # | Check | Pass |
|---|---|---|
| X1 | `pnpm lint` clean. | ☐ |
| X2 | `pnpm build` succeeds (no TS errors). | ☐ |
| X3 | All four locales (en, fr, it, de) load on the modal — text uses placeholder English on fr/it/de per FE-lead note; nl was not touched per payments-coder note. No missing-key warnings in console. | ☐ |
| X4 | Closing the modal mid-flight (after `REQUEST_MEMBERSHIP` succeeded but before payment) leaves a `PENDING_PAYMENT` membership BE-side. Reopening modal → idempotent retry continues without double-charging. | ☐ |
| X5 | Open modal, refresh page mid-step → modal state resets cleanly on remount (no zombie listeners). | ☐ |
| X6 | Owner gating: `?settings=1` reveals form; without it, link to settings is not exposed in nav. Submitting from a non-owner account → BE rejects via `COMMUNITY_ADMIN`/`SYSTEM_ADMIN` (per FE-lead note). | ☐ |
| X7 | Currency formatting: GHS renders as `GH₵` on locales that support it, or `GHS 12.34` fallback on locales that don't (verify with `de-DE`). | ☐ |
| X8 | `subscriptionPeriods` not present on envelope → modal renders BOTH monthly+yearly defaults (line 89). Verify this is the intended fallback with product. | ☐ |

---

## Risk register

Captured from `/tmp/payments-coder-notes.md` "Envelope-field guesses". For each: how to detect in QA, and the fallback if it triggers.

### R1. `requestMembership.id` may not be the membershipId

**Risk:** Payments coder extended the selection set with `id` on the assumption the GraphQL gateway maps `request_id` from the proto envelope to `id`. The actual field may be `requestId` or `membershipId`.

**How to detect in QA:**
- During §1 rows 3–5 and §6a/P5, open DevTools Network → inspect the `REQUEST_MEMBERSHIP_COMMUNITY` GraphQL response.
- The envelope typed as `RequestMembershipResult.membershipId` must be a non-empty string. If `undefined` / `null`, this risk has triggered.
- A second signal: §6a/P5 success step shows "Go to community" but a membership record is NOT actually attached on the BE — querying `myCommunities` after success would omit the new entity.
- A third signal: idempotency breaks (X4 fails) — without a stable `membershipId`, a retry creates a duplicate request.

**Fallback if triggered:**
- File a hotfix-tier follow-up ticket pointing at `src/services/gql/community.tsx` and `src/services/gql/associations.tsx` (REQUEST_MEMBERSHIP selection sets) to rename the field per the actual gateway schema.
- Until fix lands: gate the rollout behind a feature flag, OR temporarily wire the modal's `onSuccess(membershipId)` to fetch fresh `myCommunities` and pick the entity by `entityId` instead of trusting the envelope.
- Risk severity if shipped wrong: **medium-high** — most flows still work, but retry/idempotency degrade silently.

### R2. `subscriptionPeriod` mutation input field naming

**Risk:** Payments coder forwards `subscriptionPeriod: period.toUpperCase()` (e.g. `'MONTHLY'`) inside `RequestMembershipInput` on the association detail page. BE may expect a different name (`billingPeriod`, `period`, `interval`) or a different case (`'monthly'`, `'MONTH'`).

**How to detect in QA:**
- §1 row 4 (community subscription monthly) and §1 row 6 (association yearly): after `REQUEST_MEMBERSHIP_*` fires, the resulting subscription on Stripe must show the **right cadence** (monthly invoice vs yearly invoice).
- If user picks `yearly` in Step 1 but the Stripe dashboard / BE shows a monthly subscription → the field name/value didn't take and BE defaulted to monthly.
- Backwards signal: the envelope's `subscriptionId` (once BE exposes it) should be non-null; if `null` on a `SUBSCRIPTION` flow, the BE may have silently fallen back to one-time.
- Easiest detector: in QA, do P16 with `yearly`, then check the Stripe test dashboard — the `interval` on the subscription must be `year`.

**Fallback if triggered:**
- Hotfix in `src/app/[locale]/(protected)/(main)/(home)/association/[id]/page.tsx` (and the community equivalent) to send the correct field name.
- Until fix: monkeypatch by hardcoding the period server-side, or temporarily disable subscription flows and show "monthly only" copy.
- Risk severity: **high** — silently bills users the wrong cadence; refund risk.

### R3. `priceAmount` unit interpretation (cents vs major units)

**Risk:** GraphQL `priceAmount` is declared `Int` in the FE types but the underlying proto is `double price_amount`. Payments coder assumed cents (smallest unit, matching `Money.amountInCents`). If BE actually stores major units (e.g., `10.00` for ten dollars), the modal would charge 100× the real price (10000 cents = $100 instead of $10).

**How to detect in QA:**
- §1 row 3 / §6a Stripe one-time: seed price as `10 USD`. After Continue, modal Step 1 displays a price label. The displayed label should be `$10.00`. If it reads `$0.10`, BE stores cents and FE divides correctly. If it reads `$1,000.00`, BE stores major units and FE is double-applying `/100`.
- §6a/P8 Paystack: `amountInPesewas` passed to `openPaystackMobileMoney` should equal `priceAmount` directly when the BE stores cents. The Paystack receipt amount should match the seeded price.
- §5/S1 round-trip: seed `priceAmount=10` (intended major-unit) via DB direct → reload AccessSettingsForm → if form shows `0.10`, FE is over-dividing.
- Strongest detector: charge a $0.50 test purchase. If Stripe dashboard shows $50.00, the unit is wrong by 100×.

**Fallback if triggered:**
- Hotfix in `src/components/cards/AccessSettingsForm.tsx` line 69 (`initial.priceAmount / 100`) and line 136 (`Math.round(Number(priceAmount) * 100)`) — drop the `/100` and `*100` if BE stores major units.
- Also fix `src/components/cards/AccessBadges.tsx:24` (`money.amountInCents / 100`) and `MembershipPaymentModal.tsx:127` (`price.amountInCents / 100`).
- Until fix: pull the rollout — wrong currency math is a P0.
- Risk severity: **critical** — wrong by 100× either direction. Money. **Verify this row before sign-off.**

### R4 (bonus). Subscription default fallback in modal

**Risk (found during review of `MembershipPaymentModal.tsx:89`):** when `entity.access.subscriptionPeriods` is `undefined` or empty, the modal defaults to `['monthly', 'yearly']`. This means a community configured for monthly-only would show a yearly radio button — and selecting yearly would send `subscriptionPeriod='YEARLY'` which the BE may reject or silently convert.

**How to detect in QA:**
- §1 row 4: seed `subscriptionPeriods=['monthly']` and verify only the monthly radio renders.
- If both renders despite the seed, BE isn't returning `subscriptionPeriods` on `GET_COMMUNITY_DETAILS` (BE-TODO per contracts §4.5).

**Fallback if triggered:**
- Either ship the BE selection-set extension (`subscriptionPeriods` on read queries) and let the modal honor it, or change the modal default to a single-period array based on `paymentType` config from product.
- Until fix: document the divergence in product copy ("we offer monthly and yearly by default; admin tooling for per-community periods is rolling out").
- Risk severity: **medium** — UX confusion + possible billing-cadence mismatch (subsumed by R2 if it triggers).

### R5 (bonus). `payment_method_id` repurposed for Paystack reference

**Risk (from payments-coder notes "Deviations §2"):** the modal sends `payment_method_id: paystackReference` on the Paystack rail because the GraphQL `CONFIRM_PAYMENT_INTENT` input field isn't a true Stripe-method-id on non-Stripe rails. If BE introspects this field and tries to look it up as a Stripe `pm_xxx`, the confirm will fail.

**How to detect in QA:**
- §6b/P10: after Paystack success, `CONFIRM_PAYMENT_INTENT` must return `success=true`. If it returns `requires_action=true` or `success=false` with a "payment method not found" message, BE is treating the field as Stripe-only.

**Fallback if triggered:**
- BE needs a `provider_transaction_id` field (the original contract §3 name) instead of repurposing `payment_method_id`.
- Until fix: hotfix in the modal to swap fields, OR roll back Paystack rail.
- Risk severity: **high** for Paystack flows specifically.

---

## Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| QA owner | | | ☐ Pass / ☐ Fail |
| Tech lead | | | ☐ Pass / ☐ Fail |
| Payments coder | | | ☐ Pass / ☐ Fail |
| Frontend lead | | | ☐ Pass / ☐ Fail |
