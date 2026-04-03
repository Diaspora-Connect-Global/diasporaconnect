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
import { Bookmark, Clock, ExternalLink, Mail, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
    SAVE_OPPORTUNITY,
    SUBMIT_APPLICATION,
    UNSAVE_OPPORTUNITY,
    GET_SAVED_OPPORTUNITIES,
    GET_USER_APPLICATIONS,
    WITHDRAW_APPLICATION,
    GET_OPPORTUNITY,
} from "@/services/gql/opportunities";
import type {
    SaveOpportunityData,
    SubmitApplicationData,
    FormField,
    FileRefType,
} from "@/services/gql/types/opportunities";
import type { Opportunity } from "@/services/gql/types/opportunities";
import { formatChatTimestamp } from "@/macros/time";
import { useUserStore } from "@/store/useUserStore";

const isUUID = (s?: string | null) =>
    !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const STANDARD_KEYS = new Set(['full_name', 'email', 'phone', 'cover_letter', 'resume']);

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

function formatCompensation(
    min?: number | null,
    max?: number | null,
    currency?: string | null,
    compensationType?: string | null,
) {
    if (!min && !max) return null;
    const fmt = (n: number) => n.toLocaleString();
    const cur = currency ?? '';
    const typeLabel = compensationType ? ` (${compensationType.replace(/_/g, ' ').toLowerCase()})` : '';
    if (min && max) return `${cur} ${fmt(min)} – ${fmt(max)}${typeLabel}`;
    if (min) return `${cur} ${fmt(min)}+${typeLabel}`;
    return `Up to ${cur} ${fmt(max!)}${typeLabel}`;
}

// ─── Dynamic form field renderer ─────────────────────────────────────────────

interface DynamicFieldProps {
    field: FormField;
    value: string;
    onChange: (val: string) => void;
    onFileChange?: (file: File | null) => void;
}

