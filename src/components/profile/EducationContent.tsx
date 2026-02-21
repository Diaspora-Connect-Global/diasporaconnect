'use client';

import React, { useState } from 'react';
import { AddEducationModal } from './modals/AddEducationModal';
import { Plus, Trash2, Edit } from 'lucide-react';
import { ButtonType3 } from '../custom/button';
import { BodySmall, CaptionLarge } from '../utils';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GET_MY_EDUCATION,
  GET_USER_EDUCATION,
  DELETE_EDUCATION,
  type GetUserEducationResponse,
  type DeleteEducationResponse,
  type Education as EducationType
} from '@/services/gql/education';

interface Education {
  id: string;
  institution: string;
  program: string;
  degree: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  activities: string;
  isCurrent?: boolean;
}

// Loading skeleton component for education items
function EducationSkeleton() {
  return (
    <div className="pb-6 border-b border-border-subtle">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton className="h-5 w-64 mb-2" />
          <div className="flex flex-wrap gap-x-2 mt-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-16 w-full mt-2" />
        </div>
        <div className="flex gap-2 ml-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

interface EducationContentProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function EducationContent({ userId, isOwnProfile }: EducationContentProps) {
  const t = useTranslations('profile.education');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);

  // Determine which query to use based on isOwnProfile
  const isMyProfile = isOwnProfile;

  // GraphQL Query - Conditionally load based on profile ownership
  const { data, loading, refetch } = useQuery<GetUserEducationResponse>(
    isOwnProfile ? GET_MY_EDUCATION : GET_USER_EDUCATION,
    {
      variables: isOwnProfile ? undefined : { userId },
      skip: !userId
    }
  );

  // GraphQL Mutation - Only available for own profile
  const [deleteEducationMutation] = useMutation<DeleteEducationResponse>(DELETE_EDUCATION, {
    onCompleted: (data) => {
      if (data.deleteEducation.success) {
        refetch();
      } else {
        alert(data.deleteEducation.message || 'Failed to delete education');
      }
    },
    onError: (error) => {
      console.error('Error deleting education:', error);
      alert('Failed to delete education. Please try again.');
    }
  });

  // Transform GraphQL data to component format
  const educationList: Education[] = data?.getUserEducation.education.map((edu: EducationType) => {
    const startDate = new Date(edu.startDate);
    const endDate = edu.endDate ? new Date(edu.endDate) : null;

    return {
      id: edu.id,
      institution: edu.institution,
      program: edu.fieldOfStudy,
      degree: edu.degree,
      startMonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
      startYear: startDate.getFullYear().toString(),
      endMonth: endDate ? (endDate.getMonth() + 1).toString().padStart(2, '0') : '',
      endYear: endDate ? endDate.getFullYear().toString() : '',
      activities: edu.activities?.join('\n') || '',
      isCurrent: edu.current
    };
  }) || [];

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEducation(null);
  };

  const handleSaveSuccess = () => {
    refetch();
  };

  const handleEdit = (education: Education) => {
    if (!isOwnProfile) return;
    
    setEditingEducation(education);
    setIsModalOpen(true);
  };

  const handleDelete = async (educationId: string) => {
    if (!isOwnProfile) return;
    
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this education?')) {
      return;
    }

    try {
      await deleteEducationMutation({
        variables: {
          input: { educationId }
        }
      });
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  const formatDateRange = (startMonth: string, startYear: string, endMonth: string, endYear: string, isCurrent?: boolean) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonthName = months[parseInt(startMonth) - 1] || startMonth;
    const endMonthName = endMonth ? months[parseInt(endMonth) - 1] : '';
    
    const start = `${startMonthName} ${startYear}`;
    const end = isCurrent ? 'Present' : (endYear && endMonth ? `${endMonthName} ${endYear}` : '');
    
    return `${start} - ${end}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <section>
        <h2 className="text-2xl font-bold mb-4 text-text-primary">{t('title')}</h2>
        
        {/* Only show Add Education button for own profile */}
        {isOwnProfile && (
          <ButtonType3
            onClick={() => {
              setEditingEducation(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 mb-6 text-text-brand font-medium text-sm hover:text-text-brand"
          >
            <Plus className="w-4 h-4" />
            {t('addEducation')}
          </ButtonType3>
        )}
      </section>

      {/* Education List with Loading State */}
      <div className="space-y-6">
        {loading ? (
          // Show 3 skeleton items while loading
          <>
            <EducationSkeleton />
            <EducationSkeleton />
            <EducationSkeleton />
          </>
        ) : educationList.length === 0 ? (
          <p className="text-text-secondary text-sm">
            {isOwnProfile 
              ? 'No education added yet.' 
              : 'This user has not added any education yet.'}
          </p>
        ) : (
          educationList.map((edu) => (
            <div key={edu.id} className="pb-6 border-b border-border-subtle last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CaptionLarge className="text-text-primary">{edu.institution}</CaptionLarge>
                  <div className="flex flex-wrap gap-x-2 text-sm mt-1">
                    <BodySmall className="text-text-primary">
                      {edu.degree} {edu.program}
                    </BodySmall>
                    <BodySmall className="text-text-secondary">
                      ({formatDateRange(edu.startMonth, edu.startYear, edu.endMonth, edu.endYear, edu.isCurrent)})
                    </BodySmall>
                  </div>
                  {edu.activities && (
                    <BodySmall className="mt-2 text-text-primary whitespace-pre-line">
                      {edu.activities}
                    </BodySmall>
                  )}
                </div>
                
                {/* Only show Edit/Delete buttons for own profile */}
                {isOwnProfile && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(edu)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-text-secondary" />
                    </button>
                    <button
                      onClick={() => handleDelete(edu.id)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-text-secondary" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal - Only render for own profile */}
      {isOwnProfile && (
        <AddEducationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={editingEducation}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}