// components/add-group-photo-modal.tsx
'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { Camera, Plus, X } from 'lucide-react';
import Image from 'next/image';
import { User } from '@/data/chats';
import { TextInput } from '@/components/custom/input';

interface AddGroupPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreate: (groupName: string, groupPhoto?: string) => void;
  initialGroupName?: string;
  selectedUsers: User[];
}

export function StartGroupConfirmationModal({
  isOpen,
  onClose,
  onGroupCreate,
  initialGroupName = '',
  selectedUsers,
}: AddGroupPhotoModalProps) {
  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log("Selected users for group", selectedUsers);

  const handlePhotoSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setGroupPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handlePhotoSelect(file);
    }
  };

  const removePhoto = () => {
    setGroupPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = () => {
    if (groupName.trim()) {
      onGroupCreate(groupName.trim(), groupPhoto || undefined);
      onClose();
      // Reset form
      setGroupName('');
      setGroupPhoto(null);
    }
  };

  const isFormValid = groupName.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[90vw] max-h-[90vh] flex flex-col"> {/* Responsive sizing */}
        <DialogHeader>
          <DialogTitle className="text-center">Create Group</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-6"> {/* Added min-h-0 and flex-col */}
          {/* Group Photo Section */}
          <div className="flex-shrink-0 flex flex-col items-center space-y-4"> {/* Added flex-shrink-0 */}
            <div
              className={`
                relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-colors
                ${isDragging 
                  ? 'border-border-brand bg-surface-brand-light' 
                  : groupPhoto 
                    ? '' 
                    : 'border-border-brand border-2 border-dashed bg-surface-subtle'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {groupPhoto ? (
                <>
                  <Image
                    src={groupPhoto}
                    alt="Group photo preview"
                    fill
                    className="rounded-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto();
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-text-error rounded-full flex items-center justify-center text-white hover:bg-text-error-dark transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
                    <Camera className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-surface-brand-light flex items-center justify-center">
                    <Plus className="w-6 h-6 text-text-brand" />
                  </div>
                  <span className="text-sm text-text-brand text-center px-2">
                    {isDragging ? 'Drop photo here' : 'Add group photo'}
                  </span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Group Name Section */}
          <div className="flex-shrink-0 space-y-3"> {/* Added flex-shrink-0 */}
            <TextInput
              id="groupName"
              type="text"
              value={groupName}
              onChange={setGroupName}
              placeholder="Enter group name"   
              label='Group Name'
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex justify-end items-center space-x-3 pt-4 border-t border-border-subtle mt-6"> {/* Added flex-shrink-0 */}
          <ButtonType3
            onClick={onClose}
            className="px-6 py-2"
          >
            Cancel
          </ButtonType3>
          <ButtonType2
            onClick={handleCreate}
            className="px-6 py-2"
            disabled={!isFormValid}
          >
            Create Group
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}