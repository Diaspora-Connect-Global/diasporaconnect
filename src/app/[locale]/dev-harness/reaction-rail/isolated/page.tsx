'use client';

/**
 * ReactionRail harness — the rail on its own, in a card-shaped box.
 *
 * The CONTROL for the other two harnesses. It reproduces only what the rail
 * itself depends on:
 *   .feed-card-cv   content-visibility: auto  =>  contain: layout style paint
 *     └ div.relative … my-[0.5rem]            the rail's offsetParent
 *         └ <ReactionRail/>
 *
 * `clampToCard()` measures `rail.offsetParent`, so which element that resolves
 * to is load-bearing: containment on `.feed-card-cv` makes it a containing
 * block for absolutely-positioned descendants without making it the
 * `offsetParent`, and this page is where that stays honest.
 *
 * When a drag fails here AND in `feed-card`, the rail is at fault. When it
 * fails only there, the surrounding feed is.
 */

import { useCallback, useEffect, useState } from 'react';
import ReactionRail from '@/components/reactions/ReactionRail';
import type { ReactionKind } from '@/components/reactions/reactionAdapter';

function HarnessCard({ index }: { index: number }) {
    const [selected, setSelected] = useState<ReactionKind | null>(null);
    const onSelect = useCallback((kind: ReactionKind | null) => setSelected(kind), []);

    return (
        <div className="feed-card-cv" id={`feed-post-${index}`}>
            <div
                data-testid={`card-${index}`}
                className="relative w-full bg-surface-default border border-border-subtle rounded-lg p-[1rem] flex flex-col my-[0.5rem]"
                style={{ minHeight: 480 }}
            >
                <ReactionRail selected={selected} onSelect={onSelect} />
                <p data-testid={`selected-${index}`}>selected: {selected ?? 'none'}</p>
                <p style={{ height: 380 }}>Card body {index}</p>
            </div>
        </div>
    );
}

export default function ReactionRailIsolatedHarness() {
    // The suite waits on this before touching anything: before hydration the
    // rail is inert markup, and "the drag did nothing" would then say nothing
    // about the component.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);

    return (
        <main
            style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}
            data-hydrated={hydrated ? 'yes' : 'no'}
        >
            <h1>ReactionRail — isolated</h1>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <HarnessCard key={i} index={i} />
            ))}
        </main>
    );
}
