import Header from "@/components/custom/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <div className="lg:h-[4rem] w-full bg-surface-default sticky top-0 z-50"> {/* 64px equivalent */}
        <Header />
      </div>
      <div className="flex-1 scrollbar-hide">
        {children}
      </div>
    </div>
  );
} 