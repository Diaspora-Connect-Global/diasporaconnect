import type { ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';

/** A right-rail card: a compact heading (with optional "View all") over its content. */
export function RailCard({
  id,
  title,
  href,
  viewAllLabel,
  children,
  testId,
  className = '',
}: {
  id: string;
  title: string;
  href?: string;
  viewAllLabel?: string;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} data-testid={testId} className={`rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm ${className}`}>
      <SectionHeader id={id} title={title} href={href} viewAllLabel={viewAllLabel} compact />
      {children}
    </section>
  );
}
