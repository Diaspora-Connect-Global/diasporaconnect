import SidebarShell from "@/components/layout/SidebarShell";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarShell>{children}</SidebarShell>;
}
