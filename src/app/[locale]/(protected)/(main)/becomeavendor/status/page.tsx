"use client"
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import React from "react";

export default function VendorReadyPage() {
    const [accountType, setAccountType] = React.useState<'service' | 'product' | null>(null);

    // Parse URL parameter on mount and store in sessionStorage
    React.useEffect(() => {
                sessionStorage.setItem('vendorAccountType', 'product');

      
            const storedType = sessionStorage.getItem('vendorAccountType');
            if (storedType === 'service' || storedType === 'product') {
                setAccountType(storedType);
            }
    }, []);

    const handleChangeAccountType = () => {
        sessionStorage.removeItem('vendorAccountType');
        setAccountType(null);
    };

    if (!accountType) {
        return (
            <div className="min-h-screen  flex items-center justify-center p-6">
                <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full">
                    <h1 className="text-2xl font-semibold mb-4">Link seems to be broken go back to notification</h1>                   
                </div>
            </div>
        );
    }

    const isService = accountType === 'service';
    const itemType = isService ? 'service' : 'product';

    return (
        <div className="min-h-screen  p-6">
            <div className="max-w-2xl mx-auto ">
                {/* Success Header */}
                <div className="p-6 border-b ">
                    <div className="">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <svg 
                                className="w-7 h-7 text-green-600" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2.5} 
                                    d="M5 13l4 4L19 7" 
                                />
                            </svg>
                        </div>
                        <h1 className="heading-xsmall text-primary">
                            Your vendor account is ready
                        </h1>
                    </div>
                </div>

                {/* Main Card */}
                <div className="py-6">
                    <h2 className="heading-medium text-primary mb-3">
                        List your first {itemType}
                    </h2>
                    <p className="body-large text-secondary mb-8">
                        Add your first {itemType} so customers can start discovering you on the marketplace.
                    </p>

                    <div className="flex items-center justify-between">
                        <ButtonType3
                            onClick={handleChangeAccountType}
                        >
                            Go to dashboard
                        </ButtonType3>
                        <ButtonType2 className=" px-6 py-3 rounded-full ">
                            List {itemType}
                        </ButtonType2>
                    </div>
                </div>
            </div>
        </div>
    );
}