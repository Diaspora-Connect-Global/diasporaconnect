export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:w-[80vw] lg:h-[90vh]  overflow-y-auto scrollbar-hide m-auto">
        {children}
    </div>
  );
} 