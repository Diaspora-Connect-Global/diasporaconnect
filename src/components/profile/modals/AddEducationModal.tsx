
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { MonthSelect, TextArea, TextInput } from '@/components/custom/input';
import { LabelLarge } from '@/components/utils';

interface EducationExperience {
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
    initialData?: Partial<EducationExperience>;
}

export function AddEducationModal({
    isOpen,
    onClose,
    initialData = {},
}: AddEducationModalProps) {
    const [form, setForm] = useState<EducationExperience>({
        institution: '',
        activities: '',
        degree :"",
        endMonth :"",
        endYear:"",
        isCurrent:false,
        program :"",
        startMonth :"",
        startYear:"",
        ...initialData,
    });

    const [isLoading, setIsLoading] = useState(false);
  

    useEffect(() => {
        if (isOpen) {
            setForm({
                 institution: '',
        activities: '',
        degree :"",
        endMonth :"",
        endYear:"",
        isCurrent:false,
        program :"",
        startMonth :"",
        startYear:"",
                ...initialData,
            });
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 800));
            onClose();
        } catch (error) {
            console.error('Failed to save experience:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateForm = (key: keyof EducationExperience, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className=" min-w-[60vw] max-h-[90vh] flex flex-col p-0 overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* Sticky Header */}
                <DialogHeader className="p-6 pb-4 border-b border-border-subtle sticky top-0 bg-background z-10">
                    <DialogTitle className="text-xl font-semibold">
                        Add Education
                    </DialogTitle>
                </DialogHeader>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-5">
                        <TextInput
                            label="Institution"
                            placeholder="e.g. Google, Microsoft"
                            value={form.institution}
                            onChange={(v) => updateForm('institution', v)}
                        />
                        <TextInput
                            label="Degree"
                            placeholder="e.g. Senior Frontend Engineer"
                            value={form.degree}
                            onChange={(v) => updateForm('degree', v)}
                        />


                        {/* Employment Type */}
                        <TextInput
                            label="Program"
                            placeholder="Full-time, Part-time, Contract, Internship"
                            value={form.program}
                            onChange={(v) => updateForm('program', v)}
                        />

                        <div className={`${form.isCurrent ? "" : "grid lg:grid-cols-2 gap-6"} `}>
                            {/* Start Date */}
                            <div>
                                <LabelLarge>Start Date</LabelLarge>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <MonthSelect
                                        value={form.startMonth}
                                        onChange={(v) => updateForm('startMonth', v)}
                                        label="Month"
                                    />
                                    <TextInput
                                        label="Year"
                                        placeholder="2024"
                                        value={form.startYear}
                                        onChange={(v) => updateForm('startYear', v)}
                                    />
                                </div>
                            </div>



                            {/* End Date */}
                            <div className={`${form.isCurrent ? "hidden" : ""}`}>
                                <LabelLarge>Expected completion Date</LabelLarge>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <MonthSelect
                                        value={form.endMonth}
                                        onChange={(v) => updateForm('endMonth', v)}
                                        label="Month"
                                    />
                                    <TextInput
                                        label="Year"
                                        placeholder="Present"
                                        value={form.isCurrent ? 'Present' : form.endYear}
                                        onChange={(v) => updateForm('endYear', v)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 my-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isCurrent}
                                onChange={(e) => updateForm('isCurrent', e.target.checked)}
                                className="w-4 h-4 text-text-brand rounded"
                            />
                            <span className="text-sm">I currently school here</span>
                        </label>
                    </div>

                    {/* Description */}
                    <TextArea
                        label="Activities"
                        placeholder="What did you do? Technologies used? Achievements?"
                        value={form.activities}
                        onChange={(v) => updateForm('activities', v)}
                        maxLength={500}
                        rows={5}
                    />


                </div>

                {/* Sticky Footer */}
                <div className="flex justify-end items-center gap-3 p-6 pt-4 border-t border-border-subtle bg-background sticky bottom-0 z-10">
                    <ButtonType3 onClick={onClose} disabled={isLoading}>
                        Cancel
                    </ButtonType3>
                    <ButtonType2
                        onClick={handleSave}
                        disabled={
                            isLoading ||
                            !form.activities.trim() ||
                            !form.degree.trim() ||
                            !form.startMonth ||
                            !form.startYear
                        }
                    >
                        {isLoading ? 'Saving...' : 'Save'}
                    </ButtonType2>
                </div>
            </DialogContent>
        </Dialog>
    );
}