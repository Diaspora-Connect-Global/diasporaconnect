'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight, BadgeCheck, Bell, Bookmark, ChevronRight, FileText, Headset, Info, MessageCircleMore, Settings, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@apollo/client/react';
import { Link } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocalSwitcher';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { useUnreadCounts } from '@/components/custom/UnreadCountsContext';
import { GET_MY_PROFILE, type GetProfileResponse } from '@/services/gql/profile';
import { GET_MY_KYC_STATUS } from '@/services/gql/kyc';
import type { GetMyKycStatusResponse } from '@/services/gql/types/kyc';
import { isVerifiedKycStatus } from '@/hooks/useKYCVerification';
import { formatBadgeCount } from '@/lib/chatUnread';
import { displayName } from '@/lib/displayName';
import { toCdnUrl } from '@/lib/cdn';
import { MORE_ACCOUNT_LINKS, MORE_RAIL_LINKS } from './moreLinks';

const ROW_CLASS =
  'flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left text-sm text-text-primary transition-colors hover:text-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

const LEGAL_ICONS: Record<(typeof MORE_RAIL_LINKS)[number]['key'], LucideIcon> = {
  contact: Headset,
  settings: Settings,
  privacy: ShieldCheck,
  terms: FileText,
  about: Info,
};

function CountBadge({ count, label }: { count: number; label: string }) {
  const text = formatBadgeCount(count);
  if (!text) return <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-text-danger px-1.5 text-[11px] font-semibold text-white">
      <span aria-hidden>{text}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Year the account was created, or null when the server sent nothing usable. */
function memberSinceYear(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null;
  const year = new Date(createdAt).getFullYear();
  return Number.isFinite(year) && year > 2000 ? year : null;
}

/**
 * Right rail of the More page: who you are (name, real verification state,
 * member since), your inboxes with the same unread counts as the header, and
 * support + legal links. Every value is real; nothing is shown when the server
 * has nothing to say.
 */
export function MoreRail() {
  const t = useTranslations('more.rail');
  const tLegal = useTranslations('legal');
  const tHeader = useTranslations('home.header');
  const counts = useUnreadCounts();

  // Already in the cache: the shell's boot gate loaded it before this page mounted.
  const { data: profileData } = useQuery<GetProfileResponse>(GET_MY_PROFILE, { fetchPolicy: 'cache-first' });
  // Only decides whether a badge shows: a failure means "no badge", never a toast.
  const { data: kycData } = useQuery<GetMyKycStatusResponse>(GET_MY_KYC_STATUS, {
    fetchPolicy: 'cache-first',
    context: { silentErrors: true },
  });
  const profile = profileData?.getProfile?.profile ?? null;

  const name = displayName(profile, t('memberFallback'));
  // Same rule as the profile page's verification card: the live KYC status, or
  // the profile's own verification flag. Never shown on a guess.
  const verified = isVerifiedKycStatus(kycData?.getMyKYCStatus?.status) || profile?.verificationStatus === 'verified';
  const since = memberSinceYear(profile?.createdAt);
  const { src: avatarSrc, onError: onAvatarError } = useImageFallback(
    profile?.avatarUrl ? toCdnUrl(profile.avatarUrl) : undefined,
    '/PROFILE.png',
  );

  return (
    <aside aria-label={t('label')} className="min-w-0 space-y-5" data-testid="more-rail">
      <section className="rounded-2xl border border-border-subtle bg-surface-default p-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc || '/PROFILE.png'}
            alt=""
            onError={onAvatarError}
            className="size-16 shrink-0 rounded-full object-cover ring-2 ring-surface-info"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-primary">{name}</p>
            {verified && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-success px-2 py-0.5 text-xs font-medium text-text-success">
                <BadgeCheck className="size-3.5" aria-hidden />
                {t('verified')}
              </span>
            )}
            {since !== null && <p className="mt-1 text-xs text-muted-foreground">{t('memberSince', { year: since })}</p>}
          </div>
        </div>

        <Link
          href={MORE_ACCOUNT_LINKS.profile}
          prefetch={false}
          className="mt-4 flex items-center justify-between rounded-xl bg-surface-info px-4 py-2.5 text-sm font-medium text-text-brand transition-colors hover:bg-surface-brand-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          {t('viewProfile')}
          <ChevronRight className="size-4" aria-hidden />
        </Link>

        <ul className="mt-2 divide-y divide-border-subtle">
          <li>
            <Link href={MORE_ACCOUNT_LINKS.notifications} prefetch={false} className={ROW_CLASS}>
              <Bell className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{t('notifications')}</span>
              <CountBadge count={counts.notifications} label={tHeader('unreadNotificationsLabel', { count: counts.notifications })} />
            </Link>
          </li>
          <li>
            <Link href={MORE_ACCOUNT_LINKS.messages} prefetch={false} className={ROW_CLASS}>
              <MessageCircleMore className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{t('messages')}</span>
              <CountBadge count={counts.messages} label={tHeader('unreadMessagesLabel', { count: counts.messages })} />
            </Link>
          </li>
          <li>
            <Link href="/saved" prefetch={false} className={ROW_CLASS}>
              <Bookmark className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{t('savedItems')}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="more-help-heading" className="rounded-2xl border border-border-subtle bg-surface-default p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand">
            <Headset className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="more-help-heading" className="text-sm font-semibold text-text-primary">
              {t('helpTitle')}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('helpBody')}</p>
          </div>
        </div>
        <Link
          href="/contact"
          prefetch={false}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-info px-4 py-2 text-sm font-medium text-text-brand transition-colors hover:bg-surface-brand-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          {tLegal('contact')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>

        <ul className="mt-3 divide-y divide-border-subtle">
          {MORE_RAIL_LINKS.filter((l) => l.key !== 'contact').map((link) => {
            const Icon = LEGAL_ICONS[link.key];
            return (
              <li key={link.key}>
                <Link href={link.href} prefetch={false} className={ROW_CLASS}>
                  <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1">{t(`links.${link.key}`)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs text-muted-foreground">
          <LocaleSwitcher selectClassName="h-auto px-0 py-0 text-xs font-medium text-text-primary" />
          <span>{tHeader('copyright', { year: new Date().getFullYear() })}</span>
        </div>
      </section>
    </aside>
  );
}
