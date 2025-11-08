/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cloneElement, isValidElement, ReactNode, useState } from 'react';
import Image from 'next/image';
import LocaleSwitcher from '../LocalSwitcher';
import { SearchInput } from './input';
import { ThemeToggle } from '@/app/[locale]/theme-toggle';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRight as CR, SettingsIcon } from 'lucide-react';
import { LogoutCurve, Wallet3 } from 'iconsax-reactjs';
import { QuestionIcon, StorefrontIcon } from "@phosphor-icons/react";
import { IconFileDollar } from '@tabler/icons-react';
import React from 'react';



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
    { name: t('home'), href: `/${currentLocale}`, icon: "/HOME" },
    { name: t('community'), href: `/${currentLocale}/community`, icon: "/COMMUNITY" },
    { name: t('marketplace'), href: "#", icon: "/MARKETPLACE", disabled: true },
    { name: t('chat'), href: `/${currentLocale}/chat`, icon: "/CHAT", disabled: true },
    { name: t('notification'), href: `/${currentLocale}/notification`, icon: "/NOTIFICATION" },
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
        <div className="flex justify-between  h-16 "> {/* Standard header height */}
          {/* Logo */}
          <div className=" flex text-center justify-center items-center">
            <Link href={`/${currentLocale}`}>
              <p className='text-text-brand font-heading-small'>diaspoplug</p>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
<nav className="hidden lg:flex space-x-8">
  {navigation.map((item) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`
          group relative flex flex-col items-center justify-center
          px-3 py-2 transition-all duration-200
          ${active ? 'text-text-brand' : 'text-text-secondary hover:text-text-primary'}
        `}
      >
        {/* Icon - Slightly raised above text */}
        <div className="-mt-1">
          <Image
            width={60}
            height={60}
            src={`${item.icon}${active?"active":""}.svg`}
            alt={`${item.name} Icon`}
            className="w-6 h-6 object-contain"
          />
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
            <div className="hidden lg:flex items-center space-x-2">
              {/* <LocaleSwitcher
                selectClassName="appearance-none text-text-primary pr-8"
                optionClassName="bg-surface-default"
              /> */}
              <ThemeToggle />
            </div>

            {/* User Profile */}
            <DropdownMenuAvatar />

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
                <DropdownMenuAvatar />
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


interface DMItemProps {
  icon: ReactNode;
  text: string;
  onClick?: () => void;
}

export function DMItem({ icon: Icon, text, onClick }: DMItemProps) {
  const renderIcon = () => {
    if (!isValidElement(Icon)) return Icon;

    const props: any = {
      className: "w-full h-full text-primary",
    };

    // Only add `size` if the icon likely supports it
    const iconName = (Icon.type as any)?.displayName || '';
    const supportsSize = /Wallet|Logout|Storefront|Question|FileDollar/.test(iconName);

    if (supportsSize) {
      props.size = 20;
    }

    return cloneElement(Icon, props);
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center space-x-3 my-2 cursor-pointer select-none"
    >
      <div className="w-6 h-6 rounded flex items-center justify-center p-1">
        {renderIcon()}
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}



export function DropdownMenuAvatar() {
  return (
    <DropdownMenu >
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <MyAvatar />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-100 mx-20 mt-4" align="start">
        <DropdownMenuLabel>
          <Link href={"/profile"} className='flex items-center justify-between'>
            <div className='flex space-x-4 items-center my-2'>
              <MyAvatar />
              <p className='text-xl'>John Doe</p>
            </div>
            <CR />
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>

            <DMItem icon={<StorefrontIcon />} text={'Become a vendor'} />
          </DropdownMenuItem>
          <DropdownMenuItem>

            <DMItem icon={<IconFileDollar />} text={'Become a vendor'} />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>

            <DMItem icon={<Wallet3
              size="80"
            />} text={'Wallet'} />

          </DropdownMenuItem>
          <DropdownMenuItem>
            <DMItem icon={<SettingsIcon className='w-full h-full'
            />} text={'Settings & Privacy'} />

          </DropdownMenuItem>
          <DropdownMenuItem>
            <DMItem icon={<QuestionIcon size={32} />} text={'Help & Support'} />

          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DMItem icon={<LogoutCurve
            size={40}
          />} text={'Logout'} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
