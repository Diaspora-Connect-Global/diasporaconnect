'use client';

import type { RefObject } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/components/ui/bottom-sheet';
import { MORE_SHEETS, type MoreSheetKey } from './moreLinks';

/**
 * "My Requests" and "Saved" have no page of their own yet (M9 adds /requests
 * and /saved), so each opens a short list of the places those things already
 * live.
 */
export function MoreLinkSheet({
  sheet,
  onOpenChange,
  returnFocusTo,
}: {
  sheet: MoreSheetKey | null;
  onOpenChange: (open: boolean) => void;
  /** The control that opened the sheet. There is no Radix Trigger here, and
   *  Radix only restores focus to its own Trigger — without this, closing the
   *  sheet would leave keyboard focus on <body>. */
  returnFocusTo: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations('more.sheets');

  return (
    <BottomSheet open={sheet !== null} onOpenChange={onOpenChange}>
      {sheet && (
        <BottomSheetContent
          showCloseButton={false}
          data-testid={`more-sheet-${sheet}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo.current?.focus();
          }}
        >
          <BottomSheetHeader>
            <BottomSheetTitle className="text-lg">{t(`${sheet}.title`)}</BottomSheetTitle>
            <BottomSheetDescription className="text-muted-foreground">{t(`${sheet}.description`)}</BottomSheetDescription>
          </BottomSheetHeader>
          <BottomSheetClose
            aria-label={t('close')}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
          >
            <X className="size-4" aria-hidden />
          </BottomSheetClose>
          <ul className="divide-y divide-border-subtle">
            {MORE_SHEETS[sheet].map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  prefetch={false}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text-primary">{t(`${sheet}.${link.key}`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`${sheet}.${link.key}Hint`)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </BottomSheetContent>
      )}
    </BottomSheet>
  );
}
