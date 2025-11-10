// components/confirmation-modal.tsx
'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { User, ConversationType } from '@/types/chat';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { useTranslations } from 'next-intl';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: User[];
  onConfirm?: (mode: ConversationType, groupName?: string) => void;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  selectedUsers,
}: ConfirmationModalProps) {
  const t = useTranslations('chat.conversation');

  // Set default group name when modal opens
  useEffect(() => {
    if (isOpen) {
      // Your logic here
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full mx-4 flex flex-col"> {/* Responsive sizing */}
        <DialogHeader>
          <DialogTitle>{t('chooseHowToMessage')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center p-4"> {/* Added padding */}
          <div className="text-center">
            <p className="text-text-primary">
              {t('selectedContacts', { count: selectedUsers.length })}
            </p>
          </div>
        </div>

        {/* Action Buttons footer - Now at the bottom */}
        <div className="flex justify-end items-center space-x-2 pt-4 border-t border-border-subtle mt-auto">
          <ButtonType1
            className='px-6 py-2'
            onClick={() => { }}
          >
            {t('createGroup')}
          </ButtonType1>
          <ButtonType2
            onClick={() => { }}
            className='px-6 py-2'
          >
            {t('sendIndividually')}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}