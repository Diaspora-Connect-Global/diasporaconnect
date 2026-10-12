'use client';

/**
 * ReactionButton — THE one reaction control on every post surface.
 *
 * A single button in the action bar (beside Comment and Share) that shows the
 * viewer's current reaction (icon + label, coloured) or the neutral "React".
 *
 *  - Click / tap / Enter / Space  : toggles the default reaction (Happy, which IS
 *                                   the Like); a different reaction → removes it.
 *  - Desktop hover (~300 ms)      : opens the picker (Happy · Hopeful · Sad) above
 *                                   the button; a short grace delay lets the
 *                                   pointer travel into it.
 *  - Touch press-and-hold (~450ms): opens the same picker; lift over an option to
 *                                   choose it (slide-to-select), or lift anywhere
 *                                   and tap one.
 *  - Keyboard                     : ArrowUp opens and focuses the picker; arrows
 *                                   move, Enter/Space chooses, Escape closes and
 *                                   focus returns here.
 *
 * Presentational and controlled: callers keep their own optimistic update +
 * rollback; `onSelect(kind | null)` is the same callback the old rail used.
 *
 * Touch long-press traps handled: `pointercancel` (the browser deciding a scroll
 * started) ends the gesture without choosing; `touch-action: manipulation` keeps
 * vertical page scrolling working when the finger swipes over the button without
 * holding; once the hold fires, touchmove is cancelled so the page does not pan
 * mid-selection; the context menu, text selection and iOS callout are suppressed.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
    DEFAULT_REACTION,
    REACTION_LABEL_KEY,
    reactionIcon,
    type ReactionKind,
} from '@/components/reactions/reactionAdapter';
import { REACTION_TONE } from '@/components/reactions/reactionTone';

const loadPicker = () => import('@/components/reactions/ReactionPicker');
const ReactionPicker = dynamic(loadPicker, { ssr: false, loading: () => null });

const HOVER_OPEN_MS = 300;
const HOVER_CLOSE_MS = 250;
const HOLD_MS = 450;
const HOLD_MOVE_CANCEL_PX = 10;

interface ReactionButtonProps {
    selected: ReactionKind | null;
    /** `null` clears the reaction. */
    onSelect: (kind: ReactionKind | null) => void;
    /** `card` matches the Comment / Share buttons; `compact` is for dense preview rows. */
    variant?: 'card' | 'compact';
    className?: string;
}

