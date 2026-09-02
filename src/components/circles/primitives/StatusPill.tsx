import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusPillVariant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/**
 * Surface + text pairs, one per variant — the same bucket→classes map idiom as
 * `community/embassy/tabs/requestStatus.ts`, but built from design tokens so
 * both themes are covered.
 *
 * Two deliberate choices:
 *  - `neutral` pairs with `text-text-primary`, not `text-text-secondary`: in
 *    dark mode `surface-subtle` (#545454) and `text-secondary` (#757575) are
 *    near-identical greys and the label would all but vanish.
 *  - `brand` uses `surface-brand-light`, which is the SAME light blue in both
 *    themes, so it is only safe against `text-text-brand` (navy). Never put
 *    `text-text-primary` on it.
 */
export const STATUS_PILL_VARIANT: Record<StatusPillVariant, string> = {
  neutral: 'bg-surface-subtle text-text-primary',
  brand: 'bg-surface-brand-light text-text-brand',
  success: 'bg-surface-success text-text-success',
  warning: 'bg-surface-warning text-text-warning',
  danger: 'bg-surface-danger text-text-danger',
  info: 'bg-surface-info text-text-info',
};

const STATUS_PILL_BASE =
  'caption-small rounded-full px-2 py-0.5 inline-flex items-center gap-1';

export interface StatusPillProps {
  label: ReactNode;
  variant?: StatusPillVariant;
  /** Leading glyph — an icon, or a coloured dot for "Open"-style states. */
  icon?: ReactNode;
  className?: string;
}

export function StatusPill({
  label,
  variant = 'neutral',
  icon,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        STATUS_PILL_BASE,
        STATUS_PILL_VARIANT[variant],
        // Icons inherit the pill's text colour and are normalised to 12px so a
        // lucide icon and a bare dot line up identically.
        '[&_svg]:size-3 [&_svg]:shrink-0',
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
