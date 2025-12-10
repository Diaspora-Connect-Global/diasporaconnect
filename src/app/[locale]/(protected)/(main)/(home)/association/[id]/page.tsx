'use client';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { HeadingMedium } from "@/components/utils";
import { useParams } from 'next/navigation';
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
    import FeedCardWithReply from "@/components/cards/FeedCardWithReply";

export default function AssociationPage() {
    const params = useParams();
    const associationId = params.id;

    const t = useTranslations("home.associations");
    const tActions = useTranslations("actions");

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
    ];

    const currentAssociation = associations.find(a => a.id === associationId);

    if (!currentAssociation) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="bg-surface-default border border-border-disabled shadow-md rounded-lg p-6 text-center max-w-md w-full">
                    <div className="mx-auto w-24 h-24 mb-4">
                        <Image
                            src="/ADANSI.PNG"
                            alt="Not found"
                            width={96}
                            height={96}
                            className="rounded-full object-cover"
                        />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2"> {t("notfound.title")} </h2>
                    <p className="text-sm text-text-primary mb-6">
                        {t("notfound.description")}
                    </p>
                    <div className="flex justify-center gap-3">
                        <Link href="/association">
                            <ButtonType1>
                                {t("notfound.browse")}
                            </ButtonType1>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="lg:flex  overflow-y-auto h-app-inner  ">
            {/* Main Content Section (2/3 width) */}
            <div className="overflow-y-auto  scrollbar-hide lg:w-[40vw] px-3">
                {/* Association Header */}
                <div className="min-h-[6rem] flex space-x-4 my-4 py-3 border-b">
                    <div className="h-[6rem] w-[6rem] flex-shrink-0">
                        <Image
                            width={90}
                            height={90}
                            src={currentAssociation.avatar}
                            alt={`Profile`}
                            className="h-full w-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col justify-between w-full">
                        <div></div>
                        <div className="justify-between items-center w-full ">
                            <p className="heading-xsmall"> {currentAssociation.name}</p>
                            <div className="flex justify-end">
                            <ButtonType1 className="py-1 px-3 ml-4 label-medium">
                                {currentAssociation.joined ? tActions("joined") : tActions("join")}
                            </ButtonType1>

                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:hidden">
                     <AboutAssociation
                        members={currentAssociation.members}
                        createdDate={currentAssociation.createdDate}
                        visibility={currentAssociation.visibility}
                        description={currentAssociation.description}
                    />
                </div>

                {/* Scrollable Feed */}
                <div className="overflow-auto lg:max-h-[calc(100vh-64px)] scrollbar-hide">
                    <div className="">
                        {currentAssociation.posts && currentAssociation.posts.map((post, index) => (
                            <FeedCardWithReply
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

            {/* Sidebar - Sticky Section */}
            <div className="lg:self-start h-app-inner lg:overflow-y-auto scrollbar-hide">
                <div className="space-y-6 flex-1 mb-6 mx-3">
                    <div className="hidden lg:block">
                    <AboutAssociation
                        members={currentAssociation.members}
                        createdDate={currentAssociation.createdDate}
                        visibility={currentAssociation.visibility}
                        description={currentAssociation.description}
                    />

                    </div>
                    {/* Remove any overflow containers */}
                    <PeopleYouMayKnow />
                </div>
            </div>
        </div>
    );
}