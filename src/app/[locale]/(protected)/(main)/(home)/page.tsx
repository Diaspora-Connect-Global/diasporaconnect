'use client';

import CommunityCardVariant2 from '@/components/cards/community/CommunityCardVariant2';
import FeedCardWithReply from '@/components/cards/FeedCardWithReply';
import { PeopleYouMayKnow } from '@/components/home/PeopleYouMayKnow';
import { Link } from '@/i18n/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

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
  const tCommon = useTranslations('common');

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
      images: [
        'https://img.freepik.com/free-vector/flat-design-travel-background_23-2149193475.jpg?semt=ais_hybrid&w=740&q=80',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmtm8g4xFqFS0gyk3bWfr0erUeVJrDy6DAMA&s',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0m6xP62VCldBhh7AmbWi6_DNH9SBGd0t-PA&s',
        'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fHRyYXZlbHxlbnwwfHwwfHx8MA%3D%3D&fm=jpg&q=60&w=3000',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dHJhdmVsfGVufDB8fDB8fHww&fm=jpg&q=60&w=3000',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqxK9dBtEZiDmir9AosAMr1709tDGdBNG7ug&s',
      ],
      likes: 3,
      comments: 5,
      commentsData: [
        {
          id: 'c1',
          author: 'Kwame',
          authorImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT73Hx3joXluMeacnnC_5P92ZM4zbZq6-VYvWGrgPwLmEWlLRepRH1jYOGoQyHJYbviEnU&usqp=CAU',
          content: 'This is inspiring!',
          createdAt: '2h ago',
          likes: 2,
        },
        {
          id: 'c2',
          author: 'Abena',
          authorImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zwhySGCEBxRRFYIcQgvOLOpRGqrT3d7Qng&s',
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
      postDate: 'Oct 2',
      content:
        'Breaking: New cultural festival announced in Accra! Join us to celebrate heritage, music, and food from across the diaspora.',
      images: [
        'https://cdn.prod.website-files.com/652ed40a5b50682220b9eb86/6760d12ecaab156dcb8d0d7a_image_travel-insights.webp',
      ],
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
      images: [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7FzecHSou7npNbaFUiAmtx0Q60vFi2JcPOw&s',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRkkr7F8iZZpRWR0Ic-TzjaH_rpeTqMIUdTg&s',
      ],
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
        "Throwback Thursday: Remembering the legends who paved the way for Ghanaian music globally. Who's your favorite?",
      likes: 22,
      comments: 12,
      commentsData: [],
      joinButton: true,
    },
    {
      id: '5',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'Travel & Tourism',
      postDate: 'Oct 3',
      content:
        'Explore the hidden gems of Ghana! From pristine beaches to lush rainforests, discover destinations that will take your breath away.',
      images: [
        'https://res.cloudinary.com/worldpackers/image/upload/c_fill,f_auto,q_auto,w_1024/v1/guides/article_cover/pxutrrxynm6aegghgsoy?_a=BACADKGT',
        'https://www.imagetours.com/__media/tours/PR/cover.jpg',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dHJhdmVsfGVufDB8fDB8fHww&fm=jpg&q=60&w=3000',
      ],
      likes: 45,
      comments: 18,
      commentsData: [
        {
          id: 'c4',
          author: 'Ama',
          authorImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zwhySGCEBxRRFYIcQgvOLOpRGqrT3d7Qng&s',
          content: 'Added to my bucket list!',
          createdAt: '1h ago',
          likes: 8,
        },
        {
          id: 'c5',
          author: 'Yaw',
          authorImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT73Hx3joXluMeacnnC_5P92ZM4zbZq6-VYvWGrgPwLmEWlLRepRH1jYOGoQyHJYbviEnU&usqp=CAU',
          content: 'Ghana is beautiful!',
          createdAt: '45m ago',
          likes: 12,
        },
      ],
      joinButton: true,
    },
    {
      id: '6',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'Community Events',
      postDate: 'Oct 4',
      content:
        'Join us this weekend for the annual Diaspora Connect meetup! Network with fellow Ghanaians, enjoy traditional cuisine, and celebrate our culture together.',
      images: [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqxK9dBtEZiDmir9AosAMr1709tDGdBNG7ug&s',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0m6xP62VCldBhh7AmbWi6_DNH9SBGd0t-PA&s',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmtm8g4xFqFS0gyk3bWfr0erUeVJrDy6DAMA&s',
        'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fHRyYXZlbHxlbnwwfHwwfHx8MA%3D%3D&fm=jpg&q=60&w=3000',
      ],
      likes: 67,
      comments: 100,
      commentsData: [
        {
          id: 'c6',
          author: 'Efua',
          authorImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zwhySGCEBxRRFYIcQgvOLOpRGqrT3d7Qng&s',
          content: "Can't wait! See you there!",
          createdAt: '30m ago',
          likes: 15,
        },
      ],
      joinButton: true,
    },
    {
      id: '7',
      profileImage: '/ADANSI.png',
      profileName: 'The Adansi Times',
      category: 'Arts & Culture',
      postDate: 'Oct 5',
      content:
        'Celebrating Ghanaian artisans who are keeping traditional crafts alive while innovating for the modern world. Swipe to see their incredible work!',
      likes: 34,
      comments: 9,
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
                  author: 'You',
                  authorImage: '/ADANSI.png',
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
  }, []);

  return (
    <div className="h-[84vh] lg:h-[92vh] flex overflow-hidden">
        {/* Main Feed - Orange - Independent Scroll */}
        <div className=" lg:max-w-[40vw] overflow-y-auto scrollbar-hide m-4 flex flex-col">
          {/* Discover Section */}
          <div className="flex justify-between mb-4 shrink-0">
            <h2 className="label-medium">{t('discover')}</h2>
            <Link href="/community">
              <p className="label-medium text-text-brand">{t('seeall')}</p>
            </Link>
          </div>

          {/* Communities Carousel with Smart Arrows */}
          <div className="relative mb-6">
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                           flex h-10 w-10 items-center justify-center
                           rounded-full bg-surface-default/80 shadow-md
                           cursor-pointer transition-colors"
                aria-label={tCommon('scrollLeft')}
              >
                <ChevronLeftIcon className="h-6 w-6 text-gray-800" />
              </button>
            )}

            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                           flex h-10 w-10 items-center justify-center
                           rounded-full bg-surface-default/80 shadow-md
                           cursor-pointer transition-colors"
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
              {communities.map((community, index) => (
                <div key={index} className="flex-none snap-start">
                  <CommunityCardVariant2
                    title={community.title}
                    members={community.members}
                    onButtonClick={community.onButtonClick}
                    buttonText={community.buttonText}
                  />
                </div>
              ))}
            </div>
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
        <div className="hidden lg:block  min-w-0 overflow-y-auto py-4">
          <PeopleYouMayKnow />
        </div>
    </div>
  );
}