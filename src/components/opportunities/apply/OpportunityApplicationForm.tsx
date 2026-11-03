'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GET_OPPORTUNITY, GET_USER_APPLICATIONS, SUBMIT_APPLICATION } from '@/services/gql/opportunities';
import { GET_UPLOAD_URL, type GetUploadUrlResponse } from '@/services/gql/upload';
import type { FileRefType, FormField, Opportunity, SubmitApplicationData } from '@/services/gql/types/opportunities';
import { useUserStore } from '@/store/useUserStore';

/**
 * Upload category for application documents (CV, cover letter, attachments). The backend
 * accepts `application_document` for applicant uploads so the poster may read them via a
 * signed link; it used to be 'chat', which the poster could not open. Change it here only.
 */
const APPLICATION_UPLOAD_CATEGORY = 'application_document';

const STANDARD_KEYS = new Set(['full_name', 'email', 'phone', 'cover_letter', 'resume']);
const standardFieldOrder = ['full_name', 'email', 'phone', 'cover_letter', 'resume'];

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

// ─── The form ─────────────────────────────────────────────────────────────────

/**
 * The in-platform application form (IN_PLATFORM_FORM listings): the listing's own
 * questions, standard ones first, prefilled from the signed-in user. Files are
 * uploaded privately first; the application carries only their object keys.
 */
export function OpportunityApplicationForm({ item }: { item: Opportunity }) {
    const t = useTranslations("home.opportunities");
    const user = useUserStore((state) => state.user);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    // Dynamic field values keyed by formField.key
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [filesByField, setFilesByField] = useState<Record<string, File | null>>({});
    const [submitApplication, { loading: submitting }] = useMutation<SubmitApplicationData>(SUBMIT_APPLICATION, {
        // The listing is refetched too, so a detail page switches to "You've applied".
        refetchQueries: [
            { query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } },
            { query: GET_OPPORTUNITY, variables: { id: item.id } },
        ],
    });
    const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);

    const formFields = useMemo(() => item.formFields ?? [], [item.formFields]);

    // Build a sorted list: standard fields first, then custom
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
                        category: APPLICATION_UPLOAD_CATEGORY,
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

            const result = await submitApplication({
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

            // errorPolicy 'all': a refusal resolves with data: null instead of throwing.
            if (!result?.data?.submitApplication) {
                toast.error(t("toasts.submitError"));
                return;
            }

            toast.success(t("toasts.submitSuccess"));
            setFieldValues({});
            setFilesByField({});
            setAgreedToTerms(false);
        } catch {
            toast.error(t("toasts.submitError"));
        }
    };

    return (
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
                        className="data-[state=checked]:border-border-brand data-[state=checked]:bg-surface-brand data-[state=checked]:text-white"
                    />
                    <Label htmlFor="terms" className="text-text-primary text-sm">
                        {t("labels.termsAgreement")}
                    </Label>
                </div>

                <ButtonType2 type="submit" disabled={!agreedToTerms || submitting}>
                    <span>{submitting ? t("labels.submitting") : t("labels.submitApplication")}</span>
                </ButtonType2>
            </form>
    );
}
