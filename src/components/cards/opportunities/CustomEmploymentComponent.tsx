'use client';

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Bookmark, Clock, ExternalLink, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
    SAVE_OPPORTUNITY,
    UNSAVE_OPPORTUNITY,
    GET_SAVED_OPPORTUNITIES,
    GET_USER_APPLICATIONS,
    WITHDRAW_APPLICATION,
    GET_OPPORTUNITY,
} from "@/services/gql/opportunities";
import type { SaveOpportunityData } from "@/services/gql/types/opportunities";
import type { Opportunity } from "@/services/gql/types/opportunities";
import { formatChatTimestamp } from "@/macros/time";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
import { UserBadge } from "@/components/custom/userBadge";
import { resolveUserTier } from "@/lib/userTier";

import { compensationText } from '@/lib/compensation';
import { OpportunityApplicationForm } from '@/components/opportunities/apply/OpportunityApplicationForm';
import { Link } from '@/i18n/navigation';

const isUUID = (s?: string | null) =>
    !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);


interface OpportunityItemProps {
    item: Opportunity;
    displayMode?: 'card' | 'details';
}

function formatOpportunityDate(iso?: string) {
    if (!iso) return "";
    try {
        return formatChatTimestamp(iso);
    } catch {
        return new Date(iso).toLocaleDateString();
    }
}

function formatCompensation(
    min?: number | null,
    max?: number | null,
    currency?: string | null,
    compensationType?: string | null,
) {
    // min/max are integer minor units; compensationText divides by 100 once via formatMoney.
    const text = compensationText(min, max, currency);
    if (!text) return null;
    const typeLabel = compensationType ? ` (${compensationType.replace(/_/g, ' ').toLowerCase()})` : '';
    return `${text}${typeLabel}`;
}

