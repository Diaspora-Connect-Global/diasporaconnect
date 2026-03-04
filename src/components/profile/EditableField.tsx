'use client';

import { PencilSimpleIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { ButtonType3 } from '@/components/custom/button';

interface EditableFieldProps {
    title: string;
    data: string | undefined;
    onEdit: () => void;
    showEditButton?: boolean; 
}

export function EditableField({
    title,
    data,
    onEdit,
    showEditButton = true
}: EditableFieldProps) {
    const t = useTranslations('profile.personalDetails');
    
    return (
        <div className="flex justify-between items-start group">
            <div className="flex-1 min-w-0">
                <div className='flex  items-center'>
                    <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
                     {showEditButton && (
                    <ButtonType3
                        onClick={onEdit}
                        className="ml-4 p-1 text-text-tertiary hover:text-text-brand hover:bg-surface-hover rounded-md transition-colors border-0 bg-transparent min-w-0"
                        title={t('edit', { title })}
                    >
                        <PencilSimpleIcon size={32} className="w-3 h-3 text-text-primary" />

                    </ButtonType3>
)}
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
                    {data || t('notProvided')}
                </p>
            </div>
        </div>
    );
}