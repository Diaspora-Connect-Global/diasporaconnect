// Example usage in your profile page
import { useState } from 'react';
import { EditableField } from './EditableField';
import { BioEditModal } from './modals/BioEditModal';

export function PersonalDetailsContent() {
  const [userData, setUserData] = useState({
    bio: "I am known to be a software developer who enjoys hiking and coding.",
    fullName: "John Doe",
    dateOfBirth: "14 November 1990",
    residence: "Mechelen, Belgium (4 years)",
    homeCountry: "Ghana"
  });

  // State for modals
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  // const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  // const [isDobModalOpen, setIsDobModalOpen] = useState(false);

  // Handlers for each field
  const handleBioSave = (newBio: string) => {
    setUserData(prev => ({ ...prev, bio: newBio }));
    // Your API call here
  };

  // const handleNameSave = (newName: string) => {
  //   setUserData(prev => ({ ...prev, fullName: newName }));
  //   // Your API call here
  // };

  // const handleDobSave = (newDob: string) => {
  //   setUserData(prev => ({ ...prev, dateOfBirth: newDob }));
  //   // Your API call here
  // };

  return (
    <div className="space-y-6">
      {/* Bio Field */}
      <EditableField
        title="Bio"
        data={userData.bio}
        onEdit={() => setIsBioModalOpen(true)}
      />

      {/* Full Name Field */}
      <EditableField
        title="Full name"
        data={userData.fullName}
        onEdit={() => {/* Your residence modal */}}
      />

      {/* Date of Birth Field */}
      <EditableField
        title="Date of Birth"
        data={userData.dateOfBirth}
        onEdit={() => {/* Your residence modal */}}
      />

      {/* Residence Field */}
      <EditableField
        title="Residence address"
        data={userData.residence}
        onEdit={() => {/* Your residence modal */}}
      />

      {/* Home Country Field */}
      <EditableField
        title="Home country"
        data={userData.homeCountry}
        onEdit={() => {/* Your country modal */}}
      />

      {/* Your Custom Modals */}
      <BioEditModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        onSave={handleBioSave}
        initialData={userData.bio}
      />

      {/* <NameEditModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        onSave={handleNameSave}
        initialData={userData.fullName}
      />

      <DateOfBirthEditModal
        isOpen={isDobModalOpen}
        onClose={() => setIsDobModalOpen(false)}
        onSave={handleDobSave}
        initialData={userData.dateOfBirth}
      /> */}
    </div>
  );
}