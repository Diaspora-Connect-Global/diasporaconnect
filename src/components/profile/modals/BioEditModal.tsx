// components/modals/BioEditModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {  ButtonType2, ButtonType3 } from '@/components/custom/button';
import { useTranslations } from 'next-intl';

interface BioEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bio: string) => void;
  initialData: string;
}

export function BioEditModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: BioEditModalProps) {
  const t = useTranslations('profile.personalDetails');
  const [bio, setBio] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBio(initialData);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (bio.trim() === initialData.trim()) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onSave(bio.trim());
      onClose();
    } catch (error) {
      console.error('Failed to save bio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const characterCount = bio.length;
  const maxCharacters = 500;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('bio')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex-shrink-0">
            <label htmlFor="bio" className="block text-sm font-medium text-text-primary mb-2">
              {t('bio')}
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('bioPlaceholder')}
              className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand focus:border-transparent resize-none bg-surface-default text-text-primary"
              rows={6}
              maxLength={maxCharacters}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-text-tertiary">
                {characterCount}/{maxCharacters} {t('characters')}
              </p>
              <p className="text-xs text-text-tertiary">
                {bio.trim().split(/\s+/).filter(word => word.length > 0).length} {t('words')}
              </p>
            </div>
          </div>
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
            disabled={!bio.trim() || isLoading}
          >
            {isLoading ? t('saving') : t('save')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}