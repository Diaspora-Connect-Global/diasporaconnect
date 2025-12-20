"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";

interface LogoutConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm logout</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to log out?
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <ButtonType3  className="py-2 px-3" onClick={onCancel}>
            Cancel
          </ButtonType3>
          <ButtonType2 className="py-2 px-3" onClick={onConfirm}>
            Logout
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}
