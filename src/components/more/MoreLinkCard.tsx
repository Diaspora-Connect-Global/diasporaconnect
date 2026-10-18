'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { MoreTone } from './moreLinks';

/** Icon-chip colours, all from the design tokens in globals.css. */
/**
 * Icon chips always use the brand colour (owner, 2026-10-18: icons match the brand). The tones
 * below stay for STATUS badges and status text, where green / amber / red carry meaning.
 */
export const ICON_CHIP_CLASS = 'bg-surface-brand-light/60 text-text-brand';

export const TONE_CLASS: Record<MoreTone, string> = {
  brand: 'bg-surface-brand-light/60 text-text-brand',
  info: 'bg-surface-info text-text-info',
  success: 'bg-surface-success text-text-success',
  warning: 'bg-surface-warning text-text-warning',
  danger: 'bg-surface-danger text-text-danger',
};

const CARD_CLASS =
  'group flex h-full w-full items-start gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 text-left transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

function CardBody({ icon: Icon, tone, title, subtitle }: { icon: LucideIcon; tone: MoreTone; title: string; subtitle: string }) {
  return (
    <>
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text-primary">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 self-center text-muted-foreground transition-colors group-hover:text-text-brand"
        aria-hidden
      />
    </>
  );
}

/**
 * A More-page tile: icon chip, title, one-line description, chevron. A link
 * when it goes somewhere, a button when it opens a sheet of links.
 */
export function MoreLinkCard(
  props: { icon: LucideIcon; tone: MoreTone; title: string; subtitle: string } & (
    | { href: string; onOpen?: never }
    | { onOpen: () => void; href?: never }
  ),
) {
  const { icon, tone, title, subtitle } = props;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} prefetch={false} className={CARD_CLASS}>
        <CardBody icon={icon} tone={tone} title={title} subtitle={subtitle} />
      </Link>
    );
  }
  return (
    <button type="button" aria-haspopup="dialog" onClick={props.onOpen} className={CARD_CLASS}>
      <CardBody icon={icon} tone={tone} title={title} subtitle={subtitle} />
    </button>
  );
}
