import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://www.skildauto.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/auto", changefreq: "weekly", priority: "0.9" },
          { path: "/moto", changefreq: "weekly", priority: "0.9" },
          { path: "/services", changefreq: "weekly", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/reviews", changefreq: "weekly", priority: "0.7" },
          { path: "/gallery", changefreq: "weekly", priority: "0.8" },
          { path: "/service-area", changefreq: "monthly", priority: "0.7" },
          { path: "/quote", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/apparel", changefreq: "monthly", priority: "0.5" },
        ];

        try {
          const { getSkildPublicDb } = await import("@/lib/skild-public.server");
          const { data } = await getSkildPublicDb()
            .from("projects")
            .select("slug, updated_at")
            .eq("is_published", true)
            .limit(500);
          for (const row of (data ?? []) as { slug: string; updated_at?: string }[]) {
            entries.push({
              path: `/gallery/${row.slug}`,
              lastmod: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
              changefreq: "monthly",
              priority: "0.7",
            });
          }
        } catch {
          /* gallery entries are optional; never break the sitemap */
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
