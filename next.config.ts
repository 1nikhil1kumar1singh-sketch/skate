import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@privy-io/react-auth", "@privy-io/server-auth"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/account", destination: "/profile", permanent: false },
      { source: "/deposit", destination: "/profile", permanent: false },
      { source: "/withdraw", destination: "/profile", permanent: false },
    ];
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "encoding");
    return config;
  },
};

export default nextConfig;
