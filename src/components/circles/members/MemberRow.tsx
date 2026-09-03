'use client';

import { MessageCircle, MoreHorizontal, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AvatarGroup, StatusPill } from '@/components/circles/primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CircleUser } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { formatDateOnly } from '@/macros/time';
import type { CircleMember } from '@/services/gql/types/circles';

export interface MemberRowProps {
  member: CircleMember;
  /** Resolved identity, or `undefined` while it is still loading. */
  user?: CircleUser;
  /** Display name already resolved (with its loading fallback) by the list. */
  displayName: string;
  isCurrentUser: boolean;
  /** Open a direct conversation with this member. Omitted on your own row. */
  onSendMessage?: (userId: string) => void;
}

/**
 * One person in the circle.
 *
 * ── THE LEAD IS A FACILITATOR, NOT AN ADMIN ─────────────────────────────────
 * A LEAD gets a small pill and nothing else: no crown, no accent, no promotion
 * to the top of the list, no separate section, no management controls beside
 * their name. The row order is the server's, deliberately unsorted — sorting
 * leads first would rebuild the hierarchy the pill is careful not to imply.
 *
 * ── THERE IS NO REMOVE CONTROL HERE, BY DESIGN ──────────────────────────────
 * Removing someone is the ENACTMENT of a passed REMOVE_MEMBER motion — the API
 * exposes no removal mutation at all, only `openCircleMotion`. A "Remove"
 * item in this menu would therefore be either dead or a lie about who decided.
 * If removal is ever surfaced from this screen it must read as "Propose
 * removal", open a motion and land the user on that motion's detail page.
 *
 * Leaving would be different — a decision about yourself needs no vote — but
 * the members namespace has no label for it (`circles.members.actions` ships
 * `viewProfile`, `message`, `makeLead` and `remove`), and the last two are copy
 * for the admin model this screen deliberately does not implement. Reported
 * rather than invented; wire `leaveCircle` up here once the string exists.
 */
export function MemberRow({
  member,
  user,
  displayName,
  isCurrentUser,
  onSendMessage,
}: MemberRowProps) {
  const t = useTranslations('circles.members');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const name = isCurrentUser ? t('you') : displayName;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <AvatarGroup
        size="lg"
        users={[
          { id: member.userId, name: displayName, avatarUrl: user?.avatarUrl },
        ]}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="label-medium truncate text-text-primary">{name}</span>
          {member.role === 'LEAD' && (
            <StatusPill variant="success" label={t('lead')} />
          )}
        </div>
        {isCurrentUser && member.joinedAt && (
          <p className="caption-small text-text-secondary">
            {t('joinedOn', { date: formatDateOnly(member.joinedAt, { locale }) })}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={tCommon('openMenu')}
            className="cursor-pointer rounded-full p-1.5 text-text-secondary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </DropdownMenuTrigger>

        {/*
          The shadcn default content is painted with `bg-popover` /
          `text-popover-foreground`, which are not brand tokens and do not
          follow the app's themes — overridden here the same way
          `cards/notification/NotificationCard` does.
        */}
        <DropdownMenuContent align="end" className="min-w-[200px] bg-surface-default">
          <DropdownMenuItem asChild className="body-small text-text-primary">
            <Link href={`/${member.userId}`} className="flex items-center gap-2">
              <UserRound className="size-4 shrink-0" aria-hidden="true" />
              {t('actions.viewProfile')}
            </Link>
          </DropdownMenuItem>

          {!isCurrentUser && onSendMessage && (
            <DropdownMenuItem
              className="body-small text-text-primary"
              onSelect={() => onSendMessage(member.userId)}
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
              {t('actions.message')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
