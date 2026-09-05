'use client';

/**
 * ReactionRail harness — the real feed chrome around a simplified card.
 *
 * Reproduces the structure `HomeFeed2` actually renders:
 *   div.h-app-inner.flex.overflow-hidden        fixed 84dvh, clipped
 *     └ div[FEED_COLUMN_CLASS]                  flex flex-col, overflow-y-auto
 *         └ div.mb-2                            ImpressionTracker's wrapper
 *             └ div.feed-card-cv
 *                 └ div.relative … my-[0.5rem]  the rail's offsetParent
 *                     └ <ReactionRail/>
 *
 * The point of this page is the NESTED, height-constrained scroller. The feed
 * does not scroll the window, it scrolls that column — so this is where a touch
 * drag and the feed's own pan actually compete, and the specs assert the
 * column's `scrollTop`, not `window.scrollY`.
 */

import { useCallback, useEffect, useState } from 'react';
import ReactionRail from '@/components/reactions/ReactionRail';
import type { ReactionKind } from '@/components/reactions/reactionAdapter';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

function HarnessCard({ index }: { index: number }) {
    const [selected, setSelected] = useState<ReactionKind | null>(null);
    const onSelect = useCallback((kind: ReactionKind | null) => setSelected(kind), []);
    return (
        <div className="mb-2">
            <div className="feed-card-cv" id={`feed-post-${index}`}>
                <div
                    data-testid={`card-${index}`}
                    className="relative w-full bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]"
                >
                    <ReactionRail selected={selected} onSelect={onSelect} />
                    <p data-testid={`selected-${index}`}>selected: {selected ?? 'none'}</p>
                    <p style={{ height: 520 }}>Card body {index}</p>
                </div>
            </div>
        </div>
    );
}

export default function ReactionRailFeedChromeHarness() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return (
        <div className="h-app-inner flex overflow-hidden" data-hydrated={hydrated ? 'yes' : 'no'}>
            <main className={FEED_COLUMN_CLASS} data-testid="feed-column">
                <h1>ReactionRail — real feed chrome</h1>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <HarnessCard key={i} index={i} />
                ))}
            </main>
        </div>
    );
}
