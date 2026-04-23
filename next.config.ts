import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["game.sresh.ru", "wom.sresh.ru"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
