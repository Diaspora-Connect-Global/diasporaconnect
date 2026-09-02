'use client';

import { ChevronRight, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export interface ViewDiscussionProps {
  circleId: string;
  /**
   * Messages in the circle's chat, or `null` when it could not be resolved.
   *
   * A motion has no thread of its own — it is proposed and argued in the
   * circle chat, which is where this link goes — so the count is the chat's,
   * and it is omitted rather than guessed when unavailable.
   */
  messageCount?: number | null;
}

/** Back to where the motion was actually discussed: the circle's chat. */
export function ViewDiscussion({ circleId, messageCount }: ViewDiscussionProps) {
  const t = useTranslations('circles.motion');

  return (
    <Link
      href={`/circles/${circleId}`}
      className="flex items-center gap-3 rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:bg-surface-subtle"
    >
      <MessageCircle
        aria-hidden="true"
        className="size-5 shrink-0 text-text-brand"
      />
      <span className="min-w-0 flex-1">
        <span className="label-medium block text-text-primary">
          {t('viewDiscussion')}
        </span>
        {typeof messageCount === 'number' && (
          <span className="caption-small block text-text-secondary">
            {t('messageCount', { count: messageCount })}
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
