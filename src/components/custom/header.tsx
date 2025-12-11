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
import { QuestionIcon, StorefrontIcon, X } from "@phosphor-icons/react";
import { IconFileDollar } from '@tabler/icons-react';
import React from 'react';
import HomeSidebar from '../home/HomeSidebar';



export default function Header({
  children,
}: {
  children: React.ReactNode;
}) {
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
    { name: t('marketplace'), href: `/${currentLocale}/marketplace`, icon: "/MARKETPLACE", disabled: true },
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


  const QuickLinks = () => {
    return (
      <nav className="flex w-full  justify-around lg:space-x-8 bg-surface-default">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex flex-col items-center justify-center
                lg:px-3 py-2 transition-all duration-200
                ${active ? 'text-text-brand' : 'text-text-secondary hover:text-text-primary'}
              `}
            >
              {/* Icon - Slightly raised above text */}
              <div className="-mt-1">
                <Image
                  width={60}
                  height={60}
                  src={`${item.icon}${active ? "active" : ""}.svg`}
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
    );
  }

  return (
    <div >
      <div className="h-app-top-down w-full bg-surface-default  top-0 z-50">
        <header className="lg:max-w-[80vw] mx-auto  bg-surface-default"> {/* Full width header */}
          <div className="mx-auto "> {/* Responsive padding */}
            <div className="flex  justify-between h-app-top-down"> {/* Standard header height */}
              <div className='flex'>
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

                {/* Logo */}
                <div className=" flex justify-start items-center">
                  <Link href={`/${currentLocale}`}>
                    <Image
                      src="/LOGO.svg"
                      alt="Logo"
                      width={100}
                      height={100}
                      className="object-fill bg-amber-900-"
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
                {/* Search Box - Hidden on mobile */}
                <div className="lg:w-50 w-[80%] ">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    placeholder={t('searchLabel')}
                    id="main-search"
                  />
                </div>

                {/* Language Selector and Theme Toggle */}
                <div className="hidden  items-center space-x-2">
                  {/* <LocaleSwitcher
                selectClassName="appearance-none text-text-primary pr-8"
                optionClassName="bg-surface-default"
              /> */}
                  <ThemeToggle />
                </div>

                {/* User Profile */}
                <DropdownMenuAvatar />


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
                    <Link href={`/${currentLocale}`} onClick={() => setIsMobileMenuOpen(false)}>
                      <Image
                        src="/LOGO.svg"
                        alt="Logo"
                        width={100}
                        height={100}
                        className="object-fill bg-amber-900-"
                      />
                    </Link>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Sidebar Content */}
                  <div className="p-4 " onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {/** TODO: prop drill the modal closing to the links */}
                    <HomeSidebar />
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
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
  const t = useTranslations('home.header');
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none cursor-pointer">
          <MyAvatar />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-100 mx-20 mt-4" align="start">
        <DropdownMenuLabel>
          <Link onClick={() => setOpen(false)} href={"/profile"} className='flex items-center justify-between'>
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

            <DMItem icon={<StorefrontIcon />} text={t('becomeVendor')} />
          </DropdownMenuItem>
          <DropdownMenuItem>

            <DMItem icon={<IconFileDollar />} text={'Become a vendor'} />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/wallet">
              <DMItem icon={<Wallet3 size="80" />} text={t('wallet')} />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <DMItem icon={<SettingsIcon className='w-full h-full'
            />} text={t('settingsPrivacy')} />

          </DropdownMenuItem>
          <DropdownMenuItem>
            <DMItem icon={<QuestionIcon size={32} />} text={t('helpSupport')} />

          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DMItem icon={<LogoutCurve
            size={40}
          />} text={t('logout')} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
