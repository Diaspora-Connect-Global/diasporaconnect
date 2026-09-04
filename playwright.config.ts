import { defineConfig } from '@playwright/test';

/**
 * End-to-end suite (`npm run test:e2e`).
 *
 * The specs live in `e2e/` and drive the development harness pages under
 * `/[locale]/dev-harness/*`, which mount real product components in isolation.
 * Those routes 404 in a production build unless `ENABLE_DEV_HARNESS=1` is set,
 * so by default the suite starts and talks to `next dev`.
 *
 * Running it elsewhere:
 *   E2E_BASE_URL=http://localhost:3111   use a server that is already running
 *                                        (with `ENABLE_DEV_HARNESS=1` if it is
 *                                        a production build) instead of
 *                                        starting one
 *   E2E_PORT=3111                        change the port the dev server uses
 *   PLAYWRIGHT_CDP_URL=ws://…            attach to a Chrome already listening on
 *                                        a DevTools endpoint instead of letting
 *                                        Playwright launch one; required on
 *                                        hosts Playwright ships no browser build
 *                                        for. See e2e/support/browser.ts.
 *
 * Each spec opens its own browser and its own context per test, because the
 * touch cases need per-test touch and mobile emulation. So there are no
 * `projects` here and `use.browserName` is not consulted.
 */
const PORT = Number(process.env.E2E_PORT ?? 3111);
const EXTERNAL_BASE_URL = process.env.E2E_BASE_URL;
// `localhost`, deliberately NOT `127.0.0.1`. Next's dev server treats its own
// HMR/dev-client assets as same-origin only; reached on the numeric loopback it
// BLOCKS them, React never hydrates, and every spec times out waiting for the
// page to come alive. Same machine, different spelling, completely different
// outcome — and the failure looks like a browser problem, not a URL one.
const baseURL = EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
    testDir: './e2e',
    // Generous: these are real gestures with real hold timings, against a dev
    // server that may compile the page on first request.
    timeout: 120_000,
    expect: { timeout: 10_000 },
    // Serial on purpose. The rail's position is persisted to a single
    // localStorage key, and the touch specs assert on scroll position, both of
    // which are cross-talk waiting to happen under parallelism.
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL,
        actionTimeout: 15_000,
        trace: 'retain-on-failure',
    },
    webServer: EXTERNAL_BASE_URL
        ? undefined
        : {
              command: `node scripts/copy-pdf-worker.mjs && npx next dev -p ${PORT}`,
              url: baseURL,
              reuseExistingServer: true,
              timeout: 300_000,
              stdout: 'ignore',
              stderr: 'pipe',
          },
});
