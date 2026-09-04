'use client';

import MainLayout from '@/app/[locale]/(protected)/(main)/layout';
import HomeLayout from '@/app/[locale]/(protected)/(main)/(home)/layout';
import HomeFeed2 from '@/components/home2/HomeFeed2';

/**
 * Composes the `/home2` feed — the independent clone of the root feed.
 *
 * Mirrors `AuthedHomeFeed` exactly, with ONE deliberate difference: it renders
 * `components/home2/HomeFeed2` (a snapshot copy) rather than the live
 * `(home)/home/page`. The two app shells are still the SHARED originals —
 * `MainLayout` carries the auth and profile guards, websocket providers and
 * header, and `HomeLayout` the sidebar. Cloning those too would have forked the
 * auth guards, which is the last thing that should ever exist in two versions.
 *
 * So: the page content is independent, the shell is not. A fix to the guards
 * reaches `/home2` automatically; a fix to the feed does not.
 */
export default function Home2Feed() {
  return (
    <MainLayout>
      <HomeLayout>
        <HomeFeed2 />
      </HomeLayout>
    </MainLayout>
  );
}
