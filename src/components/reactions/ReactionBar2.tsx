'use client';

/* =====================================================================
 *  ReactionBar2 — the reaction + interaction count row.
 *
 *  Shared: rendered by `home2/FeedCard2` and by the original
 *  `cards/FeedCardWithReply`, which is the card the great majority of
 *  routes actually use. The name is historical — it was born for the
 *  /home2 clone — and is kept only because renaming it would churn every
 *  call site for nothing.
 *
 *  TWO SURFACES WITH CLEANLY SEPARATED JOBS:
 *
 *   • The CLUSTER (small glyphs beside the total) says WHAT THE POST HAS,
 *     and OPENS THE LIST OF WHO. Only reactions with a count appear,
 *     every glyph gets identical styling, and the viewer's own selection
 *     is NOT shown here — the cluster reports the room, not you.
 *     Pressing it (tap, click, Enter or Space) opens `ReactionsSheet`:
 *     a bottom sheet on touch, a popover anchored to the cluster itself
 *     on a mouse-and-keyboard screen. A press-and-HOLD is a different
 *     gesture — it reveals the reaction names and its trailing click is
 *     swallowed, so reading a name never opens the list.
 *
 *   • The RAIL (slides out from the card's right edge) says WHAT YOU
 *     PICKED. The selected option is a solid red disc with the glyph
 *     knocked out in white. This is the only place selection appears.
 *
 *  The counts row sits under the post content and above the
 *  Comment / Share / Save buttons, divided from them:
 *
 *      [♡🙏👎] 2,000   💬 320   ↗ 150   🔖 780
 *      ────────────────────────────────────────
 *      💬 Comment      ↗ Share      🔖 Save
 *
 *  ── WHAT IS REAL TODAY ──────────────────────────────────────────────
 *   • `total` is `engagementCounts.likes` — REAL, and counts EVERY
 *     reaction row including pre-migration ones that carry no kind.
 *   • `commentCount` / `shareCount` / `saveCount` — REAL.
 *   • `breakdown` (per-reaction counts) is OPTIONAL. When present the
 *     cluster shows EVERY kind that has a count, in the fixed order
 *     Happy, Hopeful, Sad, followed by their sum. When absent the
 *     component degrades to the same shape rather than collapsing to one
 *     glyph — see `clusterCounts` for exactly what it infers and why.
 *   • The number beside the glyphs is ALWAYS the sum of the counts those
 *     glyphs stand for, so the two can never contradict each other.
 *
 *  The whole LIKE mapping lives in ./reactionAdapter — `planReactionWrite`
 *  is the one function to swap. This component never mentions LIKE.
 * ===================================================================== */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Bookmark } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCount } from '@/macros/formatCount';
import {
    REACTION_LABEL_KEY,
    REACTION_ORDER,
    reactionIcon,
    SELECTED_DISC,
    type ReactionBreakdown,
    type ReactionKind,
} from '@/components/reactions/reactionAdapter';

/**
 * The "who reacted" panel, loaded on demand.
 *
 * Deliberately `next/dynamic` rather than a plain import: it is a panel most
 * readers never open, so it has no business in the chunk every feed card
 * already costs.
 *
 * It used to carry a SECOND justification — the sheet imported `reactionIcon` /
 * `REACTION_LABEL_KEY` back out of this file, so a static import would have
 * been a module cycle and lazy loading broke it at the bundle boundary. That
 * reason is gone: both now live in `./reactionAdapter`, the leaf module every
 * reaction surface imports, so the graph is acyclic on its own and no longer
 * depends on a rule a future edit had no way of knowing it had to keep. The
 * code-splitting reason stands by itself.
 *
 * `ssr: false` because it only ever mounts from a click. `loading: null`
 * because the panel is its own loading state.
 */
const ReactionsSheet = dynamic(() => import('@/components/reactions/ReactionsSheet'), {
    ssr: false,
    loading: () => null,
});

