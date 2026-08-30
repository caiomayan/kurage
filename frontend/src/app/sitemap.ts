import type { MetadataRoute } from "next";
import { APP_DOMAIN } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = APP_DOMAIN;
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/ranking`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mar`,
      lastModified: now,
      changeFrequency: "always",
      priority: 0.8,
    },
  ];
}
