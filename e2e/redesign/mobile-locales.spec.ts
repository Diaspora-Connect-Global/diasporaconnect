/**
 * Phone layout in every language: no page may be wider than the screen.
 *
 * Longer labels (French "Toutes les publications", German compounds) used to
 * push the Home feed's tab row past a 375 px phone, so the whole page scrolled
 * sideways and every card looked cut off on the left. This walks the main pages
 * at 375 px in all five locales and names any element that sticks out, ignoring
 * deliberate horizontal scrollers (carousels with overflow-x auto/hidden).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';

const LOCALES = ['en', 'fr', 'de', 'nl', 'it'] as const;
/** Checked on every run. */
const CORE_PAGES = ['/home', '/community', '/discover', '/feed?hashtag=diaspora'];
/** The rest of the everyday pages — run with MOBILE_LOCALES_FULL=1 (slow on a cold dev server). */
const MORE_PAGES = [
    '/events', '/events/create', '/opportunities', '/opportunities/employment-career', '/marketplace',
    '/people', '/friends', '/groups', '/circles', '/circles/invitations', '/notification', '/chat',
    '/profile', '/settings', '/saved', '/search?q=ghana', '/wallet', '/more', '/association', '/requests',
    '/vendors', '/becomeavendor', '/create-post', '/post/00000000-0000-4000-8000-0000000b0001',
    '/help', '/about', '/privacy', '/terms', '/contact',
];
const PAGES = process.env.MOBILE_PAGES
    ? process.env.MOBILE_PAGES.split(',').map((p) => p.trim()).filter(Boolean) // re-check a subset
    : process.env.MOBILE_LOCALES_FULL === '1' ? [...CORE_PAGES, ...MORE_PAGES] : CORE_PAGES;
const PHONE = { width: 375, height: 812 };

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

/**
 * What sticks out on a phone:
 *  1. a VERTICAL scroll container (a page column) that also scrolls sideways —
 *     the bug in the screenshot: the column scrolled left and cut every card;
 *  2. any element past the viewport's right edge.
 * Carousels (containers that scroll only sideways) and clipped boxes are allowed.
 */
async function overflowReport(page: Page) {
    return page.evaluate(() => {
        const vw = window.innerWidth;
        const style = (el: Element) => getComputedStyle(el);
        const scrollsX = (el: Element) => ['auto', 'scroll'].includes(style(el).overflowX);
        const isCarousel = (el: Element) => scrollsX(el) && el.scrollHeight <= el.clientHeight + 1;
        const clipsX = (el: Element) => ['hidden', 'clip'].includes(style(el).overflowX);
        const shielded = (el: Element, upTo: Element | null) => {
            for (let p = el.parentElement; p && p !== upTo && p !== document.body; p = p.parentElement) {
                if (isCarousel(p) || clipsX(p)) return true;
            }
            return false;
        };
        const describe = (el: Element) => {
            const r = el.getBoundingClientRect();
            const id = el.getAttribute('data-testid') || el.id || '';
            const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 4).join('.');
            return `${el.tagName.toLowerCase()}${id ? `#${id}` : ''}${cls ? `.${cls}` : ''} right=${Math.round(r.right)} w=${Math.round(r.width)} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
        };
        const all = Array.from(document.body.querySelectorAll('*'));
        const culprits: string[] = [];
        for (const col of all) {
            if (!scrollsX(col) || isCarousel(col) || col.scrollWidth <= col.clientWidth + 1) continue;
            culprits.push(`column scrolls sideways: ${describe(col)} scrollWidth=${col.scrollWidth} > clientWidth=${col.clientWidth}`);
            const edge = col.getBoundingClientRect().left + col.clientWidth;
            let n = 0;
            for (const c of Array.from(col.querySelectorAll('*'))) {
                const r = c.getBoundingClientRect();
                if (r.width === 0 || r.right <= edge + 1 || shielded(c, col)) continue;
                culprits.push(`  -> ${describe(c)}`);
                if (++n >= 6) break;
            }
        }
        for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || r.right <= vw + 1 || shielded(el, null)) continue;
            culprits.push(`past the screen: ${describe(el)}`);
            if (culprits.length >= 14) break;
        }
        return { scrollWidth: document.documentElement.scrollWidth, vw, culprits };
    });
}

for (const path of PAGES) {
    test(`${path} fits a 375 px phone in every language`, async () => {
        test.setTimeout(900_000);
        const { page } = await open(browser, '/home', {}, PHONE);
        const failures: string[] = [];
        for (const locale of LOCALES) {
            await page.goto(`/${locale}${path}`, { waitUntil: 'load', timeout: 180_000 });
            // Pages outside the app shell (about, legal) have no app header; wait for real content instead.
            await page.locator('main, header.h-app-top-down, h1').first().waitFor({ state: 'visible', timeout: 90_000 });
            await page.waitForTimeout(1500); // let lazy sections and fonts settle
            const r = await overflowReport(page);
            if (r.scrollWidth > r.vw + 1 || r.culprits.length > 0) {
                failures.push(`[${locale}] ${path}: page ${r.scrollWidth}px > ${r.vw}px\n    ${r.culprits.join('\n    ')}`);
            }
        }
        expect(failures, failures.join('\n')).toEqual([]);
        await page.context().close();
    });
}
