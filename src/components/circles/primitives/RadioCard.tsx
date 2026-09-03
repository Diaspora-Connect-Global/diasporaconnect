'use client';

import { useId, type ReactNode } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface RadioCardProps {
  value: string;
  title: string;
  description?: string;
  /** Leading glyph, normalised to 20px. */
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A bordered, selectable row: icon + title + description on the left, radio
 * indicator on the right. Must be rendered inside a `RadioGroup` — use
 * `RadioCardGroup` below unless you need to drive the group yourself.
 *
 * Real radio semantics come from Radix's `RadioGroupItem`, so arrow-key roving,
 * Space to select and the roving tabindex all work without custom handlers. The
 * `<label>` wraps the whole row, which makes the entire card a click target and
 * gives the radio its accessible name.
 */
export function RadioCard({
  value,
  title,
  description,
  icon,
  disabled = false,
  className,
}: RadioCardProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg p-4 transition-colors',
        'border border-border-default bg-surface-default',
        // `bg-surface-hover` is not a defined token and silently does nothing.
        'hover:bg-surface-subtle',
        // Selected state is border-only. A tinted fill would have to come from
        // `surface-brand-subtle`/`surface-brand-light`, both of which hold the
        // SAME light value in dark mode and would swallow `text-text-primary`.
        'has-data-[state=checked]:border-border-brand',
        'has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-border-brand',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text-brand',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      {icon && (
        <span className="mt-0.5 shrink-0 text-text-brand [&_svg]:size-5">
          {icon}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="label-medium block text-text-primary">{title}</span>
        {description && (
          <span className="caption-small mt-0.5 block text-text-secondary">
            {description}
          </span>
        )}
      </span>

      <RadioGroupItem
        id={id}
        value={value}
        disabled={disabled}
        className={cn(
          'mt-0.5 shrink-0 border-border-default',
          'data-[state=checked]:border-border-brand',
          // The shadcn item paints its dot with `fill-primary`, which is
          // shadowed to near-black (#191919) rather than the brand navy.
          '[&_svg]:fill-text-brand',
        )}
      />
    </label>
  );
}

export interface RadioCardGroupProps
  extends React.ComponentProps<typeof RadioGroup> {
  children: ReactNode;
}

/** Convenience wrapper: a `RadioGroup` spaced for stacked `RadioCard`s. */
export function RadioCardGroup({
  className,
  children,
  ...props
}: RadioCardGroupProps) {
  return (
    <RadioGroup className={cn('grid gap-3', className)} {...props}>
      {children}
    </RadioGroup>
  );
}
