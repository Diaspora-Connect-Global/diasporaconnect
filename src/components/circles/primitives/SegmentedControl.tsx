'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  /**
   * Exactly two options. The sliding pill is sized at 50% of the track, so a
   * third option would silently mis-align it — the tuple type makes that a
   * compile error instead.
   */
  options: readonly [SegmentedOption<T>, SegmentedOption<T>];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * Two-option toggle with a sliding pill, modelled on `home/viewFilter.tsx`.
 *
 * Uses native `<button aria-pressed>` inside a `role="group"` rather than
 * `role="radio"`: buttons are Tab- and Enter/Space-operable for free, whereas
 * radio semantics would oblige us to implement arrow-key roving ourselves.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const isSecondSelected = options[1].value === value;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative flex items-center rounded-full border border-border-subtle bg-surface-subtle p-1',
        className,
      )}
    >
      {/*
        Track has p-1 (0.25rem). The pill is 50% minus that padding and slides
        by exactly its own width, so it lands flush inside the right padding.
      */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full',
          'bg-surface-brand shadow-sm transition-transform duration-300 ease-out',
          isSecondSelected ? 'translate-x-full' : 'translate-x-0',
        )}
      />

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'label-small relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-2',
              'rounded-full px-3 py-1.5 transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
              // The pill behind the label carries the selected state, so the
              // unselected label stays at full `text-primary` strength — in
              // dark mode `text-secondary` on `surface-subtle` is grey on grey.
              selected ? 'text-text-white' : 'text-text-primary',
              '[&_svg]:size-4 [&_svg]:shrink-0',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
