'use client';

/**
 * ReactionButton harness — the shared reaction button on its own, in a
 * card-shaped box with Comment / Share beside it (the real action-bar layout),
 * inside `.feed-card-cv` paint containment. Nothing is sent to a server: each
 * card keeps the choice in local state and logs every write it would make.
 */

import { useCallback, useEffect, useState } from 'react';
import ReactionButton from '@/components/reactions/ReactionButton';
import type { ReactionKind } from '@/components/reactions/reactionAdapter';

function HarnessCard({ index }: { index: number }) {
    const [selected, setSelected] = useState<ReactionKind | null>(null);
    const [log, setLog] = useState<string[]>([]);
    const onSelect = useCallback((kind: ReactionKind | null) => {
        setLog((l) => [...l, kind ?? 'none']);
        setSelected(kind);
    }, []);

    return (
        <div className="feed-card-cv" id={`feed-post-${index}`}>
            <div
                data-testid={`card-${index}`}
                className="relative my-[0.5rem] flex min-h-[200px] w-full flex-col rounded-lg border border-border-subtle bg-surface-default p-[1rem]"
            >
                <p>Card body {index}</p>
                <p data-testid={`selected-${index}`}>selected: {selected ?? 'none'}</p>
                <p data-testid={`log-${index}`}>writes: {log.join(',')}</p>
                <div className="mt-auto flex items-center gap-[1rem]">
                    <ReactionButton selected={selected} onSelect={onSelect} />
                    <button type="button" className="text-sm">Comment</button>
                    <button type="button" className="text-sm">Share</button>
                </div>
            </div>
        </div>
    );
}

export default function ReactionButtonHarness() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return (
        <main style={{ maxWidth: 640, margin: '0 auto', padding: 16 }} data-hydrated={hydrated ? 'yes' : 'no'}>
            <h1>ReactionButton — isolated</h1>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <HarnessCard key={i} index={i} />
            ))}
        </main>
    );
}
