import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

const STATUS_TEXT: Record<MoreTone, string> = {
  brand: 'text-text-brand',
  info: 'text-text-info',
  success: 'text-text-success',
  warning: 'text-text-warning',
  danger: 'text-text-danger',
};

/**
 * One "Your activity" item: icon in a soft circle, title + subtitle, an optional
 * thumbnail, and a status line that says what the real state is, in words. A
 * progress bar appears only when a REAL 0–100 `progress` value is supplied.
 * Links to where the person can act on it, when such a page exists.
 */
export function ActivityCard({
  href,
  icon: Icon,
  tone,
  title,
  subtitle,
  status,
  statusTone = 'brand',
  image,
  progress,
  testId,
}: {
  href?: string;
  icon: LucideIcon;
  tone: MoreTone;
  title: string;
  subtitle?: string;
  status: ReactNode;
  statusTone?: MoreTone;
  image?: string | null;
  progress?: number | null;
  testId?: string;
}) {
  const pct = typeof progress === 'number' && Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : null;
  const body = (
    <>
      <span className="flex min-w-0 items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${TONE_CLASS[tone]}`}>
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 break-words">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">{title}</span>
          {subtitle && <span className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted-foreground">{subtitle}</span>}
        </span>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-lg object-cover" />
        )}
      </span>
      {pct !== null && (
        <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span className="block h-full rounded-full bg-text-success" style={{ width: `${pct}%` }} />
        </span>
      )}
      <span className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className={`min-w-0 text-xs font-medium leading-snug ${STATUS_TEXT[statusTone]}`}>{status}</span>
        {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      </span>
    </>
  );
  const cls = 'flex h-full min-w-0 flex-col rounded-xl border border-border-subtle bg-surface-default p-3.5 shadow-sm';
  return href ? (
    <Link href={href} prefetch={false} data-testid={testId} className={`${cls} transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand`}>
      {body}
    </Link>
  ) : (
    <div data-testid={testId} className={cls}>
      {body}
    </div>
  );
}
