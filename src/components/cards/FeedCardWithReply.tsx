'use client';
import { Bookmark, X, ChevronLeft, ChevronRight, Loader2, Globe, Users, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal';
import { UserBadge, type Tier } from "@/components/custom/userBadge";
import Avatar from '@/components/cards/media/Avatar';
import { CategoryBadge } from "@/components/home/CategoryBadge";
import { formatCount } from '@/macros/formatCount';
import { renderRichText, MentionMap, buildMentionMap, buildMentionInputsFromText, isShortEmojiOnly, type MentionInputItem } from '@/components/custom/richTextRenderer';
import { useUserStore } from '@/store/useUserStore';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { GET_POST_COMMENTS, LIKE_COMMENT, REMOVE_COMMENT_LIKE, DELETE_POST, EDIT_POST, UPDATE_POST_VISIBILITY, EDIT_COMMENT, DELETE_COMMENT, GetPostCommentsData, LikeCommentData, RemoveCommentLikeData, EditCommentData, DeleteCommentData } from '@/services/gql/postsFeed';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/custom/VideoPlayer';
import FileAttachmentCard from '@/components/cards/FileAttachmentCard';
import { LinkPreviewCard } from '@/components/chats/LinkPreviewCard';
import { getFirstUrlInText } from '@/lib/urlPreview';
import { truncateAtWord } from '@/lib/truncateText';
import ImageGrid from '@/components/cards/media/ImageGrid';
import type { PostDocument } from '@/lib/normalizeFeedPost';
import ReactionBar2 from '@/components/reactions/ReactionBar2';
import ReactionRail from '@/components/reactions/ReactionRail';
import {
    DEFAULT_REACTION,
    planReactionWrite,
    readSelectedReaction,
    type ReactionBreakdown,
    type ReactionKind,
    type SessionReactionPick,
} from '@/components/reactions/reactionAdapter';

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
    authorEntityId?: string;
    authorEntityType?: 'COMMUNITY' | 'ASSOCIATION' | 'USER' | 'ORG' | string;
    profileTier?: Tier;
    category: string;
    /**
     * AI-classified category (from ai-service). Shown as a colored
     * pill at the top of the card via `<CategoryBadge>`. Hidden when
     * undefined / empty — legacy or in-flight posts never show a
     * placeholder. Distinct from `category` above, which is the
     * legacy author-type meta text rendered next to the date.
     */
    aiCategory?: string;
    postDate: string;
    createdAt?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';
    content: string;
    mentionMap?: MentionMap;
    images?: string[];
    /**
     * LQIP blur-up lookup by image URL. Built from the post's attachments
     * (`url` → `blurDataUrl`) so each grid tile can render a backend-provided
     * blur placeholder while the full image decodes. Absent URLs fall back to
     * the shimmer treatment in {@link PostImage}.
     */
    blurFor?: (url: string) => string | undefined;
    /**
     * Intrinsic-dimensions lookup by image URL (attachment `url` → `{width,height}`),
     * built from `post.dimsByUrl`. Passed through to {@link ImageGrid} so a single
     * image can reserve its real aspect ratio up-front (no layout shift). Mirrors
     * {@link blurFor}: the parent supplies a reference-stable function per post so the
     * card's React.memo isn't defeated. No-op until the backend emits width/height.
     */
    dimsFor?: (url: string) => { width?: number; height?: number } | undefined;
    /**
     * Above-the-fold LCP hint. When true the FIRST image of this card is given
     * Next/Image `priority` (+ fetchPriority="high"). Only set for the very
     * first feed card; everything else stays lazy.
     */
    priorityFirstImage?: boolean;
    /** Video attachment URLs (e.g. from mimeType video/*). Loaded with preload="metadata" and viewport-aware. */
    videos?: string[];
    /** Document/audio attachments (everything that isn't image/video), rendered as file cards. */
    documents?: PostDocument[];
    likes: number;
    comments: number;
    shares: number;
    /**
     * The reaction the SERVER recorded for this viewer: 'HAPPY' | 'HOPEFUL' |
     * 'SAD', or null.
     *
     * `null` on a post the viewer HAS liked is meaningful and not the same as
     * "no reaction": it is a PRE-MIGRATION like, stored before reaction types
     * existed. It displays as Happy and must never be written back as HAPPY —
     * see `readSelectedReaction` in ../reactions/reactionAdapter.
     */
    serverReaction?: ReactionKind | null;
    /**
     * Per-kind counts. UNDEFINED MEANS NOT MEASURED, which is not the same as
     * all-zero: absent, the cluster infers its glyphs honestly (untyped likes
     * read as Happy, plus the viewer's own pick) and withholds the itemised
     * numbers rather than presenting an inference as a measurement. Never
     * synthesise `{HAPPY:0,HOPEFUL:0,SAD:0}` to fill this in.
     */
    reactionBreakdown?: ReactionBreakdown;
    commentsData?: Comment[];
    // Handlers receive the post id as the first argument so the parent can
    // wire them as stable `useCallback` references without an inline arrow
    // per card per render — that arrow recreation was the dominant cause of
    // every visible card re-rendering on every `loadMore`.
    /**
     * The BINARY like callback. Still supported and still the default: a caller
     * that passes only this gets exactly the card it got before reactions
     * existed — the Like button, the heart-and-count chip, no rail, no cluster.
     * Nothing about it changed, and nothing about it is deprecated for a
     * surface that genuinely only has a like.
     */
    onLike?: (postId: string, liked: boolean) => void;
    /**
     * Fired when the viewer's reaction changes. `op` is 'add' (write or switch)
     * or 'remove'; `reaction` is the kind to store on an add.
     *
     * PASSING THIS IS WHAT TURNS THE REACTION UI ON. It is the one signal that
     * the caller can actually persist a Hopeful or a Sad; without it the rail
     * would offer two choices that silently collapse into a plain like on the
     * next refetch, which is worse than not offering them. Same signature as
     * FeedCard2's, so a call site can be moved between the two cards verbatim.
     *
     * Replaces `onLike` for such callers: a boolean cannot express WHICH of the
     * three was chosen, and a switch is neither a like nor an unlike — it
     * updates the row in place and must not move the total.
     */
    onReact?: (
        postId: string,
        op: 'add' | 'remove',
        reaction: ReactionKind | null,
        totalDelta: number,
        /**
         * What was selected BEFORE this change. The parent cannot re-derive it
         * — it only knows `hasLiked`, which is true for all three kinds — so a
         * refused mutation could not roll back to the right icon without it.
         */
        previousReaction: ReactionKind | null,
    ) => void;
    onComment?: () => void;
    onShare?: (postId: string) => void;
    onSave?: (postId: string, saved: boolean) => void;
    onSendComment?: (
        postId: string,
        content: string,
        parentId?: string,
        mentions?: MentionInputItem[],
    ) => void;
    onDelete?: (postId: string) => void;
    joinButton?: boolean;
    isLiked?: boolean;
    isSaved?: boolean;
    isShared?: boolean;
    /** From e.g. /post/[id]?commentId=… — expand comments, load list, scroll to and highlight that comment */
    initialFocusCommentId?: string;
    onNavigatePost?: (direction: 'next' | 'prev') => void;
    /** When provided the card skips its internal modal and delegates to the page-level one. */
    // Receives `postId` so the parent can wire a single stable
    // `useCallback` reference. See note on `onLike` above.
    onOpenMedia?: (postId: string, mediaIndex: number) => void;
}

