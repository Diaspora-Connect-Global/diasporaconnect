'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/redesign/PageHero';
import { useGreeting } from '@/components/redesign/useGreeting';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';

function regionName(code: string | null | undefined, locale: string): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) ?? '';
  } catch {
    return '';
  }
}

/** "Good morning, Ama" hero. The location chip appears only when the profile has a city or country. */
export function HomeHero({ firstName, city, countryCode }: { firstName?: string | null; city?: string | null; countryCode?: string | null }) {
  const t = useTranslations('homePage');
  const locale = useLocale();
  const greeting = useGreeting();
  const place = [city?.trim(), regionName(countryCode, locale)].filter(Boolean).join(', ');
  const name = firstName?.trim();
  return (
    <PageHero
      id="home-hero-title"
      tone="photo"
      priority
      image={REDESIGN_IMAGES.homeHero}
      eyebrow={name ? t(`greeting.${greeting}`) : undefined}
      title={name ? <>{name} <span aria-hidden>👋</span></> : t(`greeting.${greeting}`).replace(/,$/, '')}
      subtitle={t('heroSubtitle')}
      chip={place || undefined}
    >
      <Link
        href="/discover"
        prefetch={false}
        className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {t('heroCta')}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </PageHero>
  );
}
