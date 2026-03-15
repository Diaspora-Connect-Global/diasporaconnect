'use client';
import { useState } from 'react';
import InfoLinks from "../custom/infoLinks";
import { BodyMedium, BodySmall, LabelMedium, TextBrand, } from "../utils";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MyCommunityCard2 } from '../cards/MyCommunityCard2';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@apollo/client/react';
import { GET_MY_GROUPS } from '@/services/gql/groups';
import { GET_USER_ASSOCIATIONS } from '@/services/gql/associations';
import ViewFilter from './viewFilter';
import { useUserStore } from '@/store/useUserStore';

// Reusable Section Component
interface SectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    defaultAction?: string;
    children?: React.ReactNode;
    image: string,
    link?: string;
}

interface Association {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    memberCount?: number;
    membershipStatus?: string;
    associationType?: { name: string };
}

interface UserAssociation {
    id: string;
    name: string;
}

interface GetUserAssociationsResponse {
    getUserAssociations: UserAssociation[];
}


interface Group {
    id: string;
    name: string;
    description?: string;
    privacy: string;
    memberCount: number;
    ownerId: string;
    createdAt: string;
    avatarUrl?: string;
}

interface ListAvailableAssociationsResponse {
    listAssociations: {
        associations: Association[];
        total: number;
    };
}

interface GetMyGroupsResponse {
    getMyGroups: {
        success: boolean;
        message: string;
        total: number;
        groups: Group[];
    };
}

function Section({ image, title, isOpen, onToggle, defaultAction, children, link }: SectionProps) {
    // If link is provided and no defaultAction or children, treat as a navigable link
    if (link && !defaultAction && !children) {
        return (
            <div className="border-b border-b-border-subtle ">
                <div
                    className="w-full py-4 flex justify-between items-center  text-text-primary  transition-colors"
                >
                    <Link href={link} className=" hover:text-text-brand flex space-x-3 items-center text-center justify-center ">
                        {image ? (
                            <Image
                                width={10}
                                height={10}
                                src={image}
                                alt="Profile"
                                className="w-5 h-5 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center text-xs font-medium text-text-secondary shrink-0">
                                {title.charAt(0) || '?'}
                            </div>
                        )}
                        <span className="font-caption-large truncate">{title}</span>
                    </Link>
                </div>
            </div>
        );
    }

    // Default expandable section behavior
    return (
        <div className="border-b border-b-border-subtle ">
            <button
                onClick={onToggle}
                className="w-full  py-4 flex justify-between text-center items-center cursor-pointer"
            >
                <div className="flex space-x-3 items-center text-center justify-center ">
                    {image ? (
                        <Image
                            width={10}
                            height={10}
                            src={image}
                            alt="Profile"
                            className="w-5 h-5 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center text-xs font-medium text-text-secondary shrink-0">
                            {title.charAt(0) || '?'}
                        </div>
                    )}
                    <span className="text-text-primary font-caption-large truncate">{title}</span>
                </div>
                <span className="text-text-primary">
                    {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </span>
            </button>

            {isOpen && (
                <div className="pl-8 pb-3 space-y-3">
                    <Link href={`${link}`}>
                        <BodySmall>
                            <TextBrand className="cursor-pointer hover:underline block">
                                {defaultAction}
                            </TextBrand>
                        </BodySmall>
                    </Link>

                    {children}
                </div>
            )}
        </div>
    );
}

function NoCommunity() {
    const t = useTranslations('community');

    return (
        <div className="my-4 space-y-4">
            <BodyMedium>
                {t('join')}
            </BodyMedium>
            <LabelMedium>
                <TextBrand>
                    {t('discover')}
                </TextBrand>
            </LabelMedium>
        </div>
    )
}

function CommunityItem({ name, type, link, onClick }: { name: string, type?: string, link: string, onClick?: () => void }) {
    const t = useTranslations('privacy');

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div className="text-center space-x-2 flex flex-wrap 
        justify-content-center items-center">
            <BodySmall>
                <Link href={link} onClick={handleClick}>
                    <span className="text-primary">{name}</span>
                </Link>
            </BodySmall>
            {type && (
                <>
                    <span>·</span>
                    <BodySmall>
                        <span className="text-secondary">
                            {type === 'Public' ? t('public') : t('private')}
                        </span>
                    </BodySmall>
                </>
            )}
        </div>
    )
}

