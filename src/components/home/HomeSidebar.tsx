'use client';
import { useState } from 'react';
import InfoLinks from "../custom/infoLinks";
import { BodyMedium, BodySmall, CaptionLarge, LabelMedium, TextBrand, TextPrimary, TextSecondary } from "../utils";
import { ArrowUp, ArrowUp01, ChevronUp } from 'lucide-react';
import { MyCommunityCard2 } from '../cards/MyCommunityCard2';

// Reusable Section Component
interface SectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    defaultAction: string;
    children: React.ReactNode;
}

function Section({ title, isOpen, onToggle, defaultAction, children }: SectionProps) {
    return (
        <div className="border-b-1">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex justify-between items-center hover: "
            >
                <CaptionLarge className="font-semibold text-text-primary">{title}</CaptionLarge>
                <span className="text-gray-500">
                    {isOpen ? <ChevronUp size={10} /> : ''}
                </span>
            </button>

            {isOpen && (
                <div className="px-4 pb-3 space-y-3">
                    <BodySmall>
                        <TextBrand className="cursor-pointer hover:underline block">
                            {defaultAction}
                        </TextBrand>
                    </BodySmall>
                    {children}
                </div>
            )}
        </div>
    );
}

function NoCommunity() {
    return (
        <div className="my-4 space-y-4">
            <BodyMedium>
                Join a community to see what&apos;s happening
            </BodyMedium>
            <LabelMedium>
                <TextBrand>
                    Discover community
                </TextBrand>
            </LabelMedium>
        </div>
    )
}
function CommunityItem({ name, type }: { name: string, type: string }) {
    return (
        <div className="text-center  space-x-2  flex flex-wrap 
        justify-content-center items-center">
            <BodySmall>
                <span className="text-primary">{name}</span>
            </BodySmall>
            <span>·</span>
            <BodySmall>
                <span className="text-secondary">{type}</span>
            </BodySmall>
        </div>
    )
}
function Community() {
    const [openSections, setOpenSections] = useState({
        associations: false,
        groupChats: false,
        events: false,
        opportunities: false
    });


    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

     const communities = [
        {
            id: '1',
            title: 'GhanaConnect:Global',
            description: 'Connect with professionals and businesses across Ghana and abroad.'
        },
        {
            id: '2',
            title: 'GhanaTechHub',
            description: 'A platform for tech enthusiasts to collaborate and innovate.'
        },
        {
            id: '3',
            title: 'GhanaArtsNetwork',
            description: 'Showcasing the rich cultural heritage of Ghana.'
        }
    ];

    // Handle community change
    const handleCommunityChange = (community) => {
        console.log('Switched to:', community.title);
        // Add your logic here (e.g., fetch community data, update state, etc.)
    };

    // Handle leave community
    const handleLeaveCommunity = (community) => {
        console.log('Leaving:', community.title);
        // Add your logic here (e.g., show confirmation dialog, remove from list, etc.)
    };

    return (
        <div className="space-y-4">

             <MyCommunityCard2 
                communities={communities}
                defaultCommunityId='1'  // Optional: which community to show first
                onCommunityChange={handleCommunityChange}
                onLeaveCommunity={handleLeaveCommunity}
            />

            {/* Associations Section */}
            <Section
                title="Associations"
                isOpen={openSections.associations}
                onToggle={() => toggleSection('associations')}
                defaultAction="Discover associations"
            >
                <div className="space-y-1">
                    {[
                        { name: "The Adansi Times", type: "Public" },
                        { name: "Tech Innovations Daily", type: "Private" },
                        { name: "Global Finance Report", type: "Public" },
                        { name: "Health & Wellness Journal", type: "Private" }
                    ].map((association, index) => (
                        <div key={index}>
                            <CommunityItem name={association.name} type={association.type} />
                        </div>
                    ))}
                </div>
            </Section>

            {/* Group Chats Section */}
            <Section
                title="Groups chats"
                isOpen={openSections.groupChats}
                onToggle={() => toggleSection('groupChats')}
                defaultAction="Create group chat"
            >
                <div className="space-y-2">
                    {[
                        { name: "The Adansi Times", type: "Public" },
                        { name: "Tech Innovations Daily", type: "Private" }
                    ].map((item, index) => (
                        <div key={index} >
                            <CommunityItem name={item.name} type={item.type} />

                        </div>
                    ))}
                </div>
            </Section>

            {/* Events Section */}
            <Section
                title="Events"
                isOpen={openSections.events}
                onToggle={() => toggleSection('events')}
                defaultAction="Discover events"
            >
                <div className="space-y-3">
                    {[
                        { name: "Tech Conference 2024", date: "Dec 15", type: "Conference" },
                        { name: "Community Meetup", date: "Dec 20", type: "Networking" }
                    ].map((item, index) => (
                        <div key={index}>
                            <CommunityItem name={item.name} type={item.type} />
                        </div>
                    ))}
                </div>
            </Section>

            {/* Opportunities Section */}
            <Section
                title="Opportunities"
                isOpen={openSections.opportunities}
                onToggle={() => toggleSection('opportunities')}
                defaultAction="Find opportunities"
            >
                <div className="space-y-3">
                    {[
                        { title: "Frontend Developer", company: "Tech Corp", type: "Full-time" },
                        { title: "UI/UX Designer", company: "Design Studio", type: "Contract" }
                    ].map((item, index) => (
                        <div key={index} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                            <CommunityItem name={item.title} type={item.type} />
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    )
}
export default function HomeSidebar() {
    const isCommunity = true;


    return (
        <div className="p-4">
            {!isCommunity ? <NoCommunity /> : <Community />}

            <div className="text-center text-xs space-x-2 py-4  mt-6 flex flex-wrap">
                <InfoLinks />
            </div>
        </div>
    );
}