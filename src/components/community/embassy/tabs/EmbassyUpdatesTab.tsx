'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import {
  LayoutGrid,
  Bell,
  ClipboardList,
  Plane,
  Newspaper,
  CalendarDays,
  ArrowDownWideNarrow,
  ChevronDown,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmbassyFeedList } from '../EmbassyFeedList';
import { FeedListSkeleton } from '../EmbassySkeletons';
import type { EmbassyProfile } from '../embassyMock';
import type { EmbassyFeedPost, EmbassyViewProps } from '../types';

interface EmbassyUpdatesTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

interface UpdateCategory {
  key: string;
  label: string;
  icon: LucideIcon;
}

// Category list + labels/icons. Counts are NOT hardcoded — they are derived at
// runtime from the real feed (`props.posts`) via each post's `contentType`.
const CATEGORIES: UpdateCategory[] = [
  { key: 'all', label: 'All Updates', icon: LayoutGrid },
  { key: 'announcements', label: 'Announcements', icon: Bell },
  { key: 'notices', label: 'Notices', icon: ClipboardList },
  { key: 'advisories', label: 'Advisories', icon: Plane },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'events', label: 'Events', icon: CalendarDays },
];

// Each bucket key maps to the AI category label to match (case-insensitive) on
// `post.categories` (the AI classification, e.g. "Announcement", "Event").
const BUCKET_LABEL: Record<string, string> = {
  announcements: 'announcement',
  notices: 'notice',
  advisories: 'advisory',
  news: 'news',
  events: 'event',
};

/** True if a post's AI `categories` include the label for the given bucket. */
function postInBucket(post: EmbassyFeedPost, key: string): boolean {
  const label = BUCKET_LABEL[key];
  if (!label) return false;
  return (post.categories ?? []).some((c) => c.toLowerCase().includes(label));
}

// Shared styling for the "Contact Embassy" CTA. Mirrors ButtonType2 (brand
// surface, white text, rounded-full) but lives on an <a>/<Link> so the action
// is a real navigation (mailto / support tab) rather than a dead button.
const CONTACT_BUTTON_CLASS =
  'label-medium flex w-full items-center justify-center gap-2 rounded-full border ' +
  'bg-surface-brand px-4 py-2 text-text-white transition-colors hover:bg-border-brand hover:text-text-white';

/** Updates = the community's own post feed (announcements/news posts). */
type SortOrder = 'newest' | 'oldest';

export function EmbassyUpdatesTab({ props, profile }: EmbassyUpdatesTabProps) {
  const t = useTranslations('community.embassy');
  const { community, posts, feedLoading } = props;
  const [active, setActive] = useState('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fallback target when no contact email exists: the Support tab, built with the
  // same `?tab=` Link pattern used across the other embassy tabs.
  const supportHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'support');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams]);

  // Real, derived category counts (no mock fallback). "All Updates" = total
  // posts; each bucket = posts whose contentType maps to it (0 if none).
  const counts = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = { all: posts.length };
    for (const key of Object.keys(BUCKET_LABEL)) {
      acc[key] = posts.filter((post) => postInBucket(post, key)).length;
    }
    return acc;
  }, [posts]);

  // Feed shown in the list: "all" shows everything, otherwise only posts whose
  // AI categories match the selected bucket — then ordered by `createdAt` per the
  // chosen sort.
  const visiblePosts = useMemo<EmbassyFeedPost[]>(() => {
    const filtered =
      active === 'all' ? posts : posts.filter((post) => postInBucket(post, active));
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'newest' ? -diff : diff;
    });
  }, [posts, active, sort]);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_20rem] lg:px-6">
      {/* Main column */}
      <div className="min-w-0 space-y-4">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setActive(c.key)}
                className={`label-medium rounded-full px-4 py-1.5 transition-colors ${
                  active === c.key
                    ? 'bg-surface-brand text-text-white'
                    : 'border border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="caption-large inline-flex items-center gap-1 text-text-secondary outline-none hover:text-text-primary">
              <ArrowDownWideNarrow className="size-4" aria-hidden />
              {sort === 'newest' ? t('updates.sortNewest') : t('updates.sortOldest')}
              <ChevronDown className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as SortOrder)}
              >
                <DropdownMenuRadioItem value="newest">
                  {t('updates.sortNewest')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  {t('updates.sortOldest')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Feed */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h2 className="heading-xsmall mb-4 text-text-primary">{t('home.latestUpdates')}</h2>
            {feedLoading ? (
              <FeedListSkeleton />
            ) : visiblePosts.length > 0 ? (
              <EmbassyFeedList
                posts={visiblePosts}
                community={community}
                fallbackAvatar={profile.flagUrl || '/GLOBE.png'}
                isMember={props.isActive}
                onLike={props.onLike}
                onSave={props.onSave}
                onShare={props.onShare}
                onSendComment={props.onSendComment}
                onDeletePost={props.onDeletePost}
              />
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
                  <Newspaper className="size-6 text-text-secondary" aria-hidden />
                </span>
                <p className="body-small text-text-primary">{t('home.noUpdates')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right rail */}
      <aside className="space-y-6">
        {/* Filter by Category */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large mb-3 text-text-primary">Filter by Category</h3>
            <ul className="space-y-1">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const isActive = active === c.key;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => setActive(c.key)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                        isActive ? 'bg-surface-brand-subtle' : 'hover:bg-surface-subtle'
                      }`}
                    >
                      <span className="caption-large inline-flex items-center gap-2 text-text-primary">
                        <Icon className={`size-4 ${isActive ? 'text-text-brand' : 'text-text-secondary'}`} aria-hidden />
                        {c.label}
                      </span>
                      <span
                        className={`caption-small rounded-full px-2 py-0.5 ${
                          isActive ? 'bg-surface-brand-light text-text-brand' : 'bg-surface-subtle text-text-secondary'
                        }`}
                      >
                        {counts[c.key] ?? 0}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Have a Question? */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large text-text-primary">{t('updates.questionTitle')}</h3>
            <p className="body-small mt-1 text-text-secondary">
              {t('updates.questionBody')}
            </p>
            {community.contactEmail ? (
              <a
                href={`mailto:${community.contactEmail}`}
                className={`${CONTACT_BUTTON_CLASS} mt-3`}
              >
                <MessageSquare className="size-4" aria-hidden />
                {t('updates.contactEmbassy')}
              </a>
            ) : (
              <Link href={supportHref} className={`${CONTACT_BUTTON_CLASS} mt-3`}>
                <MessageSquare className="size-4" aria-hidden />
                {t('updates.contactEmbassy')}
              </Link>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default EmbassyUpdatesTab;
