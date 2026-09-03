'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { MessageSquare } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { DateSeparator } from '@/components/chats/DateSeparator';
import { MessageInput } from '@/components/chats/MessageInput';
import { TypingDots } from '@/components/chats/TypingDots';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { Link } from '@/i18n/navigation';
import { getDateLabel, getMessageDateKey } from '@/lib/chatTime';
import {
  CIRCLE,
  CIRCLE_CHALLENGES,
  CIRCLE_CHAT,
  CIRCLE_MOTIONS,
  CIRCLE_PROJECTS,
  MY_CIRCLE_MEMBERSHIP,
} from '@/services/gql/circles';
import type {
  Circle,
  CircleChallenge,
  CircleChat,
  CircleMembershipCheck,
  CircleMotion,
  CircleProject,
} from '@/services/gql/types/circles';
import { SEND_MESSAGE } from '@/services/gql/messaging';
import type { SendMessageData } from '@/services/gql/types/messaging';
import { messageService } from '@/services/websocket/messageService';
import { useChatStore, type ApiMessage } from '@/store/ChatStore';
import { useUserStore } from '@/store/useUserStore';

import { ChallengeCard } from './ChallengeCard';
import { CircleMessageBubble } from './CircleMessageBubble';
import { CircleHomeHeader } from './CircleHomeHeader';
import { MotionCard } from './MotionCard';
import { ProjectCard } from './ProjectCard';
import { buildCircleTimeline, collectTimelineUserIds } from './timeline';

/**
 * How many of each artefact are pulled into the conversation.
 *
 * Cards are not filtered by status: a motion that passed last month is part of
 * how this circle got here, and removing it from the conversation the moment it
 * closed would turn a record into a dashboard. The bound exists because each
 * card costs one to three follow-up queries (see `ProjectCard`), so it caps the
 * fan-out rather than the history — a circle with more artefacts than this shows
 * its most recent ones.
 */
const INLINE_CARD_LIMIT = 10;

/** Message history page, matching `chats/GroupChat.tsx`. */
const MESSAGE_PAGE_SIZE = 50;

/**
 * Geometry of the chat column inside the `(home)` sidebar shell.
 *
 * `FEED_COLUMN_CLASS` is deliberately NOT reused: it scrolls the whole column,
 * which would carry the header and the composer away with the messages. A chat
 * pins both and scrolls only the conversation between them, so the column is a
 * fixed-height flex container and the overflow sits one level in.
 *
 * The width is pinned rather than content-sized, the same way
 * `FEED_COLUMN_POST_PAGE_CLASS` pins the post column: chat lines are short, and
 * a column that sized to its content would visibly resize as messages arrive.
 */
const CHAT_COLUMN_CLASS =
  'mx-4 flex w-full min-w-0 flex-1 flex-col lg:w-[40vw] lg:min-w-[40vw] lg:max-w-[40vw] lg:flex-none';

interface CircleData {
  circle?: Circle | null;
}
interface MembershipData {
  myCircleMembership?: CircleMembershipCheck | null;
}
interface ChatData {
  circleChat?: CircleChat | null;
}
interface MotionsData {
  circleMotions?: CircleMotion[] | null;
}
interface ProjectsData {
  circleProjects?: CircleProject[] | null;
}
interface ChallengesData {
  circleChallenges?: CircleChallenge[] | null;
}

export interface CircleHomeProps {
  circleId: string;
}

/**
 * Circle home — the chat, and everything the circle decided inside it.
 *
 * ── TWO BACKENDS, ONE SCREEN ────────────────────────────────────────────────
 * `circleChat` hands back a `conversationId` and nothing else; the messages
 * themselves live in message-service and are read through the existing
 * `useChatMessages` / `SEND_MESSAGE` surface. This component is the bridge, and
 * it is the only place that knows both halves.
 *
 * ── WEBSOCKET IS A TRIGGER, NOT A TRANSPORT ─────────────────────────────────
 * The socket payload is encrypted, so an incoming `message` event cannot be
 * rendered. It is used only to say "something arrived here", which re-queries
 * GraphQL for plaintext; live state lands in `useChatStore`, never the Apollo
 * cache. `MessageWebSocketProvider` (mounted by the `(main)` layout) already
 * pushes every incoming message into the store globally — the subscription here
 * only refreshes THIS conversation's plaintext, exactly as `GroupChat` does.
 */
