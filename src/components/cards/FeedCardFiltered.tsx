'use client';

import { Bookmark, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { ButtonType1, ButtonType3 } from '@/components/custom/button';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal';
import { UserBadge, type Tier } from '@/components/custom/userBadge';
import { renderRichText, MentionMap } from '@/components/custom/richTextRenderer';
import { useUserStore } from '@/store/useUserStore';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { GET_POST_COMMENTS, LIKE_COMMENT, REMOVE_COMMENT_LIKE, GetPostCommentsData, LikeCommentData, RemoveCommentLikeData } from '@/services/gql/postsFeed';
import SharePostModal from '@/components/share/SharePostModal';
import type { Comment as ApiComment } from '@/services/gql/types/postsFeed';
import { formatDateProximity } from '@/macros/time';
import { formatCount } from '@/macros/formatCount';
import { resolveUserTier } from '@/lib/userTier';

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
    authorTier?: Tier;
}

export interface FeedCardFilteredProps {
    id: string;
    postId?: string;
    profileImage: string;
    profileName: string;
    profileTier?: Tier;
    category: string;
    postDate: string;
    content: string;
    images?: string[];
    likes: number;
    comments: number;
    commentsData?: Comment[];
    isLiked?: boolean;
    isSaved?: boolean;
    currentUser?: { name: string; avatar: string };
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: () => void;
    onSendComment?: (content: string, parentId?: string) => void;
    joinButton?: boolean;
    forceShowComments?: boolean; 
}

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
    category,
    postDate,
    content,
    images,
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
    joinButton = true,
    forceShowComments = false,
}: FeedCardFilteredProps) {
    const resolvedPostId = postId ?? id;
    const storeAvatar = useUserStore((s) => s.user?.avatarUrl);
    const resolvedAvatar = currentUser.avatar || storeAvatar || '/PROFILE.png';
    const [isLiked, setIsLiked] = useState(externalIsLiked);
    const [isSaved, setIsSaved] = useState(externalIsSaved);
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [commentCount, setCommentCount] = useState(initialComments);

    const [isExpanded, setIsExpanded] = useState(false);
    const [showComments, setShowComments] = useState(forceShowComments);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [loadedComments, setLoadedComments] = useState<Comment[]>(commentsDataProp);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    /* ---- lazy-load comments from API ---- */
    const [fetchComments, { loading: commentsLoading, data: commentsQueryData }] = useLazyQuery<GetPostCommentsData>(
        GET_POST_COMMENTS,
        { fetchPolicy: 'cache-and-network' }
    );

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
        if (!commentsLoaded && resolvedPostId) {
            fetchComments({ variables: { postId: resolvedPostId, limit: 20, offset: 0 } });
        }
    }, [commentsLoaded, resolvedPostId, fetchComments]);

    const commentsData = commentsLoaded ? loadedComments : commentsDataProp;

    const t = useTranslations('actions');

    // Sync external state
    useEffect(() => setIsLiked(externalIsLiked), [externalIsLiked]);
    useEffect(() => setIsSaved(externalIsSaved), [externalIsSaved]);
    useEffect(() => setShowComments(forceShowComments), [forceShowComments]);

    const handleLike = () => {
        const next = !isLiked;
        setIsLiked(next);
        setLikeCount((c) => (next ? c + 1 : c - 1));
        onLike?.();
    };

    const handleSave = () => {
        setIsSaved((v) => !v);
        onSave?.();
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

    const handleReplyClick = (commentId: string) => {
        setReplyToCommentId((cur) => (cur === commentId ? null : commentId));
    };

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
                    variables: { postId: resolvedPostId, limit: 20, offset: 0 },
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
            <p className="body-medium text-text-primary leading-relaxed mb-[1rem] whitespace-pre-wrap break-words">
                {renderRichText(displayText)}
                {truncated && (
                    <span
                        onClick={toggleExpand}
                        className="text-text-brand text-xs cursor-pointer"
                    >
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
                    <div className="relative w-full h-[15rem] rounded-lg overflow-hidden">
                        <img src={images[0]} alt="post" className="w-full h-full object-cover" />
                    </div>
                ) : imageCount === 2 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.map((src, i) => (
                            <div key={i} className="relative h-[15rem] rounded-lg overflow-hidden">
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                ) : imageCount === 3 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        <div className="relative h-[30.5rem] rounded-lg overflow-hidden">
                            <img src={images[0]} alt="post 1" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-[0.5rem]">
                            <div className="relative h-[15rem] rounded-lg overflow-hidden">
                                <img src={images[1]} alt="post 2" className="w-full h-full object-cover" />
                            </div>
                            <div className="relative h-[15rem] rounded-lg overflow-hidden">
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
                                        console.log('Show all images');
                                    }
                                }}
                            >
                                <img src={src} alt={`post ${i + 1}`} className="w-full h-full object-cover" />
                                {i === maxDisplay - 1 && excessCount > 0 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white text-3xl font-semibold">+{excessCount}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderCommentInput = () => {
        if (!showCommentInput) return null;
        return (
            <div className="my-[1rem] flex items-center space-x-2">
                <img
                    src={resolvedAvatar}
                    alt={currentUser.name}
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                    <MessageInputGlobal
                        onSendMessage={(txt) => handleSend(txt)}
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
            <div className="mt-[1rem] ml-[3rem] flex items-center space-x-2">
                <img
                    src={resolvedAvatar}
                    alt={currentUser.name}
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <MessageInputGlobal
                    onSendMessage={(txt) => handleSend(txt, commentId)}
                    placeholder={t('replyPlaceholder')}
                    reversed={true}
                    reversedText={t('reply')}
                />
            </div>
        );
    };

    // Only show YOUR comments; build tree (top-level + replies). Include parents of
    // your replies so replies to other users' comments are not orphaned. If the
    // parent comment is not in commentsData (e.g. pagination), add a stub so the reply still renders.
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
        return {
            id: parentId,
            author: 'Another user',
            authorImage: '/PROFILE.png',
            content: '',
            createdAt: earliestReply.createdAt,
            likes: 0,
            parentId: undefined,
        };
    });
    const topLevel = [...myTopLevel, ...parentCommentsWeRepliedTo, ...stubParents].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const stubParentIds = new Set(orphanedParentIds);

    const renderComments = () => {
        if (!showComments) return null;

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
                        topLevel.map((c, parentIndex) => {
                            const isLastTopLevel = parentIndex === topLevel.length - 1;

                            return (
                                <div key={c.id} className="relative">
                                    {/* L-Shape Thread Line – CURVED VERSION */}
                                    {!isLastTopLevel && (
                                        <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-surface-subtle" />
                                    )}

                                    <div className="absolute left-4 top-0 h-4 w-[2px] bg-surface-subtle" />

                                    <div className="absolute left-4 top-4 w-8 h-8">
                                        <div
                                            className="absolute left-0 top-0 w-8 h-4 border-l-2 border-b-2 border-surface-subtle rounded-bl-full"
                                            style={{ boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    {/* Comment Content */}
                                    <div className="ml-14 pt-4">
                                        <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                            <img
                                                src={c.authorImage || '/PROFILE.png'}
                                                alt={c.author}
                                                width={32}
                                                height={32}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                            <span className="font-semibold text-text-primary text-sm truncate">{c.author}</span>
                                            {c.authorTier ? <UserBadge tier={c.authorTier} size="xs" /> : null}
                                            <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                            <span className="text-text-tertiary text-xs flex-shrink-0">
                                                {formatDateProximity(c.createdAt)}
                                            </span>
                                        </div>

                                        <div className="ml-10">
                                            {stubParentIds.has(c.id) ? (
                                                <p className="body-small text-text-tertiary italic mb-[0.5rem]">
                                                    Reply to this comment
                                                </p>
                                            ) : (
                                                <p className="body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
                                                    {renderRichText(c.content, c.mentionMap)}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-[0.75rem]">
                                                <ButtonType3
                                                    type="button"
                                                    onClick={() => handleLikeComment(c.id)}
                                                    className={`text-xs font-semibold p-0 min-w-0 border-0 bg-transparent ${c.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}
                                                >
                                                    {t('like')}
                                                </ButtonType3>
                                                <ButtonType3
                                                    onClick={() => handleReplyClick(c.id)}
                                                    className="text-xs font-semibold text-text-secondary hover:text-text-brand p-0 min-w-0 border-0 bg-transparent"
                                                >
                                                    {t('reply')}
                                                </ButtonType3>
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
                                        <div className="ml-8 mt-3 space-y-3 pl-6">
                                            {repliesByParentId.get(c.id)!.map((reply) => (
                                                <div key={reply.id} className="flex gap-[0.75rem]">
                                                    <img
                                                        src={reply.authorImage || '/PROFILE.png'}
                                                        alt={reply.author}
                                                        width={32}
                                                        height={32}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-[0.5rem] mb-[0.25rem]">
                                                            <span className="font-semibold text-text-primary text-sm truncate">{reply.author}</span>
                                                            {reply.authorTier ? <UserBadge tier={reply.authorTier} size="xs" /> : null}
                                                            <span className="text-text-tertiary text-xs flex-shrink-0">·</span>
                                                            <span className="text-text-tertiary text-xs flex-shrink-0">
                                                                {formatDateProximity(reply.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
                                                            {renderRichText(reply.content, reply.mentionMap)}
                                                        </p>
                                                        <div className="flex items-center gap-[0.75rem]">
                                                            <ButtonType3
                                                                type="button"
                                                                onClick={() => handleLikeComment(reply.id)}
                                                                className={`text-xs font-semibold p-0 min-w-0 border-0 bg-transparent ${reply.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}
                                                            >
                                                                {t('like')}
                                                            </ButtonType3>
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
                            );
                        })
                    )}
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
                    <img
                        src={profileImage}
                        alt={profileName}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="w-[3rem] h-[3rem] rounded-full object-cover border border-border-subtle flex-shrink-0"
                    />
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
                        <p className="body-small text-text-secondary truncate">
                            {t('postedBy', { user: 'Admin' })} · {category} · {postDate}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {renderContent()}

            {/* Images */}
            {renderImages()}

            {/* Reaction Bar */}
            <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b-[0.01rem] border-border-subtle">
                <ButtonType3
                    className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem] p-0 min-w-0 border-0 bg-transparent"
                    onClick={handleLike}
                >
                    <GoHeartFill
                        className={`w-[1.25rem] h-[1.25rem] ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`}
                    />
                    <span>{likeCount}</span>
                </ButtonType3>

                <ButtonType3
                    className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem] p-0 min-w-0 border-0 bg-transparent"
                    onClick={toggleComments}
                >
                    <Image width={20} height={20} src="/COMMENT.svg" alt="comments" className="w-[amia 1.25rem] h-[1.25rem] object-contain" />
                    <span>{commentCount}</span>
                </ButtonType3>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-[1rem]">
                    <ButtonType3
                        className="inline-flex items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]"
                        onClick={handleLike}
                    >
                        <Image width={20} height={20} src="/LIKE.svg" alt="like" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('like')}</span>
                    </ButtonType3>

                    <ButtonType3
                        className="inline-flex items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]"
                        onClick={toggleCommentInput}
                    >
                        <Image width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('comment')}</span>
                    </ButtonType3>

                    <ButtonType3
                        className="inline-flex items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]"
                        onClick={() => setShowShareModal(true)}
                    >
                        <Image width={20} height={20} src="/SHARE.svg" alt="share" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('share')}</span>
                    </ButtonType3>
                </div>

                <ButtonType3
                    className="inline-flex items-center gap-[0.5rem] text-sm body-small min-w-0 p-0 border-0 bg-transparent max-lg:flex-col max-lg:gap-[0.25rem]"
                    onClick={handleSave}
                >
                    <Bookmark
                        className={`w-[1.25rem] h-[1.25rem] ${isSaved ? 'fill-brand text-brand' : 'text-text-secondary'}`}
                    />
                    <span className={isSaved ? 'text-brand' : 'text-text-secondary'}>{t('save')}</span>
                </ButtonType3>
            </div>

            {/* Comments Section – only YOUR comments */}
            <div>
                {renderCommentInput()}
                {renderComments()}
            </div>

            <SharePostModal
                open={showShareModal}
                onClose={() => setShowShareModal(false)}
                postId={resolvedPostId}
                onShared={onShare}
            />
        </div>
    );
}