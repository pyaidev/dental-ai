import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/analyze", "/patients", "/statistics", "/settings", "/subscription", "/admin"],
      },
    ],
    sitemap: "https://odontaindex.ru/sitemap.xml",
  };
}
