'use client';

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { CombinedGraphQLErrors } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { History, MessageSquare, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CircleJoinAction } from '@/components/circles/join';
import { DateSeparator } from '@/components/chats/DateSeparator';
import { MessageInput } from '@/components/chats/MessageInput';
import { TypingDots } from '@/components/chats/TypingDots';
import PageLoader from '@/components/custom/PageLoader';
import { EmptyState, ErrorState } from '@/components/feedback';
import { CircleHero } from '@/components/circles/shell';
import { Section } from '@/components/redesign/Section';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { Link } from '@/i18n/navigation';
import { getDateLabel, getMessageDateKey } from '@/lib/chatTime';
import { readMutationOutcome } from '@/lib/mutationOutcome';
import {
  CIRCLE,
  CIRCLE_CHALLENGES,
  CIRCLE_CHAT,
  CIRCLE_MOTIONS,
  CIRCLE_PUBLIC_CARD,
  CIRCLE_PROJECTS,
  MY_CIRCLE_MEMBERSHIP,
} from '@/services/gql/circles';
import type {
  Circle,
  CircleChallenge,
  CircleChat,
  CircleMembershipCheck,
  CircleMotion,
  CirclePublicCardData,
  CircleProject,
} from '@/services/gql/types/circles';
import { SEND_MESSAGE } from '@/services/gql/messaging';
import type { SendMessageData } from '@/services/gql/types/messaging';
import { messageService } from '@/services/websocket/messageService';
import { useChatStore, type ApiMessage } from '@/store/ChatStore';
import { useUserStore } from '@/store/useUserStore';

import { ChallengeCard } from './ChallengeCard';
import { CircleLivePanel } from './CircleLivePanel';
import { CircleMembersPanel } from './CircleMembersPanel';
import { CircleMessageBubble } from './CircleMessageBubble';
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
 * The chat, when it is on, is a card of fixed height inside the page: the
 * conversation scrolls inside it and the composer stays pinned to its foot, so
 * neither is carried away with the page. `svh` so a phone's collapsing address
 * bar does not push the composer under the fold.
 */
