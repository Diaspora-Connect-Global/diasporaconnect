import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <div className="md:w-[20%] hidden md:block ">
        <HomeSidebar/>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}