'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { Link } from '@/i18n/navigation';
import { LIST_AVAILABLE_COMMUNITIES } from '@/services/gql/community';
import { 
  GET_FEED, 
  ADD_ENGAGEMENT, 
  CREATE_COMMENT,
  GetFeedData,
  AddEngagementData,
  CreateCommentData 
} from '@/services/gql/postsFeed';
import { useQuery, useMutation } from '@apollo/client/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ListCommunitiesData } from '../community/page';
import { toast } from 'sonner';
import {  ButtonType3 } from '@/components/custom/button';

export default function Home() {
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const tActions = useTranslations('actions');

  // Fetch communities
  const { data: discoverData, loading: discoverLoading } = useQuery<ListCommunitiesData>(
    LIST_AVAILABLE_COMMUNITIES,
    {
      variables: {
        limit: 20,
        offset: 0
      }
    }
  );

  // Fetch feed
  const { 
    data: feedData, 
    loading: feedLoading, 
    error: feedError,
    refetch: refetchFeed 
  } = useQuery<GetFeedData>(GET_FEED, {
    variables: {
      input: {
        limit: 20,
        offset: 0,
        type: 'all'
      }
    }
  });

  // Mutations
  const [addEngagement] = useMutation<AddEngagementData>(ADD_ENGAGEMENT);
  const [createComment] = useMutation<CreateCommentData>(CREATE_COMMENT);

  // Handle like
  const handleLike = async (postId: string) => {
    try {
      const { data } = await addEngagement({
        variables: {
          input: {
            postId,
            engagementType: 'LIKE'
          }
        }
      });

      if (data?.addEngagement.success) {
        toast.success(data.addEngagement.message);
        refetchFeed(); // Refresh feed to get updated counts
      }
    } catch (err) {
      console.error('Failed to like post:', err);
      toast.error('Failed to like post');
    }
  };

  // Handle save
  const handleSave = async (postId: string) => {
    try {
      const { data } = await addEngagement({
        variables: {
          input: {
            postId,
            engagementType: 'SAVE'
          }
        }
      });

      if (data?.addEngagement.success) {
        toast.success(data.addEngagement.message);
        refetchFeed();
      }
    } catch (err) {
      console.error('Failed to save post:', err);
      toast.error('Failed to save post');
    }
  };

  // Handle share
  const handleShare = async (postId: string) => {
    try {
      const { data } = await addEngagement({
        variables: {
          input: {
            postId,
            engagementType: 'SHARE'
          }
        }
      });

      if (data?.addEngagement.success) {
        toast.success(data.addEngagement.message);
        refetchFeed();
      }
    } catch (err) {
      console.error('Failed to share post:', err);
      toast.error('Failed to share post');
    }
  };

  // Handle new comment
  const handleSendComment = async (postId: string, content: string) => {
    if (!content.trim()) return;

    try {
      await createComment({
        variables: {
          input: {
            postId,
            text: content
          }
        }
      });

      toast.success('Comment posted!');
      refetchFeed(); // Refresh feed to show new comment
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
    }
  };

  // --- Horizontal Scroll with Smart Buttons ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const SCROLL_STEP = 300;

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const atLeft = el.scrollLeft <= 2;
      const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setCanScrollLeft(!atLeft);
      setCanScrollRight(!atRight);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [discoverData]);

  const communities = discoverData?.listCommunities?.communities || [];
  const hasCommunities = communities.length > 0;

  const posts = feedData?.feed?.posts || [];
  const hasPosts = posts.length > 0;

  return (
    <div className="h-app-inner flex overflow-hidden">
      {/* Main Feed - Independent Scroll */}
      <div className="lg:max-w-[40vw] overflow-y-auto scrollbar-hide mx-4 py-4 flex flex-col">
        {/* Discover Section */}
        <div className="flex justify-between mb-4 shrink-0">
          <h2 className="label-medium">{t('discover')}</h2>
          <Link href="/community">
            <p className="label-medium text-text-brand">{t('seeall')}</p>
          </Link>
        </div>

        {/* Communities Carousel with Smart Arrows */}
        <div className="relative mb-6">
          {/* Loading State */}
          {discoverLoading && (
            <div className="flex gap-2 overflow-hidden pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-none w-[280px]">
                  <div className="h-32 bg-surface-subtle rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!discoverLoading && !hasCommunities && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="body-medium text-text-secondary mb-2">
                {t('noCommunitiesFound')}
              </p>
            </div>
          )}

          {/* Communities List */}
          {!discoverLoading && hasCommunities && (
            <>
              {/* Left Arrow */}
              {canScrollLeft && (
                <button
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                             flex h-10 w-10 items-center justify-center
                             rounded-full bg-surface-default/80 shadow-md
                             cursor-pointer transition-colors hover:bg-surface-subtle"
                  aria-label={tCommon('scrollLeft')}
                >
                  <ChevronLeftIcon className="h-6 w-6 text-primary" />
                </button>
              )}

              {/* Right Arrow */}
              {canScrollRight && (
                <button
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                             flex h-10 w-10 items-center justify-center
                             rounded-full bg-surface-default/80 shadow-md
                             cursor-pointer transition-colors hover:bg-surface-subtle"
                  aria-label={tCommon('scrollRight')}
                >
                  <ChevronRightIcon className="h-6 w-6 text-primary" />
                </button>
              )}

              {/* Scrollable Container */}
              <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 shrink-0
                           snap-x snap-mandatory"
                style={{ scrollBehavior: 'smooth' }}
              >
                {communities.map((community) => (
                  <div key={community.id} className="flex-none snap-start">
                    <CommunityCardVariant2
                      icon={community.avatarUrl}
                      title={community.name}
                      members={community.memberCount}
                      onButtonClick={() => console.log('Join button clicked!')}
                      buttonText={t('joincommunity')}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Feed Posts - Takes remaining space */}
        <div className="space-y-2">
          {/* Feed Loading State */}
          {feedLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-subtle rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-surface-default rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-surface-default rounded w-1/3 mb-2" />
                      <div className="h-3 bg-surface-default rounded w-1/4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-surface-default rounded w-full" />
                    <div className="h-4 bg-surface-default rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feed Error State */}
          {feedError && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="body-medium text-text-secondary mb-4">
                Failed to load feed. Please try again.
              </p>
              <ButtonType3
                onClick={() => refetchFeed()}
                className="px-4 py-2 bg-primary rounded-lg "
              >
                Retry
              </ButtonType3>
            </div>
          )}

          {/* Feed Empty State */}
          {!feedLoading && !feedError && !hasPosts && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="body-medium text-text-secondary mb-2">
                {t('join')}
              </p>
            </div>
          )}

          {/* Feed Posts */}
          {!feedLoading && hasPosts && posts.map((post) => (
            <div key={post.id} className="mb-2">
              <FeedCardWithReply
                profileImage="/ADANSI.png" // You'll need to map this from author data
                profileName={post.authorId} // You'll need to fetch author name separately
                category="Community" // You'll need to map this from post data
                postDate={new Date(post.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                content={post.text}
                images={[]} // Add images if available in your schema
                likes={post.engagementCounts.likes}
                comments={post.engagementCounts.comments}
                commentsData={[]} // You'll need to fetch comments separately
                onLike={() => handleLike(post.id)}
                onComment={() => console.log('Open comment input for', post.id)}
                onShare={() => handleShare(post.id)}
                onSave={() => handleSave(post.id)}
                onSendComment={(content) => handleSendComment(post.id, content)}
                joinButton={false}
                isLiked={post.userEngagement.hasLiked}
                isSaved={post.userEngagement.hasSaved}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar - Independent Scroll */}
      <div className="hidden lg:block min-w-0 overflow-y-auto py-4">
        <PeopleYouMayKnow />
      </div>
    </div>
  );
}