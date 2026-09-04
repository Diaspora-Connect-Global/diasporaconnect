'use client';

/* =====================================================================
 *  ReactionBar2 — grouped reaction control for the /home2 feed clone.
 *
 *  Three tightly-clustered reaction glyphs (Happy / Hopeful / Sad) plus
 *  one total, then the remaining interaction counts in the SAME row —
 *  which sits directly under the post content and above the
 *  Comment / Share / Save action buttons, with a divider between them:
 *
 *      [♡ 🙏 👎] 2,000   💬 320   ↗ 150   🔖 780
 *      ─────────────────────────────────────────
 *      💬 Comment      ↗ Share      🔖 Save
 *
 *  Tapping the cluster slides a VERTICAL RAIL out from the side edge of
 *  the card: a rounded pill, TALLER THAN IT IS WIDE, with the three
 *  options in a single column — Happy top, Hopeful middle, Sad bottom.
 *  It stays open after a pick so a second tap can change or remove, and
 *  the selection is highlighted in place (red, filled). Radix drives it,
 *  so Up/Down arrows follow the visual axis and Escape closes.
 *
 *  ── WHAT IS REAL TODAY ──────────────────────────────────────────────
 *   • `total` is `engagementCounts.likes` — REAL.
 *   • `commentCount` / `shareCount` / `saveCount` — REAL.
 *   • `breakdown` (per-reaction counts) is OPTIONAL and ABSENT today.
 *     When absent NOTHING breakdown-shaped renders — no zeroed panel,
 *     no placeholders, no ratio-split of the total. When the backend
 *     starts returning it, it lights up with no code change.
 *   • HAPPY is the existing Like and round-trips for real; HOPEFUL and
 *     SAD are session-only until post-feed-service ships reaction types.
 *
 *  The whole LIKE mapping lives in ./reactionAdapter — `planReactionWrite`
 *  is the one function to swap. This component never mentions LIKE.
 * ===================================================================== */

