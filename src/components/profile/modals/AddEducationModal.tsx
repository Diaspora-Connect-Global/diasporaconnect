'use client';
import { useState, useEffect } from 'react';
import CustomDialog from '@/components/custom/customDialog';
import { MonthSelect, TextArea, TextInput } from '@/components/custom/input';
import { LabelLarge } from '@/components/utils';
import { useTranslations } from 'next-intl';

interface Education {
    id?: string;
    institution: string;
    program: string;
    degree: string;
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    activities: string;
    isCurrent?: boolean;
}

interface AddEducationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Education | null;
    onSaveSuccess?: () => void;
}

export function AddEducationModal({
    isOpen,
    onClose,
    initialData = null,
    onSaveSuccess,
}: AddEducationModalProps) {
    const t = useTranslations('profile.education');
    const [form, setForm] = useState<Omit<Education, 'id'>>({
        institution: '',
        program: '',
        degree: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        activities: '',
        isCurrent: false,
    });

    const [isLoading, setIsLoading] = useState(false);

    // Sync form with initialData when modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            const { ...data } = initialData;
            setForm(data);
        } else if (isOpen) {
            setForm({
                institution: '',
                program: '',
                degree: '',
                startMonth: '',
                startYear: '',
                endMonth: '',
                endYear: '',
                activities: '',
                isCurrent: false,
            });
        }
    }, [isOpen, initialData]);

    const updateForm = <K extends keyof typeof form>(
        key: K,
        value: (typeof form)[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 800));
            console.log('Saving education:', form);
            onSaveSuccess?.();
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Validation: Save button disabled if required fields are empty
    const isSaveDisabled =
        isLoading ||
        !form.institution.trim() ||
        !form.degree.trim() ||
        !form.program.trim() ||
        !form.startMonth ||
        !form.startYear ||
        (!form.isCurrent && (!form.endMonth || !form.endYear));

    return (
        <CustomDialog
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title={initialData ? t('editEducation') : t('addEducation')}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
            disabled={isSaveDisabled}
            saveText={t('save')}
            cancelText={t('cancel')}
        >
                <div className="space-y-5">
                    <TextInput
                        label={t('institution')}
                        placeholder={t('institutionPlaceholder')}
                        value={form.institution}
                        onChange={(v) => updateForm('institution', v)}
                    />
                    <TextInput
                        label={t('degree')}
                        placeholder={t('degreePlaceholder')}
                        value={form.degree}
                        onChange={(v) => updateForm('degree', v)}
                    />
                    <TextInput
                        label={t('program')}
                        placeholder={t('programPlaceholder')}
                        value={form.program}
                        onChange={(v) => updateForm('program', v)}
                    />

                    <div className={form.isCurrent ? '' : 'grid lg:grid-cols-2 gap-6'}>
                        <div>
                            <LabelLarge>{t('startDate')}</LabelLarge>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <MonthSelect
                                    value={form.startMonth}
                                    onChange={(v) => updateForm('startMonth', v)}
                                />
                                <TextInput
                                    label={t('year')}
                                    placeholder={t('yearPlaceholder')}
                                    value={form.startYear}
                                    onChange={(v) => updateForm('startYear', v)}
                                />
                            </div>
                        </div>

                        {!form.isCurrent && (
                            <div>
                                <LabelLarge>{t('expectedCompletion')}</LabelLarge>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <MonthSelect
                                        value={form.endMonth}
                                        onChange={(v) => updateForm('endMonth', v)}
                                    />
                                    <TextInput
                                        label={t('year')}
                                        placeholder={t('endYearPlaceholder')}
                                        value={form.endYear}
                                        onChange={(v) => updateForm('endYear', v)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 my-4">
                        <input
                            type="checkbox"
                            checked={form.isCurrent || false}
                            onChange={(e) => updateForm('isCurrent', e.target.checked)}
                            className="w-4 h-4 text-text-brand rounded"
                        />
                        <span className="text-sm">{t('currentlyStudyHere')}</span>
                    </div>

                    <TextArea
                        label={t('activities')}
                        placeholder={t('activitiesPlaceholder')}
                        value={form.activities}
                        onChange={(v) => updateForm('activities', v)}
                        maxLength={500}
                        rows={5}
                    />
                </div>
        </CustomDialog>
    );
}