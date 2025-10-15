import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <div className="w-[30%] ">
        <HomeSidebar/>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}