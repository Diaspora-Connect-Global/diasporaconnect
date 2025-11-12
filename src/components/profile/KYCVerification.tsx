// components/KYCVerification.tsx
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useTranslations } from 'next-intl';
import CompleteKYCModal, { CompleteKYCModalRef } from "./modals/CompleteKYCModal";
import { useRef } from "react";

interface KYCVerificationProps {
  data: {
    verified: boolean;
    joinDate: string;
  };
  onVerify?: () => void;
}

export function KYCVerification({ data, onVerify }: KYCVerificationProps) {
  const t = useTranslations('profile.kyc');

  const modalRef = useRef<CompleteKYCModalRef>(null);


  

  return (
    <>
    <Card className="h-full ">
      <CardContent className=" h-full flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          <div 
            onClick={()=>modalRef.current?.open()} 
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm font-medium">{t('title')}</span>
            <ChevronRight className="w-4 h-4"/>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm ${data.verified ? "text-text-success" : "text-text-warning"}`}>
              {data.verified ? t('verified') : t('notVerified')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <CompleteKYCModal ref={modalRef}/>
    </>
  );
}