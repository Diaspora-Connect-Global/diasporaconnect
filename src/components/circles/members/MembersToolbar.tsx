'use client';

import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/custom/input';

export interface MembersToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Whether the invite panel this button controls is open. */
  inviteOpen: boolean;
  onToggleInvite: () => void;
  /** id of the panel the button expands, for `aria-controls`. */
  invitePanelId: string;
  /** Leads only: for anyone else there is nothing behind the button. */
  canInvite: boolean;
}

/**
 * Search the roster, or let somebody in.
 *
 * The two controls sit together because they are the only two things this
 * screen can do. Every other verb a members list usually carries — remove,
 * promote, demote — is a motion in this product, and none of them belongs on a
 * toolbar. Admission is not a decision about anyone already inside, which is
 * why inviting is the one write that can live here.
 *
 * The button is a disclosure, not a link: it expands the invite panel in place
 * rather than navigating away from the roster, so `aria-expanded` /
 * `aria-controls` carry the state a sighted user reads from the panel.
 */
export function MembersToolbar({
  query,
  onQueryChange,
  inviteOpen,
  onToggleInvite,
  invitePanelId,
  canInvite,
}: MembersToolbarProps) {
  const t = useTranslations('circles.members');

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
      <SearchInput
        id="circle-members-search"
        value={query}
        onChange={onQueryChange}
        // Filtering happens live on every keystroke, so submitting has nothing
        // left to do — the magnifier stays as an affordance, not an action.
        onSearch={() => {}}
        placeholder={t('searchPlaceholder')}
        className="sm:w-64"
      />

      {canInvite && (
      <button
        type="button"
        onClick={onToggleInvite}
        aria-expanded={inviteOpen}
        aria-controls={invitePanelId}
        className="label-small flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-brand px-4 py-2.5 text-text-white transition-colors hover:bg-border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <UserPlus className="size-4 shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{t('inviteToCircle')}</span>
      </button>
      )}
    </div>
  );
}
