/**
 * Shell for `/community`: the header's full 80vw content frame. The page lays
 * out its own "Your communities" column beside the main content (it took over
 * what the old left sidebar listed), stacking it above the content on phones.
 */
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-app-inner min-w-0 lg:mx-auto lg:w-[80vw]">{children}</div>;
}