const CHAT_CARD_HEIGHT_CLASS = 'h-[min(72svh,44rem)] min-h-[24rem]';

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

  // The non-member landing: `circle` is null for a stranger, so how the circle
  // lets people in comes from its public card. Skipped once the viewer is in.
  const { data: cardData, loading: cardLoading } = useQuery<CirclePublicCardData>(
    CIRCLE_PUBLIC_CARD,
    {
      variables: { circleId },
      skip: Boolean(circle),
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
  );
  const publicCard = cardData?.circlePublicCard ?? null;

  // ── Chat handle ──────────────────────────────────────────────────────────
  const { data: chatData, loading: chatLoading } = useQuery<ChatData>(CIRCLE_CHAT, {
    variables: { circleId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const chat = chatData?.circleChat ?? null;
  const conversationId = chat?.available ? chat.conversationId ?? null : null;

  // ── Artefacts ────────────────────────────────────────────────────────────
  const cardVars = { circleId, limit: INLINE_CARD_LIMIT };
  const { data: motionsData, loading: motionsLoading } = useQuery<MotionsData>(CIRCLE_MOTIONS, {
    variables: cardVars,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const { data: projectsData, loading: projectsLoading } = useQuery<ProjectsData>(CIRCLE_PROJECTS, {
    variables: cardVars,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const { data: challengesData, loading: challengesLoading } = useQuery<ChallengesData>(CIRCLE_CHALLENGES, {
    variables: cardVars,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // ── Messages ─────────────────────────────────────────────────────────────
  const {
    refetch: refetchMessages,
    loading: messagesLoading,
    initialLoading: messagesFirstLoad,
  } = useChatMessages({
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
        const result = await sendMessage({
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

        /*
         * The client runs `errorPolicy: 'all'`, so a REFUSED send resolves with
         * `data: null` and the catch below never fires. Before this, a rejected
         * message simply vanished: no bubble, no toast, nothing to retry — the
         * worst failure mode a composer has. Read the outcome explicitly.
         */
        const outcome = readMutationOutcome(result, (d) => d.sendMessage);
        if (!outcome.ok) {
          toast.error(tGroup('sendFailed'));
          return;
        }

        const data = result.data;
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
  const listRef = useRef<HTMLDivElement>(null);
  // A chat reads oldest to newest and follows its latest line; with chat off the
  // same entries are a feed of what the circle is doing, so the newest is first.
  const displayTimeline = useMemo(
    () => (conversationId ? timeline : [...timeline].reverse()),
    [timeline, conversationId],
  );
  // Six independent queries feed the first frame — circle, membership, the chat
  // handle (which decides whether the composer shows an input or "unavailable"),
  // and the three artefact lists interleaved into the timeline. They already
  // fire in parallel (no query depends on another's result), so combining them
  // into one gate costs no extra round trip — it only changes when the result is
  // SHOWN. Without this, the header + composer appeared as soon as circle and
  // membership resolved while motions/projects/challenges (and the chat
  // availability the composer depends on) kept popping into an already-visible
  // page. `circle` is also checked on its own below: it comes back null for an
  // archived circle AND for a non-member, and only the membership check tells
  // those apart, so deciding early would flash "This circle is private" at
  // somebody whose circle was merely archived.
  const criticalLoading =
    (circleLoading && !circleData) ||
    (membershipLoading && !membershipData) ||
    (chatLoading && !chatData) ||
    (motionsLoading && !motionsData) ||
    (projectsLoading && !projectsData) ||
    (challengesLoading && !challengesData);

  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (timeline.length === 0) return;
    // With no chat there is no conversation to follow to its latest line: the
    // screen is a feed of what the circle is doing, so it opens at the top.
    if (!conversationId) return;
    // Still behind the page loader, or the circle's other activity has landed
    // before the messages: there is nothing to follow yet, and the first jump
    // must not be spent on it or the conversation would animate into place.
    const list = listRef.current;
    if (!list || messagesFirstLoad) return;
    // The first paint jumps; later arrivals animate. Smooth-scrolling a chat
    // the instant it opens looks like the page is still loading. The list
    // itself is scrolled (not `scrollIntoView`, which would also drag the whole
    // page to the foot of the chat card).
    list.scrollTo({
      top: list.scrollHeight,
      behavior: hasScrolledRef.current ? 'smooth' : 'auto',
    });
    hasScrolledRef.current = true;
  }, [timeline, conversationId, messagesFirstLoad, criticalLoading]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (criticalLoading) {
    return <PageLoader />;
  }

  // The gateway answers a stranger with `CIRCLE_NOT_A_MEMBER` (it used to be FORBIDDEN,
  // which signed people out). That is not a load failure: it is the join landing below.
  const notAMember =
    CombinedGraphQLErrors.is(circleError) &&
    circleError.errors.some((e) => e.extensions?.code === 'CIRCLE_NOT_A_MEMBER');

  if (circleError && !circle && !notAMember) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
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
    if (!isMember && cardLoading && !cardData) return <PageLoader />;
    if (!isMember && publicCard && publicCard.joinMode !== 'INVITE_ONLY') {
      const open = publicCard.joinMode === 'OPEN';
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <EmptyState
            size="lg"
            title={publicCard.name}
            description={open ? t('join.landing.open') : t('join.landing.request')}
            action={
              <div className="w-full max-w-xs space-y-3" data-testid="circle-join-landing">
                {open && (
                  <p className="caption-small text-text-brand">{t('index.access.open')}</p>
                )}
                <CircleJoinAction
                  circleId={circleId}
                  joinMode={publicCard.joinMode}
                  refetch={['Circle', 'MyCircleMembership', 'CircleChat', 'CirclePublicCard']}
                />
              </div>
            }
          />
        </div>
      );
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
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
  const chatOn = Boolean(conversationId);

  const entries =
    timeline.length === 0 ? (
      messagesLoading ? (
        /*
         * Messages are a genuinely second-stage fetch: `conversationId` only
         * exists once `chat` (one of the six gated queries above) has resolved,
         * so this is the earliest it can start. It is an on-demand panel inside
         * an already-revealed page, not part of first paint, hence `PageLoader`
         * here rather than blocking the whole screen on a query that cannot
         * start any sooner.
         */
        <PageLoader />
      ) : conversationId ? (
        <EmptyState
          icon={MessageSquare}
          title={t('empty.messages.title')}
          description={t('empty.messages.description')}
        />
      ) : (
        /*
         * Chat is off, so "Say hello — this is where your circle talks" would
         * invite something the page has just said is impossible. The rest of
         * the circle still works, and "Start something" is how you reach it.
         */
        <EmptyState
          icon={Sparkles}
          title={t('home.noChatEmpty.title')}
          description={t('home.noChatEmpty.description')}
        />
      )
    ) : (
      displayTimeline.map((entry) => {
        // Date separators are driven by the whole timeline, not only by
        // messages: a motion opened at 9am on a new day has to sit under that
        // day's heading like anything else that happened.
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
    );

  /*
   * The CHAT_HISTORY_DAYS entitlement. `circleChat` already returns
   * `historyLimited` and `historyDays`; without this a circle on a short-history
   * plan silently appeared to have started later than it did. Nothing is deleted
   * by a plan change, and saying so is the point of the row. (The design put a
   * pinned message in this slot; message-service has no pin, so there is nothing
   * true to render.)
   */
  const historyNote =
    chat?.available && chat.historyLimited && chat.historyDays > 0 ? (
      <p className="caption-small flex items-start gap-2 rounded-xl bg-surface-subtle px-3 py-2 text-text-secondary">
        <History aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {t('home.historyLimited', { days: chat.historyDays })}
      </p>
    ) : null;

  return (
    <div className="space-y-5">
      <CircleHero
        circleId={circleId}
        name={circle.name}
        tagline={circle.tagline}
        memberCount={circle.memberCount}
        avatarUrl={circle.avatarUrl}
        bannerUrl={circle.bannerUrl}
        chatOn={chatOn}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          {chatOn ? (
            <Section labelledBy="circle-feed-title" testId="circle-chat" className="flex flex-col !p-0">
              <div className="shrink-0 px-4 pt-4 sm:px-5 sm:pt-5">
                <SectionHeader id="circle-feed-title" title={t('home.nav.chat')} subtitle={t('home.chatSubtitle')} />
                {historyNote}
              </div>
              <div className={`flex flex-col ${CHAT_CARD_HEIGHT_CLASS}`}>
                <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
                  {entries}
                </div>

                {typingUserIds.size > 0 && (
                  <div aria-live="polite" className="flex shrink-0 items-center gap-2 px-4 pb-1 sm:px-5">
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

                <div className="shrink-0 rounded-b-2xl" data-testid="circle-composer">
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    placeholder={t('home.composerPlaceholder', { circleName: circle.name })}
                    disabled={!currentUserId || !isMember}
                    conversationId={conversationId ?? undefined}
                    senderId={currentUserId}
                    onTyping={emitTyping}
                    autoFocusWhenReady={false}
                  />
                </div>
              </div>
            </Section>
          ) : (
            <Section labelledBy="circle-feed-title" testId="circle-feed">
              <SectionHeader id="circle-feed-title" title={t('home.feedTitle')} subtitle={t('home.feedSubtitle')} />
              <div className="space-y-3">{entries}</div>
              {/*
               * Chat is provisioned per circle and is currently switched off
               * platform-wide (CIRCLE_CHAT_ENABLED), so there is no conversation
               * to write into. A composer here would read as a working control
               * that silently swallows what you type — worse than none. Say what
               * is happening instead.
               */}
              <p className="caption-small mt-4 rounded-xl bg-surface-subtle px-3 py-2 text-center text-text-secondary">
                {t('home.chatUnavailable')}
              </p>
            </Section>
          )}
        </div>

        {/*
         * The rail. Both panels read their own data and degrade to nothing on
         * failure, so a circle-service hiccup costs the context beside the feed
         * rather than the feed itself. On a phone it sits above a chat-less feed
         * (what is live is the summary of it) and below a chat (which wants the
         * screen).
         *
         * No `aria-label`: this is a complementary landmark and each panel
         * already carries its own heading.
         */}
        <aside className={`min-w-0 space-y-5 ${chatOn ? '' : 'order-first lg:order-none'}`}>
          <CircleLivePanel circleId={circleId} />
          <CircleMembersPanel
            circleId={circleId}
            memberCount={circle.memberCount}
            currentUserId={currentUserId}
          />
        </aside>
      </div>
    </div>
  );
}
