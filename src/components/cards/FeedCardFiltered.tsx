'use client';

import { Bookmark, Loader2, X, ChevronLeft, ChevronRight, MessageCircle, Globe, Users, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ButtonType1, ButtonType3 } from '@/components/custom/button';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal';
import { UserBadge, type Tier } from '@/components/custom/userBadge';
import { renderRichText, MentionMap, buildMentionMap, buildMentionInputsFromText, type MentionInputItem } from '@/components/custom/richTextRenderer';
import { useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/store/useUserStore';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import {
    GET_POST_COMMENTS, LIKE_COMMENT, REMOVE_COMMENT_LIKE,
    EDIT_COMMENT, DELETE_COMMENT, EDIT_POST, DELETE_POST,
    GetPostCommentsData, LikeCommentData, RemoveCommentLikeData,
    EditCommentData, DeleteCommentData,
} from '@/services/gql/postsFeed';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { toast } from 'sonner';
import { SEARCH_USERS } from '@/services/gql/connection';
import type { SearchUsersResponse } from '@/services/gql/types/connection';
import type { MentionUser } from '@/components/custom/messageInputGlobal';
import SharePostModal from '@/components/share/SharePostModal';
import type { Comment as ApiComment } from '@/services/gql/types/postsFeed';
import { formatDateProximity } from '@/macros/time';
import { formatCount } from '@/macros/formatCount';
import { resolveUserTier } from '@/lib/userTier';
import { VideoPlayer } from '@/components/custom/VideoPlayer';

/* --------------------------------------------------------------- */
type MediaItem = { type: 'image'; src: string } | { type: 'video'; src: string };

/* --------------------------------------------------------------- */
interface Comment {
    id: string;
    author: string;
    authorImage: string;
    authorHandle?: string;
    authorId?: string;
    content: string;
    createdAt: string;
    likes: number;
    hasLiked?: boolean;
    replies?: number;
    parentId?: string | null;
    mentionMap?: MentionMap;
    authorTier?: Tier;
}

export interface FeedCardFilteredProps {
    id: string;
    postId?: string;
    profileImage: string;
    profileName: string;
    profileTier?: Tier;
    authorUserId?: string;
    createdAt?: string;
    category: string;
    postDate: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';
    content: string;
    mentionMap?: MentionMap;
    images?: string[];
    videos?: string[];
    likes: number;
    comments: number;
    commentsData?: Comment[];
    isLiked?: boolean;
    isSaved?: boolean;
    currentUser?: { name: string; avatar: string };
    onLike?: (liked: boolean) => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: (saved: boolean) => void;
    onSendComment?: (content: string, parentId?: string, mentions?: MentionInputItem[]) => void;
    onDelete?: (postId: string) => void;
    joinButton?: boolean;
    forceShowComments?: boolean;
    onNavigatePost?: (direction: 'next' | 'prev') => void;
}

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
        content: c.text,
        createdAt: c.createdAt,
        likes: c.likeCount ?? 0,
        hasLiked: c.hasLiked ?? false,
        replies: c.replyCount,
        parentId: c.parentId ?? undefined,
        mentionMap,
        authorTier: resolveUserTier({
            tier: (c as { authorTier?: string }).authorTier,
            verificationTier: (c as { authorVerificationTier?: string }).authorVerificationTier,
            trustScore: (c as { authorTrustScore?: number }).authorTrustScore,
        }),
    };
}

