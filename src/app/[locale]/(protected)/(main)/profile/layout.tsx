export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:w-[75rem] lg:h-[48rem] mx-auto">
        {children}
    </div>
  );
} 