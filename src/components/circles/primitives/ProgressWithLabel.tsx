import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ProgressTone = 'brand' | 'success' | 'warning' | 'danger';

/**
 * Radix renders the fill as the Root's only child `<div>`, so the indicator is
 * recoloured through the `[&>div]:bg-…` child selector — the same idiom as
 * `profile/ProfileCompletion.tsx`.
 */
const TONE_INDICATOR: Record<ProgressTone, string> = {
  brand: '[&>div]:bg-surface-brand',
  success: '[&>div]:bg-text-success',
  warning: '[&>div]:bg-text-warning',
  danger: '[&>div]:bg-text-danger',
};

export interface ProgressWithLabelProps {
  /** 0–100. Values outside the range are clamped; NaN is treated as 0. */
  value: number;
  /** Leading text on the header row, e.g. "Overall progress". */
  label?: string;
  /** Secondary line under the bar, e.g. "GHS 3,000 of GHS 5,000". */
  caption?: string;
  tone?: ProgressTone;
  /** Hide the trailing "60%" on the header row. */
  showPercentage?: boolean;
  className?: string;
}

export function ProgressWithLabel({
  value,
  label,
  caption,
  tone = 'brand',
  showPercentage = true,
  className,
}: ProgressWithLabelProps) {
  const pct = Math.round(
    Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)),
  );

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label ? (
            <span className="label-small text-text-primary">{label}</span>
          ) : (
            <span />
          )}
          {showPercentage && (
            <span className="caption-small text-text-secondary">{pct}%</span>
          )}
        </div>
      )}

      <Progress
        value={pct}
        aria-label={label}
        // The shadcn default track is `bg-primary/20`, which is not a themed
        // token; `surface-subtle` gives a real track in both light and dark.
        className={cn(
          'h-2 w-full bg-surface-subtle [&>div]:rounded-full',
          TONE_INDICATOR[tone],
        )}
      />

      {caption && (
        <p className="caption-small mt-1.5 text-text-secondary">{caption}</p>
      )}
    </div>
  );
}
