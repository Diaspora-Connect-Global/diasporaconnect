'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  AlertTriangle,
  ChevronRight,
  Headset,
  Newspaper,
  CalendarDays,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  type LucideIcon,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonType2 } from '@/components/custom/button';
import { EmbassyFeedList } from '../EmbassyFeedList';
import { FeedListSkeleton } from '../EmbassySkeletons';
import { embassyIcon } from '../icons';
import { useIsEmbassy, useOwnerKind, useOwnerEnum } from '@/components/community/embassy/communityVariant';
import { GET_EVENTS_BY_OWNER } from '@/services/gql/events';
import {
  PUBLISHED_RESOURCES,
  RECORD_RESOURCE_DOWNLOAD,
  type PublishedResourcesResponse,
  type RecordResourceDownloadResponse,
  type ResourceSummary,
} from '@/services/gql/resources';
import {
  getQuickActions,
  type EmbassyProfile,
} from '../embassyData';
import { isTabEnabled, isServiceEnabled } from '@/lib/communityServices';
import type { EmbassyTabKey } from '../tabs';
import type { EmbassyViewProps } from '../types';

// Minimal upcoming-event shape (subset of GET_EVENTS_BY_OWNER selection).
interface HomeEvent {
  id: string;
  title: string;
  status: string;
  startAt: string;
}
interface GetEventsByOwnerResponse {
  getEventsByOwner: { total: number; events: HomeEvent[] };
}

const MAX_HOME_EVENTS = 3;

/** Map a resource fileType to a lucide icon. */
function resourceIcon(fileType: string): LucideIcon {
  switch ((fileType || '').toUpperCase()) {
    case 'PDF':
    case 'DOC':
      return FileText;
    case 'XLS':
      return FileSpreadsheet;
    case 'PPT':
      return Presentation;
    case 'IMAGE':
      return ImageIcon;
    case 'VIDEO':
      return Video;
    case 'AUDIO':
      return Music;
    default:
      return FileIcon;
  }
}

/** Short month label + day for an event date chip (locale-aware). */
function eventDateChip(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: '', day: '' };
  return {
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    day: d.toLocaleString(undefined, { day: '2-digit' }),
  };
}

/** Full date-time label for an event row. */
function eventDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface EmbassyHomeTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

const MAX_HOME_POSTS = 3;

