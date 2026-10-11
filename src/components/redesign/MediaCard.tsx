import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

/**
 * Photo (or, when the listing has none, a tinted icon tile) with a tag chip,
 * title, one meta line and an optional footer. The whole card is one link.
 * The photo box has a fixed aspect ratio so lists never shift as images load.
 */
export function MediaCard({
  href,
  imageSrc,
  fallbackIcon: FallbackIcon,
  tone = 'brand',
  tag,
  title,
  meta,
  footer,
  testId,
}: {
  href: string;
  imageSrc?: string | null;
  fallbackIcon: LucideIcon;
  tone?: MoreTone;
  tag?: string;
  title: string;
  meta?: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      data-testid={testId}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-default transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
    >
      <div className={`relative aspect-[4/3] w-full overflow-hidden ${imageSrc ? 'bg-surface-subtle' : TONE_CLASS[tone]}`}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" width={320} height={240} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="grid size-full place-items-center">
            <FallbackIcon className="size-10 opacity-80" strokeWidth={1.5} aria-hidden />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        {tag && (
          <span className={`w-fit max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}>{tag}</span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">{title}</h3>
        {meta && <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">{meta}</div>}
        {footer && <div className="mt-auto pt-1 text-sm font-semibold text-text-primary">{footer}</div>}
      </div>
    </Link>
  );
}