function formatEnumLabel(value?: string | null) {
    if (!value) return '';
    return value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function hasText(value?: string | null) {
    return typeof value === 'string' && value.trim().length > 0;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const CustomEmploymentComponent = ({ item, displayMode = 'card' }: OpportunityItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
    const t = useTranslations("home.opportunities");

    const user = useUserStore((state) => state.user);

    const isSaved = savedOverride ?? !!item.isSavedByCurrentUser;
    const hasApplied = item.hasCurrentUserApplied ?? false;
    // Your own listing: there is nothing to apply to — manage the applicants instead (ids are only compared, never shown).
    const isOwner = item.ownerType === 'USER' && !!item.ownerId && item.ownerId === user?.userId;
    const applicationId = item.currentUserApplicationId ?? null;
    const isExternalLinkMethod = item.applicationMethod === "EXTERNAL_LINK";
    const isEmailRequestMethod = item.applicationMethod === "EMAIL_REQUEST";
    const isInPlatformFormMethod = item.applicationMethod === "IN_PLATFORM_FORM"
        || (!item.applicationMethod || !["EXTERNAL_LINK", "EMAIL_REQUEST", "IN_PLATFORM_FORM"].includes(item.applicationMethod));

    const isLikelyId = (value?: string | null) => {
        if (!value) return false;
        const v = value.trim();
        return /^[0-9a-f]{24}$/i.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    };

    const getPosterName = () => {
        const ownerType = (item.ownerType ?? item.owner?.type ?? "").toUpperCase();
        const ownerName = item.owner?.name?.trim();
        const hasReadableOwnerName = !!ownerName && !isLikelyId(ownerName);

        // A member's own listing carries their name; it used to say "DiasporaPlug" for every member.
        if (hasReadableOwnerName) return ownerName;
        if (ownerType === "COMMUNITY") return t("communityPoster");
        if (ownerType === "ASSOCIATION") return t("associationPoster");
        return "DiasporaPlug";
    };

    const posterName = getPosterName();

    // Defensive cast — `trustScore`/`trustTier` land on the opportunity owner
    // `Profile` via a parallel GQL sweep; types may not be updated yet.
    const ownerWithTrust = item.owner as (typeof item.owner & { trustScore?: number; trustTier?: string }) | undefined;
    const ownerTier = resolveUserTier({
        tier: ownerWithTrust?.trustTier,
        trustScore: ownerWithTrust?.trustScore,
    });

    useEffect(() => {
        setSavedOverride(null);
    }, [item.id, item.isSavedByCurrentUser]);

    const compensation = formatCompensation(
        item.compensationMin,
        item.compensationMax,
        item.compensationCurrency,
        item.compensationType,
    );

    const safeSubCategory = hasText(item.subCategory) ? item.subCategory!.trim() : null;
    const safeDuration = hasText(item.duration) ? item.duration!.trim() : null;
    const safeBenefitsSummary = hasText(item.benefitsSummary) ? item.benefitsSummary!.trim() : null;
    const safeEligibilityRegions = useMemo(
        () => (item.eligibilityRegions ?? []).map((r) => r?.trim()).filter((r): r is string => !!r),
        [item.eligibilityRegions]
    );
    const safeTags = useMemo(
        () => (item.tags ?? []).map((tag) => tag?.trim()).filter((tag): tag is string => !!tag),
        [item.tags]
    );
    const showHeaderBadges = !!item.status || !!item.type || !!item.category || !!safeSubCategory;

    const [saveOpportunity, { loading: saving }] = useMutation<SaveOpportunityData>(SAVE_OPPORTUNITY, {
        onCompleted: () => setSavedOverride(true),
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });
    const [unsaveOpportunity, { loading: unsaving }] = useMutation(UNSAVE_OPPORTUNITY, {
        onCompleted: () => setSavedOverride(false),
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });
    const [withdrawApplication, { loading: withdrawing }] = useMutation<{ withdrawApplication: boolean }>(WITHDRAW_APPLICATION, {
        refetchQueries: [
            { query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } },
            { query: GET_OPPORTUNITY, variables: { id: item.id } },
        ],
    });
    const scrollToForm = () => {
        document.getElementById('form-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSaveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (isSaved) {
                if (!unsaving) {
                    await unsaveOpportunity({ variables: { id: item.id } });
                }
            } else {
                if (!saving) {
                    await saveOpportunity({ variables: { id: item.id } });
                }
            }
        } catch {
            toast.error(t("toasts.saveToggleError"));
        }
    };

    const detailContent = (
        <>
            <button
                type="button"
                onClick={handleSaveToggle}
                disabled={saving || unsaving}
                className="absolute top-4 right-4 rounded-full p-2.5 opacity-100 ring-offset-background transition-all hover:scale-105 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-text-secondary bg-surface-default border border-border-subtle shadow-sm hover:text-text-brand"
            >
                <Bookmark className={`w-5 h-5 ${isSaved ? "fill-text-brand text-text-brand" : "text-text-secondary"}`} />
                <span className="sr-only">{isSaved ? "Unsave" : "Save"}</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="text-left">
                        <div className="space-y-2">
                            {item.location && !isUUID(item.location) && (
                                <p className="text-text-secondary text-sm">{item.location}</p>
                            )}
                            <h2 className="text-2xl font-bold text-text-primary">
                                {item.title}
                            </h2>
                            {showHeaderBadges && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {item.status && (
                                        <span className="px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-full text-xs font-medium text-text-primary">
                                            {formatEnumLabel(item.status)}
                                        </span>
                                    )}
                                    {item.type && (
                                        <span className="px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-full text-xs font-medium text-text-primary">
                                            {formatEnumLabel(String(item.type))}
                                        </span>
                                    )}
                                    {item.category && (
                                        <span className="px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-full text-xs font-medium text-text-primary">
                                            {formatEnumLabel(String(item.category))}
                                        </span>
                                    )}
                                    {safeSubCategory && (
                                        <span className="px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-full text-xs font-medium text-text-primary">
                                            {safeSubCategory}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-1 text-text-secondary text-sm">
                                <Clock className="w-4 h-4" />
                                {formatOpportunityDate(item.createdAt)}
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-b-border-subtle pb-4 space-y-6">
                        {item.description && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Description</h3>
                                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
                            </section>
                        )}
                        {item.scope && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Scope</h3>
                                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{item.scope}</p>
                            </section>
                        )}
                        {item.eligibilityCriteria && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Eligibility Criteria</h3>
                                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{item.eligibilityCriteria}</p>
                            </section>
                        )}
                        {safeDuration && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Duration</h3>
                                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{safeDuration}</p>
                            </section>
                        )}
                        {safeBenefitsSummary && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Benefits</h3>
                                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{safeBenefitsSummary}</p>
                            </section>
                        )}
                        {safeEligibilityRegions.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Eligibility Regions</h3>
                                <div className="flex flex-wrap gap-2">
                                    {safeEligibilityRegions.map((region) => (
                                        <span key={region} className="px-3 py-1 bg-surface-subtle border border-border-subtle text-text-primary text-sm rounded-full">
                                            {region}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                        {item.skills && item.skills.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {item.skills.map(skill => (
                                        <span key={skill} className="px-3 py-1 bg-surface-subtle border border-border-subtle text-text-primary text-sm rounded-full">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                        {safeTags.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {safeTags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 bg-surface-subtle border border-border-subtle text-text-primary text-sm rounded-full">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Application Form — IN_PLATFORM_FORM only */}
                    {isInPlatformFormMethod && !hasApplied && !isOwner && (
                        <section className="py-4" id="form-header">
                            <p className="heading-xsmall text-lg font-semibold mb-1">{t("labels.applyForOpportunity")}</p>
                            <p className="text-sm text-text-secondary mb-4">
                                <span className="text-red-500">*</span> {t("labels.requiredFieldsHint")}
                            </p>
                            <OpportunityApplicationForm item={item} onSubmitted={() => setIsDialogOpen(false)} />
                        </section>
                    )}
                </div>

                {/* Right Column — Meta + Actions */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 space-y-6 mt-12">
                        <div className="bg-surface-tertiary w-full rounded-lg p-4 border border-border-subtle space-y-4">
                            {/* Action buttons */}
                            <div className="flex flex-col gap-2">
                                {isOwner && (
                                    <Link
                                        href={`/opportunities/${encodeURIComponent(item.id)}/applicants`}
                                        className="w-full px-6 py-3 bg-surface-brand text-text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                                    >
                                        {t("labels.manageApplicants")}
                                    </Link>
                                )}
                                {!isOwner && isExternalLinkMethod && item.externalLink && (
                                    <button
                                        type="button"
                                        className="w-full px-6 py-3 text-text-white bg-surface-brand font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full hover:opacity-90 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); window.open(item.externalLink!, "_blank", "noopener,noreferrer"); }}
                                    >
                                        <span>{t("labels.applyNow")}</span>
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                )}
                                {!isOwner && isEmailRequestMethod && item.applicationEmail && (
                                    <a
                                        href={`mailto:${item.applicationEmail}`}
                                        className="w-full px-6 py-3 text-text-white bg-surface-brand font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full hover:opacity-90 transition-opacity"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span>{t("labels.applyViaEmail")}</span>
                                        <Mail className="w-4 h-4" />
                                    </a>
                                )}
                                {!isOwner && isInPlatformFormMethod && !hasApplied && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); scrollToForm(); }}
                                        className="w-full px-6 py-3 bg-surface-brand text-text-white font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center rounded-full"
                                    >
                                        {t("labels.applyNow")}
                                    </button>
                                )}
                                {!isOwner && hasApplied && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-text-secondary text-center">{t("labels.alreadyApplied")}</p>
                                        {applicationId && (
                                            <button
                                                type="button"
                                                className="w-full px-6 py-3 text-text-danger border border-border-subtle font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full disabled:opacity-50 hover:bg-surface-danger transition-colors"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (withdrawing) return;
                                                    try {
                                                        const result = await withdrawApplication({ variables: { applicationId } });
                                                        // errorPolicy 'all': a refusal resolves with data: null / false.
                                                        if (!result?.data?.withdrawApplication) {
                                                            toast.error(t("toasts.withdrawError"));
                                                            return;
                                                        }
                                                        toast.success(t("toasts.withdrawSuccess"));
                                                    } catch {
                                                        toast.error(t("toasts.withdrawError"));
                                                    }
                                                }}
                                                disabled={withdrawing}
                                            >
                                                {withdrawing ? t("labels.withdrawing") : t("labels.withdrawApplication")}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Meta info */}
                            <div className="space-y-2 text-sm text-text-secondary">
                                {[item.deliveryMode, item.commitmentType, !isUUID(item.location) ? item.location : null]
                                    .filter(Boolean)
                                    .join(' · ') && (
                                    <p className="text-text-primary">
                                        {[item.deliveryMode, item.commitmentType, !isUUID(item.location) ? item.location : null]
                                            .filter(Boolean).join(' · ')}
                                    </p>
                                )}
                                {compensation && (
                                    <p className="font-medium text-text-success">{compensation}</p>
                                )}
                                {item.deadline && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 shrink-0" />
                                        Apply before {new Date(item.deadline).toLocaleDateString()}
                                    </div>
                                )}
                                {typeof item.applicationCount === 'number' && item.applicationCount > 0 && (
                                    <div className="text-sm">
                                        {item.applicationCount} application{item.applicationCount === 1 ? '' : 's'}
                                    </div>
                                )}
                            </div>

                            {/* How to apply info */}
                            {isExternalLinkMethod && item.externalLink && (
                                <div className="text-text-info bg-surface-info p-2 rounded-md text-sm">
                                    <p className="font-medium mb-1">{t("labels.howToApply")}</p>
                                    <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="underline break-all">
                                        {t("labels.applyExternally")}
                                    </a>
                                </div>
                            )}
                            {isEmailRequestMethod && item.applicationEmail && (
                                <div className="text-text-info bg-surface-info p-2 rounded-md text-sm">
                                    <p className="font-medium mb-1">{t("labels.howToApply")}</p>
                                    <a href={`mailto:${item.applicationEmail}`} className="underline break-all flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 shrink-0" />
                                        {item.applicationEmail}
                                    </a>
                                </div>
                            )}

                            {item.deadline && (
                                <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">Deadline</span>
                                    <span className="font-medium text-text-primary">
                                        {new Date(item.deadline).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    if (displayMode === 'details') {
        return (
            <div className="relative p-4 lg:p-6 rounded-2xl bg-surface-default">
                {detailContent}
            </div>
        );
    }

    return (
        <>
            {/* Card */}
            <div
                className="p-5 border border-border-subtle rounded-2xl hover:border-border-brand hover:shadow-md transition-all duration-300 cursor-pointer bg-surface-default group flex flex-col h-full relative min-h-[160px]"
                onClick={() => setIsDialogOpen(true)}
            >
                <button
                    type="button"
                    className="absolute top-5 right-5 transition-transform hover:scale-110 z-10 p-1"
                    onClick={handleSaveToggle}
                    disabled={saving || unsaving}
                >
                    <Bookmark className={`w-6 h-6 ${isSaved ? "fill-text-brand text-text-brand" : "text-text-secondary hover:text-text-brand"}`} />
                </button>

                <div className="flex justify-between items-start mb-5 pr-8">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-surface-subtle border border-border-subtle rounded-xl flex items-center justify-center shrink-0">
                            <span className="text-xl font-bold text-text-primary capitalize">
                                {posterName?.charAt(0) || item.title?.charAt(0) || "O"}
                            </span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <h3 className="text-[17px] font-semibold text-text-primary group-hover:text-text-brand transition-colors line-clamp-1 leading-tight">
                                {item.title}
                            </h3>
                            <div className="inline-flex items-center gap-1 mt-1 max-w-full">
                                <p className="text-[14px] text-text-secondary line-clamp-1">
                                    {t("posterBy", { user: posterName })}
                                </p>
                                {ownerTier && <UserBadge tier={ownerTier} size="xs" />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mb-5 flex-grow">
                    {item.location && !isUUID(item.location) && (
                        <p className="text-[14px] text-text-secondary">{item.location}</p>
                    )}
                    {compensation && (
                        <p className="text-[14px] font-medium text-text-success">{compensation}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        {item.deliveryMode && (
                            <span className="px-3 py-1 bg-surface-subtle border border-border-subtle text-text-primary text-[13px] font-medium rounded-lg capitalize">
                                {item.deliveryMode.replace(/_/g, ' ').toLowerCase()}
                            </span>
                        )}
                        {item.commitmentType && (
                            <span className="px-3 py-1 bg-surface-subtle border border-border-subtle text-text-primary text-[13px] font-medium rounded-lg capitalize">
                                {item.commitmentType.replace(/_/g, ' ').toLowerCase()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-text-secondary text-[13px] font-medium">
                        <Clock className="w-4 h-4" />
                        <span>
                            {item.deadline
                                ? `Deadline: ${new Date(item.deadline).toLocaleDateString()}`
                                : `Posted: ${formatOpportunityDate(item.createdAt)}`}
                        </span>
                    </div>
                    <span className="text-[13px] text-text-brand font-medium group-hover:underline">
                        View details
                    </span>
                </div>
            </div>

            {/* Detail Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="lg:min-w-[70rem] max-h-[90vh] overflow-y-auto">
                    <DialogTitle className="sr-only">{item.title || 'Opportunity details'}</DialogTitle>
                    {detailContent}
                </DialogContent>
            </Dialog>
        </>
    );
};
