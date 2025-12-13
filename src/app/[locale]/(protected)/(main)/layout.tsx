"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/custom/header";
import { authStorage } from "@/store/CentralPersist";
import LoadingScreen from "@/components/custom/LoadingScreen";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const isAuthenticated = authStorage.getAccessToken();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    router.push('/signin');
    return;
  }

  // useEffect(() => {
  //   // Check if user is authenticated

  //   // Check if token is expired or needs refresh
  //   // if (authStorage.isTokenExpired()) {
  //   //   // Clear expired tokens
  //   //   authStorage.clearAuth();
  //   //   router.push('/login');
  //   //   return;
  //   // }

  //   // Optional: Set up token refresh if needed
  //   //   if (authStorage.needsRefresh()) {
  //   //     // You can implement token refresh logic here
  //   //     console.log('Token needs refresh');
  //   //     // refreshToken();
  //   //   }
  // }, [router]);

  return (
    <div className="">
      <Header>
        {children}
      </Header>
    </div>
  );
}