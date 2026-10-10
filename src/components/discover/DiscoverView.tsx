'use client';

import { useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Search, Wrench } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { DISCOVER_CATEGORIES } from './discoverLinks';

const CATEGORY_ICONS: Record<(typeof DISCOVER_CATEGORIES)[number]['key'], LucideIcon> = {
  services: Wrench,
  events: CalendarDays,
};

/** `/discover` (v1): a search box into the existing search page, and category tiles. */
export function DiscoverView() {
  const t = useTranslations('discover');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const hero = REDESIGN_IMAGES.discoverHero;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <section
          aria-labelledby="discover-title"
          className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default"
        >
          <div className="relative z-10 p-5 sm:max-w-[62%] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-primary">{t('eyebrow')}</p>
            <h1 id="discover-title" className="mt-2 text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>

            <form role="search" onSubmit={onSubmit} className="mt-5 flex items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
              <label htmlFor="discover-search" className="sr-only">
                {t('searchLabel')}
              </label>
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
              <input
                ref={inputRef}
                id="discover-search"
                type="search"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={200}
                className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-surface-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
              >
                {t('searchButton')}
              </button>
            </form>
          </div>

          <div className="relative h-36 sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[45%]">
            <Image
              src={hero.src}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 36vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover object-center [mask-image:linear-gradient(to_bottom,transparent,black_35%)] sm:[mask-image:linear-gradient(to_right,transparent,black_40%)]"
            />
            <p
              aria-hidden
              className="absolute left-[12%] top-6 hidden -rotate-6 font-serif text-lg italic leading-snug text-text-brand drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] sm:block lg:text-xl"
            >
              {t('tagline')}
            </p>
          </div>
        </section>

        <nav aria-labelledby="discover-categories" className="rounded-2xl border border-border-subtle bg-surface-default p-2">
          <h2 id="discover-categories" className="sr-only">
            {t('categoriesHeading')}
          </h2>
          <ul className="grid grid-cols-2 divide-x divide-border-subtle">
            {DISCOVER_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.key];
              return (
                <li key={category.key}>
                  <Link
                    href={category.href}
                    prefetch={false}
                    className="flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                  >
                    <span className={`grid size-12 place-items-center rounded-full ${TONE_CLASS[category.tone]}`}>
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    {t(`categories.${category.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
