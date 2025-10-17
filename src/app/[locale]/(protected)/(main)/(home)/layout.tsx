import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:flex">
      <div className="flex flex-col md:flex-row md:space-x-3 h-screen">
        <div className="hidden md:block md:w-[30%] mt-5 h-full overflow-auto scrollbar-hide">
          <HomeSidebar />
        </div>
        {children}
      </div>
    </div>
  );
}