export function CircleHome({ circleId }: CircleHomeProps) {
  const t = useTranslations('circles');
  const tChat = useTranslations('chat.direct');
  const tGroup = useTranslations('chat.group');
  const tDates = useTranslations('chat.dateLabels');
  // `ErrorState`'s own default title is hard-coded English.
  const tFeedback = useTranslations('feedback');
  const locale = useLocale();

  const user = useUserStore((s) => s.user);
  const currentUserId = user?.userId;
  const userTimeZone =
    user?.timezone || user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Circle ───────────────────────────────────────────────────────────────
  const {
    data: circleData,
    loading: circleLoading,
    error: circleError,
    refetch: refetchCircle,
  } = useQuery<CircleData>(CIRCLE, {
    variables: { circleId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const circle = circleData?.circle ?? null;

  // Advisory only — the gateway enforces the same check. Used to keep the
  // composer out of the hands of somebody who has been removed while the tab
  // was open, so they get a disabled field instead of a rejected send.
  const { data: membershipData, loading: membershipLoading } = useQuery<MembershipData>(
    MY_CIRCLE_MEMBERSHIP,
    {
      variables: { circleId },
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
  );
  const isMember = membershipData?.myCircleMembership?.isMember ?? false;

  // ── Chat handle ──────────────────────────────────────────────────────────
  const { data: chatData } = useQuery<ChatData>(CIRCLE_CHAT, {
    variables: { circleId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const chat = chatData?.circleChat ?? null;
  const conversationId = chat?.available ? chat.conversationId ?? null : null;

  // ── Artefacts ────────────────────────────────────────────────────────────
  const cardVars = { circleId, limit: INLINE_CARD_LIMIT };
  const { data: motionsData } = useQuery<MotionsData>(CIRCLE_MOTIONS, {
    variables: cardVars,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const { data: projectsData } = useQuery<ProjectsData>(CIRCLE_PROJECTS, {
    variables: cardVars,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const { data: challengesData } = useQuery<ChallengesData>(CIRCLE_CHALLENGES, {
    variables: cardVars,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // ── Messages ─────────────────────────────────────────────────────────────
  const { refetch: refetchMessages, loading: messagesLoading } = useChatMessages({
    conversationId,
    limit: MESSAGE_PAGE_SIZE,
  });

  const allApiMessages = useChatStore((s) => s.apiMessages);
  const addApiMessage = useChatStore((s) => s.addApiMessage);

  const messages = useMemo(
    () =>
      conversationId
        ? allApiMessages
            .filter((m) => m.conversationId === conversationId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [allApiMessages, conversationId],
  );

  useEffect(() => {
    if (!conversationId) return;
    return messageService.onMessage((wsMessage) => {
      // The payload is encrypted; treat the event purely as "re-read this
      // conversation from GraphQL".
      if (wsMessage.conversationId === conversationId) void refetchMessages();
    });
  }, [conversationId, refetchMessages]);

  const { typingUserIds, emit: emitTyping } = useTypingIndicator({
    conversationId,
    excludeUserId: currentUserId,
  });

  // ── Timeline ─────────────────────────────────────────────────────────────
  const timeline = useMemo(
    () =>
      buildCircleTimeline({
        messages,
        motions: motionsData?.circleMotions ?? [],
        projects: projectsData?.circleProjects ?? [],
        challenges: challengesData?.circleChallenges ?? [],
      }),
    [messages, motionsData, projectsData, challengesData],
  );

  const timelineUserIds = useMemo(() => collectTimelineUserIds(timeline), [timeline]);
  // Also resolve whoever is typing, so the indicator can name them.
  const peopleIds = useMemo(
    () => Array.from(new Set([...timelineUserIds, ...typingUserIds])),
    [timelineUserIds, typingUserIds],
  );
  const { usersById } = useCircleUsers(peopleIds);

  const unknownName = tChat('unknownUser');
  const nameFor = useCallback(
    (userId?: string | null) =>
      userId ? circleUserDisplayName(usersById[userId], unknownName) : unknownName,
    [usersById, unknownName],
  );

  // ── Sending ──────────────────────────────────────────────────────────────
  const [sendMessage] = useMutation<SendMessageData>(SEND_MESSAGE);
  const { uploadFiles, finalizeUpload } = useMediaUpload();

  const handleSendMessage = useCallback(
    async (text: string, files?: File[]) => {
      const trimmed = text.trim();
      const hasFiles = Boolean(files?.length);
      if (!trimmed && !hasFiles) return;
      if (!conversationId || !currentUserId) return;

      // Files land in GCS first; the message then carries their public URLs, so
      // a failed upload never produces a message pointing at nothing.
      const upload = hasFiles && files
        ? await uploadFiles({ files, conversationId, senderId: currentUserId, messageText: trimmed })
        : null;
      if (hasFiles && !upload) return;

      const attachments = upload?.attachments ?? [];
      const messageType = upload?.messageType ?? 'TEXT';
      const content = attachments[0] ? trimmed || attachments[0].publicUrl : trimmed;

      try {
        const { data } = await sendMessage({
          variables: {
            conversationId,
            messageType,
            content,
            attachments: attachments.length
              ? attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType }))
              : undefined,
            // Guards against a double-send if the request is retried in flight.
            idempotencyKey: crypto.randomUUID(),
          },
        });

        if (data?.sendMessage) {
          const sent: ApiMessage = {
            id: data.sendMessage,
            conversationId,
            senderId: currentUserId,
            type: messageType,
            content,
            createdAt: new Date().toISOString(),
            status: 'sent',
            ...(attachments.length && {
              attachments: attachments.map((a, i) => ({
                gcsPath: a.publicUrl,
                mimeType: a.mimeType,
                fileName: files?.[i]?.name,
                fileSize: files?.[i]?.size,
              })),
            }),
          };
          addApiMessage(sent);
        }
      } catch (error) {
        console.error('Failed to send circle message:', error);
        toast.error(tGroup('sendFailed'));
      } finally {
        // Runs on success AND failure so the "sending…" placeholder and its
        // blob URLs never outlive the attempt.
        if (upload) finalizeUpload(upload.placeholderId);
      }
    },
    [
      conversationId,
      currentUserId,
      uploadFiles,
      finalizeUpload,
      sendMessage,
      addApiMessage,
      tGroup,
    ],
  );

  // ── Scroll ───────────────────────────────────────────────────────────────
  const endRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (timeline.length === 0) return;
    // The first paint jumps; later arrivals animate. Smooth-scrolling a chat
    // the instant it opens looks like the page is still loading.
    endRef.current?.scrollIntoView({
      behavior: hasScrolledRef.current ? 'smooth' : 'auto',
      block: 'end',
    });
    hasScrolledRef.current = true;
  }, [timeline]);

  // ── Render ───────────────────────────────────────────────────────────────
  // Both answers are needed before the screen can say anything true: `circle`
  // comes back null for an archived circle AND for a non-member, and only the
  // membership check tells those apart. Deciding early would flash "This circle
  // is private" at somebody whose circle was merely archived.
  if ((circleLoading || membershipLoading) && !circle) {
    return <CircleHomeSkeleton />;
  }

  if (circleError && !circle) {
    return (
      <div className="flex h-app-inner items-center justify-center px-4">
        <ErrorState
          title={tFeedback('error.title')}
          description={t('errors.loadCircle')}
          retryLabel={t('common.retry')}
          onRetry={() => void refetchCircle()}
        />
      </div>
    );
  }

  if (!circle) {
    // `circle` is null both when the circle does not exist and when the viewer
    // is not a member — the membership check is what tells them apart, and each
    // deserves its own words.
    const scope = isMember ? 'notFound' : 'noAccess';
    return (
      <div className="flex h-app-inner items-center justify-center px-4">
        <EmptyState
          size="lg"
          title={t(`errors.${scope}.title`)}
          description={t(`errors.${scope}.description`)}
          action={
            <Link
              href="/circles"
              className="label-medium inline-flex items-center rounded-full bg-surface-brand px-4 py-2 text-text-white transition-opacity hover:opacity-90"
            >
              {t('errors.notFound.cta')}
            </Link>
          }
        />
      </div>
    );
  }

  let lastDateKey: string | null = null;

  return (
    <div className="flex h-app-inner overflow-hidden">
      <div className={CHAT_COLUMN_CLASS}>
        <CircleHomeHeader
          circleId={circleId}
          name={circle.name}
          memberCount={circle.memberCount}
          avatarUrl={circle.avatarUrl}
        />

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 scrollbar-hide sm:px-4">
          {timeline.length === 0 ? (
            messagesLoading ? (
              <MessageListSkeleton />
            ) : (
              <EmptyState
                icon={MessageSquare}
                title={t('empty.messages.title')}
                description={t('empty.messages.description')}
              />
            )
          ) : (
            timeline.map((entry) => {
              // Date separators are driven by the whole timeline, not only by
              // messages: a motion opened at 9am on a new day has to sit under
              // that day's heading like anything else that happened.
              let separator: ReactNode = null;
              if (entry.iso) {
                const dateKey = getMessageDateKey(entry.iso, userTimeZone);
                if (dateKey !== lastDateKey) {
                  lastDateKey = dateKey;
                  separator = (
                    <DateSeparator
                      label={getDateLabel(
                        entry.iso,
                        userTimeZone,
                        { today: tDates('today'), yesterday: tDates('yesterday') },
                        locale,
                      )}
                    />
                  );
                }
              }

              return (
                <div key={entry.key}>
                  {separator}
                  {entry.kind === 'message' && (
                    <CircleMessageBubble
                      message={entry.message}
                      isMe={entry.message.senderId === currentUserId}
                      sender={usersById[entry.message.senderId] ?? null}
                      fallbackName={unknownName}
                      timeZone={userTimeZone}
                    />
                  )}
                  {entry.kind === 'project' && (
                    <ProjectCard
                      circleId={circleId}
                      project={entry.project}
                      proposerName={nameFor(entry.project.createdBy)}
                    />
                  )}
                  {entry.kind === 'motion' && (
                    <MotionCard
                      circleId={circleId}
                      motion={entry.motion}
                      proposerName={nameFor(entry.motion.proposedBy)}
                    />
                  )}
                  {entry.kind === 'challenge' && (
                    <ChallengeCard
                      circleId={circleId}
                      challenge={entry.challenge}
                      starterName={nameFor(entry.challenge.createdBy)}
                    />
                  )}
                </div>
              );
            })
          )}

          <div ref={endRef} />
        </div>

        {typingUserIds.size > 0 && (
          <div
            aria-live="polite"
            className="flex shrink-0 items-center gap-2 px-4 pb-1"
          >
            <TypingDots dotClassName="bg-text-secondary" />
            {/*
              Only the one-person form is spelled out. "Ama, Kofi is typing…" is
              wrong in English and worse in the four other locales this app ships,
              and the catalogue has no plural for it — so several people typing at
              once is shown by the dots alone rather than by a broken sentence.
            */}
            {typingUserIds.size === 1 && (
              <span className="caption-small text-text-secondary">
                {`${nameFor([...typingUserIds][0])} ${tChat('typing')}`}
              </span>
            )}
          </div>
        )}

        <div className="shrink-0">
          {conversationId ? (
            <MessageInput
              onSendMessage={handleSendMessage}
              placeholder={t('home.composerPlaceholder', { circleName: circle.name })}
              disabled={!currentUserId || !isMember}
              conversationId={conversationId}
              senderId={currentUserId}
              onTyping={emitTyping}
            />
          ) : (
            /*
             * Chat is provisioned per circle and is currently switched off
             * platform-wide (CIRCLE_CHAT_ENABLED), so there is no conversation
             * to write into. Previously this still rendered a MessageInput with
             * a "Message <circle>…" placeholder and `disabled`, which reads as a
             * working composer that silently swallows what you type — the exact
             * kind of control that is worse than no control. Say what is
             * happening instead.
             */
            <div className="border-t border-border-subtle bg-surface-subtle px-4 py-3 text-center">
              <p className="caption-small text-text-secondary">
                {t('home.chatUnavailable')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={i % 2 === 0 ? 'flex gap-2' : 'flex justify-end gap-2'}>
          {i % 2 === 0 && <Skeleton className="size-7 shrink-0 rounded-full" />}
          <Skeleton className="h-14 w-52 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function CircleHomeSkeleton() {
  return (
    <div className="flex h-app-inner overflow-hidden">
      <div className={CHAT_COLUMN_CLASS}>
        <div className="shrink-0 border-b border-border-subtle px-4 pt-2">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-3 flex gap-4 pb-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </div>
        <div className="min-h-0 flex-1 px-4 py-4">
          <MessageListSkeleton />
        </div>
      </div>
    </div>
  );
}
