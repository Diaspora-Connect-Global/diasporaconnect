"use client"
import { CheckCircle2 } from "lucide-react";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { PageShell, ContentWithRail } from "@/components/vendor-onboarding/PageShell";
import { BenefitsRail } from "@/components/vendor-onboarding/BenefitsRail";
import { Section } from "@/components/redesign/Section";
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
            <PageShell>
                <Section labelledBy="vendor-status-title" className="mx-auto max-w-xl">
                    <h1 id="vendor-status-title" className="text-xl font-bold text-text-primary">{t("linkBroken")}</h1>
                </Section>
            </PageShell>
        );
    }

    const isService = accountType === 'service';

    return (
        <PageShell>
            <ContentWithRail rail={<BenefitsRail />}>
                <Section labelledBy="vendor-status-title" testId="vendor-ready" className="sm:p-6">
                    <div className="flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-success text-text-success">
                            <CheckCircle2 className="size-6" aria-hidden />
                        </span>
                        <h1 id="vendor-status-title" className="min-w-0 pt-2 text-xl font-bold leading-tight text-text-primary sm:text-2xl">
                            {t("accountReady")}
                        </h1>
                    </div>

                    <div className="mt-5 border-t border-border-subtle pt-5">
                        <h2 className="text-lg font-bold text-text-primary">
                            {isService ? t("listFirstService") : t("listFirstProduct")}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-base">
                            {isService ? t("listFirstServiceDescription") : t("listFirstProductDescription")}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                            <ButtonType3
                                onClick={handleChangeAccountType}
                                className="min-h-11 focus-visible:outline-none focus-visible:ring-2"
                            >
                                {t("goToDashboard")}
                            </ButtonType3>
                            <ButtonType2 size="lg" className="min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
                                {isService ? t("listService") : t("listProduct")}
                            </ButtonType2>
                        </div>
                    </div>
                </Section>
            </ContentWithRail>
        </PageShell>
    );
}
