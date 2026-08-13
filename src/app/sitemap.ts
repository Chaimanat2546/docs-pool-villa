import type { MetadataRoute } from "next";

import { getPublicDocsIndex, getPublicSiteUrl } from "@/lib/docs/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getPublicDocsIndex();
  const baseUrl = getPublicSiteUrl();
  return [
    { url: baseUrl.toString(), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...index.documents.map((document) => ({
      url: new URL(document.path, baseUrl).toString(),
      lastModified: new Date(document.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
