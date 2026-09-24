'use client';

import { useState, type ComponentType } from 'react';
import Image from 'next/image';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import {
  CaretRight,
  GearSix,
  Question,
  SignOut,
  User,
  Users,
  UsersThree,
  X,
  type IconProps,
} from '@phosphor-icons/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocalSwitcher';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { clearStorage } from '@/lib/logout';
import { useUserStore } from '@/store/useUserStore';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { MyAvatar } from './MyAvatar';

/** Brand palette of the account panel design (deep navy text, muted blue secondary). */
const NAVY = 'text-[#1B2A5E]';
const MUTED = 'text-[#5B6BA8]';

type NavItem = {
  key: 'myProfile' | 'myNetwork' | 'myCommunities' | 'settingsPrivacy' | 'helpSupport';
  href: string;
  icon: ComponentType<IconProps>;
  /** Highlights the row when the current path matches. */
  isActive?: (pathname: string) => boolean;
};

const PRIMARY_ITEMS: NavItem[] = [
  { key: 'myProfile', href: '/profile', icon: User, isActive: (p) => p === '/profile' },
  // The connections list is a modal on the profile page, opened by ?m=friends.
  { key: 'myNetwork', href: '/profile?m=friends', icon: Users },
  { key: 'myCommunities', href: '/community', icon: UsersThree, isActive: (p) => p.startsWith('/community') },
];

const SECONDARY_ITEMS: NavItem[] = [
  { key: 'settingsPrivacy', href: '/settings', icon: GearSix, isActive: (p) => p.startsWith('/settings') },
  { key: 'helpSupport', href: '/help', icon: Question, isActive: (p) => p.startsWith('/help') },
];

function PanelAvatar() {
  const url = useUserStore((s) => s.user?.avatarUrl);
  const { src, onError } = useImageFallback(url, '/PROFILE.png');
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // An empty src makes the browser re-request the page; fall back first.
      src={src || '/PROFILE.png'}
      alt=""
      onError={onError}
      className="size-16 shrink-0 rounded-full object-cover ring-2 ring-[#DCE5F5]"
    />
  );
}

function MenuRow({
  item,
  label,
  active,
  onNavigate,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        prefetch={false}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-5 rounded-xl px-4 py-4 transition-colors hover:bg-[#EEF3FC] focus-visible:bg-[#EEF3FC] focus-visible:outline-none ${
          active ? 'bg-[#EAF1FD]' : ''
        }`}
      >
        <Icon size={30} weight="regular" className={NAVY} aria-hidden />
        <span className={`flex-1 text-xl ${NAVY}`}>{label}</span>
        <CaretRight size={20} weight="regular" className={NAVY} aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Account menu opened from the header avatar: a full-height panel that slides
 * in from the right (full screen on phones). Replaces the old Radix dropdown.
 */
export function AccountMenuPanel() {
  const t = useTranslations('home.header');
  const tLegal = useTranslations('legal');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const firstName = useUserStore((s) => s.user?.firstName);
  const middleName = useUserStore((s) => s.user?.middleName);
  const lastName = useUserStore((s) => s.user?.lastName);
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const close = () => setOpen(false);
  const logout = () => {
    clearStorage();
    router.replace('/signin');
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          aria-label={t('profile')}
          className="rounded-full p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004c9c]"
        >
          <MyAvatar />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col bg-[#F8FAFD] shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[420px]"
          >
            <DialogPrimitive.Title className="sr-only">{t('profile')}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{t('tagline')}</DialogPrimitive.Description>

            {/* Brand header */}
            <div className="flex items-start justify-between px-6 pt-8">
              <div className="flex items-center gap-3">
                <Image src="/brand-mark.svg" alt="" width={56} height={32} className="h-8 w-auto" priority />
                <div>
                  <p className={`text-3xl font-bold leading-none tracking-tight ${NAVY}`}>DiaspoPlug</p>
                  <p className={`mt-1 text-base ${MUTED}`}>{t('tagline')}</p>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label={tCommon('closeMenu')}
                className={`-mr-1 mt-1 rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004c9c] ${NAVY}`}
              >
                <X size={32} weight="regular" aria-hidden />
              </DialogPrimitive.Close>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 pt-6" aria-label={t('profile')}>
              {/* User row */}
              <Link
                href="/profile"
                prefetch={false}
                onClick={close}
                className="flex items-center gap-6 rounded-xl px-2 py-3 hover:bg-[#EEF3FC] focus-visible:bg-[#EEF3FC] focus-visible:outline-none"
              >
                <PanelAvatar />
                <span className={`flex-1 truncate text-2xl font-bold ${NAVY}`}>{fullName}</span>
                <CaretRight size={24} weight="regular" className={NAVY} aria-hidden />
              </Link>

              <ul className="mt-3 space-y-1">
                {PRIMARY_ITEMS.map((item) => (
                  <MenuRow
                    key={item.key}
                    item={item}
                    label={t(item.key)}
                    active={item.isActive?.(pathname) ?? false}
                    onNavigate={close}
                  />
                ))}
              </ul>

              <hr className="mx-2 my-3 border-[#E3E8F2]" />

              <ul className="space-y-1">
                {SECONDARY_ITEMS.map((item) => (
                  <MenuRow
                    key={item.key}
                    item={item}
                    label={t(item.key)}
                    active={item.isActive?.(pathname) ?? false}
                    onNavigate={close}
                  />
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setConfirmLogout(true);
                    }}
                    className="flex w-full items-center gap-5 rounded-xl px-4 py-4 text-left transition-colors hover:bg-[#EEF3FC] focus-visible:bg-[#EEF3FC] focus-visible:outline-none"
                  >
                    <SignOut size={30} weight="regular" className={NAVY} aria-hidden />
                    <span className={`flex-1 text-xl ${NAVY}`}>{t('logout')}</span>
                    <CaretRight size={20} weight="regular" className={NAVY} aria-hidden />
                  </button>
                </li>
              </ul>
            </nav>

            {/* Footer */}
            <footer className="px-6 pb-8">
              <hr className="mb-5 border-[#E3E8F2]" />
              <div className={`flex flex-nowrap items-center gap-x-3 whitespace-nowrap text-[15px] ${MUTED}`}>
                <LocaleSwitcher selectClassName={`h-auto px-0 py-0 font-semibold ${MUTED}`} />
                <span aria-hidden className="h-5 w-px bg-[#D5DDEE]" />
                <Link href="/about" prefetch={false} onClick={close} className="hover:underline">
                  {tLegal('about')}
                </Link>
                <span aria-hidden className="h-5 w-px bg-[#D5DDEE]" />
                <Link href="/terms" prefetch={false} onClick={close} className="hover:underline">
                  {tLegal('terms')}
                </Link>
                <span aria-hidden className="h-5 w-px bg-[#D5DDEE]" />
                <Link href="/privacy" prefetch={false} onClick={close} className="hover:underline">
                  {tLegal('privacyPolicy')}
                </Link>
              </div>
              <p className={`mt-5 text-[15px] ${MUTED}`}>
                {t('copyright', { year: new Date().getFullYear() })}
              </p>
            </footer>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <LogoutConfirmModal open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={logout} />
    </>
  );
}
