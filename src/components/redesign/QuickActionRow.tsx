import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

/** One row of the Quick actions list: icon chip, title, one-line description. */
export function QuickActionRow({
  href,
  icon: Icon,
  tone,
  title,
  subtitle,
}: {
  href: string;
  icon: LucideIcon;
  tone: MoreTone;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-default p-3 transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-text-brand" aria-hidden />
    </Link>
  );
}
