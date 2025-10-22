'use client';
import { Bookmark } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { GoHeartFill } from 'react-icons/go';
import { useTranslations } from 'next-intl';

interface FeedCardProps {
  profileImage: string;
  profileName: string;
  category: string;
  postDate: string;
  content: string;
  likes: number;
  comments: number;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  joinButton?: boolean;
}

export default function FeedCard({
  profileImage,
  profileName,
  category,
  postDate,
  content,
  likes,
  comments,
  onLike,
  onComment,
  onShare,
  onSave,
  joinButton = true,
}: FeedCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const t = useTranslations('actions');

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    onLike?.();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave?.();
  };

  return (
    <div className="w-fit lg:w-[35rem] lg:h-[20.25rem] bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]">
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
              <h3 className="font-label-large text-text-primary truncate">{profileName} ·</h3>
              {joinButton && (
                <button className="inline-flex items-center justify-center py-[0.25rem] px-[0.5rem] rounded-md bg-brand-light text-text-brand hover:bg-brand cursor-pointer font-label-medium min-w-[3.75rem] ml-[0.5rem]">
                  {t('join')}
                </button>
              )}
            </div>
            <p className="font-body-small text-text-secondary truncate">
              {t('postedBy', { user: 'Admin' })} · {category} · {postDate}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="font-body-medium text-text-primary leading-relaxed mb-[1rem] flex-1 min-w-0 line-clamp-4">
        {content}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-[1rem] mb-[1rem] pb-[1rem] border-b border-border-default">
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
          onClick={onComment}
        >
          <Image
            width={20}
            height={20}
            src="/COMMENTFILLED.svg"
            alt="comments"
            className="w-[1.25rem] h-[1.25rem] object-contain"
          />
          <span>{comments}</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[1rem]">
          <button
            className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
            onClick={handleLike}
          >
            <Image
              width={20}
              height={20}
              src="/LIKE.svg"
              alt="like"
              className="w-[1.25rem] h-[1.25rem] object-contain"
            />
            <span>{t('like')}</span>
          </button>
          <button
            className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
            onClick={onComment}
          >
            <Image
              width={20}
              height={20}
              src="/COMMENT.svg"
              alt="comment"
              className="w-[1.25rem] h-[1.25rem] object-contain"
            />
            <span>{t('comment')}</span>
          </button>
          <button
            className="inline-flex items-center gap-[0.5rem] text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[3.75rem]"
            onClick={onShare}
          >
            <Image
              width={20}
              height={20}
              src="/SHARE.svg"
              alt="share"
              className="w-[1.25rem] h-[1.25rem] object-contain"
            />
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
    </div>
  );
}