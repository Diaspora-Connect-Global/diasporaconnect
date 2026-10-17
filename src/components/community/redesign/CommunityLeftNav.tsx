'use client';

import { CalendarDays, UserSearch, UsersRound, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export const COMMUNITY_NAV_ITEMS: { key: 'people' | 'circles' | 'events'; href: string; icon: LucideIcon }[] = [
  { key: 'people', href: '/people', icon: UserSearch },
  { key: 'circles', href: '/circles', icon: UsersRound },
  { key: 'events', href: '/events', icon: CalendarDays },
];

/** The mockup's left navigation (without Home: the top bar and the phone bottom bar already carry Home / Discover / Community / More): only entries that open a real page ("Help & Resources" has none yet). */
export function CommunityLeftNav() {
  const t = useTranslations('communityPage');
  return (
    <>
      <nav aria-label={t('navLabel')} data-testid="community-nav" className="rounded-2xl border border-border-subtle bg-surface-default p-2 shadow-sm">
        <ul>
          {COMMUNITY_NAV_ITEMS.map(({ key, href, icon: Icon }) => (
            <li key={key}>
              <Link href={href} prefetch={false} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                <Icon className="size-4 text-text-brand" aria-hidden />
                {t(`nav.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function CommunityPromo() {
  const t = useTranslations('communityPage.promo');
  return (
    <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 p-5 text-white shadow-sm">
      <h2 className="text-base font-bold">{t('title')}</h2>
      <p className="mt-1.5 text-sm text-white/80">{t('body')}</p>
      <Link href="/circles" prefetch={false} className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        {t('cta')}
      </Link>
    </section>
  );
}
