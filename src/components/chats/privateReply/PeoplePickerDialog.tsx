'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';

/** Scroll-from-bottom threshold (px) at which the next page is fetched. */
const LOAD_MORE_THRESHOLD_PX = 80;

export interface PickablePerson {
    userId: string;
    /** Already resolved, never an id. */
    name: string;
    avatarUrl?: string;
}

/**
 * Pick group members for a private reply. Real checkboxes with labels (keyboard
 * and screen-reader friendly), a search box, and the admin limit shown up front
 * — people past the limit can't be ticked rather than failing on save.
 */
export function PeoplePickerDialog({
    open,
    title,
    description,
    people,
    initialSelected,
    maxSelectable,
    limitMax,
    confirmLabel,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    onConfirm,
    onClose,
}: {
    open: boolean;
    title: string;
    description?: string;
    /** Candidates loaded so far (the current user and anyone who can't be picked already removed). */
    people: PickablePerson[];
    initialSelected: string[];
    /** How many may be ticked in total. */
    maxSelectable: number;
    /** The platform maximum to name in the "limit reached" message (it counts everyone, not just this pick). */
    limitMax: number;
    confirmLabel: string;
    /**
     * More candidates exist beyond `people` (the group has more members than
     * are currently loaded). When true, a "load more" control is shown —
     * reachable by scrolling the list or by keyboard/click on the button —
     * so every member of a large group stays reachable rather than only the
     * first page.
     */
    hasMore?: boolean;
    /** A page of more candidates is currently being fetched. */
    loadingMore?: boolean;
    /** Fetch the next page of candidates. Required whenever `hasMore` can be true. */
    onLoadMore?: () => void;
    onConfirm: (userIds: string[]) => void;
    onClose: () => void;
}) {
    const t = useTranslations('chat.group.privateReply');
    const searchId = useId();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string[]>(initialSelected);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (open) {
            setSelected(initialSelected);
            setQuery('');
        }
        // Reset only when the dialog opens; `initialSelected` is recreated by callers each render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const visible = useMemo(() => {
        const q = query.trim().toLocaleLowerCase();
        const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
        return q ? sorted.filter((p) => p.name.toLocaleLowerCase().includes(q)) : sorted;
    }, [people, query]);

    const atLimit = selected.length >= maxSelectable;
    const toggle = (userId: string) =>
        setSelected((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : prev.length >= maxSelectable
                  ? prev
                  : [...prev, userId],
        );

    // Infinite scroll: fetch the next page as the list nears its bottom. This
    // is purely an enhancement — the "load more" button below is the
    // keyboard- and screen-reader-reachable way to do the same thing, so
    // nobody depends on scroll gestures to reach every member.
    const handleScroll = () => {
        if (!hasMore || loadingMore || !onLoadMore) return;
        const el = listRef.current;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MORE_THRESHOLD_PX) onLoadMore();
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-md w-[90vw] max-h-[85dvh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>

                <label htmlFor={searchId} className="sr-only">
                    {t('searchPeople')}
                </label>
                <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('searchPeople')}
                    className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base md:text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                />

                <p className="text-xs text-text-secondary" aria-live="polite">
                    {t('selectedOf', { count: selected.length, max: maxSelectable })}
                </p>

                <ul
                    ref={listRef}
                    onScroll={handleScroll}
                    className="flex-1 min-h-0 overflow-y-auto space-y-1"
                    aria-label={title}
                >
                    {visible.length === 0 ? (
                        <li className="py-6 text-center text-sm text-text-secondary">
                            {t('noPeopleFound')}
                            {query.trim() && hasMore ? <> {t('searchLoadMoreHint')}</> : null}
                        </li>
                    ) : (
                        visible.map((person) => {
                            const checked = selected.includes(person.userId);
                            const disabled = !checked && atLimit;
                            const inputId = `${searchId}-${person.userId}`;
                            return (
                                <li key={person.userId}>
                                    <label
                                        htmlFor={inputId}
                                        className={`flex items-center gap-3 rounded-lg border p-2 ${
                                            checked ? 'border-surface-brand bg-surface-brand/10' : 'border-border-subtle'
                                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}`}
                                    >
                                        <Checkbox
                                            id={inputId}
                                            checked={checked}
                                            disabled={disabled}
                                            onCheckedChange={() => toggle(person.userId)}
                                        />
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={person.avatarUrl || undefined} alt="" />
                                            <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="flex-1 min-w-0 truncate text-sm text-text-primary">{person.name}</span>
                                    </label>
                                </li>
                            );
                        })
                    )}
                </ul>

                {hasMore ? (
                    <div className="flex justify-center pt-1" aria-live="polite">
                        <ButtonType1 onClick={() => onLoadMore?.()} disabled={loadingMore} className="text-xs py-1 px-3">
                            {loadingMore ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                    {t('loading')}
                                </span>
                            ) : (
                                t('loadMore')
                            )}
                        </ButtonType1>
                    </div>
                ) : null}

                {atLimit ? (
                    <p className="text-xs text-text-secondary" role="status">
                        {t('limitReached', { max: limitMax })}
                    </p>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                    <ButtonType1 onClick={onClose}>{t('cancel')}</ButtonType1>
                    <ButtonType2 onClick={() => onConfirm(selected)} disabled={selected.length === 0}>
                        {confirmLabel}
                    </ButtonType2>
                </div>
            </DialogContent>
        </Dialog>
    );
}
