import type { ReactNode } from 'react';
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
 * Chrome shared by the two panels in the circle home rail.
 *
 * Border-and-surface only: the rail is context beside the conversation, and a
 * tinted or accented panel would compete with the chat for attention. Colour in
 * here is reserved for things you can act on.
 */
export function SidePanel({ title, action, children, className }: SidePanelProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-default p-4',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="label-medium min-w-0 truncate text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
