/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Card, CardContent } from "@/components/ui/card";
import { useState } from 'react';
import { PersonalDetailsContent } from "./PersonalDetailsContent";
import WorkExperience from "./WorkExperience";
import EducationContent from "./EducationContent";
import FilteredPosts from "./FilteredPosts";
import { useTranslations } from 'next-intl';

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
  initialMainTab?: string;
  initialSubTab?: string;
  aboutData: AboutData;
  postsData: PostsData;
  communitiesData: CommunitiesData;
}

export function NavigationTabs({
  initialMainTab = 'about',
  initialSubTab = 'personal-details',
  aboutData,
  postsData,
  communitiesData
}: NavigationTabsProps) {
  const t = useTranslations('profile.navigation');
  const tActions = useTranslations('actions');
  
  // State for main tabs and sub-tabs
  const [activeTab, setActiveTab] = useState(initialMainTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // Main horizontal tabs
  const mainTabs = [
    { id: 'about', label: t('about') },
    { id: 'posts', label: t('posts') },
    { id: 'communities', label: t('communities') },
  ];

  // About sub-tabs (vertical)
  const aboutSubTabs = [
    { id: 'personal-details', label: t('personalDetails') },
    { id: 'work-experience', label: t('workExperience') },
    { id: 'education', label: t('education') },
  ];
  // Post sub-tabs (vertical)
  const postsSubTabs = [
    { id: 'post-saved', label: t('saved') },
    { id: 'post-liked', label: t('liked') },
    { id: 'post-commented', label: t('commented') },
  ];

  // Render content based on active main tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <div className="flex">
            {/* Left Column - Vertical Tabs */}
            <div className="w-[12vw] h-full  ">
              {aboutSubTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`w-full border-t text-left p-3 transition-colors cursor-pointer ${activeSubTab === tab.id
                      ? 'text-brand'
                      : ''
                    }`}
                  onClick={() => setActiveSubTab(tab.id)}
                >
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
              ))}
            </div>

            {/* Right Column - Content */}
            <div className="flex-1 border-l p-4 ">
              {activeSubTab === 'personal-details' && (
                <PersonalDetailsContent />
              )}
              {activeSubTab === 'work-experience' && (
                <WorkExperience />
              )}
              {activeSubTab === 'education' && (
                <EducationContent/>
              )}
            </div>
          </div>
        );

      case 'posts':
        return (
          <FilteredPosts/>
        );

      case 'communities':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">{t('communities')}</h3>
            {communitiesData.items.length === 0 ? (
              <p className="text-muted-foreground">{t('noCommunities')}</p>
            ) : (
              <div className="space-y-4">
                {/* Render communities data here */}
                {communitiesData.items.map((community, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    {/* Community content */}
                  </div>
                ))}
              </div>
            )}
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
                // Reset to default sub-tab when switching to about
                if (tab.id === 'about') {
                  setActiveSubTab('personal-details');
                }
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

