'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { CountrySelect, } from '@/components/custom/input';

interface BioEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bio: string) => void;
    initialData: string;
}

export function HomeCountryEditModal({
    isOpen,
    onClose,
    onSave,
    initialData,
}: BioEditModalProps) {
    const [month, setMonth] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMonth(initialData);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (month.trim() === initialData.trim()) {
            onClose();
            return;
        }

        setIsLoading(true);
        try {
            await onSave(month.trim());
            onClose();
        } catch (error) {
            console.error('Failed to save bio:', error);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Home country</DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex flex-col space-y-4">
                    <div className="flex-shrink-0 " >

                        <CountrySelect
                            value={month}
                            onChange={setMonth}
                            label="Country"
                        />
                    </div>
                </div>

                <div className="flex-shrink-0 flex justify-end items-center space-x-3 pt-4 border-t border-border-subtle">
                    <ButtonType3
                        onClick={onClose}
                        className="px-6 py-2"
                        disabled={isLoading}
                    >
                        Cancel
                    </ButtonType3>
                    <ButtonType2
                        onClick={handleSave}
                        className="px-6 py-2"
                        disabled={!month.trim() || isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save'}
                    </ButtonType2>
                </div>
            </DialogContent>
        </Dialog>
    );
}