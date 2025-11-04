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
          <DialogTitle>Choose how you want to message</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center p-4"> {/* Added padding */}
          <div className="text-center">
            <p className="text-text-primary">
              You selected {selectedUsers.length} contacts. Would you like to start a group chat or send the message to each person individually?
            </p>
          </div>
        </div>

        {/* Action Buttons footer - Now at the bottom */}
        <div className="flex justify-end items-center space-x-2 pt-4 border-t border-border-subtle mt-auto">
          <ButtonType1
            className='px-6 py-2'
            onClick={() => { }}
          >
            Create Group
          </ButtonType1>
          <ButtonType2
            onClick={() => { }}
            className='px-6 py-2'
          >
            Send individually
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}