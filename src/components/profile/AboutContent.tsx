'use client';

import React, { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PersonalDetailsContent } from './PersonalDetailsContent';
import WorkExperience from './WorkExperience';
import EducationContent from './EducationContent';

interface AboutContentProps {
  userId: string;
    isOwnProfile:boolean

}

export default function AboutContent({ userId, isOwnProfile =false }: AboutContentProps) {
  const t = useTranslations('profile.navigation');
  const [activeSubTab, setActiveSubTab] = useState("personal-details");

  const aboutSubTabs = [
    { id: 'personal-details', label: t('personalDetails') },
    { id: 'work-experience', label: t('workExperience') },
    { id: 'education', label: t('education') },
  ];

  return (
    <>
      <div className="flex">
        {/* Left Column - Vertical Tabs */}
        <div className="w-[12vw] h-full">
          {aboutSubTabs.map((tab) => (
            <div
              key={tab.id}
              className={`w-full border-t text-left p-3 transition-colors cursor-pointer ${
                activeSubTab === tab.id ? 'text-brand' : ''
              }`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <span className="text-sm font-medium">{tab.label}</span>
            </div>
          ))}
        </div>

        {/* Right Column - Content */}
        <div className="flex-1 border-l p-4">
          {activeSubTab === 'personal-details' && (
            <PersonalDetailsContent isOwnProfile={isOwnProfile} userId= {userId} />
          )}
          {activeSubTab === 'work-experience' && (
            <WorkExperience  />
          )}
          {activeSubTab === 'education' && (
            <EducationContent  />
          )}
        </div>
      </div>
    </>
  );
}