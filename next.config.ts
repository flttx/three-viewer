import type { NextConfig } from "next";

const parseAllowedOrigins = (value?: string) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildFrameAncestors = () => {
  const allowed = parseAllowedOrigins(
    process.env.NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS,
  );

  if (allowed.length === 0) {
    return "frame-ancestors 'self'";
  }

  if (allowed.includes("*")) {
    return "frame-ancestors *";
  }

  return `frame-ancestors 'self' ${allowed.join(" ")}`;
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildFrameAncestors(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
