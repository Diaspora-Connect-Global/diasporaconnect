'use client';
import CommunityCardVariant2 from "@/components/cards/community/CommunityCardVariant2";
import FeedCard from "@/components/cards/FeedCard";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("community");

  // Community data array
  const communities = [
    {
      title: "Ghana Innovation",
      members: 1200,
      onButtonClick: () => console.log("Join button clicked!"),
      buttonText: t("joincommunity"),
    },
    {
      title: "Ghana Innovation",
      members: 1200,
      onButtonClick: () => console.log("Join button clicked!"),
      buttonText: t("joincommunity"),
    },
    {
      title: "Ghana Innovation",
      members: 1200,
      onButtonClick: () => console.log("Join button clicked!"),
      buttonText: t("joincommunity"),
    },
    
  ];

  // Feed post data array
  const posts = [
    {
      profileImage: "/ADANSI.png",
      profileName: "The Adansi Times",
      category: "GhanaConnectGlobal",
      postDate: "Oct 1",
      content:
        "The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more.",
      likes: 3,
      comments: 5,
      onLike: () => console.log("Liked"),
      onComment: () => console.log("Comment"),
      onShare: () => console.log("Share"),
      onSave: () => console.log("Saved"),
      joinButton: true,
    },
    {
      profileImage: "/ADANSI.png",
      profileName: "The Adansi Times",
      category: "GhanaConnectGlobal",
      postDate: "Oct 1",
      content:
        "The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more.",
      likes: 3,
      comments: 5,
      onLike: () => console.log("Liked"),
      onComment: () => console.log("Comment"),
      onShare: () => console.log("Share"),
      onSave: () => console.log("Saved"),
      joinButton: true,
    },
    {
      profileImage: "/ADANSI.png",
      profileName: "The Adansi Times",
      category: "GhanaConnectGlobal",
      postDate: "Oct 1",
      content:
        "The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more.",
      likes: 3,
      comments: 5,
      onLike: () => console.log("Liked"),
      onComment: () => console.log("Comment"),
      onShare: () => console.log("Share"),
      onSave: () => console.log("Saved"),
      joinButton: true,
    },
    {
      profileImage: "/ADANSI.png",
      profileName: "The Adansi Times",
      category: "GhanaConnectGlobal",
      postDate: "Oct 1",
      content:
        "The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more.",
      likes: 3,
      comments: 5,
      onLike: () => console.log("Liked"),
      onComment: () => console.log("Comment"),
      onShare: () => console.log("Share"),
      onSave: () => console.log("Saved"),
      joinButton: true,
    },
  ];

  return (
    <div>
      {/* Main Section (2/3 width on desktop, scrolls independently) */}
      <div className="lg:flex space-x-[calc(28/1512*100vw)]">
        {/* Scrolling container for both JoinCommunityCard and FeedCard */}
        <div className="overflow-auto h-[calc(100vh-64px)] lg:w-[calc(568/1512*100vw)] scrollbar-hide">
          <div>
            <div className="lg:flex justify-between mb-4">
              <p className="text-2xl font-caption-large">{t("discover")}</p>
              <Link href="/community">
                <p className="font-label-medium text-text-brand">{t("seeall")}</p>
              </Link>
            </div>
          </div>
          <div className="flex gap-2 overflow-auto scrollbar-hide mb-6">
            {communities.map((community, index) => (
              <CommunityCardVariant2
                key={index}
                title={community.title}
                members={community.members}
                onButtonClick={community.onButtonClick}
                buttonText={community.buttonText}
              />
            ))}
          </div>

          <div className="mb-8">
            {posts.map((post, index) => (
              <FeedCard
                key={index}
                profileImage={post.profileImage}
                profileName={post.profileName}
                category={post.category}
                postDate={post.postDate}
                content={post.content}
                likes={post.likes}
                comments={post.comments}
                onLike={post.onLike}
                onComment={post.onComment}
                onShare={post.onShare}
                onSave={post.onSave}
                joinButton={post.joinButton}
              />
            ))}
          </div>
        </div>
        {/* PeopleYouMayKnow Section (1/3 width on desktop, sticky) */}
        <div className="lg:w-[calc(288/1512*100vw)]">
          <div className="">
            <PeopleYouMayKnow />
          </div>
        </div>
      </div>
    </div>
  );
}