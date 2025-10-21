import Header from "@/components/custom/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="">
      <div className="lg:max-h-[4rem]"> {/* 64px equivalent */}
        <Header />
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}