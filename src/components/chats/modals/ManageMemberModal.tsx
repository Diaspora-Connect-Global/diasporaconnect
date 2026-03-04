"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { useTranslations } from "next-intl";
import { MemberRole } from "@/services/gql/groups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Shield, User as UserIcon, UserMinus } from "lucide-react";
import { ConfirmationModal } from "@/components/custom/confirmationModal";

interface ManageMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    userId: string;
    role: MemberRole;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  };
  onRemove: () => Promise<void>;
  onUpdateRole: (role: MemberRole) => Promise<void>;
  isOwner: boolean;
}

export function ManageMemberModal({
  isOpen,
  onClose,
  member,
  onRemove,
  onUpdateRole,
  isOwner,
}: ManageMemberModalProps) {
  const t = useTranslations("chat.group");

  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRoleChange = async (newRole: MemberRole) => {
    if (newRole === member?.role) return;

    setIsProcessing(true);
    try {
      await onUpdateRole(newRole);
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async () => {
    setIsProcessing(true);
    try {
      await onRemove();
      setShowRemoveConfirm(false);
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const roleOptions = [
    {
      role: MemberRole.MEMBER,
      label: t("member"),
      description: t("memberDescription"),
      icon: UserIcon,
    },
    // {
    //   role: MemberRole.MODERATOR,
    //   label: t("moderator"),
    //   description: t("moderatorDescription"),
    //   icon: Shield,
    // },
    {
      role: MemberRole.OWNER,
      label: t("admin"),
      description: t("adminDescription"),
      icon: Crown,
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md h-[90dvh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("manageMember")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Info */}
            <div className="flex items-center space-x-3 p-3 bg-surface-hover rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={member?.profile?.avatarUrl} alt="avatar" />
                <AvatarFallback>
                  {member?.profile?.firstName[0]}
                  {member?.profile?.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {member?.profile?.firstName} {member?.profile?.lastName}
                </p>
                <p className="text-xs text-text-secondary capitalize">
                  {t("currentRole")}: {member?.role?.toLowerCase()}
                </p>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                {t("changeRole")}
              </label>
              <div className="space-y-2">
                {roleOptions?.map((option) => {
                  const Icon = option?.icon;
                  const isCurrentRole = member?.role === option?.role;
                  const canAssign = isOwner || option?.role !== MemberRole?.ADMIN;

                  return (
                    <button
                      key={option?.role}
                      onClick={() => canAssign && handleRoleChange(option?.role)}
                      disabled={!canAssign || isProcessing}
                      className={`w-full flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                        isCurrentRole
                          ? "bg-surface-brand/10 border-surface-brand"
                          : canAssign
                          ? "bg-surface-default border-border-subtle hover:bg-surface-hover"
                          : "bg-surface-default border-border-subtle opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 mt-0.5 ${
                          isCurrentRole
                            ? "text-surface-brand"
                            : "text-text-secondary"
                        }`}
                      />
                      <div className="flex-1 text-left">
                        <p
                          className={`text-sm font-medium ${
                            isCurrentRole
                              ? "text-surface-brand"
                              : "text-text-primary"
                          }`}
                        >
                          {option?.label}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {option?.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remove Member */}
            <div className="pt-4 border-t border-border-subtle">
              <button
                onClick={() => setShowRemoveConfirm(true)}
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 p-3 text-text-danger hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <UserMinus className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t("removeMember")}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <ButtonType3 onClick={onClose} disabled={isProcessing} >
              {t("close")}
            </ButtonType3>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Modal */}
      <ConfirmationModal
        open={showRemoveConfirm}
        onCancel={() => setShowRemoveConfirm(false)}
        onConfirm={handleRemoveMember}
        title={t("removeMember")}
        description={t("removeMemberConfirmation", {
          name: `${member?.profile?.firstName} ${member?.profile?.lastName}`,
        })}
        confirmText={t("remove")}
        cancelText={t("cancel")}
        confirmVariant="destructive"
        isLoading={isProcessing}
      />
    </>
  );
}