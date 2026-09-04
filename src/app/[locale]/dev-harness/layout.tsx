import { notFound } from 'next/navigation';

/**
 * Gate for every development harness page under `/[locale]/dev-harness/*`.
 *
 * These routes mount real product components in isolation so the end-to-end
 * suite in `e2e/` can drive them with a real browser. They are developer tools,
 * not product: they render no real data, they are not linked from anywhere, and
 * they must never be reachable on a deployed site — an unlinked page is still a
 * public one, and these would be indexable.
 *
 * `notFound()` here covers the whole subtree, so a new harness page is guarded
 * by existing simply by being placed under this directory. `force-dynamic` is
 * what makes the guard a REQUEST-time decision: without it Next would prerender
 * the outcome at build time and the escape hatch below could never open.
 *
 * `ENABLE_DEV_HARNESS=1` opts a production build back in, so the suite can be
 * run against the real optimised bundle rather than only against `next dev`.
 * Nothing sets it in deployment.
 */
export const dynamic = 'force-dynamic';

export default function DevHarnessLayout({ children }: { children: React.ReactNode }) {
    const enabled =
        process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_HARNESS === '1';
    if (!enabled) notFound();
    return <>{children}</>;
}
