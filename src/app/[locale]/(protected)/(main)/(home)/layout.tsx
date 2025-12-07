import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto lg:flex items-center  justify-center min-h-full">
      <div className="hidden lg:block lg:sticky w-[20vw] top-[4rem] h-full scrollbar-hide">
        <HomeSidebar />
      </div>
      <div className="lg:h-[92vh] h-[84vh] min-w-0 overflow-y-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
}