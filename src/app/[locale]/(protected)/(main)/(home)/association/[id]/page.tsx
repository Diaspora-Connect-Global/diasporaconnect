'use client';
import AboutAssociation from "@/components/cards/association/AboutAssociation";
import { ButtonType1 } from "@/components/custom/button";
import { PeopleYouMayKnow } from "@/components/home/PeopleYouMayKnow";
import { useParams } from 'next/navigation';
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import FeedCardWithReply from "@/components/cards/FeedCardWithReply";
import { useQuery, useMutation } from '@apollo/client/react';
import {
    GET_ASSOCIATION_DETAILS,
    REQUEST_JOIN_ASSOCIATION,
} from '@/services/gql/associations';
import { GET_FEED } from '@/services/gql/postsFeed'; // adjust path as needed

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */
interface AssociationDetails {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    memberCount?: number;
    createdAt?: string;
    visibility?: 'Public' | 'Private';
    membershipStatus?: string; // e.g. 'JOINED', 'PENDING', null
}

interface GetAssociationDetailsResponse {
    getAssociation: AssociationDetails;
}

interface FeedPost {
    id: string;
    text: string;
    authorId: string;
    authorType: string;
    createdAt: string;
    engagementCounts: {
        likes: number;
        comments: number;
        shares: number;
        saves: number;
    };
    userEngagement: {
        hasLiked: boolean;
        hasSaved: boolean;
    };
}

interface GetFeedResponse {
    feed: {
        total: number;
        posts: FeedPost[];
    };
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */
export default function AssociationPage() {
    const params = useParams();
    const associationId = params.id as string;

    const t = useTranslations("home.associations");
    const tActions = useTranslations("actions");

    /* -------------------------------------------------------------- */
    /* Fetch association details */
    /* -------------------------------------------------------------- */
    const { data: detailsData, loading: detailsLoading } = useQuery<GetAssociationDetailsResponse>(
        GET_ASSOCIATION_DETAILS,
        {
            variables: { associationId },
        }
    );

    /* -------------------------------------------------------------- */
    /* Fetch association feed */
    /* -------------------------------------------------------------- */
    const { data: feedData, loading: feedLoading } = useQuery<GetFeedResponse>(
        GET_FEED,
        {
            variables: {
                input: {
                    type: 'association', // adjust to whatever your schema expects
                    associationId,       // scope feed to this association
                    limit: 20,
                    offset: 0,
                },
            },
        }
    );

    /* -------------------------------------------------------------- */
    /* Join mutation */
    /* -------------------------------------------------------------- */
    const [requestJoin, { loading: joinLoading }] = useMutation(REQUEST_JOIN_ASSOCIATION, {
        variables: { associationId },
        // Refetch details after joining so membershipStatus updates
        refetchQueries: [
            { query: GET_ASSOCIATION_DETAILS, variables: { associationId } },
        ],
    });

    const association = detailsData?.getAssociation;
    const posts = feedData?.feed?.posts || [];
    const isJoined = association?.membershipStatus === 'MEMBER';

    /* -------------------------------------------------------------- */
    /* Loading state */
    /* -------------------------------------------------------------- */
    if (detailsLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <p className="text-text-secondary">{t("loading")}</p>
            </div>
        );
    }

    /* -------------------------------------------------------------- */
    /* Not found state */
    /* -------------------------------------------------------------- */
    if (!association) {
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
                    <h2 className="text-2xl font-semibold mb-2">{t("notfound.title")}</h2>
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

    /* -------------------------------------------------------------- */
    /* Render */
    /* -------------------------------------------------------------- */
    return (
        <div className="lg:flex overflow-y-auto h-app-inner">
            {/* Main Content Section */}
            <div className="overflow-y-auto scrollbar-hide lg:w-[40vw] px-3">
                {/* Association Header */}
                <div className="min-h-[6rem] flex space-x-4 my-4 py-3 border-b">
                    <div className="h-[6rem] w-[6rem] flex-shrink-0">
                        <Image
                            width={90}
                            height={90}
                            src={association.avatarUrl || '/ADANSI.PNG'}
                            alt={association.name}
                            className="h-full w-full rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col justify-between w-full">
                        <div></div>
                        <div className="justify-between items-center w-full">
                            <p className="heading-xsmall">{association.name}</p>
                            <div className="flex justify-end">
                                <ButtonType1
                                    className="py-1 px-3 ml-4 label-medium"
                                    onClick={() => {
                                        if (!isJoined) requestJoin();
                                    }}
                                    disabled={joinLoading || isJoined}
                                >
                                    {joinLoading
                                        ? tActions("joining")
                                        : isJoined
                                            ? tActions("joined")
                                            : tActions("join")}
                                </ButtonType1>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About — mobile only */}
                <div className="lg:hidden">
                    <AboutAssociation
                        members={association.memberCount ?? 0}
                        createdDate={association.createdAt ?? ''}
                        visibility={association.visibility ?? 'Public'}
                        description={association.description ?? ''}
                    />
                </div>

                {/* Feed */}
                <div className="overflow-auto lg:max-h-[calc(100vh-64px)] scrollbar-hide">
                    {feedLoading ? (
                        <p className="text-text-secondary text-sm py-4 px-2">{t("loadingPosts")}</p>
                    ) : posts.length > 0 ? (
                        posts.map((post) => (
                            <FeedCardWithReply
                                key={post.id}
                                postId={post.id}
                                profileImage={association.avatarUrl || '/ADANSI.PNG'}
                                profileName={association.name}
                                category={association.name}
                                postDate={post.createdAt}
                                content={post.text}
                                shares={post.engagementCounts.shares}
                                likes={post.engagementCounts.likes}
                                comments={post.engagementCounts.comments}
                                onLike={() => console.log('Like', post.id)}
                                onComment={() => console.log('Comment', post.id)}
                                onShare={() => console.log('Share', post.id)}
                                onSave={() => console.log('Save', post.id)}
                                joinButton={!isJoined}
                            />
                        ))
                    ) : (
                        <p className="text-text-secondary text-sm py-4 px-2">{t("noPosts")}</p>
                    )}
                </div>
            </div>

            {/* Sidebar */}
            <div className="lg:self-start h-app-inner lg:overflow-y-auto scrollbar-hide">
                <div className="space-y-6 flex-1 mb-6 mx-3">
                    {/* About — desktop only */}
                    <div className="hidden lg:block">
                        <AboutAssociation
                            members={association.memberCount ?? 0}
                            createdDate={association.createdAt ?? ''}
                            visibility={association.visibility ?? 'Public'}
                            description={association.description ?? ''}
                        />
                    </div>
                    <PeopleYouMayKnow />
                </div>
            </div>
        </div>
    );
}