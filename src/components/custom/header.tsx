'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import LocaleSwitcher from '../LocalSwitcher';
import { SearchInput } from './input';
import { ThemeToggle } from '@/app/[locale]/theme-toggle';
import { useTranslations } from 'next-intl';

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
    { name: t('marketplace'), href: `/${currentLocale}/marketplace`, icon: "/MARKETPLACE.svg" },
    { name: t('chat'), href: `/${currentLocale}/chat`, icon: "/CHAT.svg" },
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
   <header className="mx-auto border-b w-full "> {/* ✅ Full width header */}
      <div className="lg:max-w-[75.375rem] mx-auto px-4"> {/* ✅ Content centered with padding */}
        <div className="flex justify-between lg:justify-between lg:space-x-[5rem] h-[4rem] items-center">  {/* Logo */}
          <div>
            <Link href={`/${currentLocale}`}>
              <Image src="/LOGO.png" alt="Logo" width={80} height={80} className="" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-[1.25rem] items-center"> {/* 20px equivalent */}
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-[0.5rem] py-[0.5rem] flex flex-col justify-center items-center transition-all duration-200 ${active
                    ? 'text-text-brand border-b-[0.1875rem] border-border-brand' /* 3px equivalent */
                    : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                  <div className="w-[1.25rem] h-[1.25rem]"> {/* 20px equivalent */}
                    <Image
                      width={24}
                      height={24}
                      src={item.icon}
                      alt={`${item.name} Icon`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm mt-[0.25rem]"> {/* 4px equivalent */}
                    {item.name}
                  </p>
                </Link>
              );
            })}
          </nav>

          {/* Right Section - Search, Language, Profile */}
          <div className="flex items-center space-x-[1rem]"> {/* 16px equivalent */}
            {/* User Profile */}
            <div className="hidden lg:flex items-center space-x-[0.75rem]"> {/* 12px equivalent */}
              <div className="relative">
                <Image
                  width={24}
                  height={24}
                  src="/PROFILE.png"
                  alt="Profile"
                  className="w-[32px] h-[32px] rounded-full object-cover border-2 border-border-subtle" /* 32px equivalent */
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
                <div className="hidden w-[2rem] h-[2rem] bg-surface-subtle rounded-full items-center justify-center border-2">
                  <Image
                    width={24}
                    height={24}
                    src="/PROFILE.png"
                    alt="Profile"
                    className="w-[32px] h-[32px] rounded-full object-cover border-2 border-border-subtle"
                  />
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="hidden lg:flex relative">
              <LocaleSwitcher
                selectClassName="appearance-none text-text-primary pr-[1rem]" /* 16px equivalent */
                optionClassName="bg-surface-default"
              />
              <ThemeToggle />
            </div>

            {/* Search Box */}
            <div className="hidden lg:flex items-center">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={t('searchLabel')}
                id="main-search"
              />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-[0.5rem] rounded-md text-text-primary hover:text-text-secondary" /* 8px equivalent */
            >
              <svg className="w-[1.5rem] h-[1.5rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
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
          <div className="lg:hidden py-[1rem] border-t border-border-disabled"> {/* 16px equivalent */}
            {/* Mobile Search */}
            <div className="mb-[1rem] px-[1rem]"> {/* 16px equivalent */}
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={t('searchLabel')}
                id="main-search"
              />
            </div>

            {/* Mobile Navigation Links */}
            <nav className="grid grid-cols-2 gap-[0.5rem]"> {/* 8px equivalent */}
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-[0.5rem] px-[1rem] py-[0.75rem] rounded-lg transition-all duration-200 ${active
                      ? 'bg-surface-brand-light text-text-brand font-medium border border-border-brand-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-brand-light'
                      }`}
                    style={{ color: active ? 'var(--text-brand)' : 'var(--text-secondary)' }}
                  >
                    <div className="w-[1.25rem] h-[1.25rem]"> {/* 20px equivalent */}
                      <Image
                        width={24}
                        height={24}
                        src={item.icon}
                        alt={`${item.name} Icon`}
                        className="w-full h-full object-contain fill-amber-400"
                      />
                    </div>
                    <span>{item.name}</span>
                    {active && (
                      <div className="ml-auto w-[0.5rem] h-[0.5rem] bg-surface-brand rounded-full" /> /* 8px equivalent */
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile user info */}
            <div className="mt-[1rem] pt-[1rem] border-t border-border-subtle flex items-center space-x-[0.75rem] px-[1rem]"> {/* 16px, 12px equivalent */}
              <div className="relative">
                <Image
                  width={24}
                  height={24}
                  src="/PROFILE.png"
                  alt="Profile"
                  className="w-[2rem] h-[2rem] rounded-full object-cover border-2 border-border-subtle" /* 32px equivalent */
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
                <div className="hidden w-[2rem] h-[2rem] bg-surface-subtle rounded-full items-center justify-center border-2">
                  <Image
                    width={24}
                    height={24}
                    src="/PROFILE.png"
                    alt="Profile"
                    className="w-[2rem] h-[2rem] rounded-full object-cover border-2 border-border-subtle"
                  />
                </div>
              </div>
              {/* Mobile Language Selector */}
              <div className="px-[1rem]"> {/* 16px equivalent */}
                <LocaleSwitcher
                  selectClassName="appearance-none text-text-primary pr-[1rem]" /* 16px equivalent */
                  optionClassName="bg-surface-default"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}