import { memo } from 'react';
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
import { formatCount } from '@/macros/formatCount';
import {
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
 * Selected-state colour for every reaction.
 *
 * `text-border-danger` is the token the card already uses for a liked
 * heart (#e7000c, identical in light and dark). All three reactions use
 * it: the design's prose states the rule twice ("Red when selected") and
 * the product owner confirmed it, even though the design's own icon table
 * renders a selected Happy in BLUE. One token, one place — if the blue
 * thumbs-up turns out to be deliberate, change it here.
 */
const SELECTED_COLOR = 'text-border-danger';

interface ReactionBar2Props {
    /** The reaction rendered as selected, or null when the post has none. */
    selected: ReactionKind | null;
    /** REAL: `engagementCounts.likes`, the authoritative total. */
    total: number;
    /**
     * Per-reaction counts. OPTIONAL — absent today. Absent ⇒ no breakdown
     * UI at all. Present ⇒ counts appear in the rail and in the hover panel.
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

    const selectedLabel = selected ? t(REACTION_LABEL_KEY[selected]) : undefined;

    // The accessible name has to carry BOTH the total and the current pick:
    // three decorative glyphs and a bare number convey neither to a screen
    // reader, and the count is the thing the control is named after. The
    // visible number is abbreviated ("2K"); this one is exact.
    const triggerLabel = selected
        ? t('triggerSelected', { count: total, reaction: selectedLabel as string })
        : t('trigger', { count: total });

    const handlePick = (kind: ReactionKind) => {
        // Picking the already-selected reaction clears it.
        onSelectReaction(selected === kind ? null : kind);
    };

    return (
        <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b-[0.01rem] border-border-subtle flex-wrap">
            {/* ── Reaction cluster + total. The whole thing is one control. ── */}
            <div className="relative">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={triggerLabel}
                            title={triggerLabel}
                            className="group peer inline-flex items-center gap-[0.375rem] rounded-full -mx-[0.25rem] px-[0.25rem] py-[0.125rem] text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default"
                        >
                            {/* Three glyphs 2px apart so they read as ONE cluster,
                                not three buttons. Decorative — the button's
                                aria-label carries the meaning. */}
                            <span aria-hidden="true" className="inline-flex items-center gap-[2px]">
                                {REACTION_ORDER.map((kind) => {
                                    const isOn = selected === kind;
                                    const Icon = reactionIcon(kind, isOn);
                                    return (
                                        <Icon
                                            key={kind}
                                            className={`w-[1.125rem] h-[1.125rem] transition-colors ${
                                                isOn
                                                    ? SELECTED_COLOR
                                                    : 'text-text-secondary group-hover:text-text-primary'
                                            }`}
                                        />
                                    );
                                })}
                            </span>
                            <span
                                className={`tabular-nums ${selected ? `${SELECTED_COLOR} font-semibold` : ''}`}
                            >
                                {formatCount(total)}
                            </span>
                        </button>
                    </DropdownMenuTrigger>

                    {/* ── The rail. Slides out from the SIDE of the card as a
                         vertical rounded pill. `side="right"` with Radix's own
                         collision detection, so it flips to the left when a
                         narrow viewport leaves no room — the slide-in animation
                         is already keyed off `data-side`, so both directions
                         animate correctly.

                         prefers-reduced-motion: the `motion-reduce:` overrides
                         are written with the SAME `data-[state=…]` qualifier as
                         the animations they cancel. A bare
                         `motion-reduce:animate-none` would lose the specificity
                         fight against `data-[state=open]:animate-in` and the
                         rail would keep sliding for users who asked it not to. ── */}
                    <DropdownMenuContent
                        side="right"
                        align="center"
                        sideOffset={10}
                        collisionPadding={12}
                        aria-label={t('choose')}
                        className="flex w-auto min-w-0 flex-col items-stretch gap-[0.125rem] rounded-full border-border-subtle bg-surface-default p-[0.375rem] shadow-lg motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
                    >
                        {/* Radio semantics: exactly one may be selected. Built on
                            the Radix primitive rather than the shared ui wrapper
                            because that wrapper reserves `pl-8` for an indicator
                            dot, which would break the pill. Selection is carried
                            by aria-checked plus the red fill. */}
                        <DropdownMenuPrimitive.RadioGroup value={selected ?? ''}>
                            {REACTION_ORDER.map((kind) => {
                                const isOn = selected === kind;
                                const Icon = reactionIcon(kind, isOn);
                                const label = t(REACTION_LABEL_KEY[kind]);
                                const count = breakdown?.[kind] ?? 0;
                                // Only the SELECTED item needs an explicit name:
                                // it has to announce that activating again
                                // removes the reaction, which no visible text
                                // says. Unselected items are named by their own
                                // content, which already includes the count when
                                // a breakdown is present.
                                const selectedName = breakdown
                                    ? t('optionSelectedWithCount', { reaction: label, count })
                                    : t('optionSelected', { reaction: label });
                                return (
                                    <DropdownMenuPrimitive.RadioItem
                                        key={kind}
                                        value={kind}
                                        aria-label={isOn ? selectedName : undefined}
                                        title={isOn ? selectedName : label}
                                        // preventDefault KEEPS THE RAIL OPEN after
                                        // a pick, so a second tap can change or
                                        // remove without reopening. Escape, a click
                                        // outside or Tab still dismiss it, so it is
                                        // not a focus trap.
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            handlePick(kind);
                                        }}
                                        className="flex cursor-pointer select-none flex-col items-center gap-[0.125rem] rounded-2xl px-[0.5rem] py-[0.375rem] outline-none transition-colors data-[highlighted]:bg-surface-alt data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                    >
                                        <Icon
                                            className={`w-[1.25rem] h-[1.25rem] shrink-0 ${
                                                isOn ? SELECTED_COLOR : 'text-text-secondary'
                                            }`}
                                        />
                                        {/* The caption sits UNDER the glyph rather
                                            than beside it: a heart, praying hands
                                            and a thumbs-down are not self-evident,
                                            so the labels stay visible — but side-by-
                                            side text would make the rail wider than
                                            it is tall, which is the opposite of the
                                            pill the design asks for. */}
                                        <span
                                            className={`text-[0.625rem] font-medium leading-tight ${
                                                isOn ? SELECTED_COLOR : 'text-text-primary'
                                            }`}
                                        >
                                            {label}
                                        </span>
                                        {/* Per-reaction count ONLY when the
                                            backend actually supplies one. */}
                                        {breakdown && (
                                            <span className="tabular-nums text-[0.625rem] leading-tight text-text-secondary">
                                                {formatCount(count)}
                                            </span>
                                        )}
                                    </DropdownMenuPrimitive.RadioItem>
                                );
                            })}
                        </DropdownMenuPrimitive.RadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Hover breakdown panel. Renders ONLY when the backend gives
                     us per-reaction counts; today `breakdown` is undefined and
                     this whole node is absent from the tree. aria-hidden because
                     the same numbers are in the rail, which is reachable by
                     keyboard and touch — hover alone is neither. ── */}
                {breakdown && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden min-w-[9rem] rounded-lg border border-border-subtle bg-surface-default p-2 shadow-md peer-hover:block peer-focus-visible:block"
                    >
                        {REACTION_ORDER.map((kind) => {
                            const Icon = reactionIcon(kind, selected === kind);
                            return (
                                <div
                                    key={kind}
                                    className="flex items-center gap-2 px-1 py-0.5 text-xs text-text-secondary"
                                >
                                    <Icon
                                        className={`w-[0.875rem] h-[0.875rem] ${
                                            selected === kind ? SELECTED_COLOR : 'text-text-secondary'
                                        }`}
                                    />
                                    <span>{t(REACTION_LABEL_KEY[kind])}</span>
                                    <span className="ml-auto tabular-nums text-text-primary">
                                        {formatCount(breakdown[kind] ?? 0)}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="mt-1 flex items-center gap-2 border-t border-border-subtle px-1 pt-1 text-xs">
                            <span className="text-text-secondary">{t('total')}</span>
                            <span className="ml-auto tabular-nums font-medium text-text-primary">
                                {formatCount(total)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── The remaining real counts, same row, same rhythm. ── */}
            {commentCount > 0 && (
                <button
                    type="button"
                    onClick={onOpenComments}
                    aria-label={t('comments', { count: commentCount })}
                    title={t('comments', { count: commentCount })}
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
                    title={t('shares', { count: shareCount })}
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
                    title={t('saves', { count: saveCount })}
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
