'use client';



import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Lightbulb,
  MessageSquareMore,
  SquarePen,
  Store,
  Tag,
  Ticket,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { REDESIGN_IMAGES } from '@/lib/redesignImages';
import { MoreLinkCard } from './MoreLinkCard';
import { MoreRail } from './MoreRail';
import { ITEM_ICONS } from './moreIcons';
import { MORE_SECTIONS } from './moreLinks';


function MoreHero() {
  const t = useTranslations('more');
  const router = useRouter();
  const hero = REDESIGN_IMAGES.moreHero;

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/home');
  };

  return (
    <section
      aria-labelledby="more-title"
      className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default"
    >
      <div className="relative z-10 p-5 sm:max-w-[60%] sm:p-7">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('back')}
          className="-ml-1 inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm font-semibold text-text-primary transition-colors hover:text-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('pageLabel')}
        </button>
        <h1 id="more-title" className="mt-5 text-2xl font-bold leading-tight text-text-primary sm:text-3xl lg:text-[2rem]">
          {t('hero.title')}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t('hero.subtitle')}</p>
      </div>

      {/* Photo: a strip under the text on phones; the right side, fading into
          the card, from `sm` up. Decorative, so no alt text. */}
      <div className="relative h-36 sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[48%]">
        <Image
          src={hero.src}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 40vw, (min-width: 640px) 48vw, 100vw"
          className="object-cover object-center [mask-image:linear-gradient(to_bottom,transparent,black_35%)] sm:[mask-image:linear-gradient(to_right,transparent,black_40%)]"
        />
        <p
          aria-hidden
          className="absolute left-[18%] top-4 hidden -rotate-6 font-serif text-lg italic leading-snug text-text-brand drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] sm:block lg:text-xl"
        >
          {t('hero.tagline')}
        </p>
      </div>
    </section>
  );
}

/**
 * The More page: everything that is not one of the three main sections, as
 * cards grouped by theme, with a rail for the account, inboxes and help. It
 * replaces the old phone drawer and the left sidebar's links. Every card goes
 * to a page that exists today.
 */
export function MoreView() {
  const t = useTranslations('more');

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 space-y-5">
            <MoreHero />

            {MORE_SECTIONS.map((section) => (
              <section
                key={section.key}
                aria-labelledby={`more-section-${section.key}`}
                data-testid={`more-section-${section.key}`}
                className="rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5"
              >
                <h2 id={`more-section-${section.key}`} className="text-lg font-bold text-text-primary sm:text-xl">
                  {t(`sections.${section.key}.title`)}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t(`sections.${section.key}.subtitle`)}</p>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item) => {
                    const common = {
                      icon: ITEM_ICONS[item.key] ?? ClipboardList,
                      tone: item.tone,
                      title: t(`items.${item.key}.title`),
                      subtitle: t(`items.${item.key}.subtitle`),
                    };
                    return (
                      <li key={item.key} className="min-w-0">
                        <MoreLinkCard {...common} href={item.href ?? '/more'} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <MoreRail />
        </div>
      </div>
    </div>
  );
}
