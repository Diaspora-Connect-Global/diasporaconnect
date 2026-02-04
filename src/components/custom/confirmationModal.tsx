"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { useTranslations } from "next-intl";

/**
 * Props for the ConfirmationModal component
 */
interface ConfirmationModalProps {
  /** Controls the visibility of the modal */
  open: boolean;
  /** Callback function when the modal is closed or cancel button is clicked */
  onCancel: () => void;
  /** Callback function when the confirm button is clicked */
  onConfirm: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Description/message displayed in the modal body */
  description: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Text for the confirm button */
  confirmText?: string;
  /** Variant for the confirm button (determines styling/color) */
  confirmVariant?: 'default' | 'destructive';
  /** Whether the confirm action is loading/processing */
  isLoading?: boolean;
  /** Maximum width of the modal */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * A reusable confirmation modal component for user actions
 * 
 * @example
 * // Logout confirmation
 * <ConfirmationModal
 *   open={isOpen}
 *   onCancel={() => setIsOpen(false)}
 *   onConfirm={handleLogout}
 *   title="Confirm logout"
 *   description="Are you sure you want to log out?"
 *   confirmText="Logout"
 *   confirmVariant="destructive"
 * />
 * 
 * @example
 * // Delete confirmation
 * <ConfirmationModal
 *   open={isDeleteOpen}
 *   onCancel={() => setIsDeleteOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Delete item"
 *   description="This action cannot be undone. Are you sure?"
 *   confirmText="Delete"
 *   confirmVariant="destructive"
 *   isLoading={isDeleting}
 * />
 * 
 * @example
 * // General confirmation
 * <ConfirmationModal
 *   open={isConfirmOpen}
 *   onCancel={() => setIsConfirmOpen(false)}
 *   onConfirm={handleSave}
 *   title="Save changes"
 *   description="Do you want to save your changes before leaving?"
 *   confirmText="Save"
 *   cancelText="Discard"
 * />
 */
export function ConfirmationModal({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  cancelText,
  confirmText,
  confirmVariant = "default",
  isLoading = false,
  maxWidth = "sm",
}: ConfirmationModalProps) {
  const tCommon = useTranslations("common");
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className={maxWidthClasses[maxWidth]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <ButtonType3
            className="py-2 px-3"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText || tCommon("cancel")}
          </ButtonType3>
          <ButtonType2
            className={`py-2 px-3 ${
              confirmVariant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : ""
            }`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? tCommon("processing") : (confirmText || tCommon("confirm"))}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}

