"use client";
import FeedCard from "@/components/cards/FeedCard";
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function Home() {
    const t = useTranslations("community");

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-auto p-4">
            <div className="max-w-full md:max-w-[100%] h-full">
                {/* Main content and PeopleYouMayKnow in flex layout on desktop */}
                <div className="md:flex md:h-full">
                    {/* Main Section (2/3 width on desktop, scrolls independently) */}
                    <div className="w-full md:w-2/3 md:pr-4">

                        {/* Scrolling container for both JoinCommunityCard and FeedCard */}
                        <div className="overflow-auto h-[calc(100vh-64px)] scrollbar-hide">
                            <div>
                                <div className="sm:flex justify-between mb-4">
                                    <p className="text-2xl font-caption-large">{t("discover")}</p>
                                    <Link href="/community">
                                        <p className="font-label-medium text-text-brand">{t("seeall")}</p>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex gap-2 overflow-auto scrollbar-hide mb-6">
                                <JoinCommunityCard
                                    title="Ghana Innovation"
                                    members={1200}
                                    onButtonClick={() => console.log("Join button clicked!")}
                                    buttonText={t("joincommunity")}
                                />
                                <JoinCommunityCard
                                    title="Ghana Innovation"
                                    members={1200}
                                    onButtonClick={() => console.log("Join button clicked!")}
                                    buttonText={t("joincommunity")}
                                />
                                <JoinCommunityCard
                                    title="Ghana Innovation"
                                    members={1200}
                                    onButtonClick={() => console.log("Join button clicked!")}
                                    buttonText={t("joincommunity")}
                                />
                            </div>

                            <div className="mb-8">
                                <FeedCard
                                    profileImage="/ADANSI.png"
                                    profileName="The Adansi Times"
                                    category="GhanaConnectGlobal"
                                    postDate="Oct 1"
                                    content="The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more."
                                    likes={3}
                                    comments={5}
                                    onLike={() => console.log("Liked")}
                                    onComment={() => console.log("Comment")}
                                    onShare={() => console.log("Share")}
                                    onSave={() => console.log("Saved")}
                                    joinButton={true}
                                />
                                <FeedCard
                                    profileImage="/ADANSI.png"
                                    profileName="The Adansi Times"
                                    category="GhanaConnectGlobal"
                                    postDate="Oct 1"
                                    content="The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more."
                                    likes={3}
                                    comments={5}
                                    onLike={() => console.log("Liked")}
                                    onComment={() => console.log("Comment")}
                                    onShare={() => console.log("Share")}
                                    onSave={() => console.log("Saved")}
                                    joinButton={true}
                                />
                                <FeedCard
                                    profileImage="/ADANSI.png"
                                    profileName="The Adansi Times"
                                    category="GhanaConnectGlobal"
                                    postDate="Oct 1"
                                    content="The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more."
                                    likes={3}
                                    comments={5}
                                    onLike={() => console.log("Liked")}
                                    onComment={() => console.log("Comment")}
                                    onShare={() => console.log("Share")}
                                    onSave={() => console.log("Saved")}
                                    joinButton={true}
                                />
                                <FeedCard
                                    profileImage="/ADANSI.png"
                                    profileName="The Adansi Times"
                                    category="GhanaConnectGlobal"
                                    postDate="Oct 1"
                                    content="The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more."
                                    likes={3}
                                    comments={5}
                                    onLike={() => console.log("Liked")}
                                    onComment={() => console.log("Comment")}
                                    onShare={() => console.log("Share")}
                                    onSave={() => console.log("Saved")}
                                    joinButton={true}
                                />
                                <FeedCard
                                    profileImage="/ADANSI.png"
                                    profileName="The Adansi Times"
                                    category="GhanaConnectGlobal"
                                    postDate="Oct 1"
                                    content="The Adansi Times is your go-to source for news and stories from the Ghanaian diaspora. Stay connected with your roots, discover inspiring journeys, and engage in conversations that shape our global community. Follow us for updates on cultural events, business opportunities, and more."
                                    likes={3}
                                    comments={5}
                                    onLike={() => console.log("Liked")}
                                    onComment={() => console.log("Comment")}
                                    onShare={() => console.log("Share")}
                                    onSave={() => console.log("Saved")}
                                    joinButton={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* PeopleYouMayKnow Section (1/3 width on desktop, sticky) */}
                    <div className="hidden md:block md:w-1/3 ">
                        <div className="sticky top-4">
                            <PeopleYouMayKnow />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}