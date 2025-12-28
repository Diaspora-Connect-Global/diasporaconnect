'use client';

import { useState, useEffect } from 'react';
import { EditableField } from './EditableField';
import { BioEditModal } from './modals/BioEditModal';
import { DOBEditModal } from './modals/DOBEditModal';
import { NameEditModal } from './modals/NameEditModal';
import { ResidenceEditModal } from './modals/ResidenceEdit.tsx';
import { HomeCountryEditModal } from './modals/HomeCountryEditModal';
import { useTranslations } from 'next-intl';
import { GET_MY_PROFILE, Profile, UpdateProfileInput } from '@/services/gql/profile';
import { useMutation } from '@apollo/client/react';
import { UPDATE_PROFILE } from '@/services/gql/profile';
import { countryLookup } from '@/macros/countryLookup';

interface PersonalDetailsContentProps {
  userId: string;
  isOwnProfile: boolean;
  userData: Profile | undefined;
}

export function PersonalDetailsContent({ userId, isOwnProfile = false, userData }: PersonalDetailsContentProps) {
  const t = useTranslations('profile.personalDetails');

  const [localUserData, setLocalUserData] = useState<Profile | undefined>(userData);
  useEffect(() => {
    setLocalUserData(userData);
  }, [userData]);

  // const [updateProfile] = useMutation<{ updateProfile: { success: boolean; message?: string; profile: Profile } }>(
  //   UPDATE_PROFILE
  // );


  const [updateProfile] = useMutation<{
    updateProfile: { success: boolean; message?: string; profile: Profile }
  }>(UPDATE_PROFILE, {
    refetchQueries: [{ query: GET_MY_PROFILE }],
    // or refetchQueries: ['GetMyProfile'], // if your query has operationName
    awaitRefetchQueries: true, // Wait for refetch to complete
  });

  // Loading states for each modal
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isDobLoading, setIsDobLoading] = useState(false);
  const [isResidenceLoading, setIsResidenceLoading] = useState(false);
  const [isHomeCountryLoading, setIsHomeCountryLoading] = useState(false);

  const handleSaveField = async (field: Partial<UpdateProfileInput>, setLoading: (val: boolean) => void) => {
    if (!localUserData) return;
    setLoading(true);
    try {
      const input: UpdateProfileInput = {
        version: localUserData.version,
        ...field,
      };

      const { data } = await updateProfile({ variables: { input } });

      if (data?.updateProfile.success) {
        setLocalUserData(prev => prev ? { ...prev, ...field, version: prev.version + 1 } : prev);
      } else {
        console.error('Update failed:', data?.updateProfile.message);
      }
    } catch (err) {
      console.error('GraphQL error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) =>
    dateStr
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))
      : '';

  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isDobModalOpen, setIsDobModalOpen] = useState(false);
  const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);
  const [isHomeCountryModalOpen, setIsHomeCountryModalOpen] = useState(false);
  
  const countryName = 
  countryLookup[localUserData?.residenceCountry?.slice(0, 2).toUpperCase() ?? '']?.name 
  || localUserData?.residenceCountry 
  || 'Unknown';


  const homeCountryName = countryLookup[localUserData?.countryOfOrigin?.slice(0, 2).toUpperCase() ?? '']?.name || localUserData?.countryOfOrigin  || 'Unknown';

    const residenceStr = `${localUserData?.city}, ${countryName}. Since ${localUserData?.residenceSinceMonth}, ${localUserData?.residenceSinceYear}`; 



  return (
    <div className="space-y-6">
      {isOwnProfile && (
        <EditableField
          title={t('bio')}
          data={localUserData?.bio || ''}
          onEdit={() => setIsBioModalOpen(true)}
          showEditButton={isOwnProfile}
        />
      )}

      {isOwnProfile && (
        <EditableField
          title={t('fullName')}
          data={`${localUserData?.firstName || ''} ${localUserData?.middleName || ''} ${localUserData?.lastName || ''}`}
          onEdit={() => setIsNameModalOpen(true)}
          showEditButton={isOwnProfile}
        />
      )}

      {isOwnProfile && (
        <EditableField
          title={t('dateOfBirth')}
          data={formatDate(localUserData?.dateOfBirth)}
          onEdit={() => setIsDobModalOpen(true)}
          showEditButton={isOwnProfile}
        />
      )}

      <EditableField
        title={t('residenceAddress')}
        data={residenceStr}
        onEdit={() => setIsResidenceModalOpen(true)}
        showEditButton={isOwnProfile}
      />

      <EditableField
        title={t('homeCountry')}
        data={homeCountryName || ''}
        onEdit={() => setIsHomeCountryModalOpen(true)}
        showEditButton={isOwnProfile}
      />

      {isOwnProfile && (
        <>
          <BioEditModal
            isOpen={isBioModalOpen}
            onClose={() => setIsBioModalOpen(false)}
            onSave={(bio) => handleSaveField({ bio }, setIsBioLoading)}
            initialData={localUserData?.bio || ''}
          />

          <NameEditModal
            isOpen={isNameModalOpen}
            onClose={() => setIsNameModalOpen(false)}
            onSave={async (firstName, middleName, lastName) => {
              await handleSaveField({ firstName, middleName, lastName }, setIsNameLoading)
            }}
            initialData={{
              firstName: localUserData?.firstName || '',
              middleName: localUserData?.middleName || '',
              lastName: localUserData?.lastName || ''
            }}
          />

          <DOBEditModal
            isOpen={isDobModalOpen}
            onClose={() => setIsDobModalOpen(false)}
            onSave={(dob) => handleSaveField({ dateOfBirth: dob }, setIsDobLoading)}
            initialData={localUserData?.dateOfBirth || ''}
          />

       <ResidenceEditModal
  isOpen={isResidenceModalOpen}
  onClose={() => setIsResidenceModalOpen(false)}
  onSave={(residenceCountry, city, residenceSinceMonth, residenceSinceYear) =>
    handleSaveField({
      residenceCountry,
      city,
      residenceSinceMonth,
      residenceSinceYear
    }, setIsResidenceLoading)
  }
  initialData={{
    residenceCountry: localUserData?.residenceCountry?.slice(0, 2).toUpperCase() || '',
    city: localUserData?.city || '',
    residenceSinceMonth: localUserData?.residenceSinceMonth || 0,
    residenceSinceYear: localUserData?.residenceSinceYear || 0
  }}
/>

          <HomeCountryEditModal
            isOpen={isHomeCountryModalOpen}
            onClose={() => setIsHomeCountryModalOpen(false)}
            onSave={(countryOfOrigin) => handleSaveField({ countryOfOrigin }, setIsHomeCountryLoading)}
            initialData={localUserData?.countryOfOrigin?.slice(0, 2).toUpperCase() || ''}
          />
        </>
      )}
    </div>
  );
}
