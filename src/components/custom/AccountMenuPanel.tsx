'use client';

import { useState, type ComponentType } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
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
import { clearAllPostDrafts } from '@/hooks/usePostDraft';
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
  'flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-brand-light/60 focus-visible:bg-surface-brand-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

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
      className="size-14 shrink-0 rounded-full object-cover ring-2 ring-surface-brand-light"
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
        className={`${ROW} ${active ? 'bg-surface-brand-light' : ''}`}
      >
        <Icon size={24} weight="regular" className="shrink-0 text-text-brand" aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-base font-normal ${NAVY}`}>{label}</span>
        <CaretRight size={18} weight="regular" className={`shrink-0 ${NAVY}`} aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Account menu opened from the header avatar: a dropdown card ANCHORED to the avatar
 * (Radix Popover), as tall as its content, no dimmed backdrop. Modal for focus only:
 * focus stays inside while open, Esc / outside click close it, focus returns to the
 * avatar. It used to be a full-height dialog sheet, which looked heavy (owner, 2026-10-18).
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
    // Unfinished posts (and their photos) must not wait in this browser for the next person.
    void clearAllPostDrafts();
    useAuthStore.getState().clearAuth();
    useUserStore.getState().clearUser();
    router.replace('/signin');
  };

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal>
        <PopoverPrimitive.Trigger
          aria-label={t('profile')}
          className="rounded-full p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <MyAvatar />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            data-testid="account-panel"
            aria-label={tPanel('panelTitle')}
            align="end"
            side="bottom"
            sideOffset={8}
            collisionPadding={8}
            className="z-50 flex max-h-[min(var(--radix-popover-content-available-height),calc(100dvh-5rem))] w-[calc(100vw-1rem)] origin-[var(--radix-popover-content-transform-origin)] flex-col overflow-y-auto overflow-x-hidden rounded-2xl border border-border-subtle bg-[#F8FAFD] shadow-xl duration-150 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-[360px]"
          >
            {/* Identity — who is signed in; the "My profile" row below is the link */}
            <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-white px-3 py-3" data-testid="account-identity">
              <PanelAvatar />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-lg font-semibold leading-tight ${NAVY}`}>{displayName}</p>
                {fullName && username ? <p className={`truncate text-sm ${MUTED}`}>@{username}</p> : null}
              </div>
              <PopoverPrimitive.Close
                aria-label={tCommon('closeMenu')}
                className={`flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-brand-light/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${NAVY}`}
              >
                <X size={22} weight="regular" aria-hidden />
              </PopoverPrimitive.Close>
            </div>

            <nav className="px-3 pt-2" aria-label={tPanel('panelTitle')}>
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
                    <SignOut size={24} weight="regular" className="shrink-0 text-text-brand" aria-hidden />
                    <span className={`min-w-0 flex-1 truncate text-base font-normal ${NAVY}`}>{tPanel('signOut')}</span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* Footer */}
            <footer className="px-4 pb-4 pt-2">
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
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <LogoutConfirmModal open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={logout} />
    </>
  );
}
