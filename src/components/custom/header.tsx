'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import GlobalSearchBar from './GlobalSearchBar';
import { ThemeToggle } from '@/app/[locale]/theme-toggle';
import { useTranslations } from 'next-intl';
import { X } from "@phosphor-icons/react";
import React from 'react';
import HomeSidebar from '../home/HomeSidebar';
import { ButtonType3 } from '@/components/custom/button';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { useChatUnread } from '@/hooks/useChatUnread';
import { formatBadgeCount } from '@/lib/chatUnread';
import { useNotificationStore } from '@/store/useNotificationStore';
import { AccountMenuPanel } from './AccountMenuPanel';

export default function Header({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations('home.header');
  const tCommon = useTranslations('common');
  const { count: polledCount } = useNotificationBadge(true);
  const liveCount = useNotificationStore((s) => s.unreadCount);
  const unreadNotificationCount = Math.max(polledCount ?? 0, liveCount);
  // Loaded here, in the authenticated layout, so the badge is right on ANY
  // page — not only after the chat page has been opened.
  const { total: totalChatUnreadCount } = useChatUnread();

  const segments = pathname.split('/').filter(segment => segment);
  const currentLocale = segments[0] || 'en';

  const navigation = [
    { name: t('home'), href: `/${currentLocale}/home`, icon: "/HOME", prefetch: false },
    // prefetch: false avoids "preloaded but not used" console warning for this route's CSS
    { name: t('community'), href: `/${currentLocale}/community`, icon: "/COMMUNITY", prefetch: false },
    { name: t('post'), href: `/${currentLocale}/create-post`, icon: "/POST", disabled: true },
    { name: t('chat'), href: `/${currentLocale}/chat`, icon: "/CHAT", disabled: true },
    { name: t('notification'), href: `/${currentLocale}/notification`, icon: "/NOTIFICATION", prefetch: false },
  ];

  const isActive = (href: string) => {
    const normalizedPathname = pathname.replace(/\/$/, '');
    const normalizedHref = href.replace(/\/$/, '');

    if (href === `/${currentLocale}` || href === `/${currentLocale}/`) {
      return normalizedPathname === `/${currentLocale}` || normalizedPathname === '';
    }

    return normalizedPathname.startsWith(normalizedHref);
  };


  const QuickLinks = () => {
    return (
      <nav className="flex w-full  justify-around lg:space-x-8 bg-surface-default">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const isNotification = item.href.includes('/notification');
          const isChat = item.href.includes('/chat');
          const showNotificationBadge = isNotification && unreadNotificationCount > 0;
          const showChatBadge = isChat && totalChatUnreadCount > 0;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={!item.disabled && item.prefetch !== false}
              className={`
                group relative flex flex-col items-center justify-center
                lg:px-3 py-2 transition-all duration-200
                ${active ? 'text-text-brand' : 'text-text-secondary hover:text-text-primary'}
              `}
            >
              {/* Icon - Slightly raised above text */}
              <div className="-mt-1 relative inline-block">
                <Image
                  width={60}
                  height={60}
                  src={`${item.icon}${active ? "active" : ""}.svg`}
                  alt={`${item.name} Icon`}
                  className="w-6 h-6 object-contain"
                />
                {showNotificationBadge && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full bg-text-danger text-white text-[10px] font-medium"
                    aria-label={t('unreadNotificationsLabel', { count: unreadNotificationCount })}
                  >
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
                {showChatBadge && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full bg-text-danger text-white text-[10px] font-medium"
                    aria-label={t('unreadMessagesLabel', { count: totalChatUnreadCount })}
                    data-testid="chat-nav-badge"
                  >
                    {formatBadgeCount(totalChatUnreadCount)}
                  </span>
                )}
              </div>

              {/* Label */}
              <p className="text-xs font-medium whitespace-nowrap">
                {item.name}
              </p>

              {/* Active Indicator - Bottom border under text */}
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-brand" />
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div >
      {/* sticky: the `top-0 z-50` were already here but inert without a
          position, so a page that overflowed the inner area scrolled the header
          away. The content frame below (`lg:max-w-[80vw] mx-auto`) is the same
          frame SidebarShell's grid uses, so the sidebar lines up with the logo. */}
      <div className="sticky h-app-top-down w-full bg-surface-default top-0 z-50">
        <div className="lg:max-w-[80vw] mx-auto  bg-surface-default"> {/* Full width header */}
          <div className="mx-auto pr-3 sm:pr-4 lg:pr-0"> {/* Keeps the avatar off the screen edge on phones/tablets */}
            <div className="flex  justify-between h-app-top-down"> {/* Standard header height */}
              <div className='flex'>
                {/* Mobile menu button */}
                <ButtonType3
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md text-text-primary hover:bg-surface-hover border-0 bg-transparent min-w-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                    />
                  </svg>
                </ButtonType3>

                {/* Logo */}
                <div className=" flex justify-start items-center">
                  <Link href={`/${currentLocale}/home`} prefetch={false}>
                    <Image
                      src="/LOGO.svg"
                      alt="Logo"
                      width={160}
                      height={40}
                      className="h-12 w-auto object-contain"
                    />
                  </Link>
                </div>

              </div>

              {/* Desktop Navigation - Centered */}
              <div className="hidden lg:flex ">
                <QuickLinks />
              </div>

              {/* Right Section - Search, Language, Profile */}
              <div className="flex items-center space-x-1"> {/* Standard spacing */}
                {/* Search */}
                <GlobalSearchBar />

                {/* Language Selector and Theme Toggle */}
                <div className="hidden  items-center space-x-2">
                  {/* <LocaleSwitcher
                selectClassName="appearance-none text-text-primary pr-8"
                optionClassName="bg-surface-default"
              /> */}
                  <ThemeToggle />
                </div>

                {/* User Profile */}
                <AccountMenuPanel />


              </div>
            </div>




            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                />

                {/* Sidebar */}
                <div className="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-surface-default z-50 lg:hidden overflow-y-auto shadow-2xl">
                  {/* Sidebar Header */}
                  <div className="flex justify-between items-center p-4 border-b border-border-subtle sticky top-0 bg-surface-default z-10">
                    <Link href={`/${currentLocale}/home`} prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
                      <Image
                        src="/LOGO.svg"
                        alt="Logo"
                        width={160}
                        height={40}
                        className="h-10 w-auto object-contain"
                      />
                    </Link>
                    <ButtonType3
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-lg hover:bg-surface-hover border-0 bg-transparent min-w-0"
                      aria-label={tCommon('closeMenu')}
                    >
                      <X className="w-6 h-6" />
                    </ButtonType3>
                  </div>

                  {/* Sidebar Content */}
                  <div
                    className="p-4"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a')) setIsMobileMenuOpen(false);
                    }}
                  >
                    <HomeSidebar />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className=" scrollbar-hide h-app-inner  ">
        {children}
      </div>
      <div
        className=" h-app-down 
            fixed bottom-0 left-0 w-full
            flex  justify-between 
            z-40
            lg:hidden lg:border-0
          "
      >
        <QuickLinks />
      </div>

    </div>
  );
}

// Kept for existing importers (create-post, vendor sidebar).
export { MyAvatar } from './MyAvatar';
