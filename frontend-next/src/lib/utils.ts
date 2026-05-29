import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Auto redirect to login on 401
if (typeof window !== "undefined") {
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const resp = await origFetch(input, init);
    if (resp.status === 401) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (url.includes("/api/") && !url.includes("/auth/login") && !url.includes("/public") && !url.includes("/checkin") && !url.includes("/subscription")) {
        localStorage.removeItem("dental_token");
        localStorage.removeItem("dental_user");
        window.location.href = "/login";
      }
    }
    return resp;
  };
}