/**
 * The per-reaction counts the cluster actually DISPLAYS, which is not
 * always the raw `breakdown`. Two adjustments, both forced by the data
 * that really exists:
 *
 *  1. UNTYPED LIKES. `total` (`engagementCounts.likes`) counts every
 *     reaction row, including pre-migration ones stored before reaction
 *     types existed. Those rows carry no kind, so `happy + hopeful + sad`
 *     is legitimately SMALLER than `total`. The remainder is credited to
 *     HAPPY — the same rule `readSelectedReaction` already applies when
 *     it renders an untyped like as a heart. Crediting it anywhere else
 *     would invent Hopefuls and Sads nobody gave; dropping it would make
 *     the glyphs and the number beside them disagree.
 *
 *  2. NO BREAKDOWN AT ALL. When the API supplies no per-kind counts, the
 *     one kind still known for certain is the viewer's own, so it takes 1
 *     and everything else falls to HAPPY under rule 1. THIS IS THE CASE
 *     THAT USED TO COLLAPSE THE WHOLE CLUSTER TO ONE GLYPH: a post with
 *     fifty likes turned into a lone thumbs-down the moment the viewer
 *     picked Sad, because the fifty had nowhere to go. Now the fifty stay
 *     a heart and the viewer's Sad is added beside it.
 *
 * The result is the ONLY set of numbers this component renders — glyphs,
 * tooltip rows and total all read from it — so they cannot contradict.
 */
export function clusterCounts(
    breakdown: ReactionBreakdown | undefined,
    total: number,
    selected: ReactionKind | null,
): Record<ReactionKind, number> {
    const counts: Record<ReactionKind, number> = {
        HAPPY: breakdown?.HAPPY ?? 0,
        HOPEFUL: breakdown?.HOPEFUL ?? 0,
        SAD: breakdown?.SAD ?? 0,
    };
    // The viewer's OWN reaction must be represented before the remainder is
    // worked out, whether or not the breakdown has caught up with it.
    //
    // `total` counts it the instant they tap. The breakdown may not: it lags a
    // refetch, and it is all zeros whenever the per-kind counts did not survive
    // the trip. Leaving that gap made their reaction fall into the untyped
    // remainder below and get credited to HAPPY — so a lone Sad rendered as
    // "heart + thumbs-down, 1": a phantom Happy nobody gave, sitting next to
    // their real reaction showing zero.
    //
    // Raising it to at least 1 is safe in both directions. If the breakdown
    // already counts them it is a no-op, and if it does not, one of the likes
    // in `total` is demonstrably theirs.
    if (selected && counts[selected] < 1) counts[selected] = 1;

    const typed = counts.HAPPY + counts.HOPEFUL + counts.SAD;
    // Whatever `total` holds beyond the kinds we can name is a pre-migration
    // untyped like, which displays as Happy — the same rule readSelectedReaction
    // uses. Clamped at zero: an optimistic per-kind bump can briefly run ahead
    // of the server's total, and a negative remainder would eat real Happys.
    counts.HAPPY += Math.max(0, total - typed);
    return counts;
}

/**
 * Every glyph the cluster draws, in the fixed order HAPPY, HOPEFUL, SAD —
 * all of them, never just the viewer's own pick.
 *
 * A kind with a count always appears. The viewer's own selection appears
 * even at zero, because the server count lags an optimistic tap: react
 * Hopeful to a post nobody else has and without this the glyph would not
 * show until a refetch, reading as though the tap did nothing.
 */
export function visibleClusterReactions(
    counts: Record<ReactionKind, number>,
    selected: ReactionKind | null,
): ReactionKind[] {
    return REACTION_ORDER.filter((k) => counts[k] > 0 || k === selected);
}

/**
 * Glyph size per cluster population. More reactions ⇒ smaller glyphs, so
 * the group always fits the fixed footprint below. See CLUSTER_WIDTH.
 */
const CLUSTER_ICON_SIZE: Record<number, string> = {
    1: 'w-[1.125rem] h-[1.125rem]',
    2: 'w-[1rem] h-[1rem]',
    3: 'w-[0.875rem] h-[0.875rem]',
};

