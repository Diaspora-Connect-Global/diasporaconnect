"use client";

import { useMutation } from "@apollo/client/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { LOGOUT_USER } from "@/services/gql/signin";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

interface LogoutResponse {
  logout: {
    success: boolean;
    message: string;
    error?: string;
  };
}

interface LogoutConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  logoutAllSessions?: boolean;
}

export function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
  logoutAllSessions = false,
}: LogoutConfirmModalProps) {
  const t = useTranslations("accountPanel.confirm");

  const [logout, { loading }] = useMutation<LogoutResponse>(LOGOUT_USER, {
    onCompleted: (data) => {
      if (data.logout.success) {
        toast.success(t("done"));
      } else {
        toast.error(t("failed"));
      }
    },
    onError: (error) => {
      toast.error(t("failed"));
    },
  });

  // The server call is best-effort: whatever it answers, this browser must end
  // up signed out, so onConfirm (the local sign-out) runs exactly once.
  const handleLogout = async () => {
    try {
      await logout({ variables: { logoutAllSessions } });
    } catch (error) {
      console.error("Logout error:", error);
    }
    onConfirm();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t("body")}
          {logoutAllSessions && (
            <span className="block mt-2 font-medium">
              {t("allDevices")}
            </span>
          )}
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <ButtonType3
            className="py-2 px-3"
            onClick={onCancel}
            disabled={loading}
          >
            {t("cancel")}
          </ButtonType3>
          <ButtonType2
            className="py-2 px-3 flex items-center gap-2"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("working")}
              </>
            ) : (
              t("action")
            )}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}