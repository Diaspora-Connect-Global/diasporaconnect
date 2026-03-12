# Association Management — User App Integration

This doc summarizes how the user app integrates with association management. For full API details (queries, mutations, payloads), see the **Association Management — User App Integration Guide** (product/backend spec).

## Overview

From the user app perspective, **associations** are community-like entities users can discover, join, leave, and interact with. When a user **joins** an association, they are **automatically added to the association’s default group** — no separate group join is required.

## Implemented in this repo

- **GraphQL**  
  - `src/services/gql/associations.tsx`:  
    - Discover: `searchAssociations`, `getAssociation`, `listAssociationTypes`  
    - Join flow: `requestMembership`, `cancelJoinRequest`, `leaveAssociation`  
    - Invitations: `acceptMembershipInvitation`, `rejectMembership`  
    - Status: `getMyMemberships`, `getAssociationMembers`, `getMyAssociations`  
    - Other: `reportMember`  
  - Legacy: `listAssociations`, `getUserAssociations` kept for backward compatibility.

- **Association detail page**  
  - `src/app/[locale]/(protected)/(main)/(home)/association/[id]/page.tsx`:  
    - Uses `joinPolicy` (OPEN | REQUEST | INVITE_ONLY) to show Join / Request to join / Invite only.  
    - Uses membership status (ACTIVE / PENDING / SUSPENDED) for Member badge, Leave, and Cancel request.  
    - Toasts for: joined, request submitted, invite-only error, left, request cancelled.

- **i18n**  
  - `home.associations.toasts`, `home.associations.badges`, `home.associations.actions` in all locale files.

## Key rules for the user app

1. **Never call group APIs for join/leave**  
   Group membership is managed automatically when the user joins or leaves the association.

2. **Use `defaultGroupId` from `getAssociation`**  
   Store it and use it to load the association’s group feed, members, and chat (e.g. `getGroup`, `getGroupMembers`). Do not call `joinGroup` for the association’s default group.

3. **Respect `joinPolicy` before showing the join action**  
   - `OPEN` → show “Join”.  
   - `REQUEST` → show “Request to join”.  
   - `INVITE_ONLY` → do not show a join button; show an “Invite only” (or lock) state.

4. **`requestMembership` is idempotent**  
   Safe to call again if status is unclear.

5. **After `leaveAssociation`**  
   Clear any cached group membership state for that association’s `defaultGroupId` and redirect the user away from association-only content.

6. **UI states**  
   - Not a member → Join (or Request to join).  
   - `PENDING` → “Request pending” + “Cancel request”.  
   - `ACTIVE` → “Member” + “Leave”.  
   - `SUSPENDED` → “Suspended” badge only.  
   - `INVITE_ONLY` (and not a member) → “Invite only”, no join button.

## Notifications to handle (when wiring notifications)

| Event                 | Payload / type              | Suggested UI action                          |
|-----------------------|-----------------------------|-----------------------------------------------|
| Membership approved   | e.g. `MEMBERSHIP_APPROVED` + `entityId` | “You’re now a member of X”                 |
| Membership rejected   | e.g. `MEMBERSHIP_REJECTED` + `entityId` | “Your request to join X was declined”      |
| Invited to association| e.g. `MEMBERSHIP_INVITATION` + `entityId` | Invite card with Accept / Decline        |
| Removed from association | e.g. `MEMBERSHIP_REMOVED` + `entityId`  | Navigate away, show toast                    |

## Feed and group usage

- Each association has a **default group** (`defaultGroupId`).  
- To show the association’s feed or members, use that group’s ID with your existing feed/group APIs (e.g. feed by `groupId` if supported, or `getGroup` / `getGroupMembers` from `src/services/gql/groups.ts`).  
- The current association detail page may still use a feed scoped by `associationId` if the backend supports it; when the backend supports feed-by-`groupId`, prefer using `defaultGroupId` for consistency with the guide.
