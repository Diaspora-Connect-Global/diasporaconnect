'use client';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import FeedCard from "@/components/cards/FeedCard";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { HeadingMedium } from "@/components/utils";
import Image from "next/image";

export default function Home() {


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
            <div className="lg:flex "> {/* 28px equivalent */}


                {/* Scrolling container for both JoinCommunityCard and FeedCard */}
                <div className=" lg:max-w-[35.5rem] mx-auto p-1"> {/* 568px equivalent */}


                    <div className="min-h-[6rem] flex space-x-4 my-4 p-1 border-b "> {/* Adansi header */}
                        <div className="h-[6rem] w-[6rem] flex-shrink-0"> {/* Prevent image from shrinking */}
                            <Image
                                width={90}
                                height={90}
                                src="/ADANSI.PNG"
                                alt={`Profile`}
                                className="h-full w-full rounded-full object-cover"
                            />
                        </div>
                        <div className="flex flex-col justify-between w-full"> {/* Use full width and space between */}
                            <div></div> {/* Empty div to push content to bottom */}
                            <div className="flex justify-between items-center w-full"> {/* Ensure full width */}
                                <HeadingMedium>The Adansi Times</HeadingMedium>
                                <ButtonType1 className="py-1 px-3 ml-4"> {/* Add left margin */}
                                    Joined
                                </ButtonType1>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-auto h-[53.625rem] lg:max-w-[35.5rem] mx-auto scrollbar-hide p-1">

                        <div className="mb-[2rem]"> {/* 32px equivalent */}
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
                </div>

                <div className="lg:w-[18rem]  ">
                    {/* 288px equivalent */}
                    <AboutAssociation />

                    <PeopleYouMayKnow />
                </div>
            </div>
        </div>
    );
}