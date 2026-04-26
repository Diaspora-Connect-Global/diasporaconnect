'use client';

import { X, ChevronLeft, ChevronRight, Bookmark, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import {
    GET_POST_COMMENTS,
    LIKE_COMMENT,
    REMOVE_COMMENT_LIKE,
    GetPostCommentsData,
    LikeCommentData,
    RemoveCommentLikeData,
} from '@/services/gql/postsFeed';
import { SEARCH_USERS } from '@/services/gql/connection';
import type { SearchUsersResponse } from '@/services/gql/types/connection';
import type { Comment as ApiComment } from '@/services/gql/types/postsFeed';
import { UserBadge, type Tier } from '@/components/custom/userBadge';
import { formatCount } from '@/macros/formatCount';
import { formatDateProximity } from '@/macros/time';
import { renderRichText, type MentionMap } from '@/components/custom/richTextRenderer';
import { resolveUserTier } from '@/lib/userTier';
import { useUserStore } from '@/store/useUserStore';
import MessageInputGlobal, { type MentionUser } from '@/components/custom/messageInputGlobal';
import SharePostModal from '@/components/share/SharePostModal';

/* ------------------------------------------------------------------ */
export type ModalMediaItem = { type: 'image' | 'video'; src: string };

export interface PostMediaModalProps {
    postId: string;
    profileImage: string;
    profileName: string;
    profileTier?: Tier;
    category: string;
    postDate: string;
    content: string;
    allMedia: ModalMediaItem[];
    initialMediaIndex: number;
    isLiked: boolean;
    isSaved: boolean;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onSendComment: (text: string, parentId?: string) => void;
    onClose: () => void;
    onNavigatePost: (dir: 'next' | 'prev') => void;
}

/* ------------------------------------------------------------------ */
interface Comment {
    id: string;
    author: string;
    authorImage: string;
    authorHandle?: string;
    authorId?: string;
    authorType?: string;
    content: string;
    createdAt: string;
    likes: number;
    hasLiked?: boolean;
    replies?: number;
    parentId?: string | null;
    mentionMap?: MentionMap;
    authorTier?: Tier;
}

function mapApiComment(c: ApiComment): Comment {
    const mentionMap: MentionMap = {};
    c.mentions?.forEach(m => { mentionMap[m.handle] = m.entityId; });
    const selfMention = c.mentions?.find(m => m.entityId === c.authorId);
    return {
        id: c.id,
        author: c.authorDisplayName ?? selfMention?.displayName ?? selfMention?.handle ?? c.authorId,
        authorImage: c.authorAvatarUrl ?? selfMention?.avatarUrl ?? '/PROFILE.png',
        authorHandle: c.authorHandle ?? selfMention?.handle,
        authorId: c.authorId,
        authorType: c.authorType,
        content: c.text,
        createdAt: c.createdAt,
        likes: c.likeCount ?? 0,
        hasLiked: c.hasLiked ?? false,
        replies: c.replyCount,
        parentId: c.parentId ?? undefined,
        mentionMap: Object.keys(mentionMap).length > 0 ? mentionMap : undefined,
        authorTier: resolveUserTier({
            tier: (c as { authorTier?: string }).authorTier,
            verificationTier: (c as { authorVerificationTier?: string }).authorVerificationTier,
            trustScore: (c as { authorTrustScore?: number }).authorTrustScore,
        }),
    };
}

/* ------------------------------------------------------------------ */
export default function PostMediaModal({
    postId,
    profileImage,
    profileName,
    profileTier,
    category,
    postDate,
    content,
    allMedia,
    initialMediaIndex,
    isLiked: initialIsLiked,
    isSaved: initialIsSaved,
    likeCount: initialLikeCount,
    commentCount: initialCommentCount,
    shareCount: initialShareCount,
    onLike,
    onSave,
    onShare,
    onSendComment,
    onClose,
    onNavigatePost,
}: PostMediaModalProps) {
    const t = useTranslations('actions');
    const currentUserAvatar = useUserStore(s => s.user?.avatarUrl) || '/PROFILE.png';

    const [mediaIndex, setMediaIndex] = useState(initialMediaIndex);
    const [showCommentSheet, setShowCommentSheet] = useState(false);
    const [commentFocusTrigger, setCommentFocusTrigger] = useState(0);
    const [replyToId, setReplyToId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [contentExpanded, setContentExpanded] = useState(false);
    const CONTENT_LIMIT = 180;

    /* optimistic action state */
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [commentCount, setCommentCount] = useState(initialCommentCount);
    const [shareCount] = useState(initialShareCount);

    /* sync when post changes (page-level navigation) */
    useEffect(() => {
        setMediaIndex(initialMediaIndex);
        setIsLiked(initialIsLiked);
        setIsSaved(initialIsSaved);
        setLikeCount(initialLikeCount);
        setCommentCount(initialCommentCount);
        setReplyToId(null);
        setShowCommentSheet(false);
        setContentExpanded(false);
    }, [postId, initialMediaIndex, initialIsLiked, initialIsSaved, initialLikeCount, initialCommentCount]);

    /* comments */
    const [loadedComments, setLoadedComments] = useState<Comment[]>([]);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    const [fetchComments, { loading: commentsLoading, data: commentsData }] =
        useLazyQuery<GetPostCommentsData>(GET_POST_COMMENTS, { fetchPolicy: 'cache-and-network' });

    const [likeCommentMutation] = useMutation<LikeCommentData>(LIKE_COMMENT);
    const [removeCommentLikeMutation] = useMutation<RemoveCommentLikeData>(REMOVE_COMMENT_LIKE);

    const [searchUsers] = useLazyQuery<SearchUsersResponse>(SEARCH_USERS, { fetchPolicy: 'network-only' });
    const fetchMentions = useCallback(async (query: string): Promise<MentionUser[]> => {
        if (!query) return [];
        const { data } = await searchUsers({ variables: { searchUsersInput: { query, limit: 6 } } });
        return (data?.searchUsers.profiles ?? []).map(p => ({
            id: p.userId,
            name: `${p.firstName} ${p.lastName}`.trim(),
            avatarUrl: p.avatarUrl,
        }));
    }, [searchUsers]);

    useEffect(() => {
        setLoadedComments([]);
        setCommentsLoaded(false);
        if (postId) fetchComments({ variables: { postId, limit: 20, offset: 0 } });
    }, [postId, fetchComments]);

    useEffect(() => {
        if (commentsData?.postComments) {
            setLoadedComments(prev => {
                const prevMap = new Map(prev.map(c => [c.id, c]));
                return commentsData.postComments.map(c => {
                    const mapped = mapApiComment(c);
                    const existing = prevMap.get(mapped.id);
                    if (existing) {
                        // Preserve local interaction state — cache may be stale
                        mapped.hasLiked = existing.hasLiked;
                        mapped.likes = existing.likes;
                    }
                    return mapped;
                });
            });
            setCommentsLoaded(true);
        }
    }, [commentsData]);

    const handleLikeComment = useCallback(async (commentId: string) => {
        const comment = loadedComments.find(c => c.id === commentId);
        if (!comment) return;
        try {
            if (comment.hasLiked) {
                const { data } = await removeCommentLikeMutation({ variables: { input: { commentId } } });
                if (data?.removeCommentLike != null) {
                    setLoadedComments(prev => prev.map(c =>
                        c.id === commentId ? { ...c, hasLiked: false, likes: data.removeCommentLike.likeCount } : c
                    ));
                }
            } else {
                const { data } = await likeCommentMutation({ variables: { input: { commentId } } });
                if (data?.likeComment != null) {
                    setLoadedComments(prev => prev.map(c =>
                        c.id === commentId ? { ...c, hasLiked: true, likes: data.likeComment.likeCount } : c
                    ));
                }
            }
        } catch { /* leave unchanged */ }
    }, [loadedComments, likeCommentMutation, removeCommentLikeMutation]);

    /* swipe + wheel */
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const wheelCooldown = useRef(false);

    const nextMedia = () => setMediaIndex(p => (p + 1) % allMedia.length);
    const prevMedia = () => setMediaIndex(p => (p - 1 + allMedia.length) % allMedia.length);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]!.clientX;
        touchStartY.current = e.touches[0]!.clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0]!.clientX - touchStartX.current;
        const dy = e.changedTouches[0]!.clientY - touchStartY.current;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            if (dx < 0) nextMedia(); else prevMedia();
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
            if (dy < 0) onNavigatePost('next'); else onNavigatePost('prev');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (wheelCooldown.current) return;
        wheelCooldown.current = true;
        setTimeout(() => { wheelCooldown.current = false; }, 600);
        if (e.deltaY > 0) onNavigatePost('next');
        else onNavigatePost('prev');
    };

    /* action handlers */
    const handleLike = () => {
        setIsLiked(v => !v);
        setLikeCount(c => isLiked ? c - 1 : c + 1);
        onLike();
    };

    const handleSave = () => {
        setIsSaved(v => !v);
        onSave();
    };

    const currentUserFirstName = useUserStore(s => s.user?.firstName);
    const currentUserLastName = useUserStore(s => s.user?.lastName);

    const handleSend = async (text: string, parentId?: string, mentionMap?: MentionMap) => {
        if (!text.trim()) return;
        let prepared = text.trim();
        if (parentId) {
            const parent = loadedComments.find(c => c.id === parentId);
            if (parent) prepared = `@${parent.authorHandle ?? parent.author} ${prepared}`;
        }
        setCommentCount(c => c + 1);
        setReplyToId(null);
        // Optimistically add comment so mentions are clickable immediately
        const optimistic: Comment = {
            id: `optimistic-${Date.now()}`,
            author: `${currentUserFirstName ?? ''} ${currentUserLastName ?? ''}`.trim() || 'You',
            authorImage: currentUserAvatar,
            content: prepared,
            createdAt: new Date().toISOString(),
            likes: 0,
            parentId: parentId ?? null,
            mentionMap,
        };
        setLoadedComments(prev => [...prev, optimistic]);
        try {
            await onSendComment(prepared, parentId);
            setTimeout(() => fetchComments({ variables: { postId, limit: 20, offset: 0 } }), 500);
        } catch {
            setCommentCount(c => c - 1);
            setLoadedComments(prev => prev.filter(c => c.id !== optimistic.id));
        }
    };

    /* ── derived comment tree ── */
    const topLevel = loadedComments.filter(c => !c.parentId);
    const repliesByParent = new Map<string, Comment[]>();
    loadedComments.forEach(c => {
        if (c.parentId) {
            const list = repliesByParent.get(c.parentId) ?? [];
            list.push(c);
            repliesByParent.set(c.parentId, list);
        }
    });

    /* ── shared sub-renders ── */
    const current = allMedia[mediaIndex]!;

    const mediaEl = current.type === 'image'
        ? <img src={current.src} alt={`Media ${mediaIndex + 1}`} className="object-contain w-full h-full" decoding="async" />
        : <video key={current.src} src={current.src} controls autoPlay playsInline className="object-contain w-full h-full max-h-full" />;

    const thumbnailStrip = allMedia.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-xl p-2 max-w-[80%] overflow-x-auto">
            {allMedia.map((m, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setMediaIndex(i); }}
                    className={`relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer transition-all duration-150 ${i === mediaIndex ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-80'}`}>
                    {m.type === 'image'
                        ? <img src={m.src} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" decoding="async" />
                        : <video src={m.src} className="w-full h-full object-cover" preload="metadata" />}
                </div>
            ))}
        </div>
    );

    const postInfoEl = (
        <div className="flex items-center gap-3 mb-3">
            <img src={profileImage} alt={profileName} width={40} height={40} loading="lazy" decoding="async"
                className="w-10 h-10 rounded-full object-cover border border-border-subtle flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary text-sm truncate">{profileName}</span>
                    {profileTier && <UserBadge tier={profileTier} size="xs" />}
                </div>
                <p className="text-text-secondary text-xs">{category} · {postDate}</p>
            </div>
        </div>
    );

    const isTruncated = content.length > CONTENT_LIMIT && !contentExpanded;
    const contentEl = (
        <p className="body-small text-text-primary whitespace-pre-wrap break-words">
            {isTruncated ? `${content.slice(0, CONTENT_LIMIT)}…` : content}
            {content.length > CONTENT_LIMIT && (
                <button
                    onClick={() => setContentExpanded(v => !v)}
                    className="ml-1 text-text-brand text-xs font-medium hover:underline cursor-pointer"
                >
                    {contentExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </p>
    );

    const actionBar = (onComment: () => void) => (
        <div className="flex items-center gap-4">
            <button onClick={handleLike} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                <GoHeartFill className={`w-5 h-5 ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`} />
                <span>{formatCount(likeCount)}</span>
            </button>
            <button onClick={onComment} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                <img width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-5 h-5 object-contain" />
                <span>{formatCount(commentCount)}</span>
            </button>
            <button onClick={() => setShowShareModal(true)} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                <img width={20} height={20} src="/SHARE.svg" alt="share" className="w-5 h-5 object-contain" />
                <span>{formatCount(shareCount)}</span>
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-2 text-sm ml-auto">
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-text-brand' : 'text-text-secondary'}`} />
            </button>
        </div>
    );

    const commentListEl = commentsLoading && !commentsLoaded ? (
        <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-brand" />
        </div>
    ) : topLevel.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-8">{t('noComments')}</p>
    ) : (
        <div className="space-y-4">
            {topLevel.map(c => (
                <div key={c.id}>
                    <div className="flex gap-3">
                        <img src={c.authorImage || '/PROFILE.png'} alt={c.author} width={32} height={32}
                            loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-text-primary text-sm truncate">{c.author}</span>
                                {c.authorTier && <UserBadge tier={c.authorTier} size="xs" />}
                                <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(c.createdAt)}</span>
                            </div>
                            <p className="body-small text-text-primary break-words mb-2 whitespace-pre-wrap">{renderRichText(c.content, c.mentionMap)}</p>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => handleLikeComment(c.id)}
                                    className={`text-xs font-semibold transition-colors ${c.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}>
                                    {t('like')}
                                </button>
                                <button onClick={() => setReplyToId(cur => cur === c.id ? null : c.id)}
                                    className="text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors">
                                    {t('reply')}
                                </button>
                                <span className="text-text-tertiary text-xs">{formatCount(c.likes)} {t('likes')}</span>
                            </div>
                        </div>
                    </div>
                    {replyToId === c.id && (
                        <div className="mt-3 ml-11 flex items-center gap-2">
                            <img src={currentUserAvatar} alt="You" width={32} height={32}
                                loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            <div className="flex-1">
                                <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, c.id, mm)}
                                    placeholder={t('replyPlaceholder')} reversed reversedText={t('reply')} onMentionSearch={fetchMentions} />
                            </div>
                        </div>
                    )}
                    {(repliesByParent.get(c.id)?.length ?? 0) > 0 && (
                        <div className="ml-11 mt-3 space-y-3">
                            {repliesByParent.get(c.id)!.map(reply => (
                                <div key={reply.id} className="flex gap-3">
                                    <img src={reply.authorImage || '/PROFILE.png'} alt={reply.author} width={28} height={28}
                                        loading="lazy" decoding="async" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-semibold text-text-primary text-sm truncate">{reply.author}</span>
                                            {reply.authorTier && <UserBadge tier={reply.authorTier} size="xs" />}
                                            <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(reply.createdAt)}</span>
                                        </div>
                                        <p className="body-small text-text-primary break-words whitespace-pre-wrap">{renderRichText(reply.content, reply.mentionMap)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const commentInputEl = (
        <div className="flex items-center gap-2">
            <img src={currentUserAvatar} alt="You" width={36} height={36}
                loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1">
                <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, undefined, mm)}
                    placeholder={t('addComment')} reversed reversedText={t('comment')} onMentionSearch={fetchMentions}
                    focusTrigger={commentFocusTrigger} />
            </div>
        </div>
    );

    /* ── render ── */
    return (
        <>
            <div className="fixed inset-0 z-50 flex bg-black animate-in fade-in duration-200" onClick={onClose}>

                {/* DESKTOP */}
                <div className="hidden md:flex w-full h-full" onClick={e => e.stopPropagation()}>
                    {/* Left: media */}
                    <div className="relative flex-1 flex items-center justify-center bg-black min-w-0"
                        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
                        <button onClick={onClose}
                            className="absolute top-4 left-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors cursor-pointer">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        {allMedia.length > 1 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 rounded-full px-3 py-1">
                                <span className="text-white text-sm font-medium">{mediaIndex + 1} / {allMedia.length}</span>
                            </div>
                        )}
                        {allMedia.length > 1 && (
                            <>
                                <button onClick={e => { e.stopPropagation(); prevMedia(); }}
                                    className="absolute left-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors cursor-pointer">
                                    <ChevronLeft className="w-6 h-6 text-white" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); nextMedia(); }}
                                    className="absolute right-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors cursor-pointer">
                                    <ChevronRight className="w-6 h-6 text-white" />
                                </button>
                            </>
                        )}
                        <div className="w-full h-full flex items-center justify-center p-4">{mediaEl}</div>
                        {thumbnailStrip}
                    </div>
                    {/* Right: sidebar */}
                    <div className="w-[360px] xl:w-[400px] flex-shrink-0 bg-surface-default flex flex-col h-full border-l border-border-subtle">
                        <div className="p-4 border-b border-border-subtle">
                            {postInfoEl}
                            {contentEl}
                        </div>
                        <div className="px-4 py-3 border-b border-border-subtle">
                            {actionBar(() => setCommentFocusTrigger(n => n + 1))}
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3">{commentListEl}</div>
                        <div className="p-4 border-t border-border-subtle">{commentInputEl}</div>
                    </div>
                </div>

                {/* MOBILE */}
                <div className="flex md:hidden flex-col w-full h-full" onClick={e => e.stopPropagation()}>
                    <div className="relative flex-1 flex items-center justify-center bg-black min-h-0"
                        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
                        <button onClick={onClose}
                            className="absolute top-4 left-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors cursor-pointer">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        {allMedia.length > 1 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 rounded-full px-3 py-1">
                                <span className="text-white text-sm font-medium">{mediaIndex + 1} / {allMedia.length}</span>
                            </div>
                        )}
                        {allMedia.length > 1 && (
                            <>
                                <button onClick={e => { e.stopPropagation(); prevMedia(); }}
                                    className="absolute left-3 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 cursor-pointer">
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); nextMedia(); }}
                                    className="absolute right-3 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 cursor-pointer">
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </button>
                            </>
                        )}
                        <div className="w-full h-full flex items-center justify-center">{mediaEl}</div>
                    </div>
                    <div className="bg-surface-default px-4 pt-3 pb-2 border-t border-border-subtle">
                        {postInfoEl}
                        <div className="mb-3">{contentEl}</div>
                        {actionBar(() => { setShowCommentSheet(true); setTimeout(() => setCommentFocusTrigger(n => n + 1), 320); })}
                    </div>
                    {/* Comment sheet */}
                    <div
                        className={`fixed inset-x-0 bottom-0 z-[60] bg-surface-default rounded-t-2xl shadow-2xl transition-transform duration-300 ${showCommentSheet ? 'translate-y-0' : 'translate-y-full'}`}
                        style={{ maxHeight: '75vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                            <span className="font-semibold text-text-primary text-sm">{t('comment')}s</span>
                            <button onClick={() => setShowCommentSheet(false)} className="p-1 hover:bg-surface-subtle rounded-full cursor-pointer">
                                <X className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(75vh - 8rem)' }}>
                            {commentListEl}
                        </div>
                        <div className="p-4 border-t border-border-subtle">{commentInputEl}</div>
                    </div>
                    {showCommentSheet && (
                        <div className="fixed inset-0 z-[59] bg-black/40" onClick={() => setShowCommentSheet(false)} />
                    )}
                </div>
            </div>

            <SharePostModal open={showShareModal} onClose={() => setShowShareModal(false)} postId={postId} onShared={onShare} />
        </>
    );
}
