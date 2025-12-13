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

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = authStorage.isAuthenticated();
    
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/signin');
      return;
    }

    // Check if token is expired or needs refresh
    // if (authStorage.isTokenExpired()) {
    //   // Clear expired tokens
    //   authStorage.clearAuth();
    //   router.push('/login');
    //   return;
    // }

    // Optional: Set up token refresh if needed
  //   if (authStorage.needsRefresh()) {
  //     // You can implement token refresh logic here
  //     console.log('Token needs refresh');
  //     // refreshToken();
  //   }
  }, [router]);

  // Don't render content until authentication is verified
  if (!authStorage.isAuthenticated()) {
    return (
<LoadingScreen 
  showSpinner={true} 
  text="Almost there..." 
/>
    );
  }

  return (
    <div className="">
      <Header>
        {children}
      </Header>
    </div>
  );
}