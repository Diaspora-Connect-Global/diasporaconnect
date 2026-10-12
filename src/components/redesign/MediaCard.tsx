import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

/**
 * Photo on top (the item's own picture, else a category placeholder photo, else
 * a tinted icon tile) with a tag chip, title, one meta line and an optional
 * footer. The whole card is one link; `action` (a bookmark, say) sits over the
 * footer's right edge as a SIBLING of the link, so it is never nested inside it.
 * The photo box has a fixed aspect ratio so lists never shift as images load.
 */
export function MediaCard({
  href,
  imageSrc,
  fallbackPhoto,
  fallbackIcon: FallbackIcon,
  tone = 'brand',
  tag,
  title,
  meta,
  footer,
  action,
  testId,
}: {
  href: string;
  imageSrc?: string | null;
  fallbackPhoto?: string;
  fallbackIcon: LucideIcon;
  tone?: MoreTone;
  tag?: string;
  title: string;
  meta?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  testId?: string;
}) {
  const photo = imageSrc || fallbackPhoto;
  return (
    <div className="relative h-full min-w-0">
      <Link
        href={href}
        prefetch={false}
        data-testid={testId}
        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <div className={`relative aspect-[16/10] w-full overflow-hidden ${photo ? 'bg-surface-subtle' : TONE_CLASS[tone]}`}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={360} height={225} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <span className="grid size-full place-items-center">
              <FallbackIcon className="size-10 opacity-80" strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
          {tag && <span className={`w-fit max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}>{tag}</span>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">{title}</h3>
          {/* With no footer the meta line is the last one, so it keeps clear of the action button too. */}
          {meta && <div className={`flex min-w-0 items-center gap-1 text-xs text-muted-foreground ${action && !footer ? 'pr-8' : ''}`}>{meta}</div>}
          {footer && <div className={`mt-auto pt-1 text-sm font-semibold text-text-primary ${action ? 'pr-9' : ''}`}>{footer}</div>}
        </div>
      </Link>
      {action && <div className="absolute bottom-2.5 right-2.5 z-10">{action}</div>}
    </div>
  );
}