/**
 * The glyph group sizes to its CONTENT, deliberately.
 *
 * It used to be a fixed 2.75rem footprint — the worst case of three glyphs —
 * with the group centred inside it. That kept the total from shifting when a
 * post gained a second reaction, but it bought that with a permanent hole: a
 * single heart sat centred in a box nearly three times its width, leaving ~0.8rem
 * of dead space before the number, which read as the count belonging to
 * something else.
 *
 * A count that nudges sideways when a reaction type appears is a far smaller
 * cost than every single-reaction post looking broken, and single-reaction posts
 * are the common case by a wide margin.
 */
const CLUSTER_WIDTH = 'w-auto';

/**
 * Press-and-hold threshold. Long enough that a normal tap never crosses it
 * (a deliberate tap is well under 200ms), short enough that the hold does
 * not feel stuck. Below this the gesture is a TAP and opens the rail; at or
 * above it the gesture is a HOLD that reveals the name and the tap on
 * release is swallowed — reading a name must never cast a reaction.
 */
const HOLD_MS = 450;

/**
 * Finger drift that cancels a pending hold. A press inside a scrolling feed
 * is usually the start of a scroll, so movement hands the gesture back to the
 * browser. `touch-action` is deliberately left scrollable (see the button's
 * `touch-manipulation`), so the browser also fires `pointercancel` when it
 * takes over — this threshold is the belt to that braces.
 */
const HOLD_MOVE_CANCEL_PX = 10;

interface ReactionBar2Props {
    /**
     * The post whose reactors the cluster lists. OPTIONAL only so this
     * component stays usable from a call site that has not passed it yet:
     * with no id there is nothing to query, so the cluster keeps its old
     * behaviour of reporting the counts and opening nothing.
     */
    postId?: string;
    /**
     * The viewer's own reaction, or null. Drives the RAIL only — it is
     * deliberately never rendered in the cluster.
     */
    selected: ReactionKind | null;
    /**
     * REAL: `engagementCounts.likes` — every reaction row on the post,
     * INCLUDING pre-migration ones that carry no kind. It is therefore the
     * floor for what the cluster displays, not the exact figure: see
     * `clusterCounts`, which reconciles it against `breakdown`.
     */
    total: number;
    /**
     * Per-reaction counts. OPTIONAL. Drives which glyphs the cluster shows
     * and the numbers in the tooltip. Absent ⇒ the cluster still renders
     * (the untyped total displays as Happy, plus the viewer's own pick);
     * only the itemised tooltip is withheld, because with no per-kind data
     * its numbers would be invented. See `clusterCounts`.
     */
    breakdown?: ReactionBreakdown;
    /** REAL: `userEngagement.hasSaved`. */
    isSaved: boolean;
    /** REAL: `engagementCounts.comments`. */
    commentCount: number;
    /** REAL: `engagementCounts.shares`. */
    shareCount: number;
    /** REAL: `engagementCounts.saves`. */
    saveCount: number;
    /** Pass null to clear the reaction. */
    onSelectReaction: (kind: ReactionKind | null) => void;
    onOpenComments: () => void;
    onShare: () => void;
    onSave: () => void;
}

