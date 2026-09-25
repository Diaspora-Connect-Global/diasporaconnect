'use client';

/**
 * Profile "Socials" harness — SocialLinksPanel with seeded links and a FAKE
 * transport, rendered as the owner sees it and as another member sees it,
 * inside the same card as the real tab. Gated by the dev-harness layout (404 in
 * production).
 *
 * Fake server: add → PENDING, then CONFIRMED ~1.5s later (github/website) or
 * UNCONFIRMED (everything else); inputs starting "dup" → DUPLICATE; re-check →
 * RATE_LIMITED. `?state=empty|error|loading` renders those states for both views.
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import SocialLinksPanel, { type SocialLinkOps } from '@/components/profile/socials/SocialLinksPanel';
import { previewSocialLink, type SocialLink, type SocialPlatform } from '@/lib/socialLinks';

const SEED: SocialLink[] = [
  { id: 'l1', platform: 'LINKEDIN', url: 'https://www.linkedin.com/in/ama-mensah', handle: 'ama-mensah', status: 'UNCONFIRMED', checkedAt: '2026-09-24T09:00:00Z' },
  { id: 'l2', platform: 'GITHUB', url: 'https://github.com/amamensah', handle: 'amamensah', status: 'CONFIRMED', title: 'amamensah - Overview', siteName: 'GitHub', checkedAt: '2026-09-24T09:00:00Z' },
  { id: 'l3', platform: 'INSTAGRAM', url: 'https://www.instagram.com/ama.designs/', handle: '@ama.designs', status: 'CONFIRMED', title: 'Ama Mensah (@ama.designs) • Instagram photos and videos', checkedAt: '2026-09-24T09:00:00Z' },
  { id: 'l4', platform: 'X', url: 'https://x.com/amamensah_old', handle: '@amamensah_old', status: 'NOT_FOUND', checkedAt: '2026-09-24T09:00:00Z' },
  { id: 'l5', platform: 'WEBSITE', url: 'https://amamensah.design/', handle: 'amamensah.design', status: 'PENDING' },
];

const noop = { success: () => undefined, error: () => undefined };

function Harness() {
  const params = useSearchParams();
  const state = params.get('state');
  const [links, setLinks] = useState<SocialLink[]>(state === 'empty' || state === 'error' || state === 'loading' ? [] : SEED);
  const [toasts, setToasts] = useState<string[]>([]);

  const settle = useCallback((id: string, platform: SocialPlatform) => {
    setTimeout(() => {
      setLinks((ls) =>
        ls.map((l) =>
          l.id === id
            ? { ...l, status: platform === 'GITHUB' || platform === 'WEBSITE' ? 'CONFIRMED' : 'UNCONFIRMED', checkedAt: new Date().toISOString() }
            : l,
        ),
      );
    }, 1500);
  }, []);

  const ops = useMemo<SocialLinkOps>(
    () => ({
      add: async (platform, input) => {
        await new Promise((r) => setTimeout(r, 200));
        if (input.startsWith('dup')) return { success: false, code: 'DUPLICATE', message: 'dup' };
        const p = previewSocialLink(platform, input);
        if (!p.ok) return { success: false, code: 'INVALID_URL' };
        const link: SocialLink = { id: `n${Date.now()}`, platform, url: p.url, handle: p.handle, status: 'PENDING' };
        setLinks((ls) => [...ls, link]);
        settle(link.id, platform);
        return { success: true, link };
      },
      update: async (id, input) => {
        const current = links.find((l) => l.id === id);
        if (!current) return { success: false, code: 'NOT_FOUND' };
        const p = previewSocialLink(current.platform, input);
        if (!p.ok) return { success: false, code: 'INVALID_URL' };
        setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, url: p.url, handle: p.handle, status: 'PENDING', title: null } : l)));
        settle(id, current.platform);
        return { success: true };
      },
      remove: async (id) => {
        setLinks((ls) => ls.filter((l) => l.id !== id));
        return { success: true };
      },
      recheck: async () => ({ success: false, code: 'RATE_LIMITED', retryAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString() }),
    }),
    [links, settle],
  );

  const notify = useMemo(
    () => ({
      success: (m: string) => setToasts((t) => [...t, `ok: ${m}`]),
      error: (m: string) => setToasts((t) => [...t, `err: ${m}`]),
    }),
    [],
  );

  const card = (children: React.ReactNode) => (
    <Card className="p-0 lg:rounded-2xl lg:border-[#E7ECF5] lg:shadow-none">
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2" style={{ background: '#F4F6FB' }}>
      <section className="min-w-0" data-testid="own-view" aria-label="Own profile">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1B2A5E]/60">Own profile</p>
        {card(
          <SocialLinksPanel
            isOwnProfile
            links={links}
            loading={state === 'loading'}
            error={state === 'error'}
            onRetry={() => undefined}
            ops={ops}
            notify={notify}
          />,
        )}
      </section>
      <section className="min-w-0" data-testid="other-view" aria-label="Someone else's profile">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1B2A5E]/60">Viewed by another member</p>
        {card(
          <SocialLinksPanel
            isOwnProfile={false}
            links={links}
            loading={state === 'loading'}
            error={state === 'error'}
            onRetry={() => undefined}
            notify={noop}
          />,
        )}
      </section>
      <ul data-testid="toasts" className="text-xs text-[#1B2A5E]/70 lg:col-span-2">
        {toasts.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ProfileSocialsHarness() {
  return (
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
}
