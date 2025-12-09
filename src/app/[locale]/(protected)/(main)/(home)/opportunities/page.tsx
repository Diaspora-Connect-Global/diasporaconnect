"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { opportunities, Opportunity } from "./data";



interface ExploreOpportunitiesProps {
    id: string;
    name: string;
    imageUrl?: string;
    icon?: LucideIcon;
}

const ExploreOpportunities = ({ name, imageUrl, icon: Icon, id }: ExploreOpportunitiesProps) => {
    return (
        <Link href={`/opportunities/${id}`} className="flex  text-center justify-center items-center gap-4 bg-surface-default rounded-lg p-4 border border-border-subtle hover:border-border-brand hover:shadow-sm transition-all duration-200 cursor-pointer max-w-[17.75rem] h-[4rem] ">
            <div className="flex-shrink-0 ">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={name}
                        width={20}
                        height={20}
                        className="rounded-md object-cover"
                    />
                ) : Icon ? (
                    <Icon className="w-5 h-5 text-text-primary" />
                ) : (
                    <div className="w-5 h-5 bg-text-primary rounded-md" />
                )}
            </div>
            <p className="text-text-primary font-medium text-sm line-clamp-4 break-words leading-tight">
                {name}
            </p>
        </Link>
    );
};

const AppliedComponent = ({ appliedOpportunities }: { appliedOpportunities: Opportunity[] }) => {
    const t = useTranslations("home.opportunities")


    return (
        <>
            {appliedOpportunities.length === 0 ? (
                <p className="text-text-primary">
                    {t("none.applied")}
                </p>
            ) : (
                <>
                    {appliedOpportunities.map((opp, index) => (
                        <ExploreOpportunities
                            id={opp.id}
                            key={index}
                            name={opp.title}
                            imageUrl={opp.imageUrl}
                        />
                    ))}
                </>
            )}
        </>
    );
};

const SavedComponent = ({ savedOpportunities }: { savedOpportunities: Opportunity[] }) => {
    const t = useTranslations("home.opportunities")


    return (
        <>
            {savedOpportunities.length === 0 ? (
                <p className="text-text-primary">
                    {t("none.saved")}
                </p>
            ) : (
                <>
                    {savedOpportunities.map((opp, index) => (
                        <ExploreOpportunities
                            id={opp.id}
                            key={index}
                            name={opp.title}
                            imageUrl={opp.imageUrl}
                        />
                    ))}
                </>
            )}
        </>
    );
};

export default function Opportunities() {
    const [activeTab, setActiveTab] = useState<string>("applied");
    const tActions = useTranslations("actions")

    const TABS = [
        {
            name: `${tActions("applied")}`,
            status: "applied"
        },
        {
            name: `${tActions("saved")}`,
            status: "saved"
        },
    ]



    const t = useTranslations("home.opportunities")

    const appliedOpportunities: Opportunity[] = [

    ];
    const savedOpportunities: Opportunity[] = [

    ];

    return (
        <div className="lg:w-[50rem] h-app-inner  p-4 overflow-auto scrollbar-hide ">
            {/* 885px equivalent, 64px header height */}
            <div className="mx-auto mb-h-app-down">
                <p className="text-2xl font-heading-large my-[1.25rem]">{t("youropp")}</p> {/* 20px equivalent */}

                {/* Toggle Buttons */}
                <div className="flex lg:h-[3.25rem] justify-start border-b-2 border-border-subtle w-fit mb-[0.5rem]">
                    {/* 52px height, 8px margin */}
                    {
                        TABS.map((tab, idx) => (
                            <div key={idx} className="lg:w-[6.375rem] lg:h-[3.25rem]"> {/* 102px, 52px equivalent */}
                                <button
                                    onClick={() => setActiveTab(`${tab.status}`)}
                                    className={`h-full px-[0.5rem] text-center transition-all duration-200 relative cursor-pointer font-label-large ${activeTab === `${tab.status}`
                                        ? "text-text-brand border-b-2 border-text-brand"
                                        : "text-text-secondary hover:text-text-primary border-b-2"
                                        }`}
                                >
                                    {tab.name}
                                </button>
                            </div>

                        ))
                    }
                </div>

                {/* Opportunities Content */}
                <div className="overflow-auto scrollbar-hide flex gap-[0.5rem] "> {/* 8px equivalent */}
                    {activeTab === "applied" ? (
                        <AppliedComponent appliedOpportunities={appliedOpportunities} />
                    ) : (
                        <SavedComponent savedOpportunities={savedOpportunities} />
                    )}
                </div>

                <h2 className="font-heading-medium my-[1.25rem] text-2xl">{t("moreopp")}</h2> {/* 20px equivalent */}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-[0.75rem]  lg:mb-1 "> {/* 12px, 24px equivalent */}
                    {opportunities.map((opp, index) => (
                        <ExploreOpportunities
                        id={opp.id}
                            key={index}
                            name={opp.title}
                            icon={opp.icon}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}