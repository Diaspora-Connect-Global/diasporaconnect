'use client';

import React, { useState } from 'react';
import { AddEducationModal } from './modals/AddEducationModal';

// Unified Education type with id
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [educations, setEducations] = useState<Education[]>([]);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);

  // Format month/year into "Month Year" string
  const formatDate = (month: string, year: string): string => {
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getEndDateDisplay = (edu: Education): string => {
    if (edu.isCurrent) return 'Present';
    return formatDate(edu.endMonth, edu.endYear);
  };

  const handleSave = (educationData: Omit<Education, 'id'>) => {
    if (editingEducation) {
      // Update existing
      setEducations(prev =>
        prev.map(edu =>
          edu.id === editingEducation.id
            ? { ...educationData, id: editingEducation.id }
            : edu
        )
      );
      setEditingEducation(null);
    } else {
      // Add new
      const newEducation: Education = {
        ...educationData,
        id: Date.now().toString(),
      };
      setEducations(prev => [newEducation, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (education: Education) => {
    setEditingEducation(education);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setEducations(prev => prev.filter(edu => edu.id !== id));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEducation(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Education history
        </h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 text-blue-600 font-semibold text-base mb-6 hover:text-blue-700 transition-colors"
        >
          <span className="text-xl font-bold">+</span>
          Add education
        </button>

        <div className="space-y-8">
          {educations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No education entries yet. Click Add education to get started.
            </div>
          ) : (
            educations.map((edu, index) => (
              <div
                key={edu.id}
                className={`${
                  index !== educations.length - 1
                    ? 'border-b border-gray-200 pb-8'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {edu.institution}
                    </h3>
                    <div className="text-base text-gray-700 mb-3">
                      {edu.degree} in {edu.program}{' '}
                      <span className="text-gray-500">
                        ({formatDate(edu.startMonth, edu.startYear)} - {getEndDateDisplay(edu)})
                      </span>
                    </div>
                    {edu.activities && (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {edu.activities}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(edu)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(edu.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddEducationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}