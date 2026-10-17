'use client';

import { useState, type ComponentType } from 'react';
import Image from 'next/image';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import {
  BookmarkSimple,
  CaretRight,
  ClipboardText,
  EnvelopeSimple,
  GearSix,
  SignOut,
  User,
  Users,
  Wallet,
  X,
  type IconProps,
} from '@phosphor-icons/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocalSwitcher';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { clearStorage } from '@/lib/logout';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { MyAvatar } from './MyAvatar';

/** Brand palette of the account panel design (deep navy text, muted blue secondary). */
const NAVY = 'text-[#1B2A5E]';
const MUTED = 'text-[#5B6BA8]';

type ItemKey = 'profile' | 'network' | 'saved' | 'requests' | 'wallet' | 'settings' | 'contact';

type NavItem = {
  key: ItemKey;
  /** Locale-less path; every one is a real page (pinned by e2e/shell/account-panel.spec.ts). */
  href: string;
  icon: ComponentType<IconProps>;
  /** Highlights the row when the current path matches. */
  isActive?: (pathname: string) => boolean;
};

/**
 * Account items only. Home / Discover / Community / More live in the top nav,
 * so they are not repeated here.
 */
const ACCOUNT_PANEL_ITEMS: readonly NavItem[] = [
  { key: 'profile', href: '/profile', icon: User, isActive: (p) => p === '/profile' },
  // The friends page (people you know, requests, sent).
  { key: 'network', href: '/friends?tab=friends', icon: Users },
  { key: 'saved', href: '/saved', icon: BookmarkSimple, isActive: (p) => p.startsWith('/saved') },
  { key: 'requests', href: '/requests', icon: ClipboardText, isActive: (p) => p.startsWith('/requests') },
  { key: 'wallet', href: '/wallet', icon: Wallet, isActive: (p) => p.startsWith('/wallet') },
  { key: 'settings', href: '/settings', icon: GearSix, isActive: (p) => p.startsWith('/settings') },
  { key: 'contact', href: '/contact', icon: EnvelopeSimple, isActive: (p) => p.startsWith('/contact') },
];

const ROW =
  'flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#EEF3FC] focus-visible:bg-[#EEF3FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004c9c]';

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
      className="size-14 shrink-0 rounded-full object-cover ring-2 ring-[#DCE5F5]"
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
        className={`${ROW} ${active ? 'bg-[#EAF1FD]' : ''}`}
      >
        <Icon size={24} weight="regular" className={`shrink-0 ${NAVY}`} aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-base font-normal ${NAVY}`}>{label}</span>
        <CaretRight size={18} weight="regular" className={`shrink-0 ${NAVY}`} aria-hidden />
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
  const tPanel = useTranslations('accountPanel');
  const tLegal = useTranslations('legal');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const firstName = useUserStore((s) => s.user?.firstName);
  const middleName = useUserStore((s) => s.user?.middleName);
  const lastName = useUserStore((s) => s.user?.lastName);
  const username = useUserStore((s) => s.user?.username);
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  // Never an id: name, else @handle, else a neutral label.
  const displayName = fullName || (username ? `@${username}` : tPanel('accountFallback'));

  const close = () => setOpen(false);
  // The server session is revoked by the confirm modal's mutation; this drops the
  // local one. Without clearAuth/clearUser the persisted tokens survive and the
  // app still treats the browser as signed in.
  const logout = () => {
    clearStorage();
    useAuthStore.getState().clearAuth();
    useUserStore.getState().clearUser();
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
            data-testid="account-panel"
            className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col overflow-y-auto overflow-x-hidden bg-[#F8FAFD] shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[420px]"
          >
            <DialogPrimitive.Title className="sr-only">{tPanel('panelTitle')}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{t('tagline')}</DialogPrimitive.Description>

            {/* Brand header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <div className="flex min-w-0 items-center gap-3">
                <Image src="/brand-mark.svg" alt="" width={48} height={28} className="h-7 w-auto shrink-0" priority />
                <div className="min-w-0">
                  <p className={`truncate text-xl font-bold leading-none tracking-tight sm:text-2xl ${NAVY}`}>DiaspoPlug</p>
                  <p className={`mt-1 truncate text-sm ${MUTED}`}>{t('tagline')}</p>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label={tCommon('closeMenu')}
                className={`flex size-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004c9c] ${NAVY}`}
              >
                <X size={26} weight="regular" aria-hidden />
              </DialogPrimitive.Close>
            </div>

            {/* Identity — who is signed in; the "My profile" row below is the link */}
            <div className="mx-4 mt-4 flex items-center gap-4 rounded-2xl bg-white px-4 py-3 sm:mx-6" data-testid="account-identity">
              <PanelAvatar />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-lg font-semibold leading-tight ${NAVY}`}>{displayName}</p>
                {fullName && username ? <p className={`truncate text-sm ${MUTED}`}>@{username}</p> : null}
              </div>
            </div>

            <nav className="px-4 pt-3 sm:px-6" aria-label={tPanel('panelTitle')}>
              <ul className="space-y-1">
                {ACCOUNT_PANEL_ITEMS.map((item) => (
                  <MenuRow
                    key={item.key}
                    item={item}
                    label={tPanel(`items.${item.key}`)}
                    active={item.isActive?.(pathname) ?? false}
                    onNavigate={close}
                  />
                ))}
              </ul>

              <hr className="mx-2 my-3 border-[#E3E8F2]" />

              <ul>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      setConfirmLogout(true);
                    }}
                    className={ROW}
                  >
                    <SignOut size={24} weight="regular" className={`shrink-0 ${NAVY}`} aria-hidden />
                    <span className={`min-w-0 flex-1 truncate text-base font-normal ${NAVY}`}>{tPanel('signOut')}</span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* Footer */}
            <footer className="mt-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-8">
              <hr className="mb-3 border-[#E3E8F2]" />
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-0 text-sm ${MUTED}`}>
                <LocaleSwitcher selectClassName={`h-11 px-0 py-0 text-sm font-semibold data-[size=default]:h-11 ${MUTED}`} />
                <Link href="/about" prefetch={false} onClick={close} className="inline-flex min-h-11 items-center hover:underline">
                  {tLegal('about')}
                </Link>
                <Link href="/terms" prefetch={false} onClick={close} className="inline-flex min-h-11 items-center hover:underline">
                  {tLegal('terms')}
                </Link>
                <Link href="/privacy" prefetch={false} onClick={close} className="inline-flex min-h-11 items-center hover:underline">
                  {tLegal('privacyPolicy')}
                </Link>
              </div>
              <p className={`mt-2 text-sm ${MUTED}`}>{t('copyright', { year: new Date().getFullYear() })}</p>
            </footer>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <LogoutConfirmModal open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={logout} />
    </>
  );
}
