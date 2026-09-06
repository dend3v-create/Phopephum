import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  const baseUrl = "https://phopephum.com";
  
  const pages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/features", changefreq: "weekly", priority: "0.9" },
    { loc: "/how-it-works", changefreq: "weekly", priority: "0.8" },
    { loc: "/pricing", changefreq: "weekly", priority: "0.9" },
    { loc: "/security", changefreq: "monthly", priority: "0.7" },
    { loc: "/faq", changefreq: "weekly", priority: "0.8" },
    { loc: "/terms", changefreq: "monthly", priority: "0.5" },
    { loc: "/privacy", changefreq: "monthly", priority: "0.5" },
    { loc: "/refund", changefreq: "monthly", priority: "0.5" },
    { loc: "/login", changefreq: "monthly", priority: "0.6" },
    { loc: "/register", changefreq: "monthly", priority: "0.7" },
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("")}
</urlset>`;

  return new Response(sitemapXml.trim(), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
