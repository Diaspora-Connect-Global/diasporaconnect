import { XIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { ReactNode } from "react";
import { ButtonType2, ButtonType3 } from "./button";
import { useTranslations } from 'next-intl';

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showFooter?: boolean;
  disabled?: boolean;
  saveText?: string;
  cancelText?: string;
  contentClassName?: string;
}

export default function CustomDialog({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  onCancel,
  showFooter = true,
  isLoading = false,
  disabled = false,
  saveText,
  cancelText,
  contentClassName = 'min-w-[70vw] h-[90vh]'
}: CustomDialogProps) {
  const t = useTranslations('dialog');
  const defaultTitle = title || t('title');
  const defaultSaveText = saveText || t('save');
  const defaultCancelText = cancelText || t('cancel');
  
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 gap-0 flex flex-col ${contentClassName}`}>
        <DialogHeader className="rounded-t-md px-6 py-3 h-[10vh]  border-b  sticky top-0 bg-surface-default z-10 flex">
          <DialogTitle className="text-xl font-semibold flex justify-between w-full">
            {defaultTitle}
            <XIcon
              className="cursor-pointer h-5 w-5"
              onClick={() => onOpenChange(false)}
            />
          </DialogTitle>
        </DialogHeader>
        <div className={` overflow-hidden`}>
          {children}
        </div>

        {
          showFooter ? (
            <DialogFooter className="h-[10vh] border-t">
              <div className="flex items-end gap-3 px-6 py-4  sticky bottom-0">
                <ButtonType3 className="px-6 py-3" onClick={handleCancel} disabled={isLoading}>
                  {defaultCancelText}
                </ButtonType3>
                <ButtonType2 className="px-6 py-3" onClick={onSave} disabled={disabled || isLoading}>
                  {isLoading ? t('saving') : defaultSaveText}
                </ButtonType2>
              </div>
            </DialogFooter>
          ) : ""
        }
      </DialogContent>
    </Dialog>
  );
}