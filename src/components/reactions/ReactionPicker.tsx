'use client';

/**
 * ReactionPicker — the small popup of Happy / Hopeful / Sad that `ReactionButton`
 * opens. Loaded lazily (next/dynamic) the first time it is needed, so a feed of
 * fifty cards ships none of it until someone reaches for it.
 *
 * Portalled to <body> with fixed positioning: no card, `overflow-hidden` parent
 * or `.feed-card-cv` paint containment can clip it. It is placed above the
 * trigger, or below when there is no room.
 */

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
    REACTION_LABEL_KEY,
    REACTION_ORDER,
    reactionIcon,
    type ReactionKind,
} from '@/components/reactions/reactionAdapter';
import { REACTION_TONE } from '@/components/reactions/reactionTone';

interface ReactionPickerProps {
    anchorRef: RefObject<HTMLElement | null>;
    selected: ReactionKind | null;
    /** Option under the finger during a slide-to-select, if any. */
    hot: ReactionKind | null;
    /** Move focus into the popup on mount (keyboard opens only). */
    autoFocus: boolean;
    onChoose: (kind: ReactionKind) => void;
    onClose: (returnFocus: boolean) => void;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
}

const POPUP_W = 232;

export default function ReactionPicker({
    anchorRef,
    selected,
    hot,
    autoFocus,
    onChoose,
    onClose,
    onPointerEnter,
    onPointerLeave,
}: ReactionPickerProps) {
    const t = useTranslations('reactions');
    const popupRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

    const place = () => {
        const a = anchorRef.current?.getBoundingClientRect();
        if (!a) return;
        const vw = window.innerWidth;
        const left = Math.min(Math.max(8, a.left + a.width / 2 - POPUP_W / 2), Math.max(8, vw - POPUP_W - 8));
        if (a.top > 96) setPos({ left, bottom: window.innerHeight - a.top + 6 });
        else setPos({ left, top: a.bottom + 6 });
    };

    useLayoutEffect(place, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep it attached to its trigger while the feed scrolls or resizes.
    useEffect(() => {
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!autoFocus || !pos) return;
        const i = Math.max(0, selected ? REACTION_ORDER.indexOf(selected) : 0);
        optionRefs.current[i]?.focus();
    }, [autoFocus, pos]); // eslint-disable-line react-hooks/exhaustive-deps

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const idx = optionRefs.current.findIndex((el) => el === document.activeElement);
        const n = REACTION_ORDER.length;
        let next: number | null = null;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                next = (idx + 1) % n;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                next = (idx - 1 + n) % n;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = n - 1;
                break;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                onClose(true);
                return;
            case 'Tab':
                e.preventDefault();
                onClose(true);
                return;
            default:
                return;
        }
        e.preventDefault();
        optionRefs.current[next]?.focus();
    };

    if (!pos || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={popupRef}
            role="group"
            aria-label={t('choose')}
            data-testid="reaction-picker"
            onKeyDown={onKeyDown}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onContextMenu={(e) => e.preventDefault()}
            style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: POPUP_W }}
            className="z-[80] flex touch-none select-none items-stretch justify-between gap-1 rounded-2xl border border-border-subtle bg-surface-default p-1.5 shadow-lg [-webkit-touch-callout:none] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none!"
        >
            {REACTION_ORDER.map((kind, i) => {
                const on = selected === kind;
                const lit = on || hot === kind;
                const Icon = reactionIcon(kind, lit);
                const label = t(REACTION_LABEL_KEY[kind]);
                return (
                    <button
                        key={kind}
                        ref={(el) => {
                            optionRefs.current[i] = el;
                        }}
                        type="button"
                        data-reaction-option={kind}
                        aria-pressed={on}
                        aria-label={label}
                        onClick={() => onChoose(kind)}
                        className={`flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${
                            lit ? `${REACTION_TONE[kind]} bg-surface-subtle scale-110 motion-reduce:scale-100` : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                        }`}
                    >
                        <Icon className="size-6" aria-hidden />
                        <span className="max-w-full truncate text-[0.6875rem] leading-none" aria-hidden>
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>,
        document.body,
    );
}
