'use client';

import React, { useState } from 'react';
import { AddEducationModal } from './modals/AddEducationModal';
import { Plus, Trash2, Edit } from 'lucide-react';
import { ButtonType3 } from '../custom/button';
import { BodySmall, CaptionLarge } from '../utils';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_MY_EDUCATION,
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

export default function EducationContent() {
  const t = useTranslations('profile.education');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);

  // GraphQL Query
  const { data, loading, refetch } = useQuery<GetUserEducationResponse>(GET_MY_EDUCATION);

  // GraphQL Mutation
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
    setEditingEducation(education);
    setIsModalOpen(true);
  };

  const handleDelete = async (educationId: string) => {
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <section>
        <h2 className="text-2xl font-bold mb-4 text-text-primary">{t('title')}</h2>
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
      </section>

      {/* Education List */}
      <div className="space-y-6">
        {educationList.length === 0 ? (
          <p className="text-text-secondary text-sm">No education added yet.</p>
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal handles save itself */}
      <AddEducationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingEducation}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}