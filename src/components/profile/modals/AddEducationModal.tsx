'use client';
import { useState, useEffect } from 'react';
import CustomDialog from '@/components/custom/customDialog';
import { MonthSelect, TextArea, TextInput } from '@/components/custom/input';
import { LabelLarge } from '@/components/utils';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import {
  ADD_EDUCATION,
  UPDATE_EDUCATION,
  type AddEducationResponse,
  type UpdateEducationResponse
} from '@/services/gql/education';

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
    const tActions = useTranslations('actions');
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

    const isEditMode = !!initialData?.id;

    // GraphQL Mutations
    const [addEducation, { loading: addLoading }] = useMutation<AddEducationResponse>(
        ADD_EDUCATION,
        {
            onCompleted: (data) => {
                if (data.addEducation.success) {
                    onSaveSuccess?.();
                    onClose();
                } else {
                    alert(data.addEducation.message || 'Failed to add education');
                }
            },
            onError: (error) => {
                console.error('Error adding education:', error);
                alert('Failed to add education. Please try again.');
            }
        }
    );

    const [updateEducation, { loading: updateLoading }] = useMutation<UpdateEducationResponse>(
        UPDATE_EDUCATION,
        {
            onCompleted: (data) => {
                if (data.updateEducation.success) {
                    onSaveSuccess?.();
                    onClose();
                } else {
                    alert(data.updateEducation.message || 'Failed to update education');
                }
            },
            onError: (error) => {
                console.error('Error updating education:', error);
                alert('Failed to update education. Please try again.');
            }
        }
    );

    const isLoading = addLoading || updateLoading;

    // Sync form with initialData when modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            const { id, ...data } = initialData;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const updateForm = <K extends keyof typeof form>(
        key: K,
        value: (typeof form)[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            // Validate required fields
            if (!form.institution.trim() || !form.degree.trim() || !form.program.trim() || 
                !form.startMonth || !form.startYear) {
                alert('Please fill in all required fields');
                return;
            }

            if (!form.isCurrent && (!form.endMonth || !form.endYear)) {
                alert('Please provide an end date or mark as current');
                return;
            }

            // Format dates to ISO string
            const startDate = `${form.startYear}-${form.startMonth.padStart(2, '0')}-01`;
            const endDate = form.isCurrent 
                ? null 
                : form.endYear && form.endMonth 
                    ? `${form.endYear}-${form.endMonth.padStart(2, '0')}-01`
                    : null;

            // Parse activities into array (split by newlines)
            const activitiesArray = form.activities
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (isEditMode && initialData?.id) {
                // Update existing education
                await updateEducation({
                    variables: {
                        input: {
                            educationId: initialData.id,
                            institution: form.institution.trim(),
                            degree: form.degree.trim(),
                            fieldOfStudy: form.program.trim(),
                            startDate,
                            endDate,
                            current: form.isCurrent,
                            activities: activitiesArray.length > 0 ? activitiesArray : undefined
                        }
                    }
                });
            } else {
                // Add new education
                await addEducation({
                    variables: {
                        input: {
                            institution: form.institution.trim(),
                            degree: form.degree.trim(),
                            fieldOfStudy: form.program.trim(),
                            startDate,
                            endDate,
                            current: form.isCurrent,
                            activities: activitiesArray.length > 0 ? activitiesArray : undefined
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
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
            title={isEditMode ? t('editEducation') : t('addEducation')}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
            disabled={isSaveDisabled}
            saveText={tActions('save')}
            cancelText={tActions('cancel')}
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