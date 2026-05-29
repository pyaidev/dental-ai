"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "./landing/page";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  return <LandingPage />;
}
