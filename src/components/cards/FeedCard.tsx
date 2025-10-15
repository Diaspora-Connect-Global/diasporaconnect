'use client';
import { Heart, MessageCircle, Share2, Bookmark, MessageCircleMore } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { GoHeartFill } from 'react-icons/go';

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
  joinButton = true
}: FeedCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

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
    <div className=" my-4 bg-surface-default rounded-lg border border-gray-200 p-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <Image
          width={40}
          height={40}
            src={profileImage} 
            alt={profileName}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-label-large text-text-primary">{profileName}</h3>
              {joinButton && (
                <button className="text-text-brand font-label-medium">
                  · Join
                </button>
              )}
            </div>
            <p className="font-body-small text-text-secondary">
              Posted by Admin · {category} · {postDate}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="font-body-medium leading-relaxed mb-4">
        {content}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
        <button 
          className="flex items-center gap-1.5 text-sm"
          onClick={handleLike}
        >
          <GoHeartFill 
            className={`w-5 h-5 text-border-danger`}
          />
          <span className={'text-text-secondary'}>
            {likeCount}
          </span>
        </button>
        
        <button className="flex items-center gap-1.5 text-sm text-gray-600">
          <MessageCircleMore className="w-5 h-5 text-text-brand" />
          <span>{comments}</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            className="flex items-center gap-2 font-body-small text-secondary"
            onClick={handleLike}
          >
            <Heart className="w-5 h-5" />
            <span>Like</span>
          </button>
          
          <button 
            className="flex items-center gap-2 text-sm font-body-small text-secondary"
            onClick={onComment}
          >
            <MessageCircleMore className="w-5 h-5" />
            <span>Comment</span>
          </button>
          
          <button 
            className="flex items-center gap-2 text-sm font-body-small text-secondary"
            onClick={onShare}
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
        
        <button 
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          onClick={handleSave}
        >
          <Bookmark 
            className={`w-5 h-5 font-body-small text-secondary ${isSaved ? 'fill-current' : ''}`}
          />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}

// Example usage:
/*
<FeedCard
  profileImage="/path-to-image.jpg"
  profileName="The Adansi Times"
  category="GhanaConnectGlobal"
  postDate="Oct 1"
  content="The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more."
  likes={3}
  comments={5}
  onLike={() => console.log('Liked')}
  onComment={() => console.log('Comment')}
  onShare={() => console.log('Share')}
  onSave={() => console.log('Saved')}
  joinButton={true}
/>
*/