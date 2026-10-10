/**
 * Shell for the `(home)` pages (home feed, events, circles, opportunities…).
 *
 * There is no left sidebar any more (its contents moved to the Community and
 * More pages). Pages here were laid out for the 60vw content column that sat
 * beside the 20vw sidebar inside the header's 80vw frame, so that column is kept
 * at exactly the same width and centred under the header: every page keeps its
 * proportions, and nothing slides when a page swaps its loader for content.
 */
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-app-inner min-w-0 lg:mx-auto lg:w-[60vw]">{children}</div>;
}
