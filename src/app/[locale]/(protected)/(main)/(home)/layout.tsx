import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto lg:flex items-center  justify-center min-h-full">
      <div className="hidden lg:block lg:sticky lg:w-[20vw] top-[4rem] h-full scrollbar-hide">
        <HomeSidebar />
      </div>
      <div className=" min-w-0 ">
        {children}
      </div>
    </div>
  );
}