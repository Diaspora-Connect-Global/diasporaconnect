'use client';

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Copy, Loader2, Check, Share2, Search } from 'lucide-react';
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
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';

const DEFAULT_AVATAR = '/PROFILE.png';

function toRelativeShareLink(link: string): string {
  if (!link) return link;
  if (link.startsWith('http://') || link.startsWith('https://')) {
    try {
      const u = new URL(link);
      return `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return link;
    }
  }
  return link.startsWith('/') ? link : `/${link}`;
}

function getBaseUrl(): string {
  const canonical = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (canonical) return canonical.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function withBaseUrl(link: string): string {
  if (!link) return link;
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  const base = getBaseUrl();
  if (!base) return link;
  const path = link.startsWith('/') ? link : `/${link}`;
  return `${base.replace(/\/$/, '')}${path}`;
}

const PLATFORMS = [
  {
    name: 'WhatsApp',
    bg: 'bg-[#25D366]',
    getUrl: (url: string) => `https://wa.me/?text=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name: 'X',
    bg: 'bg-black',
    getUrl: (url: string) => `https://x.com/intent/post?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    bg: 'bg-[#1877F2]',
    getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'Telegram',
    bg: 'bg-[#229ED9]',
    getUrl: (url: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

export interface SharePostModalProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  initialShareLink?: string | null;
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
  const [isCopying, setIsCopying] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);

  const isCopyingRef = useRef(false);

  const [sharePostMutation, { loading: shareLoading }] = useMutation<SharePostData>(SHARE_POST);
  const [sendMessageMutation] = useMutation<SendMessageData>(SEND_MESSAGE);
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

  const friends = useMemo(() => {
    if (!currentUserId || !connectionsData?.getConnections?.connections) return [];
    const seen = new Set<string>();
    return connectionsData.getConnections.connections
      .filter((c) => c.status?.toLowerCase() === 'accepted' || !c.status)
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

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  const hasFriendsOrGroups = friends.length > 0 || groups.length > 0;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (open) {
      if (initialShareLink) setShareLink(toRelativeShareLink(initialShareLink));
      else setShareLink('');
      setCopied(false);
      setSentTo(new Set());
      setSearchQuery('');
    }
  }, [open, initialShareLink]);

  const ensureShareLink = useCallback(async () => {
    if (shareLink) return toRelativeShareLink(shareLink);
    try {
      const { data } = await sharePostMutation({ variables: { postId } });
      const raw = data?.sharePost?.shareLink ?? '';
      const link = toRelativeShareLink(raw);
      setShareLink(link);
      onShared?.();
      return link;
    } catch {
      toast.error(t('shareLinkFailed'));
      return '';
    }
  }, [shareLink, postId, sharePostMutation, onShared, t]);

  const copyToClipboard = useCallback(async () => {
    if (isCopyingRef.current) return;
    isCopyingRef.current = true;
    setIsCopying(true);
    const link = await ensureShareLink();
    if (!link) { isCopyingRef.current = false; setIsCopying(false); return; }
    try {
      await navigator.clipboard.writeText(withBaseUrl(link));
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('shareLinkFailed'));
    } finally {
      isCopyingRef.current = false;
      setIsCopying(false);
    }
  }, [ensureShareLink, t]);

  const handleNativeShare = useCallback(async () => {
    const link = await ensureShareLink();
    if (!link) return;
    try {
      await navigator.share({ url: withBaseUrl(link), title: 'Check this out on Diaspoplug' });
    } catch {
      // user cancelled — no error needed
    }
  }, [ensureShareLink]);

  const sendToConversation = useCallback(async (conversationId: string, link: string) => {
    return await sendMessageMutation({
      variables: { conversationId, messageType: 'TEXT', content: withBaseUrl(link) },
    });
  }, [sendMessageMutation]);

  const handleShareToFriend = useCallback(async (friendUserId: string) => {
    if (sendingTo) return;
    setSendingTo(friendUserId);
    const link = await ensureShareLink();
    if (!link) { setSendingTo(null); return; }
    try {
      let conversationId: string | null = null;
      const direct = conversations.find(
        (c) => c.type === 'DIRECT' && c.participantIds?.length === 2 && c.participantIds.includes(friendUserId)
      );
      if (direct) {
        conversationId = direct.id;
      } else {
        const result = await createConversationMutation({
          variables: { type: 'DIRECT', participantIds: [friendUserId] },
        });
        const outcome = readMutationOutcome(result, d => d.createConversation);
        if (!outcome.ok) {
          toast.error(t(refusalMessageKey(outcome.message, 'feed.errors')));
          setSendingTo(null);
          return;
        }
        conversationId = result.data?.createConversation ?? null;
      }
      if (conversationId) {
        const sendResult = await sendToConversation(conversationId, link);
        const sendOutcome = readMutationOutcome(sendResult, d => d.sendMessage);
        if (!sendOutcome.ok) {
          toast.error(t(refusalMessageKey(sendOutcome.message, 'feed.errors')));
          setSendingTo(null);
          return;
        }
        setSentTo((prev) => new Set([...prev, friendUserId]));
        toast.success(t('shareLinkSent'));
      } else {
        toast.error(t('shareLinkFailed'));
      }
    } catch {
      toast.error(t('shareLinkFailed'));
    } finally {
      setSendingTo(null);
    }
  }, [sendingTo, ensureShareLink, conversations, createConversationMutation, sendToConversation, t]);

  const handleShareToGroup = useCallback(async (groupId: string) => {
    if (sendingTo) return;
    setSendingTo(groupId);
    const link = await ensureShareLink();
    if (!link) { setSendingTo(null); return; }
    const groupConversation = conversations.find((c) => c.groupId === groupId);
    if (groupConversation) {
      try {
        const sendResult = await sendToConversation(groupConversation.id, link);
        const sendOutcome = readMutationOutcome(sendResult, d => d.sendMessage);
        if (!sendOutcome.ok) {
          toast.error(t(refusalMessageKey(sendOutcome.message, 'feed.errors')));
          setSendingTo(null);
          return;
        }
        setSentTo((prev) => new Set([...prev, groupId]));
        toast.success(t('shareLinkSent'));
      } catch {
        toast.error(t('shareLinkFailed'));
      } finally {
        setSendingTo(null);
      }
    } else {
      setSendingTo(null);
      toast.error(t('noConversations'));
    }
  }, [sendingTo, ensureShareLink, conversations, sendToConversation, t]);

  const handleExternalShare = useCallback(async (getUrl: (u: string) => string) => {
    const link = await ensureShareLink();
    if (!link) return;
    window.open(getUrl(withBaseUrl(link)), '_blank', 'noopener,noreferrer');
  }, [ensureShareLink]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface-default rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[85vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">{t('sharePost')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-subtle text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Native share — mobile only */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border-subtle hover:bg-surface-subtle transition-colors text-left"
            >
              <div className="p-2 rounded-full bg-surface-subtle">
                <Share2 className="w-5 h-5 text-text-primary" />
              </div>
              <span className="font-medium text-text-primary">Share via…</span>
            </button>
          )}

          {/* External platforms */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Share to</p>
            <div className="flex gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleExternalShare(p.getUrl)}
                  className="flex flex-col items-center gap-1.5 flex-1"
                >
                  <div className={`w-12 h-12 rounded-full ${p.bg} flex items-center justify-center shadow-sm`}>
                    {p.icon}
                  </div>
                  <span className="text-xs text-text-secondary">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Send in message */}
          {hasFriendsOrGroups && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-3">{t('shareInMessage')}</p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people or groups…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Avatars row */}
              {filteredFriends.length === 0 && filteredGroups.length === 0 ? (
                <p className="text-text-tertiary text-sm py-2">No results for &ldquo;{searchQuery}&rdquo;</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {filteredFriends.map((f) => (
                    <button
                      key={f.userId}
                      type="button"
                      onClick={() => handleShareToFriend(f.userId)}
                      disabled={!!sendingTo}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-xl hover:bg-surface-subtle transition-colors min-w-[4rem] disabled:opacity-60"
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-subtle">
                        <Image src={f.avatarUrl} alt="" width={48} height={48} className="object-cover" />
                        {sendingTo === f.userId && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                        {sentTo.has(f.userId) && sendingTo !== f.userId && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/85 rounded-full">
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-text-primary text-center truncate max-w-[4.5rem]">
                        {f.name}
                      </span>
                    </button>
                  ))}
                  {filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleShareToGroup(g.id)}
                      disabled={!!sendingTo}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-xl hover:bg-surface-subtle transition-colors min-w-[4rem] disabled:opacity-60"
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-subtle">
                        <Image src={g.avatarUrl || DEFAULT_AVATAR} alt="" width={48} height={48} className="object-cover" />
                        {sendingTo === g.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                        {sentTo.has(g.id) && sendingTo !== g.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/85 rounded-full">
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-text-primary text-center truncate max-w-[4.5rem]">
                        {g.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Copy link */}
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={shareLoading || isCopying}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border-subtle hover:bg-surface-subtle transition-colors disabled:opacity-60 text-left"
          >
            <div className="p-2 rounded-full bg-surface-subtle">
              {shareLoading || isCopying ? (
                <Loader2 className="w-5 h-5 text-text-primary animate-spin" />
              ) : copied ? (
                <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              ) : (
                <Copy className="w-5 h-5 text-text-primary" />
              )}
            </div>
            <span className={`font-medium transition-colors ${copied ? 'text-green-500' : 'text-text-primary'}`}>
              {copied ? t('copied') : t('copyLink')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
