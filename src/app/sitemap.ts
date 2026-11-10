import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/stack",
    "/changes",
    "/@shadcn/sidebar-07",
    "/@shadcn/dashboard-01",
  ].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return [...routes];
}
