'use client';
import { Bookmark, X, ChevronLeft, ChevronRight, Loader2, Copy, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal';
import { UserBadge } from "@/components/custom/userBadge";
import { formatCount } from '@/macros/formatCount';
import { renderRichText, MentionMap } from '@/components/custom/richTextRenderer';
import { useUserStore } from '@/store/useUserStore';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { GET_POST_COMMENTS, SHARE_POST, LIKE_COMMENT, REMOVE_COMMENT_LIKE, GetPostCommentsData, SharePostData, LikeCommentData, RemoveCommentLikeData } from '@/services/gql/postsFeed';
import type { Comment as ApiComment } from '@/services/gql/types/postsFeed';
import { formatDateProximity } from '@/macros/time';

/* --------------------------------------------------------------- */
/*  Types                                                          */
/* --------------------------------------------------------------- */
interface Comment {
    id: string;
    author: string;
    authorImage: string;
    /** Handle for @mentions (e.g. jsmith); use when building reply text so backend can link mentions. */
    authorHandle?: string;
    content: string;
    createdAt: string;
    likes: number;
    hasLiked?: boolean;
    replies?: number;
    parentId?: string | null;
    mentionMap?: MentionMap;
}

interface FeedCardProps {
    postId: string;
    profileImage: string;
    profileName: string;
    category: string;
    postDate: string;
    content: string;
    images?: string[];
    likes: number;
    comments: number;
    shares: number;
    commentsData?: Comment[];
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: () => void;
    onSendComment?: (content: string, parentId?: string) => void;
    joinButton?: boolean;
    isLiked?: boolean;
    isSaved?: boolean;
    isShared?: boolean;
}

/* --------------------------------------------------------------- */
/*  Component                                                       */
/* --------------------------------------------------------------- */
/** Map an API Comment to the local Comment shape. Use authorDisplayName/authorAvatarUrl from API when present. */
function mapApiComment(c: ApiComment): Comment {
    const mentionMap: MentionMap = {};
    c.mentions?.forEach((m) => {
        mentionMap[m.handle] = m.entityId;
    });

    const selfMention = c.mentions?.find(m => m.entityId === c.authorId);
    const authorName = c.authorDisplayName ?? selfMention?.displayName ?? selfMention?.handle ?? c.authorId;
    const authorAvatar = c.authorAvatarUrl ?? selfMention?.avatarUrl ?? '/PROFILE.png';

    return {
        id: c.id,
        author: authorName,
        authorImage: authorAvatar,
        authorHandle: c.authorHandle ?? selfMention?.handle,
        content: c.text,
        createdAt: c.createdAt,
        likes: c.likeCount ?? 0,
        hasLiked: c.hasLiked ?? false,
        replies: c.replyCount,
        parentId: c.parentId ?? undefined,
        mentionMap: Object.keys(mentionMap).length > 0 ? mentionMap : undefined,
    };
}

export default function FeedCardWithReply({
    postId,
    profileImage,
    profileName,
    category,
    postDate,
    content,
    images,
    likes,
    comments,
    shares,
    commentsData: commentsDataProp = [],
    onLike,
    onComment,
    onShare,
    onSave,
    onSendComment,
    onLikeComment,
    joinButton = true,
    isLiked: initialIsLiked = false,
    isSaved: initialIsSaved = false,
    isShared: initialIsShared = false,
}: FeedCardProps) {
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [isShared, setIsShared] = useState(initialIsShared);
    const [likeCount, setLikeCount] = useState(likes);
    const [shareCount, setShareCount] = useState(shares);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentCount, setCommentCount] = useState(comments);
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [loadedComments, setLoadedComments] = useState<Comment[]>(commentsDataProp);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    /* ---- lazy-load comments from API ---- */
    const [fetchComments, { loading: commentsLoading, data: commentsQueryData }] = useLazyQuery<GetPostCommentsData>(
        GET_POST_COMMENTS,
        { fetchPolicy: 'cache-and-network' }
    );

    const [sharePostMutation] = useMutation<SharePostData>(SHARE_POST);
    const [likeCommentMutation] = useMutation<LikeCommentData>(LIKE_COMMENT);
    const [removeCommentLikeMutation] = useMutation<RemoveCommentLikeData>(REMOVE_COMMENT_LIKE);

    const handleLikeComment = useCallback(
        async (commentId: string) => {
            const comment = loadedComments.find((c) => c.id === commentId);
            if (!comment) return;
            const isLiked = comment.hasLiked ?? false;
            try {
                if (isLiked) {
                    const { data } = await removeCommentLikeMutation({ variables: { input: { commentId } } });
                    if (data?.removeCommentLike != null) {
                        setLoadedComments((prev) =>
                            prev.map((c) =>
                                c.id === commentId
                                    ? { ...c, hasLiked: false, likes: data.removeCommentLike.likeCount }
                                    : c
                            )
                        );
                    }
                } else {
                    const { data } = await likeCommentMutation({ variables: { input: { commentId } } });
                    if (data?.likeComment != null) {
                        setLoadedComments((prev) =>
                            prev.map((c) =>
                                c.id === commentId
                                    ? { ...c, hasLiked: true, likes: data.likeComment.likeCount }
                                    : c
                            )
                        );
                    }
                }
            } catch {
                // Mutation failed; leave UI unchanged
            }
        },
        [loadedComments, likeCommentMutation, removeCommentLikeMutation]
    );

    useEffect(() => {
        if (commentsQueryData?.postComments) {
            setLoadedComments(commentsQueryData.postComments.map(mapApiComment));
            setCommentsLoaded(true);
        }
    }, [commentsQueryData]);

    const loadComments = useCallback(() => {
        if (!commentsLoaded && postId) {
            fetchComments({ variables: { postId, limit: 20, offset: 0 } });
        }
    }, [commentsLoaded, postId, fetchComments]);

    /** Derived commentsData — prefer loaded from API, fall back to prop */
    const commentsData = commentsLoaded ? loadedComments : commentsDataProp;
    const [showImageModal, setShowImageModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);

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
        // Optimistic update
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount((c) => newLikedState ? c + 1 : c - 1);
        
        // Call parent handler (which will trigger API call)
        onLike?.();
    };

    const handleSave = () => {
        // Optimistic update
        setIsSaved((v) => !v);
        
        // Call parent handler (which will trigger API call)
        onSave?.();
    };

    const handleShare = async () => {
        try {
            const { data } = await sharePostMutation({ variables: { postId } });
            if (data?.sharePost.shareLink) {
                setShareLink(data.sharePost.shareLink);
                setShowShareDialog(true);
                const newSharedState = !isShared;
                setIsShared(newSharedState);
                setShareCount((c) => newSharedState ? c + 1 : c - 1);
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
        onShare?.();
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    const toggleExpand = () => setIsExpanded((v) => !v);
    const toggleComments = () => {
        const willShow = !showComments;
        setShowComments(willShow);
        if (willShow) loadComments();
    };
    const currentUserAvatar = useUserStore((s) => s.user?.avatarUrl) || '/PROFILE.png';

    const toggleCommentInput = () => {
        setShowCommentInput((v) => !v);
        onComment?.();
    };

    const handleReplyClick = (commentId: string) => {
        setReplyToCommentId((cur) => (cur === commentId ? null : commentId));
    };

    const openImageModal = (index: number = 0) => {
        setCurrentImageIndex(index);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
    };

    const nextImage = () => {
        if (images) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
    };

    const prevImage = () => {
        if (images) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    /** Called by MessageInputGlobal – adds a comment or a reply. Updates local state only after mutation succeeds. */
    const handleSend = async (text: string, parentId?: string) => {
        if (!text.trim() || !onSendComment) return;

        let preparedText = text.trim();
        if (parentId) {
            const parent = commentsData.find((c) => c.id === parentId);
            if (parent) {
                const mention = parent.authorHandle ?? parent.author;
                preparedText = `@${mention} ${preparedText}`;
            }
        }
        try {
            const result = onSendComment(preparedText, parentId);
            if (result != null && typeof (result as Promise<unknown>).then === 'function') {
                await result;
            }
            setCommentCount((c) => c + 1);
            setShowComments(true);
            setShowCommentInput(false);
            setReplyToCommentId(null);
            setTimeout(() => {
                fetchComments({
                    variables: { postId, limit: 20, offset: 0 },
                    fetchPolicy: 'network-only',
                });
            }, 500);
        } catch {
            // Mutation failed; parent shows toast; don't update local count or refresh
        }
    };

    /* ------------------- Render Helpers ------------------- */
    const renderContent = () => {
        const max = 200;
        const truncated = content.length > max && !isExpanded;
        const displayText = truncated ? `${content.slice(0, max)}...` : content;

        return (
            <>
                <p className="font-body-medium text-text-primary leading-relaxed mb-[1rem] whitespace-pre-wrap break-words">
                    {renderRichText(displayText)}
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
                        className="relative w-full h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => openImageModal(0)}
                    >
                        <img src={images[0]} alt="post" className="w-full h-full object-cover" />
                    </div>
                ) : imageCount === 2 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.map((src, i) => (
                            <div 
                                key={i} 
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openImageModal(i)}
                            >
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                ) : imageCount === 3 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        <div 
                            className="relative h-[30.5rem] rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => openImageModal(0)}
                        >
                            <img src={images[0]} alt="post 1" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-[0.5rem]">
                            <div 
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openImageModal(1)}
                            >
                                <img src={images[1]} alt="post 2" className="w-full h-full object-cover" />
                            </div>
                            <div 
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openImageModal(2)}
                            >
                                <img src={images[2]} alt="post 3" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.slice(0, maxDisplay).map((src, i) => (
                            <div
                                key={i}
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => {
                                    if (i === maxDisplay - 1 && excessCount > 0) {
                                        openImageModal(0);
                                    } else {
                                        openImageModal(i);
                                    }
                                }}
                            >
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" />
                                {i === maxDisplay - 1 && excessCount > 0 && (
                                    <div className="absolute inset-0 bg-black/40 bg-opacity-60 flex items-center justify-center">
                                        <span className="text-white text-3xl font-semibold">
                                            +{excessCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderImageModal = () => {
        if (!showImageModal || !images?.length) return null;

        return (
            <div 
                className="fixed inset-0 z-50 flex items-center bg-surface-default/80 justify-center animate-in fade-in duration-200"
                onClick={closeImageModal}
            >
                <div 
                    className="relative w-[100%] h-[100%] flex flex-col rounded-2xl overflow-hidden"
                >
                    <div 
                        className="flex items-center justify-between p-4 border-border-subtle"
                    >
                        <div className="backdrop-blur-md rounded-full px-4 py-2 border border-subtle/20">
                            <span className="text-brand font-medium text-sm">
                                {currentImageIndex + 1} / {images.length}
                            </span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeImageModal();
                            }}
                            className="bg-surface-default/10 backdrop-blur-md hover:bg-surface-default/20 rounded-full p-3 transition-all duration-200 border border-subtle/20 group cursor-pointer"
                        >
                            <X className="w-6 h-6 text-brand group-hover:rotate-90 transition-transform duration-200" />
                        </button>
                    </div>

                    <div className="relative flex-1 flex items-center justify-center min-h-0">
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-6 bg-surface-default/10 backdrop-blur-md hover:bg-white/20 rounded-full p-4 transition-all duration-200 border border-subtle/20 z-10 group cursor-pointer"
                                >
                                    <ChevronLeft className="w-7 h-7 text-brand group-hover:-translate-x-1 transition-transform duration-200" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-6 bg-surface-default/10 backdrop-blur-md hover:bg-surface-default/20 rounded-full p-4 transition-all duration-200 border border-subtle/20 z-10 group cursor-pointer"
                                >
                                    <ChevronRight className="w-7 h-7 text-brand group-hover:translate-x-1 transition-transform duration-200" />
                                </button>
                            </>
                        )}

                        <div 
                            className="relative w-full h-full flex items-center justify-center"
                        >
                            <img
                                src={images[currentImageIndex]}
                                alt={`Image ${currentImageIndex + 1}`}
                                className="object-contain w-full h-full"
                            />
                        </div>
                    </div>

                    {images.length > 1 && (
                        <div 
                            className="border-border-subtle p-4"
                        >
                            <div className="flex justify-center">
                                <div className="bg-surface-default rounded-2xl p-3 border border-subtle/20 max-w-4xl overflow-x-auto">
                                    <div className="flex gap-3">
                                        {images.map((src, i) => (
                                            <div
                                                key={i}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(i);
                                                }}
                                                className={`relative w-20 h-20 rounded-lg cursor-pointer flex-shrink-0 transition-all duration-200 overflow-hidden ${
                                                    i === currentImageIndex 
                                                        ? 'ring-3 ring-text-brand scale-110' 
                                                        : 'opacity-50 hover:opacity-100 hover:scale-105'
                                                }`}
                                            >
                                                <img
                                                    src={src}
                                                    alt={`Thumbnail ${i + 1}`}
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                                {i === currentImageIndex && (
                                                    <div className="absolute inset-0 bg-surface-default/10 rounded-lg" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
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
                        onSendMessage={(txt: string) => handleSend(txt)}
                        placeholder={t('addComment')}
                        reversed={true}
                        reversedText={t('comment')}
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
                        onSendMessage={(txt: string) => handleSend(txt, commentId)}
                        placeholder={t('replyPlaceholder')}
                        reversed={true}
                        reversedText={t('reply')}
                    />
                </div>
            </div>
        );
    };

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
                            <div key={c.id}>
                                <div className="flex gap-[0.75rem]">
                                    <img
                                        src={c.authorImage || '/PROFILE.png'}
                                        alt={c.author}
                                        width={32}
                                        height={32}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                            <span className="font-semibold text-text-primary text-sm truncate">{c.author}</span>
                                            <UserBadge tier="starter" size="xs" />
                                            <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                            <span className="text-text-tertiary text-xs flex-shrink-0">
                                                {formatDateProximity(c.createdAt)}
                                            </span>
                                        </div>
                                        <p className="font-body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
                                            {renderRichText(c.content, c.mentionMap)}
                                        </p>
                                        <div className="flex items-center gap-[0.75rem]">
                                            <button className="text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors">
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
                                            <div key={reply.id} className="flex gap-[0.75rem]">
                                                <img
                                                    src={reply.authorImage || '/PROFILE.png'}
                                                    alt={reply.author}
                                                    width={32}
                                                    height={32}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                                        <span className="font-semibold text-text-primary text-sm truncate">{reply.author}</span>
                                                        <UserBadge tier="starter" size="xs" />
                                                        <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                                        <span className="text-text-tertiary text-xs flex-shrink-0">
                                                            {formatDateProximity(reply.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="font-body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
                                                        {renderRichText(reply.content, reply.mentionMap)}
                                                    </p>
                                                    <div className="flex items-center gap-[0.75rem]">
                                                        <button
                                                            type="button"
                                                            onClick={() => (onLikeComment ? onLikeComment(reply.id) : handleLikeComment(reply.id))}
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
                <div className="flex items-center justify-between mb-[1rem]">
                    <div className="lg:flex items-center gap-[0.75rem]">
                        <img
                            src={profileImage}
                            alt={profileName}
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            className="w-[3rem] h-[3rem] rounded-full object-cover border border-border-subtle"
                        />
                        <div className="lg:flex-1">
                            <div className="flex items-center">
                                <h3 className="font-label-large text-text-primary truncate">{profileName}</h3>
                                {joinButton && <p className="ml-[0.5rem]">·</p>}
                                {joinButton && (
                                    <button className="inline-flex items-center justify-center py-[0.25rem] px-[0.5rem] rounded-md bg-brand-light text-text-brand hover:bg-brand cursor-pointer font-label-medium min-w-[3.75rem] ml-[0.1rem]">
                                        {t('join')}
                                    </button>
                                )}
                            </div>

                            <p className="font-body-small text-text-secondary text-wrap">
                                {postDate}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {renderContent()}

                {/* Images */}
                {renderImages()}

                {/* Reaction Bar - Using formatCount for all counts */}
                <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b-[0.01rem] border-border-subtle">
                    <button
                        className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={handleLike}
                        title={`${likeCount.toLocaleString()} likes`}
                    >
                        <GoHeartFill
                            className={`w-[1.25rem] h-[1.25rem] ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`}
                        />
                        <span>{formatCount(likeCount)}</span>
                    </button>
                    <button
                        className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={toggleComments}
                        title={`${commentCount.toLocaleString()} comments`}
                    >
                        <img width={20} height={20} src="/COMMENT.svg" alt="comments" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{formatCount(commentCount)}</span>
                    </button>
                    <button
                        className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={handleShare}
                        title={`${shareCount.toLocaleString()} shares`}
                    >
                        <img width={20} height={20} src="/SHARE.svg" alt="shares" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{formatCount(shareCount)}</span>
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[1rem]">
                        <button
                            className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                            onClick={handleLike}
                        >
                            <img width={20} height={20} src="/LIKE.svg" alt="like" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{t('like')}</span>
                        </button>
                        <button
                            className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                            onClick={toggleCommentInput}
                        >
                            <img width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{t('comment')}</span>
                        </button>
                        <button
                            className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                            onClick={handleShare}
                        >
                            <img width={20} height={20} src="/SHARE.svg" alt="share" className="w-[1.25rem] h-[1.25rem] object-contain" />
                            <span>{t('share')}</span>
                        </button>
                    </div>
                    <button
                        className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
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

            {/* Image Modal */}
            {renderImageModal()}

            {/* Share Dialog */}
            {showShareDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShareDialog(false)}>
                    <div className="bg-surface-default rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-text-primary mb-4">{t('sharePost')}</h3>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="text"
                                value={shareLink}
                                readOnly
                                className="flex-1 px-3 py-2 bg-surface-subtle border border-border-subtle rounded-md text-text-primary text-sm"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="px-4 py-2 bg-surface-brand text-white rounded-md hover:bg-surface-brand-dark transition-colors flex items-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? t('copied') : t('copy')}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowShareDialog(false)}
                            className="w-full px-4 py-2 bg-surface-subtle text-text-primary rounded-md hover:bg-surface-tertiary transition-colors"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}