import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:w-[calc(1200/1512*100vw)]  lg:flex lg:mx-auto lg:space-x-[calc(28/1512*100vw)] ">
      <div className="lg:w-[calc(288/1512*100vw)]  ">
      <HomeSidebar />
      </div>
      <div className="lg:w-[calc(912/1512*100vw)] ">
        {children}
      </div>
    </div>
  );
}