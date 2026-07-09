'use client';

import { useSearchParams } from 'next/navigation';
import { EmbassyHeader } from './EmbassyHeader';
import { EmbassyTabBar } from './EmbassyTabBar';
import { EmbassyHomeTab } from './tabs/EmbassyHomeTab';
import { EmbassyUpdatesTab } from './tabs/EmbassyUpdatesTab';
import { EmbassyServicesTab } from './tabs/EmbassyServicesTab';
import { EmbassyTrackRequestsTab } from './tabs/EmbassyTrackRequestsTab';
import { EmbassyEventsTab } from './tabs/EmbassyEventsTab';
import { EmbassySupportTab } from './tabs/EmbassySupportTab';
import { EmbassyCommunityTab } from './tabs/EmbassyCommunityTab';
import { EmbassyGroupsTab } from './tabs/EmbassyGroupsTab';
import { ComingSoonTab } from './tabs/ComingSoonTab';
import { parseEmbassyTab, EMBASSY_TABS } from './tabs';
import { isTabEnabled } from '@/lib/communityServices';
import { getEmbassyProfile } from './embassyData';
import { CommunityVariantProvider } from './communityVariant';
import type { EmbassyViewProps } from './types';

/**
 * Embassy variant of the community detail page. Renders a flag banner header,
 * a URL-driven (`?tab=`) sub-navigation, and the active tab panel. Only the Home
 * tab is fully built in Phase 1; the rest are "coming soon" placeholders. All
 * data + handlers are supplied by CommunityDetailClient — this view fetches
 * nothing itself (Home reuses the live community feed passed via props).
 */
export function EmbassyCommunityView(props: EmbassyViewProps) {
  const { community, variant, ownerKind = 'community' } = props;
  const searchParams = useSearchParams();
  const requestedTab = parseEmbassyTab(searchParams.get('tab'));
  // A `?tab=` deep-link (or a stale link after a service is disabled) must never
  // land on a gated tab — fall back to the always-on 'home' feed.
  const activeTab = isTabEnabled(requestedTab, community.enabledServices)
    ? requestedTab
    : 'home';
  const profile = getEmbassyProfile(community.id, variant, community);

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
        return <EmbassyServicesTab community={community} profile={profile} />;
      case 'track-requests':
        return <EmbassyTrackRequestsTab community={community} profile={profile} />;
      case 'events':
        return <EmbassyEventsTab props={props} />;
      case 'support':
        return <EmbassySupportTab profile={profile} community={community} communityId={community.id} />;
      case 'community':
        return <EmbassyCommunityTab props={props} profile={profile} />;
      case 'groups':
        return <EmbassyGroupsTab community={community} />;
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
    <CommunityVariantProvider variant={variant} ownerKind={ownerKind}>
      <div className="mx-auto min-h-full">
        <div className="min-w-0 flex-1">
          {/* One scroll area: everything scrolls together, but the header + tab bar
              are sticky so they pin to the top and the scroll only moves the tab
              content past them. Single container = reliable on mobile. */}
          <div className="h-app-inner overflow-y-auto scrollbar-hide">
            {/* Header + tabs pin only on desktop; on mobile they scroll away with
                the content so the whole page scrolls as one. */}
            <div className="z-20 bg-surface-default lg:sticky lg:top-0">
              <EmbassyHeader community={community} profile={profile} membership={membership} />
              <EmbassyTabBar active={activeTab} enabledServices={community.enabledServices} />
            </div>
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </CommunityVariantProvider>
  );
}

export default EmbassyCommunityView;
