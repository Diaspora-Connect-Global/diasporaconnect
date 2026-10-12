import type { ReactionKind } from '@/components/reactions/reactionAdapter';

/** Text colour of a reaction when it is the viewer's current one. */
export const REACTION_TONE: Record<ReactionKind, string> = {
    HAPPY: 'text-border-danger',
    HOPEFUL: 'text-text-brand',
    SAD: 'text-amber-600 dark:text-amber-400',
};