function ReactionButtonInner({ selected, onSelect, variant = 'card', className }: ReactionButtonProps) {
    const t = useTranslations('reactions');
    const [open, setOpen] = useState(false);
    const [kbd, setKbd] = useState(false);
    const [hot, setHot] = useState<ReactionKind | null>(null);

    const wrapRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const openTimer = useRef<number | null>(null);
    const closeTimer = useRef<number | null>(null);
    const holdTimer = useRef<number | null>(null);
    const origin = useRef<{ x: number; y: number } | null>(null);
    const sliding = useRef(false);
    const suppressClick = useRef(false);
    const hotRef = useRef<ReactionKind | null>(null);

    const clear = (r: { current: number | null }) => {
        if (r.current !== null) {
            window.clearTimeout(r.current);
            r.current = null;
        }
    };

    const blockTouchMove = useCallback((e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
    }, []);
    const endSlide = useCallback(() => {
        sliding.current = false;
        document.removeEventListener('touchmove', blockTouchMove);
        hotRef.current = null;
        setHot(null);
    }, [blockTouchMove]);

    const openPicker = useCallback((viaKeyboard = false) => {
        clear(closeTimer);
        clear(openTimer);
        setKbd(viaKeyboard);
        setOpen(true);
    }, []);

    const closePicker = useCallback((returnFocus = false) => {
        clear(openTimer);
        clear(closeTimer);
        setOpen(false);
        setKbd(false);
        if (returnFocus) triggerRef.current?.focus();
    }, []);

    useEffect(
        () => () => {
            clear(openTimer);
            clear(closeTimer);
            clear(holdTimer);
            document.removeEventListener('touchmove', blockTouchMove);
        },
        [blockTouchMove],
    );

    // Dismiss on outside press and on Escape (covers a hover-opened picker, where
    // focus is still on the trigger rather than inside the popup).
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            const el = e.target as Element | null;
            if (wrapRef.current?.contains(el) || el?.closest('[data-testid="reaction-picker"]')) return;
            closePicker(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePicker(true);
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, closePicker]);

    const choose = (kind: ReactionKind) => {
        onSelect(selected === kind ? null : kind);
        closePicker(kbd);
    };

    /* ---------------- mouse hover ---------------- */
    const onWrapEnter = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        void loadPicker();
        clear(closeTimer);
        if (!open && openTimer.current === null) {
            openTimer.current = window.setTimeout(() => {
                openTimer.current = null;
                openPicker(false);
            }, HOVER_OPEN_MS);
        }
    };
    const scheduleClose = () => {
        clear(openTimer);
        if (!open || kbd) return;
        clear(closeTimer);
        closeTimer.current = window.setTimeout(() => closePicker(false), HOVER_CLOSE_MS);
    };
    const onWrapLeave = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') scheduleClose();
    };

    /* ---------------- touch / pen press-and-hold ---------------- */
    const onPointerDown = (e: React.PointerEvent) => {
        suppressClick.current = false;
        if (e.pointerType === 'mouse') return;
        void loadPicker();
        origin.current = { x: e.clientX, y: e.clientY };
        clear(holdTimer);
        holdTimer.current = window.setTimeout(() => {
            holdTimer.current = null;
            suppressClick.current = true;
            sliding.current = true;
            document.addEventListener('touchmove', blockTouchMove, { passive: false });
            openPicker(false);
        }, HOLD_MS);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (holdTimer.current !== null && origin.current) {
            if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > HOLD_MOVE_CANCEL_PX) clear(holdTimer);
            return;
        }
        if (!sliding.current) return;
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-reaction-option]');
        const kind = (hit?.getAttribute('data-reaction-option') as ReactionKind | null) ?? null;
        if (kind !== hotRef.current) {
            hotRef.current = kind;
            setHot(kind);
        }
    };
    const onPointerUp = () => {
        clear(holdTimer);
        if (!sliding.current) return;
        const kind = hotRef.current;
        endSlide();
        if (kind) choose(kind);
    };
    const onPointerCancel = () => {
        // The browser took the gesture (scroll). Never choose; keep the picker if it opened.
        clear(holdTimer);
        endSlide();
    };

    /* ---------------- click + keyboard ---------------- */
    const onClick = () => {
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        onSelect(selected ? null : DEFAULT_REACTION);
        closePicker(false);
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            void loadPicker();
            openPicker(true);
        }
    };

    const Icon = reactionIcon(selected ?? DEFAULT_REACTION, selected !== null);
    const label = selected ? t(REACTION_LABEL_KEY[selected]) : t('react');
    const tone = selected ? REACTION_TONE[selected] : 'text-text-secondary hover:text-text-primary';
    const compact = variant === 'compact';

    return (
        <div
            ref={wrapRef}
            className={`relative inline-flex items-center ${className ?? ''}`}
            onPointerEnter={onWrapEnter}
            onPointerLeave={onWrapLeave}
        >
            <button
                ref={triggerRef}
                type="button"
                data-testid="reaction-button"
                data-reaction={selected ?? 'NONE'}
                aria-haspopup="true"
                aria-expanded={open}
                aria-pressed={selected !== null}
                aria-label={selected ? t('yourReaction', { reaction: label }) : label}
                onClick={onClick}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                className={`inline-flex min-h-6 touch-manipulation select-none items-center rounded-md [-webkit-touch-callout:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${tone} ${
                    compact
                        ? 'gap-1 text-xs'
                        : 'flex-row gap-[0.5rem] text-sm body-small min-w-[3.75rem] max-lg:flex-col max-lg:gap-[0.25rem] max-lg:min-w-0'
                }`}
            >
                <Icon className={compact ? 'size-4' : 'size-[1.25rem]'} aria-hidden />
                <span aria-hidden>{label}</span>
            </button>
            {open && (
                <ReactionPicker
                    anchorRef={wrapRef}
                    selected={selected}
                    hot={hot}
                    autoFocus={kbd}
                    onChoose={choose}
                    onClose={closePicker}
                    onPointerEnter={() => clear(closeTimer)}
                    onPointerLeave={scheduleClose}
                />
            )}
        </div>
    );
}

const ReactionButton = memo(ReactionButtonInner);
ReactionButton.displayName = 'ReactionButton';
export default ReactionButton;
