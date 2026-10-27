import type { ReactionKind } from '@/components/reactions/reactionAdapter';

/**
 * Text colour of a reaction when it is the viewer's current one. One red for
 * all three (owner, 2026-10-27): a selected reaction reads the same whichever
 * kind it is — the icon already says which. Same danger token the selected
 * rail disc uses (SELECTED_DISC).
 */
export const REACTION_TONE: Record<ReactionKind, string> = {
    HAPPY: 'text-border-danger',
    HOPEFUL: 'text-border-danger',
    SAD: 'text-border-danger',
};
