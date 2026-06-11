'use client';

import MainLayout from '@/app/[locale]/(protected)/(main)/layout';
import HomeLayout from '@/app/[locale]/(protected)/(main)/(home)/layout';
import Home from '@/app/[locale]/(protected)/(main)/(home)/home/page';

/**
 * Renders the authenticated feed homepage (`/home`) in place at the public
 * root (`/[locale]`) so both URLs surface the same content for signed-in users.
 *
 * It composes the very same building blocks the `/home` route uses — the main
 * app shell (`MainLayout`: auth + profile guards, websocket providers, header)
 * and the home sidebar layout (`HomeLayout`) — so behaviour stays in lockstep
 * with `/home` with zero duplication. Loaded lazily (see AuthedHome) so the
 * heavy feed bundle never ships to crawlers or logged-out visitors.
 */
export default function AuthedHomeFeed() {
  return (
    <MainLayout>
      <HomeLayout>
        <Home />
      </HomeLayout>
    </MainLayout>
  );
}
