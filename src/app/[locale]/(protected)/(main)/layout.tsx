"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());


  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isAuthenticated  && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace("/signin");
    }
  }, [isAuthenticated, router]);

  // Show loading while checking auth
  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <div>
      <Header>{children}</Header>
    </div>
  );
}