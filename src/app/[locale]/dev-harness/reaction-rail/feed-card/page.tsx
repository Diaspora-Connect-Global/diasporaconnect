'use client';

/**
 * ReactionRail harness — the REAL FeedCard2 inside the real feed chrome.
 *
 * As close to `/[locale]/home2` as an unauthenticated page can get: same
 * column, same wrappers, same card component. That matters because the rail's
 * travel is derived from measurements of the card it happens to be in —
 * `offsetTop`, `offsetLeft`, `clientWidth`, `clientHeight` — and a stand-in
 * card produces stand-in numbers. On a real text post the rail has roughly 75px
 * of upward travel and 8px of rightward travel; a mock card can easily give it
 * ten times that and hide a clamping bug completely.
 *
 * The GraphQL mutations FeedCard2 wires up are never fired here: nothing in the
 * suite submits a reaction to the server, only to the card's own state.
 */

import { useEffect, useState } from 'react';
import FeedCard2 from '@/components/home2/FeedCard2';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

export default function ReactionRailFeedCardHarness() {
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
