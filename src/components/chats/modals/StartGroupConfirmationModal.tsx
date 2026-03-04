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
import { useTranslations } from 'next-intl';
import { CircularImageCropper } from '@/lib/imagecropper';
import { useImageUpload } from '@/hooks/useImageUpload';

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
  const t = useTranslations('chat.conversation');

  const [groupName, setGroupName] = useState(initialGroupName);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the image upload hook
  const {
    uploading,
    rawImage,
    croppedImage,
    showCropper,
    handleFileSelect,
    handleCropConfirm,
    handleCropCancel,
    uploadImage,
    reset: resetImageUpload,
  } = useImageUpload({
    category: 'group_avatar',
    contentType: 'image/jpeg',
  });

  console.log('Selected users for group', selectedUsers);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
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
      handleFileSelect(file);
    }
  };

  const removePhoto = () => {
    resetImageUpload();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (groupName.trim()) {
      let photoUrl: string | undefined;

      // Upload the image if one was selected
      if (croppedImage) {
        photoUrl = (await uploadImage()) || undefined;
      }

      onGroupCreate(groupName.trim(), photoUrl);
      onClose();
      setGroupName('');
      resetImageUpload();
    }
  };

  const isFormValid = groupName.trim() !== '';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">
              {t('createGroup')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col space-y-6">
            {/* Group Photo Section */}
            <div className="flex-shrink-0 flex flex-col items-center space-y-4">
              <div
                className={`
                  relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-colors
                  ${
                    isDragging
                      ? 'border-border-brand bg-surface-brand-light'
                      : croppedImage
                      ? ''
                      : 'border-border-brand border-2 border-dashed bg-surface-subtle'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {croppedImage ? (
                  <>
                    <Image
                      src={croppedImage}
                      alt="Group photo preview"
                      fill
                      className="rounded-full object-cover pointer-events-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto();
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-text-error rounded-full flex items-center justify-center text-white hover:bg-text-error-dark transition-colors z-20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute inset-0 bg-opacity-0 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all pointer-events-none">
                      <Camera className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-surface-brand-light flex items-center justify-center">
                      <Plus className="w-6 h-6 text-text-brand" />
                    </div>
                    <span className="text-sm text-text-brand text-center px-2">
                      {isDragging
                        ? t('dropPhotoHere')
                        : t('addGroupPhoto')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Group Name Section */}
            <div className="flex-shrink-0 space-y-3">
              <TextInput
                id="groupName"
                type="text"
                value={groupName}
                onChange={setGroupName}
                placeholder={t('enterGroupName')}
                label={t('groupName')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex justify-end items-center space-x-3 pt-4 border-t border-border-subtle mt-6">
            <ButtonType3 onClick={onClose} size="lg">
              {t('cancel')}
            </ButtonType3>
            <ButtonType2
              onClick={handleCreate}
              size="lg"
              disabled={!isFormValid || uploading}
            >
              {uploading ? t('uploading') : t('createGroup')}
            </ButtonType2>
          </div>
        </DialogContent>
      </Dialog>

      {/* Circular Cropper */}
      {rawImage && (
        <CircularImageCropper
          open={showCropper}
          src={rawImage}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  );
}