'use client';
import { Bookmark, X, ChevronLeft, ChevronRight, Loader2, Globe, Users, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal';
import { UserBadge, type Tier } from "@/components/custom/userBadge";
import { formatCount } from '@/macros/formatCount';
import { renderRichText, MentionMap, buildMentionMap, buildMentionInputsFromText, type MentionInputItem } from '@/components/custom/richTextRenderer';
import { useUserStore } from '@/store/useUserStore';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { GET_POST_COMMENTS, LIKE_COMMENT, REMOVE_COMMENT_LIKE, DELETE_POST, EDIT_POST, EDIT_COMMENT, DELETE_COMMENT, GetPostCommentsData, LikeCommentData, RemoveCommentLikeData, EditCommentData, DeleteCommentData } from '@/services/gql/postsFeed';
import { SEARCH_USERS } from '@/services/gql/connection';
import type { SearchUsersResponse } from '@/services/gql/types/connection';
import type { MentionUser } from '@/components/custom/messageInputGlobal';
import SharePostModal from '@/components/share/SharePostModal';
import type { Comment as ApiComment } from '@/services/gql/types/postsFeed';
import { formatDateProximity } from '@/macros/time';
import { resolveUserTier } from '@/lib/userTier';
import { useRouter } from '@/i18n/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/custom/VideoPlayer';

/* --------------------------------------------------------------- */
/*  Types                                                          */
/* --------------------------------------------------------------- */
interface Comment {
    id: string;
    author: string;
    authorImage: string;
    /** Handle for @mentions (e.g. jsmith); use when building reply text so backend can link mentions. */
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

interface FeedCardProps {
    postId: string;
    profileImage: string;
    profileName: string;
    authorUserId?: string;
    profileTier?: Tier;
    category: string;
    postDate: string;
    createdAt?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';
    content: string;
    mentionMap?: MentionMap;
    images?: string[];
    /** Video attachment URLs (e.g. from mimeType video/*). Loaded with preload="metadata" and viewport-aware. */
    videos?: string[];
    likes: number;
    comments: number;
    shares: number;
    commentsData?: Comment[];
    onLike?: (liked: boolean) => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: () => void;
    onSendComment?: (content: string, parentId?: string, mentions?: MentionInputItem[]) => void;
    onDelete?: (postId: string) => void;
    joinButton?: boolean;
    isLiked?: boolean;
    isSaved?: boolean;
    isShared?: boolean;
    /** From e.g. /post/[id]?commentId=… — expand comments, load list, scroll to and highlight that comment */
    initialFocusCommentId?: string;
    onNavigatePost?: (direction: 'next' | 'prev') => void;
    /** When provided the card skips its internal modal and delegates to the page-level one. */
    onOpenMedia?: (mediaIndex: number) => void;
}

/* --------------------------------------------------------------- */
/*  Component                                                       */
/* --------------------------------------------------------------- */
/** Map an API Comment to the local Comment shape. Use authorDisplayName/authorAvatarUrl from API when present. */
function mapApiComment(c: ApiComment): Comment {
    const mentionMap = buildMentionMap(c.mentions ?? []);

    const selfMention = c.mentions?.find(m => m.entityId === c.authorId);
    const authorName = c.authorDisplayName ?? selfMention?.displayName ?? selfMention?.handle ?? c.authorId;
    const authorAvatar = c.authorAvatarUrl ?? selfMention?.avatarUrl ?? '/PROFILE.png';

    return {
        id: c.id,
        author: authorName,
        authorImage: authorAvatar,
        authorHandle: c.authorHandle ?? selfMention?.handle,
        authorId: c.authorId,
        authorType: c.authorType,
        content: c.text,
        createdAt: c.createdAt,
        likes: c.likeCount ?? 0,
        hasLiked: c.hasLiked ?? false,
        replies: c.replyCount,
        parentId: c.parentId ?? undefined,
        mentionMap,
        authorTier: resolveUserTier({
            tier: (c as { authorTier?: string })?.authorTier,
            verificationTier: (c as { authorVerificationTier?: string })?.authorVerificationTier,
            trustScore: (c as { authorTrustScore?: number })?.authorTrustScore,
        }),
    };
}

export default function FeedCardWithReply({
    postId,
    profileImage,
    profileName,
    authorUserId,
    profileTier,
    category,
    postDate,
    createdAt,
    visibility,
    content,
    mentionMap,
    images,
    videos = [],
    likes,
    comments,
    shares,
    commentsData: commentsDataProp = [],
    onLike,
    onComment,
    onShare,
    onSave,
    onSendComment,
    onDelete,
    joinButton = true,
    isLiked: initialIsLiked = false,
    isSaved: initialIsSaved = false,
    isShared: initialIsShared = false,
    initialFocusCommentId,
    onNavigatePost,
    onOpenMedia,
}: FeedCardProps) {
    const router = useRouter();
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [isShared, setIsShared] = useState(initialIsShared);
    const [likeCount, setLikeCount] = useState(likes);
    const [shareCount, setShareCount] = useState(shares);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentCount, setCommentCount] = useState(comments);

    useEffect(() => { setLikeCount(likes); }, [likes]);
    useEffect(() => { setShareCount(shares); }, [shares]);
    useEffect(() => { setCommentCount(comments); }, [comments]);

    const [postContent, setPostContent] = useState(content);
    useEffect(() => { setPostContent(content); }, [content]);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostText, setEditPostText] = useState(content);
    const [deletePostModalOpen, setDeletePostModalOpen] = useState(false);
    const [deletePost, { loading: deletePostLoading }] = useMutation(DELETE_POST);
    const [editPostMutation, { loading: editPostLoading }] = useMutation(EDIT_POST);

    const handleDeletePostConfirm = async () => {
        try {
            await deletePost({ variables: { id: postId } });
            setDeletePostModalOpen(false);
            toast.success('Post deleted');
            onDelete?.(postId);
        } catch {
            toast.error('Failed to delete post');
        }
    };

    const handleEditPostSubmit = async () => {
        if (!editPostText.trim()) return;
        try {
            await editPostMutation({ variables: { input: { id: postId, text: editPostText } } });
            setPostContent(editPostText);
            setIsEditingPost(false);
            toast.success('Post updated');
        } catch {
            toast.error('Failed to update post');
        }
    };
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [loadedComments, setLoadedComments] = useState<Comment[]>(commentsDataProp);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    /* ---- lazy-load comments from API ---- */
    const [fetchComments, { loading: commentsLoading, data: commentsQueryData }] = useLazyQuery<GetPostCommentsData>(
        GET_POST_COMMENTS,
        { fetchPolicy: 'cache-and-network' }
    );

    const [likeCommentMutation] = useMutation<LikeCommentData>(LIKE_COMMENT);
    const [removeCommentLikeMutation] = useMutation<RemoveCommentLikeData>(REMOVE_COMMENT_LIKE);
    const [editCommentMutation, { loading: editCommentLoading }] = useMutation<EditCommentData>(EDIT_COMMENT);
    const [deleteCommentMutation, { loading: deleteCommentLoading }] = useMutation<DeleteCommentData>(DELETE_COMMENT);

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

    const isOwnComment = (c: Comment) => !!currentUserId && c.authorId === currentUserId;
    const canEditComment = (c: Comment) =>
        isOwnComment(c) && (Date.now() - new Date(c.createdAt).getTime()) < 24 * 60 * 60 * 1000;

    const handleEditCommentSubmit = async (commentId: string) => {
        const newText = editCommentText.trim();
        if (!newText) return;
        const previous = loadedComments.find((c) => c.id === commentId);
        setLoadedComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: newText } : c));
        setEditingCommentId(null);
        try {
            await editCommentMutation({ variables: { input: { commentId, text: newText } } });
            toast.success('Comment updated');
        } catch {
            if (previous) {
                setLoadedComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: previous.content } : c));
            }
            setEditingCommentId(commentId);
            toast.error('Failed to update comment');
        }
    };

    const handleDeleteCommentConfirm = async () => {
        const commentId = deleteCommentId!;
        const previous = loadedComments.filter((c) => c.id !== commentId);
        setLoadedComments(previous);
        setCommentCount((c) => Math.max(0, c - 1));
        setDeleteCommentId(null);
        try {
            await deleteCommentMutation({ variables: { input: { commentId } } });
            toast.success('Comment deleted');
        } catch {
            setLoadedComments((prev) => {
                const exists = prev.some((c) => c.id === commentId);
                return exists ? prev : loadedComments;
            });
            setCommentCount((c) => c + 1);
            toast.error('Failed to delete comment');
        }
    };
    const [searchUsers] = useLazyQuery<SearchUsersResponse>(SEARCH_USERS, { fetchPolicy: 'network-only' });
    const fetchMentions = useCallback(async (query: string): Promise<MentionUser[]> => {
        if (!query) return [];
        const { data } = await searchUsers({ variables: { searchUsersInput: { query, limit: 10 } } });
        return (data?.searchUsers.profiles ?? [])
            .filter(p => p.connectionStatus === 'connected')
            .map(p => ({
                id: p.userId,
                name: `${p.firstName} ${p.lastName}`.trim(),
                avatarUrl: p.avatarUrl,
            }));
    }, [searchUsers]);

    const handleMentionClick = useCallback(async (name: string) => {
        const query = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim();
        const { data } = await searchUsers({ variables: { searchUsersInput: { query, limit: 1 } } });
        const profile = data?.searchUsers?.profiles?.[0];
        if (profile?.userId) router.push(`/${profile.userId}`);
    }, [searchUsers, router]);

    const renderText = useCallback((text: string, map?: MentionMap) =>
        renderRichText(text, map, undefined, handleMentionClick),
        [handleMentionClick],
    );

    const handleLikeComment = useCallback(
        async (commentId: string) => {
            const comment = loadedComments.find((c) => c.id === commentId);
            if (!comment) return;
            const wasLiked = comment.hasLiked ?? false;
            const newLiked = !wasLiked;
            // Optimistic update — instant color change
            setLoadedComments((prev) =>
                prev.map((c) =>
                    c.id === commentId
                        ? { ...c, hasLiked: newLiked, likes: c.likes + (newLiked ? 1 : -1) }
                        : c
                )
            );
            try {
                if (wasLiked) {
                    const { data } = await removeCommentLikeMutation({ variables: { input: { commentId } } });
                    if (data?.removeCommentLike?.success) {
                        setLoadedComments((prev) =>
                            prev.map((c) =>
                                c.id === commentId
                                    ? { ...c, hasLiked: false, likes: data.removeCommentLike.likeCount }
                                    : c
                            )
                        );
                    } else {
                        throw new Error('unlike failed');
                    }
                } else {
                    const { data } = await likeCommentMutation({ variables: { input: { commentId } } });
                    if (data?.likeComment?.success) {
                        setLoadedComments((prev) =>
                            prev.map((c) =>
                                c.id === commentId
                                    ? { ...c, hasLiked: true, likes: data.likeComment.likeCount }
                                    : c
                            )
                        );
                    } else {
                        throw new Error('like failed');
                    }
                }
            } catch {
                // Revert optimistic update on failure or missing response
                setLoadedComments((prev) =>
                    prev.map((c) =>
                        c.id === commentId
                            ? { ...c, hasLiked: wasLiked, likes: c.likes + (wasLiked ? 1 : -1) }
                            : c
                    )
                );
            }
        },
        [loadedComments, likeCommentMutation, removeCommentLikeMutation]
    );

    useEffect(() => {
        if (commentsQueryData?.postComments) {
            setLoadedComments(prev => {
                const prevMap = new Map(prev.map(c => [c.id, c]));
                return commentsQueryData.postComments.map(c => {
                    const mapped = mapApiComment(c);
                    const existing = prevMap.get(mapped.id);
                    if (existing) {
                        mapped.hasLiked = existing.hasLiked;
                        mapped.likes = existing.likes;
                        // Preserve locally-edited content so a background refetch doesn't overwrite it
                        if (existing.content !== mapped.content) mapped.content = existing.content;
                    }
                    return mapped;
                });
            });
            setCommentsLoaded(true);
        }
    }, [commentsQueryData]);

    const loadComments = useCallback(() => {
        if (!commentsLoaded && postId) {
            fetchComments({ variables: { postId, limit: 20, offset: 0 } });
        }
    }, [commentsLoaded, postId, fetchComments]);

    /** Notification deep-link: show comments and fetch enough rows to include the target id */
    useEffect(() => {
        const cid = initialFocusCommentId?.trim();
        if (!cid || !postId) return;
        setShowComments(true);
        fetchComments({ variables: { postId, limit: 100, offset: 0 } });
    }, [initialFocusCommentId, postId, fetchComments]);

    useEffect(() => {
        const cid = initialFocusCommentId?.trim();
        if (!cid || !commentsLoaded || commentsLoading) return;
        const timer = window.setTimeout(() => {
            const el = document.getElementById(`post-comment-${cid}`);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add(
                'ring-2',
                'ring-text-brand',
                'rounded-md',
                'transition-shadow',
                'duration-300'
            );
            window.setTimeout(() => {
                el.classList.remove(
                    'ring-2',
                    'ring-text-brand',
                    'rounded-md',
                    'transition-shadow',
                    'duration-300'
                );
            }, 3500);
        }, 120);
        return () => window.clearTimeout(timer);
    }, [initialFocusCommentId, commentsLoaded, commentsLoading, loadedComments]);

    /** Derived commentsData — prefer loaded from API, fall back to prop */
    const commentsData = commentsLoaded ? loadedComments : commentsDataProp;
    /** Displayed count — backend's `engagementCounts.comments` is authoritative when > 0,
     * but falls back to the actually-loaded list length so the chip is never hidden while
     * comments are visible. */
    const displayedCommentCount = Math.max(commentCount, commentsData.length);
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [showCommentSheet, setShowCommentSheet] = useState(false);
    const [modalReplyToId, setModalReplyToId] = useState<string | null>(null);
    const [showShareDialog, setShowShareDialog] = useState(false);

    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const wheelCooldown = useRef(false);

    const allMedia: Array<{ type: 'image' | 'video'; src: string }> = [
        ...(images ?? []).map(src => ({ type: 'image' as const, src })),
        ...(videos ?? []).map(src => ({ type: 'video' as const, src })),
    ];

    const t = useTranslations('actions');

    // Sync state with props when they change (important for refetch scenarios)
    useEffect(() => {
        setIsLiked(initialIsLiked);
    }, [initialIsLiked]);

    useEffect(() => {
        setIsSaved(initialIsSaved);
    }, [initialIsSaved]);

    useEffect(() => {
        setIsShared(initialIsShared);
    }, [initialIsShared]);

    useEffect(() => {
        setLikeCount(likes);
    }, [likes]);

    useEffect(() => {
        setCommentCount(comments);
    }, [comments]);

    useEffect(() => {
        setShareCount(shares);
    }, [shares]);

    /* ------------------- Interaction Handlers ------------------- */
    const handleLike = () => {
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount((c) => newLikedState ? c + 1 : c - 1);
        onLike?.(newLikedState);
    };

    const handleSave = () => {
        // Optimistic update
        setIsSaved((v) => !v);
        
        // Call parent handler (which will trigger API call)
        onSave?.();
    };

    const handleShare = () => {
        setShowShareDialog(true);
    };

    const handleShared = () => {
        const newSharedState = true;
        setIsShared(newSharedState);
        setShareCount((c) => c + 1);
        onShare?.();
    };

    const toggleExpand = () => setIsExpanded((v) => !v);
    const toggleComments = () => {
        const willShow = !showComments;
        setShowComments(willShow);
        if (willShow) loadComments();
    };
    const currentUserAvatar = useUserStore((s) => s.user?.avatarUrl) || '/PROFILE.png';
    const currentUserId = useUserStore((s) => s.user?.userId);

    const isOwnPost = !!currentUserId && !!authorUserId && currentUserId === authorUserId;
    const canEditPost = isOwnPost && !!createdAt && (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;

    const goToProfile = useCallback((userId?: string, authorType?: string) => {
        if (!userId) return;
        if (authorType && authorType.toUpperCase() !== 'USER') return;
        if (currentUserId && userId === currentUserId) {
            router.push('/profile');
            return;
        }
        router.push(`/${userId}`);
    }, [router, currentUserId]);

    const toggleCommentInput = () => {
        setShowCommentInput((v) => {
            const willShow = !v;
            if (willShow) {
                setShowComments(true);
                loadComments();
            }
            return willShow;
        });
        onComment?.();
    };

    const handleReplyClick = (commentId: string) => {
        setReplyToCommentId((cur) => (cur === commentId ? null : commentId));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]!.clientX;
        touchStartY.current = e.touches[0]!.clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const deltaX = e.changedTouches[0]!.clientX - touchStartX.current;
        const deltaY = e.changedTouches[0]!.clientY - touchStartY.current;
        const THRESHOLD = 50;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > THRESHOLD) {
            if (deltaX < 0) nextMedia(); else prevMedia();
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > THRESHOLD) {
            closeMediaModal();
            if (deltaY < 0) onNavigatePost?.('next'); else onNavigatePost?.('prev');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (wheelCooldown.current) return;
        wheelCooldown.current = true;
        setTimeout(() => { wheelCooldown.current = false; }, 600);
        closeMediaModal();
        if (e.deltaY > 0) onNavigatePost?.('next');
        else onNavigatePost?.('prev');
    };

    const openMediaModal = (index: number) => {
        if (onOpenMedia) { onOpenMedia(index); return; }
        setCurrentMediaIndex(index);
        setShowMediaModal(true);
        loadComments();
    };

    const closeMediaModal = () => {
        setShowMediaModal(false);
        setShowCommentSheet(false);
        setModalReplyToId(null);
    };

    const nextMedia = () => {
        setCurrentMediaIndex((prev) => (prev + 1) % allMedia.length);
    };

    const prevMedia = () => {
        setCurrentMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    };

    const currentUserFirstName = useUserStore((s) => s.user?.firstName);
    const currentUserLastName = useUserStore((s) => s.user?.lastName);

    /** Called by MessageInputGlobal – adds a comment or a reply. */
    const handleSend = async (text: string, parentId?: string, mentionMap?: MentionMap) => {
        if (!text.trim() || !onSendComment) return;

        let preparedText = text.trim();
        if (parentId) {
            const parent = commentsData.find((c) => c.id === parentId);
            if (parent) {
                if (parent.authorHandle) {
                    preparedText = `@${parent.authorHandle} ${preparedText}`;
                }
            }
        }
        try {
            const mentions = buildMentionInputsFromText(preparedText, mentionMap);
            const result = onSendComment(preparedText, parentId, mentions.length ? mentions : undefined);
            if (result != null && typeof (result as Promise<unknown>).then === 'function') {
                await result;
            }
            setShowComments(true);
            setShowCommentInput(false);
            setReplyToCommentId(null);
            // Optimistically add the new comment so mentions are clickable immediately
            const optimisticComment: Comment = {
                id: `optimistic-${Date.now()}`,
                author: `${currentUserFirstName ?? ''} ${currentUserLastName ?? ''}`.trim() || 'You',
                authorImage: currentUserAvatar,
                authorId: currentUserId,
                content: preparedText,
                createdAt: new Date().toISOString(),
                likes: 0,
                parentId: parentId ?? null,
                mentionMap,
            };
            setLoadedComments((prev) => [...prev, optimisticComment]);
            setTimeout(() => {
                fetchComments({ variables: { postId, limit: 20, offset: 0 } });
            }, 500);
        } catch {
            // Mutation failed; parent shows toast
        }
    };

    /* ------------------- Render Helpers ------------------- */
    const renderContent = () => {
        if (isEditingPost) {
            return (
                <div className="mb-4">
                    <textarea
                        className="w-full border border-border-subtle rounded-lg p-3 body-medium text-text-primary bg-surface-default resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                        rows={4}
                        value={editPostText}
                        onChange={(e) => setEditPostText(e.target.value)}
                        autoFocus
                    />
                    <div className="flex gap-2 justify-end mt-2">
                        <button
                            className="px-3 py-1 label-medium text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt"
                            onClick={() => { setIsEditingPost(false); setEditPostText(postContent); }}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1 label-medium text-text-white bg-surface-brand rounded-md hover:bg-border-brand disabled:opacity-50"
                            onClick={handleEditPostSubmit}
                            disabled={editPostLoading || !editPostText.trim()}
                        >
                            {editPostLoading ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            );
        }
        const max = 200;
        const truncated = postContent.length > max && !isExpanded;
        const displayText = truncated ? `${postContent.slice(0, max)}...` : postContent;

        return (
            <>
                <p className="body-medium text-text-primary leading-relaxed mb-[1rem] whitespace-pre-wrap break-words">
                    {renderText(displayText, mentionMap)}
                    {truncated && (
                        <span
                            onClick={toggleExpand}
                            className="text-text-brand text-xs cursor-pointer ml-1"
                        >
                            {isExpanded ? t('showLess') : t('showMore')}
                        </span>
                    )}
                </p>
            </>
        );
    };

    const renderImages = () => {
        if (!images?.length) return null;

        const imageCount = images.length;
        const maxDisplay = 4;
        const excessCount = imageCount > maxDisplay ? imageCount - maxDisplay : 0;

        return (
            <div className="mb-[1rem] flex flex-col gap-[0.5rem]">
                {imageCount === 1 ? (
                    <div
                        className="group relative w-full rounded-lg overflow-hidden cursor-pointer bg-surface-alt"
                        onClick={() => openMediaModal(0)}
                    >
                        <img src={images[0]} alt="post" className="w-full max-h-[32rem] object-contain" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
                            </button>
                        </div>
                    </div>
                ) : imageCount === 2 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.map((src, i) => (
                            <div
                                key={i}
                                className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openMediaModal(i)}
                            >
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                        <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                    </button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                        <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : imageCount === 3 ? (
                    <div className="grid grid-cols-2 grid-rows-2 gap-2">
                        <div
                            className="group relative row-span-2 rounded-lg overflow-hidden cursor-pointer min-h-[10rem]"
                            onClick={() => openMediaModal(0)}
                        >
                            <img src={images[0]} alt="post 1" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                    <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                    <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
                                </button>
                            </div>
                        </div>
                        <div
                            className="group relative aspect-square min-h-0 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => openMediaModal(1)}
                        >
                            <img src={images[1]} alt="post 2" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                    <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                    <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
                                </button>
                            </div>
                        </div>
                        <div
                            className="group relative aspect-square min-h-0 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => openMediaModal(2)}
                        >
                            <img src={images[2]} alt="post 3" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                    <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                    <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.slice(0, maxDisplay).map((src, i) => (
                            <div
                                key={i}
                                className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openMediaModal(i === maxDisplay - 1 && excessCount > 0 ? 0 : i)}
                            >
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                {i === maxDisplay - 1 && excessCount > 0 ? (
                                    <div className="absolute inset-0 bg-black/40 bg-opacity-60 flex items-center justify-center">
                                        <span className="text-white text-3xl font-semibold">
                                            +{excessCount}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                            <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                            <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderVideos = () => {
        if (!videos?.length) return null;
        return (
            <div className="mb-[1rem] flex flex-col gap-[0.5rem]">
                {videos.map((src, i) => (
                    <VideoPlayer
                        key={i}
                        src={src}
                        className="w-full max-h-[24rem]"
                        onOpenModal={() => openMediaModal((images?.length ?? 0) + i)}
                    />
                ))}
            </div>
        );
    };

    const renderMediaModal = () => {
        if (onOpenMedia || !showMediaModal || allMedia.length === 0) return null;
        const current = allMedia[currentMediaIndex]!;

        const mediaEl = current.type === 'image' ? (
            <img src={current.src} alt={`Media ${currentMediaIndex + 1}`} className="object-contain w-full h-full" decoding="async" />
        ) : (
            <VideoPlayer src={current.src} autoPlay className="w-full h-full max-h-full" pauseOnLeave={false} />
        );

        const thumbnailStrip = allMedia.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-xl p-2 max-w-[80%] overflow-x-auto">
                {allMedia.map((m, i) => (
                    <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i); }}
                        className={`relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer transition-all duration-150 ${i === currentMediaIndex ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-80'}`}
                    >
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
                    onClick={authorUserId ? () => goToProfile(authorUserId, 'USER') : undefined} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span
                            className={`font-semibold text-text-primary text-sm truncate ${authorUserId ? 'cursor-pointer hover:text-text-brand' : ''}`}
                            onClick={authorUserId ? () => goToProfile(authorUserId, 'USER') : undefined}
                        >{profileName}</span>
                        {profileTier && <UserBadge tier={profileTier} size="xs" />}
                    </div>
                    <p className="text-text-secondary text-xs flex items-center gap-1">
                        {category} · {postDate}
                        {visibility === 'CONNECTIONS' ? <Users className="w-3.5 h-3.5 flex-shrink-0" /> : visibility === 'PRIVATE' ? <Lock className="w-3.5 h-3.5 flex-shrink-0" /> : <Globe className="w-3.5 h-3.5 flex-shrink-0" />}
                    </p>
                </div>
            </div>
        );

        /* Comment list shared between desktop sidebar and mobile sheet */
        const topLevelM = commentsData.filter(c => !c.parentId);
        const repliesByParentM = new Map<string, Comment[]>();
        commentsData.forEach(c => {
            if (c.parentId) {
                const list = repliesByParentM.get(c.parentId) ?? [];
                list.push(c);
                repliesByParentM.set(c.parentId, list);
            }
        });

        const commentListEl = commentsLoading ? (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-text-brand" />
            </div>
        ) : topLevelM.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">{t('noComments')}</p>
        ) : (
            <div className="space-y-4">
                {topLevelM.map(c => (
                    <div key={c.id}>
                        <div className="flex gap-3">
                            <img src={c.authorImage || '/PROFILE.png'} alt={c.author} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => goToProfile(c.authorId, c.authorType)} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-semibold text-text-primary text-sm truncate cursor-pointer hover:text-text-brand" onClick={() => goToProfile(c.authorId, c.authorType)}>{c.author}</span>
                                    {c.authorTier && <UserBadge tier={c.authorTier} size="xs" />}
                                    <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(c.createdAt)}</span>
                                </div>
                                <p className="body-small text-text-primary break-words mb-2 whitespace-pre-wrap">{renderText(c.content, c.mentionMap)}</p>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => handleLikeComment(c.id)} className={`text-xs font-semibold transition-colors ${c.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}>{t('like')}</button>
                                    <button onClick={() => setModalReplyToId(cur => cur === c.id ? null : c.id)} className="text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors">{t('reply')}</button>
                                    <span className="text-text-tertiary text-xs">{formatCount(c.likes)} {t('likes')}</span>
                                </div>
                            </div>
                        </div>
                        {modalReplyToId === c.id && (
                            <div className="mt-3 ml-11 flex items-center gap-2">
                                <img src={currentUserAvatar} alt="You" width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                <div className="flex-1">
                                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, c.id, mm)} placeholder={t('replyPlaceholder')} reversed={true} reversedText={t('reply')} onMentionSearch={fetchMentions} />
                                </div>
                            </div>
                        )}
                        {(repliesByParentM.get(c.id)?.length ?? 0) > 0 && (
                            <div className="ml-11 mt-3 space-y-3">
                                {repliesByParentM.get(c.id)!.map(reply => (
                                    <div key={reply.id} className="flex gap-3">
                                        <img src={reply.authorImage || '/PROFILE.png'} alt={reply.author} width={28} height={28} loading="lazy" decoding="async" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-semibold text-text-primary text-sm truncate">{reply.author}</span>
                                                {reply.authorTier && <UserBadge tier={reply.authorTier} size="xs" />}
                                                <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(reply.createdAt)}</span>
                                            </div>
                                            <p className="body-small text-text-primary break-words whitespace-pre-wrap">
                                                {reply.parentId && /^@\S+/.test(reply.content) ? (() => {
                                                    const rest = reply.content.replace(/^@\S+(?:\s+[A-Z][a-z]+)*\s/, '');
                                                    return rest ? renderText(rest, reply.mentionMap) : null;
                                                })() : renderText(reply.content, reply.mentionMap)}
                                            </p>
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
                <img src={currentUserAvatar} alt="You" width={36} height={36} loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1">
                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, undefined, mm)} placeholder={t('addComment')} reversed={true} reversedText={t('comment')} onMentionSearch={fetchMentions} />
                </div>
            </div>
        );

        return (
            <div className="fixed inset-0 z-50 flex bg-black animate-in fade-in duration-200" onClick={closeMediaModal}>

                {/* ---- DESKTOP (md+): left media panel + right sidebar ---- */}
                <div className="hidden md:flex w-full h-full" onClick={e => e.stopPropagation()}>

                    {/* Left: media viewer */}
                    <div className="relative flex-1 flex items-center justify-center bg-black min-w-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
                        {/* Close */}
                        <button onClick={closeMediaModal} className="absolute top-4 left-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors cursor-pointer">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        {/* Counter */}
                        {allMedia.length > 1 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 rounded-full px-3 py-1">
                                <span className="text-white text-sm font-medium">{currentMediaIndex + 1} / {allMedia.length}</span>
                            </div>
                        )}
                        {/* Nav arrows */}
                        {allMedia.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevMedia(); }} className="absolute left-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors cursor-pointer">
                                    <ChevronLeft className="w-6 h-6 text-white" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); nextMedia(); }} className="absolute right-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors cursor-pointer">
                                    <ChevronRight className="w-6 h-6 text-white" />
                                </button>
                            </>
                        )}
                        {/* Media */}
                        <div className="w-full h-full flex items-center justify-center p-4">
                            {mediaEl}
                        </div>
                        {/* Thumbnail strip */}
                        {thumbnailStrip}
                    </div>

                    {/* Right: sidebar */}
                    <div className="w-[360px] xl:w-[400px] flex-shrink-0 bg-surface-default flex flex-col h-full border-l border-border-subtle">
                        <div className="p-4 border-b border-border-subtle">
                            {postInfoEl}
                            <p className="body-small text-text-primary whitespace-pre-wrap break-words line-clamp-4">{renderText(postContent, mentionMap)}</p>
                        </div>
                        {/* Action bar */}
                        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-4">
                            <button onClick={handleLike} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                                <GoHeartFill className={`w-5 h-5 ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`} />
                                <span>{formatCount(likeCount)}</span>
                            </button>
                            <button className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                                <img width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-5 h-5 object-contain" />
                                <span>{formatCount(displayedCommentCount)}</span>
                            </button>
                            <button onClick={handleShare} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                                <img width={20} height={20} src="/SHARE.svg" alt="share" className="w-5 h-5 object-contain" />
                                <span>{formatCount(shareCount)}</span>
                            </button>
                            <button onClick={handleSave} className="inline-flex items-center gap-2 text-sm ml-auto">
                                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-text-brand' : 'text-text-secondary'}`} />
                            </button>
                        </div>
                        {/* Comment list */}
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {commentListEl}
                        </div>
                        {/* Comment input */}
                        <div className="p-4 border-t border-border-subtle">
                            {commentInputEl}
                        </div>
                    </div>
                </div>

                {/* ---- MOBILE (< md): stacked media + bottom bar + comment sheet ---- */}
                <div className="flex md:hidden flex-col w-full h-full" onClick={e => e.stopPropagation()}>

                    {/* Media area */}
                    <div className="relative flex-1 flex items-center justify-center bg-black min-h-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
                        <button onClick={closeMediaModal} className="absolute top-4 left-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors cursor-pointer">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        {allMedia.length > 1 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 rounded-full px-3 py-1">
                                <span className="text-white text-sm font-medium">{currentMediaIndex + 1} / {allMedia.length}</span>
                            </div>
                        )}
                        {allMedia.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevMedia(); }} className="absolute left-3 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 cursor-pointer">
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); nextMedia(); }} className="absolute right-3 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 cursor-pointer">
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </button>
                            </>
                        )}
                        <div className="w-full h-full flex items-center justify-center">
                            {mediaEl}
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="bg-surface-default px-4 pt-3 pb-2 border-t border-border-subtle">
                        {postInfoEl}
                        <p className="body-small text-text-primary whitespace-pre-wrap break-words line-clamp-2 mb-3">{renderText(postContent, mentionMap)}</p>
                        <div className="flex items-center gap-4">
                            <button onClick={handleLike} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                                <GoHeartFill className={`w-5 h-5 ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`} />
                                <span>{formatCount(likeCount)}</span>
                            </button>
                            <button onClick={() => setShowCommentSheet(true)} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                                <img width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-5 h-5 object-contain" />
                                <span>{formatCount(displayedCommentCount)}</span>
                            </button>
                            <button onClick={handleShare} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
                                <img width={20} height={20} src="/SHARE.svg" alt="share" className="w-5 h-5 object-contain" />
                                <span>{formatCount(shareCount)}</span>
                            </button>
                            <button onClick={handleSave} className="inline-flex items-center gap-2 text-sm ml-auto">
                                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-text-brand' : 'text-text-secondary'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Comment bottom sheet */}
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
                        <div className="p-4 border-t border-border-subtle">
                            {commentInputEl}
                        </div>
                    </div>
                    {showCommentSheet && (
                        <div className="fixed inset-0 z-[59] bg-black/40" onClick={() => setShowCommentSheet(false)} />
                    )}
                </div>
            </div>
        );
    };

    const renderCommentInput = () => {
        if (!showCommentInput) return null;

        return (
            <div className="my-[1rem] flex items-start gap-2">
                <img
                    src={currentUserAvatar}
                    alt="You"
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <MessageInputGlobal
                        onSendMessage={(txt: string, _img, mm) => handleSend(txt, undefined, mm)}
                        placeholder={t('addComment')}
                        reversed={true}
                        reversedText={t('comment')}
                        onMentionSearch={fetchMentions}
                    />
                </div>
            </div>
        );
    };

    const renderReplyInput = (commentId: string) => {
        if (replyToCommentId !== commentId) return null;

        return (
            <div className="mt-[1rem] ml-[3rem] flex items-start gap-2">
                <img
                    src={currentUserAvatar}
                    alt="You"
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <MessageInputGlobal
                        onSendMessage={(txt: string, _img, mm) => handleSend(txt, commentId, mm)}
                        placeholder={t('replyPlaceholder')}
                        reversed={true}
                        reversedText={t('reply')}
                        onMentionSearch={fetchMentions}
                    />
                </div>
            </div>
        );
    };

    const renderCommentMenu = (c: Comment, editable: boolean) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="ml-auto p-0.5 rounded-full hover:bg-surface-alt text-text-tertiary flex-shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
                {editable && (
                    <DropdownMenuItem onSelect={() => { setEditCommentText(c.content); setEditingCommentId(c.id); }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                )}
                {editable && <DropdownMenuSeparator />}
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteCommentId(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderCommentBody = (c: Comment) =>
        editingCommentId === c.id ? (
            <div className="mb-2">
                <textarea
                    className="w-full border border-border-subtle rounded-lg p-2 body-small text-text-primary bg-surface-default resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                    rows={3}
                    value={editCommentText}
                    onChange={(e) => setEditCommentText(e.target.value)}
                    autoFocus
                />
                <div className="flex gap-2 justify-end mt-1">
                    <button
                        className="px-2 py-1 label-small text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt text-xs"
                        onClick={() => setEditingCommentId(null)}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-2 py-1 label-small text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 text-xs"
                        onClick={() => handleEditCommentSubmit(c.id)}
                        disabled={editCommentLoading || !editCommentText.trim()}
                    >
                        {editCommentLoading ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        ) : (
            <p className="body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
                {c.parentId && /^@\S+/.test(c.content) ? (() => {
                    const rest = c.content.replace(/^@\S+(?:\s+[A-Z][a-z]+)*\s/, '');
                    return rest ? renderText(rest, c.mentionMap) : null;
                })() : renderText(c.content, c.mentionMap)}
            </p>
        );

    const renderComments = () => {
        if (!showComments) return null;

        const topLevel = commentsData.filter((c) => !c.parentId);
        const repliesByParentId = new Map<string, Comment[]>();
        commentsData.forEach((c) => {
            if (c.parentId) {
                const list = repliesByParentId.get(c.parentId) ?? [];
                list.push(c);
                repliesByParentId.set(c.parentId, list);
            }
        });

        return (
            <div className={`pt-[1rem] ${showCommentInput ? '' : 'mt-[1rem]'} border-t border-border-subtle`}>
                <div className="max-h-[12rem] overflow-y-auto mb-[1rem] space-y-[1.5rem]">
                    {commentsLoading ? (
                        <div className="flex items-center justify-center py-[2rem]">
                            <Loader2 className="w-5 h-5 animate-spin text-text-brand" />
                        </div>
                    ) : topLevel.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-[2rem]">
                            {t('noComments')}
                        </p>
                    ) : (
                        topLevel.map((c) => (
                            <div key={c.id} id={`post-comment-${c.id}`}>
                                <div className="flex gap-[0.75rem]">
                                    <img
                                        src={c.authorImage || '/PROFILE.png'}
                                        alt={c.author}
                                        width={32}
                                        height={32}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 cursor-pointer"
                                        onClick={() => goToProfile(c.authorId, c.authorType)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                            <span
                                                className="font-semibold text-text-primary text-sm truncate cursor-pointer hover:text-text-brand"
                                                onClick={() => goToProfile(c.authorId, c.authorType)}
                                            >
                                                {c.author}
                                            </span>
                                            {c.authorTier ? <UserBadge tier={c.authorTier} size="xs" /> : null}
                                            <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                            <span className="text-text-tertiary text-xs flex-shrink-0">
                                                {formatDateProximity(c.createdAt)}
                                            </span>
                                            {isOwnComment(c) && renderCommentMenu(c, canEditComment(c))}
                                        </div>
                                        {renderCommentBody(c)}
                                        <div className="flex items-center gap-[0.75rem]">
                                            <button
                                                type="button"
                                                onClick={() => handleLikeComment(c.id)}
                                                className={`text-xs font-semibold transition-colors ${c.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}
                                            >
                                                {t('like')}
                                            </button>
                                            <button
                                                onClick={() => handleReplyClick(c.id)}
                                                className="text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors"
                                            >
                                                {t('reply')}
                                            </button>
                                            <span className="text-text-tertiary text-xs">
                                                {formatCount(c.likes)} {t('likes')}
                                            </span>
                                            <span className="text-text-tertiary text-xs">
                                                {formatCount(c.replies ?? 0)} {t('replies')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {renderReplyInput(c.id)}
                                {(repliesByParentId.get(c.id)?.length ?? 0) > 0 && (
                                    <div className="ml-8 mt-3 space-y-3">
                                        {repliesByParentId.get(c.id)!.map((reply) => (
                                            <div key={reply.id} id={`post-comment-${reply.id}`} className="flex gap-[0.75rem]">
                                                <img
                                                    src={reply.authorImage || '/PROFILE.png'}
                                                    alt={reply.author}
                                                    width={32}
                                                    height={32}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 cursor-pointer"
                                                    onClick={() => goToProfile(reply.authorId, reply.authorType)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                                        <span
                                                            className="font-semibold text-text-primary text-sm truncate cursor-pointer hover:text-text-brand"
                                                            onClick={() => goToProfile(reply.authorId, reply.authorType)}
                                                        >
                                                            {reply.author}
                                                        </span>
                                                        {reply.authorTier ? <UserBadge tier={reply.authorTier} size="xs" /> : null}
                                                        <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                                        <span className="text-text-tertiary text-xs flex-shrink-0">
                                                            {formatDateProximity(reply.createdAt)}
                                                        </span>
                                                        {isOwnComment(reply) && renderCommentMenu(reply, canEditComment(reply))}
                                                    </div>
                                                    {renderCommentBody(reply)}
                                                    <div className="flex items-center gap-[0.75rem]">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLikeComment(reply.id)}
                                                            className={`text-xs font-semibold transition-colors ${reply.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}
                                                        >
                                                            {t('like')}
                                                        </button>
                                                        <span className="text-text-tertiary text-xs">
                                                            {formatCount(reply.likes)} {t('likes')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    /* --------------------------------------------------------------- */
    /*  Main Render                                                    */
    /* --------------------------------------------------------------- */
    return (
        <>
            <div className="w-full bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]">
                {/* Header */}
                <div className="flex items-center justify-between mb-[1rem] gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                            src={profileImage}
                            alt={profileName}
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            className="w-[3rem] h-[3rem] rounded-full object-cover border border-border-subtle flex-shrink-0 cursor-pointer"
                            onClick={() => goToProfile(authorUserId, 'USER')}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center">
                                <h3
                                    className="label-large text-text-primary truncate cursor-pointer hover:text-text-brand"
                                    onClick={() => goToProfile(authorUserId, 'USER')}
                                >
                                    {profileName}
                                </h3>
                                {profileTier ? <UserBadge tier={profileTier} size="sm" className="ml-2" /> : null}
                                {joinButton && <p className="ml-[0.5rem]">·</p>}
                                {joinButton && (
                                    <button className="inline-flex items-center justify-center py-[0.25rem] px-[0.5rem] rounded-md bg-brand-light text-text-brand hover:bg-brand cursor-pointer label-medium min-w-[3.75rem] ml-[0.1rem]">
                                        {t('join')}
                                    </button>
                                )}
                            </div>

                            <p className="body-small text-text-secondary text-wrap flex items-center gap-1">
                                {postDate}
                                {visibility === 'CONNECTIONS' ? <Users className="w-3.5 h-3.5 flex-shrink-0" /> : visibility === 'PRIVATE' ? <Lock className="w-3.5 h-3.5 flex-shrink-0" /> : <Globe className="w-3.5 h-3.5 flex-shrink-0" />}
                            </p>
                        </div>
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
                                    <DropdownMenuItem onSelect={() => { setEditPostText(postContent); setIsEditingPost(true); }}>
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

                {/* Content */}
                {renderContent()}

                {/* Images */}
                {renderImages()}
                {renderVideos()}

                {/* Reaction Bar - only visible when at least one count > 0 */}
                {(likeCount > 0 || displayedCommentCount > 0 || shareCount > 0) && (
                    <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b-[0.01rem] border-border-subtle">
                        {likeCount > 0 && (
                            <button
                                className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary"
                                onClick={handleLike}
                                title={`${likeCount.toLocaleString()} likes`}
                            >
                                <GoHeartFill
                                    className={`w-[1.25rem] h-[1.25rem] ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`}
                                />
                                <span>{formatCount(likeCount)}</span>
                            </button>
                        )}
                        {displayedCommentCount > 0 && (
                            <button
                                className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary"
                                onClick={toggleComments}
                                title={`${displayedCommentCount.toLocaleString()} comments`}
                            >
                                <img width={20} height={20} src="/COMMENT.svg" alt="comments" className="w-[1.25rem] h-[1.25rem] object-contain" />
                                <span>{formatCount(displayedCommentCount)}</span>
                            </button>
                        )}
                        {shareCount > 0 && (
                            <button
                                className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary"
                                onClick={handleShare}
                                title={`${shareCount.toLocaleString()} shares`}
                            >
                                <img width={20} height={20} src="/SHARE.svg" alt="shares" className="w-[1.25rem] h-[1.25rem] object-contain" />
                                <span>{formatCount(shareCount)}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[1rem]">
                        <button
                            className="inline-flex flex-row lg:flex-row items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-[3.75rem] max-lg:flex-col max-lg:gap-[0.25rem] max-lg:min-w-0"
                            onClick={handleLike}
                        >
                            <img width={20} height={20} src="/LIKE.svg" alt="like" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{t('like')}</span>
                        </button>
                        <button
                            className="inline-flex flex-row lg:flex-row items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-[3.75rem] max-lg:flex-col max-lg:gap-[0.25rem] max-lg:min-w-0"
                            onClick={toggleCommentInput}
                        >
                            <img width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{t('comment')}</span>
                        </button>
                        <button
                            className="inline-flex flex-row lg:flex-row items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-[3.75rem] max-lg:flex-col max-lg:gap-[0.25rem] max-lg:min-w-0"
                            onClick={handleShare}
                        >
                            <img width={20} height={20} src="/SHARE.svg" alt="share" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{t('share')}</span>
                        </button>
                    </div>
                    <button
                        className="inline-flex flex-row lg:flex-row items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-[3.75rem] max-lg:flex-col max-lg:gap-[0.25rem] max-lg:min-w-0"
                        onClick={handleSave}
                    >
                        <Bookmark
                            className={`w-[1.25rem] h-[1.25rem] ${isSaved ? 'fill-current text-text-brand' : 'text-text-secondary'}`}
                        />
                        <span className={`${isSaved ? "text-text-brand" : ""}`}>{ isSaved ?  t('saved') : t('save')}</span>
                    </button>
                </div>

                {/* Comments Section */}
                <div>
                    {renderCommentInput()}
                    {renderComments()}
                </div>
            </div>

            {/* Media Modal */}
            {renderMediaModal()}

            <SharePostModal
                open={showShareDialog}
                onClose={() => setShowShareDialog(false)}
                postId={postId}
                onShared={handleShared}
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
        </>
    );
}