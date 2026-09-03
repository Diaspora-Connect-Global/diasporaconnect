'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { MonthSelect, TextInput } from '@/components/custom/input';
import { useTranslations } from 'next-intl';

interface DOBEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dob: string) => Promise<void>;
  initialData: string; // expected format: YYYY-MM-DD
}

export function DOBEditModal({ isOpen, onClose, onSave, initialData }: DOBEditModalProps) {
  const t = useTranslations('profile.personalDetails');
  const tWork = useTranslations('profile.workExperience');

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      const date = new Date(initialData);
      if (!isNaN(date.getTime())) {
        setMonth(String(date.getMonth() + 1)); // Month is 0-indexed
        setDay(String(date.getDate()));
        setYear(String(date.getFullYear()));
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!day || !month || !year) {
      setError(t('invalidDate') || 'Please fill out all fields');
      return;
    }

    const dob = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    if (dob === initialData) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onSave(dob);
      onClose();
    } catch (err) {
      console.error('Failed to save DOB:', err);
      setError(t('saveError') || 'Failed to save date');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('dateOfBirth')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex-shrink-0 grid grid-cols-3 gap-2">
            <MonthSelect value={month} onChange={setMonth} label={tWork('month')} />
            <TextInput
              label={t('day')}
              placeholder={t('dayPlaceholder')}
              value={day}
              onChange={setDay}
            />
            <TextInput
              label={tWork('year')}
              placeholder={tWork('yearPlaceholder')}
              value={year}
              onChange={setYear}
                            type="number"

            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex-shrink-0 flex justify-end items-center space-x-3 pt-4 border-t border-border-subtle">
          <ButtonType3
            onClick={onClose}
            className="px-6 py-2"
            disabled={isLoading}
          >
            {t('cancel')}
          </ButtonType3>
          <ButtonType2
            onClick={handleSave}
            className="px-6 py-2"
            disabled={!month || !day || !year || isLoading}
          >
            {isLoading ? t('saving') : t('save')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}
