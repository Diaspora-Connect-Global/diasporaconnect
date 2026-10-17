'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Briefcase, CalendarDays, Compass, Plus, Users, UsersRound } from 'lucide-react';
import { DrawerRow, DrawerSection, MobileRailMenu } from '@/components/shell/RailMenu';
import { useActivityItems } from '@/components/home/YourActivity';
import { useMyCommunityRows } from '@/components/home/HomeLeftColumn';
import { useGroupsToJoin } from '@/components/community/redesign/useGroupsToJoin';
import { useUpcomingRegistrations } from '@/hooks/redesign/useUpcomingRegistrations';
import { useMyCirclesPreview } from '@/hooks/redesign/useMyCirclesPreview';

/** Mounted only while the drawer is open, so its queries run only then. */
function Lists() {
  const t = useTranslations('homeLeft');
  const tRail = useTranslations('homePage.rail');
  const tActivity = useTranslations('homePage.activity');
  const tGroups = useTranslations('communityPage.groups');
  const format = useFormatter();
  const communities = useMyCommunityRows();
  const { groups } = useGroupsToJoin(4);
  const activity = useActivityItems();
  const { events } = useUpcomingRegistrations(3);
  const { circles } = useMyCirclesPreview(3);
  return (
    <>
      <DrawerSection id="rm-communities" title={t('yourCommunities')}>
        {communities.map((c) => (
          <DrawerRow key={c.href} href={c.href} icon={Users} label={c.name} detail={typeof c.memberCount === 'number' ? tGroups('members', { count: c.memberCount }) : undefined} />
        ))}
        <DrawerRow href="/community" icon={Plus} label={t('joinMore')} />
      </DrawerSection>
      {groups.length > 0 && (
        <DrawerSection id="rm-groups" title={t('featuredGroups')}>
          {groups.map((g) => (
            <DrawerRow key={g.id} href={`/groups/${encodeURIComponent(g.id)}`} icon={UsersRound} label={g.name} detail={typeof g.memberCount === 'number' ? tGroups('members', { count: g.memberCount }) : undefined} />
          ))}
        </DrawerSection>
      )}
      {activity.length > 0 && (
        <DrawerSection id="rm-activity" title={tActivity('title')}>
          {activity.map((a) => (
            <DrawerRow key={a.key} href={a.href ?? '/home'} icon={a.icon} label={a.name} detail={a.detail} badge={a.status} tone={a.tone} testId={`rm-${a.testId}`} />
          ))}
        </DrawerSection>
      )}
      <DrawerSection id="rm-quick" title={tRail('quickActions')}>
        <DrawerRow href="/discover" icon={Briefcase} tone="info" label={tRail('findOpps')} />
        <DrawerRow href="/marketplace?tab=services" icon={Compass} tone="success" label={tRail('exploreServices')} />
        <DrawerRow href="/community" icon={Users} tone="warning" label={tRail('connect')} />
      </DrawerSection>
      {events.length > 0 && (
        <DrawerSection id="rm-upcoming" title={tRail('upcoming')}>
          {events.map((e) => (
            <DrawerRow key={e.id} href={`/events/${encodeURIComponent(e.id)}`} icon={CalendarDays} tone="danger" label={e.title} detail={format.dateTime(new Date(e.startAt), { dateStyle: 'medium', timeStyle: 'short' })} />
          ))}
        </DrawerSection>
      )}
      {circles.length > 0 && (
        <DrawerSection id="rm-circles" title={tRail('circles')}>
          {circles.map((c) => (
            <DrawerRow key={c.id} href={`/circles/${encodeURIComponent(c.id)}`} icon={UsersRound} label={c.name} detail={typeof c.memberCount === 'number' && c.memberCount > 0 ? tRail('members', { count: c.memberCount }) : undefined} />
          ))}
        </DrawerSection>
      )}
    </>
  );
}

/** Home on phones: the left column's and the right rail's entries as one list in a drawer. */
export function HomeRailMenu() {
  return (
    <MobileRailMenu>
      <Lists />
    </MobileRailMenu>
  );
}
