/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import JoinAssociationCard from "@/components/cards/JoinAssociationCard";
import { MyAssociationCard } from "@/components/cards/MyAssociationCard";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useTranslations } from "next-intl";

export default function Associations() {
    const tActions = useTranslations('actions');
    const tAssociations = useTranslations('home.associations');
    
    // Get selected community from store
    const selectedCommunity = useCommunityStore(state => state.getSelectedCommunity());
    
    // Community-specific associations
    const communityAssociations: Record<string, any[]> = {
        '1': [ // GhanaConnect:Global
            {
                id: 'global-business-connect',
                title: "Global Business Connect",
                description: "Connecting Ghanaian entrepreneurs with international business opportunities and partnerships.",
                status: "Pending"
            },
            {
                id: 'diaspora-professionals',
                title: "Diaspora Professionals Network",
                description: "A network for Ghanaian professionals abroad to share opportunities and collaborate.",
                status: "Joined"
            },
            {
                id: 'invest-ghana',
                title: "Invest Ghana Initiative",
                description: "Promoting investment opportunities in Ghana for local and international investors.",
                status: "Pending"
            },
            {
                id: 'trade-bridge',
                title: "Trade Bridge Association",
                description: "Facilitating trade connections between Ghana and global markets.",
                status: "Pending"
            }
        ],
        '2': [ // GhanaTechHub
            {
                id: 'techstars-ghana',
                title: "TechStars Ghana",
                description: "Supporting tech startups with mentorship, funding, and resources to scale.",
                status: "Joined"
            },
            {
                id: 'dev-community',
                title: "Ghana Developers Community",
                description: "A collaborative space for software developers to learn, share, and build together.",
                status: "Joined"
            },
            {
                id: 'ai-innovators',
                title: "AI Innovators Ghana",
                description: "Exploring artificial intelligence applications and innovations in Ghana.",
                status: "Pending"
            },
            {
                id: 'fintech-forum',
                title: "FinTech Forum Ghana",
                description: "Discussing financial technology trends and solutions for the Ghanaian market.",
                status: "Pending"
            }
        ],
        '3': [ // GhanaArtsNetwork
            {
                id: 'creative-artists',
                title: "Creative Artists Collective",
                description: "A community of visual artists, painters, and sculptors showcasing Ghanaian art.",
                status: "Joined"
            },
            {
                id: 'music-makers',
                title: "Ghana Music Makers",
                description: "Supporting musicians, producers, and sound engineers in the Ghanaian music industry.",
                status: "Pending"
            },
            {
                id: 'cultural-heritage',
                title: "Cultural Heritage Preservation",
                description: "Preserving and promoting traditional Ghanaian art forms and cultural practices.",
                status: "Pending"
            },
            {
                id: 'film-production',
                title: "Ghana Film Production Guild",
                description: "Advancing the Ghanaian film industry through collaboration and knowledge sharing.",
                status: "Pending"
            }
        ]
    };

    const communityDiscoverAssociations: Record<string, any[]> = {
        '1': [ // GhanaConnect:Global
            {
                title: "Export Excellence Network",
                members: 890,
                description: "Helping Ghanaian businesses expand into international markets."
            },
            {
                title: "Global Talent Exchange",
                members: 1450,
                description: "Connecting skilled Ghanaians with opportunities worldwide."
            },
            {
                title: "Cross-Border Commerce",
                members: 720,
                description: "Facilitating seamless international trade and commerce."
            },
            {
                title: "International Partners Hub",
                members: 980,
                description: "Building strategic partnerships between Ghana and the world."
            }
        ],
        '2': [ // GhanaTechHub
            {
                title: "Coding Bootcamp Graduates",
                members: 2100,
                description: "A network of coding bootcamp alumni building the future of tech in Ghana."
            },
            {
                title: "Blockchain Ghana",
                members: 650,
                description: "Exploring blockchain technology and cryptocurrency innovations."
            },
            {
                title: "Women in Tech Ghana",
                members: 1850,
                description: "Empowering women to thrive in technology careers."
            },
            {
                title: "Cybersecurity Professionals",
                members: 540,
                description: "Protecting Ghana's digital infrastructure through collaboration."
            }
        ],
        '3': [ // GhanaArtsNetwork
            {
                title: "Traditional Dance Ensemble",
                members: 780,
                description: "Preserving and performing traditional Ghanaian dances."
            },
            {
                title: "Contemporary Art Gallery",
                members: 920,
                description: "Showcasing modern interpretations of Ghanaian art."
            },
            {
                title: "Literary Writers Circle",
                members: 610,
                description: "Supporting authors and poets telling Ghanaian stories."
            },
            {
                title: "Theatre Arts Collective",
                members: 830,
                description: "Producing plays and performances celebrating Ghanaian culture."
            }
        ]
    };
    
    // If no community is selected, show a message
    if (!selectedCommunity) {
        return (
            <div className="lg:w-[60vw] h-app-inner px-4 py-2 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-600 mb-2">{tAssociations("noCommunitySelected")}</p>
                    <p className="text-sm text-gray-500">{tAssociations("selectCommunityMessage")}</p>
                </div>
            </div>
        );
    }

    // Get associations for the selected community
    const myAssociations = communityAssociations[selectedCommunity.id] || [];
    const discoverAssociations = communityDiscoverAssociations[selectedCommunity.id] || [];
    
    return (
        <>
            <div className="lg:w-[60vw] h-app-inner px-4 py-2 overflow-y-auto scrollbar-hide">
                <p className="heading-small mb-2">
                    {tAssociations("myassociations", { association: selectedCommunity.name })}
                </p>

                <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[18rem]">
                    {myAssociations.length > 0 ? (
                        myAssociations.map((association, index) => (
                            <MyAssociationCard
                                key={association.id}
                                id={association.id}
                                title={association.title}
                                description={association.description}
                                buttonText={association.status === "Joined" ? tActions('joined') : tActions('pending')}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            {tAssociations("noAssociations")}
                        </div>
                    )}
                </div>

                <p className="heading-small my-5">
                    {tAssociations("discovermore", { association: selectedCommunity.name })}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {discoverAssociations.length > 0 ? (
                        discoverAssociations.map((community, index) => (
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
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                            {tAssociations("noDiscoverAssociations")}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}