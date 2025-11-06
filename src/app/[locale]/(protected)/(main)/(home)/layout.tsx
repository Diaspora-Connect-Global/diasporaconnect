import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:w-[80vw] lg:flex lg:mx-auto justify-center min-h-[calc(100vh-4rem)]">
      <div className="lg:max-w-[18rem] lg:sticky top-[4rem] h-[calc(100vh-4rem)] scrollbar-hide">
        <HomeSidebar />
      </div>
      <div className="lg:min-w-[57rem] h-[calc(100vh-4rem)] w-full overflow-y-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
}