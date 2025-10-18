import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:flex h-screen">
      <div className="flex flex-col md:flex-row w-full h-full">
        <div className="hidden md:block w-[25%] h-full overflow-auto scrollbar-hide  p-2">
          <HomeSidebar />
        </div>
        <div className="w-full md:w-[75%] h-full overflow-auto scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
}