'use client';

import { ChevronRight, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export interface ProjectDiscussionProps {
  circleId: string;
  /**
   * Messages in the circle's chat, or `null` when it could not be read. The
   * count is omitted rather than guessed — "0 messages" over a chat we failed
   * to reach is a claim, not a blank.
   */
  messageCount?: number | null;
}

/**
 * Where a project is actually talked about.
 *
 * A project has no comment thread of its own: there is no comment type, no
 * reaction type and no mutation for either anywhere in the circle GraphQL
 * surface. It is proposed and argued in the circle's chat, so this links there
 * instead of rendering an input that could not post anything.
 *
 * Deliberately self-contained rather than reusing `motion/ViewDiscussion`,
 * which is the same idea for motions: this screen should not break when the
 * motion module's card chrome changes.
 *
 * The caller renders this only when the circle chat is genuinely available —
 * the chat adapter sits behind a server flag, and a link into a room that does
 * not exist is worse than no link.
 */
export function ProjectDiscussion({
  circleId,
  messageCount,
}: ProjectDiscussionProps) {
  const t = useTranslations('circles.project');

  return (
    <Link
      href={`/circles/${circleId}`}
      className="flex items-center gap-3 rounded-2xl border border-border-subtle px-4 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
    >
      <MessageCircle
        aria-hidden="true"
        className="size-5 shrink-0 text-text-secondary"
      />
      <span className="label-medium min-w-0 flex-1 text-text-primary">
        {t('discussion')}
        {typeof messageCount === 'number' && (
          <span className="body-small ml-1.5 text-text-secondary">
            ({t('messageCount', { count: messageCount })})
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-text-secondary"
      />
    </Link>
  );
}
