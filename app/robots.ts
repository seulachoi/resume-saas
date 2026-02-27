import type { MetadataRoute } from "next";

const siteUrl = "https://resume-saas-psi.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/my-reports", "/results/", "/admin", "/auth-test", "/analyze-test", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

