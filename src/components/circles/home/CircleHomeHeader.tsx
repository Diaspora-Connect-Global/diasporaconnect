'use client';

import {
  ChevronLeft,
  ClipboardList,
  MessageSquare,
  Plus,
  Scale,
  Settings,
  Ticket,
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
  tagline?: string | null;
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
  tagline,
}: CircleHomeHeaderProps) {
  const t = useTranslations('circles');

  const tabClass =
    'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2 pt-1 label-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0';
  const linkTabClass = cn(
    tabClass,
    'border-transparent text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
  );
  // Every screen of the circle, one tap from its home. They used to sit behind
  // a "more" menu, which hid Leaderboard / Decisions / Rules / Plan / Settings.
  // Phones swipe the strip; from `sm` it wraps, since a mouse cannot swipe it.
  const sections = [
    { href: `/circles/${circleId}/members`, label: t('home.tabMembers'), icon: Users },
    { href: `/circles/${circleId}/leaderboard`, label: t('leaderboard.title'), icon: Trophy },
    { href: `/circles/${circleId}/history`, label: t('history.title'), icon: ClipboardList },
    { href: `/circles/${circleId}/governance`, label: t('governance.title'), icon: Scale },
    { href: `/circles/${circleId}/plan`, label: t('plan.title'), icon: Ticket },
    { href: `/circles/${circleId}/settings`, label: t('settings.title'), icon: Settings },
  ];

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

        <Avatar className="size-11 shrink-0">
          <AvatarImage src={toCdnUrl(avatarUrl) || undefined} alt="" />
          <AvatarFallback className="label-small">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="label-large line-clamp-2 break-words text-text-primary">{name}</h1>
          <p className="caption-small truncate text-text-secondary">
            {t('common.memberCount', { count: memberCount })}
            {tagline ? ` · ${tagline}` : ''}
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
      </div>

      <nav
        aria-label={t('common.circle')}
        className="-mx-3 mt-2 flex items-stretch overflow-x-auto px-3 scrollbar-hide sm:-mx-4 sm:flex-wrap sm:overflow-x-visible sm:px-4"
      >
        <span aria-current="page" className={cn(tabClass, 'border-surface-brand text-text-brand')}>
          <MessageSquare aria-hidden="true" />
          {t('home.tabChat')}
        </span>

        {sections.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkTabClass}>
            <Icon aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
