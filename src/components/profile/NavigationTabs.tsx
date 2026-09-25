/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import FilteredPosts from "./FilteredPosts";
import ProfileCommunities from "./ProfileCommunities";
import { useTranslations } from 'next-intl';
import AboutContent from "./AboutContent";
import ProfileSocials from "./socials/ProfileSocials";
import { Profile } from "@/services/gql/profile";

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
    userData: Profile | undefined

}

/** Card for tab content; on phones it joins the tab bar above into one card. */
function ContentCard({ children }: { children: ReactNode }) {
  return (
    <Card className="p-0 max-lg:rounded-t-none max-lg:border-t-0 lg:rounded-2xl lg:border-[#E7ECF5] lg:shadow-none">
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function NavigationTabs({
userId,
isOwnProfile =false,
userData
}: NavigationTabsProps) {
  const t = useTranslations('profile.navigation');
  const tActions = useTranslations('actions');
  
  // The active tab lives in the URL (?tab=about) so other parts of the page —
  // "Edit profile", "Complete your profile" — can open a tab directly, and the
  // choice survives a refresh or a shared link.
  const searchParams = useSearchParams();
  const router = useRouter();
  const requested = searchParams.get('tab');
  const activeTab =
    requested === 'communities' || requested === 'about' || requested === 'socials' ? requested : 'posts';
  const setActiveTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'posts') params.delete('tab');
    else params.set('tab', id);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  };

  // Main horizontal tabs
  const mainTabs = [
    { id: 'posts', label: t('posts') },
    { id: 'communities', label: t('communities') },
    { id: 'about', label: t('about') },
    { id: 'socials', label: t('socials') },
  ];


  // Render content based on active main tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <ContentCard>
            <AboutContent isOwnProfile={isOwnProfile} userId={userId} userData={userData} />
          </ContentCard>
        );

      case 'posts':
        return (
          <FilteredPosts userId={userId} isOwnProfile={isOwnProfile} />
        );

      case 'communities':
        return (
          <ContentCard>
            <ProfileCommunities userId={userId} isOwnProfile={isOwnProfile} />
          </ContentCard>
        );

      case 'socials':
        // Mounted only while this tab is open, so its query is lazy.
        return (
          <ContentCard>
            <ProfileSocials userId={userId} isOwnProfile={isOwnProfile} />
          </ContentCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mb-6 lg:space-y-4">
      {/* Main horizontal tabs — their own card, as in the desktop design */}
      <Card className="p-0 max-lg:rounded-b-none max-lg:border-b-0 lg:rounded-2xl lg:border-[#E7ECF5] lg:shadow-none">
        <CardContent className="p-0">
          {/* Four tabs overflow narrow phones in longer locales: scroll rather than wrap. */}
          <div role="tablist" className="flex px-2 lg:px-4 overflow-x-auto scrollbar-hide">
            {mainTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative shrink-0 whitespace-nowrap px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-[15px] font-medium cursor-pointer transition-colors ${
                    active ? 'text-[#1F5FD6]' : 'text-[#1B2A5E]/80 hover:text-[#1B2A5E]'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[#1F5FD6]" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div role="tabpanel">{renderMainContent()}</div>
    </div>
  );
}
