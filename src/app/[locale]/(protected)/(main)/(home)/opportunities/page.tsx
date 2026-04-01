"use client";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Calendar, Search, ChevronRight, ExternalLink, Mail, ChevronDown, Briefcase, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ButtonType3 } from "@/components/custom/button";
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

interface SavedItem {
  opportunityId: string;
  title: string;
  category?: string;
  ownerName?: string;
  deadline?: string | null;
}

/* ─── Status helpers ─── */
type StatusFilter = "ALL" | "REVIEWING" | "ACCEPTED" | "REJECTED" | "PENDING";

const STATUS_FILTERS: { label: string; value: StatusFilter; dot?: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Under Review", value: "REVIEWING", dot: "bg-green-500" },
  { label: "Shortlisted", value: "ACCEPTED", dot: "bg-amber-500" },
  { label: "Interview", value: "PENDING", dot: "bg-blue-500" },
  { label: "Rejected", value: "REJECTED", dot: "bg-red-500" },
];

const statusBadgeConfig: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Submitted", bg: "bg-surface-info", text: "text-text-info" },
  REVIEWING: { label: "Under Review", bg: "bg-surface-success", text: "text-text-success" },
  ACCEPTED: { label: "Shortlisted", bg: "bg-surface-warning", text: "text-text-warning" },
  REJECTED: { label: "Rejected", bg: "bg-surface-danger", text: "text-text-danger" },
  WITHDRAWN: { label: "Withdrawn", bg: "bg-surface-subtle", text: "text-text-secondary" },
};

const STEPPER_STEPS = ["Submitted", "Review", "Shortlist", "Interview", "Final"];

function getActiveStep(status: string): number {
  switch (status) {
    case "PENDING": return 0;
    case "REVIEWING": return 1;
    case "ACCEPTED": return 2;
    case "REJECTED": return -1;
    case "WITHDRAWN": return -1;
    default: return 0;
  }
}