function ReactionBar2Inner({
    postId,
    selected,
    total,
    breakdown,
    isSaved,
    commentCount,
    shareCount,
    saveCount,
    onSelectReaction,
    onOpenComments,
    onShare,
    onSave,
}: ReactionBar2Props) {
    const t = useTranslations('reactions');
    const [open, setOpen] = useState(false);
    const clusterButtonRef = useRef<HTMLButtonElement>(null);

    // The "who reacted" panel. `sheetMounted` latches TRUE on the first open
    // and never goes back: unmounting on close would throw away the loaded
    // pages and skip the closing animation, while mounting it up-front would
    // instantiate a query hook for every card in the feed — which is exactly
    // the "do not fetch until it is opened" rule, expressed as a mount.
    const [sheetMounted, setSheetMounted] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);

    // Tooltip visibility is CONTROLLED so two very different input paths can
    // drive one surface: Radix still owns pointer-hover and keyboard focus and
    // reports them through `onOpenChange`, while touch press-and-hold is driven
    // here. Radix tooltips deliberately never open on touch, so without this
    // half the users would have no way to read a name.
    const [tipOpen, setTipOpen] = useState(false);
    const holdTimerRef = useRef<number | null>(null);
    const holdFiredRef = useRef(false);
    const holdOriginRef = useRef<{ x: number; y: number } | null>(null);

    const clearHold = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    // Clean up a pending timer if the card unmounts mid-press (feed virtualises).
    useEffect(() => clearHold, [clearHold]);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            // Reset here rather than on release: a hold that ends off the button
            // never produces a click, and a stale flag would swallow the NEXT
            // genuine tap.
            holdFiredRef.current = false;
            // Mouse already has hover; only touch/pen need the hold gesture.
            if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
            holdOriginRef.current = { x: e.clientX, y: e.clientY };
            clearHold();
            holdTimerRef.current = window.setTimeout(() => {
                holdTimerRef.current = null;
                holdFiredRef.current = true;
                setTipOpen(true);
            }, HOLD_MS);
        },
        [clearHold],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (holdTimerRef.current === null) return;
            const origin = holdOriginRef.current;
            if (!origin) return;
            if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > HOLD_MOVE_CANCEL_PX) {
                clearHold();
            }
        },
        [clearHold],
    );

    // Release (or the browser stealing the gesture for a scroll) ends the hold
    // and dismisses the label immediately — it must never linger and demand a
    // second tap to clear.
    const handlePointerEnd = useCallback(() => {
        clearHold();
        if (holdFiredRef.current) setTipOpen(false);
    }, [clearHold]);

    /**
     * TOGGLE, not open.
     *
     * The desktop variant is a popover anchored to this very button, and it
     * deliberately does NOT dismiss when the press lands on its anchor — so
     * pressing the cluster a second time has to close it from here. If this
     * only ever opened, that second press would close the popover via
     * dismiss-on-outside and reopen it in the same gesture, which reads as a
     * dead control.
     */
    const toggleSheet = useCallback(() => {
        // No post id means no query to run, so the cluster stays a read-only
        // summary rather than opening an empty panel.
        if (!postId) return;
        // The name tooltip is superseded by the panel — on a mouse it would
        // otherwise sit over the popover it just opened, because the pointer
        // is still resting on the button that anchors both.
        setTipOpen(false);
        setSheetMounted(true);
        setSheetOpen((wasOpen) => !wasOpen);
    }, [postId]);

    const handleClusterClick = useCallback(() => {
        if (holdFiredRef.current) {
            // This click is the tail of a press-and-hold. Swallow it: the user
            // was reading the reaction names, not asking who reacted.
            holdFiredRef.current = false;
            return;
        }
        // Opens the LIST OF WHO, not a second reaction menu — choosing still
        // belongs to the always-visible rail pinned to the card edge. The
        // cluster answers "who?", the rail answers "which?".
        toggleSheet();
    }, [toggleSheet]);

    // ONE source of truth for the whole cluster: what each kind is worth,
    // which glyphs that makes visible, and the number beside them.
    const counts = clusterCounts(breakdown, total, selected);
    const clusterKinds = visibleClusterReactions(counts, selected);

    // The displayed total is the SUM of the counts the glyphs stand for, not
    // the raw `total` prop. The two differ only when an optimistic per-kind
    // bump has run ahead of the server's total, and in that window the sum is
    // the one that agrees with what is on screen. Every kind with a count is
    // always drawn, so "sum of all kinds" and "sum of the kinds shown" are the
    // same number — a kind that is hidden contributes 0.
    const displayTotal = counts.HAPPY + counts.HOPEFUL + counts.SAD;

    // A post with NO reactions shows nothing — not a heart beside a 0. The
    // cluster used to render unconditionally because it WAS the control that
    // opened the rail; the rail is now permanent chrome on the card, so hiding
    // an empty summary costs nothing. `selected` is OR-ed in so a first tap
    // shows immediately, before the server count lands.
    const hasAnyReaction = displayTotal > 0 || selected !== null;

    const iconSize = CLUSTER_ICON_SIZE[clusterKinds.length] ?? CLUSTER_ICON_SIZE[3];

    // The accessible name carries the TOTAL and the control's purpose, and
    // deliberately does NOT enumerate which reactions are present or which
    // one the viewer picked — sighted users get exactly that summary from
    // the cluster, and parity is the point. Your own selection is announced
    // by the rail's checked item when it opens, which is also the only
    // place it is shown visually.
    //
    // "See who reacted" is only promised when there is a post id to query.
    // Without one the label is the bare count, because naming an action the
    // control cannot perform is worse than naming no action at all.
    const triggerLabel = postId
        ? t('viewReactors', { count: displayTotal })
        : t('reactionCount', { count: displayTotal });

    const handlePick = (kind: ReactionKind) => {
        // Picking the already-selected reaction clears it.
        onSelectReaction(selected === kind ? null : kind);
    };

    const handleClusterKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            // preventDefault does two jobs: it stops Space scrolling the feed
            // out from under the panel, and it stops the browser synthesising a
            // click from this key — so the sheet toggles exactly once rather
            // than once here and once again in handleClusterClick.
            e.preventDefault();
            toggleSheet();
        },
        [toggleSheet],
    );

    // Nothing to report at all ⇒ render NOTHING. The wrapper carries a bottom
    // border and padding, so an empty row would leave a stray divider floating
    // above the action buttons — which is what a bare "heart 0" looked like.
    //
    // Placed HERE, below every hook: an early return above a useCallback breaks
    // the rules of hooks, because the hook order would differ between a post
    // with reactions and one without.
    const hasAnythingToShow =
        hasAnyReaction || commentCount > 0 || shareCount > 0 || saveCount > 0;
    if (!hasAnythingToShow) return null;

    return (
        <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b-[0.01rem] border-border-subtle flex-wrap">
            <DropdownMenu open={open} onOpenChange={setOpen}>
                {/* ── THE EDGE ANCHOR ──────────────────────────────────────
                     Radix anchors a menu to its Trigger and `DropdownMenu`
                     exposes no separate Anchor part, so the Trigger IS this
                     invisible zero-size marker pinned to the CARD's right
                     border, level with the post content. The visible cluster
                     below drives `open` itself.

                     Without this the rail would hang off the counts row at
                     the bottom of the card, which is where the trigger
                     actually lives — not beside the content where the design
                     puts it. `absolute` resolves against the card root
                     (both FeedCard2 and FeedCardWithReply mark it `relative`), so this element must not
                     sit inside any positioned element of its own or it would
                     anchor to that instead. ── */}
                <DropdownMenuTrigger asChild>
                    <span
                        aria-hidden="true"
                        tabIndex={-1}
                        className="pointer-events-none absolute right-0 top-[3.5rem] block h-0 w-0"
                    />
                </DropdownMenuTrigger>

                {/* ── Cluster + total. The visible control.
                     The three glyphs are uniform and unlabelled, so the NAMES
                     live in a tooltip on this one button. Not per-glyph: the
                     glyphs are aria-hidden decorations inside a single
                     control, and making each hoverable would add three focus
                     stops and contradict "the cluster is one control".

                     This tooltip also REPLACES the hand-rolled peer-hover
                     breakdown panel that used to live here. Two hover
                     surfaces on the same button would have collided, and the
                     old one was `aria-hidden` — so its numbers reached nobody
                     using a screen reader. Radix is portalled (no clipping)
                     and becomes `aria-describedby`, so the breakdown is now
                     announced rather than hidden.

                     THE NAME IS REACHABLE ON EVERY INPUT:
                       pointer        → hover (Radix)
                       keyboard       → focus (Radix)
                       touch          → press and hold (driven here; Radix
                                        tooltips never open on touch)
                       assistive tech → the rail's captions and each item's
                                        accessible name
                     It is never tooltip-ONLY: the rail captions stay visible,
                     so a touch user who simply taps still reads every name. ── */}
                {hasAnyReaction && (
                <Tooltip open={tipOpen} onOpenChange={setTipOpen}>
                    <TooltipTrigger asChild>
                        <button
                            ref={clusterButtonRef}
                            type="button"
                            aria-label={triggerLabel}
                            // The panel is a dialog on touch and a popover on a
                            // pointer screen; both are announced as "dialog", and
                            // only when there is actually one to open. Pressing
                            // again closes it, so the state is announced too.
                            aria-haspopup={postId ? 'dialog' : undefined}
                            aria-expanded={postId ? sheetOpen : undefined}
                            onClick={handleClusterClick}
                            onKeyDown={handleClusterKeyDown}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerEnd}
                            onPointerCancel={handlePointerEnd}
                            onPointerLeave={handlePointerEnd}
                            // A sustained press raises the iOS callout / Android
                            // context menu, which would cover the very label the
                            // hold is meant to reveal. `-webkit-touch-callout`
                            // handles iOS Safari, this handler handles the
                            // context menu everywhere else (and right-click on
                            // desktop). CSS alone is NOT sufficient.
                            onContextMenu={(e) => e.preventDefault()}
                            // select-none stops the press turning into a text
                            // selection + selection handles; touch-manipulation
                            // drops the double-tap delay WITHOUT taking over
                            // panning, so a finger drag still scrolls the feed.
                            className="group inline-flex touch-manipulation select-none items-center gap-[0.25rem] rounded-full -mx-[0.25rem] px-[0.25rem] py-[0.125rem] text-sm text-text-secondary transition-colors [-webkit-touch-callout:none] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default"
                        >
                            {/* FIXED-WIDTH footprint with the group centred: one,
                                two or three glyphs all occupy the same space, so
                                the total never shifts and the row never reflows.
                                Every glyph is styled IDENTICALLY — outline, one
                                colour, no fill, no selection state. The cluster
                                reports what the post has; it does not highlight
                                you. Decorative: the button's aria-label carries
                                the meaning. */}
                            <span
                                aria-hidden="true"
                                className={`inline-flex ${CLUSTER_WIDTH} items-center justify-center gap-[1px]`}
                            >
                                {clusterKinds.map((kind) => {
                                    const Icon = reactionIcon(kind, false);
                                    return (
                                        <Icon
                                            key={kind}
                                            className={`${iconSize} shrink-0 text-text-secondary transition-colors group-hover:text-text-primary`}
                                        />
                                    );
                                })}
                            </span>
                            <span className="tabular-nums">{formatCount(displayTotal)}</span>
                        </button>
                    </TooltipTrigger>

                    {/* Names come from the SAME translated keys the rail
                        captions use — never hardcoded, and correct in all five
                        locales (the non-English ones are nouns: Freude / Joie /
                        Gioia / Blij, and Sad reads as compassion throughout).

                        Content is the DESCRIPTION (aria-describedby), never the
                        name: the button keeps its own aria-label, and the two
                        strings differ, so nothing is announced twice.

                        The reveal zooms out: it scales up from 75% into place
                        as it fades in. The shared primitive's own `zoom-in-95`
                        is unqualified (0,1,0), so the `data-[state=open]:`
                        qualifier here (0,2,0) wins deterministically instead of
                        depending on which utility Tailwind emits last.

                        prefers-reduced-motion: `animate-none!` — Tailwind v4's
                        important suffix. The bare form would LOSE to the
                        primitive's `data-[state=closed]:animate-out` on
                        specificity; important sidesteps the whole fight. The
                        label still APPEARS, it simply arrives without the
                        scale or fade. */}
                    <TooltipContent
                        side="top"
                        align="start"
                        sideOffset={6}
                        className="duration-150 data-[state=open]:zoom-in-75 motion-reduce:animate-none! motion-reduce:transition-none!"
                    >
                        {breakdown ? (
                            <div className="flex flex-col gap-[0.125rem]">
                                {clusterKinds.map((kind) => (
                                    <div key={kind} className="flex items-center gap-3">
                                        <span>{t(REACTION_LABEL_KEY[kind])}</span>
                                        <span className="ml-auto tabular-nums">
                                            {formatCount(counts[kind])}
                                        </span>
                                    </div>
                                ))}
                                <div className="mt-[0.125rem] flex items-center gap-3 border-t border-background/30 pt-[0.125rem]">
                                    <span>{t('total')}</span>
                                    <span className="ml-auto tabular-nums font-medium">
                                        {formatCount(displayTotal)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            // No per-kind data, so NAMES ONLY. The glyphs are an
                            // honest inference (untyped likes are Happy, plus
                            // your own pick); itemised numbers beside them would
                            // dress that inference up as a measurement.
                            clusterKinds.map((kind) => t(REACTION_LABEL_KEY[kind])).join(', ')
                        )}
                    </TooltipContent>
                </Tooltip>
                )}

                {/* ── THE RAIL ─────────────────────────────────────────────
                     A vertical rounded pill, taller than wide, straddling the
                     card's right border beside the content. `side="right"`
                     from the edge anchor puts its left edge ON the border;
                     the negative sideOffset pulls it back by half its own
                     (fixed) width so it sits half in, half out.

                     The width is FIXED rather than content-sized precisely so
                     that offset is exact in every locale — a German label is
                     far wider than an English one, and a content-sized rail
                     would straddle by a different amount in each language.

                     Collision handling is left ON: on a narrow viewport where
                     half a rail would fall off-screen, Radix shifts or flips
                     it inward. Being usable beats being pixel-perfect.

                     prefers-reduced-motion: `animate-none!` — Tailwind v4's
                     important suffix, same as the tooltip. The bare form
                     would lose to `data-[state=open]:animate-in` on
                     specificity, and matching the qualifier only ties it,
                     leaving the outcome to Tailwind's emit order. Important
                     settles it outright: the rail appears without sliding. ── */}
                <DropdownMenuContent
                    side="right"
                    align="start"
                    sideOffset={-24}
                    collisionPadding={8}
                    aria-label={t('choose')}
                    onCloseAutoFocus={(e) => {
                        // Radix would return focus to the Trigger, which here
                        // is the invisible edge anchor. Send it to the visible
                        // cluster the user actually operated.
                        e.preventDefault();
                        clusterButtonRef.current?.focus();
                    }}
                    onInteractOutside={(e) => {
                        // The cluster lives outside the rail, so clicking it
                        // to close would otherwise fire dismiss-on-outside AND
                        // the button's own toggle — closing then reopening.
                        // Let the button own that interaction.
                        if (clusterButtonRef.current?.contains(e.target as Node)) {
                            e.preventDefault();
                        }
                    }}
                    className="flex w-[3rem] flex-col items-center gap-[0.25rem] rounded-full border-border-subtle bg-surface-default p-[0.5rem] shadow-lg motion-reduce:animate-none! motion-reduce:transition-none!"
                >
                    {/* Radio semantics: exactly one may be selected. Built on
                        the Radix primitive rather than the shared ui wrapper
                        because that wrapper reserves `pl-8` for an indicator
                        dot, which would break the pill. */}
                    <DropdownMenuPrimitive.RadioGroup value={selected ?? ''}>
                        {REACTION_ORDER.map((kind) => {
                            const isOn = selected === kind;
                            const Icon = reactionIcon(kind, isOn);
                            const label = t(REACTION_LABEL_KEY[kind]);
                            const count = counts[kind];
                            // Only the SELECTED item needs an explicit name: it
                            // has to announce that activating again removes the
                            // reaction, which no visible text says. Unselected
                            // items are named by their own content.
                            const selectedName = breakdown
                                ? t('optionSelectedWithCount', { reaction: label, count })
                                : t('optionSelected', { reaction: label });
                            return (
                                <DropdownMenuPrimitive.RadioItem
                                    key={kind}
                                    value={kind}
                                    // aria-label ONLY on the selected item, and no
                                    // `title`: an unselected item's title would
                                    // repeat its own visible caption, and on the
                                    // selected one it was byte-identical to the
                                    // aria-label — name and description the same
                                    // string is the classic double-announcement.
                                    // The rail is glyphs only, so there is no
                                    // visible text to name an item. EVERY item
                                    // therefore needs an explicit name — before,
                                    // unselected items were named by their own
                                    // caption, and dropping the caption without
                                    // this would leave them announced as blank.
                                    aria-label={isOn ? selectedName : label}
                                    // preventDefault KEEPS THE RAIL OPEN after a
                                    // pick, so a second tap can change or remove
                                    // without reopening. Escape, a click outside
                                    // or Tab still dismiss it, so it is not a
                                    // focus trap.
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        handlePick(kind);
                                    }}
                                    className="flex cursor-pointer select-none items-center justify-center rounded-full p-[0.125rem] outline-none transition-colors data-[highlighted]:bg-surface-alt data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                >
                                    {/* Selected = solid red disc, glyph knocked
                                        out in white. The box keeps its size
                                        either way so picking never nudges the
                                        layout. Outline vs filled still tracks
                                        selection, so it is not carried by
                                        colour alone. */}
                                    <span
                                        className={`flex h-[1.75rem] w-[1.75rem] items-center justify-center rounded-full transition-colors ${
                                            isOn ? SELECTED_DISC : ''
                                        }`}
                                    >
                                        <Icon
                                            className={`w-[1.125rem] h-[1.125rem] shrink-0 ${
                                                isOn ? 'text-white' : 'text-text-secondary'
                                            }`}
                                        />
                                    </span>
                                </DropdownMenuPrimitive.RadioItem>
                            );
                        })}
                    </DropdownMenuPrimitive.RadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* ── The remaining real counts, same row, same rhythm. ── */}
            {commentCount > 0 && (
                <button
                    type="button"
                    onClick={onOpenComments}
                    aria-label={t('comments', { count: commentCount })}
                    className="inline-flex items-center gap-[0.375rem] rounded-full text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default"
                >
                    <img
                        width={20}
                        height={20}
                        src="/COMMENT.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-[1.125rem] h-[1.125rem] object-contain"
                    />
                    <span className="tabular-nums">{formatCount(commentCount)}</span>
                </button>
            )}

            {shareCount > 0 && (
                <button
                    type="button"
                    onClick={onShare}
                    aria-label={t('shares', { count: shareCount })}
                    className="inline-flex items-center gap-[0.375rem] rounded-full text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default"
                >
                    <img
                        width={20}
                        height={20}
                        src="/SHARE.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-[1.125rem] h-[1.125rem] object-contain"
                    />
                    <span className="tabular-nums">{formatCount(shareCount)}</span>
                </button>
            )}

            {saveCount > 0 && (
                <button
                    type="button"
                    onClick={onSave}
                    aria-label={t('saves', { count: saveCount })}
                    className="inline-flex items-center gap-[0.375rem] rounded-full text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default"
                >
                    <Bookmark
                        aria-hidden="true"
                        className={`w-[1.125rem] h-[1.125rem] ${isSaved ? 'fill-current text-text-brand' : 'text-text-secondary'}`}
                    />
                    <span className="tabular-nums">{formatCount(saveCount)}</span>
                </button>
            )}

            {/* ── WHO REACTED ──────────────────────────────────────────
                 Rendered OUTSIDE the DropdownMenu above so the rail and
                 this panel are siblings rather than nested layers, and
                 last in the row because both of its shapes portal out to
                 <body> and so contribute nothing to this flex line.

                 `counts` and `displayTotal` are handed over as the opening
                 numbers so the panel's tiles and tabs paint the figures
                 already on screen on their first frame, instead of dashes
                 that resolve a moment later into the same values. The
                 server's own summary replaces them when it lands. ── */}
            {sheetMounted && postId && (
                <ReactionsSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    postId={postId}
                    anchorRef={clusterButtonRef}
                    initialCounts={counts}
                    initialTotal={displayTotal}
                />
            )}
        </div>
    );
}

const ReactionBar2 = memo(ReactionBar2Inner);
ReactionBar2.displayName = 'ReactionBar2';
export default ReactionBar2;
