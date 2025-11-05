/* eslint-disable @typescript-eslint/no-explicit-any */

import { Card, CardContent } from "@/components/ui/card";
import { useState } from 'react';
import { PersonalDetailsContent } from "./PersonalDetailsContent";

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
  // State for main tabs and sub-tabs
  const [activeTab, setActiveTab] = useState(initialMainTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // Main horizontal tabs
  const mainTabs = [
    { id: 'about', label: 'About' },
    { id: 'posts', label: 'Posts' },
    { id: 'communities', label: 'Communities' },
  ];

  // About sub-tabs (vertical)
  const aboutSubTabs = [
    { id: 'personal-details', label: 'Personal details' },
    { id: 'work-experience', label: 'Work experience' },
    { id: 'education', label: 'Education' },
  ];

  // Render content based on active main tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <div className="flex lg:h-[60vh]">
            {/* Left Column - Vertical Tabs */}
            <div className="w-[12vw] h-full overflow-y-auto ">
              {aboutSubTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`w-full border-t text-left p-3 transition-colors cursor-pointer ${
                    activeSubTab === tab.id
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
            <div className="flex-1 border-l p-4 overflow-y-auto scrollbar-hide">
              {activeSubTab === 'personal-details' && (
                <PersonalDetailsContent  />
              )}
              {activeSubTab === 'work-experience' && (
                <WorkExperienceContent data={aboutData.workExperience} />
              )}
              {activeSubTab === 'education' && (
                <EducationContent data={aboutData.education} />
              )}
            </div>
          </div>
        );

      case 'posts':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">Posts</h3>
            {postsData.items.length === 0 ? (
              <p className="text-muted-foreground">No posts yet.</p>
            ) : (
              <div className="space-y-4">
                {/* Render posts data here */}
                {postsData.items.map((post, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    {/* Post content */}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'communities':
        return (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">Communities</h3>
            {communitiesData.items.length === 0 ? (
              <p className="text-muted-foreground">No communities joined yet.</p>
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
              className={`px-6 py-3 text-sm font-medium cursor-pointer transition-colors ${
                activeTab === tab.id
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




// Work Experience Content Component
interface WorkExperienceContentProps {
  data: WorkExperienceData[];
}

function WorkExperienceContent({ data }: WorkExperienceContentProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Work Experience</h3>
      <div className="space-y-4">
        {data.map((experience, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <h4 className="font-semibold">{experience.title}</h4>
            <p className="text-sm text-muted-foreground">{experience.company} • {experience.period}</p>
            <p className="text-sm mt-2">{experience.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Education Content Component
interface EducationContentProps {
  data: EducationData[];
}

function EducationContent({ data }: EducationContentProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Education</h3>
      <div className="space-y-4">
        {data.map((education, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <h4 className="font-semibold">{education.degree}</h4>
            <p className="text-sm text-muted-foreground">{education.institution} • {education.period}</p>
          </div>
        ))}
      </div>
    </div>
  );
}