import Header from "@/components/custom/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div >
      <Header />
      <div className="w-[80%] mx-auto">
        {children}
      </div>
    </div>
  );
}