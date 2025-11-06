
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { MonthSelect, TextArea, TextInput } from '@/components/custom/input';
import { LabelLarge } from '@/components/utils';

interface WorkExperience {
  company: string;
  role: string;
  employmentType: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  description: string;
  isCurrent?: boolean;
}

interface AddWorkExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<WorkExperience>;
}

export function AddWorkExperienceModal({
  isOpen,
  onClose,
  initialData = {},
}: AddWorkExperienceModalProps) {
  const [form, setForm] = useState<WorkExperience>({
    company: '',
    role: '',
    employmentType: '',
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: '',
    description: '',
    isCurrent: false,
    ...initialData,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        company: '',
        role: '',
        employmentType: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        description: '',
        isCurrent: false,
        ...initialData,
      });
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      onClose();
    } catch (error) {
      console.error('Failed to save experience:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = (key: keyof WorkExperience, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className=" min-w-[60vw] max-h-[90vh] flex flex-col p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Sticky Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border-subtle sticky top-0 bg-background z-10">
          <DialogTitle className="text-xl font-semibold">
            Add Work Experience
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
              <TextInput
                label="Company"
                placeholder="e.g. Google, Microsoft"
                value={form.company}
                onChange={(v) => updateForm('company', v)}
              />
              <TextInput
                label="Role"
                placeholder="e.g. Senior Frontend Engineer"
                value={form.role}
                onChange={(v) => updateForm('role', v)}
              />
            

            {/* Employment Type */}
            <TextInput
              label="Employment type"
              placeholder="Full-time, Part-time, Contract, Internship"
              value={form.employmentType}
              onChange={(v) => updateForm('employmentType', v)}
            />

              <div className={`${form.isCurrent ? "" : "grid lg:grid-cols-2 gap-6"} `}>
                {/* Start Date */}
                <div>
                  <LabelLarge>Start Date</LabelLarge>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <MonthSelect
                      value={form.startMonth}
                      onChange={(v) => updateForm('startMonth', v)}
                      label="Month"
                    />
                    <TextInput
                      label="Year"
                      placeholder="2024"
                      value={form.startYear}
                      onChange={(v) => updateForm('startYear', v)}
                    />
                  </div>
                </div>



                {/* End Date */}
                <div className={`${form.isCurrent ? "hidden" : ""}`}>
                  <LabelLarge>End Date</LabelLarge>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <MonthSelect
                      value={form.endMonth}
                      onChange={(v) => updateForm('endMonth', v)}
                      label="Month"
                    />
                    <TextInput
                      label="Year"
                      placeholder="Present"
                      value={form.isCurrent ? 'Present' : form.endYear}
                      onChange={(v) => updateForm('endYear', v)}
                    />
                  </div>
                </div>
              </div>
            </div>

              <div className="flex items-center gap-3 my-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isCurrent}
                    onChange={(e) => updateForm('isCurrent', e.target.checked)}
                    className="w-4 h-4 text-text-brand rounded"
                  />
                  <span className="text-sm">I currently work here</span>
                </label>
              </div>

            {/* Description */}
            <TextArea
              label="Description"
              placeholder="What did you do? Technologies used? Achievements?"
              value={form.description}
              onChange={(v) => updateForm('description', v)}
              maxLength={500}
              rows={5}
            />
        </div>

        {/* Sticky Footer */}
        <div className="flex justify-end items-center gap-3 p-6 pt-4 border-t border-border-subtle bg-background sticky bottom-0 z-10">
          <ButtonType3 onClick={onClose} disabled={isLoading}>
            Cancel
          </ButtonType3>
          <ButtonType2
            onClick={handleSave}
            disabled={
              isLoading ||
              !form.company.trim() ||
              !form.role.trim() ||
              !form.startMonth ||
              !form.startYear
            }
          >
            {isLoading ? 'Saving...' : 'Save Experience'}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}