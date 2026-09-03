'use client';

import {
  ChevronLeft,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trophy,
  Users,
} from 'lucide-react';
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
 * Header for the circle home screen: identity, the two menus, and the
 * Chat / Members strip.
 *
 * ── IDENTITY READS LEFT TO RIGHT ────────────────────────────────────────────
 * Avatar, then name over member count, on one line — a chat header, not a
 * profile card. The earlier centred stack cost three rows of a column whose
 * whole job is to show the conversation, and put the name where nothing else on
 * the screen is centred.
 *
 * ── SEARCH, NOTIFICATIONS AND THE VIEWER'S OWN AVATAR ARE NOT HERE ──────────
 * They sit in the app's global header (`components/custom/header.tsx`), which
 * is mounted by the `(main)` layout directly above this one. Repeating them
 * would give the page two search boxes and two bells a few pixels apart, and
 * the second set would be the one that does less.
 *
 * ── WHY THE TABS ARE LINKS AND NOT `SegmentedControl` ───────────────────────
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

  const tabClass =
    'flex flex-1 items-center justify-center gap-2 border-b-2 pb-2 pt-1 label-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0';

  return (
    <header className="shrink-0 border-b border-border-subtle bg-surface-default px-3 pt-2 sm:px-4">
      <div className="flex items-center gap-2">
        <Link
          href="/circles"
          // The circles catalogue has no dedicated back label; this string is
          // exactly the right words and is already translated everywhere.
          aria-label={t('errors.notFound.cta')}
          className="shrink-0 rounded-full p-1.5 text-text-primary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>

        <Avatar className="size-9 shrink-0">
          <AvatarImage src={toCdnUrl(avatarUrl) || undefined} alt="" />
          <AvatarFallback className="label-small">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="label-large truncate text-text-primary">{name}</h1>
          <p className="caption-small text-text-secondary">
            {t('common.memberCount', { count: memberCount })}
          </p>
        </div>

        {/*
         * Starting something is its own control, not an item buried in the
         * overflow menu. Without it the circle is READ-ONLY from its own home
         * screen: every viewer exists and none of the four creation routes has
         * any navigation into it.
         *
         * Deliberately NOT gated on role or entitlement here. Whether an action
         * needs a vote is a per-kind governance rule and whether a slot is free
         * is an entitlement read; both are answered ON the destination screen,
         * where there is room to explain them. Hiding the menu would teach a
         * member the feature does not exist — and this header does not load
         * either query, so any gate here would be a guess.
         */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonType3
              aria-label={t('actions.startSomething')}
              className="shrink-0 p-1.5 text-text-primary hover:bg-surface-subtle"
            >
              <Plus aria-hidden="true" className="size-5" />
            </ButtonType3>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px] bg-surface-default">
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/projects/new`}>
                {t('newProject.cta')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/challenges/new`}>
                {t('newChallenge.cta')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/motions/new`}>
                {t('newMotion.cta')}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ButtonType3
              aria-label={t('common.moreOptions')}
              className="shrink-0 p-1.5 text-text-primary hover:bg-surface-subtle"
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
            {/* The four screens added after the first cut. Without these the
                routes exist and compile but are unreachable — there is no other
                navigation into them anywhere in the app. */}
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/history`}>{t('history.title')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/governance`}>{t('governance.title')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/plan`}>{t('plan.title')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="body-medium text-text-primary">
              <Link href={`/circles/${circleId}/settings`}>{t('settings.title')}</Link>
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
