'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Home, Search, Users, ShoppingCart, Bell, MessageCircle, ChevronDown, User } from 'lucide-react';
import Image from 'next/image';
import LocaleSwitcher from '../LocalSwitcher';
import { SearchInput } from './input';
import { ThemeToggle } from '@/app/[locale]/theme-toggle';
import { useTranslations } from 'next-intl';

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const t = useTranslations('home.header');

  const handleSearch = () => {
    console.log('Searching for:', searchQuery);
    // Add your search logic here
  };

  const segments = pathname.split('/').filter(segment => segment);
  const currentLocale = segments[0] || 'en';

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'it', name: 'Italiano', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  const navigation = [
    { name: t('home'), href: `/${currentLocale}`, icon: Home },
    { name: t('community'), href: `/${currentLocale}/community`, icon: Users },
    { name: t('marketplace'), href: `/${currentLocale}/marketplace`, icon: ShoppingCart },
    { name: t('chat'), href: `/${currentLocale}/chat`, icon: MessageCircle },
    { name: t('notification'), href: `/${currentLocale}/notification`, icon: Bell },
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
    <header className="bg-surface-default sticky top-0 z-50 border-b">
      <div className="w-[90%] mx-auto ">
        <div className="  flex justify-between md:justify-between md:space-x-20 h-16 items-center">
          {/* Logo */}
          <div >
            <Link href={`/${currentLocale}`} >
              <Image src="/LOGO.png" alt="Logo" width={80} height={80} className="" />            
              </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-5 items-center">
            {navigation.map((item) => {
              const active = isActive(item.href);
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-2 py-2 flex flex-col justify-center items-center transition-all duration-200 ${active
                    ? 'text-text-brand border-b-3 border-border-brand'
                    : 'border-0 text-text-secondary hover:text-text-primary'
                    }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <p className="text-sm mt-1">{item.name}</p>
                </Link>
              );
            })}
          </nav>

          {/* Right Section - Search, Language, Profile */}
          <div className="flex items-center space-x-4">

            {/* User Profile */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="relative">
                <Image
                  width={24}
                  height={24}
                  src="/api/placeholder/32/32"
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
                <div className=" hidden w-8 h-8 bg-surface-subtle  rounded-full  items-center justify-center border-2 ">
                  <span className="text-text-success"><User size={20} /></span>
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="hidden md:flex relative">
              <LocaleSwitcher
                selectClassName="appearance-none text-text-primary  pr-4"
                optionClassName="  bg-surface-default"
              />        

              <ThemeToggle/>      
              
              </div>

            {/* Search Box */}
            <div className="hidden md:flex items-center">
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
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
          <div className="md:hidden py-4 border-t border-border-disabled">
            {/* Mobile Search */}
            <div className="mb-4 px-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={t('searchLabel')}
                id="main-search"
              />
            </div>

            {/* Mobile Navigation Links */}
            <nav className="grid grid-cols-2 gap-2">
              {navigation.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${active
                      ? 'bg-surface-brand-light text-text-brand font-medium border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.name}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-surface-brand rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile user info */}
            <div className="
             mt-4 pt-4 border-t border-gray-200 flex items-center space-x-3 px-4">
              <div className="relative">
                <Image
                  width={24}
                  height={24}
                  src="/api/placeholder/32/32"
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
                <div className=" hidden w-8 h-8 bg-surface-subtle  rounded-full  items-center justify-center border-2 ">
                  <span className="text-text-success"><User size={20} /></span>
                </div>
              </div>
              {/* Mobile Language Selector */}
              <div className=" px-4">
                <LocaleSwitcher
                  selectClassName="appearance-none text-text-primary  pr-4"
                  optionClassName="  bg-surface-default"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}