import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["game.sresh.ru", "wom.sresh.ru"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
