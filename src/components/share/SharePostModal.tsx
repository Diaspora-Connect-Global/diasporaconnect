'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X, Copy } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client/react';
import Image from 'next/image';
import { SHARE_POST, type SharePostData } from '@/services/gql/postsFeed';
import {
  GET_CONVERSATIONS,
  SEND_MESSAGE,
  CREATE_CONVERSATION,
  type GetConversationsData,
  type SendMessageData,
  type CreateConversationData,
} from '@/services/gql/messaging';
import { GET_MY_GROUPS, type GetMyGroupsResponse } from '@/services/gql/groups';
import { GET_MY_CONNECTIONS, type GetConnectionsResponse } from '@/services/gql/connection';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';

const DEFAULT_AVATAR = '/PROFILE.png';

export interface SharePostModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  /** Optional: if already known, avoids an extra SHARE_POST call when opening. */
  initialShareLink?: string | null;
  /** Called after share count is incremented (e.g. parent refetch). */
  onShared?: () => void;
}

export default function SharePostModal({
  open,
  onClose,
  postId,
  initialShareLink = null,
  onShared,
}: SharePostModalProps) {
  const t = useTranslations('actions');
  const currentUserId = useUserStore((s) => s.user?.userId ?? null);
  const [shareLink, setShareLink] = useState<string>(initialShareLink ?? '');
  const [copied, setCopied] = useState(false);
  const [sharePostMutation, { loading: shareLoading }] = useMutation<SharePostData>(SHARE_POST);
  const [sendMessageMutation, { loading: sendMessageLoading }] = useMutation<SendMessageData>(SEND_MESSAGE);
  const [createConversationMutation] = useMutation<CreateConversationData>(CREATE_CONVERSATION);

  const { data: conversationsData } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
    variables: { limit: 50, offset: 0 },
    skip: !open,
  });
  const { data: groupsData } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, {
    variables: { limit: 50, offset: 0 },
    skip: !open,
  });
  const { data: connectionsData } = useQuery<GetConnectionsResponse>(GET_MY_CONNECTIONS, {
    variables: { limit: 100, offset: 0 },
    skip: !open,
  });

  const conversations = conversationsData?.getConversations ?? [];
  const groups = groupsData?.getMyGroups?.groups ?? [];

  /** Friends (accepted connections): other user per connection, deduped by userId. */
  const friends = useMemo(() => {
    if (!currentUserId || !connectionsData?.getConnections?.connections) return [];
    const seen = new Set<string>();
    return connectionsData.getConnections.connections
      .filter((c) => (c.status?.toLowerCase() === 'accepted' || !c.status))
      .map((c) => {
        const other = c.requesterId === currentUserId ? c.receiver : c.requester;
        return {
          userId: other.userId,
          name: [other.firstName, other.lastName].filter(Boolean).join(' ') || 'Unknown',
          avatarUrl: other.avatarUrl || DEFAULT_AVATAR,
        };
      })
      .filter((f) => {
        if (seen.has(f.userId)) return false;
        seen.add(f.userId);
        return f.userId !== currentUserId;
      });
  }, [currentUserId, connectionsData]);

  const hasFriendsOrGroups = friends.length > 0 || groups.length > 0;

  useEffect(() => {
    if (open) {
      if (initialShareLink) setShareLink(initialShareLink);
      else setShareLink('');
      setCopied(false);
    }
  }, [open, initialShareLink]);

  const ensureShareLink = useCallback(async () => {
    if (shareLink) return shareLink;
    try {
      const { data } = await sharePostMutation({ variables: { postId } });
      const link = data?.sharePost?.shareLink ?? '';
      setShareLink(link);
      onShared?.();
      return link;
    } catch (err) {
      console.error('Share post failed:', err);
      toast.error(t('shareLinkFailed'));
      return '';
    }
  }, [shareLink, postId, sharePostMutation, onShared, t]);

  const copyToClipboard = useCallback(async () => {
    const link = await ensureShareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error(t('shareLinkFailed'));
    }
  }, [ensureShareLink, t]);

  const handleShareToConversation = useCallback(
    async (conversationId: string) => {
      const link = await ensureShareLink();
      if (!link) return;
      try {
        await sendMessageMutation({
          variables: {
            conversationId,
            messageType: 'TEXT',
            content: link,
          },
        });
        toast.success(t('shareLinkSent'));
        onClose();
      } catch (err) {
        console.error('Send message failed:', err);
        toast.error(t('shareLinkFailed'));
      }
    },
    [ensureShareLink, sendMessageMutation, t, onClose]
  );

  /** Share to a friend: find existing DIRECT conversation or create one, then send. */
  const handleShareToFriend = useCallback(
    async (friendUserId: string) => {
      const link = await ensureShareLink();
      if (!link) return;
      try {
        let conversationId: string | null = null;
        const direct = conversations.find(
          (c) =>
            c.type === 'DIRECT' &&
            c.participantIds?.length === 2 &&
            c.participantIds.includes(friendUserId)
        );
        if (direct) {
          conversationId = direct.id;
        } else {
          const { data } = await createConversationMutation({
            variables: { type: 'DIRECT', participantIds: [friendUserId] },
          });
          conversationId = data?.createConversation ?? null;
        }
        if (conversationId) {
          await handleShareToConversation(conversationId);
        } else {
          toast.error(t('shareLinkFailed'));
        }
      } catch (err) {
        console.error('Share to friend failed:', err);
        toast.error(t('shareLinkFailed'));
      }
    },
    [ensureShareLink, conversations, createConversationMutation, handleShareToConversation, t]
  );

  const handleShareToGroup = useCallback(
    async (groupId: string) => {
      const link = await ensureShareLink();
      if (!link) return;
      const groupConversation = conversations.find((c) => c.groupId === groupId);
      if (groupConversation) {
        await handleShareToConversation(groupConversation.id);
        return;
      }
      toast.error(t('noConversations'));
    },
    [ensureShareLink, conversations, handleShareToConversation, t]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface-default rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">{t('sharePost')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-subtle text-text-secondary"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-sm font-medium text-text-primary mb-3">{t('shareInMessage')}</p>

          {/* Send as a message: friends (avatar + name under) and groups on the same row */}
          {hasFriendsOrGroups ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {friends.map((f) => (
                <button
                  key={f.userId}
                  type="button"
                  onClick={() => handleShareToFriend(f.userId)}
                  disabled={sendMessageLoading}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-lg hover:bg-surface-subtle transition-colors min-w-[4rem]"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-subtle">
                    <Image
                      src={f.avatarUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-text-primary text-center truncate max-w-[4.5rem]">
                    {f.name}
                  </span>
                </button>
              ))}
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleShareToGroup(g.id)}
                  disabled={sendMessageLoading}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-lg hover:bg-surface-subtle transition-colors min-w-[4rem]"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-subtle">
                    <Image
                      src={g.avatarUrl || DEFAULT_AVATAR}
                      alt=""
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-text-primary text-center truncate max-w-[4.5rem]">
                    {g.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-text-tertiary text-sm py-2 mb-2">{t('noConversations')}</p>
          )}

          {/* Copy link below */}
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={shareLoading}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:bg-surface-subtle transition-colors text-left mt-2"
          >
            <div className="p-2 rounded-full bg-surface-subtle">
              <Copy className="w-5 h-5 text-text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-text-primary">{t('copyLink')}</span>
              {copied && <span className="ml-2 text-sm text-text-brand">{t('copied')}</span>}
            </div>
            {shareLoading && <span className="text-sm text-text-tertiary">...</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
