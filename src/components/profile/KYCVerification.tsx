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
    <Card className="h-full ">
      <CardContent className=" h-full flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          <div 
            onClick={onVerify} 
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm font-medium">KYC verification</span>
            <ChevronRight className="w-4 h-4"/>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm ${data.verified ? "text-text-success" : "text-text-warning"}`}>
              {data.verified ? "Verified" : "Not verified"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}