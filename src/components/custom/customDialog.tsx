import { XIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { ReactNode } from "react";
import { ButtonType2, ButtonType3 } from "./button";

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  saveText?: string;
  cancelText?: string;
  contentClassName?: string;
}

export default function CustomDialog({
  open,
  onOpenChange,
  title = "Title",
  children,
  onSave,
  onCancel,
  isLoading = false,
  disabled = false,
  saveText = "Save",
  cancelText = "Cancel",
  contentClassName='min-w-[70vw] h-[90vh]'
}: CustomDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 ${contentClassName}`}>
        <DialogHeader className="rounded-t-md p-6  border-b border-border-subtle sticky top-0 bg-background z-10 flex">
          <DialogTitle className="text-xl font-semibold flex justify-between w-full">
            {title}
            <XIcon
              className="cursor-pointer h-5 w-5"
              onClick={() => onOpenChange(false)}
            />
          </DialogTitle>
        </DialogHeader>
         <div className={` overflow-y-auto px-6 `}>
        {children}
         </div>

        <DialogFooter className=" border-t">
          <div className="flex items-end gap-3 px-6 py-4  sticky bottom-0">
            <ButtonType3 className="px-6 py-3" onClick={handleCancel} disabled={isLoading}>
              {cancelText}
            </ButtonType3>
            <ButtonType2 className="px-6 py-3" onClick={onSave} disabled={disabled || isLoading}>
              {isLoading ? 'Saving...' : saveText}
            </ButtonType2>
          </div>


        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}