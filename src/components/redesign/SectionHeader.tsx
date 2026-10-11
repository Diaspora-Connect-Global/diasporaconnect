import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * Heading of a redesign section: title, optional one-line subtitle and an
 * optional "View all" link. Pass `onViewAll` instead of `href` for a section
 * that expands in place.
 */
export function SectionHeader({
  id,
  title,
  subtitle,
  href,
  onViewAll,
  viewAllLabel,
  compact = false,
  action,
}: {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  compact?: boolean;
  action?: ReactNode;
}) {
  const linkClass =
    'inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className={compact ? 'text-sm font-semibold text-text-primary' : 'text-lg font-bold text-text-primary'}>
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {action}
      {viewAllLabel && href && (
        <Link href={href} prefetch={false} className={linkClass}>
          {viewAllLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
      {viewAllLabel && !href && onViewAll && (
        <button type="button" onClick={onViewAll} className={linkClass}>
          {viewAllLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
