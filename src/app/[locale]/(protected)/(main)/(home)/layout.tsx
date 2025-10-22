import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:min-w-[75rem] lg:flex lg:mx-auto justify-center">
      <div className="lg:max-w-[18rem] h-full overflow-none">
        <HomeSidebar />
      </div>
      <div className="lg:max-w-[57rem] lg:max-h-[53.625rem]">
        {children}
      </div>
    </div>
  );
}