/* --------------------------------------------------------------- */
/*  Component                                                       */
/* --------------------------------------------------------------- */
// Transitional shape — `authorTier`/`authorVerificationTier`/`authorTrustScore`
// are landing on the GQL `Comment` type in a parallel sweep. Once those land,
// remove the intersection cast and read the fields directly off `ApiComment`.
type CommentTrustFields = {
    // `authorTrustTier` is the tier field returned by GET_POST_COMMENTS.
    authorTrustTier?: string;
    authorVerificationTier?: string;
    authorTrustScore?: number;
};

/** Default avatar for an author with no image — entity authors (community/
 *  association/org) fall back to the globe, individual users to the person icon. */
function entityFallbackAvatar(authorType?: string): string {
    const upper = authorType?.toUpperCase();
    return upper === 'COMMUNITY' || upper === 'ASSOCIATION' || upper === 'ORG'
        ? '/GLOBE.png'
        : '/PROFILE.png';
}

/** Map an API Comment to the local Comment shape. Use authorDisplayName/authorAvatarUrl from API when present. */
function mapApiComment(c: ApiComment): Comment {
    const mentionMap = buildMentionMap(c.mentions ?? []);

    const selfMention = c.mentions?.find(m => m.entityId === c.authorId);
    const authorName = c.authorDisplayName ?? selfMention?.displayName ?? selfMention?.handle ?? c.authorId;
    const authorAvatar = c.authorAvatarUrl ?? selfMention?.avatarUrl ?? entityFallbackAvatar(c.authorType);

    const trust = c as ApiComment & CommentTrustFields;

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
            tier: trust.authorTrustTier,
            verificationTier: trust.authorVerificationTier,
            trustScore: trust.authorTrustScore,
        }),
    };
}

