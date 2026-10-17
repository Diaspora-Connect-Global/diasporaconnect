'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronRight, Menu, X, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

/**
 * Below `lg`, pages with side rails put those rails in a slide-in drawer instead of
 * stacking cards into the main column. The header owns an empty slot on its left;
 * a page that has rails renders <MobileRailMenu>, which portals the menu button into
 * that slot. Pages without rails render nothing there, so they get no button.
 */
type SlotValue = { slot: HTMLElement | null; setSlot: (el: HTMLElement | null) => void; pageMenus: number; register: () => () => void };
const SlotContext = createContext<SlotValue>({ slot: null, setSlot: () => {}, pageMenus: 0, register: () => () => {} });

export function RailMenuProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [pageMenus, setPageMenus] = useState(0);
  const register = useCallback(() => {
    setPageMenus((n) => n + 1);
    return () => setPageMenus((n) => n - 1);
  }, []);
  return <SlotContext.Provider value={{ slot, setSlot, pageMenus, register }}>{children}</SlotContext.Provider>;
}

/** True while some page supplies its own drawer content; otherwise the header shows the standard menu. */
export function usePageMenuActive() {
  return useContext(SlotContext).pageMenus > 0;
}

/** The header's mount point for the menu button. */
export function RailMenuSlot() {
  const { setSlot } = useContext(SlotContext);
  return <div ref={setSlot} data-testid="rail-menu-slot" className="flex items-center lg:hidden" />;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

/**
 * The button (>= 44 px target) and its drawer. `children` (the lists) mount only while
 * the drawer is open, so a closed drawer costs no queries. The drawer closes on Esc,
 * backdrop click, the close button and any navigation; focus returns to the button.
 */
export function MobileRailMenu({ children }: { children: ReactNode }) {
  const { register } = useContext(SlotContext);
  useEffect(() => register(), [register]);
  return <MenuShell>{children}</MenuShell>;
}

/** The button + drawer. Used by pages with rails (via MobileRailMenu) and by the header's standard menu. */
export function MenuShell({ children }: { children: ReactNode }) {
  const t = useTranslations('railMenu');
  const { slot } = useContext(SlotContext);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  if (!slot) return null;
  return createPortal(
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={t('open')}
          aria-expanded={open}
          aria-haspopup="dialog"
          data-testid="rail-menu-button"
          className={`-ml-2 mr-1 grid size-11 shrink-0 place-items-center rounded-full text-text-primary hover:bg-surface-subtle ${FOCUS}`}
        >
          <Menu className="size-[22px]" strokeWidth={1.75} aria-hidden />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-testid="rail-menu-drawer"
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-[61] flex w-[min(20rem,88vw)] flex-col overflow-hidden border-r border-border-subtle bg-surface-default shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-200"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4">
            <DialogPrimitive.Title className="text-base font-bold text-text-primary">{t('title')}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={t('close')} className={`grid size-11 -mr-2 place-items-center rounded-full hover:bg-surface-subtle ${FOCUS}`}>
              <X className="size-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-2 py-3">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>,
    slot,
  );
}

/** A heading over a plain list of rows. Renders nothing when it has no rows. */
export function DrawerSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="px-3 pb-1 text-sm font-semibold text-text-primary">{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}

/** One row: icon + label, optionally a detail line and a status/count, always a link. */
export function DrawerRow({
  href,
  icon: Icon,
  label,
  detail,
  badge,
  tone = 'brand',
  testId,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  detail?: string;
  badge?: string;
  tone?: MoreTone;
  testId?: string;
}) {
  return (
    <li>
      <DialogPrimitive.Close asChild>
        <Link href={href} prefetch={false} data-testid={testId} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-subtle ${FOCUS}`}>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${TONE_CLASS[tone]}`}>
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text-primary">{label}</span>
            {/* The status sits under the name, not beside it: at 360 px a badge on the right cut
                names down to a few letters ("Networking Mi…"). */}
            {(detail || badge) && (
              <span className="mt-0.5 flex min-w-0 items-center gap-2">
                {badge && <span data-testid={testId ? `${testId}-status` : undefined} className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>{badge}</span>}
                {detail && <span className="min-w-0 truncate text-sm text-muted-foreground">{detail}</span>}
              </span>
            )}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </DialogPrimitive.Close>
    </li>
  );
}
