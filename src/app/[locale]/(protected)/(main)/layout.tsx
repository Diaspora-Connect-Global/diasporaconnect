"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // 🔥 Subscribe to Zustand
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // const hasHydrated = useAuthStore.persist.hasHydrated();

  // 🔐 Redirect when NOT authenticated (after hydration)
  useEffect(() => {
    // if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace("/signin");
    }
  }, [ isAuthenticated, router]);

  // // ⏳ Wait for persisted state to hydrate
  // if (!hasHydrated) {
  //   return <LoadingScreen />;
  // }

  // // ⛔ Block render while redirecting
  // if (!isAuthenticated) {
  //   return <LoadingScreen />;
  // }

  console.log("layout runs for protected routes");


  return (
    <div className="">
      <Header>
        {children}
      </Header>
    </div>
  );
}