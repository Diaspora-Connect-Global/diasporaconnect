import SidebarShell from "@/components/layout/SidebarShell";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarShell>{children}</SidebarShell>;
}
