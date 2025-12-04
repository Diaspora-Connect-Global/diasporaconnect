import VendorSidebar from "./VendorSideBar";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden">
      <VendorSidebar>

        {children}

      </VendorSidebar>
    </div>
  );
} 