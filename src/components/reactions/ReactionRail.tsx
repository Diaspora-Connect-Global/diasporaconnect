'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    REACTION_LABEL_KEY,
    REACTION_ORDER,
    reactionIcon,
    SELECTED_DISC,
    type ReactionKind,
} from '@/components/reactions/reactionAdapter';

/**
 * The always-visible reaction rail: a slim vertical pill of three glyphs that
 * FLOATS over the post card and can be MOVED anywhere inside it.
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
 * The clamp is measured against `offsetParent`, which resolves to the card's own
 * `relative` wrapper — in `FeedCard2` and in the shared `FeedCardWithReply`
 * alike. `offsetParent` follows `position`, and
 * containment does not change `position`, so `.feed-card-cv` two levels up is
 * never the anchor even though its layout containment makes it a containing
 * block for absolutely-positioned descendants. The card wrapper's padding box is
 * strictly INSIDE the `.feed-card-cv` clip box (it carries `my-[0.5rem]` and a
 * 1px border), so clamping to it is conservative in the safe direction.
 *
 * ## Clamping is re-run, not computed once
 *
 * A card is not a fixed size: images load, "Show more" expands the body, the
 * comment thread opens, the viewport rotates. An offset that fitted a tall card
 * puts the rail outside a short one — and outside means INVISIBLE, not merely
 * ugly. A `ResizeObserver` on both the rail and the card re-clamps on every size
 * change, which also covers the moment a virtualised card is first laid out.
 *
 * ## Desired position vs. rendered position
 *
 * `desiredRef` is what the viewer asked for and what is persisted; `offset` is
 * that value clamped to THIS card. They are kept apart deliberately: if the
 * clamp wrote back into the stored value, one short card would permanently
 * shrink the position for every tall card afterwards, and the rail would creep
 * back toward its default as the reader scrolled. The intent is global, the
 * rendering is per-card.
 *
 * ## Drag versus tap versus SCROLL
 *
 * The rail lives inside a vertically scrolling feed, so on the VERTICAL axis
 * movement alone cannot separate "move the rail" from "scroll the feed" —
 * whichever the code claims, it steals the other. A vertical drag is therefore a
 * PRESS-AND-HOLD, matching how `ReactionBar2` disambiguates the same gesture on
 * the same card: hold `HOLD_MS`, the rail visibly lifts, and only then does it
 * follow the finger. A finger that starts moving UP or DOWN before the hold
 * matures is a scroll and is handed straight back to the browser.
 *
 * The HORIZONTAL axis is not ambiguous and must not be treated as if it were.
 * The feed pans only vertically, so a sideways drag is never a scroll — and
 * requiring the hold for it did not defer the gesture, it DESTROYED it: the
 * browser claimed the touch for a pan that has nowhere to go, fired
 * `pointercancel`, and the rail neither moved nor scrolled anything. That is the
 * "the rail is not draggable" report, and it is exactly what a hand does when it
 * grabs a pill pinned to the right edge and pulls it inward. So a
 * horizontally-dominant movement of `TOUCH_AXIS_ARM_PX` arms the drag AT ONCE,
 * with no hold. The hold remains the only way in on the vertical axis, where the
 * conflict is real.
 *
 * The arming has to happen on `pointermove`, which the browser dispatches BEFORE
 * the matching `touchmove` — so the `touchmove` that follows already sees an
 * armed drag and calls `preventDefault()`, and the pan never starts. `armed` is
 * therefore set before the first displacement is applied, not after it.
 *
 * Critically, `touch-action` stays SCROLLABLE (`manipulation`, never `none`).
 * `touch-action: none` opts the element out of panning for every touch that
 * starts on it, whether or not any drag ever begins — with it set, a finger
 * landing on the rail can never scroll the feed. Scrolling is suppressed only
 * once a drag is armed, by `preventDefault()` on a non-passive `touchmove`
 * listener, which is scoped to exactly the gesture the viewer asked for.
 *
 * A mouse has no such conflict — a wheel scrolls, a button-drag does not — so a
 * mouse skips the hold and drags at a small movement threshold instead.
 *
 * ## Position persistence
 *
 * The offset is stored per viewer in `localStorage`, not per post — one rail
 * position for the whole feed, which is what "move it out of my way" means. It
 * is stored in px relative to the card's BOTTOM anchor, which is the unit that
 * survives the trip between cards: "a bit above the counts row" means the same
 * thing on a short post and a long one, where "40% down the card" would not.
 * Reads and writes are wrapped: storage throws in private modes and in
 * screenshot contexts, and a rail that cannot render is far worse than one that
 * forgets where it was.
 */

