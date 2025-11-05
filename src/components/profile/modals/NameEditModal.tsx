'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';

interface NameEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bio: string) => void;
    initialData: string;
}

export function NameEditModal({
    isOpen,
    onClose,
    onSave,
    initialData,
}: NameEditModalProps) {
    const [bio, setBio] = useState(initialData);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setBio(initialData);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (bio.trim() === initialData.trim()) {
            onClose();
            return;
        }

        setIsLoading(true);
        try {
            await onSave(bio.trim());
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
                    <DialogTitle>Full Name</DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex flex-col space-y-4">
                    <div className="flex-shrink-0">
                        <TextInput
                            label='First Name'
                            placeholder='Enter first name'
                            value={'name'}
                            onChange={function (): void {
                                throw new Error('Function not implemented.');
                            }}
                        />
                        <TextInput
                            label='Middle Name'
                            placeholder='Enter middle name'
                            value={'name'}
                            onChange={function (): void {
                                throw new Error('Function not implemented.');
                            }}
                        />
                        <TextInput
                            label='Last Name'
                            placeholder='Enter last name'
                            value={'name'}
                            onChange={function (): void {
                                throw new Error('Function not implemented.');
                            }}
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
                        disabled={!bio.trim() || isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save'}
                    </ButtonType2>
                </div>
            </DialogContent>
        </Dialog>
    );
}