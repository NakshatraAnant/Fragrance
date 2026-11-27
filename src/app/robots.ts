import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api", "/checkout", "/cart", "/order", "/search", "/compare", "/wishlist"] }],
    sitemap: `${env.appUrl()}/sitemap.xml`,
  };
}
