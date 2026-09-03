'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ButtonType3 } from '../custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';

interface PendingRequestCardProps {
    /** Display name of the community/association the request targets. */
    name: string;
    avatarUrl?: string | null;
    /** Link to the entity detail page (e.g. `/community/:id`). */
    href: string;
    /** i18n label for the "Pending" status badge. */
    pendingLabel: string;
    /** i18n label for the cancel action / confirm button. */
    cancelLabel: string;
    /** i18n title + body for the cancel confirmation dialog. */
    confirmTitle: string;
    confirmDescription: string;
    /** Withdraw the request. May be async; the card shows a loading state. */
    onCancel: () => Promise<void> | void;
    cancelling?: boolean;
}

/**
 * Compact row for a community/association the viewer has requested to join and
 * is awaiting approval on. Shows the entity, a "Pending" badge, and a guarded
 * "Cancel request" action. Deliberately entity-agnostic (labels are passed in)
 * so the same card serves both the community and association listing pages.
 */
export function PendingRequestCard({
    name,
    avatarUrl,
    href,
    pendingLabel,
    cancelLabel,
    confirmTitle,
    confirmDescription,
    onCancel,
    cancelling = false,
}: PendingRequestCardProps) {
    const router = useRouter();
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <div className="flex items-center justify-between gap-2 border-b py-3 px-2 last:border-b-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Image
                    width={40}
                    height={40}
                    src={avatarUrl || '/GLOBE.png'}
                    alt={name}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-border-subtle flex-shrink-0"
                />
                <div className="min-w-0">
                    <p
                        className="text-text-primary label-large text-sm sm:text-base truncate cursor-pointer hover:text-text-brand"
                        onClick={() => router.push(href)}
                    >
                        {name}
                    </p>
                    <span className="inline-flex items-center mt-1 text-[0.6875rem] px-2 py-0.5 rounded-full bg-surface-warning text-text-on-warning border border-transparent">
                        {pendingLabel}
                    </span>
                </div>
            </div>

            <ButtonType3
                onClick={() => setConfirmOpen(true)}
                disabled={cancelling}
                className="text-text-danger flex-shrink-0"
            >
                {cancelLabel}
            </ButtonType3>

            <ConfirmationModal
                open={confirmOpen}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={async () => {
                    await onCancel();
                    setConfirmOpen(false);
                }}
                title={confirmTitle}
                description={confirmDescription}
                confirmText={cancelLabel}
                confirmVariant="destructive"
                isLoading={cancelling}
            />
        </div>
    );
}
