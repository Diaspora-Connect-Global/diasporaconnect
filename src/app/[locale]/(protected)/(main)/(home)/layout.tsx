import HomeSidebar from "@/components/home/HomeSidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:max-w-[75rem] lg:flex lg:mx-auto "> {/* 1200px, 28px equivalent */}
      <div className="lg:max-w-[18rem]"> {/* 288px equivalent */}
        <HomeSidebar />
      </div>
      <div className="lg:min-w-[57rem] "> {/* 912px equivalent */}
        {children}
      </div>
    </div>
  );
}