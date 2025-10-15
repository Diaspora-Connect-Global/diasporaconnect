import Header from "@/components/custom/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div >
        <Header/>
      {children}
    </div>
  );
}