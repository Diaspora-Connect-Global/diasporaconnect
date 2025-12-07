import Header from "@/components/custom/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="">
      <Header>
        {children}
      </Header>
    </div>

  );
} 