import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto lg:flex items-center lg:mx-24 justify-center min-h-[calc(100vh-4rem)]">
      <div className="lg:sticky w-[20vw] top-[4rem] h-[calc(100vh-4rem)] scrollbar-hide">
        <HomeSidebar />
      </div>
      <div className="h-[calc(100vh-4rem)] w-full  scrollbar-hide">
        {children}
      </div>
    </div>
  );
}