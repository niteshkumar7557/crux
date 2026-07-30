// Crawl rules and the sitemap pointer.
//
// The disallowed paths are pure crawl waste: forms and redirect shims with nothing
// to rank. Everything else stays crawlable — pages that should not be INDEXED say
// so with their own noindex, because blocking them here would also stop a crawler
// ever reading that tag.
//
// Note: the CDN prepends its own managed block in production, so the served file is
// this plus whatever it adds. Read the live /robots.txt, not just this module.

import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/register",
        "/motion/new", // the composer — needs auth, ranks for nothing
        "/profile/me", // a client shim that redirects to the real username
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