function getStepperColor(status: string): string {
  switch (status) {
    case "REVIEWING": return "bg-green-500";
    case "ACCEPTED": return "bg-amber-500";
    case "PENDING": return "bg-blue-500";
    default: return "bg-surface-brand";
  }
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

/* ─── Category icon mapping (reuse the opportunity categories from data) ─── */
const categoryIcons: Record<string, string> = {
  "Funding & Grants": "💰",
  "Education & Training": "🎓",
  "Employment & Career": "💼",
  "Fellowships & Leadership": "🏆",
  "Business & Investment": "🏢",
  "Volunteering & Social Impact": "❤️",
  "Event & Creative Industry": "🎨",
  "Agriculture & Sustainability": "🌱",
  "Real Estate & Infrastructure": "🏠",
  "Gov't & Embassy Initiatives": "🏛️",
  "Innovation & Research": "💡",
  "Finance & Economics": "📈",
};

/* ─── Application Card ─── */
const ApplicationCard = ({
  app,
  onWithdraw,
  withdrawingId,
}: {
  app: Application;
  onWithdraw: (id: string) => void;
  withdrawingId: string | null;
}) => {
  const badge = statusBadgeConfig[app.status] ?? statusBadgeConfig.PENDING;
  const opp = app.opportunity;
  const isExternal = opp?.applicationMethod === "EXTERNAL_LINK" || opp?.applicationMethod === "EMAIL_REQUEST";
  const activeStep = getActiveStep(app.status);
  const stepColor = getStepperColor(app.status);
  const canWithdraw = app.status !== "ACCEPTED" && app.status !== "REJECTED" && app.status !== "WITHDRAWN";

  return (
    <div className="bg-surface-default rounded-xl border border-border-subtle p-4 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      {/* Title + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary text-[15px] leading-tight line-clamp-2 flex-1">
          {opp?.title ?? "Application"}
        </h3>
        <span className={`${badge.bg} ${badge.text} text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0`}>
          {isExternal ? (
            <span className="flex items-center gap-1">
              {opp?.applicationMethod === "EXTERNAL_LINK" ? <ExternalLink className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
              Applied Externally
            </span>
          ) : badge.label}
        </span>
      </div>

      {/* Category + Organization */}
      <div className="flex flex-col gap-0.5">
        {opp?.category && (
          <p className="text-xs text-text-secondary flex items-center gap-1.5">
            <span>{categoryIcons[opp.category] ?? "📋"}</span>
            {opp.category}
          </p>
        )}
        {opp?.owner?.name && (
          <p className="text-xs text-text-secondary pl-5">{opp.owner.name}</p>
        )}
      </div>

      {/* Progress Stepper — only for in-platform applications with trackable status */}
      {!isExternal && app.status !== "REJECTED" && app.status !== "WITHDRAWN" && (
        <div className="flex items-center gap-0 mt-1">
          {STEPPER_STEPS.map((step, i) => {
            const isActive = i <= activeStep;
            const isCurrent = i === activeStep;
            return (
              <div key={step} className="flex items-center flex-1">
                {/* Dot */}
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div className={`h-[2px] flex-1 ${i <= activeStep ? stepColor : "bg-border-subtle"} transition-colors`} />
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? stepColor : "bg-border-subtle"} transition-colors ${isCurrent ? "ring-2 ring-offset-1 ring-offset-surface-default" : ""}`}
                    />
                    {i < STEPPER_STEPS.length - 1 && (
                      <div className={`h-[2px] flex-1 ${i < activeStep ? stepColor : "bg-border-subtle"} transition-colors`} />
                    )}
                  </div>
                  <span className={`text-[10px] ${isCurrent ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                    {step}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Applied: {formatDate(app.createdAt)}
        </span>
        {opp?.deadline && (
          <span>Deadline: {formatDate(opp.deadline)}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border-subtle">
        <div className="flex-1" />
        {isExternal ? (
          <Link
            href={`/opportunities/${opp?.id ?? app.opportunityId}`}
            className="flex items-center gap-1 text-xs font-medium text-text-primary bg-surface-subtle hover:bg-surface-disabled px-3 py-1.5 rounded-lg transition-colors"
          >
            <Search className="w-3 h-3" />
            View Details
            <ChevronRight className="w-3 h-3" />
          </Link>
        ) : canWithdraw ? (
          <button
            onClick={() => onWithdraw(app.id)}
            disabled={withdrawingId === app.id}
            className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-danger bg-surface-subtle hover:bg-surface-danger px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {withdrawingId === app.id ? "…" : "Withdraw"}
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href={`/opportunities/${opp?.id ?? app.opportunityId}`}
            className="flex items-center gap-1 text-xs font-medium text-text-primary bg-surface-subtle hover:bg-surface-disabled px-3 py-1.5 rounded-lg transition-colors"
          >
            View Details
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
};

/* ─── Applied Component (redesigned) ─── */
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter !== "ALL") {
      list = list.filter((a) => a.status === statusFilter);
    }
    // newest first (default)
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applications) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [applications]);

  if (applications.length === 0) {
    return <p className="text-text-secondary py-8 text-center">{t("none.applied")}</p>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header: count + sort */}
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-semibold text-base">
          Applied Opportunities ({applications.length})
        </h2>
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1 text-sm text-text-secondary border border-border-subtle rounded-lg px-3 py-1.5 hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            Newest
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          const count = filter.value === "ALL" ? applications.length : (statusCounts[filter.value] ?? 0);
          return (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                isActive
                  ? "bg-surface-brand text-text-white"
                  : "bg-surface-default text-text-secondary border border-border-subtle hover:bg-surface-subtle"
              }`}
            >
              {filter.dot && <span className={`w-2 h-2 rounded-full ${filter.dot}`} />}
              {filter.value === "ALL" ? filter.label : `${count}. ${filter.label}`}
            </button>
          );
        })}
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <p className="text-text-secondary text-sm py-4 text-center">No applications with this status.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onWithdraw={onWithdraw}
              withdrawingId={withdrawingId}
            />
          ))}
        </div>
      )}
    </div>
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const displayItems = savedItems;

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading-medium text-lg text-text-primary">
          Saved Opportunities ({displayItems.length})
        </h2>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary border border-border-subtle rounded-lg bg-surface-default hover:bg-surface-hover transition-colors">
          Newest <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayItems.map((saved) => (
          <div
            key={saved.opportunityId}
            className="flex flex-col justify-between p-4 bg-surface-default rounded-xl border border-border-subtle hover:border-border-default transition-colors"
          >
            {/* Top section: Title */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-text-primary text-base leading-tight line-clamp-2">
                {saved.title}
              </h3>
            </div>

            {/* Middle section: Category and Owner */}
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#2d528b]">
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="truncate">{saved.category}</span>
              </div>
              <p className="text-sm text-text-secondary truncate">{saved.ownerName}</p>
            </div>

            {/* Bottom section: Deadline and Button */}
            <div className="flex items-center justify-between gap-4 pt-4 mt-auto">
              <p className="text-xs text-text-secondary line-clamp-1">
                {saved.deadline ? `Open until ${formatDate(saved.deadline)}` : 'No deadline'}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/opportunities/${saved.opportunityId}`}
                  className="px-3 py-1.5 text-sm font-medium text-text-secondary border border-border-default rounded-lg hover:bg-surface-hover transition-colors flex items-center justify-center gap-1 shrink-0 bg-white"
                >
                  View Details <ChevronRight className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onUnsave(saved.opportunityId);
                  }}
                  disabled={unsavingId === saved.opportunityId}
                  className="px-3 py-1.5 text-sm font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1 shrink-0 disabled:opacity-50"
                >
                  {unsavingId === saved.opportunityId ? "Unsaving..." : "Unsave"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
            input: { limit: 6, offset: 0 },
        },
    });

    const [withdrawApplication] = useMutation(WITHDRAW_APPLICATION, {
        refetchQueries: [{ query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } }],
    });
    const [unsaveOpportunity] = useMutation(UNSAVE_OPPORTUNITY, {
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });

    const applications: Application[] = applicationsData?.userApplications?.applications ?? [];
    const savedItems: SavedItem[] =
        savedData?.getSavedOpportunities?.savedOpportunities?.map((saved) => ({
            opportunityId: saved.opportunity?.id ?? saved.opportunityId,
            title: saved.opportunity?.title ?? "Saved opportunity",
            category: saved.opportunity?.category,
            ownerName: saved.opportunity?.owner?.name,
            deadline: saved.opportunity?.deadline,
        })) ?? [];
    const discoverOpportunities = listData?.listOpportunities?.opportunities ?? [];

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
                                <ButtonType3
                                    onClick={() => setActiveTab(`${tab.status}`)}
                                    className={`h-full w-full px-[0.5rem] text-center transition-all duration-200 relative font-label-large rounded-none border-0 bg-transparent ${activeTab === `${tab.status}`
                                        ? "text-text-brand border-b-2 border-text-brand"
                                        : "text-text-secondary hover:text-text-primary border-b-2 border-transparent"
                                        }`}
                                >
                                    {tab.name}
                                </ButtonType3>
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