'use client';

import { useState } from 'react';
import FeedCardFiltered, { FeedCardFilteredProps } from '../cards/FeedCardFiltered';
import { useTranslations } from 'next-intl';

export default function FilteredPosts() {
  const t = useTranslations('profile.navigation');
  
  const postsSubTabs: { id: 'saved' | 'liked' | 'commented'; label: string }[] = [
    { id: 'saved', label: t('saved') },
    { id: 'liked', label: t('liked') },
    { id: 'commented', label: t('commented') },
  ];
  const [activeTab, setActiveTab] = useState<'saved' | 'liked' | 'commented'>('saved');

  // Current user (you)
  const currentUser = { name: 'You', avatar: 'https://github.com/shadcn.png' };

  // Posts with your comments
  const allPosts: FeedCardFilteredProps[] = [
    {
      id: 'post-1',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'GhanaConnectGlobal',
      postDate: 'Oct 1',
      content:
        'The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots...',
      images: ['/image1.jpg', '/image2.jpg'],
      likes: 3,
      comments: 5,
      commentsData: [
        {
          id: 'c1',
          author: 'You',
          authorImage: currentUser.avatar,
          content: 'Love this! Keep it coming.',
          createdAt: '2h ago',
          likes: 2,
        },
        {
          id: 'c2',
          author: 'Kwame',
          authorImage: '/avatar1.png',
          content: 'This is inspiring!',
          createdAt: '3h ago',
          likes: 1,
        },
      ],
      joinButton: true,
    },
    {
      id: 'post-2',
      profileImage: '/ADANSI.png',
      profileName: 'Another User',
      category: 'Tech',
      postDate: 'Sep 30',
      content: 'A very long post that will be truncated...',
      likes: 12,
      comments: 2,
      commentsData: [
        {
          id: 'c3',
          author: 'You',
          authorImage: currentUser.avatar,
          content: 'Great insight!',
          createdAt: '1d ago',
          likes: 0,
        },
      ],
    },
    {
      id: 'post-3',
      profileImage: '/ADANSI.png',
      profileName: 'Tech Guru',
      category: 'Innovation',
      postDate: 'Sep 28',
      content: 'Breaking: AI in Africa is booming!',
      likes: 25,
      comments: 8,
      commentsData: [],
    },
  ];

  // Global interaction tracking
  const [savedPostIds, setSavedPostIds] = useState<string[]>(['post-1']);
  const [likedPostIds, setLikedPostIds] = useState<string[]>(['post-1', 'post-3']);
  const [commentedPostIds, setCommentedPostIds] = useState<string[]>(['post-1', 'post-2']);

  // Filter posts by active tab
  const filteredPosts = allPosts.filter((post) => {
    if (activeTab === 'saved') return savedPostIds.includes(post.id);
    if (activeTab === 'liked') return likedPostIds.includes(post.id);
    if (activeTab === 'commented') return commentedPostIds.includes(post.id);
    return false;
  });

  // Handlers
  const toggleLike = (postId: string) => {
    setLikedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const toggleSave = (postId: string) => {
    setSavedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const addComment = (postId: string, text: string, parentId?: string) => {
    setCommentedPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    console.log('Comment added:', { postId, text, parentId });
  };

  return (
    <div className=" overflow-hidden flex">
      {/* Left: Tabs */}
      <div className="w-[12vw] border-r border-border-subtle bg-surface-default">
        {postsSubTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left p-3 transition-colors border-t first:border-t-0
              ${activeTab === tab.id ? 'text-brand bg-brand/5 font-medium' : 'text-text-primary hover:bg-muted'}`}
          >
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Right: Feed */}
      <div className="flex-1 overflow-y-auto bg-surface-default p-4 space-y-4">
        {filteredPosts.length === 0 ? (
          <p className="text-center text-text-secondary py-8">
            {t('noPosts', { type: t(activeTab) })}
          </p>
        ) : (
          filteredPosts.map((post) => (
            <FeedCardFiltered
              key={post.id}
              {...post}
              currentUser={currentUser}
              isLiked={likedPostIds.includes(post.id)}
              isSaved={savedPostIds.includes(post.id)}
              onLike={() => toggleLike(post.id)}
              onSave={() => toggleSave(post.id)}
              onShare={() => console.log('share', post.id)}
              onSendComment={(txt, parentId) => addComment(post.id, txt, parentId)}
              forceShowComments={activeTab === 'commented'}
            />
          ))
        )}
      </div>
    </div>
  );
}