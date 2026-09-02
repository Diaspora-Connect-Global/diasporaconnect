'use client';

import { ChevronLeft, MessageSquare, MoreHorizontal, Trophy, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ButtonType3 } from '@/components/custom/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { cn } from '@/lib/utils';

interface CircleHomeHeaderProps {
  circleId: string;
  name: string;
  memberCount: number;
  avatarUrl?: string | null;
}

/**
 * Header for the circle home screen: identity, an overflow menu, and the
 * Chat / Members strip.
 *
 * ── WHY LINKS AND NOT `SegmentedControl` ────────────────────────────────────
 * The two tabs are two ROUTES, not two states of this page — Members is its own
 * screen. `SegmentedControl` is a toggle: it renders `aria-pressed` buttons and
 * announces a state that never actually flips here, and a screen reader would
 * be told a button was pressed while the page navigated away. Anchors with
 * `aria-current="page"` say the true thing, and middle-click / open-in-new-tab
 * work for free.
 *
 * `Chat` is hard-coded as the current tab because this header belongs to the
 * chat screen; the members screen is a separate route with its own chrome.
 */
export function CircleHomeHeader({
  circleId,
  name,
  memberCount,
  avatarUrl,
}: CircleHomeHeaderProps) {
  const t = useTranslations('circles');

  const tabClass = 'flex flex-1 items-center justify-center gap-2 border-b-2 pb-2 pt-1 label-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0';

  return (
    <header className="shrink-0 border-b border-border-subtle bg-surface-default px-3 pt-2 sm:px-4">
      <div className="flex items-center gap-2">
        <Link
          href="/circles"
          // The circles catalogue has no dedicated back label; this string is
          // exactly the right words and is already translated everywhere.
          aria-label={t('errors.notFound.cta')}
          className="rounded-full p-1.5 text-text-primary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col items-center">
          <Avatar className="size-10">
            <AvatarImage src={toCdnUrl(avatarUrl) || undefined} alt="" />
            <AvatarFallback className="label-small">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="heading-xsmall mt-1 max-w-full truncate text-text-primary">{name}</h1>
          <p className="caption-small text-text-secondary">
            {t('common.memberCount', { count: memberCount })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonType3
              aria-label={t('common.moreOptions')}
              className="p-1.5 text-text-primary hover:bg-surface-subtle"
            >
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </ButtonType3>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px] bg-surface-default">
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/members`}>{t('members.title')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/leaderboard`}>
                <Trophy aria-hidden="true" className="size-4" />
                {t('leaderboard.title')}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav aria-label={t('common.circle')} className="mt-2 flex items-stretch">
        <span
          aria-current="page"
          className={cn(tabClass, 'border-surface-brand text-text-brand')}
        >
          <MessageSquare aria-hidden="true" />
          {t('home.tabChat')}
        </span>

        <Link
          href={`/circles/${circleId}/members`}
          className={cn(
            tabClass,
            'border-transparent text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
          )}
        >
          <Users aria-hidden="true" />
          {t('home.tabMembers')}
        </Link>
      </nav>
    </header>
  );
}
