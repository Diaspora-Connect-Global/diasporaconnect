'use client';

/* =====================================================================
 *  ReactionBar2 — reaction control for the /home2 feed clone.
 *
 *  TWO SURFACES WITH CLEANLY SEPARATED JOBS:
 *
 *   • The CLUSTER (small glyphs beside the total) says WHAT THE POST HAS.
 *     Purely informational: only reactions with a count appear, every
 *     glyph gets identical styling, and the viewer's own selection is
 *     NOT shown here. It is a summary, not a control surface.
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
 *   • `total` is `engagementCounts.likes` — REAL.
 *   • `commentCount` / `shareCount` / `saveCount` — REAL.
 *   • `breakdown` (per-reaction counts) is OPTIONAL and ABSENT today, so
 *     the cluster falls back to a single Happy glyph (see
 *     `visibleClusterReactions`). No zeroed panel, no placeholders, no
 *     ratio-split of the total, and never all three by default.
 *   • HAPPY is the existing Like and round-trips for real; HOPEFUL and
 *     SAD are session-only until post-feed-service ships reaction types.
 *
 *  The whole LIKE mapping lives in ./reactionAdapter — `planReactionWrite`
 *  is the one function to swap. This component never mentions LIKE.
 * ===================================================================== */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark } from 'lucide-react';
import {
    PiHeart,
    PiHeartFill,
    PiHandsPraying,
    PiHandsPrayingFill,
    PiThumbsDown,
    PiThumbsDownFill,
} from 'react-icons/pi';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCount } from '@/macros/formatCount';
import {
    DEFAULT_REACTION,
    REACTION_ORDER,
    type ReactionBreakdown,
    type ReactionKind,
} from '@/components/home2/reactionAdapter';

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
        Outline: React.ComponentType<{ className?: string }>;
        Filled: React.ComponentType<{ className?: string }>;
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

/** Outline by default, filled when selected. Reused by the action-row button. */
export function reactionIcon(kind: ReactionKind, filled: boolean) {
    const set = REACTION_ICONS[kind];
    return filled ? set.Filled : set.Outline;
}

/**
 * Which glyphs the summary cluster shows.
 *
 * FALLBACK, stated explicitly because it is a judgement call: with no
 * `breakdown` we know the TOTAL but not its composition, so we render a
 * single HAPPY glyph — every pre-migration like displays as Happy, so
 * that is the one thing the total can honestly be attributed to. We do
 * NOT render all three by default; that would assert reactions the post
 * may not have. The cluster becomes accurate on its own the day real
 * per-reaction counts arrive.
 *
 * A zero-count reaction never appears. If a breakdown exists but is all
 * zeroes (a post nobody has reacted to) we still return one glyph — the
 * cluster doubles as the control that opens the rail, so it can never be
 * empty, and Happy is what tapping it would give you.
 */
function visibleClusterReactions(
    breakdown: ReactionBreakdown | undefined,
    selected: ReactionKind | null,
): ReactionKind[] {
    if (breakdown) {
        // Everything the post actually has, PLUS the viewer's own pick. The
        // union matters because the server count lags an optimistic tap: react
        // Hopeful to a post nobody else has, and without this the glyph would
        // not appear until a refetch — reading as though the tap did nothing.
        const present = REACTION_ORDER.filter(
            (k) => (breakdown[k] ?? 0) > 0 || k === selected,
        );
        if (present.length > 0) return present;
    }
    // No breakdown yet (the API cannot supply per-reaction counts on every
    // surface). Show the viewer's OWN reaction, which is the one thing we know
    // for certain — falling back to Happy here would show a heart to someone
    // who just picked Sad.
    return [selected ?? DEFAULT_REACTION];
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
 * FIXED cluster footprint. The glyph group is centred inside it, so the
 * total beside it never moves and the row never reflows when a post goes
 * from one reaction type to three. Sized for the worst case: three
 * 0.875rem glyphs at 1px apart = 2.75rem exactly.
 */
const CLUSTER_WIDTH = 'w-[2.75rem]';

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

interface ReactionBar2Props {
    /**
     * The viewer's own reaction, or null. Drives the RAIL only — it is
     * deliberately never rendered in the cluster.
     */
    selected: ReactionKind | null;
    /** REAL: `engagementCounts.likes`, the authoritative total. */
    total: number;
    /**
     * Per-reaction counts. OPTIONAL — absent today. Drives which glyphs
     * the cluster shows and the hover panel; absent ⇒ no panel and a
     * single Happy glyph. See `visibleClusterReactions`.
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

    const handleClusterClick = useCallback(() => {
        if (holdFiredRef.current) {
            // This click is the tail of a press-and-hold. Swallow it: the user
            // was reading the name, not choosing a reaction.
            holdFiredRef.current = false;
            return;
        }
        // Deliberately does NOT open a menu. The three reactions now live in
        // the always-visible ReactionRail pinned to the card edge, so opening a
        // second rail here would duplicate it. The cluster is a summary — it
        // reports what the post has; the rail is where you choose.
    }, []);

    const clusterKinds = visibleClusterReactions(breakdown, selected);
    const iconSize = CLUSTER_ICON_SIZE[clusterKinds.length] ?? CLUSTER_ICON_SIZE[3];

    // The accessible name carries the TOTAL and the control's purpose, and
    // deliberately does NOT enumerate which reactions are present or which
    // one the viewer picked — sighted users get exactly that summary from
    // the cluster, and parity is the point. Your own selection is announced
    // by the rail's checked item when it opens, which is also the only
    // place it is shown visually.
    const triggerLabel = t('trigger', { count: total });

    const handlePick = (kind: ReactionKind) => {
        // Picking the already-selected reaction clears it.
        onSelectReaction(selected === kind ? null : kind);
    };

    const handleClusterKeyDown = useCallback(() => {
        // Enter/Space already open it via click. ArrowDown/Up are the menu
        // idiom and would otherwise do nothing, since the Radix trigger that
        // normally handles them is the hidden edge anchor.
        // No-op: there is no menu to open from here any more.
    }, []);

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
                     (FeedCard2 marks it `relative`), so this element must not
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
                <Tooltip open={tipOpen} onOpenChange={setTipOpen}>
                    <TooltipTrigger asChild>
                        <button
                            ref={clusterButtonRef}
                            type="button"
                            aria-label={triggerLabel}
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
                            className="group inline-flex touch-manipulation select-none items-center gap-[0.375rem] rounded-full -mx-[0.25rem] px-[0.25rem] py-[0.125rem] text-sm text-text-secondary transition-colors [-webkit-touch-callout:none] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default"
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
                            <span className="tabular-nums">{formatCount(total)}</span>
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
                                            {formatCount(breakdown[kind] ?? 0)}
                                        </span>
                                    </div>
                                ))}
                                <div className="mt-[0.125rem] flex items-center gap-3 border-t border-background/30 pt-[0.125rem]">
                                    <span>{t('total')}</span>
                                    <span className="ml-auto tabular-nums font-medium">
                                        {formatCount(total)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            // Without a breakdown the cluster is a single Happy
                            // glyph, so this list always has exactly one entry;
                            // the join is future-proofing, not a real list.
                            clusterKinds.map((kind) => t(REACTION_LABEL_KEY[kind])).join(', ')
                        )}
                    </TooltipContent>
                </Tooltip>

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
                            const count = breakdown?.[kind] ?? 0;
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
        </div>
    );
}

const ReactionBar2 = memo(ReactionBar2Inner);
ReactionBar2.displayName = 'ReactionBar2';
export default ReactionBar2;
