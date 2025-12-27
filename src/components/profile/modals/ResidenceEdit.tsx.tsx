'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { CountrySelect, MonthSelect, TextInput } from '@/components/custom/input';
import { LabelLarge } from '@/components/utils';
import { useTranslations } from 'next-intl';

interface ResidenceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (residenceCountry: string, city: string, residenceSinceMonth: number, residenceSinceYear: number) => Promise<void>;
  initialData: {
    residenceCountry: string;
    city: string;
    residenceSinceMonth: number;
    residenceSinceYear: number;
  };
}

export function ResidenceEditModal({
  isOpen,
  onClose,
  onSave,
  initialData = {
    residenceCountry: "",
    city: "",
    residenceSinceMonth: 0,
    residenceSinceYear: 0
  },
}: ResidenceEditModalProps) {
  const t = useTranslations('profile.personalDetails');
  const tWork = useTranslations('profile.workExperience');

  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCity(initialData.city);
    setCountry(initialData.residenceCountry);
    setMonth(initialData.residenceSinceMonth ? String(initialData.residenceSinceMonth) : '');
    setYear(initialData.residenceSinceYear ? String(initialData.residenceSinceYear) : '');
    setError(null);
  }, [initialData.city, initialData.residenceCountry, initialData.residenceSinceMonth, initialData.residenceSinceYear]);

  const handleSave = async () => {
    if (!country || !city || !month || !year) {
      setError('Please fill all fields');
      return;
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || isNaN(yearNum)) {
      setError('Invalid month or year');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onSave(`${country}A`, city, monthNum, yearNum);
      onClose();
    } catch (err) {
      console.error('Failed to save residence:', err);
      setError('Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('countryOfResidence')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <CountrySelect value={country} onChange={setCountry} label={t('country')} />
          <TextInput label={t('city')} placeholder={t('cityPlaceholder')} value={city} onChange={setCity} />

          <LabelLarge>{t('livingHereSince')}</LabelLarge>
          <div className="grid grid-cols-2 gap-2">
            <MonthSelect value={month} onChange={setMonth} label={tWork('month')} />
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
          <ButtonType3 onClick={onClose} className="px-6 py-2" disabled={isLoading}>
            {t('cancel')}
          </ButtonType3>
          <ButtonType2 onClick={handleSave} className="px-6 py-2" disabled={isLoading}>
            {isLoading ? t('saving') : t('save')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}