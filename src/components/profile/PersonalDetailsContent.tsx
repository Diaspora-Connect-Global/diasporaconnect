// Example usage in your profile page
import { useState, useEffect } from 'react';
import { EditableField } from './EditableField';
import { BioEditModal } from './modals/BioEditModal';
import { DOBEditModal } from './modals/DOBEditModal';
import { NameEditModal } from './modals/NameEditModal';
import { ResidenceEditModal } from './modals/ResidenceEdit.tsx';
import { HomeCountryEditModal } from './modals/HomeCountryEditModal';
import { useTranslations } from 'next-intl';
import { DUMMY_USERS } from '@/data/users';

interface PersonalDetailsContentProps {
  userId: string;
  isOwnProfile:boolean
}

export function PersonalDetailsContent({ userId , isOwnProfile =false}: PersonalDetailsContentProps) {
  const t = useTranslations('profile.personalDetails');
  const [userData, setUserData] = useState({
    bio: "",
    fullName: "",
    dateOfBirth: "",
    residence: "",
    homeCountry: ""
  });

  // State for modals
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isDobModalOpen, setIsDobModalOpen] = useState(false);
  const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);
  const [isHomeCountryModalOpen, setIsHomeCountryModalOpen] = useState(false);



  // Fetch user data based on userId
  useEffect(() => {
    const fetchUserData = () => {
      if (userId === "me") {
        // For "me", use current user data (you might want to replace this with actual current user data)
        setUserData({
          bio: "I am known to be a software developer who enjoys hiking and coding.",
          fullName: "John Doe",
          dateOfBirth: "14 November 1990",
          residence: "Mechelen, Belgium (4 years)",
          homeCountry: "Ghana"
        });
      } else {
        // For other users, fetch from DUMMY_USERS
        const user = DUMMY_USERS[userId as keyof typeof DUMMY_USERS];
        if (user && user.aboutData) {
          setUserData({
            bio: user.aboutData.personalDetails.bio,
            fullName: user.aboutData.personalDetails.fullName,
            dateOfBirth: user.aboutData.personalDetails.dateOfBirth,
            residence: user.aboutData.personalDetails.residence,
            homeCountry: user.aboutData.personalDetails.homeCountry
          });
        } else {
          // Fallback for unknown users
          setUserData({
            bio: "This user hasn't added a bio yet.",
            fullName: "Unknown User",
            dateOfBirth: "Not specified",
            residence: "Not specified",
            homeCountry: "Not specified"
          });
        }
      }
    };

    fetchUserData();
  }, [userId]);

  // Handlers for each field
  const handleBioSave = (newBio: string) => {
    setUserData(prev => ({ ...prev, bio: newBio }));
    // Your API call here
  };

  const handleNameSave = (newName: string) => {
    setUserData(prev => ({ ...prev, fullName: newName }));
    // Your API call here
  };

  const handleDobSave = (newDob: string) => {
    setUserData(prev => ({ ...prev, dateOfBirth: newDob }));
    // Your API call here
  };

  const handleResidenceSave = (newResidence: string) => {
    setUserData(prev => ({ ...prev, residence: newResidence }));
    // Your API call here
  };

  const handleHomeCountrySave = (newHomeCountry: string) => {
    setUserData(prev => ({ ...prev, homeCountry: newHomeCountry }));
    // Your API call here
  };

  return (
    <div className="space-y-6">
      {/* Bio Field - Only show for own profile */}
      {isOwnProfile && (
        <EditableField
          title={t('bio')}
          data={userData.bio}
          onEdit={() => setIsBioModalOpen(true)}
          showEditButton={isOwnProfile}
        />
      )}

      {/* Full Name Field - Only show for own profile */}
      {isOwnProfile && (
        <EditableField
          title={t('fullName')}
          data={userData.fullName}
          onEdit={() => setIsNameModalOpen(true)}
          showEditButton={isOwnProfile}
        />
      )}

      {/* Date of Birth Field - Only show for own profile */}
      {isOwnProfile && (
        <EditableField
          title={t('dateOfBirth')}
          data={userData.dateOfBirth}
          onEdit={() => setIsDobModalOpen(true)}
          showEditButton={isOwnProfile}
        />
      )}

      {/* Residence Field - Show for all users */}
      <EditableField
        title={t('residenceAddress')}
        data={userData.residence}
        onEdit={() => setIsResidenceModalOpen(true)}
        showEditButton={isOwnProfile}
      />

      {/* Home Country Field - Show for all users */}
      <EditableField
        title={t('homeCountry')}
        data={userData.homeCountry}
        onEdit={() => setIsHomeCountryModalOpen(true)}
        showEditButton={isOwnProfile}
      />

      {/* Modals - Only show for own profile */}
      {isOwnProfile && (
        <>
          <BioEditModal
            isOpen={isBioModalOpen}
            onClose={() => setIsBioModalOpen(false)}
            onSave={handleBioSave}
            initialData={userData.bio}
          />

          <NameEditModal
            isOpen={isNameModalOpen}
            onClose={() => setIsNameModalOpen(false)}
            onSave={handleNameSave}
            initialData={userData.fullName}
          />

          <DOBEditModal
            isOpen={isDobModalOpen}
            onClose={() => setIsDobModalOpen(false)}
            onSave={handleDobSave}
            initialData={userData.dateOfBirth}
          />
        </>
      )}

      {/* Residence and Home Country modals - Only show for own profile */}
      {isOwnProfile && (
        <>
          <ResidenceEditModal
            isOpen={isResidenceModalOpen}
            onClose={() => setIsResidenceModalOpen(false)}
            onSave={handleResidenceSave}
            initialData={userData.residence}
          />

          <HomeCountryEditModal
            isOpen={isHomeCountryModalOpen}
            onClose={() => setIsHomeCountryModalOpen(false)}
            onSave={handleHomeCountrySave}
            initialData={userData.homeCountry}
          />
        </>
      )}
    </div>
  );
}