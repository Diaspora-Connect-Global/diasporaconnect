'use client';
import { Bookmark } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal'
import { UserBadge } from "@/components/custom/userBadge";


/* --------------------------------------------------------------- */
/*  Types (unchanged – kept for reference)                        */
/* --------------------------------------------------------------- */
interface Comment {
    id: string;
    author: string;
    authorImage: string;
    content: string;
    createdAt: string;
    likes: number;
}

interface FeedCardProps {
    profileImage: string;
    profileName: string;
    category: string;
    postDate: string;
    content: string;
    images?: string[];
    likes: number;
    comments: number;
    commentsData?: Comment[];
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: () => void;
    onSendComment?: (content: string, parentId?: string) => void;
    joinButton?: boolean;
}

/* --------------------------------------------------------------- */
/*  Component                                                       */
/* --------------------------------------------------------------- */
export default function FeedCardWithReply({
    profileImage,
    profileName,
    category,
    postDate,
    content,
    images,
    likes,
    comments,
    commentsData = [],
    onLike,
    onComment,
    onShare,
    onSave,
    onSendComment,
    joinButton = true,
}: FeedCardProps) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(likes);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentCount, setCommentCount] = useState(comments);
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);

    const t = useTranslations('actions');

    /* ------------------- Interaction Handlers ------------------- */
    const handleLike = () => {
        setIsLiked((v) => !v);
        setLikeCount((c) => (isLiked ? c - 1 : c + 1));
        onLike?.();
    };

    const handleSave = () => {
        setIsSaved((v) => !v);
        onSave?.();
    };

    const toggleExpand = () => setIsExpanded((v) => !v);
    const toggleComments = () => setShowComments((v) => !v);
    const toggleCommentInput = () => {
        setShowCommentInput(true);
        onComment?.();
    };

    const handleReplyClick = (commentId: string) => {
        setReplyToCommentId((cur) => (cur === commentId ? null : commentId));
    };

    /** Called by MessageInputGlobal – adds a comment or a reply */
    const handleSend = (text: string, parentId?: string) => {
        if (!text.trim() || !onSendComment) return;

        onSendComment(text, parentId);
        setCommentCount((c) => c + 1);
        setShowComments(true);
        setShowCommentInput(false);          // hide main input after posting
        setReplyToCommentId(null);           // hide any open reply input
    };

    /* ------------------- Render Helpers ------------------- */
    const renderContent = () => {
        const max = 200;
        const truncated = content.length > max && !isExpanded;

        return (
            <>
                <p className="font-body-medium text-text-primary leading-relaxed mb-[1rem]">
                    {truncated ? `${content.slice(0, max)}...` : content}
                {truncated && (
                    <span
                        onClick={toggleExpand}
                        className="text-text-brand  text-xs cursor-pointer"
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
                // Single image - full width
                <div className="relative w-full h-[15rem] rounded-lg overflow-hidden">
                    <Image src={images[0]} alt="post" fill className="object-cover" />
                </div>
            ) : imageCount === 2 ? (
                // Two images - two columns
                <div className="grid grid-cols-2 gap-[0.5rem]">
                    {images.map((src, i) => (
                        <div key={i} className="relative h-[15rem] rounded-lg overflow-hidden">
                            <Image src={src} alt={`post ${i + 1}`} fill className="object-cover" />
                        </div>
                    ))}
                </div>
            ) : imageCount === 3 ? (
                // Three images - 1 left, 2 right stacked
                <div className="grid grid-cols-2 gap-[0.5rem]">
                    <div className="relative h-[30.5rem] rounded-lg overflow-hidden">
                        <Image src={images[0]} alt="post 1" fill className="object-cover" />
                    </div>
                    <div className="flex flex-col gap-[0.5rem]">
                        <div className="relative h-[15rem] rounded-lg overflow-hidden">
                            <Image src={images[1]} alt="post 2" fill className="object-cover" />
                        </div>
                        <div className="relative h-[15rem] rounded-lg overflow-hidden">
                            <Image src={images[2]} alt="post 3" fill className="object-cover" />
                        </div>
                    </div>
                </div>
            ) : (
                // Four or more images - 2x2 grid, with overlay on last image if more than 4
                <div className="grid grid-cols-2 gap-[0.5rem]">
                    {images.slice(0, maxDisplay).map((src, i) => (
                        <div
                            key={i}
                            className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => {
                                if (i === maxDisplay - 1 && excessCount > 0) {
                                    // Handle showing all images
                                    console.log('Show all images');
                                }
                            }}
                        >
                            <Image src={src} alt={`post ${i + 1}`} fill className="object-cover" />
                            {i === maxDisplay - 1 && excessCount > 0 && (
                                <div className="absolute inset-0 bg-black/10 bg-opacity-60 flex items-center justify-center">
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

    const renderCommentInput = () => {
        if (!showCommentInput) return null;

        return (
            <div className="my-[1rem] flex items-center space-x-2">
                <Image
                    src={"https://github.com/shadcn.png"}
                    alt={"image"}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className='flex-1'>
                    <MessageInputGlobal
                        onSendMessage={(txt: string) => handleSend(txt)}
                        placeholder={"Type comment..."}
                        reversed={true}
                        reversedText="Comment"
                    />

                </div>
            </div>
        );
    };

    const renderReplyInput = (commentId: string) => {
        if (replyToCommentId !== commentId) return null;

        return (
            <div className="mt-[1rem] ml-[3rem] flex items-center justify-end space-x-2">
                <Image
                    src={"https://github.com/shadcn.png"}
                    alt={"image"}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <MessageInputGlobal
                    onSendMessage={(txt: string) => handleSend(txt, commentId)}
                    placeholder={"Type a reply..."}
                    reversed={true}
                    reversedText="Reply"
                />
            </div>
        );
    };

    const renderComments = () => {
        if (!showComments) return null;

        return (
            <div className={`pt-[1rem] ${showCommentInput ? '' : 'mt-[1rem]'} border-t border-border-subtle`}>
                <div className="max-h-[12rem] overflow-y-auto mb-[1rem] space-y-[1.5rem]">
                    {commentsData.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-[2rem]">
                            {t('noComments')}
                        </p>
                    ) : (
                        commentsData.map((c) => (
                            <div key={c.id}>
                                {/* ----- Comment ----- */}
                                <div className="flex gap-[0.75rem]">

                                    <div className="flex-1 min-w-0">
                                        <div className=" flex items-center justify-between gap-[0.5rem] mb-[0.25rem]">
                                            <div className='flex text-center items-center justify-center space-x-2'>
                                                <Image
                                                    src={c.authorImage}
                                                    alt={c.author}
                                                    width={40}
                                                    height={40}
                                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                />

                                                <span className="font-semibold text-text-primary text-sm">{c.author}</span>
                                                <span>
                                                    <UserBadge tier="starter" size="xs" />
                                                </span>
                                            </div>
                                            <span className="text-text-secondary text-xs">{c.createdAt}</span>
                                        </div>
                                        <div className='ml-10'>

                                        <p className="font-body-small text-text-primary break-words mb-[0.5rem]">
                                            {c.content}
                                        </p>
                                        <div className="flex items-center gap-[1rem]">
                                            <button className="text-sm font-semibold text-text-brand">
                                                {t('like')}
                                            </button>
                                            <button
                                                onClick={() => handleReplyClick(c.id)}
                                                className="text-sm font-semibold text-text-brand"
                                            >
                                                {t('reply')}
                                            </button>
                                            <span className="text-text-secondary text-xs">|</span>
                                            <span className="text-text-secondary text-xs">{c.likes} {t('likes')}</span>
                                            <span className="text-text-secondary text-xs">5 {t('replies')}</span>
                                        </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ----- Reply Input (inline) ----- */}
                                {renderReplyInput(c.id)}
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
        <div className="w-full  bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]">
            {/* Header */}
            <div className="flex items-center justify-between mb-[1rem]">
                <div className="lg:flex items-center gap-[0.75rem]">
                    <Image
                        width={40}
                        height={40}
                        src={profileImage}
                        alt={profileName}
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
                <button
                    className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                    onClick={handleLike}
                >
                    <GoHeartFill
                        className={`w-[1.25rem] h-[1.25rem] ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`}
                    />
                    <span>{likeCount}</span>
                </button>
                <button
                    className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                    onClick={toggleComments}
                >
                    <Image width={20} height={20} src="/COMMENT.svg" alt="comments" className="w-[1.25rem] h-[1.25rem] object-contain" />
                    <span>{commentCount}</span>
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-[1rem]">
                    <button
                        className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={handleLike}
                    >
                        <Image width={20} height={20} src="/LIKE.svg" alt="like" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('like')}</span>
                    </button>
                    <button
                        className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={toggleCommentInput}
                    >
                        <Image width={20} height={20} src="/COMMENT.svg" alt="comment" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('comment')}</span>
                    </button>
                    <button
                        className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={onShare}
                    >
                        <Image width={20} height={20} src="/SHARE.svg" alt="share" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{t('share')}</span>
                    </button>
                </div>
                <button
                    className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                    onClick={handleSave}
                >
                    <Bookmark
                        className={`w-[1.25rem] h-[1.25rem] ${isSaved ? 'fill-current text-text-primary' : 'text-text-secondary'}`}
                    />
                    <span>{t('save')}</span>
                </button>
            </div>

            {/* Comments Section */}
            <div>
                {renderCommentInput()}
                {renderComments()}
            </div>
        </div>
    );
}