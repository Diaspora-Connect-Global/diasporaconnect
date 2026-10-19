import { useAuthStore } from '@/store/useAuthStore';

/**
 * True only for a signed-in super admin (role recorded at sign-in).
 *
 * UI gating ONLY — it decides whether to show admin controls. The server
 * enforces the role on every admin mutation, so a tampered value gains nothing
 * (it just earns a refusal). Never use it to guard data.
 */
export function useIsSuperAdmin(): boolean {
  return useAuthStore((s) => (s.role ?? '').trim().toLowerCase() === 'super_admin');
}
