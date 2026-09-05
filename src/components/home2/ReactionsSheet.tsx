'use client';

/* =====================================================================
 *  ReactionsSheet — "who reacted to this post", in TWO SHAPES.
 *
 *  The same panel, wrapped by a different primitive depending on how the
 *  viewer is pointing at the screen:
 *
 *   • TOUCH / SMALL VIEWPORT → `ui/bottom-sheet` (Radix Dialog underneath).
 *     Full-width, slides up from the bottom edge, drag-handle pill on top.
 *
 *   • MOUSE / LARGE VIEWPORT → `ui/popover` (Radix Popover underneath),
 *     ANCHORED to the reaction cluster that was clicked. Not a centred
 *     modal: it opens beside the thing you pressed, sized to the list
 *     (22rem) and capped so the rows scroll INSIDE it. Radix does the
 *     flip/shift so a cluster near the bottom of the window still gets a
 *     panel that is fully on screen.
 *
 *  The variant is chosen from POINTER CAPABILITY, never a user-agent
 *  string: `(min-width: 640px) and (hover: hover) and (pointer: fine)`.
 *  A tablet with a mouse gets the popover, a large touchscreen gets the
 *  sheet — which is the honest reading of "can this person hover a small
 *  anchor?". Every piece of state lives in this component rather than in
 *  either wrapper, so a resize across the breakpoint re-wraps the panel
 *  without losing the loaded rows.
 *
 *  ── PREFETCH: ALWAYS ONE PAGE AHEAD ─────────────────────────────────
 *  Reaching the end of the list must never mean waiting for a request.
 *  So the moment a page lands and `hasMore` is true, the NEXT page is
 *  fetched immediately into a per-tab `buffer` and parked there, unseen.
 *  When the sentinel at the foot of the list comes into view that buffer
 *  is appended synchronously — no spinner, no gap — and the fetch after
 *  it starts. Lookahead is capped at exactly ONE page: a non-null buffer
 *  is itself the "stop" signal, so a 10,000-reactor post never drains
 *  itself into memory.
 *
 *  ── UNTYPED LIKES ───────────────────────────────────────────────────
 *  A reactor whose `reactionType` is null is a PRE-MIGRATION like, stored
 *  before reaction types existed. It is a real reaction whose kind was
 *  never recorded, so it renders as the heart — the same rule
 *  `readSelectedReaction` applies to the viewer's own untyped like, and
 *  the same one `clusterCounts` applies to the counts behind this panel.
 *  `foldUntypedIntoHappy` below applies it to the tile and tab numbers so
 *  "All 23" is always exactly Happy + Hopeful + Sad, and every reactor in
 *  the All list is counted under some tab.
 *
 *  ── SAD IS NOT A DOWNVOTE ───────────────────────────────────────────
 *  Labels come from the existing `reactions.happy/hopeful/sad` keys and
 *  nothing else. No "(Positive)" / "(Supportive)" / "(Negative)"
 *  parenthetical is added anywhere — see ./reactionAdapter for why Sad
 *  must never read as dislike to a user OR a screen reader.
 * ===================================================================== */

import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useLazyQuery } from '@apollo/client/react';

import {
    BottomSheet,
    BottomSheetContent,
    BottomSheetDescription,
    BottomSheetTitle,
} from '@/components/ui/bottom-sheet';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import Avatar from '@/components/cards/media/Avatar';
import { toCdnUrl } from '@/lib/cdn';
import { formatCount } from '@/macros/formatCount';
import { formatDateProximity } from '@/macros/time';
import { POST_REACTIONS } from '@/services/gql/postsFeed';
import type {
    PostReactionsData,
    PostReactionsVars,
    PostReactor,
} from '@/services/gql/types/postsFeed';
import {
    DEFAULT_REACTION,
    REACTION_ORDER,
    type ReactionKind,
} from '@/components/home2/reactionAdapter';
import { REACTION_LABEL_KEY, reactionIcon } from '@/components/home2/ReactionBar2';

/* --------------------------------------------------------------- */
/*  Shape / sizing constants                                       */
/* --------------------------------------------------------------- */

