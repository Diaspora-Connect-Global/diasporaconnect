'use client';

import { ButtonType2 } from "@/components/custom/button";
import { TextInput } from "@/components/custom/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabelMedium } from "@/components/utils";
import { Bookmark, Clock, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { SAVE_OPPORTUNITY, SUBMIT_APPLICATION, UNSAVE_OPPORTUNITY, GET_SAVED_OPPORTUNITIES, GET_USER_APPLICATIONS, WITHDRAW_APPLICATION, GET_OPPORTUNITY } from "@/services/gql/opportunities";
import type { SaveOpportunityData, SubmitApplicationData } from "@/services/gql/types/opportunities";
import type { Opportunity } from "@/services/gql/types/opportunities";
import { formatChatTimestamp } from "@/macros/time";

interface OpportunityItemProps {
    item: Opportunity;
}

function formatOpportunityDate(iso?: string) {
    if (!iso) return "";
    try {
        return formatChatTimestamp(iso);
    } catch {
        return new Date(iso).toLocaleDateString();
    }
}

export const CustomEmploymentComponent = ({ item }: OpportunityItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saved, setSaved] = useState(!!item.isSavedByCurrentUser);
    const [formData, setFormData] = useState({ fullName: "", email: "", phoneNumber: "", coverLetter: "" });
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const t = useTranslations('authentication');
    const tO = useTranslations('onboarding');

    const isSaved = saved || item.isSavedByCurrentUser;
    const hasApplied = item.hasCurrentUserApplied ?? false;
    const applicationId = item.currentUserApplicationId ?? null;

    const [saveOpportunity, { loading: saving }] = useMutation<SaveOpportunityData>(SAVE_OPPORTUNITY, {
        onCompleted: () => setSaved(true),
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });
    const [unsaveOpportunity, { loading: unsaving }] = useMutation(UNSAVE_OPPORTUNITY, {
        onCompleted: () => setSaved(false),
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });
    const [submitApplication, { loading: submitting }] = useMutation<SubmitApplicationData>(SUBMIT_APPLICATION, {
        refetchQueries: [{ query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } }],
    });
    const [withdrawApplication, { loading: withdrawing }] = useMutation(WITHDRAW_APPLICATION, {
        refetchQueries: [
            { query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } },
            { query: GET_OPPORTUNITY, variables: { id: item.id } },
        ],
    });


    const RequiredAsterisk = () => <span className="text-red-500">*</span>;
    const scrollToForm = () => {
        const formHeader = document.getElementById('form-header');
        if (formHeader) {
            formHeader.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };


    return (
        <>
            {/* Clickable card that opens dialog */}
            <div
                className=" p-4 border border-border-subtle rounded-lg hover:border-border-brand hover:shadow-sm transition-all duration-200 cursor-pointer bg-surface-default"
                onClick={() => setIsDialogOpen(true)}
            >
                <div className="">
                    <div className="flex justify-between text-center">
                        <p className="heading-xsmall text-text-primary mb-1">
                            {item.title}
                        </p>
                        <p className=" body-small inline-flex items-center gap-1">
                            {formatOpportunityDate(item.createdAt)}
                        </p>
                    </div>

                    <div className=" body-medium flex items-center gap-2 text-text-primary text-sm mb-2">
                        {item.location && (
                            <p className="">{item.location}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-text-primary text-sm">
                        {(item.workMode || item.engagementType) && (
                            <span className=" body-small inline-flex items-center gap-1">
                                {[item.workMode, item.engagementType].filter(Boolean).join(" · ")}
                            </span>
                        )}
                    </div>
                </div>


            </div>

            {/* Dialog */}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="lg:min-w-[70rem] max-h-[90vh] overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <DialogHeader className="text-left">
                                <div className="space-y-2">
                                    {item.location && (
                                        <div className="text-text-secondary text-sm">
                                            {item.location}
                                        </div>
                                    )}

                                    <DialogTitle className="text-2xl font-bold text-text-primary">
                                        {item.title}
                                    </DialogTitle>

                                    <div className="flex items-center gap-1 text-text-secondary text-sm">
                                        <Clock className="w-4 h-4" />
                                        {formatOpportunityDate(item.createdAt)}
                                        {item.deadline && (
                                            <> · Apply before {new Date(item.deadline).toLocaleDateString()}</>
                                        )}
                                    </div>
                                </div>
                            </DialogHeader>



                            <div className="border-b border-b-border-subtle py-4">



                                {item.description && (
                                    <section>
                                        <h3 className="text-lg font-semibold text-text-primary mb-3">
                                            Description
                                        </h3>
                                        <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                                            {item.description}
                                        </p>
                                    </section>
                                )}

                                {item.responsibilities && (
                                    <section>
                                        <h3 className="text-lg font-semibold text-text-primary mb-3">
                                            Responsibilities
                                        </h3>
                                        <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                                            {item.responsibilities}
                                        </div>
                                    </section>
                                )}

                                {item.requirements && (
                                    <section>
                                        <h3 className="text-lg font-semibold text-text-primary mb-3">
                                            Requirements
                                        </h3>
                                        <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                                            {item.requirements}
                                        </div>
                                    </section>
                                )}



                            </div>












                            {item.applicationMethod === "IN_PLATFORM_FORM" && !hasApplied && (
                                <section className=" py-4" id="form-header">
                                    <p className="font-heading-xsmall">Apply for this opportunity</p>
                                    <p> <RequiredAsterisk />Required</p>
                                    <form
                                        className="space-y-4 mt-4"
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (!agreedToTerms || submitting) return;
                                            await submitApplication({
                                                variables: {
                                                    input: {
                                                        opportunityId: item.id,
                                                        applicationData: {
                                                            fullName: formData.fullName,
                                                            email: formData.email,
                                                            phoneNumber: formData.phoneNumber || undefined,
                                                            coverLetter: formData.coverLetter || undefined,
                                                        },
                                                    },
                                                },
                                            });
                                            setIsDialogOpen(false);
                                            setFormData({ fullName: "", email: "", phoneNumber: "", coverLetter: "" });
                                            setAgreedToTerms(false);
                                        }}
                                    >
                                        <TextInput
                                            id="fullName"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                                            label="Full name"
                                            placeholder="Your full name"
                                            required
                                        />
                                        <TextInput
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                            label="Email"
                                            placeholder="Enter your email"
                                            required
                                        />
                                        <TextInput
                                            id="phone"
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
                                            label="Phone number"
                                            placeholder="Your phone number"
                                        />
                                        <div>
                                            <Label htmlFor="coverLetter">Cover letter</Label>
                                            <textarea
                                                id="coverLetter"
                                                value={formData.coverLetter}
                                                onChange={(e) => setFormData((p) => ({ ...p, coverLetter: e.target.value }))}
                                                placeholder="Why you're a good fit..."
                                                className="w-full mt-1 px-3 py-2 border border-border-default rounded-sm bg-surface-subtle text-text-primary min-h-[100px]"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="terms"
                                                checked={agreedToTerms}
                                                onCheckedChange={(v) => setAgreedToTerms(!!v)}
                                                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-surface-brand data-[state=checked]:text-white"
                                            />
                                            <Label htmlFor="terms" className="text-text-primary">
                                                By using this form you agree with the storage and handling of your data by this website
                                            </Label>
                                        </div>

                                        <ButtonType2 type="submit" className="px-4 py-2" disabled={submitting}>
                                            <span>{submitting ? "Submitting…" : "Submit"}</span>
                                        </ButtonType2>
                                    </form>
                                </section>
                            )}
                        </div>



                        {/* Right Column - Job Meta Information */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-6">
                                {/* Job Meta Information Card */}
                                <div className="bg-surface-tertiary w-[20rem] rounded-lg p-4 border border-border-subtle">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-text-primary text-sm">
                                            {[item.workMode, item.engagementType, item.location].filter(Boolean).join(" · ")}
                                        </div>
                                        {item.deadline && (
                                            <div className="flex items-center gap-2 text-text-secondary text-sm">
                                                <Clock className="w-4 h-4" />
                                                Apply before {new Date(item.deadline).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 w-full flex flex-col justify-center gap-3">
                                        {item.applicationMethod === "EXTERNAL_LINK" && item.externalLink && (
                                            <div className="text-text-info bg-surface-info p-2 rounded-md text-sm">
                                                <p>How to apply:</p>
                                                <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="text-text-info underline">
                                                    Apply externally
                                                </a>
                                            </div>
                                        )}
                                        {item.applicationMethod === "EMAIL_REQUEST" && item.applicationEmail && (
                                            <div className="text-text-info bg-surface-info p-2 rounded-md text-sm">
                                                <p>How to apply:</p>
                                                <a href={`mailto:${item.applicationEmail}`} className="text-text-info underline">
                                                    {item.applicationEmail}
                                                </a>
                                            </div>
                                        )}

                                        {item.applicationMethod === "EXTERNAL_LINK" && item.externalLink && (
                                            <button
                                                type="button"
                                                className="flex-1 px-6 py-3 text-text-white border bg-surface-brand font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(item.externalLink!, "_blank");
                                                }}
                                            >
                                                <span>Apply now</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        )}
                                        {hasApplied && (
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-text-secondary">You have applied.</p>
                                                {applicationId && (
                                                    <button
                                                        type="button"
                                                        className="flex-1 px-6 py-3 text-text-danger border border-border-subtle font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full disabled:opacity-50"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (withdrawing) return;
                                                            await withdrawApplication({ variables: { id: applicationId } });
                                                        }}
                                                        disabled={withdrawing}
                                                    >
                                                        {withdrawing ? "…" : "Withdraw application"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {item.applicationMethod === "IN_PLATFORM_FORM" && !hasApplied && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    scrollToForm();
                                                }}
                                                id="form-header-trigger"
                                                className="flex-1 px-6 py-3 bg-surface-brand text-text-white font-medium hover:bg-surface-brand transition-colors cursor-pointer flex items-center justify-center rounded-full"
                                            >
                                                Apply now
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="flex-1 px-6 py-3 text-text-brand border border-border-brand font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-full disabled:opacity-50"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (isSaved) {
                                                    if (unsaving) return;
                                                    await unsaveOpportunity({ variables: { id: item.id } });
                                                } else {
                                                    if (saving) return;
                                                    await saveOpportunity({ variables: { id: item.id } });
                                                }
                                            }}
                                            disabled={saving || unsaving}
                                        >
                                            <Bookmark className="w-4 h-4" />
                                            <span>{isSaved ? "Unsave" : "Save"}</span>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>





















        </>
    );
};