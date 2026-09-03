import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Card chrome shared by every block on the motion screen.
 *
 * ── WHY THE SHELL IS SEPARATE FROM THE BLOCKS ───────────────────────────────
 * `MotionTally`, `QuorumProgress`, `TimeRemaining` and `MotionDetails` render
 * their own heading and content and nothing else — no padding, no border, no
 * background. The page decides which of them share a card and which stand
 * alone, and that decision is a LAYOUT one that changes with the breakpoint.
 * Baking the chrome into each block would freeze it and make "put the tally and
 * the quorum bar in one panel on desktop" impossible without unpicking four
 * files.
 *
 * ── NO COLOURED BORDERS, EVER ───────────────────────────────────────────────
 * `border-border-subtle` is the only border this screen uses. The semantic
 * border tokens are not usable as decoration here: `--border-success`,
 * `--border-warning` and `--border-info` all resolve to the SAME red
 * (`#e7000c`) in both themes, so a "success-bordered" card would be a red
 * card. Colour on this screen appears in exactly one place — the vote button
 * the viewer has actually selected — where it reports an interactive state
 * rather than decorating a container.
 */
export const MOTION_CARD_CLASS =
  'rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5';

export interface MotionSectionProps {
  /**
   * The block's own heading. Omitted by the identity block, which carries the
   * page's `h1` and must not be preceded by an `h2` about itself.
   */
  title?: string;
  /** Trailing slot on the heading row — a status pill, a count. */
  titleAside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A labelled block of the motion screen. Chrome-free; see the note above. */
export function MotionSection({
  title,
  titleAside,
  children,
  className,
}: MotionSectionProps) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      {(title || titleAside) && (
        <div className="flex items-baseline justify-between gap-3">
          {title ? (
            <h2 className="label-large text-text-primary">{title}</h2>
          ) : (
            <span />
          )}
          {titleAside}
        </div>
      )}
      {children}
    </section>
  );
}

export interface MotionCardProps {
  children: ReactNode;
  className?: string;
}

/** The card the page wraps one or more `MotionSection`s in. */
export function MotionCard({ children, className }: MotionCardProps) {
  return <div className={cn(MOTION_CARD_CLASS, className)}>{children}</div>;
}
