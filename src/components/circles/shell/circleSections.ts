import {
  Activity,
  ClipboardList,
  MessageSquare,
  Scale,
  Settings,
  Ticket,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type CircleSectionKey =
  | 'home'
  | 'members'
  | 'leaderboard'
  | 'history'
  | 'governance'
  | 'plan'
  | 'settings';

export interface CircleSection {
  key: CircleSectionKey;
  href: string;
  /** Key under `circles.nav`. */
  labelKey: 'activity' | 'chat' | 'members' | 'leaderboard' | 'decisions' | 'rules' | 'plan' | 'settings';
  icon: LucideIcon;
}

/**
 * The screens of a circle, in the order they are offered.
 *
 * The first one is the circle's home. It is called "Chat" only when chat is
 * actually switched on for the circle (`CIRCLE_CHAT_ENABLED`); with chat off it
 * is a feed of what the circle is doing, and calling it "Chat" promised a
 * conversation the page then said was unavailable.
 */
export function circleSections(circleId: string, chatOn: boolean): CircleSection[] {
  const base = `/circles/${circleId}`;
  return [
    { key: 'home', href: base, labelKey: chatOn ? 'chat' : 'activity', icon: chatOn ? MessageSquare : Activity },
    { key: 'members', href: `${base}/members`, labelKey: 'members', icon: Users },
    { key: 'leaderboard', href: `${base}/leaderboard`, labelKey: 'leaderboard', icon: Trophy },
    { key: 'history', href: `${base}/history`, labelKey: 'decisions', icon: ClipboardList },
    { key: 'governance', href: `${base}/governance`, labelKey: 'rules', icon: Scale },
    { key: 'plan', href: `${base}/plan`, labelKey: 'plan', icon: Ticket },
    { key: 'settings', href: `${base}/settings`, labelKey: 'settings', icon: Settings },
  ];
}

/**
 * Which tab a path belongs to. Anything that is not one of the section screens
 * (a motion, a project, a challenge, the report form, the "new" forms) was
 * reached from the activity feed, so the home tab stays marked.
 */
export function currentCircleSection(pathname: string, circleId: string): { key: CircleSectionKey; exact: boolean } {
  const base = `/circles/${circleId}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/\/+$/, '') : '';
  if (rest === '') return { key: 'home', exact: true };
  const first = rest.split('/')[1] as string;
  const sectionKeys: CircleSectionKey[] = ['members', 'leaderboard', 'history', 'governance', 'plan', 'settings'];
  const hit = sectionKeys.find((k) => k === first);
  if (hit) return { key: hit, exact: rest === `/${hit}` };
  return { key: 'home', exact: false };
}

/** True when the path is the circle's own home (`/circles/{id}`), where the hero replaces the compact header. */
export function isCircleHomePath(pathname: string, circleId: string): boolean {
  return currentCircleSection(pathname, circleId).exact && currentCircleSection(pathname, circleId).key === 'home';
}
