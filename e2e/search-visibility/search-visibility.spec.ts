/**
 * Settings → Privacy → "Show me in search results" on the isolated harness
 * (`/en/dev-harness/search-visibility`): the REAL section, with GraphQL
 * answered here via page.route. The switch must never claim "on" unless the
 * server says so — loading, error + retry, off, on — and only moves after the
 * server has answered and been re-read.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/search-visibility';
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

type Op = { name: string; variables: Record<string, unknown> };
type Responder = (op: Op) => unknown | Promise<unknown>;

/** A GraphQL double keyed by operation name; records every operation sent. */
function fakeServer(handlers: Record<string, Responder>) {
    const ops: Op[] = [];
    async function handle(route: Route) {
        const body = route.request().postDataJSON() as { operationName?: string; variables?: Record<string, unknown> };
        const op = { name: body?.operationName ?? '', variables: body?.variables ?? {} };
        ops.push(op);
        const handler = handlers[op.name];
        const result = handler ? await handler(op) : { data: null };
        const payload =
            result && typeof result === 'object' && ('data' in (result as object) || 'errors' in (result as object))
                ? result
                : { data: result };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    return { handle, ops, calls: (name: string) => ops.filter((o) => o.name === name) };
}

const visibility = (searchable: boolean) => ({
    mySearchVisibility: { __typename: 'SearchVisibility', searchable },
});
const saved = (searchable: boolean) => ({
    updateSearchVisibility: { __typename: 'SearchVisibility', searchable },
});
const failure = (message: string) => ({ data: null, errors: [{ message, extensions: { code: 'INTERNAL_SERVER_ERROR' } }] });

async function open(server: ReturnType<typeof fakeServer>): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(HARNESS, { waitUntil: 'load' });
    await expect(page.getByTestId('harness-ready')).toBeVisible({ timeout: 90_000 });
    return page;
}

const sw = (p: Page) => p.getByTestId('search-visibility-switch');

test('while the setting loads the switch is disabled and OFF — never a guessed "on"', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const page = await open(
        fakeServer({
            MySearchVisibility: async () => {
                await gate;
                return visibility(true);
            },
        }),
    );

    await expect(page.getByTestId('search-visibility-status')).toContainText('Checking');
    await expect(sw(page)).toBeDisabled();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'false');

    release();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page)).toBeEnabled();
    await expect(page.getByText('Show me in search results')).toBeVisible();
    await page.context().close();
});

test('a server that says OFF shows OFF', async () => {
    const page = await open(fakeServer({ MySearchVisibility: () => visibility(false) }));
    await expect(sw(page)).toBeEnabled();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
    await page.context().close();
});

test('a failed read shows a translated error + Retry, the switch stays disabled/off; Retry recovers', async () => {
    let attempts = 0;
    const page = await open(
        fakeServer({
            MySearchVisibility: () => {
                attempts += 1;
                return attempts === 1 ? failure('Your search visibility setting is temporarily unavailable') : visibility(true);
            },
        }),
    );

    await expect(page.getByTestId('search-visibility-error')).toContainText('We couldn’t load this setting.');
    await expect(sw(page)).toBeDisabled();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
    // Its own message, not the global "Something went wrong" toast.
    await expect(page.getByText('Something went wrong. Please try again.')).toHaveCount(0);

    await page.getByTestId('search-visibility-retry').click();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
    await page.context().close();
});

test('turning it off: the switch moves only after the server answers, and the setting is re-read', async () => {
    let searchable = true;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const server = fakeServer({
        MySearchVisibility: () => visibility(searchable),
        UpdateSearchVisibility: async (op) => {
            await gate;
            searchable = op.variables.searchable === true;
            return saved(searchable);
        },
    });
    const page = await open(server);
    await expect(sw(page)).toHaveAttribute('aria-checked', 'true');

    await sw(page).click();
    // Saving: disabled, and still showing the server's last answer.
    await expect(sw(page)).toBeDisabled();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
    expect(server.calls('UpdateSearchVisibility').map((o) => o.variables)).toEqual([{ searchable: false }]);

    release();
    await expect(page.getByText('You’re now hidden from search results.')).toBeVisible();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
    await expect(sw(page)).toBeEnabled();
    expect(server.calls('MySearchVisibility').length).toBeGreaterThanOrEqual(2);

    // Nothing the section renders carries a user id.
    expect(await page.locator('body').innerText()).not.toMatch(UUID_RE);
    await page.context().close();
});

test('a refused save says so and leaves the server value in place', async () => {
    const server = fakeServer({
        MySearchVisibility: () => visibility(true),
        UpdateSearchVisibility: () => failure('Could not save your search visibility setting. Please try again.'),
    });
    const page = await open(server);
    await expect(sw(page)).toHaveAttribute('aria-checked', 'true');

    await sw(page).click();
    await expect(page.getByText('Couldn’t save this setting. Please try again.')).toBeVisible();
    await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page)).toBeEnabled();
    // No false success.
    await expect(page.getByText('You’re now hidden from search results.')).toHaveCount(0);
    await page.context().close();
});
