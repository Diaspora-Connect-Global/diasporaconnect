'use client';

import { ChevronLeft, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CircleAvatar, CircleBanner } from '@/components/circles/index';
import { Link } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';

import { CircleSectionNav } from './CircleSectionNav';
import { CircleStartMenu } from './CircleStartMenu';

export interface CircleHeroProps {
  circleId: string;
  name: string;
  tagline?: string | null;
  memberCount: number;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  chatOn: boolean;
}

/**
 * The circle's own home header: banner, avatar, name, tagline, member count, the
 * "Start something" action and the section navigation, in one card.
 *
 * Circle-owned on purpose (the shared `PageHero` is a stock-photo hero for the
 * platform's own pages). A circle has its own identity, so the strip is the
 * circle's uploaded banner when it has one and a soft gradient when it does not;
 * never a stock photo presented as theirs. The name and tagline sit on the card
 * surface BELOW the strip rather than over the image, so their contrast does not
 * depend on whatever picture a circle uploaded.
 */
export function CircleHero({ circleId, name, tagline, memberCount, avatarUrl, bannerUrl, chatOn }: CircleHeroProps) {
  const t = useTranslations('circles');

  return (
    <header
      data-testid="circle-header"
      className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-default shadow-sm"
    >
      <div className="relative h-28 bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default dark:from-slate-700 dark:via-slate-800 dark:to-surface-default sm:h-40">
        {bannerUrl ? (
          <CircleBanner src={toCdnUrl(bannerUrl)} className="absolute inset-0 h-full bg-transparent" />
        ) : null}
        <Link
          href="/circles"
          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface-default/90 px-3 py-1.5 text-xs font-medium text-text-primary shadow-sm backdrop-blur hover:bg-surface-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {t('errors.notFound.cta')}
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <CircleAvatar
            name={name}
            src={toCdnUrl(avatarUrl)}
            // `relative`: the strip above is positioned, so without it the strip paints over the avatar's top.
            className="relative -mt-9 size-[72px] border-4 border-surface-default text-2xl font-bold sm:-mt-12 sm:size-24 sm:text-3xl"
          />
          <div className="min-w-0 sm:pb-1">
            <h1 className="break-words text-2xl font-bold leading-tight text-text-primary sm:text-3xl">{name}</h1>
            {tagline ? <p className="mt-1 text-sm text-text-secondary sm:text-base">{tagline}</p> : null}
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Users aria-hidden="true" className="size-4" />
              {t('common.memberCount', { count: memberCount })}
            </p>
          </div>
        </div>
        <CircleStartMenu circleId={circleId} className="self-start sm:self-auto" />
      </div>

      <CircleSectionNav circleId={circleId} chatOn={chatOn} />
    </header>
  );
}
