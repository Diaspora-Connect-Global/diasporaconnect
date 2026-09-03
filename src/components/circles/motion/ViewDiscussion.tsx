'use client';

import { ChevronRight, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { MOTION_CARD_CLASS } from './MotionSection';

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
      className={`${MOTION_CARD_CLASS} flex items-center gap-3 py-3.5 transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand sm:py-4`}
    >
      <MessageCircle
        aria-hidden="true"
        className="size-5 shrink-0 text-text-brand"
      />
      {/*
        Label and count on ONE line, as a single sentence a reader takes in at a
        glance. The count is a parenthetical because it qualifies the link
        rather than being a second fact about it — and it is dropped entirely,
        parentheses and all, when the chat could not be read. An empty "( )" is
        worse than no count.
      */}
      <span className="label-medium min-w-0 flex-1 text-text-primary">
        {t('viewDiscussion')}
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
