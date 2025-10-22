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
    <div className="h-[calc(100vh-4rem)]">
      {/* Main Section (2/3 width on desktop, scrolls independently) */}
      <div className="lg:flex h-full"> {/* 28px equivalent */}
        {/* Scrolling container for both JoinCommunityCard and FeedCard */}
        <div className="overflow-y-auto h-full lg:max-w-[37.2rem] mx-auto scrollbar-hide p-4"> {/* Adjusted for full height and proper padding */}
          <div>
            <div className="lg:flex justify-between mb-[1rem]"> {/* 16px equivalent */}
              <p className="text-2xl font-caption-large">{t("discover")}</p>
              <Link href="/community">
                <p className="font-label-medium text-text-brand">{t("seeall")}</p>
              </Link>
            </div>
          </div>
          <div className="flex gap-[0.3rem] overflow-auto scrollbar-hide mb-[1.5rem]"> {/* 8px gap, 24px margin */}
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

          <div className="mb-[1rem]"> {/* 32px equivalent */}
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
        
        <div className="lg:w-[18rem] h-full p-4"> {/* Adjusted sidebar */}
            <PeopleYouMayKnow />
        </div>
      </div>
    </div>
  );
}