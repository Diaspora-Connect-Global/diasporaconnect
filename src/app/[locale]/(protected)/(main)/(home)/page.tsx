"use client";
import FeedCard from "@/components/cards/FeedCard";
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";

export default function Home() {

    return (
        <div className="flex space-x-3 h-screen">
            <div className="w-[60%] h-[calc(100vh-64px)] overflow-auto scrollbar-hide">
                <div className="flex justify-between mb-4 mx-5 mt-5">
                    <p className="font-caption-large">Discover community</p>
                    <p className="font-label-medium text-text-brand">See more</p>
                </div>
                <div className="flex gap-2 overflow-auto scrollbar-hide mb-6">
                    <JoinCommunityCard
                        title="Ghana Innovation "
                        members={1200}
                        onButtonClick={() => console.log('Join button clicked!')}
                        buttonText="Join community"

                    />
                    <JoinCommunityCard
                        title="Ghana Innovation "
                        members={1200}
                        onButtonClick={() => console.log('Join button clicked!')}
                        buttonText="Join community"

                    />
                    <JoinCommunityCard
                        title="Ghana Innovation "
                        members={1200}
                        onButtonClick={() => console.log('Join button clicked!')}
                        buttonText="Join community"

                    />

                </div>

                <div className="my-6 mb-8">
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
                </div>


            </div>
            <div className="w-[40%] mt-5 h-full overflow-auto scrollbar-hide ">
              <PeopleYouMayKnow/>
            </div>

        </div>
    );

}