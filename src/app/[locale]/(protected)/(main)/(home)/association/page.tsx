"use client"
import JoinAssociationCard from "@/components/cards/JoinAssociationCard";
import { MyAssociationCard } from "@/components/cards/MyAssociationCard";
import { useTranslations } from "next-intl";

export default function Associations() {
    const tActions = useTranslations('actions');
    const tAssociations = useTranslations('home.associations');
    const myAssociations = [
        {
            id: 'adansi-times',
            title: "The Adansi Times",
            description: "Community news and stories from the Ghanaian diaspora. Stay connected with your roots and discover inspiring journeys",
            status: "Joined"
        },
        {
            id: 'tech-innovations-daily',
            title: "Tech Innovations Daily",
            description: "Daily updates on technology, startups, and product innovation around the world.",
            status: "Joined"
        },
        {
            id: 'global-finance-report',
            title: "Global Finance Report",
            description: "Coverage of global markets, macro trends, and finance insights for professionals and enthusiasts.",
            status: "Pending"
        },
        {
            id: 'health-wellness-journal',
            title: "Health & Wellness Journal",
            description: "Articles and tips on physical and mental wellbeing, lifestyle, and healthy living.",
            status: "Pending"
        }
    ];

    const discoverAssociations = [
        {
            title: "Ghana Innovation Hub",
            members: 1200,
            description: "Networking opportunities for tech enthusiasts and professionals in Ghana."
        },
        {
            title: "Ghana Business Network",
            members: 850,
            description: "A space for businesses to exchange services and resources effectively."
        },
        {
            title: "Ghana Business Network",
            members: 850,
            description: "A space for businesses to exchange services and resources effectively."
        },
        {
            title: "Ghana Business Network",
            members: 850,
            description: "A space for businesses to exchange services and resources effectively."
        },

    ];
    return (
        <>
            <div className="w-full p-4 overflow-y-auto scrollbar-hide">
                <p className="font-heading-large my-5">{tAssociations("myassociations", { association: "GhanaConnectGlobal" })}</p>

                <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[18rem]  ">
                    {myAssociations.map((association, index) => (
                        <MyAssociationCard
                            key={index}
                            id={association.id}
                            title={association.title}
                            description={association.description}
                            buttonText={association.status  == "Joined"? tActions('joined') : tActions('pending')}
                        />
                    ))}
                </div>

                <p className="font-heading-medium my-5">{tAssociations("discovermore", { association: "GhanaConnectGlobal" })}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {discoverAssociations.map((community, index) => (
                        <JoinAssociationCard
                            key={index}
                            profileImage="/ADANSI.png"
                            profileName="adansi"
                            title={community.title}
                            members={community.members}
                            onButtonClick={() => console.log(`Join ${community.title} clicked!`)}
                            buttonText={tActions('join')}
                            description={community.description}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}