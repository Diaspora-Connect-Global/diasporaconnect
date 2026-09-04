'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { REACTION_ORDER, type ReactionKind } from '@/components/home2/reactionAdapter';
import {
    REACTION_LABEL_KEY,
    reactionIcon,
    SELECTED_DISC,
} from '@/components/home2/ReactionBar2';

/**
 * The always-visible reaction rail: a slim vertical pill of three glyphs that
 * FLOATS over the post card and can be DRAGGED anywhere inside it.
 *
 * ## Why it floats
 *
 * It sits above media and link previews (`z-40`), so it stays reachable on a
 * post that is mostly image. The card's own overlays — the media lightbox and
 * its controls — live at z-50 and above, so the rail correctly disappears
 * behind a fullscreen viewer rather than hovering over it.
 *
 * ## Why it is clamped INSIDE the card
 *
 * The card is wrapped in `.feed-card-cv`, which sets `content-visibility: auto`.
 * That implies `contain: layout style paint`, and PAINT CONTAINMENT CLIPS TO THE
 * PADDING BOX — a rail dragged past the card edge is simply not painted, with no
 * error and nothing in the DOM to explain the disappearance. `overflow: visible`
 * does not rescue it; containment outranks overflow. So the drag is clamped to
 * the card's own box: the rail can go anywhere within the post, and nowhere
 * outside it.
 *
 * ## Drag versus tap
 *
 * A pointer press only becomes a drag after DRAG_THRESHOLD px of movement.
 * Below that it is a tap and selects a reaction. Without the threshold every
 * attempt to reposition would also cast a reaction, and every slightly-imprecise
 * tap would nudge the rail — both worse than having no drag at all.
 *
 * On touch the rail does NOT claim the gesture until the threshold is crossed,
 * so a finger that starts on the rail and moves vertically still scrolls the
 * feed. Only once we are certain it is a drag do we capture the pointer.
 *
 * ## Position persistence
 *
 * The offset is stored per viewer in `localStorage`, not per post — one rail
 * position for the whole feed, which is what "move it out of my way" means.
 * Reads and writes are wrapped: storage throws in private modes and in
 * screenshot contexts, and a rail that cannot render is far worse than one that
 * forgets where it was.
 */

/** px of movement before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 6;
const STORAGE_KEY = 'diaspoplug:reaction-rail-offset';

interface Offset {
    x: number;
    y: number;
}

function readStoredOffset(): Offset {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { x: 0, y: 0 };
        const parsed = JSON.parse(raw) as Partial<Offset>;
        const x = Number(parsed?.x);
        const y = Number(parsed?.y);
        // Number(undefined) is NaN and Number(null) is 0 — guard explicitly so a
        // malformed entry cannot pin the rail to a corner.
        return {
            x: Number.isFinite(x) ? x : 0,
            y: Number.isFinite(y) ? y : 0,
        };
    } catch {
        return { x: 0, y: 0 };
    }
}

export interface ReactionRailProps {
    selected: ReactionKind | null;
    /** `null` clears the current reaction — tapping the selected one deselects. */
    onSelect: (kind: ReactionKind | null) => void;
}

