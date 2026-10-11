import type { ReactNode } from 'react';

/** A white rounded panel carrying one redesign section. */
export function Section({ labelledBy, children, className = '', testId }: { labelledBy: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      data-testid={testId}
      className={`rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}
