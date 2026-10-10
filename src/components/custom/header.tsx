'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Bell, Compass, Ellipsis, House, MessageCircleMore, Users, type LucideIcon } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import GlobalSearchBar from './GlobalSearchBar';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { useChatUnread } from '@/hooks/useChatUnread';
import { formatBadgeCount } from '@/lib/chatUnread';
import { getActiveNavKey, NAV_SECTIONS, stripLocale, type NavKey } from '@/lib/navSections';
import { useNotificationStore } from '@/store/useNotificationStore';
import { AccountMenuPanel } from './AccountMenuPanel';
import { UnreadCountsProvider } from './UnreadCountsContext';

const SECTION_ICONS: Record<NavKey, LucideIcon> = {
  home: House,
  discover: Compass,
  community: Users,
  more: Ellipsis,
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default';

/** One of the four section links (desktop top bar and mobile bottom bar share it). */
function SectionLink({ sectionKey, href, label, active }: { sectionKey: NavKey; href: string; label: string; active: boolean }) {
  const Icon = SECTION_ICONS[sectionKey];
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      data-nav-key={sectionKey}
      className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors lg:flex-none lg:px-3 xl:px-5 ${FOCUS_RING} ${
        active ? 'text-text-brand' : 'text-text-primary hover:text-text-brand'
      }`}
    >
      <Icon className="size-[22px] shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
      {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-text-brand" />}
    </Link>
  );
}

/** A round icon link with an unread badge (Messages, Notifications). */
function IconLink({
  href,
  icon: Icon,
  label,
  count,
  countLabel,
  badgeTestId,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count: number;
  countLabel: string;
  badgeTestId: string;
  active: boolean;
}) {
  const badge = formatBadgeCount(count);
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={badge ? `${label}, ${countLabel}` : label}
      aria-current={active ? 'page' : undefined}
      className={`relative grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-subtle ${FOCUS_RING} ${
        active ? 'text-text-brand' : 'text-text-primary'
      }`}
    >
      <Icon className="size-[22px]" strokeWidth={1.75} aria-hidden />
      {badge && (
        <span
          aria-hidden
          data-testid={badgeTestId}
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-text-danger px-1 text-[10px] font-semibold leading-none text-white"
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

/**
 * The authenticated app shell: top bar (logo · Home Discover Community More ·
 * search, Messages, Notifications, account) and, below `lg`, a fixed bottom bar
 * with the same four sections. There is no left sidebar and no drawer; what the
 * old sidebar held now lives on the Community and More pages.
 */
export default function Header({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tHeader = useTranslations('home.header');
  const { count: polledCount } = useNotificationBadge(true);
  const liveCount = useNotificationStore((s) => s.unreadCount);
  const unreadNotificationCount = Math.max(polledCount ?? 0, liveCount);
  // Loaded here, in the authenticated layout, so the badge is right on ANY
  // page — not only after the chat page has been opened.
  const { total: totalChatUnreadCount } = useChatUnread();

  const activeSection = getActiveNavKey(pathname);
  const firstSegment = stripLocale(pathname).split('/')[1] ?? '';

  const counts = useMemo(
    () => ({ notifications: unreadNotificationCount, messages: totalChatUnreadCount }),
    [unreadNotificationCount, totalChatUnreadCount],
  );

  const sections = NAV_SECTIONS.map((s) => (
    <SectionLink key={s.key} sectionKey={s.key} href={s.href} label={t(s.key)} active={activeSection === s.key} />
  ));

  return (
    <UnreadCountsProvider value={counts}>
      <div>
        {/* `h-app-top-down` is also how specs tell the header's own controls
            apart from the page's. The content frame (`lg:max-w-[80vw]`) is the
            same one the pages below use, so the logo lines up with content. */}
        <header className="sticky top-0 z-50 h-app-top-down w-full border-b border-border-subtle bg-surface-default">
          <div className="mx-auto flex h-full items-stretch gap-2 px-3 sm:px-4 lg:grid lg:max-w-[80vw] lg:grid-cols-[1fr_auto_1fr] lg:px-0">
            <div className="flex min-w-0 items-center">
              <Link href="/home" prefetch={false} aria-label={t('logoLabel')} className={`rounded-md ${FOCUS_RING}`}>
                <Image src="/LOGO.svg" alt="" width={160} height={40} priority className="h-9 w-auto object-contain lg:h-10" />
              </Link>
            </div>

            <nav aria-label={t('primary')} className="hidden h-full items-stretch lg:flex">
              {sections}
            </nav>

            <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:justify-self-end">
              <GlobalSearchBar />
              <IconLink
                href="/chat"
                icon={MessageCircleMore}
                label={t('messages')}
                count={totalChatUnreadCount}
                countLabel={tHeader('unreadMessagesLabel', { count: totalChatUnreadCount })}
                badgeTestId="chat-nav-badge"
                active={firstSegment === 'chat'}
              />
              <IconLink
                href="/notification"
                icon={Bell}
                label={t('notifications')}
                count={unreadNotificationCount}
                countLabel={tHeader('unreadNotificationsLabel', { count: unreadNotificationCount })}
                badgeTestId="notification-nav-badge"
                active={firstSegment === 'notification'}
              />
              <AccountMenuPanel />
            </div>
          </div>
        </header>

        <div className="scrollbar-hide h-app-inner">{children}</div>

        {/* Phones and tablets: the same four sections, fixed to the bottom.
            Rendered after the content so it is the last navigation landmark. */}
        <nav
          aria-label={t('primary')}
          className="fixed bottom-0 left-0 z-40 flex h-app-down w-full items-stretch border-t border-border-subtle bg-surface-default lg:hidden"
        >
          {sections}
        </nav>
      </div>
    </UnreadCountsProvider>
  );
}

// Kept for existing importers (create-post, vendor sidebar).
export { MyAvatar } from './MyAvatar';
