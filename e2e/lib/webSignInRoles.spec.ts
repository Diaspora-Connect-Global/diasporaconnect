/** Pure unit checks: which account roles may sign in to the web app (no browser). */
import { test, expect } from '@playwright/test';
import { isAllowedWebSignInRole } from '../../src/lib/webSignInRoles';

test('members and the super admin may sign in (any case, trimmed)', () => {
    for (const role of ['local', 'diaspora', 'super_admin', 'SUPER_ADMIN', ' Diaspora ']) {
        expect(isAllowedWebSignInRole(role), role).toBe(true);
    }
});

test('every other role, and a missing role, is still refused', () => {
    for (const role of ['system_admin', 'community_admin', 'admin', 'superadmin', '', null, undefined]) {
        expect(isAllowedWebSignInRole(role as string | null | undefined), String(role)).toBe(false);
    }
});
