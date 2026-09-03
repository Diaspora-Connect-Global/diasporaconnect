'use client';

import { useTranslations } from 'next-intl';
import {
  ChevronRight,
  CreditCard,
  Eye,
  Palette,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The settings menu.
 *
 * ── WHY A MENU AND NOT A STACK ──────────────────────────────────────────────
 * The four panels are four unrelated decisions — who we are, who can find us,
 * what we pay, and putting the circle away — and stacking them meant a lead
 * scrolled past the archive block every time they wanted to fix a typo. A menu
 * makes each one a place you go to on purpose, which is the right amount of
 * friction for the last of them.
 *
 * ── MEMBERS IS A LINK, NOT A PANEL ──────────────────────────────────────────
 * `/circles/[id]/members` is a real screen with its own invitations, join
 * requests and past-member history. Re-rendering a slice of it here would give
 * the circle two member lists that could disagree, so this row navigates and is
 * marked up as an anchor — `aria-current` and a chevron say so, rather than
 * looking like a tab that fails to switch.
 *
 * ── WHAT IS DELIBERATELY MISSING ────────────────────────────────────────────
 * There is no Integrations row. Nothing on the gateway exposes an integration
 * for a circle, so the row would open an empty panel and imply a feature that
 * does not exist. It comes back when there is something behind it.
 */

/** One panel this screen renders itself. Members is not here — it navigates. */
export type CircleSettingsPanelId =
  | 'general'
  | 'access'
  | 'branding'
  | 'plan'
  | 'danger';

interface PanelEntry {
  id: CircleSettingsPanelId;
  /** Key under `circles.settings.nav`. */
  labelKey: string;
  icon: LucideIcon;
}

/**
 * Fixed order, matching the reading order of the decisions: identity, then
 * reach, then look, then money, then the way out. Danger is last because it is
 * the one nobody should arrive at by accident.
 */
const PANELS: readonly PanelEntry[] = [
  { id: 'general', labelKey: 'general', icon: SlidersHorizontal },
  { id: 'access', labelKey: 'access', icon: Eye },
  { id: 'branding', labelKey: 'branding', icon: Palette },
  { id: 'plan', labelKey: 'plan', icon: CreditCard },
  { id: 'danger', labelKey: 'danger', icon: ShieldAlert },
] as const;

/**
 * Shared by the panel buttons and the members link so the two rows are the same
 * shape. The active state is `surface-brand-light` + `text-text-brand`, the one
 * pair that holds in both themes — `surface-brand-light` is the SAME light blue
 * in dark mode, so `text-text-primary` on it would be near-invisible.
 */
const ROW_BASE =
  'label-small flex w-full shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand';
const ROW_IDLE = 'text-text-primary hover:bg-surface-subtle';
const ROW_ACTIVE = 'bg-surface-brand-light text-text-brand';

export interface SettingsNavProps {
  circleId: string;
  active: CircleSettingsPanelId;
  onSelect: (panel: CircleSettingsPanelId) => void;
  className?: string;
}

export function SettingsNav({
  circleId,
  active,
  onSelect,
  className,
}: SettingsNavProps) {
  const t = useTranslations('circles.settings.nav');

  return (
    <nav
      aria-label={t('label')}
      className={cn(
        /*
         * One row on small screens, a column from `lg`. `overflow-x-auto` with
         * `scrollbar-hide` matches the app's other horizontal strips; the
         * `lg:` reset is what turns it back into a real sidebar rather than a
         * scroller that happens to wrap.
         */
        'flex gap-1 overflow-x-auto scrollbar-hide',
        'lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-visible',
        className,
      )}
    >
      {PANELS.map((panel) => {
        const Icon = panel.icon;
        const isActive = panel.id === active;
        return (
          <button
            key={panel.id}
            type="button"
            onClick={() => onSelect(panel.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              ROW_BASE,
              'w-auto lg:w-full',
              isActive ? ROW_ACTIVE : ROW_IDLE,
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{t(panel.labelKey)}</span>
          </button>
        );
      })}

      {/*
        An anchor, not a button: this leaves the screen. Rendering it as a
        sixth tab would announce a control that switches a panel and then
        navigate instead — the kind of mismatch a screen reader reports and a
        mouse user only notices as a surprise.
      */}
      <Link
        href={`/circles/${circleId}/members`}
        className={cn(ROW_BASE, ROW_IDLE, 'w-auto lg:w-full')}
      >
        <Users aria-hidden className="size-4 shrink-0" />
        <span className="whitespace-nowrap">{t('members')}</span>
        <ChevronRight aria-hidden className="ml-auto hidden size-4 shrink-0 lg:block" />
      </Link>
    </nav>
  );
}
