/* =====================================================================
 *  reactionAdapter — THE SINGLE SEAM between the reaction vocabulary the
 *  UI speaks and what post-feed-service stores. Shared by every reaction
 *  surface on both feed cards (`home2/FeedCard2` and the original
 *  `cards/FeedCardWithReply`), which is why it lives here and not under
 *  `home2/`.
 *
 *  ── ALL THREE REACTIONS PERSIST ─────────────────────────────────────
 *
 *  HAPPY **IS** THE EXISTING LIKE. Not a stand-in for it — the same
 *  thing. All three reactions are stored as a single LIKE row carrying a
 *  `reaction_type` of HAPPY | HOPEFUL | SAD, so:
 *
 *   • Selecting any reaction is an add-LIKE carrying its type; clearing
 *     one is a remove-LIKE.
 *
 *   • SWITCHING between two reactions updates that one row IN PLACE.
 *     The total does not move (`totalDelta === 0`) and the author is not
 *     notified a second time. Only the per-kind breakdown shifts.
 *
 *   • A row with `reaction_type = NULL` is a PRE-MIGRATION like, stored
 *     before reaction types existed. It is DISPLAYED as Happy but must
 *     never be written back as HAPPY and never counted into
 *     `EngagementCounts.happy` — the distinction is what lets the
 *     breakdown and the total stay honest about each other.
 *
 *  ── SAD IS NOT A DOWNVOTE ───────────────────────────────────────────
 *  Sad is how a reader says a post about bereavement or hard news landed.
 *  It is empathy and engagement. It must never hide, report, downrank or
 *  "show fewer like this", and it must never be labelled dislike / thumbs
 *  down / not interested / negative anywhere a user or a screen reader
 *  can meet it. (The non-English locales render it as compassion —
 *  Mitgefühl, Compassion, Partecipazione, Medeleven — which is the sense
 *  intended everywhere.)
 * ===================================================================== */

import type { ComponentType } from 'react';
import {
    PiHeart,
    PiHeartFill,
    PiHandsPraying,
    PiHandsPrayingFill,
    PiThumbsDown,
    PiThumbsDownFill,
} from 'react-icons/pi';

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
    /** `userEngagement.hasLiked` — true for ANY reaction, since all three are LIKE rows. */
    hasLiked: boolean;
    /**
     * The reaction the server recorded (`userEngagement.myReaction`), or null
     * for a pre-migration like stored before reaction types existed.
     */
    reaction?: ReactionKind | null;
}

/**
 * A viewer's local, not-yet-reconciled choice.
 *
 * THREE distinct states, and the difference between the last two is the whole
 * point: `undefined` means "the viewer has not touched this post, defer to the
 * server", while `null` means "the viewer deliberately CLEARED their reaction".
 * Collapsing them into one nullable value makes a deselect indistinguishable
 * from no-opinion, so a stale server reaction immediately re-selects itself.
 */
export type SessionReactionPick = ReactionKind | null | undefined;

/**
 * Resolve which reaction renders as selected.
 *
 * PRECEDENCE — local intent first, and that ordering is the bug fix.
 *
 * It used to read the server's reaction first. That is wrong the moment a
 * viewer changes an already-persisted reaction: switching a stored SAD to
 * HOPEFUL leaves `reaction` reading 'SAD' until a refetch, so the UI showed
 * the old choice and the new one looked like it had not registered.
 *
 * A defined `sessionPick` means the viewer has acted on THIS post since the
 * last time the server told us anything, so it is by definition newer than
 * `reaction`. `undefined` means they have not, and the server wins.
 *
 * @param engagement  what the API returned for this post
 * @param sessionPick the local choice: a kind, `null` for a deliberate clear,
 *                    or `undefined` for "no local opinion".
 */
