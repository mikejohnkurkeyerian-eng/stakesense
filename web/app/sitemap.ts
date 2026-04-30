import type { MetadataRoute } from "next";

const SITE_URL =
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/validators`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/stake`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/compare`, lastModified: now, priority: 0.7 },
    { url: `${SITE_URL}/backtest`, lastModified: now, priority: 0.7 },
    { url: `${SITE_URL}/methodology`, lastModified: now, priority: 0.6 },
  ];
}
