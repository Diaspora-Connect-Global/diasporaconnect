// components/confirmation-modal.tsx
'use client';

import {  useEffect } from 'react';
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
     
    }
  }, [isOpen]);

  // const getDefaultGroupName = () => {
  //   const names = selectedUsers.map(user => user.name.split(' ')[0]);
  //   return `${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
  // };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="lg:min-w-[45rem] lg:h-[19rem] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose how you want to message</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center " >
          <div className="">
            <p>
              You selected {selectedUsers.length} contacts. Would you like to start a group chat or send the message to each person individually?
            </p>
          </div>
        </div>

        {/* Action Buttons footer - Now at the bottom */}
        <div className="flex justify-end items-center space-x-2 pt-2 border-t border-border-subtle mt-auto">
          <ButtonType1
            className='px-4 py-2'
            onClick={() => { }}
          >
            Create Group
          </ButtonType1>
          <ButtonType2
            onClick={() => { }}
            className='px-4 py-2'
          >
            Send individually
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}