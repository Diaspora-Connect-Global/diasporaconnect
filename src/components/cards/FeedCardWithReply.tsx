'use client';
import { Bookmark, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';
import MessageInputGlobal from '@/components/custom/messageInputGlobal';
import { UserBadge } from "@/components/custom/userBadge";
import { formatCount } from '@/macros/formatCount';
import { renderRichText } from '@/components/custom/richTextRenderer';
import { useUserStore } from '@/store/useUserStore';

/* --------------------------------------------------------------- */
/*  Types                                                          */
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
export default function FeedCardWithReply({
    profileImage,
    profileName,
    category,
    postDate,
    content,
    images,
    likes,
    comments,
    shares,
    commentsData = [],
    onLike,
    onComment,
    onShare,
    onSave,
    onSendComment,
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
    const [showImageModal, setShowImageModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    const handleShare = () => {
        // Optimistic update
        const newSharedState = !isShared;
        setIsShared(newSharedState);
        setShareCount((c) => newSharedState ? c + 1 : c - 1);
        
        // Call parent handler (which will trigger API call)
        onShare?.();
    };

    const toggleExpand = () => setIsExpanded((v) => !v);
    const toggleComments = () => setShowComments((v) => !v);
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

    /** Called by MessageInputGlobal – adds a comment or a reply */
    const handleSend = (text: string, parentId?: string) => {
        if (!text.trim() || !onSendComment) return;

        onSendComment(text, parentId);
        setCommentCount((c) => c + 1);
        setShowComments(true);
        setShowCommentInput(false);
        setReplyToCommentId(null);
    };

    /* ------------------- Render Helpers ------------------- */
    const renderContent = () => {
        const max = 200;
        const truncated = content.length > max && !isExpanded;
        const displayText = truncated ? `${content.slice(0, max)}...` : content;

        return (
            <>
                <p className="font-body-medium text-text-primary leading-relaxed mb-[1rem]">
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
                        <Image src={images[0]} alt="post" fill className="object-cover" />
                    </div>
                ) : imageCount === 2 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        {images.map((src, i) => (
                            <div 
                                key={i} 
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openImageModal(i)}
                            >
                                <Image src={src} alt={`post ${i + 1}`} fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                ) : imageCount === 3 ? (
                    <div className="grid grid-cols-2 gap-[0.5rem]">
                        <div 
                            className="relative h-[30.5rem] rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => openImageModal(0)}
                        >
                            <Image src={images[0]} alt="post 1" fill className="object-cover" />
                        </div>
                        <div className="flex flex-col gap-[0.5rem]">
                            <div 
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openImageModal(1)}
                            >
                                <Image src={images[1]} alt="post 2" fill className="object-cover" />
                            </div>
                            <div 
                                className="relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => openImageModal(2)}
                            >
                                <Image src={images[2]} alt="post 3" fill className="object-cover" />
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
                                <Image src={src} alt={`post ${i + 1}`} fill className="object-cover" />
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
                            <Image
                                src={images[currentImageIndex]}
                                alt={`Image ${currentImageIndex + 1}`}
                                width={1200}
                                height={800}
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
                                                className={`relative w-20 h-20 rounded-lg cursor-pointer flex-shrink-0 transition-all duration-200 ${
                                                    i === currentImageIndex 
                                                        ? 'ring-3 ring-text-brand scale-110' 
                                                        : 'opacity-50 hover:opacity-100 hover:scale-105'
                                                }`}
                                            >
                                                <Image
                                                    src={src}
                                                    alt={`Thumbnail ${i + 1}`}
                                                    fill
                                                    className="object-cover rounded-lg"
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
                <Image
                    src={currentUserAvatar}
                    alt="You"
                    width={40}
                    height={40}
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
                <Image
                    src={currentUserAvatar}
                    alt="You"
                    width={40}
                    height={40}
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
                                <div className="flex gap-[0.75rem]">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-[0.5rem] mb-[0.25rem]">
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
                                                <span className="text-text-secondary text-xs">
                                                    {formatCount(c.likes)} {t('likes')}
                                                </span>
                                                <span className="text-text-secondary text-xs">5 {t('replies')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
        <>
            <div className="w-full bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]">
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
                        <Image width={20} height={20} src="/COMMENT.svg" alt="comments" className="w-[1.25rem] h-[1.25rem] object-contain" />
                        <span>{formatCount(commentCount)}</span>
                    </button>
                    <button
                        className="inline-flex items-center gap-[0.375rem] text-sm text-text-secondary hover:text-text-primary min-w-[3.75rem]"
                        onClick={handleShare}
                        title={`${shareCount.toLocaleString()} shares`}
                    >
                        <Image width={20} height={20} src="/SHARE.svg" alt="shares" className="w-[1.25rem] h-[1.25rem] object-contain" />
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
                            onClick={handleShare}
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
        </>
    );
}