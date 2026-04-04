'use client';

import { ButtonType2 } from "@/components/custom/button";
import { TextInput } from "@/components/custom/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bookmark, Clock, ExternalLink, Mail, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
    SAVE_OPPORTUNITY,
    SUBMIT_APPLICATION,
    UNSAVE_OPPORTUNITY,
    GET_SAVED_OPPORTUNITIES,
    GET_USER_APPLICATIONS,
    WITHDRAW_APPLICATION,
    GET_OPPORTUNITY,
} from "@/services/gql/opportunities";
import { GET_UPLOAD_URL, type GetUploadUrlResponse } from "@/services/gql/upload";
import type {
    SaveOpportunityData,
    SubmitApplicationData,
    FormField,
    FileRefType,
} from "@/services/gql/types/opportunities";
import type { Opportunity } from "@/services/gql/types/opportunities";
import { formatChatTimestamp } from "@/macros/time";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";

const isUUID = (s?: string | null) =>
    !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const STANDARD_KEYS = new Set(['full_name', 'email', 'phone', 'cover_letter', 'resume']);

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
    if (!min && !max) return null;
    const fmt = (n: number) => n.toLocaleString();
    const cur = currency ?? '';
    const typeLabel = compensationType ? ` (${compensationType.replace(/_/g, ' ').toLowerCase()})` : '';
    if (min && max) return `${cur} ${fmt(min)} – ${fmt(max)}${typeLabel}`;
    if (min) return `${cur} ${fmt(min)}+${typeLabel}`;
    return `Up to ${cur} ${fmt(max!)}${typeLabel}`;
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

// ─── Dynamic form field renderer ─────────────────────────────────────────────

interface DynamicFieldProps {
    field: FormField;
    value: string;
    onChange: (val: string) => void;
    onFileChange?: (file: File | null) => void;
}

const isFileUploadType = (type?: string | null) => {
    if (!type) return false;
    const normalized = String(type).toLowerCase().replace(/-/g, '_');
    return normalized === 'file_upload' || normalized === 'file';
};

const isRadioType = (type?: string | null) => {
    if (!type) return false;
    const normalized = String(type).toLowerCase().replace(/-/g, '_');
    return normalized === 'radio';
};

const isSelectType = (type?: string | null) => {
    if (!type) return false;
    const normalized = String(type).toLowerCase().replace(/-/g, '_');
    return normalized === 'select';
};

const isCheckboxType = (type?: string | null) => {
    if (!type) return false;
    const normalized = String(type).toLowerCase().replace(/-/g, '_');
    return normalized === 'checkbox';
};

const isDateType = (type?: string | null) => {
    if (!type) return false;
    const normalized = String(type).toLowerCase().replace(/-/g, '_');
    return normalized === 'date';
};

const isNumberType = (type?: string | null) => {
    if (!type) return false;
    const normalized = String(type).toLowerCase().replace(/-/g, '_');
    return normalized === 'number';
};

