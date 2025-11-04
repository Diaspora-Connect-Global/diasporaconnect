// components/KYCVerification.tsx
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface KYCVerificationProps {
  data: {
    verified: boolean;
    joinDate: string;
  };
  onVerify?: () => void;
}

export function KYCVerification({ data, onVerify }: KYCVerificationProps) {
  return (
    <Card className="lg:h-[5.75rem]">
      <CardContent className="">
        <div className="space-y-2">
          <div onClick={onVerify} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium">KYC verification</span>
            <ChevronRight/>
       
          </div>
          <div className="flex items-center justify-between">
           
            <span className={`text-sm  text-text-${data.verified? "success": "warning"}`}>  {data.verified? "Verified" : "Not verified"}</span>
          </div>
         
        </div>
      </CardContent>
    </Card>
  );
}