import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

/**
 * One "Your activity" item: icon chip, title, subtitle and a status line that
 * says what the real state is, in words (no invented progress). Links to where
 * the person can act on it, when such a page exists.
 */
export function ActivityCard({
  href,
  icon: Icon,
  tone,
  title,
  subtitle,
  status,
  statusTone = 'brand',
  testId,
}: {
  href?: string;
  icon: LucideIcon;
  tone: MoreTone;
  title: string;
  subtitle?: string;
  status: ReactNode;
  statusTone?: MoreTone;
  testId?: string;
}) {
  const body = (
    <>
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${TONE_CLASS[tone]}`}>
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>}
        <span className={`mt-2 inline-block max-w-full truncate rounded-md px-2 py-0.5 text-xs font-medium ${TONE_CLASS[statusTone]}`}>{status}</span>
      </span>
      {href && <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />}
    </>
  );
  const cls = 'flex h-full min-w-0 items-start gap-3 rounded-xl border border-border-subtle bg-surface-default p-3.5';
  return href ? (
    <Link href={href} prefetch={false} data-testid={testId} className={`${cls} transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand`}>
      {body}
    </Link>
  ) : (
    <div data-testid={testId} className={cls}>
      {body}
    </div>
  );
}
