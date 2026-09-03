'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The card every settings block sits in.
 *
 * A shell rather than a copied `<div>` per section, because the screen's
 * legibility depends on the blocks reading as PEERS: profile, discovery and
 * archive are three separate decisions, and identical chrome is what says so.
 *
 * ── ON THE `tone` PROP ──────────────────────────────────────────────────────
 * `danger` exists only to give the archive block a different border. It is not
 * a semantic status and nothing computes it — the section that gets it is the
 * one whose action is hard to walk back.
 *
 * Cards in this feature carry NO colour on their border — the tone is shown by
 * the heading and the action itself. `--border-danger` is also the only one of
 * the four semantic border tokens that is not silently red, so relying on it
 * would have been inconsistent as well as decorative.
 */
export interface SettingsSectionProps {
  title: string;
  description?: string;
  /** Trailing slot on the title row — a status pill, typically. */
  aside?: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  aside,
  tone = 'default',
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        'rounded-lg border bg-surface-default p-4 sm:p-5',
        'border-border-subtle',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="heading-small text-text-primary">{title}</h2>
          {description && (
            <p className="caption-small mt-1 text-text-secondary">{description}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}
