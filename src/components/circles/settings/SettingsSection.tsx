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
 * `border-border-danger` is used deliberately while its neighbours are NOT:
 * `--border-success`, `--border-warning` and `--border-info` are all defined as
 * `#e7000c` in globals.css — the same red — so any of the three would draw a
 * danger border while claiming to mean something else. `border-border-danger`
 * is the one member of that family whose value matches its name. The others are
 * avoided across this screen, not worked around.
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
        tone === 'danger' ? 'border-border-danger' : 'border-border-subtle',
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
