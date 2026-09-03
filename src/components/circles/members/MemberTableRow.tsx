'use client';

import { MessageCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AvatarGroup, StatusPill } from '@/components/circles/primitives';
import type { CircleUser } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { formatDateOnly } from '@/macros/time';
import type { CircleMember } from '@/services/gql/types/circles';

export interface MemberTableRowProps {
  member: CircleMember;
  /** Resolved identity, or `undefined` while it is still loading. */
  user?: CircleUser;
  /** Display name already resolved (with its loading fallback) by the table. */
  displayName: string;
  isCurrentUser: boolean;
  /** Open a direct conversation with this member. Omitted on your own row. */
  onSendMessage?: (userId: string) => void;
}

/**
 * One person, as one table row: who they are, what they are, when they joined.
 *
 * ── THERE IS NO REMOVE CONTROL HERE, AND THERE NEVER WILL BE ────────────────
 * Removing someone is the ENACTMENT of a passed REMOVE_MEMBER motion. The
 * GraphQL surface exposes no removal mutation and no role-change mutation at
 * all — only `openCircleMotion` — so a "Remove" or "Make lead" control in this
 * row would be either dead or a lie about who decided. The circle governs
 * itself; this screen reports the roster and says so in its footer callout.
 *
 * That is also why the row has no overflow menu any more. The old one carried
 * "View profile" and "Send a message" behind three dots, which is exactly the
 * shape an admin menu takes — and the members namespace still ships `makeLead`
 * and `remove` strings for an admin model that must not exist. Both surviving
 * actions are now first-class: the name IS the link to the profile, and the
 * message button sits in its own cell.
 *
 * ── THE LEAD PILL IS THE ONLY COLOUR IN THE ROW ─────────────────────────────
 * A lead is a facilitator, not an administrator. They get a status chip in the
 * Role column, which every other member's row also fills (with "Member") so the
 * column reads as a fact about each person rather than a decoration on one. No
 * accent border, no reordering to the top — the table keeps the server's order.
 */
export function MemberTableRow({
  member,
  user,
  displayName,
  isCurrentUser,
  onSendMessage,
}: MemberTableRowProps) {
  const t = useTranslations('circles.members');
  const locale = useLocale();

  const name = isCurrentUser ? t('you') : displayName;

  /*
   * `formatDateOnly` returns '' for a missing or unparseable timestamp, so the
   * dash covers both. A member row without a join date is still a member row —
   * blanking the cell would read as "joined nothing".
   */
  const joined = member.joinedAt ? formatDateOnly(member.joinedAt, { locale }) : '';

  return (
    <tr className="transition-colors hover:bg-surface-subtle">
      <td className="px-4 py-3">
        <Link
          href={`/${member.userId}`}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          <AvatarGroup
            size="md"
            users={[
              { id: member.userId, name: displayName, avatarUrl: user?.avatarUrl },
            ]}
          />
          <span className="label-medium truncate text-text-primary">{name}</span>
        </Link>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        {member.role === 'LEAD' ? (
          <StatusPill variant="success" label={t('lead')} />
        ) : (
          <span className="body-small text-text-primary">{t('roleMember')}</span>
        )}
      </td>

      <td className="body-small px-4 py-3 whitespace-nowrap text-text-secondary">
        {joined || '—'}
      </td>

      <td className="px-4 py-3 text-right">
        {!isCurrentUser && onSendMessage && (
          <button
            type="button"
            onClick={() => onSendMessage(member.userId)}
            aria-label={t('actions.message')}
            title={t('actions.message')}
            className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </button>
        )}
      </td>
    </tr>
  );
}
