'use client';

import { useCallback, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Copy, Check, MessageCircle, Users } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client/react';
import { SHARE_POST, type SharePostData } from '@/services/gql/postsFeed';
import { GET_CONVERSATIONS, SEND_MESSAGE, type GetConversationsData, type SendMessageData } from '@/services/gql/messaging';
import { GET_MY_GROUPS, type GetMyGroupsResponse } from '@/services/gql/groups';
import { toast } from 'sonner';

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
  const [shareLink, setShareLink] = useState<string>(initialShareLink ?? '');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'main' | 'conversations' | 'groups'>('main');

  const [sharePostMutation, { loading: shareLoading }] = useMutation<SharePostData>(SHARE_POST);
  const [sendMessageMutation, { loading: sendMessageLoading }] = useMutation<SendMessageData>(SEND_MESSAGE);

  const { data: conversationsData } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
    variables: { limit: 50, offset: 0 },
    skip: !open || step !== 'conversations',
  });
  const { data: groupsData } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, {
    variables: { limit: 50, offset: 0 },
    skip: !open || step !== 'groups',
  });

  const conversations = conversationsData?.getConversations ?? [];
  const groups = groupsData?.getMyGroups?.groups ?? [];

  useEffect(() => {
    if (open) {
      setStep('main');
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
        setStep('main');
        onClose();
      } catch (err) {
        console.error('Send message failed:', err);
        toast.error(t('shareLinkFailed'));
      }
    },
    [ensureShareLink, sendMessageMutation, t, onClose]
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
      onClick={() => { setStep('main'); onClose(); }}
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
          {step === 'main' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={shareLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:bg-surface-subtle transition-colors text-left"
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

              <button
                type="button"
                onClick={() => setStep('conversations')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:bg-surface-subtle transition-colors text-left"
              >
                <div className="p-2 rounded-full bg-surface-subtle">
                  <MessageCircle className="w-5 h-5 text-text-primary" />
                </div>
                <span className="font-medium text-text-primary">{t('shareInMessage')}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('groups')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:bg-surface-subtle transition-colors text-left"
              >
                <div className="p-2 rounded-full bg-surface-subtle">
                  <Users className="w-5 h-5 text-text-primary" />
                </div>
                <span className="font-medium text-text-primary">{t('shareToGroup')}</span>
              </button>
            </div>
          )}

          {step === 'conversations' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStep('main')}
                className="text-sm text-text-brand hover:underline"
              >
                ← Back
              </button>
              <p className="text-sm text-text-secondary mb-2">{t('shareInMessage')}</p>
              {conversations.length === 0 ? (
                <p className="text-text-tertiary text-sm py-4">{t('noConversations')}</p>
              ) : (
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleShareToConversation(c.id)}
                        disabled={sendMessageLoading}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-subtle text-left"
                      >
                        <span className="font-medium text-text-primary truncate">
                          {c.type === 'GROUP' ? `Group (${c.participantCount})` : `Conversation`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 'groups' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStep('main')}
                className="text-sm text-text-brand hover:underline"
              >
                ← Back
              </button>
              <p className="text-sm text-text-secondary mb-2">{t('shareToGroup')}</p>
              {groups.length === 0 ? (
                <p className="text-text-tertiary text-sm py-4">{t('noGroups')}</p>
              ) : (
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => handleShareToGroup(g.id)}
                        disabled={sendMessageLoading}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-subtle text-left"
                      >
                        <span className="font-medium text-text-primary truncate">{g.name}</span>
                        {g.memberCount != null && (
                          <span className="text-sm text-text-tertiary">{g.memberCount} members</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-surface-subtle text-text-primary rounded-lg hover:bg-surface-tertiary transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
