'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export interface InlineCardProps {
  /**
   * Small glyph in front of the type label. Sized by the shell so a project,
   * motion and challenge card line up whichever icon they pass.
   */
  icon: ReactNode;
  /**
   * The whole "Project • Proposed by Kofi" line, already interpolated. It is
   * one translated string rather than a type word plus a person, because word
   * order between the two differs by language.
   */
  typeLabel: string;
  /** Optional trailing slot on the label row — a status pill, typically. */
  labelAside?: ReactNode;
  title: string;
  /** Footer link target, e.g. `/circles/{id}/motions/{motionId}`. */
  href: string;
  /** Footer link text — "View motion". */
  actionLabel: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Chrome shared by the three artefact cards that render inside the chat.
 *
 * These are deliberately NOT chat bubbles. A bubble is somebody's utterance and
 * is aligned left or right by author; a project, motion or challenge belongs to
 * the whole circle, so it spans the column and sits square in the timeline.
 * Keeping the label row, footer divider and link in one place is what stops the
 * three cards from drifting apart as each grows its own body.
 */
export function InlineCard({
  icon,
  typeLabel,
  labelAside,
  title,
  href,
  actionLabel,
  children,
  className,
}: InlineCardProps) {
  return (
    <article
      className={cn(
        'w-full rounded-2xl border border-border-subtle bg-surface-default p-3 sm:p-4',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-text-secondary [&_svg]:size-4 [&_svg]:shrink-0">{icon}</span>
        <span className="caption-small min-w-0 flex-1 truncate text-text-secondary">
          {typeLabel}
        </span>
        {labelAside}
      </div>

      <h3 className="label-large text-text-primary">{title}</h3>

      {children}

      {/*
        A footer link rather than a button: this navigates, so it must be a real
        anchor that middle-click and "open in new tab" both honour.
      */}
      <div className="mt-3 border-t border-border-subtle pt-2 text-center">
        <Link
          href={href}
          className="label-medium inline-block text-text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
