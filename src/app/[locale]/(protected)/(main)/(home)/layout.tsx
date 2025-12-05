import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto lg:flex items-center  justify-center min-h-[calc(100vh-4rem)]">
      <div className="hidden lg:block lg:sticky w-[20vw] top-[4rem] h-[calc(100vh-4rem)] scrollbar-hide">
        <HomeSidebar />
      </div>
      <div className="lg:h-[calc(100vh-4rem)] h-[calc(100vh-4rem)] min-w-0 overflow-y-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
}