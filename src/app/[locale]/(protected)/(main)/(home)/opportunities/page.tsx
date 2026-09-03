"use client";
import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Calendar, Search, ChevronRight, ExternalLink, Mail, ChevronDown, Briefcase, Bookmark, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ButtonType3 } from "@/components/custom/button";
import { useQuery, useMutation } from "@apollo/client/react";
import { opportunities } from "./data";
import { toast } from "sonner";
import { readMutationOutcome, refusalMessageKey } from "@/lib/mutationOutcome";
import {
  GET_USER_APPLICATIONS,
  GET_SAVED_OPPORTUNITIES,
  WITHDRAW_APPLICATION,
  UNSAVE_OPPORTUNITY,
} from "@/services/gql/opportunities";
import type {
  UserApplicationsResponse,
  GetSavedOpportunitiesData,
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
  ownerType?: string;
  ownerEntityType?: string;
  deadline?: string | null;
  savedAt?: string;
}

/* ─── Status helpers ─── */
type StatusFilter = "ALL" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

type AppliedSortMode = "NEWEST" | "OLDEST" | "DEADLINE" | "STATUS";
type SavedSortMode = "NEWEST" | "OLDEST" | "DEADLINE";

const STATUS_FILTERS: { labelKey: string; value: StatusFilter; dot?: string }[] = [
  { labelKey: "tabs.all", value: "ALL" },
  { labelKey: "tabs.submitted", value: "SUBMITTED", dot: "bg-amber-500" },
  { labelKey: "tabs.accepted", value: "ACCEPTED", dot: "bg-text-brand" },
  { labelKey: "tabs.rejected", value: "REJECTED", dot: "bg-red-500" },
  { labelKey: "tabs.withdrawn", value: "WITHDRAWN", dot: "bg-surface-subtle" },
];

const statusBadgeConfig: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Submitted", bg: "bg-surface-info", text: "text-text-info" },
  REVIEWING: { label: "Submitted", bg: "bg-surface-info", text: "text-text-info" },
  ACCEPTED: { label: "Accepted", bg: "bg-text-brand", text: "text-text-white" },
  REJECTED: { label: "Rejected", bg: "bg-text-brand", text: "text-text-white" },
  WITHDRAWN: { label: "Withdrawn", bg: "bg-surface-subtle", text: "text-text-secondary" },
};

function getStatusFilterValue(status: string): Exclude<StatusFilter, "ALL"> {
  switch (status) {
    case "ACCEPTED":
      return "ACCEPTED";
    case "REJECTED":
      return "REJECTED";
    case "WITHDRAWN":
      return "WITHDRAWN";
    case "PENDING":
    case "REVIEWING":
    default:
      return "SUBMITTED";
  }
}

function getActiveStep(status: string): number {
  switch (status) {
    case "ACCEPTED": return 1;
    case "REJECTED": return 1;
    case "WITHDRAWN": return 1;
    case "PENDING":
    case "REVIEWING":
    default:
      return 0;
  }
}

