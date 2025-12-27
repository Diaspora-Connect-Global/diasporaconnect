// components/chats/modals/EditGroupModal.tsx
"use client";

import { useState, useEffect } from "react";
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

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    privacy?: GroupPrivacy;
  }) => Promise<void>;
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
  initialData,
}: EditGroupModalProps) {
  const t = useTranslations("chat.group");

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [privacy, setPrivacy] = useState(initialData.privacy);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setAvatarUrl(initialData.avatarUrl);
      setPrivacy(initialData.privacy);
      setError(null);
    }
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
        avatarUrl: avatarUrl.trim(),
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90dvh] overflow-auto" autoFocus= {false}>
        <DialogHeader>
          <DialogTitle>{t("editGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              <button
                onClick={() => setPrivacy(GroupPrivacy.PUBLIC)}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  privacy === GroupPrivacy.PUBLIC
                    ? "bg-surface-brand text-text-white border-surface-brand"
                    : "bg-surface-default text-text-secondary border-border-subtle hover:bg-surface-hover"
                }`}
              >
                {t("public")}
              </button>
              <button
                onClick={() => setPrivacy(GroupPrivacy.PRIVATE)}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  privacy === GroupPrivacy.PRIVATE
                    ? "bg-surface-brand text-text-white border-surface-brand"
                    : "bg-surface-default text-text-secondary border-border-subtle hover:bg-surface-hover"
                }`}
              >
                {t("private")}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <ButtonType3 onClick={onClose} disabled={isLoading} className="px-4 py-2">
            {t("cancel")}
          </ButtonType3>
          <ButtonType2 onClick={handleSave} disabled={isLoading} className="px-4 py-2">
            {isLoading ? t("saving") : t("save")}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}