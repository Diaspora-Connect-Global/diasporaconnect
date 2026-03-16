// components/chats/modals/EditGroupModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { TextInput, TextArea } from "@/components/custom/input";
import { useTranslations } from "next-intl";
import { GroupPrivacy } from "@/services/gql/groups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircularImageCropper } from "@/lib/imagecropper";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Camera } from "lucide-react";

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    privacy?: GroupPrivacy;
  }) => Promise<void>;
  /** Called when a new group photo is uploaded (persist to backend immediately, like profile picture). */
  onAvatarUpload?: (publicUrl: string) => Promise<void>;
  initialData: {
    name: string;
    description: string;
    avatarUrl: string;
    privacy: GroupPrivacy;
  };
}

export function EditGroupModal({
  isOpen,
  onClose,
  onSave,
  onAvatarUpload,
  initialData,
}: EditGroupModalProps) {
  const t = useTranslations("chat.group");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [privacy, setPrivacy] = useState(initialData.privacy);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    category: "group_avatar",
    contentType: "image/jpeg",
    onSuccess: async (publicUrl) => {
      setAvatarUrl(publicUrl);
      await onAvatarUpload?.(publicUrl);
    },
  });

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setAvatarUrl(initialData.avatarUrl);
      setPrivacy(initialData.privacy);
      setError(null);
      resetImageUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetImageUpload is stable; only reset when modal opens
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        privacy,
      });
      onClose();
    } catch (err) {
      console.error("Failed to update group:", err);
      setError(t("updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsePhoto = async () => {
    if (!croppedImage) return;
    const url = await uploadImage();
    if (url) {
      setAvatarUrl(url);
      resetImageUpload();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90dvh] overflow-auto" autoFocus={false}>
        <DialogHeader>
          <DialogTitle>{t("editGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {croppedImage ? (
                  <img src={croppedImage} alt="Preview" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <>
                    <AvatarImage src={avatarUrl || undefined} alt="avatar" />
                    <AvatarFallback className="text-lg">{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
              {!croppedImage && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
                  title={t("changeGroupPhoto")}
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            {croppedImage ? (
              <div className="flex gap-2">
                <ButtonType3 onClick={() => resetImageUpload()} size="sm">
                  {t("cancel")}
                </ButtonType3>
                <ButtonType2 onClick={handleUsePhoto} disabled={uploading} size="sm">
                  {uploading ? t("saving") : t("useThisPhoto")}
                </ButtonType2>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">{t("changeGroupPhoto")}</p>
            )}
          </div>

          <TextInput
            label={t("groupName")}
            placeholder={t("groupNamePlaceholder")}
            value={name}
            onChange={setName}
            required
          />

          <TextArea
            label={t("description")}
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={setDescription}
            rows={3}
          />


          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t("privacy")}
            </label>
            <div className="flex space-x-2">
              {privacy === GroupPrivacy.PUBLIC ? (
                <ButtonType2 onClick={() => setPrivacy(GroupPrivacy.PUBLIC)} className="flex-1 rounded-lg">
                  {t("public")}
                </ButtonType2>
              ) : (
                <ButtonType3 onClick={() => setPrivacy(GroupPrivacy.PUBLIC)} className="flex-1 rounded-lg border border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-hover">
                  {t("public")}
                </ButtonType3>
              )}
              {privacy === GroupPrivacy.PRIVATE ? (
                <ButtonType2 onClick={() => setPrivacy(GroupPrivacy.PRIVATE)} className="flex-1 rounded-lg">
                  {t("private")}
                </ButtonType2>
              ) : (
                <ButtonType3 onClick={() => setPrivacy(GroupPrivacy.PRIVATE)} className="flex-1 rounded-lg border border-border-subtle bg-surface-default text-text-secondary hover:bg-surface-hover">
                  {t("private")}
                </ButtonType3>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <ButtonType3 onClick={onClose} disabled={isLoading} size="lg">
            {t("cancel")}
          </ButtonType3>
          <ButtonType2 onClick={handleSave} disabled={isLoading} size="lg">
            {isLoading ? t("saving") : t("save")}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>

    {showCropper && rawImage && (
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