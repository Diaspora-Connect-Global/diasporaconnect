import { chromium, type Browser } from '@playwright/test';

/**
 * Open the browser the suite drives.
 *
 * Normally Playwright launches one itself. `PLAYWRIGHT_CDP_URL` overrides that
 * and ATTACHES to a Chrome already listening on a DevTools endpoint, which is
 * the only way to run this suite on hosts Playwright no longer ships a browser
 * build for (macOS 13, for one) — start Chrome with
 * `--remote-debugging-port=9222 --headless=new` and pass its
 * `ws://127.0.0.1:9222/devtools/browser/<id>` URL.
 *
 * The locally installed Chrome is preferred over the bundled Chromium so the
 * gestures are exercised against the engine users actually have; the bundled
 * one is the fallback when no Chrome is installed.
 */
export async function openBrowser(): Promise<Browser> {
    const cdp = process.env.PLAYWRIGHT_CDP_URL;
    if (cdp) return chromium.connectOverCDP(cdp);
    try {
        return await chromium.launch({ channel: 'chrome' });
    } catch {
        return await chromium.launch();
    }
}
