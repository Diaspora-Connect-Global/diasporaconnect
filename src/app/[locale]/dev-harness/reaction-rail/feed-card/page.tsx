'use client';

/**
 * ReactionButton harness — the REAL FeedCard2 inside the real feed chrome.
 * Reactions are exercised against the card's own state; no mutation is sent
 * (the harness passes no onReact callback).
 */

import { useEffect, useState } from 'react';
import FeedCard2 from '@/components/home2/FeedCard2';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

export default function ReactionButtonFeedCardHarness() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return (
        <div className="h-app-inner flex overflow-hidden" data-hydrated={hydrated ? 'yes' : 'no'}>
            <main className={FEED_COLUMN_CLASS} data-testid="feed-column">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div className="mb-2" key={i}>
                        <div id={`feed-post-${i}`} className="feed-card-cv">
                            <FeedCard2
                                postId={`post-${i}`}
                                profileImage="/favicon.svg"
                                profileName={`Author ${i}`}
                                category="USER"
                                postDate="2h"
                                content={`This is harness post ${i}. `.repeat(20)}
                                likes={3}
                                comments={2}
                                shares={1}
                            />
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}