export function EmbassyHomeTab({ props, profile }: EmbassyHomeTabProps) {
  const t = useTranslations('community.embassy');
  const isEmbassy = useIsEmbassy();
  const ownerKind = useOwnerKind();
  const ownerEnum = useOwnerEnum();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { community, posts, feedLoading } = props;

  function tabHref(tab: EmbassyTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  // Quick actions must never deep-link to a gated tab. Filter by the same
  // service gating that hides the tabs themselves.
  const quickActions = getQuickActions(isEmbassy ? 'embassy' : 'general').filter((action) =>
    isTabEnabled(action.tab, community.enabledServices),
  );

  // The right-rail Resources widget is gated on the 'resources' service.
  const resourcesEnabled = isServiceEnabled('resources', community.enabledServices);

  const homePosts = posts.slice(0, MAX_HOME_POSTS);

  // Derive the active emergency alert: the most recent post classified as
  // "emergency" or "advisory" (case-insensitive). Posts are feed-ordered
  // (most recent first), so the first match is the latest alert.
  const alertPost = useMemo(() => {
    return posts.find((post) =>
      post.categories?.some((category) => {
        const normalized = category.trim().toLowerCase();
        return normalized === 'emergency' || normalized === 'advisory';
      }),
    );
  }, [posts]);

  const alertExcerpt = alertPost?.text.split('\n', 1)[0]?.trim() ?? '';

  // Upcoming events for THIS community (next 2–3, non-DRAFT, non-CANCELLED).
  const { data: eventsData } = useQuery<GetEventsByOwnerResponse>(GET_EVENTS_BY_OWNER, {
    variables: { ownerId: community.id, ownerType: ownerKind, limit: 10, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const upcomingEvents = useMemo(() => {
    const up = (s: string) => String(s).toUpperCase();
    const allEvents = eventsData?.getEventsByOwner?.events ?? [];
    // Match EmbassyEventsTab: prefer published events (cancelled always hidden),
    // but fall back to non-cancelled (drafts included) when none are published.
    const nonCancelled = allEvents.filter((e) => up(e.status) !== 'CANCELLED');
    const published = nonCancelled.filter((e) => up(e.status) !== 'DRAFT');
    const base = published.length > 0 ? published : nonCancelled;
    const now = Date.now();
    return base
      .filter((e) => {
        const t = new Date(e.startAt).getTime();
        return !Number.isNaN(t) && t >= now;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, MAX_HOME_EVENTS);
  }, [eventsData]);

  // Published resources for THIS community.
  const { data: resourcesData } = useQuery<PublishedResourcesResponse>(PUBLISHED_RESOURCES, {
    variables: { ownerType: ownerEnum, ownerEntityId: community.id },
    fetchPolicy: 'cache-and-network',
  });
  const resources: ResourceSummary[] = resourcesData?.publishedResources ?? [];

  const [recordDownload] = useMutation<RecordResourceDownloadResponse>(RECORD_RESOURCE_DOWNLOAD);

  async function handleResourceClick(resourceId: string) {
    try {
      const res = await recordDownload({ variables: { resourceId } });
      const url = res.data?.recordResourceDownload;
      if (url && typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    } catch {
      // download URL unavailable — fail silently
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_20rem] lg:px-6">
      {/* Main column */}
      <div className="min-w-0 space-y-6">
        {/* Quick Actions — hidden entirely when every action targets a gated tab */}
        {quickActions.length > 0 && (
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h2 className="heading-xsmall mb-4 text-text-primary">{t('home.quickActions')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {quickActions.map((action) => {
                const Icon = embassyIcon(action.icon);
                return (
                  <Link
                    key={action.key}
                    href={tabHref(action.tab)}
                    scroll={false}
                    className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-3 text-center transition-colors hover:border-border-brand"
                  >
                    <Icon className="size-5 text-text-brand" aria-hidden />
                    <span className="caption-medium text-text-primary">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Emergency Alert — shown only when an emergency/advisory post exists */}
        {alertPost && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border-danger bg-surface-danger p-4">
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle className="size-5 flex-shrink-0 text-text-danger" aria-hidden />
              <div className="min-w-0">
                <p className="label-medium text-text-danger">{t('home.emergencyTitle')}</p>
                <p className="body-small line-clamp-2 text-text-secondary">{alertExcerpt}</p>
              </div>
            </div>
            <Link
              href={`/post/${alertPost.id}`}
              className="label-medium flex-shrink-0 whitespace-nowrap rounded-full border border-border-danger bg-surface-default px-4 py-1.5 text-text-danger"
            >
              {t('home.emergencyViewAlert')}
            </Link>
          </div>
        )}

        {/* Latest Updates — live community feed */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="heading-xsmall text-text-primary">{t('home.latestUpdates')}</h2>
              <Link
                href={tabHref('updates')}
                scroll={false}
                className="label-medium text-text-brand"
              >
                {t('home.seeAll')}
              </Link>
            </div>

            {feedLoading ? (
              <FeedListSkeleton count={MAX_HOME_POSTS} />
            ) : homePosts.length > 0 ? (
              <EmbassyFeedList
                posts={homePosts}
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

      {/* Right rail (mock data) */}
      <aside className="space-y-6">
        {/* Upcoming Events */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="label-large text-text-primary">{t('home.upcomingEvents')}</h3>
              <Link href={tabHref('events')} scroll={false} className="caption-medium text-text-brand">
                {t('home.seeAll')}
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-4">
                {upcomingEvents.map((evt) => {
                  const { month, day } = eventDateChip(evt.startAt);
                  return (
                    <li key={evt.id} className="flex gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-md bg-surface-subtle">
                        <span className="caption-small text-text-danger">{month}</span>
                        <span className="label-medium text-text-primary">{day}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="caption-large truncate text-text-primary">{evt.title}</p>
                        <p className="caption-small text-text-secondary">{eventDateLabel(evt.startAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-subtle">
                  <CalendarDays className="size-5 text-text-secondary" aria-hidden />
                </span>
                <p className="caption-medium text-text-secondary">{t('home.noUpcomingEvents')}</p>
              </div>
            )}
            <Link href={tabHref('events')} scroll={false} className="mt-4 block">
              <ButtonType2 className="w-full justify-center py-2">{t('home.viewAllEvents')}</ButtonType2>
            </Link>
          </CardContent>
        </Card>

        {/* Important Resources — gated on the 'resources' service */}
        {resourcesEnabled && (
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large mb-4 text-text-primary">{t('home.importantResources')}</h3>
            {resources.length > 0 ? (
              <ul className="space-y-3">
                {resources.map((res) => {
                  const Icon = resourceIcon(res.fileType);
                  return (
                    <li key={res.id}>
                      <button
                        type="button"
                        onClick={() => handleResourceClick(res.id)}
                        className="flex w-full items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-surface-subtle"
                      >
                        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-brand">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="caption-large block truncate text-text-primary">{res.title}</span>
                          <span className="caption-small block truncate text-text-secondary">
                            {res.fileType}
                          </span>
                        </span>
                        <ChevronRight className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-subtle">
                  <FileText className="size-5 text-text-secondary" aria-hidden />
                </span>
                <p className="caption-medium text-text-secondary">{t('home.noResources')}</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Need Help? */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large text-text-primary">{t('home.needHelp')}</h3>
            <p className="body-small mt-1 text-text-secondary">
              {isEmbassy ? t('home.needHelpBody') : t('home.needHelpBodyGeneral')}
            </p>
            <Link href={tabHref('support')} scroll={false} className="mt-3 block">
              <ButtonType2 className="flex w-full items-center justify-center gap-2 py-2">
                <Headset className="size-4" aria-hidden />
                {t('home.contactUs')}
              </ButtonType2>
            </Link>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default EmbassyHomeTab;
