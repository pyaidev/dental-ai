"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/utils";
import LandingPage from "./landing/page";

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("dental_token");
    if (!token) {
      setLoggedIn(false);
      return;
    }
    // Validate token before redirecting
    fetch(`${API_BASE}/api/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (r.ok) {
        router.replace("/dashboard");
      } else {
        // Token expired/invalid — clear and show landing
        localStorage.removeItem("dental_token");
        localStorage.removeItem("dental_user");
        setLoggedIn(false);
      }
    }).catch(() => setLoggedIn(false));
  }, [router]);

  if (loggedIn === null) return null;
  return <LandingPage />;
}
