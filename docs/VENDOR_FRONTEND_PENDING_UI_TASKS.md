# Vendor Frontend — Pending UI Integrations

Last updated: 2026-04-08

This note tracks vendor-related backend integrations that are already available in the frontend service layer but are not fully wired in UI flows yet.

## 1) Eligibility/KYC fields not surfaced in UI

### Current state
- `VendorEligibilityDTO` includes optional `kycStatus` and `kycLevel` in types.
- UI mostly checks `canReceivePayout`, but does not render full KYC progress/status UX from eligibility.

### Pending work
- Extend `GET_VENDOR_ELIGIBILITY` selection set to include:
  - `kycStatus`
  - `kycLevel`
- Add vendor dashboard and/or onboarding banners for:
  - `NOT_STARTED` -> optional verify prompt
  - `PENDING` -> under review
  - `VERIFIED` -> verified badge
  - `REJECTED` -> retry prompt
  - `EXPIRED` -> re-verify prompt

---

## 2) Sellability gating (suspension/ban)

### Current state
- Vendor pages are accessible if `getMyVendor` exists.
- There is no centralized UI gate for:
  - `status === SUSPENDED`
  - `status === BANNED`
  - `canSell === false`

### Pending work
- Add sellability guard in vendor layout/dashboard area.
- Show explicit status banners:
  - Suspended account message
  - Banned account message
- Disable create/publish actions when selling is not allowed.

---

## 3) Vendor order action: confirm delivery

### Current state
- Marketplace mutation exists (`confirmOrderDelivery`).
- Vendor orders page now wires a row action for `IN_PROGRESS` orders to `confirmOrderDelivery`.
- Integration includes success/error toasts, optimistic status update to `DELIVERED`, and `LIST_VENDOR_ORDERS` refresh.

### Pending work
- Optional: add the same delivery-confirm action in the dashboard "Pending orders" mini-table for consistency.

---

## 4) Order polling for near-real-time updates

### Current state
- Vendor orders use plain `useQuery` with pagination.
- No `pollInterval`/refresh timer is set.

### Pending work
- Add polling for order lists (e.g. 15–30s) on:
  - Vendor dashboard recent orders panel
  - Orders management page
- Pause polling when tab is hidden (optional enhancement).

---

## 5) Upload UI gaps (logo/documents)

### Current state
- Upload mutation supports `fileType: "logo" | "product-image" | "document"`.
- Product image upload is wired.
- Vendor logo and business document upload are not persisted through vendor API flow yet.

### Pending work
- Add logo upload flow in vendor profile/settings:
  1. request signed URL with `fileType: "logo"`
  2. PUT binary
  3. persist returned `readUrl` as vendor logo (requires vendor profile update mutation when available)
- Add business document upload persistence in onboarding step:
  1. request signed URL with `fileType: "document"`
  2. PUT PDF
  3. persist/read reference for compliance review

---

## 6) Product/service preview & edit actions

### Current state
- Products/services list pages display `Preview` and `Edit` buttons.
- Buttons are currently placeholders (no route/action wiring).

### Pending work
- Implement preview routes:
  - product preview page
  - service package preview page
- Implement edit routes/forms:
  - product edit (using `updateProduct` where allowed)
  - service package edit workflow (draft-safe)

---

## 7) Optional cleanup/consistency follow-ups

- Standardize `fileType` constants in one shared vendor upload enum helper for UI forms.
- Add minor-unit helpers (`toMinor`, `fromMinor`) in shared util to avoid repeated `amount / 100` logic.
- Add status-to-label/status-to-color mappers for vendor/order states in one place.

---

## Suggested implementation order

1. Eligibility query + KYC/sellability banners
2. Order confirm-delivery action
3. Order polling
4. Logo/document upload UI
5. Product/service preview + edit routes
6. Utility/status mapping cleanup

---

## Could not be integrated yet (no dedicated UI surface)

These backend/service-layer capabilities are available but remain blocked by missing UX/screens:

- KYC progress/status display (`kycStatus`, `kycLevel`) — no dashboard/onboarding banner components yet.
- Sellability gating states (`SUSPENDED`, `BANNED`, `canSell === false`) — no centralized vendor account-state gate/banners yet.
- Vendor logo/business document persistence flow — no profile/onboarding upload sections for these file types yet.
- Product/service preview + edit actions — list buttons exist, but preview/edit routes and forms are not implemented yet.
- Vendor order near-real-time refresh controls — no polling behavior in current orders UX yet.
