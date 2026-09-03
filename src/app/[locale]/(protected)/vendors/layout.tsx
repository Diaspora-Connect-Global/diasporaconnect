"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import VendorSidebar from "./VendorSideBar";
import { GET_MY_VENDOR } from "@/services/gql/vendor";
import type { GetMyVendorResponse } from "@/services/gql/types/vendor";
import { handleVendorError } from "@/lib/vendor-error-mapper";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { data, loading, error } = useQuery<GetMyVendorResponse>(GET_MY_VENDOR);

  useEffect(() => {
    if (error) {
      handleVendorError({ error, locale, router });
      return;
    }
    if (loading) return;
    if (!data?.getMyVendor) {
      router.replace(`/${locale}/becomeavendor`);
    }
  }, [data, error, loading, locale, router]);

  if (loading || !data?.getMyVendor) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-text-secondary">Loading vendor workspace...</p>
      </div>
    );
  }

  // Prevent flashing protected vendor pages if redirect has not happened yet.
  if (!pathname.startsWith(`/${locale}/vendors`)) {
    return null;
  }

  return (
    <div className="overflow-hidden">
      <VendorSidebar>{children}</VendorSidebar>
    </div>
  );
}