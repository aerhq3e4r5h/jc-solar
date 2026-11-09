import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

// Baseline security headers. A full Content-Security-Policy is added with the
// cookie-consent and analytics work, once every third-party origin is known.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // react-pdf runs in Node at request time; its fonts are read from disk.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/api/quotes/**": ["./src/lib/pdf/fonts/**"],
    "/api/orders/**": ["./src/lib/pdf/fonts/**"],
    "/api/payfast/**": ["./src/lib/pdf/fonts/**"],
    // Share images read their fonts and the product photos from disk.
    "/shop/**/opengraph-image*": ["./src/assets/fonts/**", "./public/products/**/og.jpg"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Catalogue spreadsheets are uploaded through a server action.
    serverActions: { bodySizeLimit: "21mb" },
  },
  images: {
    // 90 for the product gallery, where detail matters; 75 (the default) elsewhere.
    qualities: [75, 90],
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
