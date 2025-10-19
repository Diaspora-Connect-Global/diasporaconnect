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
    <div className=" lg:w-[calc(568/1512*100vw)] lg:h-[calc(324/922*100vh)] bg-surface-default border border-border-subtle rounded-lg p-4 flex flex-col my-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="lg:flex items-center gap-3">
          <Image
            width={40}
            height={40}
            src={profileImage}
            alt={profileName}
            className="w-12 h-12 rounded-full object-cover border border-border-subtle"
          />
          <div className="lg:flex-1">
            <div className="flex items-center ">
              <h3 className="font-label-large text-text-primary truncate">{profileName} ·</h3>
              {joinButton && (
                <button className="inline-flex items-center justify-center  py-1 rounded-md bg-brand-light text-text-brand hover:bg-brand hover:text- font-label-medium min-w-[60px]">
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
      <p className="font-body-medium leading-relaxed mb-4 flex-1 min-w-0 line-clamp-4">
        {content}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border-default">
        <button
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary min-w-[60px]"
          onClick={handleLike}
        >
          <GoHeartFill
            className={`w-5 h-5 ${isLiked ? 'text-border-danger' : 'text-text-secondary'}`}
          />
          <span>{likeCount}</span>
        </button>
        <button
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary min-w-[60px]"
          onClick={onComment}
        >
          <Image
            width={20}
            height={20}
            src="/COMMENTFILLED.svg"
            alt="comments"
            className="w-5 h-5 object-contain"
          />
          <span>{comments}</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className="inline-flex items-center gap-2 text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[60px]"
            onClick={handleLike}
          >
            <Image
              width={20}
              height={20}
              src="/LIKE.svg"
              alt="like"
              className="w-5 h-5 object-contain"
            />
            <span>{t('like')}</span>
          </button>
          <button
            className="inline-flex items-center gap-2 text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[60px]"
            onClick={onComment}
          >
            <Image
              width={20}
              height={20}
              src="/COMMENT.svg"
              alt="comment"
              className="w-5 h-5 object-contain"
            />
            <span>{t('comment')}</span>
          </button>
          <button
            className="inline-flex items-center gap-2 text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[60px]"
            onClick={onShare}
          >
            <Image
              width={20}
              height={20}
              src="/SHARE.svg"
              alt="share"
              className="w-5 h-5 object-contain"
            />
            <span>{t('share')}</span>
          </button>
        </div>
        <button
          className="inline-flex items-center gap-2 text-sm font-body-small text-text-secondary hover:text-text-primary min-w-[60px]"
          onClick={handleSave}
        >
          <Bookmark
            className={`w-5 h-5 ${isSaved ? 'fill-current text-text-primary' : 'text-text-secondary'}`}
          />
          <span>{t('save')}</span>
        </button>
      </div>
    </div>
  );
}