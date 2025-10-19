import Header from "@/components/custom/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen" >
      <div className="lg:h-[calc(64/922*100vh)]">
      <Header />
      </div>
      <div >
        {children}
      </div>
    </div>
  );
}