export function readSelectedReaction(
    engagement: ReactionSourceEngagement,
    sessionPick: SessionReactionPick,
): ReactionKind | null {
    // 1. The viewer's own most recent action on this post outranks everything.
    //    Note `null` is a REAL answer here (a deliberate deselect), which is
    //    why this tests against undefined rather than truthiness — `if
    //    (sessionPick)` would fall through on a clear and re-select the stale
    //    server value, undoing the deselect on the very next render.
    if (sessionPick !== undefined) return sessionPick;

    // 2. Otherwise the server's recorded reaction.
    if (engagement.reaction) return engagement.reaction;

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

/**
 * The per-kind movement a reaction change causes, derived from the before/after
 * pair alone.
 *
 * A SWITCH moves one count between buckets and leaves the total alone; a fresh
 * reaction only adds; clearing one only subtracts. `previous` is the RAW stored
 * reaction, so `null` means a pre-migration untyped like — which belongs to no
 * bucket, so nothing is decremented and the untyped remainder shrinks by one on
 * its own.
 *
 * Lives here, exported, because the parent feed applies it optimistically and
 * the result has to be verifiable without mounting a component.
 */
export function deriveKindDelta(
    previous: ReactionKind | null,
    next: ReactionKind | null,
    adding: boolean,
): Partial<Record<ReactionKind, number>> {
    const d: Partial<Record<ReactionKind, number>> = {};
    if (previous) d[previous] = -1;
    if (adding && next) d[next] = (d[next] ?? 0) + 1;
    // A re-pick of the same reaction nets to zero; drop the key rather than
    // sending a 0, so an untouched bucket is never rewritten.
    for (const k of Object.keys(d) as ReactionKind[]) if (d[k] === 0) delete d[k];
    return d;
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

/* =====================================================================
 *  PRESENTATION VOCABULARY — glyphs, label keys, the selected token.
 *
 *  These live HERE, in the pure module every reaction surface already
 *  imports, rather than in `ReactionBar2` where they used to.
 *
 *  They were exported from `ReactionBar2` while it was the only surface
 *  that drew a reaction. It is not any more — `ReactionRail`,
 *  `ReactionsSheet` and now the shared `FeedCardWithReply` all draw the
 *  same three glyphs — and reaching back into a COMPONENT for them made
 *  the dependency graph a ring: ReactionBar2 → ReactionsSheet →
 *  ReactionBar2. That ring is why the sheet has to be a `next/dynamic`
 *  import (see the note at its call site).
 *
 *  Every arrow now points one way, into this leaf module. No component
 *  imports another component for its vocabulary.
 * ===================================================================== */

/**
 * Glyphs for the three reactions. Outline by default, filled when selected.
 *
 * SAD USES A THUMBS-DOWN GLYPH ONLY BECAUSE THE SUPPLIED DESIGN DOES.
 * It is NOT a downvote, a dislike or a "show me fewer of these". Sad is
 * how a reader says a post about bereavement or hard news landed — that
 * is empathy and engagement. Never label it "dislike", "thumbs down",
 * "not interested" or "negative" (a screen-reader user has only the
 * label to go on), and never wire it to hiding, reporting or downranking.
 */
const REACTION_ICONS: Record<
    ReactionKind,
    {
        Outline: ComponentType<{ className?: string }>;
        Filled: ComponentType<{ className?: string }>;
    }
> = {
    HAPPY: { Outline: PiHeart, Filled: PiHeartFill },
    HOPEFUL: { Outline: PiHandsPraying, Filled: PiHandsPrayingFill },
    SAD: { Outline: PiThumbsDown, Filled: PiThumbsDownFill },
};

/** i18n key suffix under the `reactions` namespace. */
export const REACTION_LABEL_KEY: Record<ReactionKind, string> = {
    HAPPY: 'happy',
    HOPEFUL: 'hopeful',
    SAD: 'sad',
};

/** Outline by default, filled when selected. Reused by every reaction surface. */
export function reactionIcon(kind: ReactionKind, filled: boolean) {
    const set = REACTION_ICONS[kind];
    return filled ? set.Filled : set.Outline;
}

/**
 * Selected-state colour, RAIL ONLY.
 *
 * `border-danger` is the existing danger token (#e7000c, identical in
 * light and dark) — the same one the card already used for a liked
 * heart. Selected renders as a solid disc of it with a WHITE glyph
 * knocked out: white on #e7000c is 4.77:1, which clears AA for both
 * normal text (4.5:1) and non-text UI (3:1).
 *
 * The design's prose states the red rule twice and the product owner
 * confirmed it, though the design's own icon table renders a selected
 * Happy in BLUE. One token, one place, if that turns out to be deliberate.
 */
export const SELECTED_DISC = 'bg-border-danger';
