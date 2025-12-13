"use client";

import { useEffect, useState } from "react";
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
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = authStorage.getAccessToken();

    if (!token) {
      router.replace("/signin");
      return;
    }
      console.log(" protected  routes visit ");


    setCheckingAuth(false);
  }, [router]);

  // ✅ Render loading while auth is unresolved
  if (checkingAuth) {
    return <LoadingScreen />;
  }

  console.log("layout runs for protected  routes");


  return (
    <div className="">
      <Header>
        {children}
      </Header>
    </div>
  );
}