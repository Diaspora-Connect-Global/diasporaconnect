export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Standard shell height (`h-app-inner`, same as every other shell page) —
  // it was `lg:h-[90vh]`, a different height from the area the header leaves.
  return (
    <div className="lg:w-[80vw] h-app-inner overflow-y-auto scrollbar-hide m-auto">
        {children}
    </div>
  );
}
