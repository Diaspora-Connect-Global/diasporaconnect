
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
import { AutocompleteAsync } from '@/components/custom/autoCompleteAsync';
import { useTranslations } from 'next-intl';

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


interface Option {
  id: string;
  label: string;
}

/* -------------------------------------------------
   Mock data – replace these with real API later
   ------------------------------------------------- */
const ALL_SKILLS: Option[] = [
  { id: '1', label: 'React' },
  { id: '2', label: 'Angular' },
  { id: '3', label: 'Vue.js' },
  { id: '4', label: 'Svelte' },
  { id: '5', label: 'Ember' },
  { id: '6', label: 'Backbone.js' },
  { id: '7', label: 'jQuery' },
  { id: '8', label: 'Django' },
  { id: '9', label: 'Flask' },
  { id: '10', label: 'Ruby on Rails' },
  { id: '11', label: 'ASP.NET' },
  { id: '12', label: 'Spring' },
  { id: '13', label: 'Laravel' },
  { id: '14', label: 'Express' },
  { id: '15', label: 'NativeScript' },
  { id: '16', label: 'React Native' },
  { id: '17', label: 'Flutter' },
  { id: '18', label: 'Xamarin' },
  { id: '19', label: 'Ionic' },
  { id: '20', label: 'Cordova' },
  { id: '21', label: 'SwiftUI' },
  { id: '22', label: 'Jetpack Compose' },
  { id: '23', label: 'Apache Cordova' },
];

/* Simulated async search */
const fetchSkills = (query: string): Promise<Option[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = query.toLowerCase();
      const matches = ALL_SKILLS.filter((s) =>
        s.label.toLowerCase().includes(lower)
      );
      resolve(matches);
    }, 200); // fake network delay
  });
};

/* Simulated create */
const createSkill = (label: string): Promise<Option> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newId = `custom-${Date.now()}`;
      resolve({ id: newId, label });
    }, 300);
  });
};


export function AddWorkExperienceModal({
  isOpen,
  onClose,
  initialData = {},
}: AddWorkExperienceModalProps) {
  const t = useTranslations('profile.workExperience');
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
  const [skills, setSkills] = useState<string[]>(
[
  'React',
  'Angular',
  'Vue.js',
  'Svelte',
  'Ember',
  'Backbone.js',
  'jQuery',
  'Django',
  'Flask',
  'Ruby on Rails',
  'ASP.NET',
  'Spring',
  'Laravel',
  'Express',
  'NativeScript',
  'React Native',
  'Flutter',
  'Xamarin',
  'Ionic',
  'Cordova',
  'SwiftUI',
  'Jetpack Compose',
  'Apache Cordova'
]

  );

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
            {t('addWorkExperience')}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
              <TextInput
                label={t('company')}
                placeholder={t('companyPlaceholder')}
                value={form.company}
                onChange={(v) => updateForm('company', v)}
              />
              <TextInput
                label={t('role')}
                placeholder={t('rolePlaceholder')}
                value={form.role}
                onChange={(v) => updateForm('role', v)}
              />
            

            {/* Employment Type */}
            <TextInput
              label={t('employmentType')}
              placeholder={t('employmentTypePlaceholder')}
              value={form.employmentType}
              onChange={(v) => updateForm('employmentType', v)}
            />

              <div className={`${form.isCurrent ? "" : "grid lg:grid-cols-2 gap-6"} `}>
                {/* Start Date */}
                <div>
                  <LabelLarge>{t('startDate')}</LabelLarge>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <MonthSelect
                      value={form.startMonth}
                      onChange={(v) => updateForm('startMonth', v)}
                      label={t('month')}
                    />
                    <TextInput
                      label={t('year')}
                      placeholder={t('yearPlaceholder')}
                      value={form.startYear}
                      onChange={(v) => updateForm('startYear', v)}
                    />
                  </div>
                </div>



                {/* End Date */}
                <div className={`${form.isCurrent ? "hidden" : ""}`}>
                  <LabelLarge>{t('endDate')}</LabelLarge>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <MonthSelect
                      value={form.endMonth}
                      onChange={(v) => updateForm('endMonth', v)}
                      label={t('month')}
                    />
                    <TextInput
                      label={t('year')}
                      placeholder={t('present')}
                      value={form.isCurrent ? t('present') : form.endYear}
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
                  <span className="text-sm">{t('currentlyWorkHere')}</span>
                </label>
              </div>

            {/* Description */}
            <TextArea
              label={t('description')}
              placeholder={t('descriptionPlaceholder')}
              value={form.description}
              onChange={(v) => updateForm('description', v)}
              maxLength={500}
              rows={5}
            />

<AutocompleteAsync
      label={t('skills')}
      value={skills}
      onChange={setSkills}
      fetchOptions={fetchSkills}
      onCreate={createSkill}
      placeholder={t('skillsPlaceholder')}
    />
        </div>

        {/* Sticky Footer */}
        <div className="flex justify-end items-center gap-3 p-6 pt-4 border-t border-border-subtle bg-background sticky bottom-0 z-10">
          <ButtonType3 onClick={onClose} disabled={isLoading}>
            {t('cancel')}
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
            {isLoading ? t('saving') : t('save')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}