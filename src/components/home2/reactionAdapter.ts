/* =====================================================================
 *  reactionAdapter — THE SINGLE SEAM between the reaction vocabulary the
 *  /home2 UI speaks and what post-feed-service can store today.
 *
 *  ── THE BOUNDARY BETWEEN REAL AND PENDING ───────────────────────────
 *
 *  HAPPY **IS** THE EXISTING LIKE. Not a stand-in for it — the same
 *  thing. When the backend ships reaction types, existing like rows
 *  migrate to HAPPY. So today:
 *
 *   • HAPPY round-trips for real. `userEngagement.hasLiked === true`
 *     means HAPPY is selected; selecting HAPPY fires the existing
 *     add-LIKE mutation, clearing it fires remove-LIKE, and the total
 *     (`engagementCounts.likes`) moves accordingly. Nothing is faked.
 *
 *   • HOPEFUL and SAD have nowhere real to go yet. They are held in
 *     component state for the session, do not survive a refresh, and do
 *     not follow the user to another device. They are deliberately NOT
 *     written as a LIKE: a LIKE row will migrate to HAPPY, so recording
 *     someone's Sad as a like would permanently attribute a reaction
 *     they did not give. An honest reset beats a wrong persisted value,
 *     and localStorage would only make the wrongness durable.
 *
 *  Consequence worth knowing: moving from HAPPY to HOPEFUL/SAD removes
 *  the like (total −1), because the server would otherwise keep holding
 *  a Happy the user has moved away from.
 *
 *  ── SAD IS NOT A DOWNVOTE ───────────────────────────────────────────
 *  Sad is how a reader says a post about bereavement or hard news landed.
 *  It is empathy and engagement. It must never hide, report, downrank or
 *  "show fewer like this", and it must never be labelled dislike / thumbs
 *  down / not interested / negative anywhere a user or a screen reader
 *  can meet it.
 * ===================================================================== */

/** The reaction vocabulary the UI speaks. Independent of `EngagementType`. */
export type ReactionKind = 'HAPPY' | 'HOPEFUL' | 'SAD';

/** Display order of the cluster and the menu. */
export const REACTION_ORDER: readonly ReactionKind[] = ['HAPPY', 'HOPEFUL', 'SAD'] as const;

/**
 * The reaction a bare "Like" affordance selects — the action-row button,
 * the media modal, the comment sheet — and the one a server-side
 * `hasLiked: true` means, because Happy is the existing Like.
 */
export const DEFAULT_REACTION: ReactionKind = 'HAPPY';



/**
 * Per-reaction counts.
 *
 * OPTIONAL BY DESIGN and absent today — the API returns only `likes`.
 * Absent means the breakdown UI does not render at all: not a zeroed
 * panel, not placeholders, not a ratio-split of the total. It lights up
 * on its own the day the backend returns these numbers; no UI rewrite.
 */
export type ReactionBreakdown = Record<ReactionKind, number>;

/** The server-side engagement facts the adapter reads from. */
export interface ReactionSourceEngagement {
    /** REAL today: `userEngagement.hasLiked` — i.e. "HAPPY is selected". */
    hasLiked: boolean;
    /**
     * The reaction the server recorded. Does not exist yet. When
     * post-feed-service ships reaction types, pass it straight through
     * from `userEngagement` and every selection becomes durable.
     */
    reaction?: ReactionKind | null;
}

/**
 * Resolve which reaction renders as selected.
 *
 * Precedence: the server's recorded reaction (once it exists) wins; then
 * `hasLiked` — which IS Happy — wins over a session pick, because the
 * server holding a like is a stronger fact than an unsaved choice; then
 * the session-only pick (HOPEFUL / SAD), which is meaningful precisely
 * when there is no like.
 *
 * @param engagement  what the API returned for this post
 * @param sessionPick the reaction chosen in this browser session. Not
 *                    persisted anywhere and does not survive a refresh.
 */
export function readSelectedReaction(
    engagement: ReactionSourceEngagement,
    sessionPick: ReactionKind | null,
): ReactionKind | null {
    // 1. Server truth wins outright.
    if (engagement.reaction) return engagement.reaction;

    // 2. Then what the viewer JUST picked, still awaiting confirmation. This
    //    MUST come before the hasLiked fallback below. Optimistically, tapping
    //    Hopeful flips hasLiked true while the server reaction is still null —
    //    so checking hasLiked first returned Happy, and every Hopeful and Sad
    //    tap appeared to select the heart instead.
    if (sessionPick) return sessionPick;

    // 3. Reacted, but we do not know which: a pre-migration row stored before
    //    reaction types existed. Displayed as Happy — never written back as
    //    Happy, so the distinction survives.
    if (engagement.hasLiked) return DEFAULT_REACTION;
    return null;
}