/* --------------------------------------------------------------- */
export default function FeedCardFiltered({
    id,
    postId,
    profileImage,
    profileName,
    profileTier,
    authorUserId,
    createdAt,
    category,
    postDate,
    visibility,
    content,
    mentionMap,
    images,
    videos,
    likes: initialLikes,
    comments: initialComments,
    commentsData: commentsDataProp = [],
    isLiked: externalIsLiked = false,
    isSaved: externalIsSaved = false,
    currentUser = { name: 'You', avatar: '' },
    onLike,
    onComment,
    onShare,
    onSave,
    onSendComment,
    onDelete,
    joinButton = true,
    forceShowComments = false,
    onNavigatePost,
}: FeedCardFilteredProps) {
    const resolvedPostId = postId ?? id;
    const router = useRouter();
    const storeAvatar = useUserStore((s) => s.user?.avatarUrl);
    const resolvedAvatar = currentUser.avatar || storeAvatar || '/PROFILE.png';
    const [isLiked, setIsLiked] = useState(externalIsLiked);
    const [isSaved, setIsSaved] = useState(externalIsSaved);
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [commentCount, setCommentCount] = useState(initialComments);

    useEffect(() => { setLikeCount(initialLikes); }, [initialLikes]);
    useEffect(() => { setCommentCount(initialComments); }, [initialComments]);

    const [isExpanded, setIsExpanded] = useState(false);
    const [showComments, setShowComments] = useState(forceShowComments);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editPostText, setEditPostText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
    const [deletePostModalOpen, setDeletePostModalOpen] = useState(false);
    const currentUserId = useUserStore(s => s.user?.userId);

    // Swipe tracking
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const THRESHOLD = 50;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > THRESHOLD) {
            // Horizontal swipe → navigate within post media
            if (deltaX < 0) nextMedia();
            else prevMedia();
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > THRESHOLD) {
            // Vertical swipe → navigate between posts
            if (deltaY < 0) onNavigatePost?.('next');
            else onNavigatePost?.('prev');
        }
    };

    // Media modal state
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [showCommentSheet, setShowCommentSheet] = useState(false);
    const [modalCommentInput, setModalCommentInput] = useState(false);
    const [modalReplyToId, setModalReplyToId] = useState<string | null>(null);

    const [loadedComments, setLoadedComments] = useState<Comment[]>(commentsDataProp);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    // Top-level comment sort. Replies always render oldest-first regardless.
    // `TOP` is the default and matches the backend fallback for unknown values.
    const [commentSort, setCommentSort] = useState<'TOP' | 'NEWEST' | 'OLDEST'>('TOP');

    const allMedia: MediaItem[] = [
        ...(images ?? []).map(src => ({ type: 'image' as const, src })),
        ...(videos ?? []).map(src => ({ type: 'video' as const, src })),
    ];

    /* ---- lazy-load comments ---- */
    const [fetchComments, { loading: commentsLoading, data: commentsQueryData }] = useLazyQuery<GetPostCommentsData>(
        GET_POST_COMMENTS,
        { fetchPolicy: 'cache-and-network' }
    );
    const [likeCommentMutation] = useMutation<LikeCommentData>(LIKE_COMMENT);
    const [removeCommentLikeMutation] = useMutation<RemoveCommentLikeData>(REMOVE_COMMENT_LIKE);
    const [editCommentMutation, { loading: editCommentLoading }] = useMutation<EditCommentData>(EDIT_COMMENT);
    const [deleteCommentMutation, { loading: deleteCommentLoading }] = useMutation<DeleteCommentData>(DELETE_COMMENT);
    const [editPostMutation, { loading: editPostLoading }] = useMutation(EDIT_POST);
    const [deletePostMutation, { loading: deletePostLoading }] = useMutation(DELETE_POST);
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

    const isOwnPost = !!currentUserId && !!authorUserId && currentUserId === authorUserId;
    const canEditPost = isOwnPost && !!createdAt && (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
    const isOwnComment = (c: Comment) => !!currentUserId && c.authorId === currentUserId;
    const canEditComment = (c: Comment) =>
        isOwnComment(c) && (Date.now() - new Date(c.createdAt).getTime()) < 24 * 60 * 60 * 1000;

    const handleEditPostConfirm = async () => {
        const newText = editPostText.trim();
        if (!newText) return;
        try {
            await editPostMutation({ variables: { input: { id: resolvedPostId, text: newText } } });
            setIsEditingPost(false);
            toast.success('Post updated');
        } catch {
            toast.error('Failed to update post');
        }
    };

    const handleDeletePostConfirm = async () => {
        try {
            await deletePostMutation({ variables: { id: resolvedPostId } });
            setDeletePostModalOpen(false);
            toast.success('Post deleted');
            onDelete?.(resolvedPostId);
        } catch {
            toast.error('Failed to delete post');
        }
    };

    const handleEditCommentSubmit = async (commentId: string) => {
        const newText = editCommentText.trim();
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

    const handleLikeComment = useCallback(async (commentId: string) => {
        const comment = loadedComments.find((c) => c.id === commentId);
        if (!comment) return;
        const liked = comment.hasLiked ?? false;
        try {
            if (liked) {
                const { data } = await removeCommentLikeMutation({ variables: { input: { commentId } } });
                if (data?.removeCommentLike != null) {
                    setLoadedComments((prev) => prev.map((c) =>
                        c.id === commentId ? { ...c, hasLiked: false, likes: data.removeCommentLike.likeCount } : c
                    ));
                }
            } else {
                const { data } = await likeCommentMutation({ variables: { input: { commentId } } });
                if (data?.likeComment != null) {
                    setLoadedComments((prev) => prev.map((c) =>
                        c.id === commentId ? { ...c, hasLiked: true, likes: data.likeComment.likeCount } : c
                    ));
                }
            }
        } catch { /* leave UI unchanged */ }
    }, [loadedComments, likeCommentMutation, removeCommentLikeMutation]);

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
                    }
                    return mapped;
                });
            });
            setCommentsLoaded(true);
        }
    }, [commentsQueryData]);

    const loadComments = useCallback(() => {
        if (!commentsLoaded && resolvedPostId) {
            fetchComments({ variables: { postId: resolvedPostId, limit: 20, offset: 0, sortBy: commentSort } });
        }
    }, [commentsLoaded, resolvedPostId, fetchComments, commentSort]);

    // When the user changes the sort, drop the cached page and refetch.
    // Replies are owned by their parent comment and aren't reordered here —
    // backend keeps them oldest-first regardless.
    const handleCommentSortChange = useCallback(
        (next: 'TOP' | 'NEWEST' | 'OLDEST') => {
            if (next === commentSort) return;
            setCommentSort(next);
            if (resolvedPostId) {
                setCommentsLoaded(false);
                setLoadedComments([]);
                fetchComments({ variables: { postId: resolvedPostId, limit: 20, offset: 0, sortBy: next } });
            }
        },
        [commentSort, resolvedPostId, fetchComments],
    );

    const commentsData = commentsLoaded ? loadedComments : commentsDataProp;

    const t = useTranslations('actions');

    useEffect(() => setIsLiked(externalIsLiked), [externalIsLiked]);
    useEffect(() => setIsSaved(externalIsSaved), [externalIsSaved]);
    useEffect(() => setShowComments(forceShowComments), [forceShowComments]);

    const handleLike = () => {
        const next = !isLiked;
        setIsLiked(next);
        setLikeCount((c) => (next ? c + 1 : c - 1));
        onLike?.(next);
    };

    const handleSave = () => {
        const next = !isSaved;
        setIsSaved(next);
        onSave?.(next);
    };

    const toggleExpand = () => setIsExpanded((v) => !v);
    const toggleComments = () => {
        const willShow = !showComments;
        setShowComments(willShow);
        if (willShow) loadComments();
    };
    const toggleCommentInput = () => {
        setShowCommentInput(true);
        onComment?.();
    };

    const openMediaModal = (index: number) => {
        setCurrentMediaIndex(index);
        setShowMediaModal(true);
        loadComments();
    };
    const closeMediaModal = () => {
        setShowMediaModal(false);
        setShowCommentSheet(false);
        setModalCommentInput(false);
        setModalReplyToId(null);
    };
    const nextMedia = () => setCurrentMediaIndex((p) => (p + 1) % allMedia.length);
    const prevMedia = () => setCurrentMediaIndex((p) => (p - 1 + allMedia.length) % allMedia.length);

    const handleReplyClick = (commentId: string) => {
        setReplyToCommentId((cur) => (cur === commentId ? null : commentId));
    };
    const handleModalReplyClick = (commentId: string) => {
        setModalReplyToId((cur) => (cur === commentId ? null : commentId));
    };

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
            if (result != null && typeof (result as Promise<unknown>).then === 'function') await result;
            setCommentCount((c) => c + 1);
            setShowComments(true);
            setShowCommentInput(false);
            setModalCommentInput(false);
            setReplyToCommentId(null);
            setModalReplyToId(null);
            const optimistic: Comment = {
                id: `optimistic-${Date.now()}`,
                author: currentUser.name,
                authorImage: resolvedAvatar,
                content: preparedText,
                createdAt: new Date().toISOString(),
                likes: 0,
                parentId: parentId ?? null,
                mentionMap,
            };
            setLoadedComments((prev) => [...prev, optimistic]);
            setTimeout(() => {
                fetchComments({ variables: { postId: resolvedPostId, limit: 20, offset: 0, sortBy: commentSort } });
            }, 500);
        } catch { /* parent shows toast */ }
    };

    /* ------------------- Comment tree helpers ------------------- */
    const userComments = commentsData.filter((c) => c.author === currentUser.name);
    const repliesByParentId = new Map<string, Comment[]>();
    userComments.forEach((c) => {
        if (c.parentId) {
            const list = repliesByParentId.get(c.parentId) ?? [];
            list.push(c);
            repliesByParentId.set(c.parentId, list);
        }
    });
    const parentIdsOfUserReplies = new Set(userComments.filter((c) => c.parentId).map((c) => c.parentId!));
    const myTopLevel = userComments.filter((c) => !c.parentId);
    const myTopIds = new Set(myTopLevel.map((c) => c.id));
    const parentCommentsWeRepliedTo = commentsData.filter(
        (c) => parentIdsOfUserReplies.has(c.id) && !myTopIds.has(c.id)
    );
    const topLevelIds = new Set([...myTopLevel, ...parentCommentsWeRepliedTo].map((c) => c.id));
    const orphanedParentIds = [...repliesByParentId.keys()].filter((pid) => !topLevelIds.has(pid));
    const stubParents: Comment[] = orphanedParentIds.map((parentId) => {
        const replies = repliesByParentId.get(parentId) ?? [];
        const earliestReply = replies.reduce((a, b) =>
            new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime() ? a : b
        );
        return { id: parentId, author: 'Another user', authorImage: '/PROFILE.png', content: '', createdAt: earliestReply.createdAt, likes: 0, parentId: undefined };
    });
    const topLevel = [...myTopLevel, ...parentCommentsWeRepliedTo, ...stubParents].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const stubParentIds = new Set(orphanedParentIds);

    /* ------------------- Render helpers ------------------- */
    const renderContent = () => {
        if (isEditingPost) {
            return (
                <div className="mb-[1rem]">
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
                        <button className="px-2 py-1 label-medium text-text-white bg-surface-brand rounded-md hover:bg-border-brand text-xs disabled:opacity-50"
                            onClick={handleEditPostConfirm}
                            disabled={editPostLoading || !editPostText.trim()}>
                            {editPostLoading ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            );
        }
        const max = 200;
        const truncated = content.length > max && !isExpanded;
        const displayText = truncated ? `${content.slice(0, max)}...` : content;
        return (
            <p className="body-medium text-text-primary leading-relaxed mb-[1rem] whitespace-pre-wrap break-words">
                {renderText(displayText, mentionMap)}
                {truncated && (
                    <span onClick={toggleExpand} className="text-text-brand text-xs cursor-pointer">
                        {isExpanded ? t('showLess') : t('showMore')}
                    </span>
                )}
            </p>
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
                    <div className="group relative w-full h-[15rem] rounded-lg overflow-hidden cursor-pointer" onClick={() => openMediaModal(0)}>
                        <img src={images[0]} alt="post" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                <MessageCircle className="w-7 h-7 drop-shadow" />
                            </button>
                        </div>
                    </div>
                ) : imageCount === 2 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.map((src, i) => (
                            <div key={i} className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer" onClick={() => openMediaModal(i)}>
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                        <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                    </button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                        <MessageCircle className="w-7 h-7 drop-shadow" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : imageCount === 3 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        <div className="group relative h-[30.5rem] rounded-lg overflow-hidden cursor-pointer" onClick={() => openMediaModal(0)}>
                            <img src={images[0]} alt="post 1" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                    <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                    <MessageCircle className="w-7 h-7 drop-shadow" />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-[0.5rem]">
                            <div className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer" onClick={() => openMediaModal(1)}>
                                <img src={images[1]} alt="post 2" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                        <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                    </button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                        <MessageCircle className="w-7 h-7 drop-shadow" />
                                    </button>
                                </div>
                            </div>
                            <div className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer" onClick={() => openMediaModal(2)}>
                                <img src={images[2]} alt="post 3" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                        <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                    </button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                        <MessageCircle className="w-7 h-7 drop-shadow" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.slice(0, maxDisplay).map((src, i) => (
                            <div key={i} className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer" onClick={() => openMediaModal(i)}>
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" />
                                {i === maxDisplay - 1 && excessCount > 0 ? (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white text-3xl font-semibold">+{excessCount}</span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                                            <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                                            <MessageCircle className="w-7 h-7 drop-shadow" />
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
                    <VideoPlayer key={i} src={src} className="w-full max-h-[24rem]" />
                ))}
            </div>
        );
    };

    const sortOptions: Array<{ key: 'TOP' | 'NEWEST' | 'OLDEST'; label: string }> = [
        { key: 'TOP', label: 'Top' },
        { key: 'NEWEST', label: 'Newest' },
        { key: 'OLDEST', label: 'Oldest' },
    ];

    const renderCommentList = (
        replyToId: string | null,
        onReply: (id: string) => void,
        onSendReply: (text: string, parentId?: string) => void
    ) => (
        <div className="space-y-[1.5rem]">
            {/* Top-level sort selector — only meaningful when there's more than
                one comment. Hide when empty so we don't show a dead control. */}
            {topLevel.length > 1 && (
                <div className="flex items-center gap-[0.5rem] text-xs">
                    <span className="text-text-tertiary">Sort by</span>
                    <div className="inline-flex rounded-full bg-surface-subtle p-[0.125rem]">
                        {sortOptions.map((opt) => {
                            const active = commentSort === opt.key;
                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handleCommentSortChange(opt.key)}
                                    className={`px-[0.75rem] py-[0.25rem] rounded-full font-medium transition-colors ${
                                        active
                                            ? 'bg-surface-elevated text-text-primary shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {commentsLoading ? (
                <div className="flex items-center justify-center py-[2rem]">
                    <Loader2 className="w-5 h-5 animate-spin text-text-brand" />
                </div>
            ) : topLevel.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-[2rem]">{t('noComments')}</p>
            ) : (
                topLevel.map((c, parentIndex) => {
                    const isLastTopLevel = parentIndex === topLevel.length - 1;
                    return (
                        <div key={c.id} className="relative">
                            {!isLastTopLevel && <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-surface-subtle" />}
                            <div className="absolute left-4 top-0 h-4 w-[2px] bg-surface-subtle" />
                            <div className="absolute left-4 top-4 w-8 h-8">
                                <div className="absolute left-0 top-0 w-8 h-4 border-l-2 border-b-2 border-surface-subtle rounded-bl-full" style={{ boxSizing: 'border-box' }} />
                            </div>
                            <div className="ml-14 pt-4">
                                <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                    <img src={c.authorImage || '/PROFILE.png'} alt={c.author} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                    <span className="font-semibold text-text-primary text-sm truncate">{c.author}</span>
                                    {c.authorTier ? <UserBadge tier={c.authorTier} size="xs" /> : null}
                                    <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                    <span className="text-text-tertiary text-xs flex-shrink-0">{formatDateProximity(c.createdAt)}</span>
                                    {isOwnComment(c) && !stubParentIds.has(c.id) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="ml-auto p-0.5 rounded-full hover:bg-surface-alt text-text-tertiary flex-shrink-0">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-32">
                                                {canEditComment(c) && (
                                                    <DropdownMenuItem onSelect={() => { setEditCommentText(c.content); setEditingCommentId(c.id); }}>
                                                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {canEditComment(c) && <DropdownMenuSeparator />}
                                                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteCommentId(c.id)}>
                                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                                <div className="ml-10">
                                    {stubParentIds.has(c.id) ? (
                                        <p className="body-small text-text-tertiary italic mb-[0.5rem]">Reply to this comment</p>
                                    ) : editingCommentId === c.id ? (
                                        <div className="mb-2">
                                            <textarea
                                                className="w-full border border-border-subtle rounded-lg p-2 body-small text-text-primary bg-surface-default resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                                                rows={3}
                                                value={editCommentText}
                                                onChange={e => setEditCommentText(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="flex gap-2 justify-end mt-1">
                                                <button className="px-2 py-1 label-medium text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt text-xs"
                                                    onClick={() => setEditingCommentId(null)}>Cancel</button>
                                                <button className="px-2 py-1 label-medium text-white bg-brand rounded-md hover:bg-brand-dark text-xs disabled:opacity-50"
                                                    onClick={() => handleEditCommentSubmit(c.id)}
                                                    disabled={editCommentLoading || !editCommentText.trim()}>
                                                    {editCommentLoading ? 'Saving…' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">{renderText(c.content, c.mentionMap)}</p>
                                    )}
                                    <div className="flex items-center gap-[0.75rem]">
                                        <ButtonType3 type="button" onClick={() => handleLikeComment(c.id)} className={`text-xs font-semibold p-0 min-w-0 border-0 bg-transparent ${c.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}>{t('like')}</ButtonType3>
                                        <ButtonType3 onClick={() => onReply(c.id)} className="text-xs font-semibold text-text-secondary hover:text-text-brand p-0 min-w-0 border-0 bg-transparent">{t('reply')}</ButtonType3>
                                        <span className="text-text-tertiary text-xs">{formatCount(c.likes)} {t('likes')}</span>
                                        <span className="text-text-tertiary text-xs">{formatCount(c.replies ?? 0)} {t('replies')}</span>
                                    </div>
                                </div>
                            </div>
                            {replyToId === c.id && (
                                <div className="mt-[1rem] ml-[3rem] flex items-center space-x-2">
                                    <img src={resolvedAvatar} alt={currentUser.name} width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, c.id, mm)} placeholder={t('replyPlaceholder')} reversed={true} reversedText={t('reply')} onMentionSearch={fetchMentions} />
                                </div>
                            )}
                            {(repliesByParentId.get(c.id)?.length ?? 0) > 0 && (
                                <div className="ml-8 mt-3 space-y-3 pl-6">
                                    {repliesByParentId.get(c.id)!.map((reply) => {
                                        const rOwn = isOwnComment(reply);
                                        const rEditable = rOwn && canEditComment(reply);
                                        return (
                                        <div key={reply.id} className="flex gap-[0.75rem]">
                                            <img src={reply.authorImage || '/PROFILE.png'} alt={reply.author} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                                    <span className="font-semibold text-text-primary text-sm truncate">{reply.author}</span>
                                                    {reply.authorTier ? <UserBadge tier={reply.authorTier} size="xs" /> : null}
                                                    <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                                    <span className="text-text-tertiary text-xs flex-shrink-0">{formatDateProximity(reply.createdAt)}</span>
                                                    {rOwn && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="ml-auto p-0.5 rounded-full hover:bg-surface-alt text-text-tertiary flex-shrink-0">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-32">
                                                                {rEditable && (
                                                                    <DropdownMenuItem onSelect={() => { setEditCommentText(reply.content); setEditingCommentId(reply.id); }}>
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
                                                            value={editCommentText}
                                                            onChange={e => setEditCommentText(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2 justify-end mt-1">
                                                            <button className="px-2 py-1 label-medium text-text-secondary border border-border-subtle rounded-md hover:bg-surface-alt text-xs"
                                                                onClick={() => setEditingCommentId(null)}>Cancel</button>
                                                            <button className="px-2 py-1 label-medium text-white bg-brand rounded-md hover:bg-brand-dark text-xs disabled:opacity-50"
                                                                onClick={() => handleEditCommentSubmit(reply.id)}
                                                                disabled={editCommentLoading || !editCommentText.trim()}>
                                                                {editCommentLoading ? 'Saving…' : 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
                                                        {reply.parentId && /^@\S+/.test(reply.content) ? (() => {
                                                            const rest = reply.content.replace(/^@\S+(?:\s+[A-Z][a-z]+)*\s/, '');
                                                            return rest ? renderText(rest, reply.mentionMap) : null;
                                                        })() : renderText(reply.content, reply.mentionMap)}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-[0.75rem]">
                                                    <ButtonType3 type="button" onClick={() => handleLikeComment(reply.id)} className={`text-xs font-semibold p-0 min-w-0 border-0 bg-transparent ${reply.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}>{t('like')}</ButtonType3>
                                                    <span className="text-text-tertiary text-xs">{formatCount(reply.likes)} {t('likes')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderCommentInput = () => {
        if (!showCommentInput) return null;
        return (
            <div className="my-[1rem] flex items-center space-x-2">
                <img src={resolvedAvatar} alt={currentUser.name} width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1">
                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, undefined, mm)} placeholder={t('addComment')} reversed={true} reversedText={t('comment')} onMentionSearch={fetchMentions} />
                </div>
            </div>
        );
    };

    const renderComments = () => {
        if (!showComments) return null;
        return (
            <div className={`pt-[1rem] ${showCommentInput ? '' : 'mt-[1rem]'} border-t border-border-subtle`}>
                <div className="max-h-[12rem] overflow-y-auto mb-[1rem]">
                    {renderCommentList(replyToCommentId, handleReplyClick, handleSend)}
                </div>
            </div>
        );
    };

    /* ------------------- Facebook-style media modal ------------------- */
    const renderMediaModal = () => {
        if (!showMediaModal || allMedia.length === 0) return null;
        const current = allMedia[currentMediaIndex];

        const modalActions = (
            <div className="flex items-center gap-[1rem]">
                <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm text-text-secondary hover:text-text-primary p-0 border-0 bg-transparent" onClick={handleLike}>
                    <GoHeartFill className={`w-5 h-5 ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`} />
                    <span>{formatCount(likeCount)}</span>
                </ButtonType3>
                <ButtonType3
                    className="inline-flex items-center gap-[0.5rem] text-sm text-text-secondary hover:text-text-primary p-0 border-0 bg-transparent"
                    onClick={() => {
                        setShowCommentSheet(true);
                        setModalCommentInput(true);
                    }}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span>{formatCount(commentCount)}</span>
                </ButtonType3>
                <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm text-text-secondary hover:text-text-primary p-0 border-0 bg-transparent" onClick={() => setShowShareModal(true)}>
                    <Image width={20} height={20} src="/SHARE.svg" alt="share" className="w-5 h-5 object-contain" />
                </ButtonType3>
                <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm p-0 border-0 bg-transparent ml-auto" onClick={handleSave}>
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-brand text-brand' : 'text-text-secondary'}`} />
                </ButtonType3>
            </div>
        );

        const modalPostInfo = (
            <div className="flex items-center gap-[0.75rem] mb-3">
                <img src={profileImage} alt={profileName} width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover border border-border-subtle flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary text-sm truncate">{profileName}</span>
                        {profileTier ? <UserBadge tier={profileTier} size="xs" /> : null}
                    </div>
                    <p className="text-text-secondary text-xs flex items-center gap-1">
                        {category} · {postDate}
                        {visibility === 'CONNECTIONS' ? <Users className="w-3.5 h-3.5 flex-shrink-0" /> : visibility === 'PRIVATE' ? <Lock className="w-3.5 h-3.5 flex-shrink-0" /> : <Globe className="w-3.5 h-3.5 flex-shrink-0" />}
                    </p>
                </div>
            </div>
        );

        const mediaEl = current.type === 'image' ? (
            <img src={current.src} alt={`Media ${currentMediaIndex + 1}`} className="object-contain w-full h-full" decoding="async" />
        ) : (
            <VideoPlayer src={current.src} autoPlay className="w-full h-full max-h-full" pauseOnLeave={false} />
        );

        return (
            <div className="fixed inset-0 z-50 flex bg-surface-default animate-in fade-in duration-200" onClick={closeMediaModal}>
                {/* ---- DESKTOP LAYOUT ---- */}
                <div className="hidden md:flex w-full h-full" onClick={(e) => e.stopPropagation()}>
                    {/* Left: media */}
                    <div className="relative flex-1 flex items-center justify-center bg-neutral-900 dark:bg-black min-w-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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

                        <div className="w-full h-full flex items-center justify-center p-4">
                            {mediaEl}
                        </div>

                        {/* Thumbnail strip */}
                        {allMedia.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 rounded-xl p-2 max-w-[90%] overflow-x-auto">
                                {allMedia.map((m, i) => (
                                    <div
                                        key={i}
                                        onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i); }}
                                        className={`relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer transition-all duration-150 ${i === currentMediaIndex ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-80'}`}
                                    >
                                        {m.type === 'image' ? (
                                            <img src={m.src} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" decoding="async" />
                                        ) : (
                                            <video src={m.src} className="w-full h-full object-cover" preload="metadata" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: post info + actions + comments */}
                    <div className="w-[360px] xl:w-[400px] flex-shrink-0 bg-surface-default flex flex-col h-full border-l border-border-subtle">
                        {/* Post info */}
                        <div className="p-4 border-b border-border-subtle">
                            {modalPostInfo}
                            <p className="body-small text-text-primary whitespace-pre-wrap break-words line-clamp-4">{content}</p>
                        </div>

                        {/* Actions */}
                        <div className="px-4 py-3 border-b border-border-subtle">
                            {modalActions}
                        </div>

                        {/* Comments */}
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {renderCommentList(modalReplyToId, handleModalReplyClick, handleSend)}
                        </div>

                        {/* Comment input */}
                        <div className="p-4 border-t border-border-subtle">
                            <div className="flex items-center space-x-2">
                                <img src={resolvedAvatar} alt={currentUser.name} width={36} height={36} loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                <div className="flex-1">
                                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, undefined, mm)} placeholder={t('addComment')} reversed={true} reversedText={t('comment')} onMentionSearch={fetchMentions} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---- MOBILE LAYOUT ---- */}
                <div className="flex md:hidden flex-col w-full h-full" onClick={(e) => e.stopPropagation()}>
                    {/* Media area */}
                    <div className="relative flex-1 flex items-center justify-center bg-neutral-900 dark:bg-black min-h-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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

                    {/* Bottom bar: post info + actions */}
                    <div className="bg-surface-default px-4 pt-3 pb-2 border-t border-border-subtle">
                        {modalPostInfo}
                        <p className="body-small text-text-primary whitespace-pre-wrap break-words line-clamp-2 mb-3">{content}</p>
                        {modalActions}
                    </div>

                    {/* Comment bottom sheet */}
                    <div
                        className={`fixed inset-x-0 bottom-0 z-60 bg-surface-default rounded-t-2xl shadow-2xl transition-transform duration-300 ${showCommentSheet ? 'translate-y-0' : 'translate-y-full'}`}
                        style={{ maxHeight: '75vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sheet handle */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                            <span className="font-semibold text-text-primary text-sm">{t('comment')}s</span>
                            <button onClick={() => setShowCommentSheet(false)} className="p-1 hover:bg-surface-subtle rounded-full cursor-pointer">
                                <X className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(75vh - 8rem)' }}>
                            {renderCommentList(modalReplyToId, handleModalReplyClick, handleSend)}
                        </div>
                        <div className="p-4 border-t border-border-subtle">
                            <div className="flex items-center space-x-2">
                                <img src={resolvedAvatar} alt={currentUser.name} width={36} height={36} loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                <div className="flex-1">
                                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, undefined, mm)} placeholder={t('addComment')} reversed={true} reversedText={t('comment')} onMentionSearch={fetchMentions} />
                                </div>
                            </div>
                        </div>
                    </div>
                    {showCommentSheet && <div className="fixed inset-0 z-[59] bg-black/40" onClick={() => setShowCommentSheet(false)} />}
                </div>
            </div>
        );
    };

    /* --------------------------------------------------------------- */
    return (
        <div className="w-full max-w-none bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]">
            {/* Header */}
            <div className="flex items-center justify-between mb-[1rem]">
                <div className="flex items-center gap-[0.75rem] flex-1 min-w-0">
                    <img src={profileImage} alt={profileName} width={40} height={40} loading="lazy" decoding="async" className="w-[3rem] h-[3rem] rounded-full object-cover border border-border-subtle flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="label-large text-text-primary truncate">{profileName}</h3>
                            {profileTier ? <UserBadge tier={profileTier} size="sm" /> : null}
                            {joinButton && <span className="text-text-secondary">·</span>}
                            {joinButton && (
                                <ButtonType1 className="inline-flex items-center justify-center py-[0.25rem] px-[0.5rem] rounded-md bg-brand-light hover:bg-brand label-medium text-xs min-w-[3.75rem]">
                                    {t('join')}
                                </ButtonType1>
                            )}
                        </div>
                        <p className="body-small text-text-secondary truncate flex items-center gap-1">
                            {t('postedBy', { user: 'Admin' })} · {category} · {postDate}
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

            {renderContent()}
            {renderImages()}
            {renderVideos()}

            {/* Reaction Bar */}
            {(likeCount > 0 || commentCount > 0) && (
                <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b-[0.01rem] border-border-subtle">
                    {likeCount > 0 && (
                        <ButtonType3 className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary p-0 min-w-0 border-0 bg-transparent" onClick={handleLike}>
                            <GoHeartFill className={`w-[1.25rem] h-[1.25rem] ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`} />
                            <span>{likeCount}</span>
                        </ButtonType3>
                    )}
                    {commentCount > 0 && (
                        <ButtonType3 className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary p-0 min-w-0 border-0 bg-transparent" onClick={toggleComments}>
                            <Image width={20} height={20} src="/COMMENT.svg" alt="comments" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{commentCount}</span>
                        </ButtonType3>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-[1rem]">
                    <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]" onClick={handleLike}>
                        <Image width={20} height={20} src="/LIKE.svg" alt="like" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('like')}</span>
                    </ButtonType3>
                    <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]" onClick={toggleCommentInput}>
                        <Image width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('comment')}</span>
                    </ButtonType3>
                    <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]" onClick={() => setShowShareModal(true)}>
                        <Image width={20} height={20} src="/SHARE.svg" alt="share" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('share')}</span>
                    </ButtonType3>
                </div>
                <ButtonType3 className="inline-flex items-center gap-[0.5rem] text-sm body-small min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]" onClick={handleSave}>
                    <Bookmark className={`w-[1.25rem] h-[1.25rem] ${isSaved ? 'fill-brand text-brand' : 'text-text-secondary'}`} />
                    <span className={isSaved ? 'text-brand' : 'text-text-secondary'}>{t('save')}</span>
                </ButtonType3>
            </div>

            {/* Comments Section */}
            <div>
                {renderCommentInput()}
                {renderComments()}
            </div>

            <SharePostModal open={showShareModal} onClose={() => setShowShareModal(false)} postId={resolvedPostId} onShared={onShare} />

            {renderMediaModal()}

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
        </div>
    );
}
