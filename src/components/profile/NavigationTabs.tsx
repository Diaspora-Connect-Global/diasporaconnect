/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Card, CardContent } from "@/components/ui/card";
import { useState } from 'react';

import FilteredPosts from "./FilteredPosts";
import { useTranslations } from 'next-intl';
import AboutContent from "./AboutContent";

interface PersonalDetailsData {
  bio: string;
  fullName: string;
  dateOfBirth: string;
  residence: string;
  homeCountry: string;
}

interface WorkExperienceData {
  title: string;
  company: string;
  period: string;
  description: string;
}

interface EducationData {
  degree: string;
  institution: string;
  period: string;
}

interface AboutData {
  personalDetails: PersonalDetailsData;
  workExperience: WorkExperienceData[];
  education: EducationData[];
}

interface PostsData {
  // Define posts data structure as needed
  items: any[];
}

interface CommunitiesData {
  // Define communities data structure as needed
  items: any[];
}

interface NavigationTabsProps {
  userId: string;
    isOwnProfile:boolean

}

export function NavigationTabs({
userId,
isOwnProfile =false
}: NavigationTabsProps) {
  const t = useTranslations('profile.navigation');
  const tActions = useTranslations('actions');
  
  // State for main tabs and sub-tabs
  const [activeTab, setActiveTab] = useState("about");

  // Main horizontal tabs
  const mainTabs = [
    { id: 'about', label: t('about') },
    { id: 'posts', label: t('posts') },
    { id: 'communities', label: t('communities') },
  ];


  // Render content based on active main tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'about':
        return (
         <AboutContent isOwnProfile={isOwnProfile} userId= {userId}/>
        );

      case 'posts':
        return (
          <FilteredPosts />
        );

      case 'communities':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">{t('communities')}</h3>
          
              <p className="text-muted-foreground">{t('noCommunities')}</p>
           
            
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className=" p-0 ">
      <CardContent className="p-0">
        {/* Main Horizontal Tabs */}
        <div className="flex border-b bg-surface-subtle rounded-t-lg">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-6 py-3 text-sm font-medium cursor-pointer transition-colors ${activeTab === tab.id
                  ? 'text-primary border-b-2 border-border-brand'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => {
                setActiveTab(tab.id);
               
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {renderMainContent()}
        </div>
      </CardContent>
    </Card>
  );
}

