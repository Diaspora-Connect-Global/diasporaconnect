export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:w-[80vw] h-app-inner overflow-y-auto scrollbar-hide m-auto">
        {children}
    </div>
  );
} 