function FeedCardWithReplyInner({
    postId,
    profileImage,
    profileName,
    authorUserId,
    authorEntityId,
    authorEntityType,
    profileTier,
    category,
    aiCategory,
    postDate,
    createdAt,
    visibility,
    content,
    mentionMap,
    images,
    blurFor,
    dimsFor,
    priorityFirstImage = false,
    videos = [],
    documents = [],
    likes,
    comments,
    shares,
    serverReaction = null,
    reactionBreakdown,
    commentsData: commentsDataProp = [],
    onLike,
    onReact,
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
    /**
     * Is this call site reaction-aware?
     *
     * The presence of `onReact` is the ONLY test, and it is deliberately a
     * capability test rather than a feature flag: `onReact` is the only route
     * by which a Hopeful or a Sad can reach the server, so a caller without one
     * cannot store them. Showing the rail anyway would offer three choices of
     * which two quietly degrade to a plain like on the next refetch — a card
     * that lies about what it recorded, on a bereavement post especially.
     *
     * So a caller that has not migrated keeps EXACTLY the card it had: the Like
     * button, the heart-and-count chip, `handleLike`'s original binary body.
     * Nothing below is conditional on anything else, and no hook is conditional
     * on this — only what is rendered.
     */
    const reactionsEnabled = typeof onReact === 'function';
    /**
     * The reaction picked in THIS session — TRI-STATE, and the third state is
     * the whole point.
     *
     *   undefined → the viewer has not touched this post; the server wins.
     *   null      → the viewer deliberately CLEARED their reaction.
     *   a kind    → the viewer picked that one.
     *
     * Collapsing `null` and `undefined` into one nullable value makes a
     * deselect indistinguishable from no-opinion, so the stale server reaction
     * re-selects itself on the very next render and the clear appears not to
     * have registered.
     */
    const [sessionReaction, setSessionReaction] = useState<SessionReactionPick>(undefined);
    const [breakdown, setBreakdown] = useState<ReactionBreakdown | undefined>(reactionBreakdown);
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

    const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState<'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'>(
        (visibility as 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE') ?? 'PUBLIC',
    );
    const [updateVisibilityMutation, { loading: visibilityLoading }] = useMutation(UPDATE_POST_VISIBILITY);

    const handleVisibilitySubmit = async () => {
        // Backend canonical values:
        //   PUBLIC      → 'EVERYONE'
        //   CONNECTIONS → 'FRIENDS'
        //   PRIVATE     → 'ONLY_ME'
        const beValue =
            selectedVisibility === 'PUBLIC' ? 'EVERYONE'
                : selectedVisibility === 'CONNECTIONS' ? 'FRIENDS'
                    : 'ONLY_ME';
        try {
            const result = await updateVisibilityMutation({ variables: { postId, visibility: beValue } });
            const outcome = readMutationOutcome(result, d => d.updatePostVisibility);
            if (!outcome.ok) {
                const key = refusalMessageKey(outcome.message, 'feed.errors');
                toast.error(tRoot(key));
                return;
            }
            setVisibilityModalOpen(false);
            toast.success('Visibility updated');
        } catch (err) {
            toast.error('Failed to update visibility');
            console.error(err);
        }
    };

    const handleDeletePostConfirm = async () => {
        try {
            const result = await deletePost({ variables: { id: postId } });
            const outcome = readMutationOutcome(result, d => d.deletePost);
            if (!outcome.ok) {
                const key = refusalMessageKey(outcome.message, 'feed.errors');
                toast.error(tRoot(key));
                return;
            }
            setDeletePostModalOpen(false);
            toast.success('Post deleted');
            onDelete?.(postId);
        } catch {
            toast.error('Failed to delete post');
        }
    };

    const hasAnyMedia = (images?.length ?? 0) + (videos?.length ?? 0) > 0;

    const handleEditPostSubmit = async () => {
        if (!editPostText.trim() && !hasAnyMedia) return;
        try {
            const result = await editPostMutation({ variables: { input: { id: postId, text: editPostText } } });
            const outcome = readMutationOutcome(result, d => d.editPost);
            if (!outcome.ok) {
                const key = refusalMessageKey(outcome.message, 'feed.errors');
                toast.error(tRoot(key));
                return;
            }
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
            const result = await editCommentMutation({ variables: { input: { commentId, text: newText } } });
            const outcome = readMutationOutcome(result, d => d.editComment);
            if (!outcome.ok) {
                if (previous) {
                    setLoadedComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: previous.content } : c));
                }
                setEditingCommentId(commentId);
                const key = refusalMessageKey(outcome.message, 'feed.errors');
                toast.error(tRoot(key));
                return;
            }
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
            const result = await deleteCommentMutation({ variables: { input: { commentId } } });
            const outcome = readMutationOutcome(result, d => d.deleteComment);
            if (!outcome.ok) {
                setLoadedComments((prev) => {
                    const exists = prev.some((c) => c.id === commentId);
                    return exists ? prev : loadedComments;
                });
                setCommentCount((c) => c + 1);
                const key = refusalMessageKey(outcome.message, 'feed.errors');
                toast.error(tRoot(key));
                return;
            }
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
    // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED
    // key path (e.g. 'feed.errors.not_found'), so it must be handed to an
    // UNSCOPED translator or next-intl prefixes the scope and resolves nothing.
    const tRoot = useTranslations();

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

    // The per-kind breakdown is OWNED BY THE PARENT. This card never mutates it
    // locally; it only mirrors what it is handed, so the two can never
    // disagree.
    //
    // Keyed on the three VALUES, not on the object. The parent rebuilds that
    // literal on every render, so depending on its identity re-ran this
    // constantly — which is how an optimistic switch got overwritten by the
    // stale server counts before the eye could see it.
    //
    // A partial breakdown collapses to `undefined` rather than to zeros:
    // undefined means NOT MEASURED, and inventing a 0 for a kind the server
    // never reported would present a guess as a count.
    const bdHappy = reactionBreakdown?.HAPPY;
    const bdHopeful = reactionBreakdown?.HOPEFUL;
    const bdSad = reactionBreakdown?.SAD;
    useEffect(() => {
        setBreakdown(
            bdHappy === undefined || bdHopeful === undefined || bdSad === undefined
                ? undefined
                : { HAPPY: bdHappy, HOPEFUL: bdHopeful, SAD: bdSad },
        );
    }, [bdHappy, bdHopeful, bdSad]);

    // Drop the local pick when the SERVER genuinely says something new.
    //
    // This keys on `serverReaction`, NOT on `isLiked`. Keying it on the like
    // flag is the "first click always selects Happy" bug: tapping Sad calls
    // onReact, the parent optimistically flips hasLiked, that flips the
    // `initialIsLiked` PROP, this effect fires and nulls the 'SAD' that was
    // just set — and readSelectedReaction then falls through to its
    // hasLiked -> HAPPY branch. The second tap appears to work only because the
    // prop is already true by then, so the dependency never changes and the
    // effect never re-runs.
    //
    // Resetting to `undefined` (not null) hands authority back to the server
    // rather than asserting "the viewer cleared this".
    useEffect(() => {
        setSessionReaction(undefined);
    }, [serverReaction]);

    /**
     * The reaction that renders as selected — local intent first, then the
     * server's value, then the `hasLiked` → Happy fallback for a pre-migration
     * untyped like.
     *
     * A LEGACY CALLER NEVER CONSULTS `sessionReaction`. That is not a shortcut,
     * it preserves a real behaviour: without `onReact` the only signal the
     * parent can send back is `isLiked`, and a parent that ROLLS BACK a refused
     * like flips exactly that prop. A session pick would outrank the rollback
     * and leave the heart lit on a like the server refused. With no rail there
     * is nothing but Happy to express anyway, so `isLiked` is the complete
     * truth and deferring to it is both simpler and more correct.
     */
    const selectedReaction = reactionsEnabled
        ? readSelectedReaction({ hasLiked: isLiked, reaction: serverReaction }, sessionReaction)
        : isLiked
          ? DEFAULT_REACTION
          : null;

    /* ------------------- Interaction Handlers ------------------- */
    /**
     * Select / change / clear the reaction.
     *
     * The mapping onto what the backend stores lives entirely in
     * `planReactionWrite` (../reactions/reactionAdapter) — this function only
     * applies the plan. All three reactions round-trip: each is stored as a
     * LIKE row carrying a reaction_type, so a SWITCH updates that row in place
     * and must not move the total.
     */
    const handleSelectReaction = (kind: ReactionKind | null) => {
        const plan = planReactionWrite(selectedReaction, kind);

        // What the parent must restore if the mutation is refused. This is the
        // RAW prior `myReaction`, NOT the derived `selectedReaction`.
        //
        // They differ for a pre-migration untyped like, where `hasLiked` is
        // true and `myReaction` is null: `selectedReaction` reports HAPPY for
        // DISPLAY, so rolling back with it would write a claimed 'HAPPY' onto a
        // row that never had a reaction type — turning a refused mutation into
        // a silent data change.
        const previousReaction = serverReaction ?? null;

        setSessionReaction(kind);
        // `breakdown` is deliberately NOT touched here. `onReact` makes the
        // parent move the counts and the effect above re-syncs this card from
        // that result, so a local mutation would be overwritten moments later
        // and only ever serve to disagree with the parent in the meantime.

        if (plan.op === null) return;
        setIsLiked(plan.liked ?? false);
        setLikeCount((c) => Math.max(0, c + plan.totalDelta));

        if (onReact) {
            onReact(postId, plan.op, plan.reaction, plan.totalDelta, previousReaction);
            return;
        }
        // No reaction-aware callback: the only thing this caller can express is
        // liked / not liked. Unreachable while the rail and the cluster are
        // gated on `reactionsEnabled`, but it keeps the component correct on
        // its own rather than correct only because of where it is rendered.
        if (plan.liked !== null) onLike?.(postId, plan.liked);
    };

    /**
     * The bare "Like" affordances — the action-row button, the image hover
     * overlay, both media-modal bars. Happy IS the Like, so on a
     * reaction-aware card they route through the same selection path as the
     * rail and the two surfaces can never disagree.
     *
     * The legacy branch is the ORIGINAL function, unchanged, on purpose: a
     * caller that has not migrated should be able to read it and see the code
     * it has always run rather than have to prove an equivalence.
     */
    const handleLike = () => {
        if (reactionsEnabled) {
            handleSelectReaction(selectedReaction === DEFAULT_REACTION ? null : DEFAULT_REACTION);
            return;
        }
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount((c) => newLikedState ? c + 1 : c - 1);
        onLike?.(postId, newLikedState);
    };

    const handleSave = () => {
        const next = !isSaved;
        setIsSaved(next);
        onSave?.(postId, next);
    };

    const handleShare = () => {
        setShowShareDialog(true);
    };

    const handleShared = () => {
        const newSharedState = true;
        setIsShared(newSharedState);
        setShareCount((c) => c + 1);
        onShare?.(postId);
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

    const goToProfile = useCallback((id?: string, authorType?: string) => {
        if (!id) return;
        const upper = authorType?.toUpperCase();
        if (upper === 'COMMUNITY') {
            router.push(`/community/${id}`);
            return;
        }
        if (upper === 'ASSOCIATION') {
            router.push(`/association/${id}`);
            return;
        }
        if (upper && upper !== 'USER') return;
        if (currentUserId && id === currentUserId) {
            router.push('/profile');
            return;
        }
        router.push(`/${id}`);
    }, [router, currentUserId]);

    const toggleCommentInput = () => {
        // Keep the functional updater pure — Apollo v4 forbids `useLazyQuery`
        // execute() calls from inside setState updaters (and from render),
        // because updaters may run multiple times under StrictMode. Compute
        // the next value, set state directly, then run the side effects.
        const willShow = !showCommentInput;
        setShowCommentInput(willShow);
        if (willShow) {
            setShowComments(true);
            loadComments();
        }
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
        if (onOpenMedia) { onOpenMedia(postId, index); return; }
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
            const result = onSendComment(postId, preparedText, parentId, mentions.length ? mentions : undefined);
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
                            disabled={editPostLoading || (!editPostText.trim() && !hasAnyMedia)}
                        >
                            {editPostLoading ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            );
        }
        const max = 200;
        const { text: collapsed, truncated: willTruncate } = truncateAtWord(postContent, max);
        const truncated = willTruncate && !isExpanded;
        const displayText = truncated ? `${collapsed}…` : postContent;
        const emojiOnly = isShortEmojiOnly(postContent);

        return (
            <>
                <p dir="auto" className={`text-text-primary leading-relaxed mb-[1rem] whitespace-pre-wrap break-words ${emojiOnly ? 'text-3xl leading-snug' : 'body-medium'}`}>
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

    /** Hover overlay (like + comment) shared across every image tile. */
    const imageHoverOverlay = (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-[1.5rem]">
            <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1 text-white">
                <GoHeartFill className={`w-7 h-7 drop-shadow ${isLiked ? 'text-red-400' : 'text-white'}`} />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleCommentInput(); }} className="flex flex-col items-center gap-1 text-white">
                <img width={28} height={28} src="/COMMENT.svg" alt="comment" className="w-7 h-7 object-contain drop-shadow brightness-0 invert" />
            </button>
        </div>
    );

    const renderImages = () => {
        if (!images?.length) return null;
        const imageCount = images.length;
        // Descriptive alt: author + a snippet of the post text, so screen
        // readers and image-failed states convey context (vs. generic "post").
        const altBase = profileName ? `${profileName}'s post` : 'Post image';
        const altSnippet = postContent ? `: ${truncateAtWord(postContent, 80).text}` : '';
        const imgAlt = (i: number) =>
            imageCount > 1 ? `${altBase} (image ${i + 1} of ${imageCount})${altSnippet}` : `${altBase}${altSnippet}`;

        return (
            <ImageGrid
                images={images}
                alt={imgAlt}
                onOpen={openMediaModal}
                overlay={imageHoverOverlay}
                singleVariant="contain"
                blurFor={blurFor}
                dimsFor={dimsFor}
                priority={priorityFirstImage}
            />
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
                        autoplayInView
                        onOpenModal={() => openMediaModal((images?.length ?? 0) + i)}
                    />
                ))}
            </div>
        );
    };

    const renderDocuments = () => {
        if (!documents?.length) return null;
        return (
            <div className="mb-[1rem] flex flex-col gap-[0.5rem]">
                {documents.map((doc, i) => (
                    <FileAttachmentCard
                        key={`${doc.url}-${i}`}
                        url={doc.url}
                        fileName={doc.fileName}
                        mimeType={doc.mimeType}
                        size={doc.size}
                    />
                ))}
            </div>
        );
    };

    /** First URL in the post text — rendered as an OG preview card below the content.
     *  Suppressed when the post already has media/document attachments. */
    const hasAttachments = (images?.length ?? 0) > 0 || videos.length > 0 || documents.length > 0;
    const previewUrl = hasAttachments ? null : getFirstUrlInText(postContent);

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
                <Avatar src={profileImage} alt={profileName} size={40}
                    className={`w-10 h-10 rounded-full object-cover border border-border-subtle flex-shrink-0 ${(authorEntityId ?? authorUserId) ? 'cursor-pointer' : ''}`}
                    onClick={(authorEntityId ?? authorUserId) ? () => goToProfile(authorEntityId ?? authorUserId, authorEntityType ?? 'USER') : undefined} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span
                            className={`font-semibold text-text-primary text-sm truncate ${(authorEntityId ?? authorUserId) ? 'cursor-pointer hover:text-text-brand' : ''}`}
                            onClick={(authorEntityId ?? authorUserId) ? () => goToProfile(authorEntityId ?? authorUserId, authorEntityType ?? 'USER') : undefined}
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
                            <Avatar src={c.authorImage || entityFallbackAvatar(c.authorType)} alt={c.author} size={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => goToProfile(c.authorId, c.authorType)} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-semibold text-text-primary text-sm truncate cursor-pointer hover:text-text-brand" onClick={() => goToProfile(c.authorId, c.authorType)}>{c.author}</span>
                                    {c.authorTier && <UserBadge tier={c.authorTier} size="xs" />}
                                    <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(c.createdAt)}</span>
                                </div>
                                <p dir="auto" className="body-small text-text-primary break-words mb-2 whitespace-pre-wrap">{renderText(c.content, c.mentionMap)}</p>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => handleLikeComment(c.id)} className={`text-xs font-semibold transition-colors ${c.hasLiked ? 'text-border-danger' : 'text-text-secondary hover:text-text-brand'}`}>{t('like')}</button>
                                    <button onClick={() => setModalReplyToId(cur => cur === c.id ? null : c.id)} className="text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors">{t('reply')}</button>
                                    <span className="text-text-tertiary text-xs">{formatCount(c.likes)} {t('likes')}</span>
                                </div>
                            </div>
                        </div>
                        {modalReplyToId === c.id && (
                            <div className="mt-3 ml-11 flex items-center gap-2">
                                <Avatar src={currentUserAvatar} alt="You" size={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                <div className="flex-1">
                                    <MessageInputGlobal onSendMessage={(txt, _img, mm) => handleSend(txt, c.id, mm)} placeholder={t('replyPlaceholder')} reversed={true} reversedText={t('reply')} onMentionSearch={fetchMentions} />
                                </div>
                            </div>
                        )}
                        {(repliesByParentM.get(c.id)?.length ?? 0) > 0 && (
                            <div className="ml-11 mt-3 space-y-3">
                                {repliesByParentM.get(c.id)!.map(reply => (
                                    <div key={reply.id} className="flex gap-3">
                                        <Avatar src={reply.authorImage || entityFallbackAvatar(reply.authorType)} alt={reply.author} size={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => goToProfile(reply.authorId, reply.authorType)} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-semibold text-text-primary text-sm truncate cursor-pointer hover:text-text-brand" onClick={() => goToProfile(reply.authorId, reply.authorType)}>{reply.author}</span>
                                                {reply.authorTier && <UserBadge tier={reply.authorTier} size="xs" />}
                                                <span className="text-text-tertiary text-xs flex-shrink-0">· {formatDateProximity(reply.createdAt)}</span>
                                            </div>
                                            <p dir="auto" className="body-small text-text-primary break-words whitespace-pre-wrap">
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
                <Avatar src={currentUserAvatar} alt="You" size={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
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
                            <p dir="auto" className="body-small text-text-primary whitespace-pre-wrap break-words line-clamp-4">{renderText(postContent, mentionMap)}</p>
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
                        <p dir="auto" className="body-small text-text-primary whitespace-pre-wrap break-words line-clamp-2 mb-3">{renderText(postContent, mentionMap)}</p>
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
                <Avatar
                    src={currentUserAvatar}
                    alt="You"
                    size={40}
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
                <Avatar
                    src={currentUserAvatar}
                    alt="You"
                    size={40}
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
            <p dir="auto" className="body-small text-text-primary break-words mb-[0.5rem] whitespace-pre-wrap">
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
                                    <Avatar
                                        src={c.authorImage || entityFallbackAvatar(c.authorType)}
                                        alt={c.author}
                                        size={32}
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
                                                    src={reply.authorImage || entityFallbackAvatar(reply.authorType)}
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
            {/* `relative` is load-bearing for the reaction rail, twice over.
                The rail is absolutely positioned and clamps its drag to
                `offsetParent`, which `position` alone decides — so this element
                is both what it hangs off and what bounds it. And the cards on
                several of these routes are wrapped in `.feed-card-cv`
                (`content-visibility: auto`), whose implied PAINT CONTAINMENT
                clips to the padding box: a rail that escaped this box would
                simply not be painted, with no error and nothing in the DOM to
                explain it. This padding box sits strictly inside that clip box,
                so clamping to it is conservative in the safe direction.
                No `overflow-hidden` here, and ReactionBar2 also pins an
                invisible anchor to this border for its own edge menu. */}
            <div className="relative w-full bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]">
                {/* ALWAYS-VISIBLE reaction rail, pinned to the card's right
                    edge — but ONLY for a caller that can persist a reaction
                    (see `reactionsEnabled`). Not a menu: the three reactions
                    are permanent chrome, so a reader sees them without having
                    to discover a control first. */}
                {reactionsEnabled && (
                    <ReactionRail selected={selectedReaction} onSelect={handleSelectReaction} />
                )}
                {/* AI category pill — only rendered when the post has been
                    classified. Sits at the top-left of the card, inside the
                    surface so it scrolls with the card content. */}
                {aiCategory && (
                    <div className="mb-3">
                        <CategoryBadge category={aiCategory} />
                    </div>
                )}
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
                            onClick={() => goToProfile(authorEntityId ?? authorUserId, authorEntityType ?? 'USER')}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center">
                                <h3
                                    className="label-large text-text-primary truncate cursor-pointer hover:text-text-brand"
                                    onClick={() => goToProfile(authorEntityId ?? authorUserId, authorEntityType ?? 'USER')}
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
                                {isOwnPost && (
                                    <DropdownMenuItem onSelect={() => setVisibilityModalOpen(true)}>
                                        <Globe className="w-4 h-4 mr-2" /> Change visibility
                                    </DropdownMenuItem>
                                )}
                                {isOwnPost && <DropdownMenuSeparator />}
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
                {renderDocuments()}

                {/* Link preview for the first URL in the post text */}
                {previewUrl && (
                    <div className="mb-[1rem]">
                        <LinkPreviewCard url={previewUrl} variant="feed" />
                    </div>
                )}

                {/* ── THE COUNT ROW ───────────────────────────────────────
                     The COUNT SURVIVES in both modes; only its shape changes.

                     Reaction-aware: the single heart-and-number chip becomes
                     ReactionBar2's glyph cluster + total, which additionally
                     OPENS "who reacted" on a tap. Same position, same row, same
                     rhythm, and it still hides itself when every count is zero.

                     `saveCount={0}` is not a placeholder: this card has never
                     had a `saves` prop and so has no save figure to show. The
                     chip renders only above zero, so passing 0 reproduces
                     today's row exactly rather than displaying a count that
                     would be a guess. `isSaved` is still passed because it is
                     that chip's fill state the day a `saves` prop arrives.

                     Legacy: byte-for-byte the row this card has always drawn. ── */}
                {reactionsEnabled ? (
                    <ReactionBar2
                        // Without this the cluster stays inert: the sheet would
                        // have no post to ask about, so it keeps the old
                        // read-only behaviour and its accessible name falls
                        // back to the bare count rather than promising an
                        // action it cannot perform.
                        postId={postId}
                        selected={selectedReaction}
                        total={likeCount}
                        breakdown={breakdown}
                        isSaved={isSaved}
                        commentCount={displayedCommentCount}
                        shareCount={shareCount}
                        saveCount={0}
                        onSelectReaction={handleSelectReaction}
                        onOpenComments={toggleComments}
                        onShare={handleShare}
                        onSave={handleSave}
                    />
                ) : (
                    /* Reaction Bar - only visible when at least one count > 0 */
                    (likeCount > 0 || displayedCommentCount > 0 || shareCount > 0) && (
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
                    )
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[1rem]">
                        {/* NO Like button on a reaction-aware card, deliberately.
                            Reacting happens in the rail: a second control doing
                            the same job — and only ever able to express HAPPY —
                            would be both redundant and a strictly lesser version
                            of it, since it cannot reach Hopeful or Sad, and two
                            controls disagreeing about what you picked is worse
                            than one.

                            `handleLike` is NOT dead: the image hover overlay and
                            both media-modal bars still call it, and on this card
                            it now routes through the same selection path as the
                            rail. A legacy caller keeps the button exactly where
                            it has always been. */}
                        {!reactionsEnabled && (
                            <button
                                className="inline-flex flex-row lg:flex-row items-center gap-[0.5rem] text-sm body-small text-text-secondary hover:text-text-primary min-w-[3.75rem] max-lg:flex-col max-lg:gap-[0.25rem] max-lg:min-w-0"
                                onClick={handleLike}
                            >
                                <img width={20} height={20} src="/LIKE.svg" alt="like" className="w-[1.25rem] h-[1.25rem] object-contain" />
                                <span>{t('like')}</span>
                            </button>
                        )}
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

            <Dialog open={visibilityModalOpen} onOpenChange={setVisibilityModalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Change visibility</DialogTitle>
                        <DialogDescription>Who can see this post?</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {(['PUBLIC', 'CONNECTIONS', 'PRIVATE'] as const).map((v) => {
                            const Icon = v === 'PUBLIC' ? Globe : v === 'CONNECTIONS' ? Users : Lock;
                            const label = v === 'PUBLIC' ? 'Anyone'
                                : v === 'CONNECTIONS' ? 'Connections only'
                                    : 'Only me';
                            return (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setSelectedVisibility(v)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                                        selectedVisibility === v
                                            ? 'border-border-brand bg-surface-brand/5'
                                            : 'border-border-subtle bg-surface-default hover:bg-surface-subtle'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium text-text-primary text-sm">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <ButtonType3 type="button" onClick={() => setVisibilityModalOpen(false)} disabled={visibilityLoading}>
                            Cancel
                        </ButtonType3>
                        <ButtonType2 type="button" onClick={handleVisibilitySubmit} disabled={visibilityLoading}>
                            {visibilityLoading ? 'Saving...' : 'Save'}
                        </ButtonType2>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Memoize so cards that haven't changed don't re-render when the parent
// re-renders (e.g. when `loadMore` appends a new page). Relies on the
// home-page handlers being stable `useCallback` references — without that,
// memo provides no benefit because props change every render.
const FeedCardWithReply = memo(FeedCardWithReplyInner);
FeedCardWithReply.displayName = 'FeedCardWithReply';
export default FeedCardWithReply;