const DynamicField = ({ field, value, onChange, onFileChange }: DynamicFieldProps) => {
    const fileRef = useRef<HTMLInputElement>(null);

    if (field.type === 'file_upload') {
        return (
            <div>
                <Label htmlFor={field.key}>
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div
                    className="mt-1 border border-dashed border-border-default rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-surface-subtle transition-colors"
                    onClick={() => fileRef.current?.click()}
                >
                    <Upload className="w-5 h-5 text-text-secondary" />
                    <p className="text-sm text-text-secondary text-center">
                        {value ? value : 'Click to upload a file'}
                    </p>
                </div>
                <input
                    ref={fileRef}
                    id={field.key}
                    type="file"
                    className="hidden"
                    required={field.required}
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        onChange(file?.name ?? '');
                        onFileChange?.(file);
                    }}
                />
            </div>
        );
    }

    if (field.type === 'textarea') {
        return (
            <div>
                <Label htmlFor={field.key}>
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <textarea
                    id={field.key}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={field.required}
                    className="w-full mt-1 px-3 py-2 border border-border-default rounded-sm bg-surface-subtle text-text-primary min-h-[100px] text-sm"
                    placeholder={field.label}
                />
            </div>
        );
    }

    return (
        <TextInput
            id={field.key}
            type={field.type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            label={field.label}
            placeholder={field.label}
            required={field.required}
        />
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const CustomEmploymentComponent = ({ item }: OpportunityItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const t = useTranslations("home.opportunities");

    // Dynamic field values keyed by formField.key
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const user = useUserStore((state) => state.user);

    const isSaved = savedOverride ?? !!item.isSavedByCurrentUser;
    const hasApplied = item.hasCurrentUserApplied ?? false;
    const applicationId = item.currentUserApplicationId ?? null;

    const isLikelyId = (value?: string | null) => {
        if (!value) return false;
        const v = value.trim();
        return /^[0-9a-f]{24}$/i.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    };

    const getPosterName = () => {
        const ownerType = (item.ownerType ?? item.owner?.type ?? "").toUpperCase();
        const ownerName = item.owner?.name?.trim();
        const hasReadableOwnerName = !!ownerName && !isLikelyId(ownerName);

        if (ownerType === "COMMUNITY") {
            return hasReadableOwnerName ? ownerName : t("communityPoster");
        }

        if (ownerType === "ASSOCIATION") {
            return hasReadableOwnerName ? ownerName : t("associationPoster");
        }

        return "DiasporaPlug";
    };

    const posterName = getPosterName();

    useEffect(() => {
        setSavedOverride(null);
    }, [item.id, item.isSavedByCurrentUser]);

    const compensation = formatCompensation(
        item.compensationMin,
        item.compensationMax,
        item.compensationCurrency,
        item.compensationType,
    );

    const [saveOpportunity, { loading: saving }] = useMutation<SaveOpportunityData>(SAVE_OPPORTUNITY, {
        onCompleted: () => setSavedOverride(true),
        refetchQueries: [{ query: GET_SAVED_OPPORTUNITIES, variables: { limit: 50, offset: 0 } }],
    });
    const [unsaveOpportunity, { loading: unsaving }] = useMutation(UNSAVE_OPPORTUNITY, {
        onCompleted: () => setSavedOverride(false),
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

    const formFields = useMemo(() => item.formFields ?? [], [item.formFields]);

    // Build a sorted list: standard fields first, then custom
    const standardFieldOrder = ['full_name', 'email', 'phone', 'cover_letter', 'resume'];
    const orderedFields = useMemo(() => (
        [
            ...standardFieldOrder.map(k => formFields.find(f => f.key === k)).filter(Boolean),
            ...formFields.filter(f => !STANDARD_KEYS.has(f.key)),
        ] as typeof formFields
    ), [formFields]);

    const displayFields = useMemo(() => (
        orderedFields.length > 0
            ? orderedFields
            : [
                { key: 'full_name', label: 'Full Name', type: 'text' as const, required: true },
                { key: 'email', label: 'Email', type: 'email' as const, required: true },
                { key: 'phone', label: 'Phone Number', type: 'text' as const, required: false },
                { key: 'cover_letter', label: 'Cover Letter', type: 'textarea' as const, required: false },
            ]
    ), [orderedFields]);

    useEffect(() => {
        if (item.applicationMethod !== 'IN_PLATFORM_FORM' || !user) return;

        const fullName = [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();

        const fullNameField = displayFields.find((f) => {
            const key = f.key.toLowerCase();
            const label = f.label.toLowerCase();
            return key === 'full_name' || key === 'fullname' || label === 'full name';
        });

        const emailField = displayFields.find((f) => {
            const key = f.key.toLowerCase();
            const label = f.label.toLowerCase();
            return key === 'email' || label === 'email';
        });

        const phoneField = displayFields.find((f) => {
            const key = f.key.toLowerCase();
            const label = f.label.toLowerCase();
            return key === 'phone' || key === 'phone_number' || key === 'phonenumber' || label === 'phone number';
        });

        setFieldValues((prev) => {
            const next = { ...prev };
            let changed = false;

            if (fullNameField && !next[fullNameField.key] && fullName) {
                next[fullNameField.key] = fullName;
                changed = true;
            }
            if (emailField && !next[emailField.key] && user.email) {
                next[emailField.key] = user.email;
                changed = true;
            }
            if (phoneField && !next[phoneField.key] && user.phone) {
                next[phoneField.key] = user.phone;
                changed = true;
            }

            return changed ? next : prev;
        });
    }, [item.applicationMethod, user, displayFields]);

    const handleFieldChange = (key: string, val: string) => {
        setFieldValues(prev => ({ ...prev, [key]: val }));
    };

    const scrollToForm = () => {
        document.getElementById('form-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms || submitting) return;

        // Separate standard vs custom answers
        const customAnswers: Record<string, string> = {};
        for (const field of formFields) {
            if (!STANDARD_KEYS.has(field.key)) {
                customAnswers[field.key] = fieldValues[field.key] ?? '';
            }
        }

        let resumeFileRef: FileRefType | undefined;
        // If a resume file was selected, we'd upload it first and get back a FileReference.
        // For now we pass the reference if already available; file upload integration
        // depends on the upload service (see src/services/gql/upload.ts).
        // resumeFileRef = await uploadFile(resumeFile);

        await submitApplication({
            variables: {
                input: {
                    opportunityId: item.id,
                    applicationData: {
                        fullName: fieldValues['full_name'] ?? '',
                        email: fieldValues['email'] ?? '',
                        phoneNumber: fieldValues['phone'] || undefined,
                        coverLetter: fieldValues['cover_letter'] || undefined,
                        customAnswers: Object.keys(customAnswers).length > 0
                            ? JSON.stringify(customAnswers)
                            : undefined,
                    },
                    resumeFileRef,
                },
            },
        });

        setIsDialogOpen(false);
        setFieldValues({});
        setResumeFile(null);
        setAgreedToTerms(false);
    };

    const handleSaveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSaved) {
            if (!unsaving) unsaveOpportunity({ variables: { id: item.id } });
        } else {
            if (!saving) saveOpportunity({ variables: { id: item.id } });
        }
    };

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
                            <p className="text-[14px] text-text-secondary mt-1 line-clamp-1">
                                {t("posterBy", { user: posterName })}
                            </p>
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
                    <button
                        type="button"
                        onClick={handleSaveToggle}
                        disabled={saving || unsaving}
                        className="absolute top-4 right-12 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none hover:text-text-brand text-text-secondary"
                    >
                        <Bookmark className={`w-4 h-4 ${isSaved ? "fill-text-brand text-text-brand" : "text-text-secondary"}`} />
                        <span className="sr-only">{isSaved ? "Unsave" : "Save"}</span>
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            <DialogHeader className="text-left">
                                <div className="space-y-2">
                                    {item.location && !isUUID(item.location) && (
                                        <p className="text-text-secondary text-sm">{item.location}</p>
                                    )}
                                    <DialogTitle className="text-2xl font-bold text-text-primary">
                                        {item.title}
                                    </DialogTitle>
                                    <div className="flex items-center gap-1 text-text-secondary text-sm">
                                        <Clock className="w-4 h-4" />
                                        {formatOpportunityDate(item.createdAt)}
                                    </div>
                                </div>
                            </DialogHeader>

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
                            </div>

                            {/* Application Form — IN_PLATFORM_FORM only */}
                            {item.applicationMethod === "IN_PLATFORM_FORM" && !hasApplied && (
                                <section className="py-4" id="form-header">
                                    <p className="font-heading-xsmall text-lg font-semibold mb-1">Apply for this opportunity</p>
                                    <p className="text-sm text-text-secondary mb-4">
                                        <span className="text-red-500">*</span> Required fields
                                    </p>
                                    <form className="space-y-4" onSubmit={handleSubmit}>
                                        {displayFields.map(field => (
                                            <DynamicField
                                                key={field.key}
                                                field={field}
                                                value={fieldValues[field.key] ?? ''}
                                                onChange={(val) => handleFieldChange(field.key, val)}
                                                onFileChange={field.key === 'resume' ? setResumeFile : undefined}
                                            />
                                        ))}

                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="terms"
                                                checked={agreedToTerms}
                                                onCheckedChange={(v) => setAgreedToTerms(!!v)}
                                                className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-surface-brand data-[state=checked]:text-white"
                                            />
                                            <Label htmlFor="terms" className="text-text-primary text-sm">
                                                By using this form you agree with the storage and handling of your data by this website
                                            </Label>
                                        </div>

                                        <ButtonType2 type="submit" disabled={!agreedToTerms || submitting}>
                                            <span>{submitting ? "Submitting…" : "Submit Application"}</span>
                                        </ButtonType2>
                                    </form>
                                </section>
                            )}
                        </div>

                        {/* Right Column — Meta + Actions */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-6">
                                <div className="bg-surface-tertiary w-full rounded-lg p-4 border border-border-subtle space-y-4">
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
                                    </div>

                                    {/* How to apply info */}
                                    {item.applicationMethod === "EXTERNAL_LINK" && item.externalLink && (
                                        <div className="text-text-info bg-surface-info p-2 rounded-md text-sm">
                                            <p className="font-medium mb-1">How to apply:</p>
                                            <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="underline break-all">
                                                Apply externally
                                            </a>
                                        </div>
                                    )}
                                    {item.applicationMethod === "EMAIL_REQUEST" && item.applicationEmail && (
                                        <div className="text-text-info bg-surface-info p-2 rounded-md text-sm">
                                            <p className="font-medium mb-1">How to apply:</p>
                                            <a href={`mailto:${item.applicationEmail}`} className="underline break-all flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                                {item.applicationEmail}
                                            </a>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-2">
                                        {item.applicationMethod === "EXTERNAL_LINK" && item.externalLink && (
                                            <button
                                                type="button"
                                                className="w-full px-6 py-3 text-text-white bg-surface-brand font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full hover:opacity-90 transition-opacity"
                                                onClick={(e) => { e.stopPropagation(); window.open(item.externalLink!, "_blank"); }}
                                            >
                                                <span>Apply now</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        )}
                                        {item.applicationMethod === "EMAIL_REQUEST" && item.applicationEmail && (
                                            <a
                                                href={`mailto:${item.applicationEmail}`}
                                                className="w-full px-6 py-3 text-text-white bg-surface-brand font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full hover:opacity-90 transition-opacity"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span>Apply via email</span>
                                                <Mail className="w-4 h-4" />
                                            </a>
                                        )}
                                        {item.applicationMethod === "IN_PLATFORM_FORM" && !hasApplied && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); scrollToForm(); }}
                                                className="w-full px-6 py-3 bg-surface-brand text-text-white font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center rounded-full"
                                            >
                                                Apply now
                                            </button>
                                        )}
                                        {hasApplied && (
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-text-secondary text-center">You have already applied.</p>
                                                {applicationId && (
                                                    <button
                                                        type="button"
                                                        className="w-full px-6 py-3 text-text-danger border border-border-subtle font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full disabled:opacity-50 hover:bg-surface-danger transition-colors"
                                                        onClick={async (e) => { e.stopPropagation(); if (!withdrawing) await withdrawApplication({ variables: { id: applicationId } }); }}
                                                        disabled={withdrawing}
                                                    >
                                                        {withdrawing ? "Withdrawing…" : "Withdraw application"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

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
                </DialogContent>
            </Dialog>
        </>
    );
};
