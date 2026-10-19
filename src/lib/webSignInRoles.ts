/**
 * Which account roles may sign in to the web app.
 *
 * Members are `local` / `diaspora`. A `super_admin` may also sign in (owner, 2026-10-19), so the
 * platform's super admin can moderate from the app itself: e.g. delete any post from its menu
 * (see useIsSuperAdmin). The server re-checks the role on every admin action; this list only
 * decides who gets past the sign-in screen. Every other role (other admin types, unknown values)
 * is still refused here.
 */
const WEB_SIGN_IN_ROLES = new Set(['local', 'diaspora', 'super_admin']);

export function isAllowedWebSignInRole(role?: string | null): boolean {
  return WEB_SIGN_IN_ROLES.has((role || '').trim().toLowerCase());
}
