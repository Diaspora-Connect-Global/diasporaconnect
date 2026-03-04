'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { CountrySelect } from '@/components/custom/input';
import { useTranslations } from 'next-intl';

interface HomeCountryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (country: string) => Promise<void>;
  initialData?: string;
}

export function HomeCountryEditModal({
  isOpen,
  onClose,
  onSave,
  initialData = '',
}: HomeCountryEditModalProps) {
  const t = useTranslations('profile.personalDetails');

  const [country, setCountry] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCountry(initialData);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!country) return;

    setIsLoading(true);
    try {
      await onSave(country);
      onClose();
    } catch (err) {
      console.error('Failed to save country:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col"  onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('homeCountry')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <CountrySelect value={country} onChange={setCountry} label={t('country')} />
        </div>

        <div className="flex-shrink-0 flex justify-end items-center space-x-3 pt-4 border-t border-border-subtle">
          <ButtonType3 onClick={onClose} size="lg" disabled={isLoading}>
            {t('cancel')}
          </ButtonType3>
          <ButtonType2 onClick={handleSave} size="lg" disabled={!country || isLoading}>
            {isLoading ? t('saving') : t('save')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}
