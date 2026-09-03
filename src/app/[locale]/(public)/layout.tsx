import PublicShell from '@/components/public/PublicShell';

/**
 * Layout for the PUBLIC, indexable detail routes (events, opportunities,
 * communities, associations). Deliberately OUTSIDE the `(protected)` group so
 * the client auth-redirect in MainLayout never fires for crawlers — these pages
 * must return real 200 HTML to be indexed. `robots`/canonical are set per page.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
