'use client';

import { cn } from '@/lib/utils';

export interface HistoryTabOption<T extends string> {
  value: T;
  label: string;
}

export interface HistoryTabsProps<T extends string> {
  /** Two or more views over the same record. Rendered in the order given. */
  options: readonly HistoryTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * The history screen's view switch.
 *
 * ── WHY THIS IS NOT `SegmentedControl` ──────────────────────────────────────
 * `primitives/SegmentedControl` types its options as an exact two-tuple and
 * sizes its sliding pill at a hardcoded 50%, so a third option is both a
 * compile error and — were the type widened — a pill that lands under the wrong
 * label. This screen needs three views (motions, membership, the whole record),
 * so the width maths is generalised here rather than in the shared primitive,
 * which every other Circles screen uses as a strict two-way toggle.
 *
 * The visual language is deliberately identical to the primitive's, down to the
 * pill geometry: the track has `p-1` (0.25rem), so an absolutely-positioned
 * child measures percentages against the padding box and `(100% - 0.5rem) / n`
 * is exactly one cell of the content box. `translateX(index * 100%)` then moves
 * the pill by its own width — one cell per step — and `left-1` puts step zero
 * flush inside the padding.
 *
 * Buttons are laid out on an explicit equal-fraction grid rather than `flex-1`.
 * A flex item will not shrink below its content, so three labels wider than the
 * track would overflow it AND desynchronise from the equal-width pill; grid
 * columns divide the track evenly whatever the labels say, and a long label
 * wraps inside its own cell instead.
 *
 * Native `<button aria-pressed>` inside `role="group"`, as the primitive does:
 * buttons are Tab- and Enter/Space-operable for free, whereas radio semantics
 * would oblige us to implement arrow-key roving ourselves.
 */
export function HistoryTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: HistoryTabsProps<T>) {
  const count = options.length;
  const selectedIndex = options.findIndex((option) => option.value === value);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative grid items-stretch rounded-full border border-border-subtle bg-surface-subtle p-1',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {/*
        Hidden rather than parked at index 0 when the value matches nothing:
        a pill under the first tab would assert a selection that is not the
        current one.
      */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-1 bottom-1 left-1 rounded-full',
          'bg-surface-brand shadow-sm transition-transform duration-300 ease-out',
          selectedIndex < 0 && 'hidden',
        )}
        style={{
          width: `calc((100% - 0.5rem) / ${count})`,
          transform: `translateX(${Math.max(selectedIndex, 0) * 100}%)`,
        }}
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
              'label-small relative z-10 flex cursor-pointer items-center justify-center gap-2',
              'rounded-full px-3 py-1.5 text-center leading-tight transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
              // The pill behind the label carries the selected state, so the
              // unselected label stays at full `text-primary` strength — in
              // dark mode `text-secondary` on `surface-subtle` is grey on grey.
              selected ? 'text-text-white' : 'text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
