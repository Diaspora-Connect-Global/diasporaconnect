'use client';
import { useState } from 'react';
import InfoLinks from "../custom/infoLinks";
import { BodyMedium, LabelMedium, TextBrand } from "../utils";

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
        <div className="border border-gray-200 rounded-lg">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 rounded-t-lg"
            >
                <BodyMedium className="font-semibold text-gray-900">{title}</BodyMedium>
                <span className="text-gray-500">
                    {isOpen ? '▼' : '▶'}
                </span>
            </button>
            
            {isOpen && (
                <div className="px-4 pb-3 space-y-3">
                    <TextBrand className="cursor-pointer hover:underline block">
                        {defaultAction}
                    </TextBrand>
                    {children}
                </div>
            )}
        </div>
    );
}

export default function HomeSidebar() {
    const isCommunity = true;

    function NoCommunity() {
        return (
            <div className="my-4 space-y-4">
                <BodyMedium>
                    Join a community to see what's happening
                </BodyMedium>
                <LabelMedium>
                    <TextBrand>
                        Discover community
                    </TextBrand>
                </LabelMedium>
            </div>
        )
    }

    function Community() {
        const [openSections, setOpenSections] = useState({
            associations: true,
            groupChats: true,
            events: true,
            opportunities: true
        });

        const toggleSection = (section: keyof typeof openSections) => {
            setOpenSections(prev => ({
                ...prev,
                [section]: !prev[section]
            }));
        };

        return (
            <div className="space-y-4">
                {/* Associations Section */}
                <Section
                    title="Associations"
                    isOpen={openSections.associations}
                    onToggle={() => toggleSection('associations')}
                    defaultAction="Discover associations"
                >
                    <div className="space-y-2">
                        {[
                            { name: "The Adansi Times", type: "Public" },
                            { name: "Tech Innovations Daily", type: "Private" },
                            { name: "Global Finance Report", type: "Public" },
                            { name: "Health & Wellness Journal", type: "Private" }
                        ].map((association, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <BodyMedium>{association.name}</BodyMedium>
                                <span className={`text-xs px-2 py-1 rounded ${
                                    association.type === "Public" 
                                        ? "text-green-700 bg-green-100" 
                                        : "text-red-700 bg-red-100"
                                }`}>
                                    {association.type}
                                </span>
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
                        ].map((group, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <BodyMedium>{group.name}</BodyMedium>
                                <span className={`text-xs px-2 py-1 rounded ${
                                    group.type === "Public" 
                                        ? "text-green-700 bg-green-100" 
                                        : "text-red-700 bg-red-100"
                                }`}>
                                    {group.type}
                                </span>
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
                        ].map((event, index) => (
                            <div key={index} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <BodyMedium>{event.name}</BodyMedium>
                                        <LabelMedium className="text-gray-500">{event.type}</LabelMedium>
                                    </div>
                                    <LabelMedium className="text-gray-500 whitespace-nowrap">
                                        {event.date}
                                    </LabelMedium>
                                </div>
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
                        ].map((opportunity, index) => (
                            <div key={index} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <BodyMedium>{opportunity.title}</BodyMedium>
                                        <LabelMedium className="text-gray-500">{opportunity.company}</LabelMedium>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 whitespace-nowrap">
                                        {opportunity.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>
        )
    }

    return (
        <div className="p-4">
            {!isCommunity ? <NoCommunity /> : <Community />}

            <div className="text-center text-xs space-x-2 py-4 border-t border-gray-200 mt-6 flex flex-wrap">
                <InfoLinks />
            </div>
        </div>
    );
}