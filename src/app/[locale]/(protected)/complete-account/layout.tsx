export default function CompleteAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div  className="h-screen w-screen ">
    <div className="lg:w-[calc(800/1512*100vw)] lg:px-[calc(40/1512*100vw)] lg:pt-[calc(40/1512*100vh)]  lg:pb-[calc(32/1512*100vh)] lg:mx-auto ">
        {children}
    </div>
    </div>
  );
}