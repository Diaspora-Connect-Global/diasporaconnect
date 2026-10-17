import { Suspense } from 'react';
import { FriendsView } from '@/components/friends/FriendsView';

/** `/friends` — Discover, Requests, Sent and Friends, deep-linked with `?tab=`. */
export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <FriendsView />
    </Suspense>
  );
}
