"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { opportunities } from "./data";
import {
  GET_USER_APPLICATIONS,
  GET_SAVED_OPPORTUNITIES,
  LIST_OPPORTUNITIES,
  WITHDRAW_APPLICATION,
  UNSAVE_OPPORTUNITY,
} from "@/services/gql/opportunities";
import type {
  UserApplicationsResponse,
  GetSavedOpportunitiesData,
  ListOpportunitiesResponse,
} from "@/services/gql/types/opportunities";
import type { Application } from "@/services/gql/types/opportunities";



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

/** Saved item: opportunity id, title, and save record id for unsave */
interface SavedItem {
  opportunityId: string;
  title: string;
  imageUrl?: string;
}

const AppliedComponent = ({
  applications,
  onWithdraw,
  withdrawingId,
}: {
  applications: Application[];
  onWithdraw: (applicationId: string) => void;
  withdrawingId: string | null;
}) => {
  const t = useTranslations("home.opportunities");

  return (
    <>
      {applications.length === 0 ? (
        <p className="text-text-primary">{t("none.applied")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between gap-2 p-3 bg-surface-default rounded-lg border border-border-subtle"
            >
              <Link
                href={`/opportunities/${app.opportunity?.id ?? app.opportunityId}`}
                className="flex-1 min-w-0"
              >
                <p className="font-medium text-text-primary truncate">
                  {app.opportunity?.title ?? "Application"}
                </p>
                <p className="text-xs text-text-secondary capitalize">{app.status}</p>
              </Link>
              {app.status !== "ACCEPTED" && app.status !== "REJECTED" && app.status !== "WITHDRAWN" && (
                <button
                  type="button"
                  onClick={() => onWithdraw(app.id)}
                  disabled={withdrawingId === app.id}
                  className="shrink-0 px-3 py-1.5 text-sm text-text-danger border border-border-subtle rounded-lg hover:bg-surface-hover disabled:opacity-50"
                >
                  {withdrawingId === app.id ? "…" : "Withdraw"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const SavedComponent = ({
  savedItems,
  onUnsave,
  unsavingId,
}: {
  savedItems: SavedItem[];
  onUnsave: (opportunityId: string) => void;
  unsavingId: string | null;
}) => {
  const t = useTranslations("home.opportunities");

  return (
    <>
      {savedItems.length === 0 ? (
        <p className="text-text-primary">{t("none.saved")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {savedItems.map((saved) => (
            <div
              key={saved.opportunityId}
              className="flex items-center justify-between gap-2 p-3 bg-surface-default rounded-lg border border-border-subtle"
            >
              <Link href={`/opportunities/${saved.opportunityId}`} className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{saved.title}</p>
              </Link>
              <button
                type="button"
                onClick={() => onUnsave(saved.opportunityId)}
                disabled={unsavingId === saved.opportunityId}
                className="shrink-0 px-3 py-1.5 text-sm text-text-brand border border-border-brand rounded-lg hover:bg-surface-hover disabled:opacity-50"
              >
                {unsavingId === saved.opportunityId ? "…" : "Unsave"}
              </button>
            </div>
          ))}
        </div>
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

    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
    const [unsavingId, setUnsavingId] = useState<string | null>(null);

    const { data: applicationsData } = useQuery<UserApplicationsResponse>(GET_USER_APPLICATIONS, {
        variables: { limit: 50, offset: 0 },
    });
    const { data: savedData } = useQuery<GetSavedOpportunitiesData>(GET_SAVED_OPPORTUNITIES, {
        variables: { limit: 50, offset: 0 },
    });
    const { data: listData } = useQuery<ListOpportunitiesResponse>(LIST_OPPORTUNITIES, {
        variables: {
            input: { limit: 6, offset: 0, status: "PUBLISHED" },
        },
    });

    const [withdrawApplication] = useMutation(WITHDRAW_APPLICATION, {
        refetchQueries: [{ query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } }],
    });
    const [unsaveOpportunity] = useMutation(UNSAVE_OPPORTUNITY, {
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });

    const applications: Application[] =
        applicationsData?.userApplications?.applications ?? [];
    const savedItems: SavedItem[] =
        savedData?.getSavedOpportunities?.savedOpportunities?.map((saved) => ({
            opportunityId: saved.opportunity?.id ?? saved.opportunityId,
            title: saved.opportunity?.title ?? "Saved opportunity",
        })) ?? [];
    const discoverOpportunities = listData?.opportunities?.opportunities ?? [];

    const handleWithdraw = async (applicationId: string) => {
        setWithdrawingId(applicationId);
        try {
            await withdrawApplication({ variables: { id: applicationId } });
        } finally {
            setWithdrawingId(null);
        }
    };
    const handleUnsave = async (opportunityId: string) => {
        setUnsavingId(opportunityId);
        try {
            await unsaveOpportunity({ variables: { id: opportunityId } });
        } finally {
            setUnsavingId(null);
        }
    };

    return (
        <div className="lg:w-[50rem] h-app-inner  p-4 overflow-y-auto scrollbar-hide ">
            {/* 885px equivalent, 64px header height */}
            <div className="mx-auto mb-h-app-down">
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
                <div className="overflow-auto scrollbar-hide flex gap-[0.5rem] ">
                    {activeTab === "applied" ? (
                        <AppliedComponent
                            applications={applications}
                            onWithdraw={handleWithdraw}
                            withdrawingId={withdrawingId}
                        />
                    ) : (
                        <SavedComponent
                            savedItems={savedItems}
                            onUnsave={handleUnsave}
                            unsavingId={unsavingId}
                        />
                    )}
                </div>

                {discoverOpportunities.length > 0 && (
                    <>
                        <h2 className="font-heading-medium my-[1.25rem] text-2xl">{t("discover") ?? "Discover"}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-[0.75rem] lg:mb-1">
                            {discoverOpportunities.map((opp) => (
                                <ExploreOpportunities
                                    key={opp.id}
                                    id={opp.id}
                                    name={opp.title}
                                />
                            ))}
                        </div>
                    </>
                )}

                <h2 className="font-heading-medium my-[1.25rem] text-2xl">{t("moreopp")}</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-[0.75rem] lg:mb-1 ">
                    {opportunities.map((opp, index) => (
                        <ExploreOpportunities
                            id={opp.id}
                            key={index}
                            name={opp.title}
                            imageUrl={opp.imageUrl}
                            icon={opp.icon}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}