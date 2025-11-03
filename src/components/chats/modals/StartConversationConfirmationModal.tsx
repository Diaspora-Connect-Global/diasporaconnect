// components/confirmation-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Check } from 'lucide-react';
import { User, ConversationType } from '@/types/chat';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: User[];
  onConfirm: (mode: ConversationType, groupName?: string) => void;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  selectedUsers,
  onConfirm,
}: ConfirmationModalProps) {
  const [selectedMode, setSelectedMode] = useState<ConversationType>('group');
  const [groupName, setGroupName] = useState('');

  // Set default group name when modal opens
  useEffect(() => {
    if (isOpen) {
      setGroupName(getDefaultGroupName());
    }
  }, [ isOpen]);

  const getDefaultGroupName = () => {
    const names = selectedUsers.map(user => user.name.split(' ')[0]);
    return `${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
  };

  const handleConfirm = () => {
    onConfirm(selectedMode, groupName);
  };

  const isFormValid = selectedMode === 'direct' || 
    (selectedMode === 'group' && groupName.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="lg:min-w-[45rem]">
        <DialogHeader>
          <DialogTitle>Start Chat with {selectedUsers.length} People</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Users Summary */}
          <div className="space-y-3">
            <Label>Selected People</Label>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                >
                  {user.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Chat Mode Selection */}
          <div className="space-y-3">
            <Label>Choose how you want to chat</Label>
            
            {/* Group Chat Option */}
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedMode === 'group'
                  ? 'border-border-brand'
                  : 'border-muted hover:bg-muted/50'
              }`}
              onClick={() => setSelectedMode('group')}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`w-5 h-5 border rounded-full flex items-center justify-center mt-0.5 ${
                    selectedMode === 'group'
                      ? 'border-border-brand bg-surface-brand text-text-white'
                      : 'border-muted-foreground'
                  }`}
                >
                  {selectedMode === 'group' && <Check/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Create Group Chat</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Everyone in one conversation
                  </p>
                  
                  {selectedMode === 'group' && (
                    <div className="mt-3 space-y-2">
                      {/* <Label htmlFor="group-name" className="text-xs">
                        Group Name
                      </Label>
                      <Input
                        id="group-name"
                        placeholder="Enter group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="text-sm"
                      /> */}


                      <TextInput
                      label='Group Name'
                       id="group-name"
                        placeholder="Enter group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Individual Chats Option */}
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedMode === 'direct'
                  ? ' border-border-brand'
                  : ' hover:bg-muted/50'
              }`}
              onClick={() => setSelectedMode('direct')}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`w-5 h-5 border rounded-full flex items-center justify-center mt-0.5 ${
                    selectedMode === 'direct'
                      ? 'border-border-brand bg-surface-brand text-primary-foreground'
                      : ''
                  }`}
                >
                  {selectedMode === 'direct' && <Check/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Individual Messages</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Separate chats with each person
                  </p>
                  
                  {selectedMode === 'direct' && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        This will create {selectedUsers.length} separate conversations
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <ButtonType3
            className='px-4 py-2'
              onClick={onClose}
            >
              Back
            </ButtonType3>
            <ButtonType2
              onClick={handleConfirm}
              className='px-4 py-2'
              disabled={!isFormValid}
            >
              {selectedMode === 'group' ? 'Create Group' : `Send individually`}
            </ButtonType2>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}