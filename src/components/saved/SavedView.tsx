'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, CalendarDays, FileText, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SavedPosts } from './SavedPosts';
import { SavedEvents } from './SavedEvents';
import { SavedOpportunities } from './SavedOpportunities';

type Tab = 'posts' | 'events' | 'opportunities';

const TABS: { key: Tab; icon: typeof FileText }[] = [
  { key: 'posts', icon: FileText },
  { key: 'events', icon: CalendarDays },
  { key: 'opportunities', icon: Lightbulb },
];

/**
 * `/saved` — aggregate view of everything the user has saved (posts, events,
 * opportunities). Resources are omitted because no saved-resources query exists.
 */
export function SavedView() {
  const t = useTranslations('savedPage');
  const [tab, setTab] = useState<Tab>('posts');

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        {/* Header */}
        <section
          aria-labelledby="saved-title"
          className="rounded-2xl border border-border-subtle bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default p-5 sm:p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface-brand/10">
              <Bookmark className="size-5 text-text-brand" aria-hidden />
            </div>
            <div>
              <h1 id="saved-title" className="text-2xl font-bold text-text-primary sm:text-3xl">
                {t('title')}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <nav aria-label={t('tabsLabel')} className="mt-5">
          <ul role="tablist" className="flex gap-1 rounded-xl border border-border-subtle bg-surface-default p-1">
            {TABS.map(({ key, icon: Icon }) => (
              <li key={key} role="presentation" className="flex-1">
                <button
                  role="tab"
                  type="button"
                  id={`saved-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls={`saved-panel-${key}`}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand',
                    tab === key
                      ? 'bg-surface-brand text-white shadow-sm'
                      : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{t(`tabs.${key}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Panels */}
        <div className="mt-5">
          <div role="tabpanel" id="saved-panel-posts" aria-labelledby="saved-tab-posts" hidden={tab !== 'posts'}>
            {tab === 'posts' && <SavedPosts />}
          </div>
          <div role="tabpanel" id="saved-panel-events" aria-labelledby="saved-tab-events" hidden={tab !== 'events'}>
            {tab === 'events' && <SavedEvents />}
          </div>
          <div role="tabpanel" id="saved-panel-opportunities" aria-labelledby="saved-tab-opportunities" hidden={tab !== 'opportunities'}>
            {tab === 'opportunities' && <SavedOpportunities />}
          </div>
        </div>
      </div>
    </div>
  );
}
