import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rscg.cy-an.net";

  return ["en", "ja", "ko", "zh"].map((locale) => ({
    url: `${baseUrl}/${locale}`,
    changeFrequency: "monthly" as const,
    priority: locale === "en" ? 1 : 0.9,
  }));
}
