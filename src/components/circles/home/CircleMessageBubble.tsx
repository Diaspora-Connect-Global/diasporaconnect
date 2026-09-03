'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MessageAttachments } from '@/components/chats/MessageAttachments';
import { MessageStatusIcon } from '@/components/chats/MessageStatusIcon';
import { SendingFilesBubble } from '@/components/chats/SendingFilesBubble';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatTimeOnly } from '@/lib/chatTime';
import { cn } from '@/lib/utils';
import type { CircleUser } from '@/hooks/useCircleUsers';
import type { ApiMessage } from '@/store/ChatStore';

interface CircleMessageBubbleProps {
  message: ApiMessage;
  isMe: boolean;
  /** Resolved identity of `message.senderId`; null while loading or unresolvable. */
  sender: CircleUser | null;
  /** Name to show when `sender` could not be resolved. */
  fallbackName: string;
  /** IANA zone the viewer reads times in. */
  timeZone: string;
}

/**
 * One message in a circle conversation.
 *
 * Deliberately built from the same pieces as `chats/GroupChat.tsx` — the
 * `chat-bubble-*` tokens, `MessageAttachments`, `SendingFilesBubble` and
 * `MessageStatusIcon` — rather than a second bubble language. A circle is a
 * chat; a member who has used the app's group chat should not have to learn a
 * new one, and a second set of bubble styles would drift from the first the
 * first time either is touched.
 *
 * The one arrangement difference from `GroupChat` is that the author line sits
 * ABOVE the bubble next to the avatar rather than below it. In a circle almost
 * every message is from somebody else, and reading who is speaking before
 * reading what they said is what makes a many-person thread followable.
 */
export function CircleMessageBubble({
  message,
  isMe,
  sender,
  fallbackName,
  timeZone,
}: CircleMessageBubbleProps) {
  const t = useTranslations('chat.direct');

  const name = sender?.name?.trim() || fallbackName;
  const time = formatTimeOnly(message.createdAt, timeZone);
  const isSending = message.status === 'sending';
  const hasAttachments = Boolean(message.attachments?.length);

  const bubbleClass = cn(
    'rounded-2xl px-3 py-2 text-sm sm:px-4 sm:py-3 sm:text-base',
    isMe
      ? 'bg-chat-bubble-me-bg text-chat-bubble-me-text'
      : 'bg-chat-bubble-them-bg text-chat-bubble-them-text',
  );

  return (
    <div className={cn('flex min-w-0 gap-2', isMe ? 'justify-end' : 'justify-start')}>
      {!isMe && (
        <Avatar className="mt-5 size-7 shrink-0">
          <AvatarImage src={sender?.avatarUrl || undefined} alt="" />
          <AvatarFallback className="caption-small">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('min-w-0 max-w-[85%] sm:max-w-md', isMe && 'ml-auto')}>
        {!isMe && (
          <div className="mb-1 flex items-baseline gap-2 px-1">
            <span className="label-small truncate text-text-primary">{name}</span>
            <span className="caption-small shrink-0 text-text-secondary">{time}</span>
          </div>
        )}

        {isSending ? (
          message.sendingPreviews?.length ? (
            <>
              <SendingFilesBubble sendingPreviews={message.sendingPreviews} />
              {message.content && <div className={cn(bubbleClass, 'mt-2')}>{message.content}</div>}
            </>
          ) : (
            <div
              className={cn(
                'flex items-center gap-2 rounded-2xl px-3 py-2 text-sm sm:px-4 sm:py-3 sm:text-base',
                isMe
                  ? 'bg-chat-bubble-me-bg-sending text-chat-bubble-me-text'
                  : 'bg-chat-bubble-them-bg text-chat-bubble-them-text',
              )}
            >
              <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
              <span>{t('sending')}</span>
            </div>
          )
        ) : (
          <>
            {hasAttachments && <MessageAttachments attachments={message.attachments} />}
            {message.content && (
              <div className={cn(bubbleClass, hasAttachments && 'mt-2', 'whitespace-pre-wrap break-words')}>
                {message.content}
              </div>
            )}
          </>
        )}

        {isMe && !isSending && (
          <div className="mt-1 flex items-center justify-end gap-1 px-1">
            <span className="caption-small text-text-secondary">{time}</span>
            <MessageStatusIcon status={message.status} unreadClassName="text-text-secondary" />
          </div>
        )}
      </div>
    </div>
  );
}
