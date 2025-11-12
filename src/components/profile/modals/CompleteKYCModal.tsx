import { ButtonType2 } from "@/components/custom/button";
import CustomDialog from "@/components/custom/customDialog";
import { useTranslations } from "next-intl";
import { forwardRef, useImperativeHandle, useState } from "react";

export interface CompleteKYCModalRef {
  open: () => void;
}

const CompleteKYCModal = forwardRef<CompleteKYCModalRef>((_, ref) => {
  const t = useTranslations("authentication");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setIsDialogOpen(true),
  }));

  const closeDialog = () => setIsDialogOpen(false);

  return (
    <CustomDialog
      contentClassName="lg:min-w-[40rem] h-[90vh] overflow-y-auto scrollbar-hidden"
      showFooter={false}
      title="KYC"
      open={isDialogOpen}
      onOpenChange={closeDialog}
    >
      {/* THIS IS THE KEY: override overflow-hidden + enable scroll */}
      <div className=" h-[80vh] overflow-y-auto scrollbar-hide bg-surface-default">
        {/* Main centered layout */}
          <div className=" px-5">
            <p className="text-text-primary font-heading-medium">
              Verify your identity
            </p>
            <p className=" text-text-secondary font-body-large">
              You will be redirected to your mobile device to verify your
              identity
            </p>
          </div>
        <div className="flex h-full overflow-y-auto flex-col items-center justify-center  ">
          {/* 1. Header */}

          {/* 2. QR Code */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-40 w-40 bg-gray-200 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center">
              <span className="text-gray-500 text-lg">QR Code</span>
            </div>
            <p className="text-text-primary font-medium">Verify with QR code</p>
            <p className="mt-1 text-text-secondary text-sm">
              Scan code with your phone or a scan app to continue verification
            </p>
          </div>

          {/* 3. Divider */}
          <div className="flex w-full max-w-xs items-center gap-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="text-sm text-text-secondary">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* 4. Email + Button */}
          <div className="text-center">
            <p className="text-text-brand font-medium">
              Send verification link to my email
            </p>
            <ButtonType2 className="mt-4 w-full max-w-xs">
              Done
            </ButtonType2>
          </div>
        </div>
      </div>
    </CustomDialog>
  );
});

CompleteKYCModal.displayName = "CompleteKYCModal";
export default CompleteKYCModal;