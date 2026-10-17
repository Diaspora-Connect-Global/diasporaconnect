'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { CalendarDays, Clock, Hash, Plus, Users, UserSearch } from 'lucide-react';
import { DrawerRow, DrawerSection, MobileRailMenu } from '@/components/shell/RailMenu';
import { COMMUNITY_NAV_ITEMS } from '@/components/community/redesign/CommunityLeftNav';
import { useTrendingTags, useUpcomingPublicEvents } from '@/components/community/redesign/CommunityRail';
import type { JoinedAssociation, JoinedCommunity, PendingCommunityRequest } from '@/components/community/YourCommunitiesColumn';

function Lists({ communities, pendingRequests, associations }: { communities: readonly JoinedCommunity[]; pendingRequests: readonly PendingCommunityRequest[]; associations: readonly JoinedAssociation[] }) {
  const t = useTranslations('communityPage');
  const tCommunity = useTranslations('community');
  const tAssociations = useTranslations('home.associations');
  const tRail = useTranslations('communityPage.rail');
  const format = useFormatter();
  const tags = useTrendingTags();
  const events = useUpcomingPublicEvents();
  return (
    <>
      <DrawerSection id="crm-nav" title={t('navLabel')}>
        {COMMUNITY_NAV_ITEMS.map(({ key, href, icon }) => (
          <DrawerRow key={key} href={href} icon={icon} label={t(`nav.${key}`)} />
        ))}
      </DrawerSection>
      <DrawerSection id="crm-communities" title={tCommunity('yourCommunities.title')}>
        {communities.map((c) => (
          <DrawerRow key={c.id} href={`/community/${encodeURIComponent(c.id)}`} icon={Users} label={c.name} detail={c.communityType?.name} />
        ))}
        {pendingRequests.map((r) => (
          <DrawerRow key={r.id} href={`/community/${encodeURIComponent(r.entityId)}`} icon={Clock} tone="warning" label={r.entityName} badge={tCommunity('pendingBadge')} />
        ))}
        {communities.length === 0 && pendingRequests.length === 0 && <DrawerRow href="/community" icon={Plus} label={tCommunity('yourCommunities.empty')} />}
      </DrawerSection>
      <DrawerSection id="crm-associations" title={tAssociations('myAssociationsTitle')}>
        {associations.map((a) => (
          <DrawerRow key={a.id} href={`/association/${encodeURIComponent(a.id)}`} icon={Users} tone="info" label={a.name} />
        ))}
        <DrawerRow href="/association" icon={Plus} label={tAssociations('discover')} />
      </DrawerSection>
      <DrawerSection id="crm-people" title={tRail('people')}>
        <DrawerRow href="/people" icon={UserSearch} label={tRail('people')} />
      </DrawerSection>
      {tags.length > 0 && (
        <DrawerSection id="crm-topics" title={tRail('topics')}>
          {tags.map((h) => (
            <DrawerRow key={h.id ?? h.tag} href={`/search?q=${encodeURIComponent(`#${h.tag}`)}`} icon={Hash} tone="warning" label={`#${h.tag}`} detail={typeof h.usageCount === 'number' && h.usageCount > 0 ? tRail('topicUses', { count: h.usageCount }) : undefined} />
          ))}
        </DrawerSection>
      )}
      {events.length > 0 && (
        <DrawerSection id="crm-events" title={tRail('events')}>
          {events.map((e) => (
            <DrawerRow key={e.id} href={`/events/${encodeURIComponent(e.id)}`} icon={CalendarDays} tone="danger" label={e.title} detail={format.dateTime(new Date(e.startAt), { dateStyle: 'medium', timeStyle: 'short' })} />
          ))}
        </DrawerSection>
      )}
    </>
  );
}

/** Community on phones: the left column's and the right rail's entries as one list in a drawer. */
export function CommunityRailMenu(props: { communities: readonly JoinedCommunity[]; pendingRequests: readonly PendingCommunityRequest[]; associations: readonly JoinedAssociation[] }) {
  return (
    <MobileRailMenu>
      <Lists {...props} />
    </MobileRailMenu>
  );
}
