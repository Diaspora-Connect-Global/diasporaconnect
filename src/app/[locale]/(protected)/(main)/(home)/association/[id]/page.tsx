'use client';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import FeedCard from "@/components/cards/FeedCard";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { HeadingMedium } from "@/components/utils";
import { useParams } from 'next/navigation';
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export default function AssociationPage() {
    const params = useParams();
    const associationId = params.id;



    type Association = {
        id: string;
        name: string;
        visibility: 'Public' | 'Private';
        avatar: string;
        description: string;
        joined: boolean;
        members: number;
        createdDate: string;
        posts?: Array<{
            profileImage: string;
            profileName: string;
            category: string;
            postDate: string;
            content: string;
            likes: number;
            comments: number;
            onLike: () => void;
            onComment: () => void;
            onShare: () => void;
            onSave: () => void;
            joinButton?: boolean;
        }>;
    }


    const associations: Association[] = [
        {
            id: 'adansi-times',
            name: 'The Adansi Times',
            visibility: 'Public',
            avatar: 'https://t4.ftcdn.net/jpg/03/08/69/75/360_F_308697506_9dsBYHXm9FwuW0qcEqimAEXUvzTwfzwe.jpg',
            members: 2000,
            createdDate: 'October 2023',
            description:
                'Community news and stories from the Ghanaian diaspora. Stay connected with your roots and discover inspiring journeys.',
            joined: true,
            posts: [{
                profileImage: "/ADANSI.PNG",
                profileName: "The Adansi Times",
                category: "GhanaConnectGlobal",
                postDate: "Oct 1",
                content: "Latest updates from the Ghanaian diaspora community. Join us for our upcoming cultural festival!",
                likes: 45,
                comments: 12,
                onLike: () => console.log("Liked"),
                onComment: () => console.log("Comment"),
                onShare: () => console.log("Share"),
                onSave: () => console.log("Saved"),
                joinButton: false,
            }]
        },
        {
            id: 'tech-innovations-daily',
            name: 'Tech Innovations Daily',
            visibility: 'Private',
            avatar: 'https://previews.123rf.com/images/rawpixel/rawpixel1507/rawpixel150710696/42883433-digital-media-information-medium-news-concept.jpg',
            members: 1500,
            createdDate: 'September 2023',
            description: 'Daily updates on technology, startups, and product innovation around the world.',
            joined: true,
            posts: [{
                profileImage: "/tech-innovations.png",
                profileName: "Tech Innovations Daily",
                category: "Technology",
                postDate: "Oct 2",
                content: "Breaking: Major breakthrough in quantum computing announced today. Full coverage coming soon.",
                likes: 89,
                comments: 34,
                onLike: () => console.log("Liked"),
                onComment: () => console.log("Comment"),
                onShare: () => console.log("Share"),
                onSave: () => console.log("Saved"),
                joinButton: false,
            }]
        },
        {
            id: 'global-finance-report',
            name: 'Global Finance Report',
            visibility: 'Public',
            avatar: 'https://media.istockphoto.com/id/1795167728/photo/growth-in-business-and-finance-growing-graphs-and-charts.jpg?s=612x612&w=0&k=20&c=626gZ0gRzvxnmVODOIGYmIlMWnFc5Uv5fV7OrddBp-w=',
            members: 3000,
            createdDate: 'August 2023',
            description: 'Coverage of global markets, macro trends, and finance insights for professionals and enthusiasts.',
            joined: false,
            posts: [{
                profileImage: "https://media.istockphoto.com/id/1795167728/photo/growth-in-business-and-finance-growing-graphs-and-charts.jpg?s=612x612&w=0&k=20&c=626gZ0gRzvxnmVODOIGYmIlMWnFc5Uv5fV7OrddBp-w=",
                profileName: "Global Finance Report",
                category: "Finance",
                postDate: "Oct 3",
                content: "Market Analysis: Key trends shaping global markets this week and what to watch for.",
                likes: 67,
                comments: 23,
                onLike: () => console.log("Liked"),
                onComment: () => console.log("Comment"),
                onShare: () => console.log("Share"),
                onSave: () => console.log("Saved"),
                joinButton: true,
            }]
        },
        {
            id: 'health-wellness-journal',
            name: 'Health & Wellness Journal',
            visibility: 'Public',
            avatar: 'https://media.istockphoto.com/id/1183325543/vector/heart-isometric-health-care-concept-red-shape-and-heartbeat.jpg?s=612x612&w=0&k=20&c=mBkVFXUpbkpoSrP1lEbcWRQP94wzjyBkYGLTkI0i7RA=',
            members: 1200,
            createdDate: 'July 2023',
            description: 'Articles and tips on physical and mental wellbeing, lifestyle, and healthy living.',
            joined: false,
            posts: [{
                profileImage: "/health-wellness.png",
                profileName: "Health & Wellness Journal",
                category: "Wellness",
                postDate: "Oct 4",
                content: "5 Essential morning habits for better mental health and productivity throughout your day.",
                likes: 123,
                comments: 45,
                onLike: () => console.log("Liked"),
                onComment: () => console.log("Comment"),
                onShare: () => console.log("Share"),
                onSave: () => console.log("Saved"),
                joinButton: true,
            }]
        },
    ];


    const currentAssociation = associations.find(a => a.id === associationId);

    if (!currentAssociation) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="bg-surface-default  border border-border-disabled  shadow-md rounded-lg p-6 text-center max-w-md w-full">
                    <div className="mx-auto w-24 h-24 mb-4">
                        <Image
                            src="/ADANSI.PNG"
                            alt="Not found"
                            width={96}
                            height={96}
                            className="rounded-full object-cover"
                        />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Association not found</h2>
                    <p className="text-sm text-text-primary  mb-6">
                        We couldn&apos;t find the association you&apos;re looking for. It may have been removed or the link is incorrect.
                    </p>
                    <div className="flex justify-center gap-3">
                        <Link href="/association">
                            <ButtonType1 >Browse associations</ButtonType1>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }



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
                                src={currentAssociation.avatar}
                                alt={`Profile`}
                                className="h-full w-full rounded-full object-cover"
                            />
                        </div>
                        <div className="flex flex-col justify-between w-full"> {/* Use full width and space between */}
                            <div></div> {/* Empty div to push content to bottom */}
                            <div className="flex justify-between items-center w-full"> {/* Ensure full width */}
                                <HeadingMedium>{currentAssociation.name}</HeadingMedium>
                                <ButtonType1 className="py-1 px-3 ml-4"> {/* Add left margin */}
                                    {currentAssociation.joined ? "Joined" : "Join"}                        
                                            </ButtonType1>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-auto h-[53.625rem] lg:max-w-[35.5rem] mx-auto scrollbar-hide p-1">

                        <div className="mb-[2rem]"> {/* 32px equivalent */}
                            {currentAssociation.posts && currentAssociation.posts.map((post, index) => (
                                <FeedCard
                                    key={index}
                                    profileImage={currentAssociation.avatar}
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

                <div className="lg:w-[18rem] lg:sticky lg:top-[4rem]  h-[calc(100vh-4rem)] scrollbar-hide overflow-y-auto ">
                    <AboutAssociation
                        members={currentAssociation.members}
                        createdDate={currentAssociation.createdDate}
                        visibility={currentAssociation.visibility}
                        description={currentAssociation.description}
                    />

                    <PeopleYouMayKnow />
                </div>
            </div>
        </div>
    );
}