/**
 * Popover variant gate. A breakpoint ALONE is not enough — a 1024px
 * touchscreen cannot comfortably aim at a 40px anchor — and `pointer: fine`
 * alone is not enough either, because a narrow window has nowhere to put a
 * 22rem panel beside the cluster. Both must hold.
 */
const ANCHORED_QUERY = '(min-width: 640px) and (hover: hover) and (pointer: fine)';

/**
 * Server clamps this (default 30, max 100). 30 fills the popover's ~26rem of
 * list height several times over, so the first page is already more than the
 * viewer can see before they scroll.
 */
const PAGE_SIZE = 30;

/**
 * How early the foot-of-list sentinel counts as reached. Generous because
 * hitting it costs nothing — the next page is already in hand; this only
 * decides when it is spliced in.
 */
const SENTINEL_ROOT_MARGIN = '160px';

/* --------------------------------------------------------------- */
/*  Tabs                                                           */
/* --------------------------------------------------------------- */

type TabKey = 'ALL' | ReactionKind;

/** All, then the three kinds in the same fixed order as the cluster and rail. */
const TAB_ORDER: readonly TabKey[] = ['ALL', ...REACTION_ORDER] as const;

/* --------------------------------------------------------------- */
/*  Counts                                                         */
/* --------------------------------------------------------------- */

interface ReactionSummary {
    /** Every reaction row, INCLUDING untyped legacy ones. */
    total: number;
    happy: number;
    hopeful: number;
    sad: number;
}

/**
 * The numbers this panel DISPLAYS, which are not the raw server counts.
 *
 * `total` counts every reaction row; `happy + hopeful + sad` counts only the
 * rows whose kind was recorded. The remainder is pre-migration untyped likes,
 * which render as hearts in the list — so they are credited to Happy here too.
 * Without that fold, "All 23" would not equal 15 + 5 + 3, and the All list
 * would contain heart rows that no tab admits to owning.
 *
 * Clamped at zero: a stale total from the card seed can briefly sit below the
 * typed sum, and a negative remainder would eat real Happys.
 */
function foldUntypedIntoHappy(s: ReactionSummary): Record<ReactionKind, number> {
    const typed = s.happy + s.hopeful + s.sad;
    return {
        HAPPY: s.happy + Math.max(0, s.total - typed),
        HOPEFUL: s.hopeful,
        SAD: s.sad,
    };
}

/* --------------------------------------------------------------- */
/*  Per-tab paging state                                           */
/* --------------------------------------------------------------- */

interface BufferedPage {
    rows: PostReactor[];
    cursor: string | null;
    hasMore: boolean;
}

interface TabState {
    /** Rows the viewer can actually see. */
    rows: PostReactor[];
    /** Cursor for the page AFTER `rows` — i.e. what the next fetch sends. */
    cursor: string | null;
    /** Is there anything after `rows` (buffered or not)? */
    hasMore: boolean;
    /**
     * The page fetched ahead of time and held back. Non-null is also the
     * signal that stops further prefetching, which is what caps lookahead at
     * one page without a counter to get wrong.
     */
    buffer: BufferedPage | null;
    /** A request is in flight for this tab. */
    loading: boolean;
    /** The first page has landed (so an empty `rows` really means empty). */
    loaded: boolean;
    error: boolean;
}

const EMPTY_TAB: TabState = {
    rows: [],
    cursor: null,
    hasMore: false,
    buffer: null,
    loading: false,
    loaded: false,
    error: false,
};

function emptyTabs(): Record<TabKey, TabState> {
    return { ALL: EMPTY_TAB, HAPPY: EMPTY_TAB, HOPEFUL: EMPTY_TAB, SAD: EMPTY_TAB };
}

/**
 * Append a page, dropping anyone already listed.
 *
 * A cursor that overlaps by a row (a reaction added while paging shifts the
 * window) would otherwise produce duplicate React keys and a person listed
 * twice. One person, one row, whatever the server sends.
 */
