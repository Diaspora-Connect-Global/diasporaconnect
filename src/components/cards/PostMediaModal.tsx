'use client';

import { X, ChevronLeft, ChevronRight, Bookmark, Loader2, Globe, Users, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import {
    GET_POST_COMMENTS,
    LIKE_COMMENT,
    REMOVE_COMMENT_LIKE,
    DELETE_COMMENT,
    EDIT_COMMENT,
    DELETE_POST,
    EDIT_POST,
    GetPostCommentsData,
    LikeCommentData,
    RemoveCommentLikeData,
    EditCommentData,
    DeleteCommentData,
} from '@/services/gql/postsFeed';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { toast } from 'sonner';
import { SEARCH_USERS } from '@/services/gql/connection';
import type { SearchUsersResponse } from '@/services/gql/types/connection';
import type { Comment as ApiComment } from '@/services/gql/types/postsFeed';
import { UserBadge, type Tier } from '@/components/custom/userBadge';
import { formatCount } from '@/macros/formatCount';
import { formatDateProximity } from '@/macros/time';
import { renderRichText, type MentionMap } from '@/components/custom/richTextRenderer';
import { resolveUserTier } from '@/lib/userTier';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from '@/i18n/navigation';
import MessageInputGlobal, { type MentionUser } from '@/components/custom/messageInputGlobal';
import SharePostModal from '@/components/share/SharePostModal';

/* ------------------------------------------------------------------ */
export type ModalMediaItem = { type: 'image' | 'video'; src: string };

export interface PostMediaModalProps {
    postId: string;
    profileImage: string;
    profileName: string;
    profileTier?: Tier;
    authorUserId?: string;
    category: string;
    postDate: string;
    createdAt?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';
    content: string;
    mentionMap?: MentionMap;
    allMedia: ModalMediaItem[];
    initialMediaIndex: number;
    isLiked: boolean;
    isSaved: boolean;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    onLike: (liked: boolean) => void;
    onSave: () => void;
    onShare: () => void;
    onSendComment: (text: string, parentId?: string) => void;
    onClose: () => void;
    onNavigatePost: (dir: 'next' | 'prev') => void;
    onDelete?: (postId: string) => void;
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
    authorUserId,
    category,
    postDate,
    createdAt,
    visibility,
    content,
    mentionMap,
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
    onDelete,
}: PostMediaModalProps) {
    const t = useTranslations('actions');
    const router = useRouter();
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

    /* sync when navigating to a different post */
    useEffect(() => {
        setMediaIndex(initialMediaIndex);
        setIsLiked(initialIsLiked);
        setIsSaved(initialIsSaved);
        setLikeCount(initialLikeCount);
        setCommentCount(initialCommentCount);
        setReplyToId(null);
        setShowCommentSheet(false);
        setContentExpanded(false);
        setIsEditingPost(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId, initialMediaIndex]);

    /* comments */
    const [loadedComments, setLoadedComments] = useState<Comment[]>([]);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    const [fetchComments, { loading: commentsLoading, data: commentsData }] =
        useLazyQuery<GetPostCommentsData>(GET_POST_COMMENTS, { fetchPolicy: 'cache-and-network' });

    const [likeCommentMutation] = useMutation<LikeCommentData>(LIKE_COMMENT);
    const [removeCommentLikeMutation] = useMutation<RemoveCommentLikeData>(REMOVE_COMMENT_LIKE);
    const [deleteCommentMutation, { loading: deleteCommentLoading }] = useMutation<DeleteCommentData>(DELETE_COMMENT);
    const [editCommentMutation, { loading: editCommentLoading }] = useMutation<EditCommentData>(EDIT_COMMENT);
    const [deletePostMutation, { loading: deletePostLoading }] = useMutation(DELETE_POST);

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
    const [deletePostModalOpen, setDeletePostModalOpen] = useState(false);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostText, setEditPostText] = useState('');
    const [editPostMutation, { loading: editPostLoading }] = useMutation(EDIT_POST);
    const currentUserId = useUserStore((s) => s.user?.userId);

    const goToProfile = useCallback(() => {
        if (!authorUserId) return;
        if (currentUserId && authorUserId === currentUserId) {
            router.push('/profile');
        } else {
            router.push(`/${authorUserId}`);
        }
    }, [router, authorUserId, currentUserId]);

    const isOwnPost = !!currentUserId && !!authorUserId && currentUserId === authorUserId;
    const canEditPost = isOwnPost && !!createdAt && (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
    const isOwnComment = (c: Comment) => !!currentUserId && c.authorId === currentUserId;
    const canEditComment = (c: Comment) =>
        isOwnComment(c) && (Date.now() - new Date(c.createdAt).getTime()) < 24 * 60 * 60 * 1000;

    const handleEditPostConfirm = async () => {
        const newText = editPostText.trim();
        if (!newText) return;
        try {
            await editPostMutation({ variables: { input: { id: postId, text: newText } } });
            setIsEditingPost(false);
            toast.success('Post updated');
        } catch {
            toast.error('Failed to update post');
        }
    };

    const handleDeletePostConfirm = async () => {
        try {
            await deletePostMutation({ variables: { id: postId } });
            setDeletePostModalOpen(false);
            toast.success('Post deleted');
            onDelete?.(postId);
            onNavigatePost('next');
        } catch {
            toast.error('Failed to delete post');
        }
    };

    const handleDeleteCommentConfirm = async () => {
        const commentId = deleteCommentId!;
        const snapshot = [...loadedComments];
        setLoadedComments(prev => prev.filter(c => c.id !== commentId));
        setCommentCount(n => Math.max(0, n - 1));
        setDeleteCommentId(null);
        try {
            await deleteCommentMutation({ variables: { input: { commentId } } });
            toast.success('Comment deleted');
        } catch {
            setLoadedComments(snapshot);
            setCommentCount(n => n + 1);
            toast.error('Failed to delete comment');
        }
    };

    const handleEditCommentSubmit = async (commentId: string) => {
        const newText = editingText.trim();
        if (!newText) return;
        const previous = loadedComments.find(c => c.id === commentId);
        setLoadedComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newText } : c));
        setEditingCommentId(null);
        try {
            await editCommentMutation({ variables: { input: { commentId, text: newText } } });
            toast.success('Comment updated');
        } catch {
            if (previous) setLoadedComments(prev => prev.map(c => c.id === commentId ? { ...c, content: previous.content } : c));
            setEditingCommentId(commentId);
            toast.error('Failed to update comment');
        }
    };

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
                        mapped.hasLiked = existing.hasLiked;
                        mapped.likes = existing.likes;
                        if (existing.content !== mapped.content) mapped.content = existing.content;
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
        const wasLiked = comment.hasLiked ?? false;
        const newLiked = !wasLiked;
        // Optimistic update — instant color change
        setLoadedComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, hasLiked: newLiked, likes: c.likes + (newLiked ? 1 : -1) } : c
        ));
        try {
            if (wasLiked) {
                const { data } = await removeCommentLikeMutation({ variables: { input: { commentId } } });
                if (data?.removeCommentLike?.success) {
                    setLoadedComments(prev => prev.map(c =>
                        c.id === commentId ? { ...c, hasLiked: false, likes: data.removeCommentLike.likeCount } : c
                    ));
                } else {
                    throw new Error('unlike failed');
                }
            } else {
                const { data } = await likeCommentMutation({ variables: { input: { commentId } } });
                if (data?.likeComment?.success) {
                    setLoadedComments(prev => prev.map(c =>
                        c.id === commentId ? { ...c, hasLiked: true, likes: data.likeComment.likeCount } : c
                    ));
                } else {
                    throw new Error('like failed');
                }
            }
        } catch {
            // Revert optimistic update on failure or missing response
            setLoadedComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, hasLiked: wasLiked, likes: c.likes + (wasLiked ? 1 : -1) } : c
            ));
        }
    }, [loadedComments, likeCommentMutation, removeCommentLikeMutation]);

    /* post-to-post slide transition */
    type SlideState = 'center' | 'exit-up' | 'exit-down' | 'enter-from-below' | 'enter-from-above';
    const [slideState, setSlideState] = useState<SlideState>('center');
    const isAnimatingRef = useRef(false);
    const pendingDirRef = useRef<'next' | 'prev' | null>(null);

    const getSlideStyle = (): React.CSSProperties => {
        switch (slideState) {
            case 'exit-up':
                return { transform: 'translateY(-100%)', transition: 'transform 300ms cubic-bezier(0.55,0,1,0.45)' };
            case 'exit-down':
                return { transform: 'translateY(100%)', transition: 'transform 300ms cubic-bezier(0.55,0,1,0.45)' };
            case 'enter-from-below':
                return { transform: 'translateY(100%)', transition: 'none' };
            case 'enter-from-above':
                return { transform: 'translateY(-100%)', transition: 'none' };
            default:
                return { transform: 'translateY(0)', transition: 'transform 350ms cubic-bezier(0.25,0.46,0.45,0.94)' };
        }
    };

    const navigateWithTransition = useCallback((dir: 'next' | 'prev') => {
        if (isAnimatingRef.current) return;
        isAnimatingRef.current = true;
        pendingDirRef.current = dir;
        setSlideState(dir === 'next' ? 'exit-up' : 'exit-down');
        setTimeout(() => { onNavigatePost(dir); }, 300);
    }, [onNavigatePost]);

    // Enter animation when postId changes (after parent updates state)
    useEffect(() => {
        const dir = pendingDirRef.current;
        if (!dir) return;
        setSlideState(dir === 'next' ? 'enter-from-below' : 'enter-from-above');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setSlideState('center');
                setTimeout(() => {
                    isAnimatingRef.current = false;
                    pendingDirRef.current = null;
                }, 350);
            });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId]);

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
            if (dy < 0) navigateWithTransition('next'); else navigateWithTransition('prev');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (wheelCooldown.current) return;
        wheelCooldown.current = true;
        setTimeout(() => { wheelCooldown.current = false; }, 600);
        if (e.deltaY > 0) navigateWithTransition('next');
        else navigateWithTransition('prev');
    };

    /* action handlers */
    const handleLike = () => {
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount(c => newLikedState ? c + 1 : c - 1);
        onLike(newLikedState);
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
                className={`w-10 h-10 rounded-full object-cover border border-border-subtle flex-shrink-0 ${authorUserId ? 'cursor-pointer' : ''}`}
                onClick={authorUserId ? goToProfile : undefined} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span
                        className={`font-semibold text-text-primary text-sm truncate ${authorUserId ? 'cursor-pointer hover:text-text-brand' : ''}`}
                        onClick={authorUserId ? goToProfile : undefined}
                    >{profileName}</span>
                    {profileTier && <UserBadge tier={profileTier} size="xs" />}
                </div>
                <p className="text-text-secondary text-xs flex items-center gap-1">
                    {category} · {postDate}
                    {visibility === 'CONNECTIONS' ? <Users className="w-3.5 h-3.5 flex-shrink-0" /> : visibility === 'PRIVATE' ? <Lock className="w-3.5 h-3.5 flex-shrink-0" /> : <Globe className="w-3.5 h-3.5 flex-shrink-0" />}
                </p>
            </div>
            {isOwnPost && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-full hover:bg-surface-alt text-text-secondary flex-shrink-0">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {canEditPost && (
                            <DropdownMenuItem onSelect={() => { setEditPostText(content); setIsEditingPost(true); }}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                        )}
                        {canEditPost && <DropdownMenuSeparator />}
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeletePostModalOpen(true)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );

    const isTruncated = content.length > CONTENT_LIMIT && !contentExpanded;
    const contentEl = isEditingPost ? (
        <div>
            <textarea
                className="w-full border border-border-subtle rounded-lg p-2 body-small text-text-primary bg-surface-default resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                rows={5}
                value={editPostText}
                onChange={e => setEditPostText(e.target.value)}
                autoFocus
            />
            <div className="flex gap-2 justify-end mt-1">
                <button className="px-2 py-1 label-medium text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt text-xs"
                    onClick={() => setIsEditingPost(false)}>Cancel</button>
                <button className="px-2 py-1 label-medium text-white bg-brand rounded-md hover:bg-brand-dark text-xs disabled:opacity-50"
                    onClick={handleEditPostConfirm}
                    disabled={editPostLoading || !editPostText.trim()}>
                    {editPostLoading ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    ) : (
        <p className="body-small text-text-primary whitespace-pre-wrap break-words">
            {renderRichText(isTruncated ? `${content.slice(0, CONTENT_LIMIT)}…` : content, mentionMap)}
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
            {topLevel.map(c => {
                const cOwn = isOwnComment(c);
                const cEditable = cOwn && canEditComment(c);
                return (
                <div key={c.id}>
                    <div className="flex gap-3">
                        <img src={c.authorImage || '/PROFILE.png'} alt={c.author} width={32} height={32}
                            loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-text-primary text-sm truncate">{c.author}</span>
                                {c.authorTier && <UserBadge tier={c.authorTier} size="xs" />}
                                <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(c.createdAt)}</span>
                                {cOwn && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="ml-auto p-1 rounded-full hover:bg-surface-alt text-text-secondary">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                            {cEditable && (
                                                <DropdownMenuItem onSelect={() => { setEditingCommentId(c.id); setEditingText(c.content); }}>
                                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                                </DropdownMenuItem>
                                            )}
                                            {cEditable && <DropdownMenuSeparator />}
                                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteCommentId(c.id)}>
                                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                            {editingCommentId === c.id ? (
                                <div className="mb-2">
                                    <textarea
                                        className="w-full border border-border-subtle rounded-lg p-2 body-small text-text-primary bg-surface-default resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                                        rows={3}
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end mt-1">
                                        <button className="px-2 py-1 label-medium text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt text-xs"
                                            onClick={() => setEditingCommentId(null)}>Cancel</button>
                                        <button className="px-2 py-1 label-medium text-white bg-brand rounded-md hover:bg-brand-dark text-xs disabled:opacity-50"
                                            onClick={() => handleEditCommentSubmit(c.id)}
                                            disabled={editCommentLoading || !editingText.trim()}>
                                            {editCommentLoading ? 'Saving…' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="body-small text-text-primary break-words mb-2 whitespace-pre-wrap">{renderRichText(c.content, c.mentionMap)}</p>
                            )}
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
                            {repliesByParent.get(c.id)!.map(reply => {
                                const rOwn = isOwnComment(reply);
                                const rEditable = rOwn && canEditComment(reply);
                                return (
                                <div key={reply.id} className="flex gap-3">
                                    <img src={reply.authorImage || '/PROFILE.png'} alt={reply.author} width={28} height={28}
                                        loading="lazy" decoding="async" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-semibold text-text-primary text-sm truncate">{reply.author}</span>
                                            {reply.authorTier && <UserBadge tier={reply.authorTier} size="xs" />}
                                            <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(reply.createdAt)}</span>
                                            {rOwn && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="ml-auto p-1 rounded-full hover:bg-surface-alt text-text-secondary">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32">
                                                        {rEditable && (
                                                            <DropdownMenuItem onSelect={() => { setEditingCommentId(reply.id); setEditingText(reply.content); }}>
                                                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {rEditable && <DropdownMenuSeparator />}
                                                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteCommentId(reply.id)}>
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        {editingCommentId === reply.id ? (
                                            <div className="mb-2">
                                                <textarea
                                                    className="w-full border border-border-subtle rounded-lg p-2 body-small text-text-primary bg-surface-default resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                                                    rows={2}
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2 justify-end mt-1">
                                                    <button className="px-2 py-1 label-medium text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt text-xs"
                                                        onClick={() => setEditingCommentId(null)}>Cancel</button>
                                                    <button className="px-2 py-1 label-medium text-white bg-brand rounded-md hover:bg-brand-dark text-xs disabled:opacity-50"
                                                        onClick={() => handleEditCommentSubmit(reply.id)}
                                                        disabled={editCommentLoading || !editingText.trim()}>
                                                        {editCommentLoading ? 'Saving…' : 'Save'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="body-small text-text-primary break-words whitespace-pre-wrap">{renderRichText(reply.content, reply.mentionMap)}</p>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                );
            })}
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
            <div className="fixed inset-0 z-50 flex overflow-hidden bg-black animate-in fade-in duration-200" onClick={onClose}>
                <div className="w-full h-full" style={getSlideStyle()}>

                {/* DESKTOP */}
                <div className="hidden md:flex w-full h-full" onClick={e => e.stopPropagation()}>
                    {/* Left: media */}
                    <div className="relative flex-1 flex items-center justify-center bg-neutral-900 dark:bg-black min-w-0"
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
                    <div className="relative flex-1 flex items-center justify-center bg-neutral-900 dark:bg-black min-h-0"
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
                </div>{/* end slide wrapper */}
            </div>

            <SharePostModal open={showShareModal} onClose={() => setShowShareModal(false)} postId={postId} onShared={onShare} />

            <ConfirmationModal
                open={!!deleteCommentId}
                onCancel={() => setDeleteCommentId(null)}
                onConfirm={handleDeleteCommentConfirm}
                title="Delete comment?"
                description="This will permanently delete the comment. This action cannot be undone."
                confirmText="Delete"
                confirmVariant="destructive"
                isLoading={deleteCommentLoading}
            />

            <ConfirmationModal
                open={deletePostModalOpen}
                onCancel={() => setDeletePostModalOpen(false)}
                onConfirm={handleDeletePostConfirm}
                title="Delete post?"
                description="This will permanently delete the post. This action cannot be undone."
                confirmText="Delete"
                confirmVariant="destructive"
                isLoading={deletePostLoading}
            />
        </>
    );
}
