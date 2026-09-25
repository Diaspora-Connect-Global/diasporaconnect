"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import VendorSidebar from "./VendorSideBar";
import { GET_MY_VENDOR } from "@/services/gql/vendor";
import type { GetMyVendorResponse } from "@/services/gql/types/vendor";
import { handleVendorError } from "@/lib/vendor-error-mapper";
import LoadingScreen from "@/components/custom/LoadingScreen";

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

  // The vendor workspace has no app shell of its own until this resolves, so it
  // uses the one boot loader (was untranslated "Loading vendor workspace..."
  // text). Also covers the moment before the becomeavendor redirect lands.
  if (loading || !data?.getMyVendor) {
    return <LoadingScreen />;
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