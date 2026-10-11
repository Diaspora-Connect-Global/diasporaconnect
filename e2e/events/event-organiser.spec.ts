/**
 * The organiser side: who may create events (the picker lists only the
 * communities/associations the person administers), the manage page for
 * organiser events (Approvals / Programme / Speakers / Updates / Staff) and its
 * read-only explanation for legacy user-owned events, and the events-only
 * community landing on its Events tab.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { COMMUNITY_OVERRIDES, SHELL_OVERRIDES } from '../support/fakeSession';
import { EVENT_ID, OWNER_ID, ORGANISER_NAME, eventFixture, myCommunities, openPage, type Overrides } from '../support/eventFixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const ASSOC_ID = '00000000-0000-4000-8000-0000000a0e02';
const membership = (role: string, status = 'ACTIVE') => ({ __typename: 'Membership', status, role, joinedAt: '2026-01-01T00:00:00.000Z' });

const myEntities = (communities: Array<[string, string, string]>, associations: Array<[string, string, string]> = []): Overrides => ({
    ...SHELL_OVERRIDES,
    ...myCommunities(communities),
    GetMyAssociations: {
        getMyAssociations: {
            __typename: 'MyAssociations',
            total: associations.length,
            associations: associations.map(([id, name, role]) => ({ __typename: 'Association', id, name, description: null, avatarUrl: null, memberCount: 5, defaultGroupId: null, myMembership: membership(role) })),
        },
    },
});

test('someone who administers nothing gets an explanation, and no create entry point', async () => {
    const overrides = myEntities([[OWNER_ID, 'Member-only Club', 'MEMBER']]);
    const create = await openPage(browser, '/events/create', overrides);
    await expect(create.page.getByTestId('no-organiser')).toContainText("You can't create events yet", { timeout: 90_000 });
    await expect(create.page.getByTestId('organiser-picker')).toHaveCount(0);
    await create.page.context().close();

    const list = await openPage(browser, '/events', overrides);
    await expect(list.page.getByText('Your events')).toBeVisible({ timeout: 90_000 });
    await expect(list.page.getByTestId('create-event-link')).toHaveCount(0);
    await list.page.context().close();
});

test('the organiser picker lists only communities and associations the person administers', async () => {
    const overrides = myEntities(
        [
            [OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN'],
            ['00000000-0000-4000-8000-0000000c0e09', 'Just A Member', 'MEMBER'],
            ['00000000-0000-4000-8000-0000000c0e08', 'A Moderator Club', 'MODERATOR'],
        ],
        [[ASSOC_ID, 'Nurses Association', 'ASSOCIATION_ADMIN']],
    );
    const { page } = await openPage(browser, '/events/create', overrides);
    const picker = page.locator('#organiser');
    await expect(picker).toBeVisible({ timeout: 90_000 });
    const options = (await picker.locator('option').allTextContents()).map((s) => s.trim());
    expect(options).toContain(ORGANISER_NAME);
    expect(options).toContain('Nurses Association');
    expect(options).not.toContain('Just A Member');
    expect(options).not.toContain('A Moderator Club');
    await page.context().close();

    const list = await openPage(browser, '/events', overrides);
    await expect(list.page.getByTestId('create-event-link')).toBeVisible({ timeout: 90_000 });
    await list.page.context().close();
});

test('creating an event sends the chosen organiser, never the person as owner', async () => {
    const overrides: Overrides = {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']], [[ASSOC_ID, 'Nurses Association', 'ASSOCIATION_ADMIN']]),
        CreateEvent: { createEvent: { __typename: 'EventGQL', id: EVENT_ID, title: 'Gala', status: 'draft' } },
    };
    const { page, graphql } = await openPage(browser, '/events/create', overrides);
    await page.locator('#organiser').selectOption({ label: 'Nurses Association' }, { timeout: 90_000 });
    await page.locator('#title').fill('Gala night');
    await page.locator('#description').fill('An evening for everyone.');
    await page.locator('#category').selectOption('Community');
    await page.locator('#startAt').fill('2030-11-20T18:00');
    await page.locator('#endAt').fill('2030-11-20T22:00');
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.locator('#city').fill('Berlin');
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect.poll(() => graphql.calls.some((c) => c.name === 'CreateEvent')).toBe(true);
    const input = graphql.calls.find((c) => c.name === 'CreateEvent')!.variables.input as Record<string, unknown>;
    expect(input.ownerType).toBe('association');
    expect(input.ownerId).toBe(ASSOC_ID);
    await page.context().close();
});

test('a refused creation (organiser rule) shows its reason instead of a false success', async () => {
    const overrides: Overrides = {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']]),
        CreateEvent: { __errors: [{ message: 'EVENT_ORGANISER_NOT_ADMIN: nope', code: 'EVENT_ORGANISER_NOT_ADMIN' }] },
    };
    const { page } = await openPage(browser, '/events/create', overrides);
    await page.locator('#title').fill('Gala night', { timeout: 90_000 });
    await page.locator('#description').fill('An evening for everyone.');
    await page.locator('#category').selectOption('Community');
    await page.locator('#startAt').fill('2030-11-20T18:00');
    await page.locator('#endAt').fill('2030-11-20T22:00');
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.locator('#city').fill('Berlin');
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('You can only create events for communities or associations you administer.')).toBeVisible();
    await expect(page).toHaveURL(/\/events\/create/);
    await page.context().close();
});

// ─── Manage page ─────────────────────────────────────────────────────────────

const manageEvent = (over: Record<string, unknown> = {}) => ({ getEvent: eventFixture(over) });
const profile = (id: string, first: string, last: string) => ({
    getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { __typename: 'Profile', userId: id, username: first.toLowerCase(), email: null, firstName: first, middleName: null, lastName: last, avatarUrl: null } },
});

test('a legacy user-owned event is read-only and says why', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}/manage`, { ...myEntities([]), GetEvent: manageEvent({ ownerType: 'user' }) });
    const box = page.getByTestId('legacy-readonly');
    await expect(box).toContainText('This event is read-only', { timeout: 90_000 });
    await expect(box).toContainText('before events moved to communities and associations');
    await expect(page.getByRole('tab')).toHaveCount(0);
    await page.context().close();
});

test('an organiser event gets Approvals, Programme, Speakers, Updates and Staff next to the existing tabs', async () => {
    const { page } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=programme`, {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']]),
        GetEvent: manageEvent(),
        EventProgramme: { eventProgramme: [] },
        EventSpeakers: { eventSpeakers: [] },
    });
    await expect(page.getByTestId('manage-programme')).toBeVisible({ timeout: 90_000 });
    const names = (await page.getByRole('tab').allTextContents()).map((s) => s.trim());
    for (const n of ['Overview', 'Registrations', 'Attendance', 'Tickets', 'Settings', 'Approvals', 'Programme', 'Speakers', 'Updates', 'Staff']) expect(names).toContain(n);
    await expect(page.getByRole('tab', { name: 'Programme' })).toHaveAttribute('aria-selected', 'true');
    await page.context().close();
});

test('programme: a session is saved in the EVENT timezone; a dark-launch refusal reads as "not available yet"', async () => {
    const base: Overrides = {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']]),
        GetEvent: manageEvent(),
        EventProgramme: { eventProgramme: [] },
        EventSpeakers: { eventSpeakers: [] },
    };
    const ok = await openPage(browser, `/events/${EVENT_ID}/manage?tab=programme`, { ...base, UpsertEventProgrammeSession: { upsertEventProgrammeSession: { __typename: 'EventProgrammeSession', id: 'new' } } });
    await ok.page.getByRole('button', { name: 'Add session' }).click({ timeout: 90_000 });
    await ok.page.locator('#ps-title').fill('Welcome');
    await ok.page.locator('#ps-start').fill('2030-11-20T10:00');
    await ok.page.locator('#ps-end').fill('2030-11-20T11:00');
    await ok.page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => ok.graphql.calls.some((c) => c.name === 'UpsertEventProgrammeSession')).toBe(true);
    const input = ok.graphql.calls.find((c) => c.name === 'UpsertEventProgrammeSession')!.variables.input as Record<string, unknown>;
    expect(input.startAt).toBe('2030-11-20T09:00:00.000Z'); // 10:00 in Berlin (UTC+1)
    expect(input.timezone).toBe('Europe/Berlin');
    await ok.page.context().close();

    const dark = await openPage(browser, `/events/${EVENT_ID}/manage?tab=programme`, { ...base, UpsertEventProgrammeSession: { __errors: [{ message: "That isn't available yet.", code: 'EVENT_FEATURE_UNAVAILABLE' }] } });
    await dark.page.getByRole('button', { name: 'Add session' }).click({ timeout: 90_000 });
    await dark.page.locator('#ps-title').fill('Welcome');
    await dark.page.locator('#ps-start').fill('2030-11-20T10:00');
    await dark.page.locator('#ps-end').fill('2030-11-20T11:00');
    await dark.page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dark.page.getByText("This isn't available yet.")).toBeVisible();
    await dark.page.context().close();
});

test('approvals: pending people are listed by name, approve and reject send the registration, reason is optional', async () => {
    const U1 = '00000000-0000-4000-8000-0000000000b1';
    const U2 = '00000000-0000-4000-8000-0000000000b2';
    let pending = [
        { __typename: 'EventRegistrationGQL', id: 'rg-1', userId: U1, quantity: 1, registeredAt: '2030-10-01T10:00:00.000Z', attendanceFormat: null },
        { __typename: 'EventRegistrationGQL', id: 'rg-2', userId: U2, quantity: 2, registeredAt: '2030-10-02T10:00:00.000Z', attendanceFormat: null },
    ];
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=approvals`, {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']]),
        GetEvent: manageEvent({ requiresApproval: true }),
        GetEventPage: manageEvent({ requiresApproval: true }),
        PendingApprovalRegistrations: () => ({ getEventRegistrations: { __typename: 'EventRegistrationListResponse', total: pending.length, registrations: pending } }),
        GetUserProfile: (v) => (v.userId === U1 ? profile(U1, 'Kofi', 'Mensah') : profile(U2, 'Efua', 'Boateng')),
        ApproveEventRegistration: () => {
            pending = pending.filter((r) => r.id !== 'rg-1');
            return { approveEventRegistration: { __typename: 'EventRegistrationGQL', id: 'rg-1', status: 'confirmed', registrationStatus: 'CONFIRMED', waitlistPosition: null } };
        },
        RejectEventRegistration: () => {
            pending = pending.filter((r) => r.id !== 'rg-2');
            return { rejectEventRegistration: { __typename: 'EventRegistrationGQL', id: 'rg-2', status: 'rejected', registrationStatus: 'REJECTED' } };
        },
    });
    const list = page.getByTestId('approval-list');
    await expect(list.getByText('Kofi Mensah')).toBeVisible({ timeout: 90_000 });
    await expect(list.getByText('Efua Boateng')).toBeVisible();
    await expect(page.getByTestId('manage-approvals')).not.toContainText(U1);
    await expect(page.getByTestId('require-approval-switch')).toBeChecked();

    await list.getByText('Kofi Mensah').locator('xpath=ancestor::li').getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Registration approved.')).toBeVisible();
    expect(graphql.calls.find((c) => c.name === 'ApproveEventRegistration')!.variables.registrationId).toBe('rg-1');
    await expect(list.getByText('Kofi Mensah')).toHaveCount(0);

    await list.getByText('Efua Boateng').locator('xpath=ancestor::li').getByRole('button', { name: 'Reject' }).click();
    await page.getByLabel('Reason (optional)').fill('Not a member of the sector.');
    await page.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByText('Registration rejected.')).toBeVisible();
    const rej = graphql.calls.find((c) => c.name === 'RejectEventRegistration')!.variables;
    expect(rej.registrationId).toBe('rg-2');
    expect(rej.reason).toBe('Not a member of the sector.');
    await page.context().close();
});

test('approving into a full event tells the organiser the person was waitlisted', async () => {
    const U1 = '00000000-0000-4000-8000-0000000000b1';
    const { page } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=approvals`, {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']]),
        GetEvent: manageEvent({ requiresApproval: true }),
        GetEventPage: manageEvent({ requiresApproval: true }),
        PendingApprovalRegistrations: { getEventRegistrations: { __typename: 'EventRegistrationListResponse', total: 1, registrations: [{ __typename: 'EventRegistrationGQL', id: 'rg-1', userId: U1, quantity: 1, registeredAt: '2030-10-01T10:00:00.000Z', attendanceFormat: null }] } },
        GetUserProfile: profile(U1, 'Kofi', 'Mensah'),
        ApproveEventRegistration: { approveEventRegistration: { __typename: 'EventRegistrationGQL', id: 'rg-1', status: 'waitlisted', registrationStatus: 'WAITLISTED', waitlistPosition: 3 } },
    });
    await page.getByRole('button', { name: 'Approve' }).click({ timeout: 90_000 });
    await expect(page.getByText('The event is full, so this person was added to the waitlist.')).toBeVisible();
    await page.context().close();
});

test('staff: search by name, add a role, the id is never shown, remove asks first', async () => {
    const CAND = '00000000-0000-4000-8000-0000000000c7';
    let staff: Array<Record<string, unknown>> = [];
    const { page, graphql } = await openPage(browser, `/events/${EVENT_ID}/manage?tab=staff`, {
        ...myEntities([[OWNER_ID, ORGANISER_NAME, 'COMMUNITY_ADMIN']]),
        GetEvent: manageEvent(),
        EventStaff: () => ({ eventStaff: staff }),
        SearchUsers: { searchUsers: { __typename: 'SearchUsersResponse', success: true, message: 'ok', total: 1, hasMore: false, profiles: [{ __typename: 'ProfileSummary', userId: CAND, firstName: 'Yaw', lastName: 'Asante', sector: null, countryOfOrigin: null, residenceCountry: null, bio: null, headline: 'Event planner', connectionCount: 0, avatarUrl: null, connectionStatus: null, connectionId: null, trustScore: null, trustTier: null }] } },
        AddEventStaff: () => {
            staff = [{ __typename: 'EventStaffMember', userId: CAND, role: 'NETWORKING_MANAGER', displayName: 'Yaw Asante', username: 'yaw', avatarUrl: null, addedAt: null }];
            return { addEventStaff: { __typename: 'EventStaffMember', userId: CAND, role: 'NETWORKING_MANAGER' } };
        },
        RemoveEventStaff: () => {
            staff = [];
            return { removeEventStaff: true };
        },
    });
    await page.getByLabel('Find a person by name or username').fill('yaw', { timeout: 90_000 });
    const result = page.getByTestId('staff-results');
    await expect(result.getByText('Yaw Asante')).toBeVisible();
    await page.getByLabel('Role').selectOption('NETWORKING_MANAGER');
    await result.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Added to the staff.')).toBeVisible();
    expect(graphql.calls.find((c) => c.name === 'AddEventStaff')!.variables).toMatchObject({ eventId: EVENT_ID, userId: CAND, role: 'NETWORKING_MANAGER' });
    const listed = page.getByTestId('staff-list');
    await expect(listed.getByText('Yaw Asante')).toBeVisible();
    await expect(listed.getByText('Networking manager')).toBeVisible();
    await expect(page.getByTestId('manage-staff')).not.toContainText(CAND);

    await listed.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('dialog')).toContainText('Yaw Asante will no longer be able to help run this event.');
    expect(graphql.calls.some((c) => c.name === 'RemoveEventStaff')).toBe(false);
    await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('Removed from the staff.')).toBeVisible();
    await page.context().close();
});

// ─── Events-only community ───────────────────────────────────────────────────

const communityPage = (enabledServices: string[] | null) => ({
    ...SHELL_OVERRIDES,
    ...COMMUNITY_OVERRIDES,
    GetCommunityDetails: {
        getCommunity: {
            __typename: 'Community', id: OWNER_ID, name: ORGANISER_NAME, description: 'Runs events.', communityRules: null, joinPolicy: 'OPEN', visibility: 'PUBLIC',
            paymentType: 'NONE', priceAmount: null, priceCurrency: null, memberCount: 42, avatarUrl: null, bannerUrl: null, defaultGroupId: null, createdAt: '2026-01-01T00:00:00.000Z',
            membershipStatus: 'ACTIVE', isContentLocked: false, enabledServices, contactEmail: null, contactPhone: null, address: null, locationCountry: null, communityType: null, embassyProfile: null,
        },
    },
    CheckCommunityMembership: { checkCommunityMembership: { __typename: 'MembershipCheck', isMember: true, role: 'MEMBER', status: 'ACTIVE' } },
});

test('a community whose only service is events opens on its Events tab', async () => {
    const only = await openPage(browser, `/community/${OWNER_ID}`, communityPage(['events']));
    await expect(only.page.getByRole('navigation', { name: 'Embassy sections' }).locator('[aria-current="page"]')).toHaveText('Events', { timeout: 90_000 });
    // The Home tab link still works (it sets ?tab=home explicitly).
    await only.page.getByRole('navigation', { name: 'Embassy sections' }).getByRole('link', { name: 'Home' }).click();
    await expect(only.page.getByRole('navigation', { name: 'Embassy sections' }).locator('[aria-current="page"]')).toHaveText('Home');
    await only.page.context().close();

    for (const services of [['events', 'posts'], null] as const) {
        const other = await openPage(browser, `/community/${OWNER_ID}`, communityPage(services ? [...services] : null));
        await expect(other.page.getByRole('navigation', { name: 'Embassy sections' }).locator('[aria-current="page"]')).toHaveText('Home', { timeout: 90_000 });
        await other.page.context().close();
    }
});
