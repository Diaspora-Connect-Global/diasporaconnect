'use client';
import { FilterableList } from '@/components/custom/filterableList';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { moreOpportunitiesIDList } from './data';
import { useTranslations } from 'next-intl';

const employmentCareerItems = [
    {
        id: "1",
        title: "Project Manager",
        company: "Global Tech Solutions",
        location: "Kigali, Rwanda",
        type: "On-site",
        date: "Just now",
        imageUrl: "/images/global-tech.jpg"
    },
    {
        id: "2",
        title: "Senior Developer",
        company: "Tech Startup Inc",
        location: "Ghana",
        type: "Remote",
        date: "2 hours ago"
    },
    {
        id: "3",
        title: "Project Manager",
        company: "Global Tech Solutions",
        location: "Kigali, Rwanda",
        type: "On-site",
        date: "Just now",
        imageUrl: "/images/global-tech.jpg"
    },
    {
        id: "4",
        title: "Senior Developer",
        company: "Tech Startup Inc",
        location: "Ghana",
        type: "Remote",
        date: "2 hours ago"
    },
    {
        id: "4",
        title: "Project Manager",
        company: "Global Tech Solutions",
        location: "Kigali, Rwanda",
        type: "On-site",
        date: "Just now",
        imageUrl: "/images/global-tech.jpg"
    },
    {
        id: "6",
        title: "Senior Developer",
        company: "Tech Startup Inc",
        location: "Ghana",
        type: "Remote",
        date: "2 hours ago"
    },
];

const educationTrainingItems = [
    {
        id: "1",
        title: "Full Stack Web Development Bootcamp",
        institution: "Tech Academy Africa",
        location: "Lagos, Nigeria",
        type: "Online Course",
        date: "Just now",
        duration: "12 weeks",
        level: "Beginner to Advanced",
        imageUrl: "/images/tech-academy.jpg"
    },
    {
        id: "2",
        title: "Data Science Certification Program",
        institution: "African Data Institute",
        location: "Nairobi, Kenya",
        type: "Certification Program",
        date: "1 hour ago",
        duration: "6 months",
        level: "Intermediate",
        imageUrl: "/images/data-institute.jpg"
    },
    {
        id: "3",
        title: "Digital Marketing Workshop",
        institution: "Marketing Pro Africa",
        location: "Accra, Ghana",
        type: "Workshop",
        date: "3 hours ago",
        duration: "2 days",
        level: "All Levels",
        imageUrl: "/images/marketing-pro.jpg"
    },

];

export default function OpportunityId() {
    const t = useTranslations('home.opportunities.notFound');
    const params = useParams();
    const opportunityId = params.id as string;
    const listConfig = moreOpportunitiesIDList.find(config => config.id === opportunityId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [filteredItems, setFilteredItems] = useState<any>([]);

    // Initialize with all items filtered
    useEffect(() => {

        if (opportunityId === 'education-training') {
            setFilteredItems(educationTrainingItems);
            return;
        }
        setFilteredItems(employmentCareerItems);
    }, [opportunityId]);

    if (!listConfig) {
        return (
            <div className="lg:max-w-[60vw] mx-2 py-4 flex items-center justify-center">
                <div className="text-text-secondary font-medium text-center">
                    <p className="text-2xl mb-2">{t('title')}</p>
                    <p>{t('description', { id: opportunityId })}</p>
                </div>
            </div>
        );
    }

    return (
        <div className=' h-app-inner  overflow-y-auto scrollbar-hide '>
            <FilterableList
                items={employmentCareerItems}
                filteredItems={filteredItems}
                setFilteredItems={setFilteredItems}
                listConfig={listConfig}
                title={listConfig.title}
            />

        </div>
    );
}