/**
 * Mouse-only. A mouse does not jitter, so this only has to clear the 1–2px of
 * slop in a deliberate click; below it, repositioning would fire on every
 * imprecise tap. It is deliberately SMALLER than the old shared 6px, which was
 * a compromise with touch that touch no longer needs.
 */
const MOUSE_DRAG_THRESHOLD = 4;

/**
 * Touch/pen press-and-hold before the rail can be moved. Far above a deliberate
 * tap (well under 200ms) so tapping a reaction never arms a drag, and below
 * `ReactionBar2`'s 450ms read-the-name hold because arming here is answered by
 * an immediate visual lift and a tap still works afterwards — nothing is lost by
 * arming a fraction early, whereas a hold long enough to feel broken is.
 */
const HOLD_MS = 350;

/**
 * Finger drift that cancels a pending hold. Finger jitter during a hold is much
 * larger than mouse jitter, so this is well above `MOUSE_DRAG_THRESHOLD`;
 * anything past it is the beginning of a scroll, which belongs to the browser.
 *
 * Only reached by VERTICALLY-dominant drift now — sideways movement arms the
 * drag instead of cancelling it, because sideways is not a scroll.
 */
const HOLD_MOVE_CANCEL_PX = 10;

/**
 * Sideways finger movement that arms a touch drag immediately, skipping the
 * hold. Deliberately BELOW the browser's own touch slop (~8px in Chrome): the
 * pan starts on the first `touchmove` past that slop which nobody prevented, so
 * arming has to happen while there is still a `touchmove` left to prevent.
 * Above the slop this would be a race the rail loses about half the time, which
 * is far worse than either outcome consistently.
 *
 * It is also high enough not to fire on a tap: a tap that slides 6px sideways
 * across a 28px glyph is no longer a tap, and the rail moving 6px is a truthful
 * answer to it.
 */
const TOUCH_AXIS_ARM_PX = 6;

const STORAGE_KEY = 'diaspoplug:reaction-rail-offset';

interface Offset {
    x: number;
    y: number;
}

const ORIGIN: Offset = { x: 0, y: 0 };

/** 'armed' = held long enough to move; 'dragging' = actually moving. */
type Mode = 'idle' | 'armed' | 'dragging';

interface DragState {
    pointerId: number;
    pointerType: string;
    /** Re-baselined when the drag arms, so hold-drift is not treated as intent. */
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    baseX: number;
    baseY: number;
    armed: boolean;
    /** The rail actually moved — so the trailing click must be swallowed. */
    moved: boolean;
}

function readStoredOffset(): Offset {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return ORIGIN;
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
        return ORIGIN;
    }
}

function writeStoredOffset(next: Offset) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Private mode / blocked storage: keep the position for this session and
        // simply do not remember it.
    }
}

/**
 * Clamp into `[lo, hi]`. An EMPTY interval (`lo > hi`) means the rail is bigger
 * than the room the card has on that axis — a card shorter than the rail plus
 * its anchor offset. Returning 0 pins it to its anchored position rather than
 * to whichever bound happened to be evaluated first.
 */
function clampAxis(v: number, lo: number, hi: number): number {
    if (lo > hi) return 0;
    return Math.min(Math.max(v, lo), hi);
}

