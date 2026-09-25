# Loading audit 00: shared shell, loaders, and the standard

Scope: every `layout.tsx` and `loading.tsx`, the authenticated shell (header, home sidebar, bottom nav), every shared loader component, and Suspense boundaries. The page-by-page audits (01-…) follow the **Standard** below.
Audit only. No source was changed. Evidence comes from reading the code. The dev server on :3111 did not answer within 60 s, so nothing was checked visually.

---

## Standard (page auditors: follow this)

**S1. There is one loader component, `LoadingScreen`.** It lives in `src/components/custom/LoadingScreen.tsx`: the logo (`/LOGO.svg`, 128 px) above a brand-coloured spinning ring (`Spinner` → lucide `Loader2Icon`). It is the loader users see on every cold load, so it is the one the owner means (see §2). It needs one new prop, `variant: 'screen' | 'content'`:
- `screen` (today's behaviour, `fixed inset-0`) is used **only** before the shell exists: the boot gate in `(main)/layout.tsx`, `RootGate`/`Home2Gate`, the auth/reset/onboarding/callback routes, and the vendor workspace gate.
- `content` is `absolute inset-0` / `h-full w-full`, centred inside the **content column**, with the same logo and spinner. It never uses `fixed`, so it can never cover the header or sidebar.
- Wrap it as `<PageLoader />` (= `LoadingScreen variant="content"`) so pages don't pass props. Show **no changing text**. A loader whose caption changes ("" → "Checking profile…") looks like a second loader.

**S2. The shell appears once, complete, and in its final place.** The boot gate keeps showing `LoadingScreen` until auth hydration, the profile check **and** the shell's own data (sidebar communities, associations, groups) have all resolved, fetched **in parallel**. Then header, sidebar and bottom nav render together and stay mounted for the rest of the session. The shell never shows its own "Loading…" text or skeletons.

**S3. Content-area loading is one `PageLoader`, from the route boundary through the page's data.**
- Every `loading.tsx` inside `(main)` and `vendors` is exactly `export default function Loading() { return <PageLoader />; }`. No shaped skeletons, and no copies of the sidebar.
- A page renders `<PageLoader />` while its **critical** queries are loading, using the pattern `if (loading && !data) return <PageLoader />`. The route boundary and the page's own data state then look identical and sit in the same place, so the handover can't be seen. The result is one continuous loader followed by the whole page.
- "Critical" means anything that changes the page's layout or above-the-fold content. Gate all of it together, and start those queries in parallel in the same component (no parent → child query waterfall).
- Not allowed as a page's first paint: `Loader2`/`Spinner` in the middle of the page, `<Skeleton>` blocks, "Loading…" text, or `LoadingScreen` without `variant="content"`.
- Still allowed after the page has appeared: small inline spinners inside a button that is submitting, "load more" at the bottom of a list, search-as-you-type result lists, and lazy panels inside modals or sheets. None of these move the layout.
- Apollo cache hits must render immediately, with no loader. `loading && !data` already does this.

**S4. No layout shift from the shell.**
- Sidebar layouts use a fixed grid (`lg:grid lg:grid-cols-[20vw_minmax(0,1fr)]` inside the same `lg:max-w-[80vw] mx-auto` frame the header uses). Content width must never decide where the sidebar sits, so no `justify-center`/`items-center` on the shell.
- No `window.innerWidth`/`useEffect` breakpoints for layout. Use Tailwind breakpoints, which are correct on first paint.
- Heights: header, inner area and bottom nav should use `svh` or fixed px, not `dvh`, which changes when the mobile URL bar collapses.
- Navigate inside the app with `router.push` or `<Link>`, never `window.location.href`. A hard reload replays the whole boot loader.

**S5. Placement.** One `loading.tsx` per layout that owns a content column: `(main)`, `(home)`, `community`, `chat`, `profile`, `[id]`, `u/[username]`, `vendors`. Nested boundaries such as `circles/**` are unnecessary because they would render the same `PageLoader`. Delete them so they can't drift.

---

## 1. Inventory of loading mechanisms

| Mechanism | Where | Notes |
|---|---|---|
| **`LoadingScreen`** (logo + spinning ring, `fixed inset-0 bg-background`) | `src/components/custom/LoadingScreen.tsx:117` | Used by the `(main)` boot gate (twice), `RootGate`, `Home2Gate`, `callback/page.tsx:140`, `(auth)/loading`, `(auth)/signin/loading`, `onboarding/loading`, `reset/loading`. It is also misused **inside** the shell: `UserProfileView.tsx:64`, `wallet/page.tsx:22,31`, `wallet/QuickActions.tsx:15,20`. |
| `Spinner` (`Loader2Icon`, `animate-spin`, translated aria-label) | `src/components/ui/spinner.tsx` | Used by LoadingScreen plus 4 components. |
| Raw lucide `Loader2` | **52 files** | Ad-hoc centred spinners with varying size, colour and padding. |
| `<Skeleton>` (`bg-accent animate-pulse`) | `src/components/ui/skeleton.tsx`, **41 files** | Includes 14 of the 22 route `loading.tsx` files and page-level skeletons such as `FeedCardSkeleton`. |
| `src/components/skeleton/ProfileLoadingSkeleton.tsx` | | A standalone copy of `profile/loading.tsx`. |
| Early-return `if (loading…)` | **58 files** (≈23 in `src/app`) | Each page picks its own loader. |
| Plain "Loading …" text | `vendors/layout.tsx:36` ("Loading vendor workspace...", untranslated); `HomeSidebar.tsx` ("Loading associations...", "Loading groups..."); `MyCommunityCard2.tsx:~122` ("Loading communities..." + globe icon) | Hardcoded English. |
| Route `loading.tsx` | **22 active** (+ dead `src/app/loading1.tsx`) | 5 use LoadingScreen, 1 uses a bare Loader2 (`signup`), 16 use shaped skeletons. |
| `<Suspense>` | `wallet/page.tsx`, `wallet/QuickActions.tsx` (fallback = full-screen LoadingScreen); `(public)/community|association/[id]/page.tsx` and `kyc/itsme/error` (fallback `null`, for `useSearchParams`) | Nothing in the app calls `useSuspenseQuery`, so the wallet fallbacks never fire. They are dead code, and dangerous if anyone ever switches to suspense. |
| `next/dynamic` | `RootGate.tsx:24`, `Home2Gate.tsx:25` (`ssr:false`, **no `loading` option**) | This leaves a blank frame between the gate's LoadingScreen and the chunk's own LoadingScreen. |
| Top progress bar (nextjs-toploader / nprogress / custom) | **None** | Not in `package.json` or in the code. `@radix-ui/react-progress` (`ui/progress.tsx`) is only used for data bars (profile completion, circle goals and quorum). It is not a page loader. |

## 2. Which loader does the owner mean, and is it suitable?

The app has **no linear or top progress bar**. The only loader that every user sees on every cold load, and that the product looks like it intends as "the" loader, is **`LoadingScreen`**: the logo with a spinning brand-coloured ring. It is almost certainly the one meant. If the owner is actually picturing a thin top bar, none exists. Adding one would be a *second* loader, which is the opposite of the request, so it's worth a one-line confirmation.

It is **suitable as the single standard with one change.** It hard-codes `fixed inset-0`, so wherever it's used after the shell has mounted it covers the header and sidebar. That is exactly the "inside-out" flicker, where the shell disappears and then comes back. A `content` variant fixes this (S1). It already uses `next/image` with `priority` and fixed dimensions, and a translated spinner label, so it causes no CLS.

## 3. Layouts: evidence for each finding

### 3.1 `(main)/layout.tsx`, the authenticated shell gate (the heart of the problem)
- **Loader after loader (confirmed).**
  - `:69-71` returns `<LoadingScreen />` until Zustand rehydrates.
  - `:75-77` then returns `<LoadingScreen text={t("checkingProfile")} />` while `GET_MY_PROFILE` runs. The caption appears, which reads as a second loader.
  - Then the shell mounts, and the page and sidebar start their *own* loaders (the third and fourth).
- **"Outside to inside" (confirmed).** The shell (Header + HomeSidebar) renders before any data it needs:
  - The sidebar shows "Loading communities..." (`MyCommunityCard2.tsx`) and "Loading associations/groups..." (`HomeSidebar.tsx`, sections at the associations and groups blocks).
  - The content column shows the page loader.
  - Then everything fills in.
- **Waterfall.** It runs hydrate → `GET_MY_PROFILE` (RTT 1) → shell and page mount → sidebar ×3 + badge + chat-unread + page queries (RTT 2) → dependent page queries (RTT 3). The profile check is fully serial with everything else, even though every one of those queries can run concurrently.
- **SSR renders only the loader.** `hydrated` starts `false`, so every protected route's server HTML is the LoadingScreen. SSR gives no first-paint benefit. Auth lives in localStorage, so the server can't do better without cookie auth (phase 2, out of scope).
- **Stuck loader risk.** In `useProfileGuard.ts:54`, `error && !data` returns `'checking'` forever, with no retry and no timeout. On a flaky network the user sees "Checking profile…" indefinitely.

### 3.2 `(home)/layout.tsx` and `community/layout.tsx`: the sidebar "starts in the middle" (confirmed)
- Both use `mx-auto lg:flex items-center justify-center`, with a fixed `lg:w-[20vw]` sidebar and a content wrapper `<div className="min-w-0">` that has **no width**. It is as wide as its content.
- So the pair [sidebar + content] is **centred** on the page, and the sidebar's x-position depends on how wide the content currently is:
  - While a page shows a small centred spinner, the content is a few px wide and the sidebar sits near the **middle** of the screen.
  - When the feed (`lg:max-w-[40vw]`) or a wide page arrives, the block widens and the sidebar slides left.
- This is the owner's observation exactly, and the code already admits it: `src/lib/feedColumnLayout.ts` comment on `CIRCLE_COLUMN_CLASS` ("the shell CENTRES — which reads as the sidebar sitting in the middle of the page"). Circles works around it per page. Everything else still shifts.
- The sidebar's left edge also never lines up with the header logo: the header content is `lg:max-w-[80vw] mx-auto` (`header.tsx:127`), while the sidebar block is centred at whatever width the content has. The misalignment differs on every page.
- Sticky offset `top-[4rem]` (layout `:10`, `HomeSidebar` root) doesn't match the header height (`8dvh`, `globals.css:783`). It is minor.
- `community/layout.tsx` is a verbatim copy of `(home)/layout.tsx`. Extract a shared `SidebarShell`.

### 3.3 `(home)/loading.tsx` draws a second sidebar (confirmed bug)
- Next nests a segment's `loading.tsx` **inside** that segment's `layout.tsx`. `(home)/loading.tsx` therefore renders *inside* HomeLayout's content wrapper, next to the real `HomeSidebar`.
- It then draws its own `hidden lg:block lg:w-[20vw]` sidebar skeleton (`(home)/loading.tsx:7-17`), a feed and a PYMK rail.
- Result on desktop during any navigation into `(home)`: **real sidebar + skeleton sidebar + feed skeleton**. The skeleton sidebar then vanishes and everything jumps left.
- The comment in `circles/loading.tsx` ("`(home)/loading.tsx`, which replaces the whole subtree") is incorrect.
- It is also feed-shaped for every `(home)` route: `/events`, `/opportunities`, `/association`, `/post/[id]` and `/feed` show a feed skeleton, then their own different loader (loader after loader, and a wrong-shaped skeleton).

### 3.4 `chat/layout.tsx` + `chat/loading.tsx`
- Same double-sidebar bug. `chat/loading.tsx:5-47` draws a chat-list skeleton **inside** `chat/layout.tsx`, which already renders the real `ChatSideBar` (`:25-29`).
- **Mobile hydration flip.** `isMobile` starts `false` and is set in `useEffect` (`:13-20`). On a phone the first paint shows *both* panes (`block`), then one hides. `chat/page.tsx:45`, `GroupChat.tsx:361` and `DirectMessageChat.tsx:201` repeat the same pattern.

### 3.5 `profile/layout.tsx`, `[id]/layout.tsx`, `u/[username]/layout.tsx`
- `profile/layout.tsx:7` uses `lg:h-[90vh]` while the rest of the shell uses `h-app-inner` (92dvh), a height mismatch.
- `[id]` and `u/[username]` show their `loading.tsx` profile skeleton. Then `UserProfileView.tsx:63-65` returns a **full-screen fixed `LoadingScreen`** that covers the header and sidebar, and then the page. That is three different loaders, including the shell disappearing. The caption is the untranslated literal `'loadingProfile'`.

### 3.6 `vendors/layout.tsx`
- It sits outside `(main)`, so there is no shell and no auth gate, and it needs its own boot loader.
- `:33-38` shows plain untranslated text "Loading vendor workspace..." instead of `LoadingScreen`.
- `VendorSideBar.tsx:92-100` uses `h-[10vh]` / `h-[90vh]` / `w-[22vw]`. These are fixed widths, so no shift, but they aren't responsive.
- `vendors/**` has no `loading.tsx`, so pages show their own loaders.
- Separate finding, not about loading: the vendors tree has no auth/hydration gate like `(main)` has. Report it to whoever owns auth.

### 3.7 Other layouts
- `(public)/layout.tsx` → `PublicShell.tsx:31`. A signed-in user gets the public top bar in the server HTML and at first paint, then after hydration the whole thing is replaced by the app `Header` (a full-shell swap with a large CLS). Standard fix: while `!hydrated`, render a neutral bar with the same height as both, or LoadingScreen, and choose once.
- `notification/layout.tsx` is a no-op `<div>`. `(protected)`, `callback`, `help`, `verifykyc`, `dev-harness`, `circles`, `circles/[id]` and `post/[id]` are pass-throughs or metadata only. `(auth)`, `onboarding` and `reset` are static frames. None of these has loading problems of its own.
- Dead files to delete: `(main)/layouto.tsx`, `src/app/loading1.tsx`, `src/app/page1.tsx`, `callback/pageo.tsx`.

### 3.8 Header and bottom nav (`src/components/custom/header.tsx`)
- They render in one go once the shell mounts, and nav icons have explicit sizes. Badges appear later (polled or websocket), but they are absolutely positioned, so there is no shift. That is fine.
- Heights `h-app-top-down` / `h-app-inner` / `h-app-down` are **`dvh`** (`globals.css:780-797`). On mobile the whole app resizes as the browser's URL bar shows and hides. Use `svh` (or fixed px for the bars).

### 3.9 Hard reloads that replay the boot loader
`HomeSidebar.tsx:283` (`window.location.href = '/chat?t=groups&ct=group'`) and `:288` (`/association/{id}`) reload the whole app. The user sees LoadingScreen → "Checking profile" → page again, and these links also drop the locale prefix. Use `router.push`.

### 3.10 RootGate and Home2Gate (`/` and `/home2`)
`/` shows LoadingScreen (`RootGate.tsx:47`) → a blank frame while the `ssr:false` chunk downloads (`:24`, no `loading`) → MainLayout's LoadingScreen → "Checking profile" LoadingScreen → the page's loader. That is four stages. Fix: `dynamic(..., { loading: () => <LoadingScreen/> })`, together with S1/S2 (one caption-less loader). The stages then merge into one.

## 4. Owner's observations: verdict

| # | Observation | Verdict | Primary evidence |
|---|---|---|---|
| 1 | Some pages load outside→in | **Confirmed** | Shell mounts before its data and the page's data (§3.1). Sidebar "Loading …" text (`MyCommunityCard2`, `HomeSidebar`). |
| 2 | Some pages load inside→out | **Confirmed** | Full-screen `fixed` LoadingScreen inside the shell covers the header and sidebar: `UserProfileView.tsx:64` (`/[id]`, `/u/[username]`) and `wallet` Suspense (latent). The public→app shell swap (`PublicShell.tsx:31`). |
| 3 | Loader, then another loader | **Confirmed**, 6 distinct chains | boot → "checking profile" (§3.1); RootGate blank gap (§3.10); `(home)/loading` feed skeleton → page spinner (§3.3); `[id]` skeleton → full-screen LoadingScreen (§3.5); `chat` duplicate list (§3.4); hard reloads (§3.9). |
| 4 | Skeletons sometimes, sometimes not | **Confirmed** | 16 skeleton `loading.tsx`, 5 LoadingScreen, 1 bare spinner (`signup/loading.tsx` versus `signin/loading.tsx`). `becomeavendor`, `groups/[id]`, `kyc`, `marketplace`, `search`, `wallet` and all of `vendors` have no boundary. 52 files use raw Loader2 and 41 use Skeleton. |
| 5 | Sidebar renders from the middle, then moves | **Confirmed** | `(home)/layout.tsx:9-15` and `community/layout.tsx:9-15` centre a content-sized block (§3.2), plus the double-sidebar skeleton (§3.3). The sidebar's *width* is a fixed 20vw. What moves is its *position*. |

## 5. Performance angle
- **CLS sources in the shell:**
  - centred-shell sidebar slide (every sidebar page, every load);
  - duplicate skeleton sidebar collapsing (`(home)`, `chat`);
  - chat mobile pane flip;
  - sidebar text-line → list growth;
  - `dvh` resizing;
  - public-shell swap.

  All of these are fixable in CSS or structure at no runtime cost.
- **Waterfalls:**
  - profile check → everything else (serial RTT);
  - lazy chunk after hydration on `/`;
  - sidebar queries only start after the profile resolves.

  Fire `GET_MY_PROFILE`, `LIST_MY_JOINED_COMMUNITIES`, `GET_USER_ASSOCIATIONS`, `GET_MY_GROUPS`, the notification badge and chat unread **together** in the boot gate. That makes 1 RTT instead of 2 for the shell, and the page's own queries can begin at the same moment if the page mounts hidden behind the loader (optional, see WP-A note).
- **Perceived speed trade-off:** "the whole page at once" moves first *content* paint later by the page's slowest critical query. Keep "critical" tight (S3), and rely on Apollo `cache-first` so revisits are instant. A slim delay (≈150 ms) before showing `PageLoader` avoids a flash on fast cache-backed navigations.
- Bundle: the proposed changes delete about 1,000 lines of skeleton JSX and add one ~30-line component, a net reduction.

## 6. Change list and work packages (non-overlapping)

**WP-A: shell and loader primitive (do first; blocks the others). Effort: M, about 1 day.**
- `src/components/custom/LoadingScreen.tsx`: add `variant`. New file `src/components/custom/PageLoader.tsx`.
- `src/app/[locale]/(protected)/(main)/layout.tsx`: one caption-less loader; parallel boot queries (profile + sidebar + badges); render the shell only when all are ready.
- `src/hooks/useProfileGuard.ts`: bounded retry, then the error state (no infinite "checking").
- New `src/components/home/SidebarShell.tsx` (fixed grid aligned to the header's 80vw). Use it in `(home)/layout.tsx` and `community/layout.tsx`.
- `src/components/home/HomeSidebar.tsx`: remove "Loading …" text (the data comes from the boot cache) and replace `window.location.href` with `router.push`.
- `src/components/cards/MyCommunityCard2.tsx`: remove the "Loading communities..." branch and reserve the row height.
- `src/app/[locale]/globals.css`: `dvh` → `svh`. `src/components/custom/header.tsx`: sticky and height alignment only.
- `src/components/landing/RootGate.tsx`, `Home2Gate.tsx`: add `loading` to `dynamic`.

**WP-B: route boundaries and non-home layouts. Effort: S–M, about ½ day.** Starts after WP-A has merged `PageLoader`.
- Replace with `<PageLoader/>`:
  - `(home)/loading.tsx`, `chat/loading.tsx`, `community/loading.tsx`, `create-post/loading.tsx`, `notification/loading.tsx`, `profile/loading.tsx`, `[id]/loading.tsx`, `settings/loading.tsx` (`u/[username]` re-exports `[id]`).
- Add:
  - `(main)/loading.tsx` (covers `becomeavendor`, `groups/[id]`, `kyc`, `marketplace`, `search`, `wallet`)
  - `vendors/loading.tsx`
- Delete:
  - the 8 `circles/**/loading.tsx` files and `components/skeleton/ProfileLoadingSkeleton.tsx`, after checking for importers
  - `layouto.tsx`, `loading1.tsx`, `page1.tsx`, `callback/pageo.tsx`
- `(auth)/signup/loading.tsx`: use LoadingScreen, the same as signin.
- `chat/layout.tsx`: CSS breakpoints instead of `isMobile`.
- `profile/layout.tsx`: `h-app-inner`.
- `vendors/layout.tsx`: LoadingScreen with translated text removed.
- `src/components/public/PublicShell.tsx`: decide the shell once after hydration.

**WP-C onward: pages (the 01-… audits own these files).** Apply S3 to each page's first-paint loader:
- `UserProfileView.tsx:64` → PageLoader (worst offender: it covers the shell)
- remove the `wallet/page.tsx` and `QuickActions.tsx` Suspense/LoadingScreen
- `chat/page.tsx`, `GroupChat.tsx` and `DirectMessageChat.tsx` isMobile → CSS
- every other `if (loading) return <Loader2|Skeleton…>` first-paint branch

Keep these files out of WP-A and WP-B. Suggested split: WP-C1 `(home)/**` pages, WP-C2 other `(main)/**` pages + `components/profile|wallet|chats`, WP-C3 `vendors/**` + `(public)/**` detail clients.

**Suggested order:** WP-A → (WP-B ∥ WP-C1 ∥ WP-C2 ∥ WP-C3). The file sets are disjoint. The only shared dependency is `PageLoader`, which WP-A merges first.

## 7. Compliance and accessibility
- `PageLoader` and `LoadingScreen` must keep `role="status"` and a translated label (Spinner already has one). Add `aria-busy="true"` on the content region while loading, and move focus to the main heading when the page appears (WCAG 2.2 AA 4.1.3).
- The untranslated strings in §1 ("Loading vendor workspace...", "Loading communities/associations/groups...", `'loadingProfile'`) break the 5-locale rule. The standard removes them rather than translating them.
- No personal data or data flows change.
