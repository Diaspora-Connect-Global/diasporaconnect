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
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const [logout, { loading }] = useMutation<LogoutResponse>(LOGOUT_USER, {
    onCompleted: (data) => {
      if (data.logout.success) {
        toast.success(data.logout.message || "Logged out successfully");
      } else {
        toast.error(data.logout.error || "Logout failed");
        onConfirm();
        onCancel();
      }
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred during logout");
      // Close modal on error
      onCancel();
    },
  });

  const handleLogout = async () => {
    try {
      await logout({
        variables: {
          logoutAllSessions,
        },
      });
      onConfirm();
      router.push("/signin");


    } catch (error) {
      console.error("Logout error:", error);
      onConfirm();
      onCancel();
    } finally {
      onConfirm();
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm logout</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to log out?
          {logoutAllSessions && (
            <span className="block mt-2 font-medium">
              This will log you out from all devices.
            </span>
          )}
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <ButtonType3
            className="py-2 px-3"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </ButtonType3>
          <ButtonType2
            className="py-2 px-3 flex items-center gap-2"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}