export default function CompleteAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen">
      <div className="lg:w-[50rem] lg:px-[2.5rem] lg:pt-[2.5rem] lg:pb-[2rem] lg:mx-auto">
        {children}
      </div>
    </div>
  );
}