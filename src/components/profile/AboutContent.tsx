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
      <div className="lg:flex ">
        {/* Left Column - Vertical Tabs */}
        <div className="lg:w-[12vw] h-full flex lg:flex-col ">
          {aboutSubTabs.map((tab) => (
            <div
              key={tab.id}
              className={`w-full border-t text-left lg:p-3 p-1 transition-colors cursor-pointer ${
                activeSubTab === tab.id ? 'text-brand border-b-2 border-b-border-brand ' : ''
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