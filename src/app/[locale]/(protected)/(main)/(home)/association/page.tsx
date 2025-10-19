"use client"
import JoinAssociationCard from "@/components/cards/JoinAssociationCard";
import { MyAssociationCard } from "@/components/cards/MyAssociationCard";
import { useTranslations } from "next-intl";

export default function Associations() {
    const tActions = useTranslations('actions');

    const myAssociations = [
        {
            title: "GhanaConnect:Global",
            description: "Connect with professionals and businesses across Ghana and abroad.",
            status: "Joined"
        },
        {
            title: "GhanaTechHub",
            description: "A platform for tech enthusiasts to collaborate and innovate in the Ghanaian tech landscape.",
            status: "Joined"
        },
        {
            title: "GhanaTechHub",
            description: "A platform for tech enthusiasts to collaborate and innovate in the Ghanaian tech landscape.",
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
        }
    ];
    return (
        <>
            <div className="w-full h-[calc(100vh-64px)] overflow-auto scrollbar-hide  ">
                <div className="">

               
                <p className="font-heading-large my-5">My associations in GhanaConnectGlobal</p>

                <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
                    {myAssociations.map((association, index) => (
                        <MyAssociationCard
                            key={index}
                            title={association.title}
                            description={association.description}
                            buttonText={association.status}
                        />
                    ))}
                </div>

                <p className="font-heading-medium my-5">Discover more associations in GhanaConnectGlobal</p>

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
            </div>
        </>
    );
}