'use client';

import React, { useState } from 'react';
import { AddEducationModal } from './modals/AddEducationModal';
import { Plus } from 'lucide-react';
import { ButtonType3 } from '../custom/button';
import { BodySmall, CaptionLarge } from '../utils';

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
  const [, setEditingEducation] = useState<Education | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEducation(null);
  };


  return (
    <div className="max-w-4xl mx-auto p-6">
      <section>
        <h2 className="text-2xl font-bold mb-4 text-text-primary">Education history</h2>
        <ButtonType3
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 mb-6 text-text-brand font-medium text-sm hover:text-text-brand"
        >
          <Plus className="w-4 h-4" />
          Add Education
        </ButtonType3>
      </section>

      {/* Placeholder or dynamic list */}
      <div className="space-y-6">
        <div className="pb-6">
          <div className="flex justify-between items-start">
            <div>
              <CaptionLarge className="text-text-primary">Drexel University</CaptionLarge>
              <div className="flex flex-wrap gap-x-2 text-sm mt-1">
                <BodySmall className="text-text-primary">BSc Information Technology</BodySmall>
                <BodySmall className="text-text-secondary">(September 2022 - July 2026)</BodySmall>
              </div>
              <BodySmall className="mt-2 text-text-primary">
                As a member of the Drexel Esports Association, I competed in collegiate tournaments...
              </BodySmall>
            </div>
           
          </div>
        </div>
      </div>

      {/* Modal handles save itself */}
      <AddEducationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={null}
      />
    </div>
  );
}