export default function ReactionRail({ selected, onSelect }: ReactionRailProps) {
    const t = useTranslations('reactions');
    const railRef = useRef<HTMLDivElement | null>(null);

    // Starts at the anchored default; the stored offset is applied after mount so
    // server and first client render agree (reading localStorage during render
    // would hydrate-mismatch).
    const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);

    const dragState = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        baseX: number;
        baseY: number;
        active: boolean;
    } | null>(null);
    /** Set when a drag actually happened, so the click that follows is swallowed. */
    const draggedRef = useRef(false);

    useEffect(() => {
        setOffset(readStoredOffset());
    }, []);

    const clampToCard = useCallback((next: Offset): Offset => {
        const rail = railRef.current;
        const card = rail?.offsetParent as HTMLElement | null;
        if (!rail || !card) return next;
        // Room the rail has to travel from its anchored position, in each
        // direction. Negative values mean the rail is larger than the card on
        // that axis, in which case it simply does not move.
        const maxUp = rail.offsetTop;
        const maxDown = card.clientHeight - rail.offsetTop - rail.offsetHeight;
        const maxLeft = rail.offsetLeft;
        const maxRight = card.clientWidth - rail.offsetLeft - rail.offsetWidth;
        return {
            x: Math.min(Math.max(next.x, -maxLeft), Math.max(maxRight, 0)),
            y: Math.min(Math.max(next.y, -maxUp), Math.max(maxDown, 0)),
        };
    }, []);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            dragState.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                baseX: offset.x,
                baseY: offset.y,
                active: false,
            };
            draggedRef.current = false;
        },
        [offset.x, offset.y],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            const st = dragState.current;
            if (!st || st.pointerId !== e.pointerId) return;
            const dx = e.clientX - st.startX;
            const dy = e.clientY - st.startY;

            if (!st.active) {
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                // Only now is this certainly a drag. Capturing earlier would
                // steal a touch that was really a scroll.
                st.active = true;
                draggedRef.current = true;
                setDragging(true);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }
            setOffset(clampToCard({ x: st.baseX + dx, y: st.baseY + dy }));
        },
        [clampToCard],
    );

    const endDrag = useCallback((e: React.PointerEvent) => {
        const st = dragState.current;
        dragState.current = null;
        if (!st?.active) return;
        setDragging(false);
        const el = e.currentTarget as HTMLElement;
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
        setOffset((current) => {
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
            } catch {
                // Private mode / blocked storage: keep the position for this
                // session and simply do not remember it.
            }
            return current;
        });
    }, []);

    const handleSelect = useCallback(
        (kind: ReactionKind) => {
            if (draggedRef.current) {
                // Tail of a drag, not a choice. Reset on the NEXT pointerdown
                // rather than here: a drag that ends off the button never fires
                // a click, and clearing now would leave the flag stale.
                return;
            }
            // Tapping the ALREADY-SELECTED reaction clears it. Without this the
            // rail can only ever change a reaction, never remove one — there is
            // no other affordance to undo a mis-tap, and on a bereavement post a
            // stray Sad you cannot take back is the worst version of that.
            onSelect(selected === kind ? null : kind);
        },
        [onSelect, selected],
    );

    return (
        <div
            ref={railRef}
            // `group`, not `radiogroup`: a radio cannot be UNCHECKED by
            // activating it, and these can — tapping the selected reaction
            // clears it. Toggle buttons with aria-pressed describe that
            // honestly; radio semantics would promise exclusivity the control
            // does not actually have.
            role="group"
            aria-label={t('choose')}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            // Anchored from the BOTTOM: the counter row's distance from the card
            // bottom is fixed, whereas its distance from the TOP varies with body
            // text and media. z-40 floats it over images and link previews while
            // staying below the media lightbox at z-50.
            className={`absolute bottom-[6rem] right-[0.5rem] z-40 flex w-[2.75rem] touch-none select-none flex-col items-center gap-[0.375rem] rounded-full border border-border-subtle bg-surface-default p-[0.5rem] shadow-lg ${
                dragging ? 'cursor-grabbing opacity-90 shadow-xl' : ''
            }`}
        >
            {/* NO visible grip. The whole rail is draggable, but the handle is
                deliberately invisible: the rail is primarily three reaction
                buttons, and a grip icon advertises a secondary capability at the
                cost of a fourth thing to look at in a 44px pill. Drag still
                works from anywhere on the rail — it is discoverable by trying,
                not by being told. */}
            {REACTION_ORDER.map((kind) => {
                const isOn = selected === kind;
                const Icon = reactionIcon(kind, isOn);
                const label = t(REACTION_LABEL_KEY[kind]);
                return (
                    <Tooltip key={kind}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-pressed={isOn}
                                // Glyphs only — without an explicit name these
                                // announce as blank.
                                aria-label={label}
                                onClick={() => handleSelect(kind)}
                                className="flex h-[1.75rem] w-[1.75rem] shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface-default"
                            >
                                <span
                                    className={`flex h-[1.75rem] w-[1.75rem] items-center justify-center rounded-full transition-colors ${
                                        isOn ? SELECTED_DISC : ''
                                    }`}
                                >
                                    <Icon
                                        className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
                                            isOn ? 'text-white' : 'text-text-secondary'
                                        }`}
                                    />
                                </span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">{label}</TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
