'use client';

import { useSearchParams } from 'next/navigation';
import HomeSidebar from '@/components/home/HomeSidebar';
import { EmbassyHeader } from './EmbassyHeader';
import { EmbassyTabBar } from './EmbassyTabBar';
import { EmbassyHomeTab } from './tabs/EmbassyHomeTab';
import { EmbassyUpdatesTab } from './tabs/EmbassyUpdatesTab';
import { EmbassyServicesTab } from './tabs/EmbassyServicesTab';
import { EmbassyTrackRequestsTab } from './tabs/EmbassyTrackRequestsTab';
import { EmbassyEventsTab } from './tabs/EmbassyEventsTab';
import { EmbassySupportTab } from './tabs/EmbassySupportTab';
import { EmbassyCommunityTab } from './tabs/EmbassyCommunityTab';
import { ComingSoonTab } from './tabs/ComingSoonTab';
import { parseEmbassyTab, EMBASSY_TABS } from './tabs';
import { getEmbassyProfile } from './embassyMock';
import type { EmbassyViewProps } from './types';

/**
 * Embassy variant of the community detail page. Renders a flag banner header,
 * a URL-driven (`?tab=`) sub-navigation, and the active tab panel. Only the Home
 * tab is fully built in Phase 1; the rest are "coming soon" placeholders. All
 * data + handlers are supplied by CommunityDetailClient — this view fetches
 * nothing itself (Home reuses the live community feed passed via props).
 */
export function EmbassyCommunityView(props: EmbassyViewProps) {
  const { community, showSidebar } = props;
  const searchParams = useSearchParams();
  const activeTab = parseEmbassyTab(searchParams.get('tab'));
  const profile = getEmbassyProfile(community.id);

  const membership = {
    isActive: props.isActive,
    isPending: props.isPending,
    isSuspended: props.isSuspended,
    canShowJoin: props.canShowJoin,
    canShowRequestToJoin: props.canShowRequestToJoin,
    canLeave: props.canLeave,
    canCancelRequest: props.canCancelRequest,
    actionLoading: props.actionLoading,
    joinLoading: props.joinLoading,
    onJoinClick: props.onJoinClick,
    onLeaveClick: props.onLeaveClick,
    onCancelRequest: props.onCancelRequest,
  };

  function renderActiveTab() {
    switch (activeTab) {
      case 'home':
        return <EmbassyHomeTab props={props} profile={profile} />;
      case 'updates':
        return <EmbassyUpdatesTab props={props} profile={profile} />;
      case 'services':
        return <EmbassyServicesTab communityId={community.id} />;
      case 'track-requests':
        return <EmbassyTrackRequestsTab communityId={community.id} />;
      case 'events':
        return <EmbassyEventsTab props={props} />;
      case 'support':
        return <EmbassySupportTab profile={profile} communityId={community.id} />;
      case 'community':
        return <EmbassyCommunityTab props={props} profile={profile} />;
      default: {
        // Verified Services (and any future tab) — not built yet.
        const def = EMBASSY_TABS.find((tab) => tab.key === activeTab);
        return (
          <ComingSoonTab
            icon={def?.icon ?? 'LayoutGrid'}
            titleKey={def?.labelKey ?? 'verifiedServices'}
          />
        );
      }
    }
  }

  return (
    <div className="mx-auto lg:flex min-h-full">
      {showSidebar && (
        <div className="hidden lg:block lg:sticky lg:top-[4rem] lg:h-full lg:w-[20vw] scrollbar-hide">
          <HomeSidebar />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="h-app-inner overflow-y-auto scrollbar-hide">
          <EmbassyHeader community={community} profile={profile} membership={membership} />
          <EmbassyTabBar active={activeTab} />
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}

export default EmbassyCommunityView;
