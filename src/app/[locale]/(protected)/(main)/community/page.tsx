'use client';
import JoinCommunityCard from "@/components/cards/JoinCommunityCard";
import { MyCommunityCard } from "@/components/cards/MyCommunityCard";
import { useTranslations } from 'next-intl';

export default function Community() {
    const t = useTranslations('community');
    const tActions = useTranslations('actions');
    
    const myCommunities = [
        {
            title: "GhanaConnect:Global",
            description: "Connect with professionals and businesses across Ghana and abroad."
        },
        {
            title: "GhanaTechHub",
            description: "A platform for tech enthusiasts to collaborate and innovate in the Ghanaian tech landscape."
        },
        {
            title: "GhanaTechHub",
            description: "A platform for tech enthusiasts to collaborate and innovate in the Ghanaian tech landscape."
        } 
    ];

    const discoverCommunities = [
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
        <div className="mx-2 md:mx-[15%] overflow-auto scrollbar-hide h-app-inner pb-1">
            <p className="text-2xl font-heading-large my-5">{t('myCommunity')}</p>

            <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
                {myCommunities.map((community, index) => (
                    <MyCommunityCard
                        key={index}
                        title={community.title}
                        description={community.description}
                    />
                ))}
            </div>

            <p className=" text-2xl font-heading-medium my-5">{t('discoverMore')}</p>

            <div className="overflow-auto scrollbar-hide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {discoverCommunities.map((community, index) => (
                    <JoinCommunityCard
                        key={index}
                        title={community.title}
                        members={community.members}
                        onButtonClick={() => console.log(`Join ${community.title} clicked!`)}
                        buttonText={tActions('join')}
                        description={community.description}
                    />
                ))}
            </div>
        </div>
    );
}