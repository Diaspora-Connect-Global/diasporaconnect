'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface Comment {
  id: string;
  author: string;
  authorImage: string;
  content: string;
  createdAt: string;
  likes: number;
}

interface Post {
  id: string;
  profileImage: string;
  profileName: string;
  category: string;
  postDate: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  commentsData?: Comment[];
  joinButton: boolean;
}

export default function Home() {
  const t = useTranslations('community');

  // Community data
  const communities = [
    {
      title: 'Ghana Innovation',
      members: 1200,
      onButtonClick: () => console.log('Join button clicked!'),
      buttonText: t('joincommunity'),
    },
    {
      title: 'Ghana Innovation',
      members: 1200,
      onButtonClick: () => console.log('Join button clicked!'),
      buttonText: t('joincommunity'),
    },
    {
      title: 'Ghana Innovation',
      members: 1200,
      onButtonClick: () => console.log('Join button clicked!'),
      buttonText: t('joincommunity'),
    },
    {
      title: 'Ghana Innovation',
      members: 1200,
      onButtonClick: () => console.log('Join button clicked!'),
      buttonText: t('joincommunity'),
    },
  ];

  // Initial posts with full data
  const initialPosts: Post[] = [
    {
      id: '1',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'GhanaConnectGlobal',
      postDate: 'Oct 1',
      content:
        'The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more.',
      images: ['/image1.jpg', '/image2.jpg'],
      likes: 3,
      comments: 5,
      commentsData: [
        {
          id: 'c1',
          author: 'Kwame',
          authorImage: '/avatar1.png',
          content: 'This is inspiring!',
          createdAt: '2h ago',
          likes: 2,
        },
        {
          id: 'c2',
          author: 'Abena',
          authorImage: '/avatar2.png',
          content: 'Love the updates!',
          createdAt: '1h ago',
          likes: 1,
        },
      ],
      joinButton: true,
    },
    {
      id: '2',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'GhanaConnectGlobal',
      postDate: 'Oct 1',
      content:
        'Breaking: New cultural festival announced in Accra! Join us to celebrate heritage, music, and food from across the diaspora.',
      likes: 8,
      comments: 3,
      commentsData: [],
      joinButton: true,
    },
    {
      id: '3',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'GhanaConnectGlobal',
      postDate: 'Sep 30',
      content:
        'Business spotlight: A Ghanaian startup just raised $2M to expand solar solutions in rural communities. Read the full story.',
      images: ['/solar.jpg'],
      likes: 15,
      comments: 7,
      commentsData: [
        {
          id: 'c3',
          author: 'Kofi',
          authorImage: '/kofi.jpg',
          content: 'This is game-changing!',
          createdAt: '3h ago',
          likes: 5,
        },
      ],
      joinButton: true,
    },
    {
      id: '4',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'GhanaConnectGlobal',
      postDate: 'Sep 29',
      content:
        'Throwback Thursday: Remembering the legends who paved the way for Ghanaian music globally. Who’s your favorite?',
      likes: 22,
      comments: 12,
      commentsData: [],
      joinButton: true,
    },
  ];

  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // Handle like
  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes: p.likes + (p.likes > 0 ? -1 : 1) } : p
      )
    );
  };

  // Handle save
  const handleSave = (postId: string) => {
    console.log('Saved post:', postId);
    // You can add saved state here if needed
  };

  // Handle share
  const handleShare = (postId: string) => {
    console.log('Shared post:', postId);
  };

  // Handle new comment
  const handleSendComment = (postId: string, content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments + 1,
              commentsData: [
                ...(p.commentsData || []),
                {
                  id: `${postId}-${Date.now()}`,
                  author: 'You', // Replace with current user
                  authorImage: '/ADANSI.png', // Replace with user avatar
                  content,
                  createdAt: now,
                  likes: 0,
                },
              ],
            }
          : p
      )
    );
  };

return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex h-full">
        {/* Main Feed - Orange - Independent Scroll */}
        <div className=" w-full lg:w-[40vw] overflow-y-auto scrollbar-hide m-4 flex flex-col">
          {/* Discover Section */}
          <div className="flex justify-between mb-4 shrink-0">
            <h2 className="font-display-large">{t('discover')}</h2>
            <Link href="/community">
              <p className="font-label-medium text-text-brand">{t('seeall')}</p>
            </Link>
          </div>

          {/* Communities - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2 shrink-0">
            {communities.map((community, index) => (
              <div key={index} className="flex-none">
                <CommunityCardVariant2
                  title={community.title}
                  members={community.members}
                  onButtonClick={community.onButtonClick}
                  buttonText={community.buttonText}
                />
              </div>
            ))}
          </div>

          {/* Feed Posts - Takes remaining space */}
          <div className="space-y-2 flex-1 min-h-0">
            {posts.map((post) => (
              <div key={post.id} className="mb-2">
                <FeedCardWithReply
                  profileImage={post.profileImage}
                  profileName={post.profileName}
                  category={post.category}
                  postDate={post.postDate}
                  content={post.content}
                  images={post.images}
                  likes={post.likes}
                  comments={post.comments}
                  commentsData={post.commentsData}
                  onLike={() => handleLike(post.id)}
                  onComment={() => console.log('Open comment input for', post.id)}
                  onShare={() => handleShare(post.id)}
                  onSave={() => handleSave(post.id)}
                  onSendComment={(content) => handleSendComment(post.id, content)}
                  joinButton={post.joinButton}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Purple - Independent Scroll */}
        <div className="hidden lg:block w-full lg:w-[30vw] overflow-y-auto  py-4">
          <PeopleYouMayKnow />
        </div>
      </div>
    </div>
  );
}