const DynamicField = ({ field, value, onChange, onFileChange }: DynamicFieldProps) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const fieldWithOptions = field as FormField & { options?: string[] };

    if (isFileUploadType(field.type)) {
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

    if (isRadioType(field.type)) {
        const options = Array.isArray(fieldWithOptions.options)
            ? fieldWithOptions.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
            : [];

        if (options.length === 0) {
            return (
                <TextInput
                    id={field.key}
                    type="text"
                    value={value}
                    onChange={(val) => onChange(val)}
                    label={`${field.label} (missing radio options)`}
                    placeholder={field.label}
                    required={field.required}
                />
            );
        }

        return (
            <div>
                <Label>
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="mt-2 space-y-2">
                    {options.map((option, index) => (
                        <label key={`${field.key}-${option}-${index}`} className="flex items-center gap-2 text-sm text-text-primary">
                            <input
                                type="radio"
                                name={field.key}
                                value={option}
                                checked={value === option}
                                required={field.required && index === 0 && !value}
                                onChange={(e) => onChange(e.target.value)}
                            />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            </div>
        );
    }

    if (isSelectType(field.type)) {
        const options = Array.isArray(fieldWithOptions.options)
            ? fieldWithOptions.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
            : [];

        return (
            <div>
                <Label htmlFor={field.key}>
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <select
                    id={field.key}
                    value={value}
                    required={field.required}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border-default rounded-sm bg-surface-subtle text-text-primary text-sm"
                >
                    <option value="">Select an option</option>
                    {options.map((option, index) => (
                        <option key={`${field.key}-select-${option}-${index}`} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (isCheckboxType(field.type)) {
        const options = Array.isArray(fieldWithOptions.options)
            ? fieldWithOptions.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
            : [];

        if (options.length > 0) {
            let selectedValues: string[] = [];
            try {
                const parsed = JSON.parse(value || '[]');
                if (Array.isArray(parsed)) {
                    selectedValues = parsed.filter((v): v is string => typeof v === 'string');
                }
            } catch {
                selectedValues = [];
            }

            const handleToggleOption = (option: string, checked: boolean) => {
                const next = checked
                    ? Array.from(new Set([...selectedValues, option]))
                    : selectedValues.filter((v) => v !== option);
                onChange(JSON.stringify(next));
            };

            return (
                <div>
                    <Label>
                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <div className="mt-2 space-y-2">
                        {options.map((option, index) => (
                            <label key={`${field.key}-checkbox-${option}-${index}`} className="flex items-center gap-2 text-sm text-text-primary">
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option)}
                                    required={field.required && index === 0 && selectedValues.length === 0}
                                    onChange={(e) => handleToggleOption(option, e.target.checked)}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3">
                <input
                    id={field.key}
                    type="checkbox"
                    checked={value === 'true'}
                    required={field.required}
                    onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                />
                <Label htmlFor={field.key}>
                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            </div>
        );
    }

    return (
        <TextInput
            id={field.key}
            type={isDateType(field.type)
                ? 'date'
                : isNumberType(field.type)
                    ? 'number'
                    : field.type === 'email'
                        ? 'email'
                        : 'text'}
            value={value}
            onChange={(val) => onChange(val)}
            label={field.label}
            placeholder={field.label}
            required={field.required}
        />
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const CustomEmploymentComponent = ({ item, displayMode = 'card' }: OpportunityItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const t = useTranslations("home.opportunities");

    // Dynamic field values keyed by formField.key
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [filesByField, setFilesByField] = useState<Record<string, File | null>>({});
    const user = useUserStore((state) => state.user);

    const isSaved = savedOverride ?? !!item.isSavedByCurrentUser;
    const hasApplied = item.hasCurrentUserApplied ?? false;
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
    const [submitApplication, { loading: submitting }] = useMutation<SubmitApplicationData>(SUBMIT_APPLICATION, {
        refetchQueries: [{ query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } }],
    });
    const [withdrawApplication, { loading: withdrawing }] = useMutation(WITHDRAW_APPLICATION, {
        refetchQueries: [
            { query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } },
            { query: GET_OPPORTUNITY, variables: { id: item.id } },
        ],
    });
    const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);

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
            ]
    ), [orderedFields]);

    const fullNameField = useMemo(() => displayFields.find((f) => {
        const key = f.key.toLowerCase();
        const label = f.label.toLowerCase();
        return key === 'full_name' || key === 'fullname' || label === 'full name';
    }), [displayFields]);

    const emailField = useMemo(() => displayFields.find((f) => {
        const key = f.key.toLowerCase();
        const label = f.label.toLowerCase();
        return key === 'email' || label.includes('email');
    }), [displayFields]);

    const phoneField = useMemo(() => displayFields.find((f) => {
        const key = f.key.toLowerCase();
        const label = f.label.toLowerCase();
        return key === 'phone'
            || key === 'phone_number'
            || key === 'phonenumber'
            || key === 'phoneNumber'.toLowerCase()
            || label.includes('phone');
    }), [displayFields]);

    const coverLetterField = useMemo(() => displayFields.find((f) => {
        const key = f.key.toLowerCase();
        const label = f.label.toLowerCase();
        return key === 'cover_letter'
            || key === 'coverletter'
            || key === 'motivation_letter'
            || label.includes('cover letter')
            || label.includes('motivation');
    }), [displayFields]);

    useEffect(() => {
        if (item.applicationMethod !== 'IN_PLATFORM_FORM' || !user) return;

        const fullName = [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();

        const typedUser = user as typeof user & { phoneNumber?: string | null; phone_number?: string | null; mobile?: string | null };
        const userPhone = typedUser.phone
            || typedUser.phoneNumber
            || typedUser.phone_number
            || typedUser.mobile
            || '';

        setFieldValues((prev) => {
            const next = { ...prev };
            let changed = false;

            const fullNameTargets = displayFields
                .filter((f) => {
                    const key = f.key.toLowerCase();
                    const label = f.label.toLowerCase();
                    return key === 'full_name' || key === 'fullname' || key === 'fullName'.toLowerCase() || label.includes('full name');
                })
                .map((f) => f.key);

            const emailTargets = displayFields
                .filter((f) => {
                    const key = f.key.toLowerCase();
                    const label = f.label.toLowerCase();
                    return key === 'email' || label.includes('email');
                })
                .map((f) => f.key);

            const phoneTargets = displayFields
                .filter((f) => {
                    const key = f.key.toLowerCase();
                    const label = f.label.toLowerCase();
                    return key === 'phone' || key === 'phone_number' || key === 'phonenumber' || label.includes('phone');
                })
                .map((f) => f.key);

            if (fullNameField && !next[fullNameField.key] && fullName) {
                next[fullNameField.key] = fullName;
                changed = true;
            }
            if (emailField && !next[emailField.key] && user.email) {
                next[emailField.key] = user.email;
                changed = true;
            }
            if (phoneField && !next[phoneField.key] && userPhone) {
                next[phoneField.key] = userPhone;
                changed = true;
            }

            for (const key of fullNameTargets) {
                if (!next[key] && fullName) {
                    next[key] = fullName;
                    changed = true;
                }
            }
            for (const key of emailTargets) {
                if (!next[key] && user.email) {
                    next[key] = user.email;
                    changed = true;
                }
            }
            for (const key of phoneTargets) {
                if (!next[key] && userPhone) {
                    next[key] = userPhone;
                    changed = true;
                }
            }

            if (!next['full_name'] && fullName) {
                next['full_name'] = fullName;
                changed = true;
            }
            if (!next['email'] && user.email) {
                next['email'] = user.email;
                changed = true;
            }
            if (!next['phone'] && userPhone) {
                next['phone'] = userPhone;
                changed = true;
            }

            return changed ? next : prev;
        });
    }, [item.applicationMethod, user, fullNameField, emailField, phoneField, displayFields]);

    const handleFieldChange = (key: string, val: string) => {
        setFieldValues(prev => ({ ...prev, [key]: val }));
    };

    const scrollToForm = () => {
        document.getElementById('form-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms || submitting) return;

        const requiredFileFields = displayFields.filter((field) => isFileUploadType(field.type) && field.required);
        const missingRequiredFileField = requiredFileFields.find((field) => !filesByField[field.key]);
        if (missingRequiredFileField) {
            toast.error(t("toasts.requiredFileMissing", { field: missingRequiredFileField.label }));
            return;
        }

        // Separate standard vs custom answers
        const customAnswers: Record<string, string> = {};
        for (const field of formFields) {
            if (!STANDARD_KEYS.has(field.key)) {
                customAnswers[field.key] = fieldValues[field.key] ?? '';
            }
        }

        try {
            let resumeFileRef: FileRefType | undefined;

            // Upload all file fields first
            const uploadedFileRefs: Record<string, FileRefType> = {};
            const fileEntries = Object.entries(filesByField).filter(([, file]) => !!file) as Array<[string, File]>;

            for (const [fieldKey, file] of fileEntries) {
                const contentType = file.type || 'application/octet-stream';
                const { data: uploadData } = await getUploadUrl({
                    variables: {
                        contentType,
                        category: 'chat',
                    },
                });

                if (!uploadData?.getUploadUrl?.uploadUrl || !uploadData.getUploadUrl.objectKey) {
                    throw new Error('Failed to get upload URL');
                }

                const uploadRes = await fetch(uploadData.getUploadUrl.uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': contentType,
                    },
                });

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload resume file');
                }

                uploadedFileRefs[fieldKey] = {
                    path: uploadData.getUploadUrl.objectKey,
                    filename: file.name,
                    mimeType: contentType,
                    sizeBytes: file.size,
                };
            }

            // `resume` remains first-class backend field
            if (uploadedFileRefs.resume) {
                resumeFileRef = uploadedFileRefs.resume;
            }

            // Other file uploads are passed inside customAnswers as object key paths
            for (const [fieldKey, fileRef] of Object.entries(uploadedFileRefs)) {
                if (fieldKey === 'resume') continue;
                customAnswers[fieldKey] = fileRef.path;
            }

            await submitApplication({
                variables: {
                    input: {
                        opportunityId: item.id,
                        applicationData: {
                            fullName: (fullNameField ? fieldValues[fullNameField.key] : fieldValues['full_name']) ?? '',
                            email: (emailField ? fieldValues[emailField.key] : fieldValues['email']) ?? '',
                            phoneNumber: (phoneField ? fieldValues[phoneField.key] : fieldValues['phone']) || undefined,
                            coverLetter: (coverLetterField ? fieldValues[coverLetterField.key] : fieldValues['cover_letter']) || undefined,
                            customAnswers: Object.keys(customAnswers).length > 0
                                ? JSON.stringify(customAnswers)
                                : undefined,
                        },
                        resumeFileRef,
                    },
                },
            });

            toast.success(t("toasts.submitSuccess"));
            setIsDialogOpen(false);
            setFieldValues({});
            setFilesByField({});
            setAgreedToTerms(false);
        } catch {
            toast.error(t("toasts.submitError"));
        }
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
                    {isInPlatformFormMethod && !hasApplied && (
                        <section className="py-4" id="form-header">
                            <p className="font-heading-xsmall text-lg font-semibold mb-1">{t("labels.applyForOpportunity")}</p>
                            <p className="text-sm text-text-secondary mb-4">
                                <span className="text-red-500">*</span> {t("labels.requiredFieldsHint")}
                            </p>
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {displayFields.map(field => (
                                    <DynamicField
                                        key={field.key}
                                        field={field}
                                        value={fieldValues[field.key] ?? ''}
                                        onChange={(val) => handleFieldChange(field.key, val)}
                                        onFileChange={isFileUploadType(field.type)
                                            ? (file) => setFilesByField((prev) => ({ ...prev, [field.key]: file }))
                                            : undefined}
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
                                        {t("labels.termsAgreement")}
                                    </Label>
                                </div>

                                <ButtonType2 type="submit" disabled={!agreedToTerms || submitting}>
                                    <span>{submitting ? t("labels.submitting") : t("labels.submitApplication")}</span>
                                </ButtonType2>
                            </form>
                        </section>
                    )}
                </div>

                {/* Right Column — Meta + Actions */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 space-y-6 mt-12">
                        <div className="bg-surface-tertiary w-full rounded-lg p-4 border border-border-subtle space-y-4">
                            {/* Action buttons */}
                            <div className="flex flex-col gap-2">
                                {isExternalLinkMethod && item.externalLink && (
                                    <button
                                        type="button"
                                        className="w-full px-6 py-3 text-text-white bg-surface-brand font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full hover:opacity-90 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); window.open(item.externalLink!, "_blank", "noopener,noreferrer"); }}
                                    >
                                        <span>{t("labels.applyNow")}</span>
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                )}
                                {isEmailRequestMethod && item.applicationEmail && (
                                    <a
                                        href={`mailto:${item.applicationEmail}`}
                                        className="w-full px-6 py-3 text-text-white bg-surface-brand font-medium cursor-pointer flex items-center justify-center gap-2 rounded-full hover:opacity-90 transition-opacity"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span>{t("labels.applyViaEmail")}</span>
                                        <Mail className="w-4 h-4" />
                                    </a>
                                )}
                                {isInPlatformFormMethod && !hasApplied && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); scrollToForm(); }}
                                        className="w-full px-6 py-3 bg-surface-brand text-text-white font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center rounded-full"
                                    >
                                        {t("labels.applyNow")}
                                    </button>
                                )}
                                {hasApplied && (
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
                                                        await withdrawApplication({ variables: { applicationId } });
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
                    <DialogTitle className="sr-only">{item.title || 'Opportunity details'}</DialogTitle>
                    {detailContent}
                </DialogContent>
            </Dialog>
        </>
    );
};
