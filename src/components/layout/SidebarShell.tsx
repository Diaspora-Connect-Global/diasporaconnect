import HomeSidebar from "@/components/home/HomeSidebar";

/**
 * The shell for every page that shows the home sidebar ((home)/**, community/**).
 *
 * A FIXED grid, not a centred flex row: the sidebar column is 20vw and starts
 * exactly where the header's content starts (same `lg:w-[80vw] mx-auto` frame as
 * `header.tsx`), and the content column takes the rest. Content width can never
 * decide where the sidebar sits, so it is in its final position from the first
 * paint and does not slide when a page swaps its loader for real content.
 *
 * (The old layout was `lg:flex items-center justify-center` around a
 * content-sized block, which centred [sidebar + content] and moved the sidebar
 * every time the content's width changed.)
 */
export default function SidebarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-app-inner lg:mx-auto lg:grid lg:w-[80vw] lg:grid-cols-[20vw_minmax(0,1fr)]">
      <aside className="hidden lg:block h-app-inner min-w-0">
        <HomeSidebar />
      </aside>
      <div className="min-w-0 h-app-inner">{children}</div>
    </div>
  );
}
