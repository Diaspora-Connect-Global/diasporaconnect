"use client";
import FeedCard from "@/components/cards/FeedCard";
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { useTranslations } from 'next-intl';

export default function Home() {
    const t = useTranslations('community');

    return (
        <div className="flex flex-col md:flex-row md:space-x-3 h-screen">
            <div className="w-full md:w-[60%] h-[calc(100vh-64px)] overflow-auto scrollbar-hide">
                <div className="flex justify-between mb-4 mx-5 mt-5">
                    <p className="font-caption-large">{t('discover')}</p>
                    <p className="font-label-medium text-text-brand">{t('seeall')}</p>
                </div>
                <div className="flex gap-2 overflow-auto scrollbar-hide mb-6 mx-4 md:mx-0">
                    <JoinCommunityCard
                        title="Ghana Innovation"
                        members={1200}
                        onButtonClick={() => console.log('Join button clicked!')}
                        buttonText={t('joincommunity')}
                    />
                    <JoinCommunityCard
                        title="Ghana Innovation"
                        members={1200}
                        onButtonClick={() => console.log('Join button clicked!')}
                        buttonText={t('joincommunity')}
                    />
                    <JoinCommunityCard
                        title="Ghana Innovation"
                        members={1200}
                        onButtonClick={() => console.log('Join button clicked!')}
                        buttonText={t('joincommunity')}
                    />
                </div>

                <div className="my-6 mb-8 flex flex-col justify-center items-center">
                    <FeedCard
                        profileImage="/ADANSI.png"
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
                    <FeedCard
                        profileImage="/ADANSI.png"
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
                </div>
            </div>
            <div className="hidden md:block md:w-[40%] mt-5 h-full overflow-auto scrollbar-hide">
                <PeopleYouMayKnow />
            </div>
        </div>
    );
}