function releaseCapture(el: Element, pointerId: number) {
    try {
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
        // The element can already be detached (the feed virtualised this card
        // mid-gesture); the browser has released the capture for us.
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
    const [offset, setOffset] = useState<Offset>(ORIGIN);
    const [mode, setMode] = useState<Mode>('idle');

    /** What the viewer asked for — global, persisted, never clamped in place. */
    const desiredRef = useRef<Offset>(ORIGIN);
    /** Mirror of `offset` for the pointer handlers, which must not re-bind. */
    const offsetRef = useRef<Offset>(ORIGIN);

    const dragRef = useRef<DragState | null>(null);
    const holdTimerRef = useRef<number | null>(null);
    /** A drag just ended: swallow the click it drags behind it. */
    const suppressClickRef = useRef(false);

    const clearHold = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const applyOffset = useCallback((next: Offset) => {
        const prev = offsetRef.current;
        if (prev.x === next.x && prev.y === next.y) return;
        offsetRef.current = next;
        setOffset(next);
    }, []);

    /**
     * Clamp an offset to the card, or `null` when the card cannot be measured.
     *
     * `null` is not an error — a card inside a skipped `content-visibility: auto`
     * subtree has no laid-out geometry, and treating the zeros it reports as a
     * real measurement would clamp every off-screen rail to its anchor and make
     * the stored position look like it never applied. The caller leaves the rail
     * where it is; the ResizeObserver re-runs this the moment real geometry
     * exists.
     */
    const clampToCard = useCallback((next: Offset): Offset | null => {
        const rail = railRef.current;
        // `offsetParent` is the card's own `relative` wrapper — the rail's direct
        // parent in FeedCard2 / FeedCardWithReply, and the box `bottom`/`right` already resolve
        // against, so offsetTop/offsetLeft below share its coordinate space.
        const card = rail?.offsetParent as HTMLElement | null;
        if (!rail || !card) return null;

        const railW = rail.offsetWidth;
        const railH = rail.offsetHeight;
        // clientWidth/Height are the PADDING box — the same box `offsetTop` and
        // `offsetLeft` are measured from, and the box paint containment clips to.
        const cardW = card.clientWidth;
        const cardH = card.clientHeight;
        if (!railW || !railH || !cardW || !cardH) return null;

        // Room to travel from the ANCHORED position. offsetTop/offsetLeft report
        // the layout position and are unaffected by our transform, so these stay
        // stable across the whole drag.
        const maxUp = rail.offsetTop;
        const maxDown = cardH - rail.offsetTop - railH;
        const maxLeft = rail.offsetLeft;
        const maxRight = cardW - rail.offsetLeft - railW;

        return {
            x: clampAxis(next.x, -maxLeft, maxRight),
            y: clampAxis(next.y, -maxUp, maxDown),
        };
    }, []);

    /** Re-derive the rendered position from the (global) desired position. */
    const syncToCard = useCallback(() => {
        const clamped = clampToCard(desiredRef.current);
        if (clamped) applyOffset(clamped);
    }, [clampToCard, applyOffset]);

    // Load the stored position, then keep it clamped to a card whose size moves
    // under it: image load, "Show more", the comment thread opening, rotation,
    // and — for a virtualised feed — the card being laid out for the first time.
    useEffect(() => {
        desiredRef.current = readStoredOffset();
        syncToCard();

        // Registered unconditionally, so a browser without ResizeObserver still
        // re-clamps on rotation rather than silently keeping a stale offset.
        window.addEventListener('resize', syncToCard);
        window.addEventListener('orientationchange', syncToCard);

        const rail = railRef.current;
        let ro: ResizeObserver | null = null;
        if (rail && typeof ResizeObserver !== 'undefined') {
            let observedCard: HTMLElement | null = null;
            const observeCard = (obs: ResizeObserver) => {
                const card = rail.offsetParent as HTMLElement | null;
                if (!card || card === observedCard) return;
                if (observedCard) obs.unobserve(observedCard);
                observedCard = card;
                obs.observe(card);
            };

            ro = new ResizeObserver(() => {
                // The card may not have been resolvable at mount (no layout
                // yet); pick it up on the first callback that has one.
                if (ro) observeCard(ro);
                syncToCard();
            });
            // Observing the rail as well as the card is deliberate: inside a
            // skipped subtree BOTH report nothing, and the rail's own 0 -> height
            // transition is the more reliable signal that this card is finally
            // being rendered.
            ro.observe(rail);
            observeCard(ro);
        }

        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', syncToCard);
            window.removeEventListener('orientationchange', syncToCard);
        };
    }, [syncToCard]);

    // Suppress the browser's own scroll ONLY while a drag is armed. This has to
    // be a manually-registered non-passive listener: React attaches `touchmove`
    // passively at the root, where `preventDefault()` is a silent no-op.
    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        const blockScrollWhileDragging = (ev: TouchEvent) => {
            if (dragRef.current?.armed) ev.preventDefault();
        };
        rail.addEventListener('touchmove', blockScrollWhileDragging, { passive: false });
        return () => rail.removeEventListener('touchmove', blockScrollWhileDragging);
    }, []);

    /**
     * The move/end pair lives on `window`, not on the rail.
     *
     * They used to be React props on the 44px pill, with pointer capture taken
     * only AFTER the first move that displaced the rail. That ordering meant the
     * pointer had to stay inside the pill for the entire run-up to a drag — the
     * press, the 4px mouse threshold or the 350ms hold, and the first move — or
     * the element simply stopped receiving events and the gesture died with no
     * trace. Any drag quicker than a careful crawl left the pill first, which is
     * why the rail read as "not draggable" rather than as flaky.
     *
     * Binding to `window` makes the drag independent of what is under the
     * cursor. Capture is still taken on the first real displacement, but it is
     * now an optimisation for cross-iframe and cross-window cases rather than
     * the thing holding the gesture together.
     *
     * Indirected through refs so the listener identities stay stable for
     * removeEventListener while still calling the latest closures.
     */
    const moveRef = useRef<(e: PointerEvent) => void>(() => {});
    const endRef = useRef<(e: PointerEvent) => void>(() => {});

    const winMove = useCallback((e: PointerEvent) => moveRef.current(e), []);
    const winEnd = useCallback((e: PointerEvent) => endRef.current(e), []);

    const detachWindowListeners = useCallback(() => {
        window.removeEventListener('pointermove', winMove);
        window.removeEventListener('pointerup', winEnd);
        window.removeEventListener('pointercancel', winEnd);
    }, [winMove, winEnd]);

    const attachWindowListeners = useCallback(() => {
        // Detach first: a press whose pointerup was never seen (it landed in
        // another window, or the tab lost focus mid-gesture) would otherwise
        // leave a duplicate set bound for the life of the component.
        detachWindowListeners();
        window.addEventListener('pointermove', winMove);
        window.addEventListener('pointerup', winEnd);
        window.addEventListener('pointercancel', winEnd);
    }, [detachWindowListeners, winMove, winEnd]);

    // A virtualised feed unmounts cards mid-gesture. Pointer capture is released
    // by the browser when the element leaves the document — but three things
    // outlive the component and must be undone by hand: the hold timer, which is
    // a live handle into a dead component; the window-level move/end listeners,
    // which are no longer React props and so are torn down by nobody; and a drag
    // in flight, whose position the viewer chose and would otherwise lose.
    useEffect(
        () => () => {
            clearHold();
            detachWindowListeners();
            if (dragRef.current?.moved) writeStoredOffset(desiredRef.current);
            dragRef.current = null;
        },
        [clearHold, detachWindowListeners],
    );

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            // A second finger DURING A REAL DRAG would overwrite the first one's
            // state and strand it. A leftover press that never armed is a
            // different thing — an abandoned mouse press whose pointerup landed
            // somewhere else — and must be overwritten, or the rail deadlocks
            // and never drags again.
            if (!e.isPrimary || dragRef.current?.armed) return;
            clearHold();

            suppressClickRef.current = false;
            attachWindowListeners();
            dragRef.current = {
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                startX: e.clientX,
                startY: e.clientY,
                lastX: e.clientX,
                lastY: e.clientY,
                baseX: offsetRef.current.x,
                baseY: offsetRef.current.y,
                armed: false,
                moved: false,
            };

            // Deliberately NO setPointerCapture here. Capture is taken later, at
            // the first movement that actually displaces the rail — see
            // handlePointerMove. Capturing on every press would put a capture on
            // gestures that end as ordinary taps, and a captured pointer can
            // retarget the compatibility `click` to the capture element, which
            // would mean the tap never reaches the reaction button underneath.
            // Touch has IMPLICIT capture anyway (touch pointer events stay
            // targeted at the element the touch began on), so the only pointer
            // type that gains anything from an explicit capture is the mouse,
            // and only once it is genuinely dragging.

            // A mouse cannot be confused with a scroll, so it drags on movement.
            if (e.pointerType === 'mouse') return;

            holdTimerRef.current = window.setTimeout(() => {
                holdTimerRef.current = null;
                const st = dragRef.current;
                if (!st) return;
                st.armed = true;
                // Re-baseline: the few px a finger drifts during the hold were
                // not an attempt to move the rail, and would otherwise make it
                // jump on the first real movement.
                st.startX = st.lastX;
                st.startY = st.lastY;
                st.baseX = offsetRef.current.x;
                st.baseY = offsetRef.current.y;
                setMode('armed');
            }, HOLD_MS);
        },
        [clearHold, attachWindowListeners],
    );

    const handlePointerMove = useCallback(
        (e: PointerEvent) => {
            const st = dragRef.current;
            if (!st || st.pointerId !== e.pointerId) return;
            st.lastX = e.clientX;
            st.lastY = e.clientY;

            const dx = e.clientX - st.startX;
            const dy = e.clientY - st.startY;

            if (!st.armed) {
                if (st.pointerType === 'mouse') {
                    if (Math.hypot(dx, dy) < MOUSE_DRAG_THRESHOLD) return;
                    st.armed = true;
                } else if (Math.abs(dx) >= TOUCH_AXIS_ARM_PX && Math.abs(dx) > Math.abs(dy)) {
                    // SIDEWAYS: not a scroll, so arm now rather than making the
                    // viewer hold first. The feed pans only vertically, so this
                    // gesture had no other owner — left to the browser it became
                    // a pan with nowhere to go, and the `pointercancel` that
                    // followed threw the drag away without scrolling anything.
                    //
                    // The baseline is deliberately NOT re-set here, unlike the
                    // hold below: the movement that armed this drag IS the
                    // viewer's intent, so the rail must already be `dx` along
                    // rather than starting over from the finger's new position.
                    clearHold();
                    st.armed = true;
                    setMode('armed');
                } else {
                    // Moved UP or DOWN before the hold matured: this is a
                    // scroll. Drop the gesture entirely so the browser owns it —
                    // we never called preventDefault and never captured, so it
                    // is still the browser's to take, and nothing here should
                    // touch its gesture machinery on the way out.
                    if (Math.hypot(dx, dy) >= HOLD_MOVE_CANCEL_PX) {
                        clearHold();
                        detachWindowListeners();
                        dragRef.current = null;
                    }
                    return;
                }
            }

            if (dx === 0 && dy === 0) return;

            // Measure BEFORE committing to a drag. An unmeasurable card cannot be
            // dragged on, and marking the gesture as a drag anyway would swallow
            // the click of a tap that moved the rail nowhere.
            const next = clampToCard({ x: st.baseX + dx, y: st.baseY + dy });
            if (!next) return;

            if (!st.moved) {
                st.moved = true;
                setMode('dragging');
                // NOW capture — the gesture has displaced the rail, so it is
                // certainly a drag and its trailing click is one we already
                // intend to swallow. A mouse has no implicit capture, so without
                // this a fast flick that leaves the 44px rail between two move
                // events would lose the rest of the drag and its own pointerup.
                try {
                    railRef.current?.setPointerCapture(e.pointerId);
                } catch {
                    // Non-fatal: the drag still tracks while the pointer stays
                    // over the rail, and pointerup still ends it.
                }
            }

            // The clamp is applied to the stored intent too: this position is one
            // the viewer just demonstrated is reachable on a real card. Note
            // `moved` is set even when the clamp pins the rail against an edge —
            // pushing at a boundary is still dragging, and the click that follows
            // is still not a choice.
            desiredRef.current = next;
            applyOffset(next);
        },
        [clampToCard, applyOffset, clearHold, detachWindowListeners],
    );

    const endGesture = useCallback(
        (e: PointerEvent) => {
            const st = dragRef.current;
            if (st && st.pointerId !== e.pointerId) return;
            dragRef.current = null;
            clearHold();
            detachWindowListeners();
            if (railRef.current) releaseCapture(railRef.current, e.pointerId);
            setMode('idle');
            // A hold that never moved is still a TAP — the reaction is cast on
            // release. Arming must not punish a viewer for pressing a beat too
            // long.
            if (!st?.moved) return;
            suppressClickRef.current = true;
            writeStoredOffset(desiredRef.current);
        },
        [clearHold, detachWindowListeners],
    );

    // The window listeners are stable wrappers; point them at this render's
    // closures. Done during render rather than in an effect so a pointerdown
    // and its first pointermove in the same frame cannot see a stale handler.
    moveRef.current = handlePointerMove;
    endRef.current = endGesture;

    /**
     * Swallow the click a finished drag drags behind it, in the CAPTURE phase so
     * it never reaches a reaction button.
     *
     * `detail === 0` identifies a click synthesised by Enter/Space on a focused
     * button. Those must pass: a drag that ends off the rail fires no click at
     * all, leaving the flag set, and a keyboard user reaching the rail afterwards
     * would otherwise find the first activation silently eaten.
     */
    const handleClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        if (e.detail === 0) return;
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // A platform long-press menu mid-drag would cancel the pointer and drop
        // the rail wherever it happened to be.
        if (dragRef.current?.armed) e.preventDefault();
    }, []);

    const handleSelect = useCallback(
        (kind: ReactionKind) => {
            // Tapping the ALREADY-SELECTED reaction clears it. Without this the
            // rail can only ever change a reaction, never remove one — there is
            // no other affordance to undo a mis-tap, and on a bereavement post a
            // stray Sad you cannot take back is the worst version of that.
            onSelect(selected === kind ? null : kind);
        },
        [onSelect, selected],
    );

    const lifted = mode !== 'idle';

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
            onClickCapture={handleClickCapture}
            onContextMenu={handleContextMenu}
            style={{
                // The lift is a STEP, not a transition: the transform carries the
                // drag position and must track the pointer 1:1, so it can never
                // be animated. That also makes the feedback identical under
                // prefers-reduced-motion — there is no motion to reduce.
                transform: `translate(${offset.x}px, ${offset.y}px)${lifted ? ' scale(1.04)' : ''}`,
                willChange: lifted ? 'transform' : undefined,
                // Suppresses the iOS long-press callout, which would otherwise
                // fire on top of the press-and-hold that arms the drag.
                WebkitTouchCallout: 'none',
            }}
            // Anchored from the BOTTOM: the counter row's distance from the card
            // bottom is fixed, whereas its distance from the TOP varies with body
            // text and media. z-40 floats it over images and link previews while
            // staying below the media lightbox at z-50.
            //
            // `touch-manipulation`, NOT `touch-none`: `touch-action: none` opts
            // every touch that lands here out of panning, so the feed could not
            // be scrolled from the one element a reader's thumb rests on. Scroll
            // is suppressed only for an armed drag, by the non-passive touchmove
            // listener above.
            className={`absolute bottom-[6rem] right-[0.5rem] z-40 flex w-[2.75rem] touch-manipulation select-none flex-col items-center gap-[0.625rem] rounded-full border bg-surface-default p-[0.625rem] ${
                lifted
                    ? 'cursor-grabbing border-border-brand opacity-90 shadow-xl [&_button]:cursor-grabbing'
                    : 'cursor-grab border-border-subtle shadow-lg'
            }`}
        >
            {/* NO visible grip. The whole rail is draggable, but the handle is
                deliberately invisible: the rail is primarily three reaction
                buttons, and a grip icon advertises a secondary capability at the
                cost of a fourth thing to look at in a 44px pill. Discovery is by
                trying — and the press-and-hold answers within 350ms with a
                visible lift, which is the feedback a grip would have promised. */}
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
