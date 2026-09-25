"use client"
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import React from "react";
import { useTranslations } from "next-intl";

export default function VendorReadyPage() {
    const t = useTranslations("vendors.status");
    // Read synchronously on the first render. This used to happen in a mount
    // effect, so the first paint was always the "link seems to be broken"
    // error until the effect ran. Same outcome as before: the flow stores and
    // then reads "product". Safe on first render: the (main) layout never
    // renders its children on the server.
    const [accountType, setAccountType] = React.useState<'service' | 'product' | null>(() => {
        if (typeof window === 'undefined') return null;
        sessionStorage.setItem('vendorAccountType', 'product');
        const storedType = sessionStorage.getItem('vendorAccountType');
        return storedType === 'service' || storedType === 'product' ? storedType : null;
    });

    const handleChangeAccountType = () => {
        sessionStorage.removeItem('vendorAccountType');
        setAccountType(null);
    };

    if (!accountType) {
        return (
            <div className="min-h-screen  flex items-center justify-center p-6">
                <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full">
                    <h1 className="text-2xl font-semibold mb-4">{t("linkBroken")}</h1>
                </div>
            </div>
        );
    }

    const isService = accountType === 'service';

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
                            {t("accountReady")}
                        </h1>
                    </div>
                </div>

                {/* Main Card */}
                <div className="py-6">
                    <h2 className="heading-medium text-primary mb-3">
                        {isService ? t("listFirstService") : t("listFirstProduct")}
                    </h2>
                    <p className="body-large text-secondary mb-8">
                        {isService ? t("listFirstServiceDescription") : t("listFirstProductDescription")}
                    </p>

                    <div className="flex items-center justify-between">
                        <ButtonType3
                            onClick={handleChangeAccountType}
                        >
                            {t("goToDashboard")}
                        </ButtonType3>
                        <ButtonType2 size="lg">
                            {isService ? t("listService") : t("listProduct")}
                        </ButtonType2>
                    </div>
                </div>
            </div>
        </div>
    );
}