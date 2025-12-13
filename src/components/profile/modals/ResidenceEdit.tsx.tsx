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
  onSave: (residence: string) => Promise<void>; // Save as single string
  initialData?: string;
}

export function ResidenceEditModal({
  isOpen,
  onClose,
  onSave,
  initialData = '',
}: ResidenceEditModalProps) {
  const t = useTranslations('profile.personalDetails');
  const tWork = useTranslations('profile.workExperience');

  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse initialData into parts if saved as "City, Country – Month Year"
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const regex = /^(.*), (.*) – (\w+) (\d{4})$/;
        const match = initialData.match(regex);
        if (match) {
          setCity(match[1]);
          setCountry(match[2]);
          setMonth(match[3]);
          setYear(match[4]);
        } else {
          setCity('');
          setCountry(initialData);
          setMonth('');
          setYear('');
        }
      } else {
        setCity('');
        setCountry('');
        setMonth('');
        setYear('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!country || !city || !month || !year) {
      setError('Please fill all fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const value = `${city}, ${country} – ${month} ${year}`;
      await onSave(value);
      onClose();
    } catch (err) {
      console.error('Failed to save residence:', err);
      setError( 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('countryOfResidence')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <CountrySelect value={country} onChange={setCountry} label={t('country')} />
          <TextInput label={t('city')} placeholder={t('cityPlaceholder')} value={city} onChange={setCity} />

          <LabelLarge>{t('livingHereSince')}</LabelLarge>
          <div className="grid grid-cols-2 gap-2">
            <MonthSelect value={month} onChange={setMonth} label={tWork('month')} />
            <TextInput label={tWork('year')} placeholder={tWork('yearPlaceholder')} value={year} onChange={setYear} />
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
