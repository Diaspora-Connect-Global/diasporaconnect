/**
 * Gated communities/associations in a real browser. The REAL detail pages are
 * mounted by `/en/dev-harness/community-gate/<id>` and
 * `/en/dev-harness/association-gate/<id>`; GraphQL is answered here by a small
 * in-memory server that RECORDS every operation, so "no content query was sent
 * for a locked community" is asserted on the wire, not inferred.
 */
import { test, expect, type Browser, type Page, type Route } from '@playwright/test';
import { openBrowser } from '../support/browser';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

/** The only operations a LOCKED page may send: the verdict + the membership probe. */
const ALLOWED_WHEN_LOCKED = new Set(['GetCommunityDetails', 'CheckCommunityMembership', 'GetAssociationDetails', 'GetMyAssociations']);

type Overrides = Partial<{
    isContentLocked: boolean;
    joinPolicy: string;
    visibility: string;
    paymentType: string;
    priceAmount: number | null;
    priceCurrency: string | null;
    membershipStatus: string;
}>;

function fakeServer(kind: 'community' | 'association', initial: Overrides) {
    const state = {
        isContentLocked: true,
        joinPolicy: 'APPROVAL',
        visibility: 'PRIVATE',
        paymentType: 'NONE',
        priceAmount: null as number | null,
        priceCurrency: null as string | null,
        membershipStatus: 'NOT_MEMBER',
        ...initial,
    };
    const ops: string[] = [];
    const detail = () => {
        const base = {
            id: 'c-1',
            name: 'Ghana Union',
            description: 'A place for Ghanaians abroad.',
            joinPolicy: state.joinPolicy,
            visibility: state.visibility,
            paymentType: state.paymentType,
            priceAmount: state.priceAmount,
            priceCurrency: state.priceCurrency,
            memberCount: 42,
            avatarUrl: null,
            defaultGroupId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            membershipStatus: state.membershipStatus,
            isContentLocked: state.isContentLocked,
            enabledServices: state.isContentLocked ? [] : null,
        };
        return kind === 'community'
            ? {
                  getCommunity: {
                      __typename: 'Community', ...base, communityRules: null, bannerUrl: null, contactEmail: null,
                      contactPhone: null, address: null, locationCountry: null, communityType: null, embassyProfile: null,
                  },
              }
            : { getAssociation: { __typename: 'Association', ...base, associationType: null } };
    };
    async function handle(route: Route) {
        const body = route.request().postDataJSON() as { operationName?: string; query?: string };
        const name = body.operationName ?? /(?:query|mutation)\s+(\w+)/.exec(body.query ?? '')?.[1] ?? 'anonymous';
        ops.push(name);
        let payload: Record<string, unknown>;
        if (name === 'GetCommunityDetails' || name === 'GetAssociationDetails') {
            payload = { data: detail() };
        } else if (name === 'CheckCommunityMembership') {
            payload = { data: { checkCommunityMembership: { __typename: 'MembershipCheck', isMember: !state.isContentLocked, role: null, status: state.membershipStatus } } };
        } else if (name === 'GetMyAssociations') {
            payload = { data: { getMyAssociations: { __typename: 'AssociationList', associations: [] } } };
        } else if (name === 'RequestMembershipCommunity') {
            state.isContentLocked = false;
            state.membershipStatus = 'ACTIVE';
            payload = {
                data: {
                    requestMembership: {
                        __typename: 'MembershipResult', id: 'm-1', status: 'ACTIVE', message: null, requiresPayment: false, clientSecret: null,
                    },
                },
            };
        } else {
            // Content operations are not stubbed: if a test lets one through it is recorded and answered with an error.
            payload = { data: null, errors: [{ message: 'not stubbed in harness' }] };
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    return { ops, handle };
}

async function open(server: ReturnType<typeof fakeServer>, path: string): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.route('**/graphql', server.handle);
    await page.goto(path, { waitUntil: 'load' });
    return page;
}

const COMMUNITY = '/en/dev-harness/community-gate/c-1';
const preview = (p: Page) => p.getByTestId('locked-community-preview');
/** Buttons INSIDE the preview card (the page also carries unrelated dev-overlay/toaster buttons). */
const actionButtons = (p: Page) => preview(p).getByRole('button');

test('APPROVAL: preview with a single "Request to join" action', async () => {
    const server = fakeServer('community', { joinPolicy: 'APPROVAL' });
    const page = await open(server, COMMUNITY);
    await expect(preview(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Ghana Union' })).toBeVisible();
    await expect(page.getByText('42 members')).toBeVisible();
    await expect(actionButtons(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible();
    await page.context().close();
});

test('PAID: "Pay to join" opens the existing payment flow', async () => {
    const server = fakeServer('community', { joinPolicy: 'PAID', paymentType: 'ONE_TIME', priceAmount: 2500, priceCurrency: 'GHS' });
    const page = await open(server, COMMUNITY);
    await expect(preview(page)).toHaveAttribute('data-action', 'pay');
    await expect(page.getByRole('button', { name: 'Pay to join' })).toBeVisible();
    await page.getByRole('button', { name: 'Pay to join' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.context().close();
});

test('INVITE_ONLY: no button, explanatory text', async () => {
    const server = fakeServer('community', { joinPolicy: 'INVITE_ONLY' });
    const page = await open(server, COMMUNITY);
    await expect(page.getByText('Invite only — you need an invitation to join')).toBeVisible();
    await expect(actionButtons(page)).toHaveCount(0);
    await page.context().close();
});

test('PENDING: request-pending state with cancel, no join button', async () => {
    const server = fakeServer('community', { membershipStatus: 'PENDING' });
    const page = await open(server, COMMUNITY);
    await expect(page.getByText('Request pending approval')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel request' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request to join' })).toHaveCount(0);
    await page.context().close();
});

test('BANNED: neutral text and no action', async () => {
    const server = fakeServer('community', { membershipStatus: 'BANNED' });
    const page = await open(server, COMMUNITY);
    await expect(page.getByText("You can't join this community")).toBeVisible();
    await expect(actionButtons(page)).toHaveCount(0);
    await page.context().close();
});

for (const query of ['', '?tab=events', '?tab=community', '?tab=services', '?settings=1']) {
    test(`locked community sends NO content operation on ${query || 'the plain URL'}`, async () => {
        const server = fakeServer('community', {});
        const page = await open(server, `${COMMUNITY}${query}`);
        await expect(preview(page)).toBeVisible();
        await page.waitForTimeout(1500); // a leaked query would have been sent by now
        const leaked = server.ops.filter((o) => !ALLOWED_WHEN_LOCKED.has(o));
        expect(leaked, `sent: ${server.ops.join(', ')}`).toEqual([]);
        expect(server.ops).not.toContain('GetFeed');
        await page.context().close();
    });
}

test('locked association: preview, one action, and no content operation', async () => {
    const server = fakeServer('association', { joinPolicy: 'APPROVAL' });
    const page = await open(server, '/en/dev-harness/association-gate/a-1?settings=1');
    await expect(preview(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(server.ops.filter((o) => !ALLOWED_WHEN_LOCKED.has(o)), server.ops.join(', ')).toEqual([]);
    await page.context().close();
});

test('unlocked community DOES fire the feed query', async () => {
    const server = fakeServer('community', { isContentLocked: false, joinPolicy: 'OPEN', visibility: 'PUBLIC', membershipStatus: 'ACTIVE' });
    const page = await open(server, COMMUNITY);
    await expect.poll(() => server.ops.includes('GetFeed')).toBe(true);
    await expect(preview(page)).toHaveCount(0);
    await page.context().close();
});

test('joining flips the preview to the full page and only then fires content queries', async () => {
    const server = fakeServer('community', { joinPolicy: 'APPROVAL' });
    const page = await open(server, COMMUNITY);
    await expect(preview(page)).toBeVisible();
    expect(server.ops).not.toContain('GetFeed');
    await page.getByRole('button', { name: 'Request to join' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Request to join' }).click();
    await expect(preview(page)).toHaveCount(0);
    await expect.poll(() => server.ops.includes('GetFeed')).toBe(true);
    await page.context().close();
});
