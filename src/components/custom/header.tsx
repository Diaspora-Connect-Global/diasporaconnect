'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import LocaleSwitcher from '../LocalSwitcher';
import { SearchInput } from './input';
import { ThemeToggle } from '@/app/[locale]/theme-toggle';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const t = useTranslations('home.header');

  const handleSearch = () => {
    console.log('Searching for:', searchQuery);
    // Add your search logic here
  };

  const segments = pathname.split('/').filter(segment => segment);
  const currentLocale = segments[0] || 'en';

  const navigation = [
    { name: t('home'), href: `/${currentLocale}`, icon: "/HOME.svg" },
    { name: t('community'), href: `/${currentLocale}/community`, icon: "/COMMUNITY.svg" },
    { name: t('marketplace'), href: "#", icon: "/MARKETPLACE.svg", disabled: true },
    { name: t('chat'), href: `/${currentLocale}/chat`, icon: "/CHAT.svg", disabled: true },
    { name: t('notification'), href: `/${currentLocale}/notification`, icon: "/NOTIFICATION.svg" },
  ];

  const isActive = (href: string) => {
    const normalizedPathname = pathname.replace(/\/$/, '');
    const normalizedHref = href.replace(/\/$/, '');

    if (href === `/${currentLocale}` || href === `/${currentLocale}/`) {
      return normalizedPathname === `/${currentLocale}` || normalizedPathname === '';
    }

    return normalizedPathname.startsWith(normalizedHref);
  };

  return (
    <header className="max-w-[80vw] mx-auto border-b border-border-subtle bg-surface-default"> {/* Full width header */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8"> {/* Responsive padding */}
        <div className="flex justify-between items-center h-16"> {/* Standard header height */}
          {/* Logo */}
          <div className="">
            <Link href={`/${currentLocale}`}>
              <p className='text-text-brand font-heading-small'>diaspoplug</p>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex flex-1 justify-center items-center space-x-6"> {/* Centered navigation */}
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3 py-2 flex flex-col items-center transition-all duration-200 min-w-0 ${active
                    ? 'text-text-brand'
                    : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                  <div className="w-5 h-5 mb-1"> {/* Icon container */}
                    <Image
                      width={20}
                      height={20}
                      src={item.icon}
                      alt={`${item.name} Icon`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-medium whitespace-nowrap">
                    {item.name}
                  </p>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-brand" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Section - Search, Language, Profile */}
          <div className="flex items-center space-x-4"> {/* Standard spacing */}
            {/* Search Box - Hidden on mobile */}
            <div className="hidden lg:flex items-center min-w-0 flex-1 max-w-xs">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={t('searchLabel')}
                id="main-search"
              />
            </div>

            {/* Language Selector and Theme Toggle */}
            {/* <div className="hidden lg:flex items-center space-x-2">
              <LocaleSwitcher
                selectClassName="appearance-none text-text-primary pr-8"
                optionClassName="bg-surface-default"
              />
              <ThemeToggle />
            </div> */}

            {/* User Profile */}
           <MyAvatar/>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-text-primary hover:bg-surface-hover transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border-subtle">
            {/* Mobile Search */}
            <div className="mb-4 px-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={t('searchLabel')}
                id="mobile-search"
              />
            </div>

            {/* Mobile Navigation Links */}
            <nav className="grid grid-cols-2 gap-2 mb-4">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-3 rounded-lg transition-all duration-200 ${active
                      ? 'bg-surface-brand-light text-text-brand font-medium border border-border-brand-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      }`}
                  >
                    <div className="w-5 h-5">
                      <Image
                        width={20}
                        height={20}
                        src={item.icon}
                        alt={`${item.name} Icon`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-text-brand rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile user info and language selector */}
            <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
              <div className="flex items-center space-x-3">
               <MyAvatar/>
                <span className="text-sm text-text-primary">Profile</span>
              </div>
              <div className="flex items-center space-x-2">
                <LocaleSwitcher
                  selectClassName="appearance-none text-text-primary text-sm"
                  optionClassName="bg-surface-default"
                />
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}


export function MyAvatar() {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>
        <Image
          width={32}
          height={32}
          src="/PROFILE.png"
          alt="Profile" />

      </AvatarFallback>
    </Avatar>

  )
}