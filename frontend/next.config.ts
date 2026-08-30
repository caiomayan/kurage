import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV !== "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();

if (!isDev && (!apiUrl || !appUrl)) {
  throw new Error(
    "NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL are required for a production build",
  );
}

function httpOrigin(name: string, value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return url.origin;
}

const apiOrigin = httpOrigin("NEXT_PUBLIC_API_URL", apiUrl || "http://localhost:8080");
const appOrigin = httpOrigin("NEXT_PUBLIC_APP_URL", appUrl || "http://localhost:3000");
const r2PublicOrigin = r2PublicUrl ? new URL(r2PublicUrl).origin : "";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://prod.spline.design;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://avatars.steamstatic.com https://avatars.akamai.steamstatic.com https://community.cloudflare.steamstatic.com https://raw.githubusercontent.com https://distribution.faceit-cdn.net https://cdn.cstrike.app ${r2PublicOrigin};
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' ${apiOrigin} https://open.faceit.com https://prod.spline.design;
    worker-src blob:;
    frame-src 'self' https://3d.cstrike.app;
    frame-ancestors 'none';
    form-action 'self' https://steamcommunity.com;
    base-uri 'self';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  env: {
    NEXT_PUBLIC_APP_URL: appOrigin,
    NEXT_PUBLIC_API_URL: apiOrigin,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "avatars.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "community.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "distribution.faceit-cdn.net",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cstrike.app",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
