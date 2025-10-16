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
            title: "GhanaArtsNetwork",
            description: "Showcasing the rich cultural heritage and contemporary art scenes of Ghana."
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
            title: "Ghana Developers Community",
            members: 2400,
            description: "Connect with artists and creatives to foster collaboration and projects.Connect with artists and creatives to foster collaboration and projectsConnect with artists and creatives to foster collaboration and projects"
        }
    ];

    return (
        <div className="mx-[15%] overflow-auto scrollbar-hide h-[calc(100vh-64px)]">
            <p className="font-heading-large my-5">{t('myCommunity')}</p>

            <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
                {myCommunities.map((community, index) => (
                    <MyCommunityCard
                        key={index}
                        title={community.title}
                        description={community.description}
                    />
                ))}
            </div>

            <p className="font-heading-medium my-5">{t('discoverMore')}</p>

            <div className="overflow-auto scrollbar-hide flex gap-3 mb-6">
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