function appendRows(existing: PostReactor[], incoming: PostReactor[]): PostReactor[] {
    if (incoming.length === 0) return existing;
    const seen = new Set(existing.map((r) => r.userId));
    const fresh = incoming.filter((r) => !seen.has(r.userId));
    return fresh.length === 0 ? existing : [...existing, ...fresh];
}

/* --------------------------------------------------------------- */
/*  Variant selection                                              */
/* --------------------------------------------------------------- */

function subscribeToPointer(onChange: () => void) {
    const mql = window.matchMedia(ANCHORED_QUERY);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
}

function readPointer() {
    return window.matchMedia(ANCHORED_QUERY).matches;
}

/**
 * Server snapshot. This component only ever mounts from a click, so the
 * server branch is unreachable — it exists so `useSyncExternalStore` is
 * satisfied rather than because a server render is expected.
 */
function readPointerServer() {
    return false;
}

/* --------------------------------------------------------------- */
/*  Props                                                          */
/* --------------------------------------------------------------- */

export interface ReactionsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string;
    /**
     * The cluster button. The popover variant anchors to it, and BOTH
     * variants hand focus back to it on close.
     */
    anchorRef: React.RefObject<HTMLButtonElement | null>;
    /**
     * The counts already on screen behind this panel, so the tiles and tabs
     * paint real numbers on the first frame instead of dashes. Replaced by the
     * server's own summary the moment the All page lands.
     */
    initialCounts: Record<ReactionKind, number>;
    initialTotal: number;
}

/* --------------------------------------------------------------- */
/*  Component                                                      */
/* --------------------------------------------------------------- */