/**
 * The write the UI should perform for a reaction change.
 *
 * All three reactions persist, so `op === null` now means only "nothing
 * changed" — re-picking what is already selected.
 */
export interface ReactionWritePlan {
    /**
     * What the server must do: 'add' writes/updates the reaction, 'remove'
     * clears it, null means nothing to write.
     *
     * A SWITCH is an 'add', not a remove-then-add: post-feed-service updates
     * the existing row in place, so the total is unchanged and the author is
     * not notified a second time.
     */
    op: 'add' | 'remove' | null;
    /** The reaction to store on an 'add'. Null on 'remove'. */
    reaction: ReactionKind | null;
    /**
     * Target value of `hasLiked` for optimistic UI, or null when nothing is
     * written. All three reactions are stored as a LIKE row, so any selection
     * means hasLiked=true.
     */
    liked: boolean | null;
    /** Delta to apply to the displayed TOTAL (`engagementCounts.likes`). */
    totalDelta: number;
    /**
     * Per-reaction deltas, applied only when a breakdown is present.
     * Already correct for the post-backend world: Happy→Sad is
     * `{ HAPPY: -1, SAD: +1 }`.
     */
    breakdownDelta: Partial<Record<ReactionKind, number>>;
}

/**
 * ►►► THIS IS THE FUNCTION TO SWAP when the backend gains reaction types. ◄◄◄
 *
 *   planReactionWrite(
 *     previous: ReactionKind | null,
 *     next: ReactionKind | null,
 *   ): ReactionWritePlan
 *
 * Plans the effect of moving the selection from `previous` to `next`;
 * `next === null` means the user cleared their reaction.
 *
 * CURRENT BEHAVIOUR — everything reduces to "is Happy on?", because
 * Happy is the existing Like and nothing else is storable yet:
 *   null    → HAPPY   : add LIKE       (liked: true,  totalDelta: +1)
 *   HAPPY   → null    : remove LIKE    (liked: false, totalDelta: -1)
 *   HAPPY   → SAD     : remove LIKE    (liked: false, totalDelta: -1)
 *   SAD     → HAPPY   : add LIKE       (liked: true,  totalDelta: +1)
 *   null    → SAD     : nothing        (liked: null,  totalDelta: 0)
 *   SAD     → HOPEFUL : nothing        (liked: null,  totalDelta: 0)
 *   SAD     → null    : nothing        (liked: null,  totalDelta: 0)
 * The `breakdownDelta` is already the FUTURE-correct answer in every one
 * of those rows, so the optimistic breakdown update needs no change.
 *
 * AFTER REAL REACTIONS SHIP, change only this function and the callback
 * it feeds: return the target reaction (add `reaction: ReactionKind | null`,
 * drop `liked`), and have FeedCard2's `handleSelectReaction` call an
 * `onReact(postId, reaction)` prop — wired in HomeFeed2 to the new typed
 * mutation — in place of today's `onLike(postId, liked)`. Delete
 * branch of `readSelectedReaction` at the same time.
 */
export function planReactionWrite(
    previous: ReactionKind | null,
    next: ReactionKind | null,
): ReactionWritePlan {
    if (previous === next) {
        return { op: null, reaction: null, liked: null, totalDelta: 0, breakdownDelta: {} };
    }

    const breakdownDelta: Partial<Record<ReactionKind, number>> = {};
    if (previous) breakdownDelta[previous] = -1;
    if (next) breakdownDelta[next] = 1;

    // All three reactions now persist. Every one is stored as a LIKE row
    // carrying a reaction_type, so the TOTAL only moves when a reaction is
    // added from nothing or cleared entirely — switching Happy→Sad updates the
    // row in place and leaves the count alone.
    if (next === null) {
        return { op: 'remove', reaction: null, liked: false, totalDelta: -1, breakdownDelta };
    }
    return {
        op: 'add',
        reaction: next,
        liked: true,
        totalDelta: previous === null ? 1 : 0,
        breakdownDelta,
    };
}

/** Apply a plan's `breakdownDelta` to a breakdown, clamped at zero. */
export function applyBreakdownDelta(
    breakdown: ReactionBreakdown,
    delta: Partial<Record<ReactionKind, number>>,
): ReactionBreakdown {
    const next = { ...breakdown };
    for (const kind of REACTION_ORDER) {
        const d = delta[kind];
        if (d) next[kind] = Math.max(0, (next[kind] ?? 0) + d);
    }
    return next;
}
