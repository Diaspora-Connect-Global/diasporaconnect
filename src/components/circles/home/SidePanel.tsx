'use client';

import { useId, type ReactNode } from 'react';

import { SectionHeader } from '@/components/redesign/SectionHeader';
import { cn } from '@/lib/utils';

export interface SidePanelProps {
  title: string;
  /**
   * Trailing slot on the heading row — a "See all" link, typically. Kept in the
   * heading rather than the footer so the panel's body can be a plain list.
   */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Chrome shared by the two panels in the circle home rail: the redesign's
 * `RailCard` look (rounded white card, soft shadow, compact heading), built on
 * `SectionHeader` so the heading is the same one Home and Discover use. It is
 * not `RailCard` itself only because these panels need a custom trailing
 * control that is not a plain "View all" link.
 *
 * Border-and-surface only: the rail is context beside the feed, and a tinted or
 * accented panel would compete with it for attention. Colour in here is
 * reserved for things you can act on.
 */
export function SidePanel({ title, action, children, className }: SidePanelProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm', className)}
    >
      <SectionHeader id={id} title={title} action={action} compact />
      {children}
    </section>
  );
}