export default function ReactionsSheet({
    open,
    onOpenChange,
    postId,
    anchorRef,
    initialCounts,
    initialTotal,
}: ReactionsSheetProps) {
    const t = useTranslations('reactions');
    const tCommon = useTranslations('common');

    const isAnchored = useSyncExternalStore(
        subscribeToPointer,
        readPointer,
        readPointerServer,
    );

    const baseId = useId();
    const titleId = `${baseId}-title`;
    const descId = `${baseId}-desc`;
    const panelId = `${baseId}-panel`;
    const tabId = (key: TabKey) => `${baseId}-tab-${key}`;

    const [tab, setTab] = useState<TabKey>('ALL');
    const [tabs, setTabs] = useState<Record<TabKey, TabState>>(emptyTabs);
    const [summary, setSummary] = useState<ReactionSummary | null>(null);
    /** The foot-of-list sentinel is in view: splice in the buffered page. */
    const [atEnd, setAtEnd] = useState(false);

    const [listNode, setListNode] = useState<HTMLDivElement | null>(null);
    const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
    const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

    /**
     * Bumped whenever the panel closes. A response carrying a stale epoch is
     * DROPPED rather than written: without it, a page still in flight when the
     * viewer closes and reopens would land on the freshly-reset state and
     * present a page-two-shaped list as page one.
     */
    const epochRef = useRef(0);
    /** Cursors currently being fetched, so the same page is never requested twice. */
    const inFlightRef = useRef<Set<string>>(new Set());

    const [fetchReactions] = useLazyQuery<PostReactionsData, PostReactionsVars>(POST_REACTIONS);

    /* ---- fetching ------------------------------------------------ */

    /**
     * One request, routed to ONE tab's slice.
     *
     * Responses are keyed by the tab they were asked for, not by the tab that
     * happens to be showing when they land — so a slow All page arriving after
     * the viewer has moved to Hopeful updates All (correctly, invisibly) and
     * never overwrites the list in front of them.
     *
     * `mode` is the whole difference between the two kinds of load:
     *   'first' → replaces the tab and becomes visible immediately.
     *   'ahead' → parks the page in `buffer`, invisible until the viewer
     *             reaches the end of what is already rendered.
     */
    const runFetch = useCallback(
        async (targetTab: TabKey, cursor: string | null, mode: 'first' | 'ahead') => {
            if (!postId) return;
            const epoch = epochRef.current;
            const key = `${epoch}|${targetTab}|${cursor ?? 'HEAD'}`;
            if (inFlightRef.current.has(key)) return;
            inFlightRef.current.add(key);

            setTabs((prev) => ({
                ...prev,
                [targetTab]: { ...prev[targetTab], loading: true, error: false },
            }));

            try {
                const res = await fetchReactions({
                    variables: {
                        postId,
                        // The All tab asks for everything; a kind narrows the list
                        // SERVER-side, so switching tabs is a new small query rather
                        // than a client filter over a partially-loaded list.
                        reactionType: targetTab === 'ALL' ? null : targetTab,
                        limit: PAGE_SIZE,
                        cursor,
                    },
                });

                if (epoch !== epochRef.current) return;

                // The client runs errorPolicy: 'all', so a refused or failed query
                // RESOLVES with data undefined instead of throwing. Read `data`;
                // never treat "did not throw" as success.
                const page = res.data?.postReactions;
                if (!page) {
                    setTabs((prev) => ({
                        ...prev,
                        [targetTab]: { ...prev[targetTab], loading: false, error: true },
                    }));
                    return;
                }

                // Only the All tab's own page carries a trustworthy post-wide
                // summary. A kind-filtered response is not asked to describe the
                // whole post, so its numbers are never allowed near the tiles.
                if (targetTab === 'ALL') {
                    setSummary({
                        total: page.total,
                        happy: page.happy,
                        hopeful: page.hopeful,
                        sad: page.sad,
                    });
                }

                setTabs((prev) => {
                    const cur = prev[targetTab];
                    if (mode === 'first') {
                        return {
                            ...prev,
                            [targetTab]: {
                                rows: page.reactors ?? [],
                                cursor: page.nextCursor ?? null,
                                hasMore: Boolean(page.hasMore),
                                buffer: null,
                                loading: false,
                                loaded: true,
                                error: false,
                            },
                        };
                    }
                    return {
                        ...prev,
                        [targetTab]: {
                            ...cur,
                            buffer: {
                                rows: page.reactors ?? [],
                                cursor: page.nextCursor ?? null,
                                hasMore: Boolean(page.hasMore),
                            },
                            loading: false,
                            error: false,
                        },
                    };
                });
            } catch {
                if (epoch === epochRef.current) {
                    setTabs((prev) => ({
                        ...prev,
                        [targetTab]: { ...prev[targetTab], loading: false, error: true },
                    }));
                }
            } finally {
                inFlightRef.current.delete(key);
            }
        },
        [fetchReactions, postId],
    );

    /**
     * The prefetch pump.
     *
     * Declarative on purpose: it reacts to the tab's own shape rather than
     * being called from the places that change it, so every route into "this
     * tab has no page yet" or "this tab has spent its buffer" is covered by
     * construction — first open, tab switch, retry after an error, and the
     * splice below all end up here.
     *
     * Reading it top to bottom is the whole prefetch sequence:
     *   no page yet          → fetch page 1, show it
     *   page shown, no buffer → fetch the next page and hold it back
     *   buffer held           → do nothing; that is the one-page cap
     */
    useEffect(() => {
        if (!open || !postId) return;
        const state = tabs[tab];
        if (state.loading || state.error) return;
        if (!state.loaded) {
            void runFetch(tab, null, 'first');
            return;
        }
        if (!state.buffer && state.hasMore && state.cursor) {
            void runFetch(tab, state.cursor, 'ahead');
        }
    }, [open, postId, tab, tabs, runFetch]);

    /**
     * Spend the buffer when the viewer reaches the foot of the list.
     *
     * Runs on `tabs` too, not just `atEnd`: if they arrive before the
     * prefetched page does, this fires again the instant it lands, so the
     * rows appear without a second scroll.
     */
    useEffect(() => {
        if (!open || !atEnd) return;
        if (!tabs[tab].buffer) return;
        setTabs((prev) => {
            const cur = prev[tab];
            if (!cur.buffer) return prev;
            return {
                ...prev,
                [tab]: {
                    ...cur,
                    rows: appendRows(cur.rows, cur.buffer.rows),
                    cursor: cur.buffer.cursor,
                    hasMore: cur.buffer.hasMore,
                    buffer: null,
                },
            };
        });
    }, [open, atEnd, tab, tabs]);

    /* ---- lifecycle ----------------------------------------------- */

    // Reset on CLOSE, not on open: the panel is mounted already open (the
    // parent mounts it on the click that opens it), so resetting on open would
    // wipe the state the very first effect pass had just started filling.
    useEffect(() => {
        if (open) return;
        epochRef.current += 1;
        inFlightRef.current.clear();
        setTab('ALL');
        setTabs(emptyTabs());
        setSummary(null);
        setAtEnd(false);
    }, [open]);

    // A tab switch shows a different list; keep the scroll position honest.
    useEffect(() => {
        listNode?.scrollTo({ top: 0 });
    }, [tab, listNode]);

    useEffect(() => {
        if (!sentinelNode) {
            setAtEnd(false);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => setAtEnd(entries.some((e) => e.isIntersecting)),
            { root: listNode, rootMargin: SENTINEL_ROOT_MARGIN },
        );
        io.observe(sentinelNode);
        return () => io.disconnect();
    }, [sentinelNode, listNode]);

    /* ---- derived -------------------------------------------------- */

    const counts = summary ? foldUntypedIntoHappy(summary) : initialCounts;
    const peopleTotal = summary ? summary.total : initialTotal;
    const state = tabs[tab];
    // Keyed on "the first page has not landed" rather than on `loading`, so the
    // frame between opening and the effect firing the request shows skeleton
    // rows too — otherwise the panel flashes an empty pane on the way in.
    const showFirstLoad = !state.loaded && !state.error;
    const showEmpty = state.loaded && state.rows.length === 0 && !state.error;

    const close = useCallback(() => onOpenChange(false), [onOpenChange]);

    const retry = useCallback(() => {
        setTabs((prev) => ({ ...prev, [tab]: { ...prev[tab], error: false } }));
    }, [tab]);

    // Roving tabindex: one tab stop for the whole row, arrows move between the
    // filters. Without it every filter is a separate stop and reaching the list
    // means tabbing past four of them.
    const onTabKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>) => {
            const idx = TAB_ORDER.indexOf(tab);
            let nextIdx = -1;
            if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TAB_ORDER.length;
            else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
            else if (e.key === 'Home') nextIdx = 0;
            else if (e.key === 'End') nextIdx = TAB_ORDER.length - 1;
            if (nextIdx < 0) return;
            e.preventDefault();
            const nextTab = TAB_ORDER[nextIdx];
            setTab(nextTab);
            tabRefs.current[nextTab]?.focus();
        },
        [tab],
    );

    /* ---- panel ---------------------------------------------------- */

    const heading = t('sheetTitle');
    const subtitle = t('peopleReacted', { count: peopleTotal });

    const body = (
        <>
            <div className="px-4 pt-1 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                    {isAnchored ? (
                        <h2 id={titleId} className="text-base font-semibold leading-none text-text-primary">
                            {heading}
                        </h2>
                    ) : (
                        <BottomSheetTitle className="text-text-primary">{heading}</BottomSheetTitle>
                    )}
                    <button
                        type="button"
                        onClick={close}
                        aria-label={tCommon('close')}
                        className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand"
                    >
                        <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                </div>

                {isAnchored ? (
                    <p id={descId} className="mt-1 text-sm text-text-secondary">
                        {subtitle}
                    </p>
                ) : (
                    <BottomSheetDescription className="mt-1">{subtitle}</BottomSheetDescription>
                )}

                {/* ── SUMMARY TILES ────────────────────────────────────────
                     One bordered box, three equal cells, hairline rules
                     between. Only the heart goes red, and only when it has a
                     count: the tiles report what the post has, so a zero is
                     never dressed up as an achievement. Hopeful and Sad keep
                     the neutral outline treatment at every value — Sad is
                     empathy, and colouring it would editorialise.

                     aria-hidden because the tab row directly below carries the
                     SAME three numbers plus the total, in a form that can
                     actually be operated. Announcing both would read every
                     count twice before reaching anything actionable. Nothing
                     here is focusable, so hiding it strands no control. ── */}
                <div
                    aria-hidden="true"
                    className="mt-3 grid grid-cols-3 divide-x divide-border-subtle rounded-xl border border-border-subtle"
                >
                    {REACTION_ORDER.map((kind) => {
                        const count = counts[kind];
                        // The one red is the heart, and `border-danger` is the very
                        // token SELECTED_DISC paints the rail's selected disc with —
                        // one red on this feature, not two that drift apart.
                        const isRed = kind === 'HAPPY' && count > 0;
                        const Icon = reactionIcon(kind, isRed);
                        const tone = isRed ? 'text-border-danger' : 'text-text-secondary';
                        return (
                            <div
                                key={kind}
                                className="flex flex-col items-center gap-[0.25rem] px-2 py-[0.625rem]"
                            >
                                <span className="flex items-center gap-[0.375rem]">
                                    <Icon aria-hidden="true" className={`h-[1.125rem] w-[1.125rem] shrink-0 ${tone}`} />
                                    <span className={`text-base font-semibold tabular-nums ${tone}`}>
                                        {formatCount(count)}
                                    </span>
                                </span>
                                <span className="text-xs text-text-secondary">{t(REACTION_LABEL_KEY[kind])}</span>
                            </div>
                        );
                    })}
                </div>

                {/* ── FILTER TABS ─────────────────────────────────────────── */}
                <div
                    role="tablist"
                    aria-label={t('filterByReaction')}
                    className="mt-4 flex items-center gap-4 overflow-x-auto border-b border-border-subtle"
                >
                    {TAB_ORDER.map((key) => {
                        const active = key === tab;
                        const label = key === 'ALL' ? t('all') : t(REACTION_LABEL_KEY[key]);
                        const count = key === 'ALL' ? peopleTotal : counts[key];
                        return (
                            <button
                                key={key}
                                id={tabId(key)}
                                ref={(node) => {
                                    tabRefs.current[key] = node;
                                }}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                aria-controls={panelId}
                                tabIndex={active ? 0 : -1}
                                onClick={() => setTab(key)}
                                onKeyDown={onTabKeyDown}
                                className={`-mb-px flex shrink-0 items-center gap-[0.375rem] whitespace-nowrap border-b-2 px-[0.125rem] pb-[0.5rem] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand ${
                                    active
                                        ? 'border-border-danger font-semibold text-text-primary'
                                        : 'border-transparent text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                <span>{label}</span>
                                <span className="tabular-nums">{formatCount(count)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── REACTOR LIST ───────────────────────────────────────────── */}
            <div
                ref={setListNode}
                id={panelId}
                role="tabpanel"
                aria-labelledby={tabId(tab)}
                aria-busy={state.loading}
                // Tabbable on purpose. The rows hold nothing focusable, so
                // without a stop here a keyboard user tabs straight past the
                // list they came for and can never scroll it with the arrow
                // keys — which is also what the tabs pattern prescribes for a
                // panel with no interactive content of its own.
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 focus-visible:outline-none sm:px-5"
            >
                {showFirstLoad && (
                    <ul className="flex flex-col" aria-hidden="true">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <li key={i} className="flex items-center gap-3 py-[0.5rem]">
                                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                                <div className="flex min-w-0 flex-1 flex-col gap-[0.375rem]">
                                    <Skeleton className="h-3 w-1/2" />
                                    <Skeleton className="h-[0.625rem] w-1/4" />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {state.error && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <p className="text-sm text-text-secondary">{t('loadError')}</p>
                        <button
                            type="button"
                            onClick={retry}
                            className="rounded-full border border-border-subtle px-3 py-1 text-sm text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand"
                        >
                            {t('retry')}
                        </button>
                    </div>
                )}

                {showEmpty && (
                    <p className="py-8 text-center text-sm text-text-secondary">
                        {tab === 'ALL'
                            ? t('emptyAll')
                            : t('emptyKind', { reaction: t(REACTION_LABEL_KEY[tab]) })}
                    </p>
                )}

                {state.rows.length > 0 && (
                    <ul className="flex flex-col">
                        {state.rows.map((reactor) => {
                            // A null reactionType is a pre-migration like: a real
                            // reaction whose kind was never stored. It renders as the
                            // heart, exactly as the rest of the app renders one.
                            const kind: ReactionKind = reactor.reactionType ?? DEFAULT_REACTION;
                            const isHappy = kind === 'HAPPY';
                            const Icon = reactionIcon(kind, isHappy);
                            const label = t(REACTION_LABEL_KEY[kind]);
                            return (
                                <li key={reactor.userId} className="flex items-center gap-3 py-[0.5rem]">
                                    <Avatar
                                        src={toCdnUrl(reactor.avatarUrl) || undefined}
                                        alt=""
                                        size={40}
                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-text-primary">
                                            {reactor.fullName}
                                        </p>
                                        <p className="text-xs text-text-tertiary">
                                            {formatDateProximity(reactor.reactedAt)}
                                        </p>
                                    </div>
                                    {/* The glyph is decorative; the name beside it is
                                        what a screen reader announces, so Sad reads as
                                        "Sad" and never as a thumbs-down. */}
                                    <span className="flex shrink-0 items-center">
                                        <Icon
                                            aria-hidden="true"
                                            className={`h-[1.125rem] w-[1.125rem] ${
                                                isHappy ? 'text-border-danger' : 'text-text-secondary'
                                            }`}
                                        />
                                        <span className="sr-only">{label}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Foot-of-list marker. Present whenever more rows exist, so the
                    observer can report arrival; the page it admits is normally
                    already downloaded, which is why this shows a spinner only in
                    the rare case the viewer outran the prefetch. */}
                {state.hasMore && (
                    <div
                        key={tab}
                        ref={setSentinelNode}
                        className="flex items-center justify-center py-3"
                    >
                        {state.loading && !state.buffer && <Spinner className="text-text-tertiary" />}
                    </div>
                )}
            </div>
        </>
    );

    /* ---- wrappers -------------------------------------------------- */

    if (isAnchored) {
        return (
            <Popover open={open} onOpenChange={onOpenChange}>
                {/*
                 * The anchor is the cluster button, which lives in ReactionBar2 —
                 * so it is referenced rather than wrapped. Radix's popper only
                 * ever calls getBoundingClientRect() on it, and tolerates a null
                 * current, which is why the cast is safe; the cast itself is
                 * needed only because React 19 types a `useRef<T>(null)` as
                 * RefObject<T | null> while Radix asks for RefObject<Measurable>.
                 */}
                <PopoverPrimitive.Anchor
                    virtualRef={
                        anchorRef as unknown as NonNullable<
                            React.ComponentProps<typeof PopoverPrimitive.Anchor>['virtualRef']
                        >
                    }
                />
                <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={12}
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    onInteractOutside={(e) => {
                        // The cluster is OUTSIDE this popover, so pressing it to
                        // close would fire dismiss-on-outside here AND the
                        // button's own toggle — closing, then instantly
                        // reopening, which reads as the control being dead. Let
                        // the button own that one interaction.
                        if (anchorRef.current?.contains(e.target as Node)) {
                            e.preventDefault();
                        }
                    }}
                    onCloseAutoFocus={(e) => {
                        // No Radix Trigger to restore focus to (the anchor is
                        // virtual), so hand it back to the cluster explicitly —
                        // otherwise focus falls to <body> and a keyboard user
                        // loses their place in the feed.
                        e.preventDefault();
                        anchorRef.current?.focus();
                    }}
                    className="flex max-h-[min(60vh,26rem)] w-[22rem] flex-col overflow-hidden rounded-xl border-border-subtle bg-surface-default p-0 pt-3 text-text-primary shadow-lg"
                >
                    {body}
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange}>
            <BottomSheetContent
                showCloseButton={false}
                onCloseAutoFocus={(e) => {
                    e.preventDefault();
                    anchorRef.current?.focus();
                }}
                className="flex max-h-[85vh] flex-col overflow-y-hidden px-0 pb-0 sm:px-0"
            >
                {body}
            </BottomSheetContent>
        </BottomSheet>
    );
}
