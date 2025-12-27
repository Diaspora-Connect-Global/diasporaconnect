'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { useTranslations } from 'next-intl';

interface NameEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (firstName:string ,middleName: string, lastName:string) => Promise<void>; // must return Promise
  initialData: {
    firstName: string;
    middleName: string;
    lastName: string;
  } 
  };


export function NameEditModal({ isOpen, onClose, onSave, initialData }: NameEditModalProps) {
  const t = useTranslations('profile.personalDetails');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setMiddleName(initialData.middleName);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
 

    setIsLoading(true);
    setError(null);
    try {
      await onSave( firstName, middleName, lastName );
      onClose();
    } catch (err) {
      console.error('Failed to save name:', err);
      setError(t('saveError') || 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('fullName')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <TextInput placeholder='Enter your first name' label={t('firstName')} value={firstName} onChange={setFirstName} />
          <TextInput label={t('middleName')} value={middleName} onChange={setMiddleName} placeholder={'Enter your middle name'} />
          <TextInput label={t('lastName')} value={lastName} onChange={setLastName} placeholder={'Enter your last name'} />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex-shrink-0 flex justify-end items-center space-x-3 pt-4 border-t border-border-subtle">
          <ButtonType3 onClick={onClose} disabled={isLoading}>{t('cancel')}</ButtonType3>
          <ButtonType2
            onClick={handleSave}
            disabled={isLoading || !firstName.trim() || !lastName.trim()}
          >
            {isLoading ? t('saving') : t('save')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}
