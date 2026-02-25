"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";
import MessageWebSocketProvider from "@/components/provider/MessageWebSocketProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Wait for client-side hydration before rendering auth-dependent UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace("/signin");
    }
  }, [mounted, isAuthenticated, router]);

  // Show loading until hydrated and authenticated
  if (!mounted || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <MessageWebSocketProvider>
      <div>
        <Header>{children}</Header>
      </div>
    </MessageWebSocketProvider>
  );
}