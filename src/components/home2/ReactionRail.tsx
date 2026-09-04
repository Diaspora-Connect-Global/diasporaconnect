'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { REACTION_ORDER, type ReactionKind } from '@/components/home2/reactionAdapter';
import {
    REACTION_LABEL_KEY,
    reactionIcon,
    SELECTED_DISC,
} from '@/components/home2/ReactionBar2';

/**
 * The ALWAYS-VISIBLE reaction rail: a slim vertical pill of three glyphs pinned
 * to the right edge of the post card.
 *
 * ## Why this is not a menu
 *
 * It was originally built as a dropdown that opened from the count cluster,
 * because the first design sheet showed a "Default State" with no rail. That was
 * wrong: the rail is permanent chrome. A reader should see the three reactions
 * without discovering a control first, which is the whole point of putting them
 * on the card rather than behind a tap.
 *
 * ## Why it sits INSIDE the card edge rather than straddling it
 *
 * The card is wrapped in `.feed-card-cv`, which sets `content-visibility: auto`.
 * That implies `contain: layout style paint`, and PAINT CONTAINMENT CLIPS TO THE
 * PADDING BOX — an element hanging outside the card is simply not painted, with
 * no warning and nothing in the DOM to suggest why. `overflow: visible` does not
 * rescue it; containment outranks overflow.
 *
 * A portal would escape the clip, but a portalled element cannot stay glued to a
 * card that scrolls and virtualises without per-frame position syncing. So the
 * rail is flush to the inner edge: visually a rail on the border, structurally
 * inside it, and correct while the feed scrolls.
 *
 * ## Selection
 *
 * The chosen reaction becomes a solid red disc with the glyph knocked out in
 * white; the rest stay outline. Selection is carried by fill AND colour, never
 * colour alone. Tapping the selected one again clears it.
 */
export interface ReactionRailProps {
    selected: ReactionKind | null;
    onSelect: (kind: ReactionKind) => void;
}

export default function ReactionRail({ selected, onSelect }: ReactionRailProps) {
    const t = useTranslations('reactions');

    return (
        <div
            role="radiogroup"
            aria-label={t('choose')}
            // Anchored from the BOTTOM, not the top: it should sit directly
            // above the counter row, and that row's distance from the card
            // bottom is fixed (counts row + divider + action row + padding)
            // whereas the distance from the TOP varies with body text and
            // media. Anchoring to the top would drift down long posts.
            // `right-[0.5rem]` keeps it inside the card's 1rem padding, so
            // `.feed-card-cv` paint containment cannot clip it.
            className="absolute right-[0.5rem] bottom-[6rem] z-10 flex w-[2.75rem] flex-col items-center gap-[0.375rem] rounded-full border border-border-subtle bg-surface-default p-[0.5rem] shadow-lg"
        >
            {REACTION_ORDER.map((kind) => {
                const isOn = selected === kind;
                const Icon = reactionIcon(kind, isOn);
                const label = t(REACTION_LABEL_KEY[kind]);
                return (
                    <Tooltip key={kind}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={isOn}
                                // The rail is glyphs only — there is no visible
                                // text to name a button, so each needs its own
                                // label or it announces as blank.
                                aria-label={label}
                                onClick={() => onSelect(kind)}
                                className="flex h-[1.75rem] w-[1.75rem] shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface-default"
                            >
                                <span
                                    className={`flex h-[1.75rem] w-[1.75rem] items-center justify-center rounded-full transition-colors ${
                                        isOn ? SELECTED_DISC : ''
                                    }`}
                                >
                                    <Icon
                                        className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
                                            isOn ? 'text-white' : 'text-text-secondary'
                                        }`}
                                    />
                                </span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">{label}</TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