function SidebarLists() {
    const [openSections, setOpenSections] = useState({
        associations: true,
        groupChats: true,
        events: false,
        opportunities: false
    });

    const tPrivacy = useTranslations('privacy');
    const t = useTranslations('home');
    const userId = useUserStore(state => state.user?.userId);

    // Fetch available associations

    const {
        data: userAssociationsData,
        loading: userAssociationsLoading
    } = useQuery<GetUserAssociationsResponse>(
        GET_USER_ASSOCIATIONS,
        {
            variables: { userId: userId! },
            skip: !userId,
        }
    );

    // Fetch user's groups
    const { data: groupsData, loading: groupsLoading } = useQuery<GetMyGroupsResponse>(
        GET_MY_GROUPS,
        {
            variables: {
                limit: 10,
                offset: 0
            }
        }
    );

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const myGroups = groupsData?.getMyGroups?.groups || [];
    const myAssociations =
        userAssociationsData?.getUserAssociations || [];

    const handleGroupClick = (groupId: string) => {
        // Set active chat in session storage
        sessionStorage.setItem('activeChat', JSON.stringify({
            id: groupId,
            type: 'group'
        }));

        // Navigate to chat page
        window.location.href = '/chat?t=groups&ct=group';
    };

    const handleAssociationClick = (associationId: string) => {
        // Navigate to association page
        window.location.href = `/association/${associationId}`;
    };

    return (
        <div className=" ">
            <div className='mt-3'>
                <ViewFilter />
            </div>
            <MyCommunityCard2 />

            {/* Associations Section */}
            <Section
                title={t('associations.discover')}
                isOpen={openSections.associations}
                onToggle={() => toggleSection('associations')}
                defaultAction={t('associations.discover')}
                image='/ASSOCIATION.png'
                link="/association"
            >
                <div className="space-y-1">
                    {userAssociationsLoading ? (
                        <BodySmall>
                            <span className="text-secondary">Loading associations...</span>
                        </BodySmall>
                    ) : myAssociations.length > 0 ? (
                        myAssociations.map((association) => (
                            <div key={association.id}>
                                <CommunityItem
                                    link={`/association/${association.id}`}
                                    name={association.name}
                                    onClick={() => handleAssociationClick(association.id)}
                                />
                            </div>
                        ))
                    ) : (
                        <BodySmall>
                            <span className="text-secondary">No associations joined yet</span>
                        </BodySmall>
                    )}

                </div>
            </Section>

            {/* Group Chats Section */}
            <Section
                title={t('groupchats.groupchats')}
                isOpen={openSections.groupChats}
                onToggle={() => toggleSection('groupChats')}
                defaultAction={t('groupchats.discover')}
                image='/GROUPCHAT.png'
                link="/chat?t=groups"
            >
                <div className="space-y-2">
                    {groupsLoading ? (
                        <BodySmall>
                            <span className="text-secondary">Loading groups...</span>
                        </BodySmall>
                    ) : myGroups.length > 0 ? (
                        myGroups.map((group) => (
                            <div key={group.id}>
                                <CommunityItem
                                    link={`/chat?t=groups&ct=group`}
                                    name={group.name}
                                    type={group.privacy === "PUBLIC" ? `${tPrivacy("public")}` : `${tPrivacy("private")}`}
                                    onClick={() => handleGroupClick(group.id)}
                                />
                            </div>
                        ))
                    ) : (
                        <BodySmall>
                            <span className="text-secondary">No groups yet</span>
                        </BodySmall>
                    )}
                </div>
            </Section>

            {/* Events Section */}
            <Section
                title={t('events.events')}
                isOpen={openSections.events}
                onToggle={() => toggleSection('events')}
                image='/EVENTS.png'
                link="/events"
            />

            {/* Opportunities Section */}
            <Section
                title={t('opportunities.opportunities')}
                isOpen={openSections.opportunities}
                onToggle={() => toggleSection('opportunities')}
                image='/OPPORTUNITIES.png'
                link='/opportunities'
            />
        </div>
    )
}

export default function HomeSidebar() {

    return (
        <div className='lg:max-w-[20vw] h-app-inner  lg:sticky top-[4rem] overflow-y-auto scrollbar-hide z-50'>
            <SidebarLists />

            <div className="text-center text-xs space-x-2 py-4 mt-6 flex flex-wrap">
                <InfoLinks />
            </div>
        </div>
    );
}