# Community — User App Integration

This doc summarizes how the user app integrates with community management. For full API details (queries, mutations, payloads), see the **Community — User App Integration Guide** (product/backend spec).

## Overview

**Communities** are groups users can discover, join, and participate in. They have **join policies** (OPEN, REQUEST, INVITE_ONLY) that control how users become members. When a user **joins** a community they are **automatically added to the community’s default group** — no separate group join is required.

## Implemented in this repo

- **GraphQL**  
  - `src/services/gql/community.tsx`:  
    - Discover: `searchCommunities`, `getCommunity` (with `defaultGroupId`, `bannerUrl`, `membershipStatus`)  
    - Join flow: `requestMembership` (entityType: `"COMMUNITY"`), `cancelJoinRequest`, `leaveCommunity`  
    - Invitations: `acceptMembershipInvitation`, `rejectMembership` (entityType: `"COMMUNITY"`)  
    - Status: `getMyMemberships`, `getCommunityMembers`, `getMyCommunities`  
    - Other: `reportMember`  
  - Legacy: `discoverCommunities`, `listCommunities`, `listUserCommunities`, `checkCommunityMembership`, `getCommunityStats` kept for backward compatibility.

- **Community detail page**  
  - `src/app/[locale]/(protected)/(main)/community/[id]/page.tsx`:  
    - Uses `joinPolicy` (OPEN | REQUEST | INVITE_ONLY) for Join / Request to join / Invite only.  
    - Uses membership status (ACTIVE / PENDING / SUSPENDED) for Member badge, Leave, and Cancel request.  
    - Optional banner image, about section, feed (when backend supports `type: 'community'` + `communityId`).  
    - Toasts: joined, request submitted, invite-only error, left, request cancelled.

- **i18n**  
  - `community.loading`, `community.loadingPosts`, `community.noPosts`, `community.notfound`, `community.toasts`, `community.badges`, `community.actions` in all locale files.

## Key rules for the user app

1. **Never call group APIs for join/leave**  
   Group membership is managed automatically when the user joins or leaves the community.

2. **Use `defaultGroupId` from `getCommunity`**  
   Store it and use it to load the community’s group feed, members, and chat (e.g. `getGroup`, `getGroupMembers`). Do not call `joinGroup` for the community’s default group.

3. **Check `joinPolicy` before rendering the join button**  
   - `OPEN` → “Join”.  
   - `REQUEST` → “Request to join”.  
   - `INVITE_ONLY` → no join button; show “Invite only” (e.g. lock icon).

4. **`requestMembership` is idempotent**  
   Safe to retry if status is unclear.

5. **After `leaveCommunity`**  
   Clear cached group membership for that community’s `defaultGroupId` and navigate the user away from community-specific content.

6. **`entityType` must always be `"COMMUNITY"`**  
   For all community membership mutations (requestMembership, cancelJoinRequest, acceptMembershipInvitation, rejectMembership, reportMember), do not omit `entityType: "COMMUNITY"`.

## Notifications to handle (when wiring notifications)

| Event              | Notification type      | Suggested UI action                          |
|--------------------|------------------------|-----------------------------------------------|
| Request approved   | `MEMBERSHIP_APPROVED`  | Toast: “You’re now a member of X”             |
| Request rejected   | `MEMBERSHIP_REJECTED`  | Toast: “Your request to join X was declined” |
| Invited to community | `MEMBERSHIP_INVITATION` | Show invite card with Accept / Decline     |
| Removed from community | `MEMBERSHIP_REMOVED` | Navigate away, toast: “You were removed from X” |
| Suspended          | `MEMBERSHIP_SUSPENDED` | Show suspended state                         |

## Feed and group usage

- Each community has a **default group** (`defaultGroupId` from `getCommunity`).  
- Use it to load group content: `getGroup(id: defaultGroupId)`, `getGroupMembers(groupId: defaultGroupId, ...)`.  
- The community detail page may use a feed scoped by `communityId` when the backend supports it; when feed-by-`groupId` is supported, prefer `defaultGroupId` for consistency with the guide.
