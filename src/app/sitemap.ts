import type { MetadataRoute } from "next";
import { listUsernames } from "@/lib/storage";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const usernames = await listUsernames();
  const baseUrl = "https://rscg.cy-an.net";

  const userPages = usernames.map((username) => ({
    url: `${baseUrl}/${username}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 1.0,
    },
    ...userPages,
  ];
}
