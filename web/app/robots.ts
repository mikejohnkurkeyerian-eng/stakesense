import type { MetadataRoute } from "next";

const SITE_URL =
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