function getStepperColor(status: string): string {
  switch (status) {
    case "ACCEPTED":
      return "bg-amber-500";
    case "REJECTED":
    case "WITHDRAWN":
      return "bg-red-500";
    default:
      return "bg-blue-500";
  }
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

const isLikelyId = (value?: string | null) => {
  if (!value) return false;
  const v = value.trim();
  return /^[0-9a-f]{24}$/i.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
};

function formatEnumLabel(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeCategoryKey(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/_/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const opportunityIconMap = new Map<string, LucideIcon>(
  opportunities.flatMap((item) => {
    if (!item.icon) return [];
    return [
      [normalizeCategoryKey(item.id), item.icon],
      [normalizeCategoryKey(item.title), item.icon],
    ] as [string, LucideIcon][];
  })
);

function getOpportunityTypeIcon(value?: string | null): LucideIcon | undefined {
  const normalizedRaw = normalizeCategoryKey(value);
  if (!normalizedRaw) return undefined;

  const normalizedLabel = normalizeCategoryKey(formatEnumLabel(value));
  return opportunityIconMap.get(normalizedRaw) ?? opportunityIconMap.get(normalizedLabel);
}

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
  const t = useTranslations("home.opportunities");
  const badge = statusBadgeConfig[app.status] ?? statusBadgeConfig.PENDING;
  const badgeLabelMap: Record<string, string> = {
    PENDING: t("status.submitted"),
    REVIEWING: t("status.submitted"),
    ACCEPTED: t("status.accepted"),
    REJECTED: t("status.rejected"),
    WITHDRAWN: t("status.withdrawn"),
  };
  const opp = app.opportunity;
  const isExternal = opp?.applicationMethod === "EXTERNAL_LINK" || opp?.applicationMethod === "EMAIL_REQUEST";
  const activeStep = getActiveStep(app.status);
  const isRejectedOutcome = app.status === "REJECTED" || app.status === "WITHDRAWN";
  const stepColor = "bg-text-brand";
  const canWithdraw = app.status !== "ACCEPTED" && app.status !== "REJECTED" && app.status !== "WITHDRAWN";
  const timelineSteps = [t("status.submitted"), isRejectedOutcome ? t("status.rejected") : t("status.accepted")];
  const CategoryIcon = getOpportunityTypeIcon(opp?.category);

  const getPosterName = () => {
    const ownerType = (opp?.owner?.type ?? "").toUpperCase();
    const ownerName = opp?.owner?.name?.trim();
    const hasReadableOwnerName = !!ownerName && !isLikelyId(ownerName);

    if (ownerType === "COMMUNITY") {
      return hasReadableOwnerName ? ownerName : t("communityPoster");
    }

    if (ownerType === "ASSOCIATION") {
      return hasReadableOwnerName ? ownerName : t("associationPoster");
    }

    return t("labels.defaultPoster");
  };

  return (
    <div className="bg-surface-default rounded-xl border border-border-subtle p-4 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      {/* Title + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text-primary text-[15px] leading-tight line-clamp-2 flex-1">
          {opp?.title ?? t("labels.application")}
        </h3>
        <span className={`${badge.bg} ${badge.text} text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0`}>
          {isExternal ? (
            <span className="flex items-center gap-1">
              {opp?.applicationMethod === "EXTERNAL_LINK" ? <ExternalLink className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
              {t("status.appliedExternally")}
            </span>
          ) : (badgeLabelMap[app.status] ?? t("status.submitted"))}
        </span>
      </div>

      {/* Category + Organization */}
      <div className="flex flex-col gap-0.5">
        {opp?.category && (
          <p className="text-xs text-text-secondary flex items-center gap-1.5">
            {CategoryIcon ? <CategoryIcon className="w-3.5 h-3.5 shrink-0" /> : <Briefcase className="w-3.5 h-3.5 shrink-0" />}
            {formatEnumLabel(opp.category)}
          </p>
        )}
        <p className="text-xs text-text-secondary pl-5">{t("labels.postedBy")} {getPosterName()}</p>
      </div>

      {/* Progress Stepper — only for in-platform applications with trackable status */}
      {!isExternal && (
        <div className="mt-1 flex justify-center">
          <div className="relative w-[224px]">
            <div className={`absolute left-[6px] right-[6px] top-[5px] h-[2px] ${activeStep >= 1 ? stepColor : "bg-border-subtle"} transition-colors`} />
            <div className="relative flex items-start justify-between">
            {timelineSteps.map((step, i) => {
              const isActive = i <= activeStep;
              const isCurrent = i === activeStep;

              return (
                <div key={step} className="flex w-[96px] flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? stepColor : "bg-border-subtle"} transition-colors ${isCurrent ? "ring-2 ring-offset-1 ring-offset-surface-default" : ""}`} />
                    <span className={`text-[10px] mt-1 text-center leading-tight ${isCurrent ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                      {step}
                    </span>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {t("labels.appliedDate")}: {formatDate(app.createdAt)}
        </span>
        {opp?.deadline && (
          <span>{t("labels.deadline")}: {formatDate(opp.deadline)}</span>
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
            {t("labels.viewDetails")}
            <ChevronRight className="w-3 h-3" />
          </Link>
        ) : canWithdraw ? (
          <button
            onClick={() => onWithdraw(app.id)}
            disabled={withdrawingId === app.id}
            className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-danger bg-surface-subtle hover:bg-surface-danger px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {withdrawingId === app.id ? "…" : t("labels.withdraw")}
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href={`/opportunities/${opp?.id ?? app.opportunityId}`}
            className="flex items-center gap-1 text-xs font-medium text-text-primary bg-surface-subtle hover:bg-surface-disabled px-3 py-1.5 rounded-lg transition-colors"
          >
            {t("labels.viewDetails")}
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
  const [sortMode, setSortMode] = useState<AppliedSortMode>("NEWEST");

  const sortModeLabelMap: Record<AppliedSortMode, string> = {
    NEWEST: t("labels.newest"),
    OLDEST: t("labels.oldest"),
    DEADLINE: t("labels.sortByDeadline"),
    STATUS: t("labels.sortByStatus"),
  };

  const cycleAppliedSortMode = () => {
    setSortMode((prev) => {
      const modes: AppliedSortMode[] = ["NEWEST", "OLDEST", "DEADLINE", "STATUS"];
      const nextIndex = (modes.indexOf(prev) + 1) % modes.length;
      return modes[nextIndex];
    });
  };

  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter !== "ALL") {
      list = list.filter((a) => getStatusFilterValue(a.status) === statusFilter);
    }
    const statusRank: Record<string, number> = {
      ACCEPTED: 0,
      REVIEWING: 1,
      PENDING: 2,
      REJECTED: 3,
      WITHDRAWN: 4,
    };

    const sorted = [...list].sort((a, b) => {
      if (sortMode === "STATUS") {
        const aRank = statusRank[a.status] ?? 99;
        const bRank = statusRank[b.status] ?? 99;
        if (aRank !== bRank) return aRank - bRank;
      }

      if (sortMode === "DEADLINE") {
        const aDeadline = a.opportunity?.deadline ? new Date(a.opportunity.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bDeadline = b.opportunity?.deadline ? new Date(b.opportunity.deadline).getTime() : Number.POSITIVE_INFINITY;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      }

      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      return bCreated - aCreated;
    });

    return sortMode === "OLDEST" ? sorted.reverse() : sorted;
  }, [applications, statusFilter, sortMode]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applications) {
      const key = getStatusFilterValue(a.status);
      counts[key] = (counts[key] ?? 0) + 1;
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
          {t("labels.appliedOpportunities")} ({applications.length})
        </h2>
        <div className="relative">
          <button
            onClick={cycleAppliedSortMode}
            className="flex items-center gap-1 text-sm text-text-secondary border border-border-subtle rounded-lg px-3 py-1.5 hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            {sortModeLabelMap[sortMode]}
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
              {filter.value === "ALL" ? t(filter.labelKey) : `${count}. ${t(filter.labelKey)}`}
            </button>
          );
        })}
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <p className="text-text-secondary text-sm py-4 text-center">{t("none.noApplicationsForStatus")}</p>
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
  const [sortMode, setSortMode] = useState<SavedSortMode>("NEWEST");

  const sortModeLabelMap: Record<SavedSortMode, string> = {
    NEWEST: t("labels.newest"),
    OLDEST: t("labels.oldest"),
    DEADLINE: t("labels.sortByDeadline"),
  };

  const cycleSavedSortMode = () => {
    setSortMode((prev) => {
      const modes: SavedSortMode[] = ["NEWEST", "OLDEST", "DEADLINE"];
      const nextIndex = (modes.indexOf(prev) + 1) % modes.length;
      return modes[nextIndex];
    });
  };

  const isLikelyId = (value?: string) => {
    if (!value) return false;
    const v = value.trim();
    return /^[0-9a-f]{24}$/i.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  };

  const getPosterName = (saved: SavedItem) => {
    const ownerType = (saved.ownerType ?? saved.ownerEntityType ?? "").toUpperCase();
    const ownerName = saved.ownerName?.trim();
    const hasReadableOwnerName = !!ownerName && !isLikelyId(ownerName);

    if (ownerType === "COMMUNITY") {
      return hasReadableOwnerName ? ownerName : t("communityPoster");
    }

    if (ownerType === "ASSOCIATION") {
      return hasReadableOwnerName ? ownerName : t("associationPoster");
    }

    return t("labels.defaultPoster");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const displayItems = useMemo(() => {
    const sorted = [...savedItems].sort((a, b) => {
      if (sortMode === "DEADLINE") {
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      }

      const aTime = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const bTime = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return bTime - aTime;
    });

    return sortMode === "OLDEST" ? sorted.reverse() : sorted;
  }, [savedItems, sortMode]);

  if (displayItems.length === 0) {
    return <p className="text-text-secondary py-8 text-center">{t("none.saved")}</p>;
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-medium text-lg text-text-primary">
          {t("labels.savedOpportunities")} ({displayItems.length})
        </h2>
        <button
          onClick={cycleSavedSortMode}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary border border-border-subtle rounded-lg bg-surface-default hover:bg-surface-hover transition-colors"
        >
          {sortModeLabelMap[sortMode]} <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayItems.map((saved) => {
          const CategoryIcon = getOpportunityTypeIcon(saved.category);
          return (
          <div
            key={saved.opportunityId}
            className="relative flex flex-col justify-between p-4 bg-surface-default rounded-xl border border-border-subtle hover:border-border-default transition-colors"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onUnsave(saved.opportunityId);
              }}
              disabled={unsavingId === saved.opportunityId}
              className="absolute top-4 right-4 transition-transform hover:scale-110 z-10 p-1 disabled:opacity-50"
              aria-label="Unsave opportunity"
            >
              <Bookmark className="w-5 h-5 fill-text-brand text-text-brand" />
            </button>

            {/* Top section: Title */}
            <div className="flex items-start justify-between gap-3 mb-2 pr-8">
              <h3 className="font-semibold text-text-primary text-base leading-tight line-clamp-2">
                {saved.title}
              </h3>
            </div>

            {/* Middle section: Category and Owner */}
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#2d528b]">
                {CategoryIcon ? <CategoryIcon className="w-4 h-4 shrink-0" /> : <Briefcase className="w-4 h-4 shrink-0" />}
                <span className="truncate">{formatEnumLabel(saved.category) || t("labels.opportunity")}</span>
              </div>
              <p className="text-sm text-text-secondary truncate">{t("labels.postedBy")} {getPosterName(saved)}</p>
            </div>

            {/* Bottom section: Deadline and Button */}
            <div className="flex items-center justify-between gap-4 pt-4 mt-auto">
              <p className="text-xs text-text-secondary line-clamp-1">
                {saved.deadline ? `${t("labels.openUntil")} ${formatDate(saved.deadline)}` : t("labels.noDeadline")}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/opportunities/${saved.opportunityId}`}
                  className="px-3 py-1.5 text-sm font-medium text-text-secondary border border-border-default rounded-lg hover:bg-surface-hover transition-colors flex items-center justify-center gap-1 shrink-0 bg-white"
                >
                  {t("labels.viewDetails")} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Opportunities() {
    const [activeTab, setActiveTab] = useState<string>("applied");
  const [prefetchInactiveTab, setPrefetchInactiveTab] = useState(false);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setPrefetchInactiveTab(true);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const shouldLoadApplications = activeTab === "applied" || prefetchInactiveTab;
  const shouldLoadSaved = activeTab === "saved" || prefetchInactiveTab;

  const { data: applicationsData, loading: applicationsLoading } = useQuery<UserApplicationsResponse>(GET_USER_APPLICATIONS, {
        variables: { limit: 50, offset: 0 },
    skip: !shouldLoadApplications,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: false,
    });
  const { data: savedData, loading: savedLoading } = useQuery<GetSavedOpportunitiesData>(GET_SAVED_OPPORTUNITIES, {
        variables: { limit: 50, offset: 0 },
    skip: !shouldLoadSaved,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: false,
    });

    const [withdrawApplication] = useMutation(WITHDRAW_APPLICATION, {
        refetchQueries: [{ query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } }],
    });
    const [unsaveOpportunity] = useMutation(UNSAVE_OPPORTUNITY, {
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });

    const applications: Application[] = applicationsData?.getUserApplications?.applications ?? applicationsData?.userApplications?.applications ?? [];
    const savedItems: SavedItem[] =
        savedData?.getSavedOpportunities?.savedOpportunities?.map((saved) => ({
            opportunityId: saved.opportunity?.id ?? saved.opportunityId,
          title: saved.opportunity?.title ?? t("labels.savedOpportunityFallback"),
            category: saved.opportunity?.category,
            ownerName: saved.opportunity?.owner?.name,
        ownerType: saved.opportunity?.ownerType,
        ownerEntityType: saved.opportunity?.owner?.type,
            deadline: saved.opportunity?.deadline,
        savedAt: saved.savedAt,
        })) ?? [];

    const handleWithdraw = async (applicationId: string) => {
        setWithdrawingId(applicationId);
        try {
          const result = await withdrawApplication({ variables: { applicationId } });
          const outcome = readMutationOutcome(result, d => d.withdrawApplication);
          if (!outcome.ok) {
            toast.error(t(refusalMessageKey(outcome.message, "errors")));
            return;
          }
          toast.success(t("toasts.withdrawSuccess"));
        } catch (err) {
          toast.error(t("opportunities.errors.failed"));
        } finally {
            setWithdrawingId(null);
        }
    };
    const handleUnsave = async (opportunityId: string) => {
        setUnsavingId(opportunityId);
        try {
          const result = await unsaveOpportunity({ variables: { id: opportunityId } });
          const outcome = readMutationOutcome(result, d => d.unsaveOpportunity);
          if (!outcome.ok) {
            toast.error(t(refusalMessageKey(outcome.message, "errors")));
            return;
          }
          toast.success(t("toasts.unsaveSuccess"));
        } catch (err) {
          toast.error(t("opportunities.errors.failed"));
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
                                    className={`h-full w-full px-[0.5rem] text-center transition-all duration-200 relative label-large rounded-none border-0 bg-transparent ${activeTab === `${tab.status}`
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
                    applicationsLoading && !applicationsData ? (
                      <p className="text-text-secondary py-8 text-center">{t("labels.loading")}</p>
                    ) : (
                        <AppliedComponent
                            applications={applications}
                            onWithdraw={handleWithdraw}
                            withdrawingId={withdrawingId}
                        />
                    )
                    ) : (
                    savedLoading && !savedData ? (
                      <p className="text-text-secondary py-8 text-center">{t("labels.loading")}</p>
                    ) : (
                        <SavedComponent
                            savedItems={savedItems}
                            onUnsave={handleUnsave}
                            unsavingId={unsavingId}
                        />
                    )
                    )}
                </div>

                <h2 className="heading-medium my-[1.25rem] text-2xl">{t("moreopp")}</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-[0.75rem] lg:mb-1 ">
                  {opportunities.map((opp) => (
                        <ExploreOpportunities
                            id={opp.id}
                      key={opp.id}
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